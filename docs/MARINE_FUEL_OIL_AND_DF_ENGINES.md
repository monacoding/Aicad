# 선박용 연료유(MGO·LFO·HFO)와 이중연료 엔진(ME-GI·X-DF) 기술·규정 자료 조사

> 작성일: 2026-08-09 · 조사 범위: 연료유 사양 표준(ISO 8217 등), 국제 규정(MARPOL·SOLAS·IGF),
> 선내 연료유 처리 시스템, LNG 이중연료 엔진 원리(ME-GI / ME-GA / X-DF), 탄소 규제
>
> ⚠️ **원문 파일 첨부 관련 안내**
> 이 조사는 외부 네트워크 접근이 허용 도메인으로 제한된 환경에서 수행되어 PDF 원문을
> 직접 내려받아 저장소에 첨부하지 못했습니다. 대신 **모든 항목에 대해 공식 원문 PDF의
> 직접 링크(딥링크)** 를 §11에 정리했습니다. 사내망/일반망에서 클릭 시 바로 다운로드됩니다.
> ISO 표준 본문(8217, 23306 등)은 저작권 판매물이라 무료 원문이 없으며, 대신
> ① ISO 공식 미리보기(OBP) ② 벙커링사·오일메이저가 배포하는 사양표 전재본
> ③ CIMAC/선급 해설서를 함께 정리했습니다.

---

## 1. 연료 용어 체계 정리 (MGO / MDO / LFO / IFO / HFO / VLSFO)

선박 연료는 정유 공정상의 위치에 따라 **증류유(Distillate, DM 계열)** 와
**잔사유(Residual, RM 계열)** 로 나뉩니다. 현장 상용어와 ISO 8217 등급명이 1:1로
대응하지 않기 때문에 계약·수급 시 반드시 **ISO 등급명(DMA, RMG 380 등)으로 명시**해야 합니다.

| 상용어 | 정식 명칭 | 대응 ISO 8217 등급 | 특징 |
|---|---|---|---|
| **MGO** | Marine Gas Oil | DMA (또는 DMZ) | 100% 증류유, clear & bright, 가열 불필요 |
| **LSMGO** | Low Sulphur MGO | DMA 사양, S ≤ 0.10% | ECA 항해용 |
| **MDO** | Marine Diesel Oil | DMB | 증류유에 소량 잔사유 혼합 가능, clear & bright 요구 없음 |
| **LFO** | Light Fuel Oil | DMB ~ RMA/RMB 저점도 잔사유 | 국내·일본계 현장 용어. **표준 정의가 없는 상용어**로, 통상 "가열이 거의 필요 없는 저점도 연료"(≈ MDO/저점도 IFO)를 뜻함. 계약서에는 반드시 ISO 등급으로 환산해 기재 |
| **IFO 180 / 380** | Intermediate Fuel Oil | RME 180 / RMG 380 | 잔사유 기반, 가열·청정 필요 |
| **HFO / HSFO** | Heavy Fuel Oil | RMG/RMK, S ≤ 3.50% | 스크러버 탑재선 전용 |
| **VLSFO** | Very Low Sulphur Fuel Oil | RMG 380 / RMK 700, S ≤ 0.50% | IMO 2020 대응 주력 연료 |
| **ULSFO** | Ultra Low Sulphur Fuel Oil | RM 또는 DM 계열, S ≤ 0.10% | ECA용. RM계·DM계 둘 다 존재 → **ULSFO-RM / ULSFO-DM 구분 표기 필요** |

> 참고: LFO는 규정 용어가 아닙니다. IMO/ISO 문서에는 등장하지 않으며,
> "MGO/MDO(DMA/DMB)"로 치환해 이해하는 것이 안전합니다.
> 출처: [IBIA — Making sense of low sulphur fuel terminology](https://ibia.net/making-sense-of-low-sulphur-fuel-terminology-ulsfo-rmdm-and-vlsfo-rmdm/),
> [Oiltanking Glossary — MDO & IFO](https://www.oiltanking.com/en/news-info/glossary/marine-diesel-oil-mdo-intermediate-fuel-oil-ifo.html)

---

## 2. ISO 8217 — 선박 연료 사양의 핵심 표준

### 2.1 표준 개요

- 정식 명칭(2024판): **ISO 8217:2024 — Products from petroleum, synthetic and renewable
  sources — Fuels (class F) — Specifications of marine fuels**
- 제정 이력: 1987 → 1996 → 2005 → 2010 → 2012 → **2017** → **2024(현행)**
- 실무상 여전히 **ISO 8217:2017 기준으로 계약**하는 경우가 다수 (2024판 전환 진행 중)
- 공식 페이지: <https://www.iso.org/standard/80579.html>
  · 미리보기(OBP): <https://www.iso.org/obp/ui/#!iso:std:80579:en>

### 2.2 ISO 8217:2017 — Table 1 증류유(Distillate) 주요 한계값

| 항목 | 단위 | DMX | DMA (MGO) | DMZ | DMB (MDO) |
|---|---|---|---|---|---|
| 동점도 @40 °C | mm²/s | 1.400–5.500 | 2.000–6.000 | 3.000–6.000 | 2.000–11.00 |
| 밀도 @15 °C (max) | kg/m³ | — | 890.0 | 890.0 | 900.0 |
| 세탄지수 (min) | — | 45 | 40 | 40 | 35 |
| 황분 (max, 2017판) | % m/m | 1.00 | 1.00 | 1.00 | 1.50 |
| 인화점 (min) | °C | 43 | 60 | 60 | 60 |
| 유동점(하계/동계, max) | °C | −16 | 0 / −6 | 0 / −6 | 0 / −6 |
| 잔류탄소 (10% 잔사, max) | % m/m | 0.30 | 0.30 | 0.30 | 0.30 |
| 회분 (max) | % m/m | 0.010 | 0.010 | 0.010 | 0.010 |
| 수분 (max) | % V/V | — | — | — | 0.30 |
| 윤활성 WSD @60 °C (max) | µm | 520 | 520 | 520 | 520 |
| 산화안정성 (max) | g/m³ | 25 | 25 | 25 | 25 |
| 황화수소 H₂S (max) | mg/kg | 2.00 | 2.00 | 2.00 | 2.00 |
| 산가 (max) | mg KOH/g | 0.5 | 0.5 | 0.5 | 0.5 |
| FAME | % V/V | 검출불가 | de minimis(≤0.5) | de minimis | de minimis |

- **DF 등급 신설(2017)**: DFA / DFZ / DFB — FAME **최대 7.0% V/V** 허용 (EN 14214 준거)
- 위 표는 공개 전재본 대조본입니다. 계약·설계 확정 시 반드시 **구매한 ISO 원문 표** 로 재확인하십시오.
- 무료 전재본(원문 표 그대로): [Uni-Fuels ISO 8217:2017 사양표 PDF](https://uni-fuels.com/wp-content/uploads/2024/10/Uni-Fuels_ISO-8217-2017.pdf),
  [Dan-Bunkering ISO 8217:2017 Distillate PDF](https://dan-bunkering.com/media/fjljsr0p/iso_8217_2017.pdf),
  [ExxonMobil Marine Distillate Fuels ISO 8217:2017 해설 PDF](https://www.exxonmobil.com/marine/-/media/project/wep/exxonmobil/exxonmobil-marine/exxonmobil-marine-distillate-fuels.pdf)

### 2.3 ISO 8217:2017 — Table 2 잔사유(Residual) 주요 한계값 (RMG 380 기준)

| 항목 | 단위 | RMG 380 한계 | 시험법 |
|---|---|---|---|
| 동점도 @50 °C | mm²/s | max 380.0 | ISO 3104 |
| 밀도 @15 °C | kg/m³ | max 991.0 | ISO 3675 / 12185 |
| **CCAI** (착화성 지표) | — | **max 870** | — |
| 황분 | % m/m | 규정치(3.50 / 0.50 등) | ISO 8754 |
| 인화점 | °C | min 60.0 | ISO 2719 |
| 황화수소 H₂S | mg/kg | max 2.00 | IP 570 |
| 산가 | mg KOH/g | max 2.5 | ASTM D664 |
| **총침전물(숙성) TSA** | % m/m | **max 0.10** | ISO 10307-2 |
| 잔류탄소 | % m/m | max 18.00 | ISO 10370 |
| 유동점(하계/동계) | °C | max 30 / 30 | ISO 3016 |
| 수분 | % V/V | max 0.50 | ISO 3733 |
| 회분 | % m/m | max 0.100 | ISO 6245 |
| 바나듐 V | mg/kg | max 350 | IP 501/470 |
| 나트륨 Na | mg/kg | max 100 | IP 501/470 |
| **알루미늄+실리콘 (촉매미분)** | mg/kg | **max 60** | IP 501/470/ISO 10478 |
| 사용후 윤활유(ULO): Ca/Zn/P | mg/kg | Ca>30 & Zn>15, 또는 Ca>30 & P>15 이면 부적합 | IP 501/500 |

- 무료 전재본: [Chevron Marine — ISO 8217:2017 Table 2 (Residual) PDF](https://www.chevronmarineproducts.com/content/dam/chevron-marine/fuels-residual/ISO%208217%202017%20Residual%20Marine%20Fuels.pdf),
  [Merlin Petroleum ISO 8217:2017 RMG PDF](https://merlinpetroleum.com/isospecs/MerlinISO-2017RMG.pdf),
  [VLSFO RMG 380 사양 PDF](https://uploads-ssl.webflow.com/61e9821084415b64c145416e/62696f5a32ff3b06e7dda270_FUEL%20STANDARD%20FOR%20RMG%20380%20VLSFO.pdf)

### 2.4 ISO 8217:2024 개정 핵심 (2024-03 발행)

구조가 **4개 표 체계**로 재편되었습니다.

| 표 | 대상 | 비고 |
|---|---|---|
| Table 1 | 증류유 + 바이오 증류유 (DM / DF 등급) | FAME **최대 100%(B100)** 까지 허용 |
| Table 2 | 잔사유 — 황분 ≤ 0.50% m/m | 저유황 전용 표로 분리 |
| Table 3 | 바이오 잔사유 (**RF 등급**, 신설) | HVO(EN 15940), FAME(EN 14214) 최대 100% |
| Table 4 | 잔사유 — 황분 > 0.50% m/m | 스크러버 선박용 |

주요 변경점:

1. **황분 강화** — DMA·DMZ 황분 상한 1.50 → **1.00% m/m**, DMB 2.00 → **1.50% m/m**
2. **한랭유동성 보고 의무 추가** — DMA·DMZ·DFA 동계 등급에 **Cloud Point, CFPP 보고** 신설
3. **잔사유 전 등급에 최소 동점도 도입** (기존에는 상한만 존재 → 저점도 VLSFO 대응)
4. **유기염소화합물(organic chlorides) 전 등급 금지** 명문화
5. **아스팔텐 안정성 관리 강화** (황분 제한 RM 등급 및 RF 등급)
6. 바이오 등급에 대해 **FAME 함량, 순발열량(NCV), 산화안정성, Cloud Point, CFPP, 세탄가**
   시험·보고 의무 추가 (DF), **FAME·NCV·TSA·TSE** 의무 추가 (RF)
7. 부속서 신설 — **Annex F**(한랭유동 특성), **Annex H**(잔사유 안정성), **Annex K**(잔사유 특성 규명)

출처:
[CIMAC WG7 — ISO 8217:2024 FAQ (공식 PDF)](https://www.bimco.org/media/lj5jcuqe/cimac_guideline_iso_8217_2024_faq_02-2024_final.pdf) ★가장 권위 있는 무료 해설서,
[UK P&I — ISO 8217:2024 업데이트](https://www.ukpandi.com/news-and-resources/news/article/articles/2024/iso-8217-2024-the-marine-fuel-standard-has-been-updated/),
[NorthStandard — ISO 8217:2024 update](https://north-standard.com/insights-and-resources/resources/news/iso-82172024-update),
[Britannia P&I — ISO 8217:2024](https://britanniapandi.com/2024/06/iso-82172024-updates-to-marine-fuel-standards/),
[Maritec — Key Changes 해설](https://www.maritec.com.sg/news-detail/Understand_the_Key_Changes_of_Newly_Released_ISO_8217:2024)

### 2.5 ISO/PAS 23263:2019 — 0.50% 황 연료 보완 규격

IMO 2020 시행에 맞춰 발행된 **공개시방서(PAS)**. ISO 8217 을 대체하지 않고 보완합니다.

- 0.50% 황 연료도 **ISO 8217(권장 2017판) 을 충족해야 함**을 확인
- 추가 기술 고려사항: **동점도(저점도 이슈), 한랭유동성, 안정성(stability),
  착화성(ignition characteristics), 촉매미분(cat fines), 연료 간 상용성(compatibility)**
- ISO 8217:2017 Annex B 에 대한 추가 정보 제공

출처: [ISO 공식 페이지](https://www.iso.org/standard/75113.html),
[ISO/PAS 23263:2019 미리보기 PDF (iTeh 샘플)](https://cdn.standards.iteh.ai/samples/75113/84e9615649224ffb9323e63b538e0047/ISO-PAS-23263-2019.pdf),
[CIMAC WG7 Guideline — Stability & Compatibility (2019) PDF](https://www.cimac.com/cms/upload/Publication_Press/WG_Publications/CIMAC_WG07_Guideline_Stability_and_Compatibility_Nov_2019.pdf)

---

## 3. MARPOL Annex VI — 대기오염 규정

### 3.1 Regulation 14 — SOx / PM (황산화물)

| 구역 | 황분 상한 | 시행일 |
|---|---|---|
| 전 세계(Global) | **0.50% m/m** | 2020-01-01 |
| (이전) 전 세계 | 3.50% m/m | 2012-01-01 ~ 2019-12-31 |
| **ECA (배출규제해역)** | **0.10% m/m** | 2015-01-01 |

- 현행 SOx ECA: **발트해 / 북해 / 북미 / 미국 카리브해**
  · **지중해 ECA** 추가 (2025-05-01 시행)
  · **북동대서양 ECA** — 2026-11 재개 회기에서 채택 예정
- **스크러버(EGCS)** 사용 시 등가 조치(Reg. 4)로 고황유 사용 가능
- **Carriage ban**: 스크러버 미장착선은 0.50% 초과 연료의 **선적·운반 자체 금지** (2020-03-01~)

출처: [IMO — Sulphur oxides (SOx) Regulation 14](https://www.imo.org/en/ourwork/environment/pages/sulphur-oxides-(sox)-%E2%80%93-regulation-14.aspx),
[IMO 2020 FAQ 공식 PDF](https://wwwcdn.imo.org/localresources/en/MediaCentre/HotTopics/Documents/2020%20sulphur%20limit%20FAQ%202019.pdf),
[Resolution MEPC.320(74) — 2019 일관 시행 지침 공식 PDF](https://wwwcdn.imo.org/localresources/en/OurWork/Environment/Documents/Resolution%20MEPC.320(74).pdf),
[ICS — 2020 Global Sulphur Cap 준수 가이던스 PDF](https://www.ics-shipping.org/wp-content/uploads/2019/07/ICS-Guidance-on-Compliance-with-the-2020-Global-Sulphur-Cap-July-2019.pdf),
[EGCSA — Regulation 14 원문 해설](https://www.egcsa.com/regulatory/marpol-annex-vi-regulation-14/)

### 3.2 Regulation 13 — NOx (질소산화물)

출력 130 kW 초과 디젤기관 대상. **n = 정격회전수(rpm)**.

| Tier | 적용(건조일) | n < 130 | 130 ≤ n < 2000 | n ≥ 2000 |
|---|---|---|---|---|
| Tier I | 2000-01-01~ | 17.0 g/kWh | 45 · n^(−0.20) | 9.8 g/kWh |
| Tier II | 2011-01-01~ | 14.4 g/kWh | 44 · n^(−0.23) | 7.7 g/kWh |
| **Tier III** | ECA 내에서 적용 | **3.4 g/kWh** | **9 · n^(−0.20)** | **2.0 g/kWh** |

- Tier I·II 는 **전 세계 적용**, Tier III 는 **NOx ECA(NECA) 내에서만** 적용
- NECA 적용 시점: **북미·미국 카리브해 = 2016-01-01 이후 건조선**,
  **발트해·북해 = 2021-01-01 이후 건조선**
- 저속 2행정(예: n = 100 rpm)의 경우 Tier II ≈ 14.4 → Tier III **3.4 g/kWh** (약 76% 저감)
- 대응 기술: **EGR(배기재순환)**, **SCR(선택적촉매환원)**, 또는 **가스모드 희박연소(LNG DF)**

출처: [IMO — Nitrogen Oxides (NOx) Regulation 13](https://www.imo.org/en/ourwork/environment/pages/nitrogen-oxides-(nox)-%E2%80%93-regulation-13.aspx),
[DieselNet — IMO Marine Engine Regulations (수식·표 정리)](https://dieselnet.com/standards/inter/imo.php),
[ABS Advisory on NOx Tier III Compliance PDF](https://ww2.eagle.org/content/dam/eagle/advisories-and-debriefs/ABS-Advisory-on-NOx-Tier-III-Compliance-20068.pdf)

### 3.3 Regulation 18 — 연료유 가용성 및 품질 (BDN·샘플)

- 연료유는 **가연성 잔재·무기산 무함유**, 선박·인명·성능에 유해하지 않아야 함
- **BDN(Bunker Delivery Note)**: Annex VI **Appendix V** 항목 포함 필수, **최소 3년 선내 보관**
- **MARPOL 대표 샘플**: 봉인·양측 서명, **최소 12개월 보관**(연료 소진 시까지, 선박 관리하)
- **FONAR(Fuel Oil Non-Availability Report)**: 규격 연료 미확보 시 제출 (Reg. 18.2.4)

출처: [IMO — Fuel oil availability and quality (Reg. 18)](https://www.imo.org/en/ourwork/environment/pages/fuel-oil-quality-%E2%80%93-regulation-18.aspx),
[MSC-MEPC.2/Circ.18 — 연료유 샘플링 지침 공식 PDF](https://wwwcdn.imo.org/localresources/en/OurWork/Environment/Documents/annex/MSC-MEPC.2-Circ.18%20-%20Guidelines%20For%20The%20Sampling%20Of%20Fuel%20Oil%20For%20Determination%20Of%20Compliance%20With%20Marpol%20Annex...%20(Secretariat).pdf),
[VPS — MARPOL Annex VI Bunker Sample Record 가이드 PDF](https://www.vpsveritas.com/sites/default/files/2023-03/vps-marpol-annex-vi-sample-record-l.pdf)

---

## 4. SOLAS — 인화점(Flash Point) 규정

- **SOLAS II-2/4.2.1.1**: 선박 연료유 **인화점 최소 60 °C** (밀폐식, Pensky-Martens)
  · 예외: 비상소화펌프 등 A류 기관구역 외 기기 — **43 °C 이상** 허용
  · 예외: 인화점 60 °C 미만 연료는 IGF Code 등 별도 안전요건 하에서만 사용
- 가열식 세틀링·서비스 탱크 설치 시 **고온경보(High-temperature alarm)** 필수
- **2026-01-01 시행 개정 (MSC 106 채택)**:
  · 공급자는 **벙커링 前** 해당 배치의 인화점이 SOLAS 요건에 적합함을 **선언(declaration)** 해야 하며,
    사용 시험법을 명시
  · **BDN 에 실측 인화점 값 또는 적합 확인 문구 기재 의무화**

출처: [KR(한국선급) — 2026-01-01 발효 SOLAS 및 관련 코드 개정 PDF](https://www.krs.co.kr/TECHNICAL_FILE/4-year%20cycle%20amendments%20to%20SOLAS%20and%20related%20Codes%20effective%20on%201%20January%202026%20(E).pdf),
[IBIA — Flashpoint: New IMO regulations put onus on suppliers](https://ibia.net/flashpoint-new-imo-regulations-put-onus-on-suppliers/),
[LR Class News 06/24 — BDN 인화점 정보](https://www.lr.org/en/knowledge/class-news/06-24/),
[Safety4Sea — 2026년 1월 시행 개정 해설](https://safety4sea.com/preventing-inadvertent-use-of-low-flashpoint-amendments-effective-from-january-2026/)

---

## 5. 선내 연료유 처리 시스템 및 엔진 입구 사양

### 5.1 표준 계통 (잔사유 기준)

```
벙커탱크 → 세틀링탱크(Settling, 가열·중력분리)
        → 공급펌프 → 프리히터 → 청정기(Purifier/Clarifier, 원심분리)
        → 서비스탱크(Service/Daily)
        → 공급펌프(Supply) → 순환펌프(Circulating)
        → 최종 히터 + 점도조절기(Viscotherm/Viscosity Controller)
        → 자동역세필터 → 엔진 입구
```

### 5.2 엔진 입구 요구 사양 (MAN B&W 2행정 기준)

| 항목 | 요구값 | 비고 |
|---|---|---|
| **엔진 입구 점도 (HFO)** | **10–15 cSt** | 점도조절기로 가열 제어. RMG 380 은 통상 **135–150 °C** 가열 필요 |
| **최소 허용 점도** | **2 cSt (절대 하한)**, 권장 **3 cSt 이상** | 연료펌프·인젝터 소착(seizure) 방지 |
| MGO 4 cSt(@40 °C) | 엔진 입구 **55 °C 미만** 유지 → 3 cSt 확보 | **연료 쿨러 필요** |
| MGO 2 cSt(@40 °C) | **18 °C 까지 냉각** 해야 3 cSt 도달 | 저점도 MGO는 냉각기 필수 |
| **엔진 입구 Al+Si (촉매미분)** | **최대 15 mg/kg**, 엄격 적용 시 **7 mg/kg** | 벙커 사양은 60 mg/kg 이므로 **청정기로 반드시 저감** |
| 수분 | 가능한 0.1% 이하 | 청정기 성능에 의존 |

### 5.3 촉매미분(Catalytic Fines) 관리 — 실무상 최대 위험 인자

- 정체: FCC 촉매 잔류물, **Al₂O₃ / SiO₂ 경질 입자 (1–75 µm)**
- 손상 모드: **3-body 연마마모** → 실린더라이너·피스톤링·링그루브·연료펌프 급속 마모,
  심하면 **스커핑(scuffing)·소착**
- 저감 수단: **청정기 최적 유량·온도 운전이 핵심** (유량 과다·온도 저하 시 분리효율 급락).
  적정 설계·운전 시 대부분 제거 가능
- 저유황(VLSFO) 전환 후 **cat fines 함량 상승 경향**이 보고됨 → 정기 벙커 분석 필수

출처:
[CIMAC Recommendation 25 — 중유 처리 설비 설계 권고 PDF](https://www.cimac.com/cms/upload/Publication_Press/Recommendations/Recommendation_25.pdf) ★설계 기준 문서,
[CIMAC Recommendation 21 rev.1 — 연료 품질 권고 PDF](https://www.cimac.com/cms/upload/Publication_Press/Recommendations/Recommendation_21_rev1.pdf),
[CIMAC Guideline 03/2023 — Scuffing 원인과 예방 PDF](https://www.cimac.com/cms/upload/workinggroups/WG8/Documents/2023-03-02_CIMAC_Guideline_Scuffing_FINAL.pdf),
[CIMAC Guideline 12/2015 — 잔사유 필터 처리 PDF](https://www.cimac.com/cms/upload/workinggroups/WG7/CIMAC_WG07_2015_Dec_Guideline_Filter_Treatment_Residual_Fuel__Oils.pdf),
[Gard — 촉매미분 증가 경향 해설](https://gard.no/en/insights/widespread-increase-of-cat-fines-in-marine-fuel/),
[MAN — Operation on Low-Sulphur Fuels (2행정) PDF](https://www.egcsa.com/wp-content/uploads/MAN-operation-on-low-sulphur-fuels.pdf)

### 5.4 MAN Energy Solutions 서비스레터 (연료 관련 핵심)

| 문서 | 내용 | 링크 |
|---|---|---|
| SL2019-670 | 저유황 연료 운전 시 주의사항 (Action: IMMEDIATELY) | [PDF](https://www.man-es.com/docs/default-source/service-letters/sl2019-670.pdf) |
| SL2019-686 | 연료 사양·처리 관련 지침 | [PDF](https://www.man-es.com/docs/default-source/service-letters/sl2019-686.pdf) |
| SL2018-663 | 연료 관련 운전 지침 | [PDF](https://www.man-es.com/docs/default-source/service-letters/sl2018-663.pdf) |
| SL2014-593 | 연료 취급·점도 관리 | [PDF](https://www.man-es.com/docs/default-source/service-letters/sl2014-593.pdf?sfvrsn=7bfeb1d6_4) |
| SL2009-515 | 연료 점도/온도 관리 | [PDF](https://man-es.com/docs/default-source/service-letters/sl2009-515.pdf?sfvrsn=c73e6b0d_4) |
| SL2023-737 / SL2023-741 | 최신 연료 관련 지침 | [737](https://www.man-es.com/docs/default-source/service-letters/sl2023-737.pdf?sfvrsn=c4bf0da1_4) / [741](https://man-es.com/docs/default-source/service-letters/sl2023-741.pdf?sfvrsn=1b944467_6) |

서비스레터 전체 검색: <https://www.man-es.com/marine/products/planning-tools-and-downloads/service-letters>

---

## 6. LNG 연료 사양 (ISO 23306) 및 가스연료선 안전 코드

### 6.1 ISO 23306:2020 — 선박용 LNG 연료 사양

- 정식명: *Specification of liquefied natural gas as a fuel for marine applications*
- 재래 가스, 셰일가스, CBM, **바이오메탄, 합성메탄(e-LNG)** 모두 포함
- 최소 발열량 **33.6 MJ/m³** 규정
- ⚠️ **메탄가(Methane Number, MN) 최소값은 규정하지 않음** — 계산법과 최소 MN 은
  **공급자–사용자 간 합의(엔진 OEM 사양 반영)** 사항
- 공식: <https://www.iso.org/standard/75199.html>
  · [미리보기 PDF (iTeh 샘플)](https://cdn.standards.iteh.ai/samples/75199/ebd0d169c5604c4a85d64c5e97599fa8/ISO-23306-2020.pdf)

### 6.2 메탄가(MN)와 엔진 노킹

- 순수 메탄 MN = 100. **질소·에탄·프로판 등 장쇄 탄화수소가 늘면 MN 하락**
- 일반 상용 LNG: **MN ≈ 70–80** (산지·액화 공정에 따라 변동)
- **LNG운반선의 BOG(증발가스)는 메탄 농도가 높아 MN 이 100에 근접** →
  DF 엔진 노킹 마진 유리 (LNGC 에 저압 Otto 엔진이 적합한 이유 중 하나)
- 저압 Otto(예열혼합) 엔진은 **MN 민감** / 고압 Diesel(직분사) 엔진은 **MN 비민감**

출처: [MarineLink — The Importance of Methane Number for Marine Engines](https://www.marinelink.com/news/importance-methane-number-marine-engines-529646),
[CIMAC Guideline 05/2025 — Impact of Gas Quality on Gas Engine Performance PDF](https://www.cimac.com/cms/upload/Publication_Press/WG_Publications/CIMAC_WG17_Guideline_05_2025_Impact_of_Gas_Quality_on_Gas_Engine_Performance_2nd_edition.pdf) ★가스품질–엔진성능 핵심 문서

### 6.3 IGF Code (가스·저인화점 연료선 안전코드)

- 채택: **Resolution MSC.391(95)**, 2015-06 (MSC 95차)
- SOLAS 개정: **MSC.392(95)** → **SOLAS 제II-1장 Part G "저인화점 연료 사용선"** 신설
- 발효: **2017-01-01**
- 적용: 총톤수 500 GT 이상 화물선 + 여객선 (건조계약 2017-01-01 이후 등)
- 현행 본문은 **천연가스(LNG) 기능요건 중심**. 메탄올·암모니아 등 기타 저인화점 연료는
  **대체설계(Alternative Design, SOLAS II-1/55)** 승인 경로로 처리
  (메탄올 잠정지침 MSC.1/Circ.1621, 암모니아 잠정지침 MSC.1/Circ.1687 등)
- 핵심 안전 개념: **이중벽 배관 또는 덕트 + 30 회/h 환기**, **가스밸브유닛(GVU)**,
  **이중격벽·ESD 구역 구획**, **가스탐지·자동차단**, 확률론적 위험도 평가

출처: [IMO — Gas and low-flashpoint fuels code adopted (MSC 95)](https://www.imo.org/en/MediaCentre/PressBriefings/Pages/26-MSC-95-ENDS.aspx),
[MSC.391(95) 결의문 전문](http://www.rise.odessa.ua/texts/MSC391_95e.php3),
[ABS — MSC 95 Brief PDF](https://ww2.eagle.org/content/dam/eagle/regulatory-news/2015/MSC%2095%20Brief.pdf)

- **IGC Code** (가스운반선 건조·설비 코드, MSC.370(93), 2016-07-01 발효)는
  LNG/LPG **화물** 운반선에 적용되며, LNGC 가 **화물 BOG 를 연료로 쓰는 경우** 의
  근거 규정이기도 합니다 (IGC Ch.16 "Use of cargo as fuel").

---

## 7. LNG 이중연료(Dual-Fuel) 엔진 원리 — 핵심 비교

### 7.1 두 가지 근본 방식

```
[고압 직접분사 = Diesel Cycle]           [저압 예혼합 = Otto Cycle]
  MAN B&W ME-GI / ME-GIE                   WinGD X-DF / MAN ME-GA

압축행정 중 공기만 압축                    소기(掃氣) 중 가스를 실린더에 공급
  ↓                                        ↓ (공기+가스 예혼합 상태로 압축)
TDC 부근에서 파일럿유 분사 → 착화          TDC 부근 마이크로 파일럿 분사 → 착화
  ↓                                        ↓
직후 가스를 300 bar 로 직접 분사           예혼합 희박혼합기 전파연소
  ↓                                        ↓
확산연소 (Diffusion combustion)            희박 예혼합 연소 (Lean burn)

▶ 메탄슬립 극소                            ▶ NOx 극소 (Tier III 자체 충족)
▶ 노킹 없음 / MN 무관                      ▶ 크레비스 잔류가스 → 메탄슬립 큼
▶ 부하 응답 우수, 효율 높음                ▶ 노킹·실화(misfire) 창(window) 관리 필요
▶ 고압 FGSS 필요 (CAPEX·전력 소모 큼)      ▶ 저압 FGSS (CAPEX·소요전력 작음)
▶ Tier III 위해 EGR/SCR 별도 필요          ▶ 가스모드 Tier III 후처리 불요
```

### 7.2 MAN B&W ME-GI — 고압 가스분사 (Diesel Cycle)

- **작동 원리**: 압축행정 말 TDC 부근에서 **파일럿 연료(전체의 약 3–5%, ≈ 8 g/kWh)** 를
  압축착화시켜 화종(火種)을 만들고, 그 직후 **약 300 bar 의 천연가스를 실린더에 직접 분사**하여
  확산연소시킴
- **가스 공급 압력**: 정격 **약 300 bar @ 45 °C** (부하에 따라 약 150–400 bar(a))
- **메탄슬립**: **0.2–0.4 g/kWh** 수준. MAN ES 는 25–100% 부하에서 **0.2–0.28 g/kWh 보증**
  → 현재 상용 LNG 엔진 중 최저 수준
- **NOx**: 확산연소이므로 국부 고온 → Tier II. **Tier III 는 EGR 또는 SCR 추가 필요**
- **연료 유연성**: 가스 없을 때 100% 액체연료(HFO/VLSFO/MGO) 운전 가능
- **연계 계열**: **ME-GIE**(에탄, 에탄운반선 표준), **ME-LGIM**(메탄올), **ME-LGIP**(LPG)
- **FGSS**: **PVU(Pump Vaporiser Unit)** — LNG 를 300 bar 로 승압 후 기화.
  고압펌프 소요전력 **≈ 100 kW급**

출처: [MAN B&W ME-GI 제품 페이지](https://www.man-es.com/marine/products/two-stroke-engines/me-gi/me-gi),
[MAN ES — Managing methane slip on ME-GI installations (공식 PDF)](https://www.man-es.com/docs/default-source/document-sync/managing-methane-slip--on-me-gi-installations-eng.pdf?sfvrsn=6c85b336_1) ★,
[MAN ES — ME-GI/ME-GA 포트폴리오](https://www.man-es.com/marine/products/two-stroke-engines/megi-mega),
[ME-GI Dual Fuel MAN B&W Engines — 기술·운영·경제성 백서 PDF](https://maritimeexpert.files.wordpress.com/2018/02/me-gi-dual-fuel-man-b-amp-w-engines.pdf),
[MAN ES — ME-GI 최저 메탄슬립·최고 효율 (2024-08)](https://www.man-es.com/marine/products/two-stroke-engines/2024/08/28/methane-fuelled-me-gi-engines-continue-to-lead-way-with-lowest-methane-slip-and-highest-fuel-efficiency)

### 7.3 WinGD X-DF — 저압 예혼합 희박연소 (Otto Cycle)

- **작동 원리**: 소기 과정 중 실린더 라이너의 **가스흡입밸브(Gas Admission Valve)** 를 통해
  **저압 가스(6–15 bar(g))** 를 공급 → 공기와 예혼합 → 압축 →
  TDC 부근 **마이크로 파일럿(극소량 액체연료)** 분사로 착화 → 희박 예혼합 연소
- **NOx**: 국부 고온점(hot spot)이 없어 NOx 가 **IMO Tier III 한계의 약 50% 수준** →
  **가스모드에서 SCR/EGR 등 후처리 없이 Tier III 충족**
- **메탄슬립**: 1세대 X-DF 저부하에서 **약 3–4 g/kWh** → 밸브 타이밍 개선 등으로
  X-DF2.0/3.0 에서 **약 1–2 g/kWh** 수준까지 감소
- **연료 유연성**: 디젤모드 전환 가능(디젤모드에서는 Tier II, Tier III 위해 SCR 필요한 사양 존재)
- **주의점**: 예혼합 방식이므로 **메탄가(MN) 민감** — 노킹/실화 사이의 운전 창이 좁음

### 7.4 X-DF2.0 + iCER (Intelligent Control by Exhaust Recycling)

- **원리**: 배기의 일부를 냉각·정제하여 **불활성 가스로 흡기에 재순환(저압 EGR 개념)** →
  혼합기 비열 증가·연소온도 저하·연소 제어성 향상 → **노킹 마진 확대**
- **효과 (WinGD 공표)**:
  · **메탄슬립 최대 50% 저감**
  · **연료소비 가스모드 −3%, 디젤모드 −5%**
  · 저압 iCER 로 **CAPEX 절감**
- **X-DF-HP**: WinGD 가 추가로 내놓은 **고압 직분사 계열**(ME-GI 유사 개념) —
  메탄슬립 극소화가 필요한 선형용

출처: [WinGD — X-DF Dual-Fuel Design](https://wingd.com/design-development/engine-technologies/x-df-dual-fuel-design),
[WinGD — X-DF2.0 Technology](https://wingd.com/design-development/engine-technologies/x-df-dual-fuel-design/x-df20-technology),
[WinGD — X-DF-HP](https://wingd.com/design-development/engine-technologies/x-df-dual-fuel-design/x-df-hp),
[WinGD — iCER 브로슈어 공식 PDF](https://wingd.com/media/wqrb0m0w/icer_brochure-deliveringenhancedcombustioncontrol.pdf) ★,
[WinGD — Fuel Guideline DTAA001522 공식 PDF](https://wingd.com/media/ijhk5xce/fuels.pdf) ★엔진메이커 연료사양서,
[WinGD X92DF-2.0 제원](https://wingd.com/products-solutions/engines/x92df-20),
[Motorship — WinGD Low-pressure X-DF Technology](https://www.motorship.com/2-stroke-and-4-stroke/wingd-low-pressure-x-df-technology/1387460.article)

### 7.5 MAN B&W ME-GA — 저압 Otto 사이클 (MAN의 X-DF 대응 기종)

- ME-GI 의 **Otto 사이클 변형**. 코펜하겐 리서치센터 개발, 2021-03 세계 최초 실증
- 예혼합 연소로 **가스모드에서 낮은 NOx → Tier II/III 대응**
- 메탄슬립: 저압 Otto 특성상 **본질적으로 2–4 g/kWh**
- **고압형 EGR 을 옵션 제공** → **메탄슬립 30–50% 저감** + Otto 연소 안정성 향상 →
  **연료유·가스 양 모드에서 후처리 없이 Tier III 충족**. EGR 유닛이 컴팩트하여 **엔진 풋프린트 불변**
- ⚠️ **2024-11 기준 MAN ES 는 ME-GA 라인을 단종(discontinue)** 하고
  ME-GI(고압) 중심으로 정리 — 신조 사양 검토 시 최신 상태 확인 필요

출처: [MAN ES — EGR Offered for Dual-Fuel ME-GA Engine (2020-11)](https://www.man-es.com/company/press-releases/press-details/2020/11/24/egr-offered-for-dual-fuel-me-ga-engine),
[MAN ES — World-First ME-GA Engine Demonstration (2021-03)](https://www.man-es.com/company/press-releases/press-details/2021/03/18/world-first-me-ga-engine-demonstration),
[DieselNet — MAN discontinues ME-GA (2024-11)](https://dieselnet.com/news/2024/11man-es.php)

### 7.6 방식별 비교 요약표

| 항목 | **ME-GI** (고압 Diesel) | **X-DF / X-DF2.0** (저압 Otto) | **ME-GA** (저압 Otto, 단종) |
|---|---|---|---|
| 연소 사이클 | Diesel (확산연소) | Otto (희박 예혼합) | Otto (희박 예혼합) |
| 가스 공급압력 | **≈ 300 bar** (150–400 bar(a)) | **6–15 bar(g)** | 저압 |
| 파일럿 연료량 | 3–5% (≈ 8 g/kWh) | 마이크로 파일럿 (≈ 1% 이하) | 마이크로 파일럿 |
| **메탄슬립** | **0.2–0.4 g/kWh** (보증 0.2–0.28) | 1세대 3–4 → 2.0 세대 **1–2 g/kWh** | 2–4 → EGR 적용 시 30–50% 저감 |
| NOx (가스모드) | Tier II (Tier III 위해 EGR/SCR) | **Tier III 후처리 불요** | EGR 적용 시 **Tier III (양 모드)** |
| 메탄가(MN) 민감도 | 낮음 (직분사) | **높음** (노킹 위험) | 높음 |
| FGSS CAPEX·소요전력 | 큼 (HP 펌프 ≈ 100 kW급) | 작음 | 작음 |
| 주 적용 선종 | LNGC, 컨테이너선, VLCC 등 | LNGC, 컨테이너선 등 | (단종) |

> **선택 논리 요약**
> · **FuelEU/EU ETS 등 WtW 온실가스 규제 강화 → 메탄슬립(GWP20 기준 CH₄ ≈ CO₂의 80배)이
>   비용으로 직결** → 고압 ME-GI 유리
> · **NOx ECA 상시 항해 + CAPEX 최소화** → 저압 X-DF 유리(SCR/EGR 불요)
> · X-DF2.0(iCER) 및 X-DF-HP 로 두 방식의 격차는 축소 중

### 7.7 FGSS (연료가스 공급 시스템) 구성

| 구분 | 고압형 (ME-GI) | 저압형 (X-DF/ME-GA) |
|---|---|---|
| 핵심 기기 | **HP 펌프 + HP 기화기 (PVU)** | LP 펌프 + LP 기화기 / **BOG 압축기** |
| 압력 | 300 bar | 6–17 bar |
| 공통 구성 | 벙커링 스테이션, LNG 저장탱크(+TCS), 글리콜수 순환유닛, BOG 압축기, N₂ 공급, 가스탐지, ESD, **이중벽 배관**, **GVU(가스밸브유닛)** | 동일 |
| 국내 공급사 | HD현대중공업 엔진기계, 삼성중공업, 한화오션 등 | 동일 |

출처: [HD Hyundai Engine & Machinery — FGSS](https://www.hyundai-engine.com/en/products/fgss),
[Transient performance study of high pressure FGSS for LNG fueled ships (ScienceDirect)](https://www.sciencedirect.com/science/article/abs/pii/S0011227522000923)

---

## 8. 탄소·온실가스 규제 (연료 선택에 직결)

### 8.1 IMO — EEXI / CII (MARPOL Annex VI Ch.4)

- **EEXI** (Reg. 23): 현존선 에너지효율지수, 2023-01-01 부 최초 정기검사 시 충족
- **CII** (Reg. 28): **5,000 GT 이상**, 연간 운항 탄소집약도 산정 → **A~E 등급**
  · **E 등급 1회** 또는 **D 등급 3년 연속** 시 **시정조치계획(SEEMP Part III)** 제출 의무
  · 감축계수 연 약 **2%** 강화
- **CII/EEXI 실효성 검토는 2026-01-01 이전 완료** 규정 → 개정 논의 진행 중

출처: [IMO — EEXI and CII FAQ](https://www.imo.org/en/mediacentre/hottopics/pages/eexi-cii-faq.aspx)

### 8.2 IMO Net-Zero Framework (NZF) — **현재 채택 보류 상태**

- MEPC 83 (2025-04) 에서 **MARPOL Annex VI 신설 제5장** 으로 승인
- 구성: ① **GFI(GHG Fuel Intensity) 글로벌 연료 기준** ② **배출 가격/보상 메커니즘**
  (GFI 초과 시 remedial unit 구매)
- **2025-10-14~17 임시회기에서 채택 없이 정회(adjourned)** → **1년 연기**
- **재개 회기: 2026-11-16 ~ 27** — NZF 채택 + **북동대서양 ECA(SOx·PM·NOx) 지정** 함께 논의
- ⏱ 신조·개조 사양 결정 시 **2026-11 결과를 반드시 반영**해야 함

출처: [IMO — Net-zero shipping talks to resume in 2026](https://www.imo.org/en/mediacentre/pressbriefings/pages/imo-net-zero-shipping-talks-to-resume-in-2026.aspx),
[IMO — Net-Zero Framework FAQ](https://www.imo.org/en/mediacentre/hottopics/pages/faqs-the-imo-net-zero-framework.aspx),
[DNV — 채택 1년 연기 해설](https://www.dnv.com/news/2025/decision-on-the-imo-net-zero-framework-delayed-for-one-year/),
[Clyde & Co — MARPOL Annex VI 2026 주요 동향](https://www.clydeco.com/en/insights/2026/april/marpol-annex-vi-key-developments-for-2026)

### 8.3 EU — FuelEU Maritime (Regulation (EU) 2023/1805)

- 발효 2023-10-12, **적용 2025-01-01**. 대상: **5,000 GT 초과, EU/EEA 기항 선박(선적 무관)**
- **Well-to-Wake(WtW) 온실가스 집약도 상한** (gCO₂eq/MJ), **기준값 91.16**
- **CO₂ + CH₄ + N₂O 전부 포함** → **메탄슬립이 직접 페널티로 계상됨** (LNG DF 엔진 선택의 핵심 변수)

| 연도 | 2025 | 2030 | 2035 | 2040 | 2045 | 2050 |
|---|---|---|---|---|---|---|
| 감축률 | **−2%** | −6% | −14.5% | −31% | −62% | −80% |

- 2030-01-01~ TEN-T 항만 2시간 초과 정박 시 컨테이너선·여객선 **OPS(육상전력) 접속 의무**
- 최초 보고서 제출 기한: **2026-03-31** (2025 준수연도)

### 8.4 EU ETS (해운 편입)

- 2024 년부터 단계 도입 (2024: 40%, 2025: 70%, 2026: **100%**)
- **Tank-to-Wake CO₂ 절대량**에 가격 부과 → FuelEU(WtW 집약도)와 **상호 보완**

출처: [EC — FuelEU Maritime 공식 페이지](https://transport.ec.europa.eu/transport-modes/maritime/decarbonising-maritime-transport-fueleu-maritime_en),
[Britannia P&I — FuelEU Maritime 규제 개요 PDF](https://britanniapandi.com/wp-content/uploads/2025/06/Regulatory-Overview-of-Fuel-EU-Maritime-1.pdf),
[Britannia P&I — CII/EEXI 개요](https://britanniapandi.com/2025/06/regulatory-overview-of-carbon-intensity-indicator-cii-and-energy-efficiency-existing-ship-index-eexi/)

---

## 9. 설계·운항 실무 체크리스트

**연료유(액체) 계통**
- [ ] 계약서에 **ISO 8217 판번호 + 등급명(예: ISO 8217:2017 RMG 380, 0.50% S)** 명기
- [ ] VLSFO 사용 시 **연료 간 상용성(compatibility) 사전 확인** — 서로 다른 배치 혼합 금지 원칙
- [ ] **저점도 MGO 전용 연료 쿨러** 확보 (엔진 입구 3 cSt 이상 유지)
- [ ] 청정기 유량·온도 최적 운전 → **엔진 입구 Al+Si ≤ 15 mg/kg**
- [ ] 인화점 60 °C 확인 + **2026-01-01 부 공급자 선언서 수령** 절차 반영
- [ ] MARPOL 샘플 12개월 / BDN 3년 보관 절차
- [ ] 저유황 전환 시 **연료전환 절차(온도 변화율 ≤ 2 °C/min)** 준수

**가스연료 계통**
- [ ] IGF Code(또는 IGC Ch.16) 적용 범위 확정 + 대체설계 필요 여부
- [ ] **이중벽 배관 + 30 회/h 환기**, GVU 배치, 가스탐지·ESD 로직
- [ ] LNG **메탄가(MN)** 사양을 공급계약에 명시 (ISO 23306 은 MN 미규정)
- [ ] 엔진 선정: 메탄슬립 페널티(FuelEU) vs NOx 후처리 CAPEX 비교
- [ ] Tier III 충족 경로 확정 (가스모드 자체 충족 / EGR / SCR)

---

## 10. 핵심 수치 요약 (암기용)

```
■ 황분        전세계 0.50%  |  ECA 0.10%  |  (스크러버 시 3.50% 가능)
■ 인화점      최소 60 °C (SOLAS II-2/4.2.1), 비상용 43 °C
■ NOx Tier III  n<130: 3.4 g/kWh  |  130≤n<2000: 9·n^-0.2  |  n≥2000: 2.0
■ MGO(DMA)    점도 2.0–6.0 cSt@40°C, 밀도 ≤890, 세탄지수 ≥40
■ RMG 380     점도 ≤380 cSt@50°C, 밀도 ≤991, CCAI ≤870, Al+Si ≤60 mg/kg
■ 엔진 입구   HFO 10–15 cSt, 최소 2 cSt(권장 3), Al+Si ≤15 mg/kg
■ ME-GI       가스 300 bar, 파일럿 3–5%, 메탄슬립 0.2–0.4 g/kWh, Tier II
■ X-DF        가스 6–15 bar(g), 마이크로 파일럿, 메탄슬립 1–4 g/kWh, Tier III 자체충족
■ FuelEU      기준 91.16 gCO2eq/MJ, 2025 −2% → 2050 −80%, WtW, CH4 포함
```

---

## 11. 출처 원문 링크 모음 (다운로드용)

### 11.1 IMO 공식 (무료)

| 문서 | URL |
|---|---|
| Regulation 14 (SOx/PM) 안내 | https://www.imo.org/en/ourwork/environment/pages/sulphur-oxides-(sox)-%E2%80%93-regulation-14.aspx |
| Regulation 13 (NOx) 안내 | https://www.imo.org/en/ourwork/environment/pages/nitrogen-oxides-(nox)-%E2%80%93-regulation-13.aspx |
| Regulation 18 (연료유 품질) 안내 | https://www.imo.org/en/ourwork/environment/pages/fuel-oil-quality-%E2%80%93-regulation-18.aspx |
| **IMO 2020 황분 규제 FAQ (PDF)** | https://wwwcdn.imo.org/localresources/en/MediaCentre/HotTopics/Documents/2020%20sulphur%20limit%20FAQ%202019.pdf |
| **Resolution MEPC.320(74) 일관시행 지침 (PDF)** | https://wwwcdn.imo.org/localresources/en/OurWork/Environment/Documents/Resolution%20MEPC.320(74).pdf |
| **MSC-MEPC.2/Circ.18 연료유 샘플링 지침 (PDF)** | https://wwwcdn.imo.org/localresources/en/OurWork/Environment/Documents/annex/MSC-MEPC.2-Circ.18%20-%20Guidelines%20For%20The%20Sampling%20Of%20Fuel%20Oil%20For%20Determination%20Of%20Compliance%20With%20Marpol%20Annex...%20(Secretariat).pdf |
| MSC 95 — IGF Code 채택 발표 | https://www.imo.org/en/MediaCentre/PressBriefings/Pages/26-MSC-95-ENDS.aspx |
| MSC.391(95) IGF Code 결의문 전문 | http://www.rise.odessa.ua/texts/MSC391_95e.php3 |
| EEXI / CII FAQ | https://www.imo.org/en/mediacentre/hottopics/pages/eexi-cii-faq.aspx |
| Net-Zero Framework FAQ | https://www.imo.org/en/mediacentre/hottopics/pages/faqs-the-imo-net-zero-framework.aspx |
| NZF 2026 재개 회기 안내 | https://www.imo.org/en/mediacentre/pressbriefings/pages/imo-net-zero-shipping-talks-to-resume-in-2026.aspx |

### 11.2 ISO 표준 (유료 — 공식 페이지 / 무료 미리보기)

| 표준 | 공식 | 미리보기·샘플 |
|---|---|---|
| **ISO 8217:2024** | https://www.iso.org/standard/80579.html | https://www.iso.org/obp/ui/#!iso:std:80579:en |
| ISO 8217:2017 (구판) | https://www.iso.org/standard/64247.html | — |
| **ISO/PAS 23263:2019** | https://www.iso.org/standard/75113.html | https://cdn.standards.iteh.ai/samples/75113/84e9615649224ffb9323e63b538e0047/ISO-PAS-23263-2019.pdf |
| **ISO 23306:2020 (LNG 연료)** | https://www.iso.org/standard/75199.html | https://cdn.standards.iteh.ai/samples/75199/ebd0d169c5604c4a85d64c5e97599fa8/ISO-23306-2020.pdf |

### 11.3 CIMAC 공식 가이드라인 (무료 PDF, 실무 최고 권위)

| 문서 | URL |
|---|---|
| **ISO 8217:2024 FAQ (2024-02)** | https://www.bimco.org/media/lj5jcuqe/cimac_guideline_iso_8217_2024_faq_02-2024_final.pdf |
| Stability & Compatibility (2019-11) | https://www.cimac.com/cms/upload/Publication_Press/WG_Publications/CIMAC_WG07_Guideline_Stability_and_Compatibility_Nov_2019.pdf |
| **Recommendation 25 — 중유 처리설비 설계** | https://www.cimac.com/cms/upload/Publication_Press/Recommendations/Recommendation_25.pdf |
| Recommendation 21 rev.1 — 연료 품질 | https://www.cimac.com/cms/upload/Publication_Press/Recommendations/Recommendation_21_rev1.pdf |
| Scuffing 원인·예방 (2023-03) | https://www.cimac.com/cms/upload/workinggroups/WG8/Documents/2023-03-02_CIMAC_Guideline_Scuffing_FINAL.pdf |
| 잔사유 필터 처리 (2015-12) | https://www.cimac.com/cms/upload/workinggroups/WG7/CIMAC_WG07_2015_Dec_Guideline_Filter_Treatment_Residual_Fuel__Oils.pdf |
| **가스 품질이 가스엔진 성능에 미치는 영향 (2025-05, 2판)** | https://www.cimac.com/cms/upload/Publication_Press/WG_Publications/CIMAC_WG17_Guideline_05_2025_Impact_of_Gas_Quality_on_Gas_Engine_Performance_2nd_edition.pdf |
| CIMAC IMO Tier III 준수 사용자 관점 (2019) | https://www.cimac.com/cms/upload/events/circles/circle_2019_SMM/6_Upender_Kumar_SCI.pdf |

### 11.4 엔진 메이커 공식 자료

**MAN Energy Solutions**

| 문서 | URL |
|---|---|
| ME-GI 제품 페이지 | https://www.man-es.com/marine/products/two-stroke-engines/me-gi/me-gi |
| ME-GI / ME-GA 포트폴리오 | https://www.man-es.com/marine/products/two-stroke-engines/megi-mega |
| **Managing methane slip on ME-GI installations (PDF)** | https://www.man-es.com/docs/default-source/document-sync/managing-methane-slip--on-me-gi-installations-eng.pdf?sfvrsn=6c85b336_1 |
| ME-LGIP (LPG) 백서 PDF | https://www.man-es.com/docs/default-source/document-sync/power-into-the-future-b-w-me-lgip--eng.pdf |
| ME-LGIM (메탄올) 기술논문 PDF | https://www.man-es.com/docs/default-source/document-sync-archive/the-methanol-fuelled-man-b-w-lgim-engine-eng.pdf |
| ME-LGI 계열 개요 PDF | https://www.man-es.com/docs/default-source/document-sync-archive/b-w-me-lgi-engines-liquid-gas-injection-methanol-and-lpg-eng.pdf?sfvrsn=c4f46ed1_8 |
| Operation on Low-Sulphur Fuels (2행정) PDF | https://www.egcsa.com/wp-content/uploads/MAN-operation-on-low-sulphur-fuels.pdf |
| **Project Guides (전 기종 프로젝트 가이드)** | https://www.man-es.com/marine/products/planning-tools-and-downloads/project-guides |
| Technical Papers 아카이브 | https://www.man-es.com/marine/products/planning-tools-and-downloads/technical-papers |
| ME-GA EGR 발표 (2020-11) | https://www.man-es.com/company/press-releases/press-details/2020/11/24/egr-offered-for-dual-fuel-me-ga-engine |
| ME-GA 세계 최초 실증 (2021-03) | https://www.man-es.com/company/press-releases/press-details/2021/03/18/world-first-me-ga-engine-demonstration |
| ME-GI 메탄슬립·효율 리더십 (2024-08) | https://www.man-es.com/marine/products/two-stroke-engines/2024/08/28/methane-fuelled-me-gi-engines-continue-to-lead-way-with-lowest-methane-slip-and-highest-fuel-efficiency |
| ME-GI Dual Fuel 백서 (기술·운영·경제성) PDF | https://maritimeexpert.files.wordpress.com/2018/02/me-gi-dual-fuel-man-b-amp-w-engines.pdf |

**WinGD**

| 문서 | URL |
|---|---|
| X-DF Dual-Fuel Design | https://wingd.com/design-development/engine-technologies/x-df-dual-fuel-design |
| X-DF2.0 Technology | https://wingd.com/design-development/engine-technologies/x-df-dual-fuel-design/x-df20-technology |
| X-DF-HP (고압형) | https://wingd.com/design-development/engine-technologies/x-df-dual-fuel-design/x-df-hp |
| **iCER 브로슈어 PDF** | https://wingd.com/media/wqrb0m0w/icer_brochure-deliveringenhancedcombustioncontrol.pdf |
| **WinGD Fuel Guideline DTAA001522 PDF** (연료 사양서) | https://wingd.com/media/ijhk5xce/fuels.pdf |
| X92DF-2.0 제원 | https://wingd.com/products-solutions/engines/x92df-20 |
| X72DF-2.1 / X62DF-2.1 | https://wingd.com/products-solutions/engines/x72df-21 · https://wingd.com/products-solutions/engines/x62df-21 |
| WinGD Compliance Solutions | https://wingd.com/products-solutions/emissions-efficiency/wingd-compliance-solutions |

### 11.5 선급·보험(P&I)·시험기관 해설 (무료 PDF 다수)

| 문서 | URL |
|---|---|
| **KR 한국선급 — 2026-01-01 발효 SOLAS/코드 개정 PDF** | https://www.krs.co.kr/TECHNICAL_FILE/4-year%20cycle%20amendments%20to%20SOLAS%20and%20related%20Codes%20effective%20on%201%20January%202026%20(E).pdf |
| ClassNK — SOx/PM 규제 | https://www.classnk.or.jp/hp/en/activities/statutory/soxpm/index.html |
| ABS — NOx Tier III Compliance Advisory PDF | https://ww2.eagle.org/content/dam/eagle/advisories-and-debriefs/ABS-Advisory-on-NOx-Tier-III-Compliance-20068.pdf |
| ABS — MSC 95 Brief PDF | https://ww2.eagle.org/content/dam/eagle/regulatory-news/2015/MSC%2095%20Brief.pdf |
| DNV — IMO NZF 1년 연기 | https://www.dnv.com/news/2025/decision-on-the-imo-net-zero-framework-delayed-for-one-year/ |
| LR — BDN 인화점 정보 (Class News 06/24) | https://www.lr.org/en/knowledge/class-news/06-24/ |
| UK P&I — ISO 8217:2024 | https://www.ukpandi.com/news-and-resources/news/article/articles/2024/iso-8217-2024-the-marine-fuel-standard-has-been-updated/ |
| Britannia P&I — FuelEU Maritime 개요 PDF | https://britanniapandi.com/wp-content/uploads/2025/06/Regulatory-Overview-of-Fuel-EU-Maritime-1.pdf |
| NorthStandard — ISO 8217:2024 / Cat Fines | https://north-standard.com/insights-and-resources/resources/news/iso-82172024-update · https://north-standard.com/insights-and-resources/resources/articles/cat-fines-and-fuel-management |
| Gard — 촉매미분 증가 경향 | https://gard.no/en/insights/widespread-increase-of-cat-fines-in-marine-fuel/ |
| Gard — IMO 연료유 샘플링 지침 업데이트 | https://gard.no/en/insights/imo-updates-fuel-oil-sampling-guidelines/ |
| VPS — MARPOL Annex VI Sample Record PDF | https://www.vpsveritas.com/sites/default/files/2023-03/vps-marpol-annex-vi-sample-record-l.pdf |
| Intertek — ISO 8217 벙커 시험 | https://www.intertek.com/marine/iso-8217/ |
| ICS — 2020 Global Sulphur Cap 가이던스 PDF | https://www.ics-shipping.org/wp-content/uploads/2019/07/ICS-Guidance-on-Compliance-with-the-2020-Global-Sulphur-Cap-July-2019.pdf |
| Dromon — IMO 2020 Sulphur Limit 설명 PDF | https://www.dromon.com/wp-content/uploads/2021/12/Dromon-TP-on-IMO-2020-Sulphur-Limit_Dec-2021.pdf |
| Bahamas MA — MARPOL Annex VI 황분 통보 PDF | https://www.bahamasmaritime.com/wp-content/uploads/2022/05/MN062-MARPOL-Annex-VI-Fuel-Oil-Sulphur-Limit-v1.0.pdf |

### 11.6 ISO 8217 사양표 전재본 (무료 PDF — 실무 대조용)

| 문서 | URL |
|---|---|
| Uni-Fuels — ISO 8217:2017 전체 | https://uni-fuels.com/wp-content/uploads/2024/10/Uni-Fuels_ISO-8217-2017.pdf |
| Dan-Bunkering — ISO 8217:2017 Distillate | https://dan-bunkering.com/media/fjljsr0p/iso_8217_2017.pdf |
| Dan-Bunkering — ISO 8217:2012 / 2010 | https://dan-bunkering.com/media/azyclmrp/iso_8217_2012.pdf · https://dan-bunkering.com/media/otmhheik/iso_8217_2010.pdf |
| Chevron Marine — ISO 8217:2017 Table 2 (Residual) | https://www.chevronmarineproducts.com/content/dam/chevron-marine/fuels-residual/ISO%208217%202017%20Residual%20Marine%20Fuels.pdf |
| ExxonMobil — Marine Distillate Fuels ISO 8217:2017 | https://www.exxonmobil.com/marine/-/media/project/wep/exxonmobil/exxonmobil-marine/exxonmobil-marine-distillate-fuels.pdf |
| Merlin Petroleum — ISO 8217:2017 RMG | https://merlinpetroleum.com/isospecs/MerlinISO-2017RMG.pdf |
| North Sea Bunker — ISO 8217:2010 Residual | https://www.northseabunker.com/assets/media/pdf/ISO%202010%20Residual%20Marine%20Fuels%20NSB.pdf |
| Tüpraş — RMG 380 제품 사양서 | https://www.tupras.com.tr/assets/img/article/newsletters/product-specification-marine-residual-fuel-RMG-380.pdf |
| RMG 380 VLSFO / HSFO 사양 | https://uploads-ssl.webflow.com/61e9821084415b64c145416e/62696f5a32ff3b06e7dda270_FUEL%20STANDARD%20FOR%20RMG%20380%20VLSFO.pdf · https://uploads-ssl.webflow.com/61e9821084415b64c145416e/62696f28e7d52979d7165c52_FUEL%20STANDARD%20FOR%20RMG%20380%20HSFO-.pdf |
| S&P Global Platts — Global Bunker Fuels 사양 가이드 | https://www.spglobal.com/content/dam/spglobal/ci/en/documents/platts/en/our-methodology/methodology-specifications/shipping/bunker-fuels-specifications.pdf |
| DieselNet — ISO 마린 연료 규격 정리 | https://dieselnet.com/standards/inter/fuel_marine.php |

---

## 12. 확인 필요 / 후속 조사 항목

1. **ISO 8217:2024 Table 1~4 전체 수치** — 유료 표준 구매 후 §2.2/2.3 표와 대조 필요
2. **2026-11 IMO 재개 회기 결과** (NZF 채택 여부, 북동대서양 ECA 지정) — 신조 사양 확정 전 필수
3. **CII/EEXI 실효성 검토 결과** (2026 예정 개정)
4. 메탄올·암모니아 연료 (ME-LGIM / X-DF-M, 암모니아 2행정) — 본 문서 범위 외, 별도 조사 권장
5. 엔진 메이커별 **프로젝트 가이드 원문**에서 연료 온도–점도 선도, FGSS 인터페이스 상세 확인

---

*본 문서는 공개 자료 기반 조사 결과이며, 규정 준수 판단 및 설계 확정 시에는 반드시
최신 IMO/ISO 원문, 선급 규칙, 엔진 메이커 프로젝트 가이드 원본을 확인하십시오.*
