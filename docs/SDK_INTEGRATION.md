# SmartSpectra SDK integration

Reset Receipt uses `@smartspectra/node-sdk` 3.5.0 through the SDK's Electron main/preload/renderer architecture.

## Main process

`src/main/index.ts` creates the sandboxed Electron window. In normal mode it dynamically imports `@smartspectra/node-sdk/main` and calls `bindSmartSpectraIpc(window)`. The logger callback is intentionally empty so SDK diagnostics are not forwarded into application logs.

Source-only simulation mode is resolved before renderer initialization. In that mode the main SDK module is replaced with a disabled adapter, SmartSpectra IPC is not bound, and camera permission checks and requests are denied.

## Preload

`src/preload/index.ts` imports the official SDK preload bridge and exposes Reset Receipt's narrow `window.breathebreak` IPC API with `contextBridge`. The browser window uses context isolation, sandboxing, no Node integration, and web security.

`src/preload/simulation.ts` is the simulation-only preload. It does not import the SDK bridge.

## Renderer source

`src/renderer/src/signals/smartspectra.ts` is the real signal source. It:

1. enumerates video-input devices for explicit selection;
2. acquires the exact selected camera with `getUserMedia` only from the explicit Start path, requesting the Presage-approved ideal 640×480 at 30 FPS;
3. records only the negotiated track width, height, and frame rate when authorized live-test diagnostics are enabled;
4. measures delivered frames for about three seconds before SDK construction and rejects a median below 24 FPS;
5. detaches the hidden preflight video and cancels its frame-callback loop after success while preserving the original stream and camera track;
6. constructs `SmartSpectraSDK` with the renderer-embedded API key and supplies that preserved `MediaStream` to it;
7. decodes typed metrics and maps them into application samples;
8. stops the SDK, watchdog, preflight monitor, and every media track during cleanup.

The constructor sets `enableAccumulatedOutput: false` and `enableTelemetry: false`. This disables Presage session telemetry, not authentication, model delivery, usage records, or every possible SDK request. See [PRIVACY.md](PRIVACY.md).

### Frame-rate safety and cleanup

`src/renderer/src/signals/cameraFrames.ts` owns the preflight measurement and eight-second stall watchdog. The preflight is an application admission check: a passing result does not guarantee that later SDK processing will sustain the same delivery rate.

Once the SDK is active, `frameSentThrough` events reset the watchdog. Eight seconds without one is terminal: the app records a sanitized `camera-stalled` event in authorized live-test mode, stops the session, and releases the camera.

The SDK defines error 14 as `kSustainedLowFrameRate`. `smartspectra.ts` handles it before the reconnect path, stops and releases the session, displays a specific low-frame-rate message, and requires the user to initiate any new session. Other retryable errors retain the existing bounded reconnection policy.

## Requested metrics

The real source requests:

- `MetricType.CHEST_BREATHING`
- `MetricType.BREATHING_RATE`
- `MetricType.ABDOMEN_BREATHING`

Abdomen breathing is optional in the experience. The app does not request pulse, HRV, talking, face analysis, or LLM Insights, and it never calls `requestInsight`.

`src/renderer/src/signals/smartspectraMapping.ts` maps the SDK protobuf payload and SDK callback timestamp into typed rate and trace samples. `src/renderer/src/signals/cameras.ts` filters video devices and owns media-track cleanup.

## Acceptance gate

`src/renderer/src/signals/gating.ts` deduplicates rate samples by the SDK timestamp. A unique rate is accepted only when:

- its SDK timestamp is finite and positive;
- confidence is at least 45;
- the SDK `stable` flag is true;
- the value is finite and between 4 and 45 breaths per minute.

Rejected samples are counted as `lowConfidence`, `unstable`, `outOfRange`, or `badTimestamp`. There is no fixed-clock warm-up rejection in the production gate.

## Session and receipt flow

`src/renderer/src/App.tsx` sends accepted samples to the session store and bounded recorder. `src/renderer/src/store/session.ts` owns the baseline/guided timeline. The baseline completes after three accepted readings or unlocks at the 45-second cap. The guided pacer remains user-started and lasts 45 seconds.

`src/renderer/src/features/receipt/receipt.ts` produces four receipt states:

- **full** when baseline and guided phases each contain at least two accepted readings;
- **partial** when at least two accepted readings exist overall but one phase is short;
- **insufficient** when fewer than two accepted readings exist overall;
- **interrupted** after a qualifying pacer timing interruption.

For a full receipt, Before is the median of accepted baseline values and After is the median of up to the last three accepted guided values. The signed change is `After - Before`. `src/renderer/src/features/receipt/ReceiptView.tsx` renders the result, and `exportReceipt.ts` permits aggregate-only PNG export for full and partial receipts.

## Diagnostics

Authorized live-test diagnostics are implemented in `src/main/index.ts` and `src/shared/liveTest.ts`. They run only when `BREATHEBREAK_LIVE_TEST` exactly equals `R1_AUTHORIZED`, write to the gitignored `.diagnostics` directory, and use exact allowlisted schemas. See [PRIVACY.md](PRIVACY.md) for fields and retention limitations.

The allowlisted camera events contain only:

- `camera-fps-preflight`: the measured FPS number;
- `camera-settings`: negotiated width, height, and frame rate, with unavailable settings represented as `null`;
- `camera-stalled`: the event timestamp and session identity already used by diagnostics.

They do not add frames, raw physiological values, device IDs, camera labels beyond the existing session-start record, or API keys. The November 16 real run verified a sanitized negotiated-settings record of 640×480 at 30 FPS.

## Verification boundary

Offline tests cover mapping, gating, state transitions, receipt calculation, camera preflight and cleanup, permission policy, SDK-frame watchdog behavior, error-14 terminal handling, session safety, simulation isolation, and fake-real-source integration. The complete suite currently passes 146 of 146 tests when run with one worker. Simulation and fake-source results are not real sensing evidence.

Real R2–R6, later error-14 evidence, and the November 16 partial receipt are summarized in the README. They verify real SDK integration, negotiated camera settings, accepted readings, pacer lifecycle, and camera cleanup, but do not establish a successful full Before/After receipt on the current build.
