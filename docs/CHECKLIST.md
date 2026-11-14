# Reset Receipt migration checklist

Status is evidence-based as of November 14, 2026. `NOT VERIFIED` means the requirement is not implemented or lacks direct evidence. A documentation definition is not evidence that product behavior exists.

## MUST

| Item | Status | Evidence |
| --- | --- | --- |
| Reset Receipt product definition | VERIFIED — documentation | `docs/PRODUCT.md` defines the bounded product, receipt calculation, fallback copy, and deferred scope. |
| 60-second live reset | PARTIAL — simulation only | The existing guided pacer completes through its real 60-second mechanism in the full-journey test, but it is not yet presented as the complete Reset Receipt flow and has no authorized real-device verification. |
| Start-vs-end receipt | NOT VERIFIED | The current recap still reports elapsed time, arithmetic mean, and reading count. Median start/end calculation and the six-reading rule are not implemented. |
| Receipt image export | NOT VERIFIED | No export behavior or evidence exists. |
| Three-step first-run guide | NOT VERIFIED | No three-step onboarding flow or evidence exists. |
| Reset Receipt product strings | VERIFIED — code | Window title, primary UI brand, README, and package display name use “Reset Receipt”; internal identifiers remain unchanged. |
| Auto-only flower control | VERIFIED — code/test | The live flower is fixed to Auto and no user-facing quality selector is rendered. Existing bounded Auto adaptation tests remain in place. |
| Stop button always visible | VERIFIED — simulation browser test | `npm run test:layout` asserts the sticky Stop button is inside the viewport and operable at 1280×720, 1280×800, 1440×900, and 1920×1080. Real-device presentation is not claimed. |
| Rate placeholder | VERIFIED — simulation/code | The live rate shows an em dash and “Measuring…” until a valid gated rate exists. |
| Camera status line | VERIFIED — code/simulation | Exact states are `Camera: off`, `Camera: on`, and `Camera: off, simulation`; real-device presentation remains unverified. |
| Signal-quality indicator | VERIFIED — code/simulation | The live Signal row renders the current gated quality kind or neutral guidance. |
| Privacy header copy | VERIFIED — code | Header copy is exactly “This app does not save video.” |
| Raw-session cleanup | VERIFIED — tests | Successful Stop creates the approved immutable current recap before clearing raw stores; fatal-error and manual-clear regression tests also pass. The new receipt summary remains future work. |
| Track-release diagnostic event | VERIFIED — code/test | Authorized live-test diagnostics allowlist a timestamped `media-tracks-stopped` event when an acquired stream is released. No real retry has verified the event. |
| Real SDK Reset Receipt verification | NOT VERIFIED | No SDK session is authorized by this migration. Phase 0 stability and the new product flow remain unverified on real hardware. |

## DEFER

| Item | Status | Evidence |
| --- | --- | --- |
| Abdomen layer | DEFERRED | Explicitly deferred for this migration. |
| Recorded-session replay | DEFERRED | Explicitly deferred; private physiological data must not be imported without approval. |
| Settings | DEFERRED | Explicitly deferred for this migration. |
| Windows installer | DEFERRED | Explicitly deferred for this migration. |
| Pulse | DEFERRED | Explicitly deferred; the adapter does not request pulse. |
| Flower density work | DEFERRED | Explicitly deferred; the existing Auto controller remains unchanged. |
