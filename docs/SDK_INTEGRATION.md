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
2. acquires the exact selected camera with `getUserMedia` only from the explicit Start path;
3. constructs `SmartSpectraSDK` with the renderer-embedded API key;
4. supplies the `MediaStream` to the SDK;
5. decodes typed metrics and maps them into application samples;
6. stops the SDK and every media track during cleanup.

The constructor sets `enableAccumulatedOutput: false` and `enableTelemetry: false`. This disables Presage session telemetry, not authentication, model delivery, usage records, or every possible SDK request. See [PRIVACY.md](PRIVACY.md).

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

## Verification boundary

Offline tests cover mapping, gating, state transitions, receipt calculation, session safety, simulation isolation, and fake-real-source integration. R3 and R4 supplied real-SDK evidence on earlier builds. The current merged build's safety and receipt flow still require the separately authorized R5 hardware run; simulation and fake-source results are not real sensing evidence.

