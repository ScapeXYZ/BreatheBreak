# BreatheBreak

Consent-first Electron prototype for a night-garden breathing visualization.

## Current status

- `DEV SIMULATION` is functional and is persistently labelled as synthetic and unsuitable as demo evidence.
- The real SmartSpectra adapter boundary is typed but intentionally unavailable. The licensed SDK is not installed here, and no API key is present. Completing it requires the documented SDK main/preload bridge and renderer `SmartSpectraSDK` APIs without placing a key in renderer-visible code.
- Camera access is not requested at launch (or anywhere in the current incomplete real adapter).
- Abdomen trace is optional; rendering uses chest trace and gated breathing rate.

## Development

```powershell
cd C:\dev\breathebreak
npm install
npm run typecheck
npm test
npm run build
npm run dev
```

`npm run dev` launches Electron; the validation commands do not. Never use simulation output as authentic SDK evidence.

## Security

The window uses `contextIsolation: true`, `sandbox: true`, and `nodeIntegration: false`. The preload exposes one narrow runtime-info method over one allow-listed IPC channel. Secrets belong outside committed files and must never be sent to renderer code or logs.
