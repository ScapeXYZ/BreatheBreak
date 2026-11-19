# Real SmartSpectra session evidence — November 16, 2026

## Scope and sources

This report documents one real SmartSpectra session from the private, gitignored `.diagnostics/r1-live-test.ndjson` file and the checked-in aggregate receipt screenshot. It contains counts, timestamps, camera settings, and receipt aggregates only—no frames, raw physiological samples, API keys, or private diagnostics file.

- Run ID: `403701e1-6e8d-486d-a56d-0f8ce021fba2`
- Session ID: `761df35a-f09b-41c9-93b8-e79562894807`
- Receipt image: [`../images/real-sdk-receipt-2026-11-16.png`](../images/real-sdk-receipt-2026-11-16.png)
- Camera-positioning reference: [`../images/camera-positioning-reference.jpg`](../images/camera-positioning-reference.jpg)

## Verified diagnostics

| Evidence | Result |
| --- | --- |
| Source | `real` |
| Start | `2026-11-16T20:32:28.622Z` |
| End | `2026-11-16T20:34:14.703Z` |
| Duration | 106.081 seconds |
| Negotiated camera settings | 640×480 at 30 FPS |
| Preflight | 30 FPS |
| Unique breathing-rate samples | 30 |
| Confidence bins (0–19 / 20–44 / 45–69 / 70–100) | 5 / 16 / 5 / 4 |
| Gate-accepted samples | 9 |
| Baseline completion | Time cap, 50.885 seconds after session start |
| Pacer | Started `2026-11-16T20:33:22.677Z`; ended `2026-11-16T20:34:10.687Z` |
| SDK errors | None |
| Camera stall | No |
| Stop / media release | Stop at `2026-11-16T20:34:14.645Z`; tracks stopped 57 ms later |

## Receipt evidence

The checked-in receipt image visibly shows:

- session median: 18.6 breaths/min;
- observed range: 6.0–21.7 breaths/min;
- accepted receipt readings: 8; and
- guide pace: 4 seconds in, 6 seconds out.

The phase-aware receipt data was `Before n=1` and `After n=7`. Because a full comparison requires at least two accepted readings in each phase, this is a **partial receipt** with no valid Before/After comparison. The checked-in image is a cropped receipt card and does not itself visibly show the 9-of-30 reliability counter or phase counts; those are supported by the sanitized diagnostic events and the phase reconciliation below.

## Why diagnostics report 9 while the receipt reports 8

This difference follows the current counting rules:

1. Diagnostics and the live reliability counter count every unique sample that passes timestamp, confidence, stability, and range gating.
2. Receipt finalization uses only accepted samples tagged while the receipt timeline is `baseline` or `guided`.
3. Eight accepted events occurred within those phases: one baseline reading and seven readings between pacer start and pacer end.
4. The ninth accepted event occurred at `2026-11-16T20:34:12.882Z` (104.260 seconds after Start), 2.195 seconds after `pacer-end` and before Stop. At that point the receipt timeline was `complete`, so the sample counted toward diagnostics/reliability but had no receipt phase and was excluded from receipt aggregates.

The diagnostic summary field `acceptedAfterPacerStart: 8` is a cumulative difference from pacer start through session end; it does not stop counting at `pacer-end`. Its name therefore does not mean “accepted during the guided phase.” The observed 9-versus-8 difference is consistent with implemented semantics and is not, by itself, evidence of a counting defect.

## Limitations

- This run demonstrates real SDK acquisition, accepted readings, a completed manual pacer, safe media release, and a real partial receipt.
- It does **not** demonstrate a valid Before/After comparison because baseline had only one receipt-eligible reading.
- The receipt screenshot is aggregate evidence, not raw-signal evidence.
- One real run does not establish reliability across cameras, lighting, users, or environments.
- Proper framing, front lighting, camera stability, minimal movement, and natural baseline breathing can improve signal quality but do not guarantee accepted readings.
