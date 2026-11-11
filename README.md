# BreatheBreak

BreatheBreak is a consent-first Electron night-garden visualization driven by breathing signals. Phase 2 integrates SmartSpectra SDK 3.5.0 while preserving the clearly labelled synthetic development source.

This is a non-medical visualization. It does not produce health, stress, diagnostic, or medical scores.

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

The selected camera ID is remembered locally. If that exact device disappears, BreatheBreak fails closed and asks for a new selection; it does not silently switch cameras. Camera tracks are stopped on Stop, renderer/window teardown, startup errors, and terminal SDK errors. A real device run is still required to verify OS-level permission and lifecycle behavior.

`DEV SIMULATION` is an explicit option. It is persistently labelled as synthetic and must not be used as SDK or demo evidence.

## Metrics and quality

The adapter requests only `CHEST_BREATHING`, `BREATHING_RATE`, and optional `ABDOMEN_BREATHING`. It does not request unavailable metrics or `TALKING`, and never calls `requestInsight`. Chest trace drives bloom size; a quality-gated rate drives tempo/color. Missing abdomen data does not block the experience.

Rates appear only after an eight-second warm-up, an SDK-good quality state, stable/confident output, and a 445 breaths/minute range check. Known SDK positioning and lighting hints are translated into neutral, non-medical guidance. Recap baseline statistics use median and median absolute deviation.

Retryable errors, including SDK error 14 (sustained low frame rate), show **Reconnecting&** while preserving the last safe garden state. Recovery uses at most three attempts with 500 ms, 1 s, and 2 s delays.

## Privacy and security

- BreatheBreak does not record or persist camera frames.
- A live camera stream is passed to the SmartSpectra SDK only during an explicitly started session.
- SDK telemetry is disabled by this app.
- Camera selection is stored locally; breathing samples are held in memory for the active session and recap only.
- Electron keeps `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`, navigation locked down, and uses the official SDK MessagePort IPC bridge.

Review SmartSpectra's own terms and privacy documentation before distributing a build; its SDK and service are separately licensed.

## Architecture

- `src/main`: Electron window and official `bindSmartSpectraIpc` binding.
- `src/preload`: BreatheBreak's narrow bridge plus the official SDK preload bridge.
- `src/renderer/src/signals`: typed simulation and real SDK adapters, gates, camera cleanup, reconnection, and baseline utilities.
- `src/renderer/src/store`: deterministic session state and recap.

Licensed under the [MIT License](LICENSE).
