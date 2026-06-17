import { useEffect, useRef, useState, useCallback } from "react";
import { CadEngine, EngineUiState, ToolName } from "./cad/engine";
import { runCommand } from "./cad/commands";
import { runNaturalLanguage } from "./cad/nl";
import { exportDXF, importDXF } from "./cad/dxf";

const TOOLS: { name: ToolName; label: string; key?: string }[] = [
  { name: "select", label: "선택", key: "S" },
  { name: "line", label: "선", key: "L" },
  { name: "polyline", label: "폴리", key: "PL" },
  { name: "rectangle", label: "사각", key: "REC" },
  { name: "circle", label: "원", key: "C" },
  { name: "arc", label: "호", key: "A" },
  { name: "point", label: "점", key: "PT" },
  { name: "text", label: "문자", key: "T" },
  { name: "dimension", label: "치수", key: "DIM" },
  { name: "move", label: "이동", key: "M" },
  { name: "copy", label: "복사", key: "CO" },
  { name: "rotate", label: "회전", key: "RO" },
  { name: "scale", label: "축척", key: "SC" },
  { name: "erase", label: "지움", key: "E" },
];

const EXAMPLES = [
  "원점에 가로 10 세로 5 사각형",
  "중심 5,5 반지름 3 원",
  "반지름 4 정육각형 그려줘",
  "간단한 집 도면 그려줘",
  "선택한 것 전부 오른쪽으로 10 이동",
  "치수선 추가: 0,0 에서 10,0",
];

export function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<CadEngine | null>(null);
  const [ui, setUi] = useState<EngineUiState | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const engine = new CadEngine(canvasRef.current);
    engineRef.current = engine;
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

  return (
    <div className="app">
      <TopBar engine={eng} />
      <Toolbar tool={ui?.tool} onPick={(t) => eng().setTool(t)} />
      <div className="canvas-wrap">
        <canvas ref={canvasRef} />
        <div className="hud">
          {ui?.cursor
            ? `X ${ui.cursor.x.toFixed(2)}  Y ${ui.cursor.y.toFixed(2)}`
            : "X —  Y —"}
        </div>
      </div>
      <Side engine={eng} ui={ui} />
      <CommandBar engine={eng} ui={ui} />
    </div>
  );
}

function TopBar({ engine }: { engine: () => CadEngine }) {
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
      {TOOLS.map((t, i) => (
        <span key={t.name}>
          {(i === 1 || i === 9) && <div className="sep" />}
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
      <LayerPanel engine={engine} ui={ui} />
    </div>
  );
}

function NlPanel({ engine }: { engine: () => CadEngine }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ msg: string; kind: "ok" | "err" | "" }>({ msg: "", kind: "" });

  const run = useCallback(async () => {
    const prompt = text.trim();
    if (!prompt || busy) return;
    setBusy(true);
    setStatus({ msg: "Claude가 도면을 생성 중…", kind: "" });
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
  }, [text, busy, engine]);

  return (
    <section className="nl">
      <h3>자연어로 그리기 (Claude)</h3>
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
      <span className={`pill ${ui?.snapOn ? "on" : ""}`} onClick={() => engine().toggleSnap()}>
        스냅
      </span>
      <span className={`pill ${ui?.gridOn ? "on" : ""}`} onClick={() => engine().toggleGrid()}>
        그리드
      </span>
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
