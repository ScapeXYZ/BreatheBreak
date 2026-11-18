# Reset Receipt: a breathing break that shows incomplete evidence honestly

> **Demo video:** _Add the public video URL after recording; do not publish this draft until the real video is uploaded._
>
> **GitHub repository:** https://github.com/ScapeXYZ/reset-receipt
>
> **Windows x64 installer:** https://github.com/ScapeXYZ/reset-receipt/releases/download/v0.1.0/Reset-Receipt-0.1.0-Setup-x64.exe

## What I built

Reset Receipt is a Windows desktop breathing break built for the Presage SmartSpectra challenge. It pairs a short, optional guided breathing pacer with a camera-based breathing-rate receipt. Its central product decision is simple: if the session does not contain enough accepted evidence for a comparison, the app says so.

The result can be **full**, **partial**, **insufficient**, or **interrupted**. A full receipt needs at least two accepted readings in both baseline and guided phases. A partial receipt can show aggregate session information but does not invent a Before/After change. This is a non-medical wellness prototype: it does not measure pulse, diagnose, treat, or establish health outcomes.

## Why this problem

A calming interface can imply more certainty than a camera-based measurement supports. I wanted the end of the experience to be as honest as the beginning: users can see when the app observed enough reliable data, and when it did not.

## SmartSpectra integration and live evidence

The real measurement path uses `@smartspectra/node-sdk` in Electron. A user enters their own Presage API key at runtime, selects a camera, gives consent, and starts a session. The app requests chest breathing, breathing rate, and optional abdomen breathing. It gates breathing-rate readings using SDK timestamp validity, stable status, confidence of at least 45, and a 4–45 breaths/min range.

An authorized packaged real-SDK run verified camera access, SmartSpectra callbacks, accepted readings, a completed manual pacer, safe media release, and a **partial** receipt. The phase-aware result had one baseline and seven guided readings, so it was not eligible for a full Before/After comparison. The evidence is documented in the repository; private diagnostics, raw frames, and credentials are not published.

## Consent, privacy, storage, sharing, retention, and deletion

Real mode requires an explicit consent checkbox and Start action. The user selects the camera. Reset Receipt does not implement video or frame recording. The API key remains in renderer memory for the current app run and is not written to app storage, logs, diagnostics, receipts, exports, or Reset Receipt IPC.

The app stores a guide-seen flag and selected camera ID locally. Authorized live-test diagnostics are sanitized and gitignored; they are not automatically deleted and must be removed by the operator when no longer needed. Reset Receipt does not share recorded video or raw frames because it does not record them.

SmartSpectra authentication and service processing are governed by Presage. Telemetry is disabled in the SDK configuration, but that is not a claim of zero network traffic. Deleting local app data does not delete Presage-held information. Reset Receipt does not use SmartSpectra Insights or another optional AI service.

## Technical architecture

Electron provides a sandboxed, context-isolated renderer and a narrow preload boundary. The real source creates a selected-camera `MediaStream`, performs an FPS preflight, hands the stream to SmartSpectra, maps typed SDK metrics to app samples, and releases the SDK and media tracks during cleanup. Simulation is a separate credential-free, camera-free path that visibly states `SIMULATION — NOT REAL`.

## Testing and limitations

The v0.1.0 release acceptance run recorded 10/10 gates as PASS, including 147 automated tests, packaging checks, secret scans, simulation, installation/uninstallation, one authorized packaged real session, and camera cleanup. The Windows x64 installer is unsigned.

A full real Before/After receipt has not been verified on the current build. Camera preflight cannot guarantee sustained processing. Presage-side processing and retention have not been independently audited by this project.

## Try it

Download the Windows x64 installer from the [v0.1.0 GitHub pre-release](https://github.com/ScapeXYZ/reset-receipt/releases/tag/v0.1.0). Use simulation for a credential-free tour. For real measurement, use your own Presage API key and explicit camera consent.

#presagechallenge