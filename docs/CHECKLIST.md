# BreatheBreak authoritative checklist

This checklist replaces no prior tracker and does not reconstruct the unavailable 59-item list. Status is evidence-based as of November 13, 2026. `NOT VERIFIED` means the acceptance condition is absent, incomplete, or lacks direct evidence.

## MUST

| Item | Status | Evidence |
| --- | --- | --- |
| Checkpoint | VERIFIED | D4 and integration work are checkpointed on `design-redesign` in commits `7637458`, `4af0d79`, and `a0749e1`; final readiness documentation is checkpointed separately. |
| Real SDK live check in BreatheBreak | NOT VERIFIED | Real adapter code compiles, but BreatheBreak has not completed an authorized real-device acceptance run. Phase 0's three-minute stability gate remains unverified. |
| Stop button always visible | VERIFIED — simulation only | `screenshots/d3/performance.json` records `controlsVisible: true` for Auto, High, and Low at 1280×800 and 1440×900. No real-device UI run is claimed. |
| Rate placeholder — with Measuring… | NOT VERIFIED | The live UI shows an em dash and supporting gate copy, but does not currently show the required “Measuring…” text. |
| Camera status line | VERIFIED — simulation/code | `src/renderer/src/App.tsx` renders “Camera active” for SmartSpectra and “Simulation running” for simulation. Simulation screenshots exist; real-device presentation remains unverified. |
| Signal-quality indicator | VERIFIED — simulation/code | The live Signal row renders the current quality message/kind. D1–D3 simulation screenshots and the full-journey test exercise it. |
| Precise privacy header copy | NOT VERIFIED | The current header says “Private by design, video is not recorded,” but no authoritative acceptance copy is present in the repository. |
| Data Handling panel | NOT VERIFIED | No approved Data Handling panel is implemented or evidenced. |
| `PRIVACY.md` | NOT VERIFIED | File is absent. |
| `SDK_INTEGRATION.md` | NOT VERIFIED | File is absent. |
| README | VERIFIED | `README.md` distinguishes real integration code, simulation evidence, recap handling, and unverified real-device gates. |
| `CLAIMS.md` claim-to-evidence table | NOT VERIFIED | File is absent. |
| Demo video | NOT VERIFIED | No approved demo video is tracked. |
| Screenshots | VERIFIED — simulation only | D1–D4 evidence exists under `screenshots/after`, `screenshots/d2`, `screenshots/d3`, and `screenshots/d4` at both target resolutions. |
| Cover image | NOT VERIFIED | No approved cover image is identified. |
| DEV post draft | NOT VERIFIED | No draft is identified. |
| Repository pushed | NOT VERIFIED | No push is authorized by this task; private backup requires explicit user confirmation after the security gate. |

## SHOULD

| Item | Status | Evidence |
| --- | --- | --- |
| Flower density pass, maximum 60 minutes | NOT VERIFIED | D3 density is visually evidenced at bounded quality tiers, but the product-lead pass/timebox is not recorded. |
| Recorded-real-session replay, only with explicit user approval of physiological data | NOT VERIFIED | No approval or replay artifact exists. Private physiological evidence must not be imported by default. |
| Agent session upload | NOT VERIFIED | No approved upload evidence exists. |

## DEFER

| Item | Status | Evidence |
| --- | --- | --- |
| Windows installer | DEFERRED | Explicitly deferred by product lead. |
| Recap image export | DEFERRED | Explicitly deferred by product lead. |
| TALKING | DEFERRED | Explicitly deferred; the adapter does not request this metric. |
| Abdomen layer | DEFERRED | Explicitly deferred; abdomen remains optional and does not drive the current visualization. |
| Pulse/HRV | DEFERRED | Explicitly deferred; these metrics are not requested. |
| Settings page | DEFERRED | Explicitly deferred by product lead. |
| Pixel-level E2E | DEFERRED | Explicitly deferred; current functional E2E uses jsdom and visual evidence uses the simulation-only Electron harness. |
