import { useEffect, useRef, useState, useCallback } from "react";
import { CadEngine, EngineUiState, ToolName } from "./cad/engine";
import { runCommand } from "./cad/commands";
import { runNaturalLanguage, nlHealth, type NlHealth } from "./cad/nl";
import { exportDXF, importDXF } from "./cad/dxf";
import { extractBom, toCSV, type ValveRow, type PipeRow, type ItemRow } from "./cad/bom";

const TOOLS: { name: ToolName; label: string; key?: string; sep?: boolean }[] = [
  { name: "select", label: "선택", key: "S" },
  { name: "line", label: "선", key: "L", sep: true },
  { name: "polyline", label: "폴리", key: "PL" },
  { name: "rectangle", label: "사각", key: "REC" },
  { name: "circle", label: "원", key: "C" },
  { name: "arc", label: "호", key: "A" },
  { name: "ellipse", label: "타원", key: "EL" },
  { name: "point", label: "점", key: "PT" },
  { name: "text", label: "문자", key: "T" },
  { name: "dimension", label: "치수", key: "DIM" },
  { name: "move", label: "이동", key: "M", sep: true },
  { name: "copy", label: "복사", key: "CO" },
  { name: "rotate", label: "회전", key: "RO" },
  { name: "scale", label: "축척", key: "SC" },
  { name: "mirror", label: "대칭", key: "MI" },
  { name: "offset", label: "간격", key: "O" },
  { name: "trim", label: "자름", key: "TR" },
  { name: "extend", label: "연장", key: "EX" },
  { name: "fillet", label: "모깎", key: "F" },
  { name: "chamfer", label: "모따", key: "CHA" },
  { name: "hatch", label: "채움", key: "H" },
  { name: "erase", label: "지움", key: "E" },
  { name: "measure", label: "거리", key: "ME", sep: true },
];

const EXAMPLES = [
  "원점에 가로 10 세로 5 사각형",
  "반지름 4 정육각형 그려줘",
  "간단한 집 도면 그려줘",
  "반지름 10 원에 구멍 8개 원형 배열",
  "선택한 도형 Y축 기준으로 대칭 복사",
  "5×3 격자, 간격 2",
  "선택한 도형 0.5만큼 바깥으로 간격띄우기",
  "가로 6 세로 3 타원을 원점에",
];

export function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<CadEngine | null>(null);
  const [ui, setUi] = useState<EngineUiState | null>(null);
  // engine is created in the effect below (after the canvas mounts); panels that
  // read engine state must wait for this, otherwise they deref a null engine.
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!canvasRef.current) return;
    const engine = new CadEngine(canvasRef.current);
    engineRef.current = engine;
    setReady(true);
    const unsub = engine.subscribe(setUi);

    const wrap = canvasRef.current.parentElement!;
    const ro = new ResizeObserver(() => engine.resize());
    ro.observe(wrap);

    return () => {
      unsub();
      ro.disconnect();
      engine.detach();
    };
  }, []);

  const eng = () => engineRef.current!;
  const [showBom, setShowBom] = useState(false);

  return (
    <div className="app">
      <TopBar engine={eng} onBom={() => setShowBom(true)} />
      <Toolbar tool={ui?.tool} onPick={(t) => eng().setTool(t)} />
      <div className="canvas-wrap">
        <canvas ref={canvasRef} />
        <div className="hud">
          {ui?.cursor ? `X ${ui.cursor.x.toFixed(2)}  Y ${ui.cursor.y.toFixed(2)}` : "X —  Y —"}
          {ui?.dyn ? `   ↦ ${ui.dyn.dist.toFixed(2)} ∠ ${ui.dyn.angle.toFixed(1)}°` : ""}
        </div>
      </div>
      {ready ? <Side engine={eng} ui={ui} /> : <div className="side" />}
      <CommandBar engine={eng} ui={ui} />
      {showBom && ready && <BomOverlay engine={eng} onClose={() => setShowBom(false)} />}
    </div>
  );
}

function TopBar({ engine, onBom }: { engine: () => CadEngine; onBom: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);

  const saveDXF = () => {
    const dxf = exportDXF(engine().doc);
    download(dxf, "drawing.dxf", "application/dxf");
  };
  const savePNG = () => {
    const c = document.querySelector("canvas") as HTMLCanvasElement;
    const url = c.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = "drawing.png";
    a.click();
  };
  const openDXF = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const { entities, layers } = importDXF(String(reader.result));
      const e = engine();
      e.doc.transact(() => {
        layers.forEach((l) => {
          if (!e.doc.layer(l.name)) e.doc.layers.push(l);
        });
        e.doc.add(...entities);
      });
      e.zoomFit();
    };
    reader.readAsText(file);
  };

  return (
    <div className="topbar">
      <div className="brand">
        AiCAD <small>자연어 웹 캐드</small>
      </div>
      <button className="btn" onClick={() => engine().applyOperations([{ op: "clear" }])}>
        새 도면
      </button>
      <button className="btn" onClick={() => fileRef.current?.click()}>
        DXF 열기
      </button>
      <button className="btn" onClick={saveDXF}>
        DXF 저장
      </button>
      <button className="btn" onClick={savePNG}>
        PNG
      </button>
      <button className="btn" onClick={onBom} title="밸브/파이프 리스트 추출 (BOM)">
        리스트
      </button>
      <div className="spacer" />
      <button className="btn" onClick={() => engine().undo()}>
        ↶ 취소
      </button>
      <button className="btn" onClick={() => engine().redo()}>
        ↷ 복구
      </button>
      <button className="btn" onClick={() => engine().zoomFit()}>
        전체보기
      </button>
      <input
        ref={fileRef}
        type="file"
        accept=".dxf,.txt"
        style={{ display: "none" }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) openDXF(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}

function Toolbar({ tool, onPick }: { tool?: ToolName; onPick: (t: ToolName) => void }) {
  return (
    <div className="toolbar">
      {TOOLS.map((t) => (
        <span key={t.name}>
          {t.sep && <div className="sep" />}
          <button
            className={`tool ${tool === t.name ? "active" : ""}`}
            title={`${t.label} (${t.key})`}
            onClick={() => onPick(t.name)}
          >
            {t.label}
          </button>
        </span>
      ))}
    </div>
  );
}

function Side({ engine, ui }: { engine: () => CadEngine; ui: EngineUiState | null }) {
  return (
    <div className="side">
      <NlPanel engine={engine} />
      <PropertiesPanel engine={engine} ui={ui} />
      <LayerPanel engine={engine} ui={ui} />
    </div>
  );
}

function PropertiesPanel({ engine, ui }: { engine: () => CadEngine; ui: EngineUiState | null }) {
  void ui; // re-renders when engine UI state changes (selection count etc.)
  const e = engine();
  const selected = e.doc.entities.filter((x) => e.selection.has(x.id));
  const types = [...new Set(selected.map((s) => s.type))];

  const setColor = (color: string) =>
    e.doc.transact(() => selected.forEach((s) => e.doc.replace(s.id, { ...s, color })));
  const setFill = (fill: string | undefined) =>
    e.doc.transact(() =>
      selected.forEach((s) => {
        if (s.type === "circle" || s.type === "ellipse" || (s.type === "polyline" && s.closed))
          e.doc.replace(s.id, { ...s, fill });
      }),
    );

  return (
    <section>
      <h3>속성</h3>
      {selected.length === 0 ? (
        <div style={{ color: "var(--muted)" }}>선택된 객체 없음</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div>
            선택 <b>{selected.length}</b>개 · {types.join(", ")}
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
            색상
            <input
              type="color"
              defaultValue={selected[0].color ?? "#e6e6e6"}
              onChange={(ev) => setColor(ev.target.value)}
            />
          </label>
          <div style={{ display: "flex", gap: 6 }}>
            <button className="btn" onClick={() => setFill("#4da3ff55")}>
              채우기
            </button>
            <button className="btn" onClick={() => setFill(undefined)}>
              채움 해제
            </button>
            <button className="btn" onClick={() => engine().deleteSelection()}>
              삭제
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function NlPanel({ engine }: { engine: () => CadEngine }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ msg: string; kind: "ok" | "err" | "" }>({ msg: "", kind: "" });
  const [health, setHealth] = useState<NlHealth | null>(null);

  useEffect(() => {
    let alive = true;
    nlHealth().then((h) => alive && setHealth(h));
    return () => {
      alive = false;
    };
  }, []);

  const run = useCallback(async () => {
    const prompt = text.trim();
    if (!prompt || busy) return;
    setBusy(true);
    setStatus({ msg: health?.configured ? "Claude가 도면을 생성 중…" : "로컬 해석 중…", kind: "" });
    try {
      const res = await runNaturalLanguage(engine(), prompt);
      if (res.error) {
        setStatus({ msg: res.error, kind: "err" });
      } else if (res.ops.length === 0) {
        setStatus({ msg: "적용할 연산이 없습니다.", kind: "err" });
      } else {
        engine().applyOperations(res.ops);
        setStatus({ msg: res.note ? `✓ ${res.note}` : `✓ ${res.ops.length}개 연산 적용`, kind: "ok" });
        setText("");
      }
    } catch (e) {
      setStatus({ msg: `오류: ${(e as Error).message}`, kind: "err" });
    } finally {
      setBusy(false);
    }
  }, [text, busy, engine, health]);

  const connected = !!health?.configured;
  return (
    <section className="nl">
      <h3>
        자연어로 그리기
        <span
          className={`nl-badge ${connected ? "on" : "off"}`}
          title={
            connected
              ? `Claude 연결됨 · ${health?.model}${health?.baseURL && !health.baseURL.includes("api.anthropic.com") ? ` · ${health.baseURL}` : ""}`
              : "API 키 미설정 — 로컬 해석기로 동작 (.env에 ANTHROPIC_API_KEY 설정)"
          }
        >
          {connected ? `● Claude (${health?.model})` : "○ 로컬 모드"}
        </span>
      </h3>
      <textarea
        value={text}
        placeholder="예) 반지름 5인 원을 원점에 그리고 그 안에 정사각형을 넣어줘"
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) run();
        }}
      />
      <div className="row">
        <button className="btn active" disabled={busy} onClick={run}>
          {busy ? "생성 중…" : "그리기 (Ctrl+Enter)"}
        </button>
      </div>
      <div className="examples">
        {EXAMPLES.map((ex) => (
          <span key={ex} onClick={() => setText(ex)}>
            {ex}
          </span>
        ))}
      </div>
      <div className={`status ${status.kind}`}>{status.msg}</div>
    </section>
  );
}

function LayerPanel({ engine, ui }: { engine: () => CadEngine; ui: EngineUiState | null }) {
  // re-render on doc changes
  const [, setTick] = useState(0);
  useEffect(() => {
    const e = engine();
    return e.doc.subscribe(() => setTick((t) => t + 1));
  }, [engine]);
  void ui;

  const doc = engine().doc;
  return (
    <section className="layers">
      <h3>
        레이어
        <button
          className="btn"
          style={{ float: "right", padding: "1px 6px" }}
          onClick={() => {
            const name = window.prompt("새 레이어 이름:");
            if (name) {
              doc.transact(() => {
                doc.ensureLayer(name, randColor());
                doc.currentLayer = name;
              });
            }
          }}
        >
          +
        </button>
      </h3>
      {doc.layers.map((l) => (
        <div key={l.name} className={`layer-row ${doc.currentLayer === l.name ? "current" : ""}`}>
          <input
            className="swatch"
            type="color"
            value={l.color}
            style={{ padding: 0, width: 16, height: 16, background: "none", border: "none" }}
            onChange={(e) => {
              doc.transact(() => {
                l.color = e.target.value;
              });
            }}
          />
          <span className="name" onClick={() => doc.transact(() => (doc.currentLayer = l.name))}>
            {l.name}
          </span>
          <button
            className="vis"
            title="표시/숨김"
            onClick={() =>
              doc.transact(() => {
                l.visible = !l.visible;
              })
            }
          >
            {l.visible ? "👁" : "✕"}
          </button>
        </div>
      ))}
    </section>
  );
}

function CommandBar({ engine, ui }: { engine: () => CadEngine; ui: EngineUiState | null }) {
  const [cmd, setCmd] = useState("");
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [ui?.log]);

  const submit = () => {
    const c = cmd.trim();
    if (!c) return;
    runCommand(engine(), c);
    setCmd("");
  };

  return (
    <div className="cmdbar">
      <div className="log" ref={logRef}>
        {(ui?.log ?? []).map((line, i) => (
          <div key={i}>{line}</div>
        ))}
      </div>
      <div className="input-row">
        <span className="prompt">명령:</span>
        <input
          value={cmd}
          placeholder="예) LINE 0,0 10,5  |  CIRCLE 5,5 3  |  ZOOM  |  UNDO"
          onChange={(e) => setCmd(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
        />
      </div>
      <StatusBar engine={engine} ui={ui} />
    </div>
  );
}

function StatusBar({ engine, ui }: { engine: () => CadEngine; ui: EngineUiState | null }) {
  return (
    <div className="statusbar">
      <span>
        도구: <b>{ui?.tool ?? "-"}</b>
      </span>
      <span>{ui?.prompt}</span>
      <div className="spacer" style={{ flex: 1 }} />
      <span>선택: <b>{ui?.selectionCount ?? 0}</b></span>
      <span>배율: <b>{ui ? ui.scale.toFixed(1) : "-"}</b></span>
      <span className={`pill ${ui?.snapOn ? "on" : ""}`} onClick={() => engine().toggleSnap()} title="객체 스냅 (F3)">
        스냅
      </span>
      <span className={`pill ${ui?.gridOn ? "on" : ""}`} onClick={() => engine().toggleGrid()} title="그리드 (F7)">
        그리드
      </span>
      <span className={`pill ${ui?.orthoOn ? "on" : ""}`} onClick={() => engine().toggleOrtho()} title="직교 모드 (F8)">
        직교
      </span>
      <span className={`pill ${ui?.polarOn ? "on" : ""}`} onClick={() => engine().togglePolar()} title="극좌표 추적 (F10)">
        극좌표
      </span>
    </div>
  );
}

function BomOverlay({ engine, onClose }: { engine: () => CadEngine; onClose: () => void }) {
  const bom = extractBom(engine().doc);
  const valveCols: (keyof ValveRow)[] = ["tag", "type", "size", "service", "layer"];
  const pipeCols: (keyof PipeRow)[] = ["tag", "size", "service", "length", "layer"];
  const itemCols: (keyof ItemRow)[] = ["tag", "type", "service", "layer"];

  const Table = <T extends Record<string, string | number>>({
    title,
    rows,
    cols,
    csv,
  }: {
    title: string;
    rows: T[];
    cols: (keyof T)[];
    csv: string;
  }) => (
    <div>
      <h4>
        {title} ({rows.length}){" "}
        {rows.length > 0 && (
          <button
            className="btn"
            style={{ padding: "1px 8px", marginLeft: 6 }}
            onClick={() => download(csv, `${title.replace(/\s+/g, "_").toLowerCase()}.csv`, "text/csv")}
          >
            CSV 저장
          </button>
        )}
      </h4>
      {rows.length === 0 ? (
        <div className="empty">해당 항목 없음</div>
      ) : (
        <table>
          <thead>
            <tr>
              {cols.map((c) => (
                <th key={String(c)}>{String(c).toUpperCase()}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                {cols.map((c) => (
                  <td key={String(c)}>{String(r[c] ?? "")}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  const total = bom.valves.length + bom.pipes.length + bom.instruments.length + bom.equipment.length;

  return (
    <div className="overlay" onClick={onClose}>
      <div className="bom" onClick={(e) => e.stopPropagation()}>
        <header>
          <h2>자재 추출 (BOM) — 총 {total}건</h2>
          <div className="spacer" style={{ flex: 1 }} />
          <button className="btn" onClick={onClose}>
            닫기 ✕
          </button>
        </header>
        <Table title="VALVE LIST" rows={bom.valves} cols={valveCols} csv={toCSV(bom.valves, valveCols)} />
        <Table title="PIPE LIST" rows={bom.pipes} cols={pipeCols} csv={toCSV(bom.pipes, pipeCols)} />
        <Table title="EQUIPMENT LIST" rows={bom.equipment} cols={itemCols} csv={toCSV(bom.equipment, itemCols)} />
        <Table title="INSTRUMENT LIST" rows={bom.instruments} cols={itemCols} csv={toCSV(bom.instruments, itemCols)} />
      </div>
    </div>
  );
}

function download(text: string, filename: string, mime: string) {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function randColor(): string {
  const colors = ["#ff8a5c", "#5cd6ff", "#b388ff", "#ffd24d", "#7bed9f", "#ff6b81"];
  return colors[Math.floor(Math.random() * colors.length)];
}
