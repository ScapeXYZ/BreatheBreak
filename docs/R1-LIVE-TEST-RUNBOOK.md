# R1 live-test readiness runbook

R1 must not begin until Claude explicitly authorizes the live session. This runbook prepares a single controlled Reset Receipt real-SDK check; it is not evidence that the Phase 0 three-minute stability gate has passed.

## Before authorization

1. Stay on `reset-receipt` with a clean, checkpointed working tree.
2. Confirm the API key exists only in the ignored local `.env`; never print or record it.
3. Confirm Camo USB is available and no other application is using it.
4. Check and privately record Presage portal usage before the run.
5. Confirm the intended acceptance duration with Claude. Do not infer three minutes from prior Attempt 3 evidence.
6. Prepare a private `.diagnostics/` location for sanitized metadata only. Do not record frames, raw breathing rates, chest traces, identifiers, or secrets.

## Authorized run

1. Launch Reset Receipt only after Claude's authorization.
2. Confirm the source is **SmartSpectra SDK** (Real SDK).
3. Confirm the **DEV SIMULATION** banner is absent.
4. Confirm the status line says **Live-test log: writing** and note its short run ID.
5. Confirm Camo is selected by its displayed camera entry.
6. Only after those four checks, select consent and press **Start session** once.
7. Confirm no camera permission or SDK processing occurred before Start, and confirm **Start session** was disabled until camera selection and consent were complete.
8. Confirm the camera-status line says **Camera: on**, the LIVE indicator is visible, and the signal-quality row progresses without invented values.
9. Observe the rate placeholder before an accepted reading and confirm **Natural breathing: n of 3 readings** advances only on accepted readings.
10. Confirm the baseline completes by `count` after three accepted readings, or by `cap` at 45 seconds. Confirm the UI says **Baseline done. Start your guided minute.**
11. Confirm the pacer does not start automatically. Start it explicitly, then preserve the 45-second guided phase.
12. Run only for the duration authorized by Claude. Do not record sample values.
13. Keep **Stop session** visible and operable throughout. Press it once at the authorized endpoint.
    - Confirm the visible session-limit countdown is running. The application automatically stops at three minutes.
    - If the computer sleeps or locks, do not resume the attempt: the application must stop, release the camera, and show **Session stopped because the computer went to sleep or was locked**.
14. Confirm the camera indicator clears, camera hardware is released, raw session buffers are cleared, and the recap contains only the approved summary and **Source: SmartSpectra**.
15. Click **Copy run report**. Confirm it includes baseline completion reason, time to baseline completion, accepted counts before and after pacer start, wall-clock and active seconds, total pause duration, largest diagnostic-record gap, and times to the last rate and chest samples. Paste the Run Report verbatim; do not reconstruct or edit it.
16. Press **Done** and confirm the app returns to Welcome/Consent without stale readings or guided metadata.

## After the run

1. Check and privately record Presage portal usage after the run.
2. Compare before/after usage without publishing account data.
3. Stop immediately and report if any SDK error occurs; do not call that attempt a pass.
4. Verify the camera is also released if the window is closed or a fatal error occurs.
5. Keep any sanitized diagnostics private and ignored. Do not commit NDJSON or physiological logs.
6. Report confirmed observations separately from uncertain boundaries. The three-minute gate remains unverified unless an authorized run directly proves its exact duration and stability.
7. Include the copied Run Report verbatim. Its run ID, session ID, source, timestamps, counts, and release status are the canonical sanitized evidence for that attempt.

## Abort conditions

- Camera selection changes or falls back unexpectedly.
- Start occurs without explicit consent.
- Stop is unavailable or clipped.
- Camera remains active after Stop, fatal error, or window close.
- Raw physiological data, credentials, or identifying data would be written to tracked files.
- Presage usage cannot be checked before and after.
- Claude has not explicitly authorized the live session.

## Exact launch preparation (do not run before authorization)

From PowerShell, configure the credential in the ignored local `.env` without printing its value, then launch the explicitly gated R1 mode:

```powershell
Set-Location C:\dev\breathebreak
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
notepad .env  # enter VITE_SMARTSPECTRA_API_KEY locally; do not print it
# Edit .env locally: VITE_SMARTSPECTRA_API_KEY=<development key>
$env:BREATHEBREAK_LIVE_TEST = 'R1_AUTHORIZED'
npm run dev
```

The exact sentinel is intentional: unset, empty, `1`, `true`, or any other value leaves live-test mode disabled. In authorized mode, SDK auto-retry is forced to zero and sanitized diagnostics are written to `.diagnostics/r1-live-test.ndjson`. Remove the process environment setting after the run:

```powershell
Remove-Item Env:BREATHEBREAK_LIVE_TEST -ErrorAction SilentlyContinue
```
