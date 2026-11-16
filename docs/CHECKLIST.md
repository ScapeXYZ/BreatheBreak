# Reset Receipt migration checklist

Status is evidence-based as of November 15, 2026. `NOT VERIFIED` means the requirement is not implemented or lacks direct evidence. A documentation definition is not evidence that product behavior exists.

## MUST

| Item | Status | Evidence |
| --- | --- | --- |
| Reset Receipt product definition | VERIFIED — documentation | `docs/PRODUCT.md` defines the bounded product, receipt calculation, fallback copy, and deferred scope. |
| Adaptive reset timeline | VERIFIED — offline code/test; partial real evidence | Baseline unlocks after three accepted readings or at a 45-second cap. The pacer remains user-started and preserves the 45-second guided phase. R3/R4 exercised parts of this flow on earlier builds; R6 exercised the current-build baseline cap but did not start the pacer. |
| Session safety bounds | VERIFIED — code/test | Electron suspend and lock-screen events request an immediate source stop; all sessions also have a visible three-minute countdown and automatic stop. Fake-real-source integration tests verify source release and required UI outcomes. Real-device behavior remains unverified. |
| Monotonic pacer interruption | VERIFIED — offline code/test | The pacer uses performance.now(), treats callback gaps over five seconds as Interrupted, records sanitized pause/resume/interruption events, excludes readings collected inside the interrupted stretch, and prevents an interrupted receipt. No current-build real-hardware verification exists. |
| Before-vs-After receipt calculation | VERIFIED — pure code/test; UI integration incomplete | features/receipt/receipt.ts requires at least two accepted readings in both baseline and guided phases, rejects values outside 4–45, and omits change when either side is missing. The recap shows phase counts and insufficient-data behavior, but calculated Before/After values are not wired into the UI. |
| Receipt reliability evidence | VERIFIED — code/test | The live HUD and receipt show accepted SDK-threshold readings out of unique SDK-timestamped samples. The receipt shows `Before n=` and `After n=`; a below-50% acceptance share after 20 seconds displays the approved positioning cue. Real-device presentation remains unverified. |
| Receipt copy and source label | PARTIAL — code/test | Exact insufficient-data copy is rendered and tested. “Measured by SmartSpectra. Not a score. Not medical.” is defined and unit-tested but is not yet rendered with calculated receipt values. |
| Receipt image export | NOT VERIFIED | No export behavior or evidence exists. |
| Three-step first-run guide | NOT VERIFIED | No three-step onboarding flow or evidence exists. |
| Reset Receipt product strings | VERIFIED — code | Window title, primary UI brand, README, and package display name use “Reset Receipt”; internal identifiers remain unchanged. |
| Auto-only flower control | VERIFIED — code/test | The live flower is fixed to Auto and no user-facing quality selector is rendered. Existing bounded Auto adaptation tests remain in place. |
| Stop button always visible | VERIFIED — simulation browser test | `npm run test:layout` asserts the sticky Stop button is inside the viewport and operable at 1280×720, 1280×800, 1440×900, and 1920×1080. Real-device presentation is not claimed. |
| Rate placeholder and baseline progress | VERIFIED — simulation/code | The live rate shows an em dash and “Measuring…” until a valid gated rate exists; baseline progress shows accepted readings out of three and explicit completion copy. |
| Camera status line | VERIFIED — code/simulation | Exact states are `Camera: off`, `Camera: on`, and `Camera: off, simulation`; real-device presentation remains unverified. |
| Signal-quality indicator | VERIFIED — code/simulation | The live Signal row renders the current gated quality kind or neutral guidance. |
| Privacy header copy | VERIFIED — code | Header copy is exactly “This app does not save video.” |
| Raw-session cleanup | VERIFIED — tests | Successful Stop creates the approved immutable current recap before clearing raw stores; fatal-error and manual-clear regression tests also pass. The new receipt summary remains future work. |
| Track-release diagnostic event | VERIFIED — code/test | Authorized live-test diagnostics allowlist a timestamped `media-tracks-stopped` event when an acquired stream is released. No real retry has verified the event. |
| Sanitized reliability diagnostics | VERIFIED — code/test | Five-second records include unique SDK-confidence-bin counts; session summaries and copied Run Reports include bin totals, accepted-reading elapsed seconds, wall/active/pause timing, largest diagnostic gap, and last rate/chest times. Exact schemas reject extra fields and retain no physiological values or raw confidence values. |
| Real SDK Reset Receipt verification | PARTIAL | R3–R6 and later error-14 runs produced sanitized real-SDK evidence across multiple builds. Current-build camera startup, baseline, error cleanup, and media release have hardware evidence, but no current-build real run produced a full Before/After receipt. Suspend/lock and interruption handling retain offline test coverage only. |

## DEFER

| Item | Status | Evidence |
| --- | --- | --- |
| Abdomen layer | DEFERRED | Explicitly deferred for this migration. |
| Recorded-session replay | DEFERRED | Explicitly deferred; private physiological data must not be imported without approval. |
| Settings | DEFERRED | Explicitly deferred for this migration. |
| Windows installer | DEFERRED | Explicitly deferred for this migration. |
| Pulse | DEFERRED | Explicitly deferred; the adapter does not request pulse. |
| Flower density work | DEFERRED | Explicitly deferred; the existing Auto controller remains unchanged. |
