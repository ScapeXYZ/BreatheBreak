# Reset Receipt

Reset Receipt is a consent-first Electron prototype with an adaptive measured baseline followed by a manually started 45-second guided reset. The baseline completes after three accepted readings or unlocks at a 45-second cap, and every session has a three-minute maximum. The app integrates SmartSpectra SDK 3.5.0 and a clearly labelled synthetic development source.

The pure Before/After median calculation is implemented and tested offline. The current recap shows accepted phase counts and the required insufficient-data behavior, but calculated Before/After values and change are not yet integrated into the UI. PNG export and the three-step first-run framing guide are not implemented.

This is a non-medical visualization. It does not produce health, stress, diagnostic, or medical scores.

## Simulation-only interface review

```powershell
cd C:\dev\reset-receipt-ui
npm run dev:sim
```

No camera or key needed. Synthetic data, clearly labeled. For checking the interface, not evidence of real sensing.

Simulation-only mode is available only when running from source. It disables SmartSpectra module loading and IPC binding, denies camera permissions, starts directly in simulation, and disables environment-file loading. Packaged builds always use the normal production configuration.

## Install and validate

Requirements: a supported Node.js/npm environment, an OS-supported camera for manual live verification, and your own SmartSpectra API key.

```powershell
cd C:\dev\breathebreak
npm install
Copy-Item .env.example .env
# Edit .env locally and set VITE_SMARTSPECTRA_API_KEY to your own key.
npm run typecheck
npm test
npm run build
```

`.env` and `.env.*` are ignored, with only the credential-free `.env.example` allowed in Git. The approved SDK Electron design requires the key in the renderer-side SDK constructor, so `VITE_SMARTSPECTRA_API_KEY` is present in the renderer bundle at runtime. Treat desktop application keys as distributable credentials and use a suitably restricted/development key according to your SmartSpectra account policy. Never print it, paste it into issues, or commit it.

Run `npm run dev` only when you intend to perform manual camera verification; build, typecheck, and tests do not start SDK processing or access the camera.

## Consent and camera behavior

SmartSpectra is the default source, but no processing or camera request occurs at launch. The user must:

1. Choose an available camera.
2. review and select the consent checkbox.
3. explicitly click **Start session**.

The selected camera ID is remembered locally. If that exact device disappears, Reset Receipt fails closed and asks for a new selection; it does not silently switch cameras. Camera tracks are stopped on Stop, renderer/window teardown, startup errors, terminal SDK errors, and the forced-stop path used for system suspend or lock.

`DEV SIMULATION` is an explicit option. It is persistently labelled as synthetic and must not be used as SDK or demo evidence.

The repository contains the real SmartSpectra integration code and a separate deterministic simulation source. Automated unit and integration tests are offline; some use deterministic simulation and some use a fake real-source adapter. Screenshots, visual checks, and D3 performance measurements are simulation-only.

R3 and R4 were real-SDK sessions on earlier application builds and produced sanitized lifecycle and reliability telemetry. They do not verify the current Task 9 three-minute stop, suspend/lock handling, or pacer-interruption behavior. Those Task 9 safety changes currently have offline test coverage only and still require an explicitly authorized current-build real-hardware check.

## Metrics and quality

The adapter requests only `CHEST_BREATHING`, `BREATHING_RATE`, and optional `ABDOMEN_BREATHING`. It does not request unavailable metrics or `TALKING`, and never calls `requestInsight`. Only a valid, gated chest trace drives the measured flower; the gated breathing rate is displayed and summarized separately. Missing abdomen data does not block the experience.

There is no fixed-clock warm-up rejection. A rate is accepted only when the SDK marks it stable, confidence is at least 45%, its SDK timestamp is valid and not a duplicate, and its value is within 4–45 breaths per minute. Known SDK positioning and lighting hints are translated into neutral, non-medical guidance.

Before and After each require at least two accepted readings. The pure receipt calculator uses the median of accepted baseline readings for Before and the median of up to the final three accepted guided readings for After. The current recap does not yet display those calculated values; it shows the accepted counts for each phase and exactly **“Not enough stable readings for a receipt”** when either phase has fewer than two.

The guided pacer never starts automatically. The user starts it after baseline completion, and its guided interval remains 45 seconds. A monotonic timer gap over five seconds marks the pacer **Interrupted**, excludes readings collected during the interrupted stretch, and invalidates the Before/After receipt. Sessions stop automatically at three minutes. Electron suspend and lock-screen events also request a stop and camera release. These safety paths are implemented and tested offline, not verified on real hardware in the current build.

Raw physiological measurements are cleared after the current approved immutable summary is created. PNG receipt export and the first-run framing guide remain unimplemented.

Retryable errors, including SDK error 14 (sustained low frame rate), show **Reconnecting** while preserving the last safe garden state. Recovery uses at most three attempts with 500 ms, 1 s, and 2 s delays.

## Privacy and security

- Reset Receipt does not record or persist camera frames.
- A live camera stream is passed to the SmartSpectra SDK only during an explicitly started session.
- SDK telemetry is disabled by this app.
- Camera selection is stored locally. Raw breathing samples are held in memory only for the active session and are cleared on successful Stop, manual clearing, startup/Stop failure, terminal source errors, and teardown. The recap retains only its approved immutable summary.
- Electron keeps `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`, navigation locked down, and uses the official SDK MessagePort IPC bridge.

Review SmartSpectra's own terms and privacy documentation before distributing a build; its SDK and service are separately licensed.

## Architecture

- `src/main`: Electron window and official `bindSmartSpectraIpc` binding.
- `src/preload`: Reset Receipt's narrow bridge plus the official SDK preload bridge.
- `src/renderer/src/signals`: typed simulation and real SDK adapters, measurement gates, camera cleanup, and reconnection.
- `src/renderer/src/store`: deterministic session state and recap.

Licensed under the [MIT License](LICENSE).
