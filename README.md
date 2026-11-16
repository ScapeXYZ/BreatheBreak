# Reset Receipt

## Overview

Reset Receipt is a consent-first Electron breathing visualization built with SmartSpectra SDK 3.5.0. It measures an adaptive natural-breathing baseline, offers a manually started 45-second guided pacer, and produces a receipt only from readings that pass the SDK-derived acceptance gate. It is a non-medical wellness prototype, not a diagnostic or treatment tool.

## Problem

Camera-based breathing experiences can blur measured signals, guided instructions, and inferred outcomes. Reset Receipt keeps them separate: the chest trace and breathing rate are measurements, the pacer is an instruction, and the receipt reports observations without scoring the user or claiming improvement.

## How it works

1. The user reviews the three-step guide.
2. In real mode, the user selects a camera, checks explicit consent, and presses **Start session**.
3. The baseline completes after three accepted readings or unlocks at 45 seconds.
4. The user may start the 45-second guided pacer; it never starts automatically.
5. Stop releases the source, clears raw session buffers after creating the recap, and shows a full, partial, insufficient, or interrupted receipt.
6. Full and partial receipts can be exported as aggregate-only PNG files. Insufficient and interrupted receipts cannot be exported.

Every session has a visible three-minute maximum. Suspend or lock requests an immediate stop. The first-run guide, four receipt states, aggregate-only PNG export, reliability counts, and insufficient-data handling are implemented.

## SmartSpectra integration

The Electron main process binds the official SDK IPC bridge in `src/main/index.ts`. `src/preload/index.ts` loads the official SDK preload bridge, and `src/renderer/src/signals/smartspectra.ts` owns camera acquisition, SDK construction, metric delivery, bounded reconnection, and cleanup. Mapping and acceptance live in `smartspectraMapping.ts` and `gating.ts`.

The app requests chest breathing, breathing rate, and optional abdomen breathing. It does not request LLM Insights. See [SDK integration](docs/SDK_INTEGRATION.md) for the complete wiring and file map.

## Prerequisites and installation

Reset Receipt is developed and verified on Windows. The reproducible toolchain used for this revision is Node.js 24.14.1 and npm 11.18.0. `package.json` and `package-lock.json` do not declare a broader Node.js `engines` range, so other versions are not claimed as verified.

```powershell
git clone https://github.com/ScapeXYZ/BreatheBreak.git
cd BreatheBreak
npm install
```

Real mode additionally needs an OS-visible camera, a SmartSpectra account, and your own API key. Simulation needs none of those.

## Run in simulation

Simulation-only mode is for interface review and offline development. It needs no camera or API key, uses synthetic data, and is persistently labelled **SIMULATION, NOT REAL**.

```powershell
npm run dev:sim
```

This source-only command disables environment-file loading, substitutes disabled SDK modules before renderer initialization, does not bind SmartSpectra IPC, and denies camera permissions. Simulation output is not evidence of real sensing.

## Run with real hardware

Use your own SmartSpectra key and never commit it:

```powershell
Copy-Item .env.example .env
# Edit .env and replace the empty value copied from .env.example:
# VITE_SMARTSPECTRA_API_KEY=your-own-key
npm run dev
```

The required variable name is exactly `VITE_SMARTSPECTRA_API_KEY`. `.env` files are gitignored; `.env.example` contains only the empty template. Never put a real key in source, screenshots, diagnostics, or a commit.

For a real session:

1. Select the intended camera, read the disclosure, and check the explicit consent box.
2. Press **Start session**. Camera acquisition begins only from this action.
3. Breathe naturally until the baseline reaches three accepted readings or the 45-second cap.
4. Press **Start guided minute** manually, then follow the 45-second guide. It never starts automatically.
5. Press **Stop session** when the guide is complete. Stop releases the camera and opens the receipt.
6. If the receipt is full or partial, use **Export PNG**. Insufficient and interrupted receipts intentionally have no export action.

Do not start a live session unless camera use and Presage credit consumption are authorized. There is no installer; this repository currently runs from source.

### Camera readiness and low-frame-rate handling

Before SmartSpectra starts, real mode measures delivered camera frames for about three seconds. A median result below 24 FPS is rejected before SDK initialization; the UI explains that the SDK needs at least 25 FPS and releases the camera tracks. A passing preflight is an admission check, not proof that SDK processing will sustain that rate.

Real mode requests an ideal 640×480 resolution at 30 FPS. The Presage SDK team directly confirmed that 640×480 is supported, that 1280×720 is a recommendation rather than a requirement, and that the lower resolution should not affect breathing-rate measurement. The browser and camera may negotiate different actual settings; authorized live-test diagnostics record those negotiated dimensions and frame rate.

SmartSpectra error 14 is `kSustainedLowFrameRate`. Reset Receipt treats it as terminal: it does not retry automatically, stops the session, releases the camera, and asks the user to try a different camera or connection, close other applications, and start a new session. Restart is always user initiated.

In repeated Camo-over-Wi-Fi diagnostics, the camera passed the preflight at 30 FPS while subsequent SDK frame delivery was approximately 14–15 FPS and ended with error 14. These records show the mismatch but do not establish Wi-Fi as its cause. The app now records the camera track's negotiated width, height, and frame rate in sanitized live-test diagnostics; that new record has not yet been verified in a hardware run.

## Camera positioning for reliable readings

![Illustrative camera framing with a seated person facing forward and the head, shoulders, and upper chest visible](docs/images/camera-positioning.png)

*Illustrative placeholder created for this guide; replace it if the project owner supplies a repository-approved reference image.*

For the clearest signal:

- Sit facing the camera and position it close to eye level.
- Move far enough back for your full head, both shoulders, and upper chest to remain visible.
- Use soft, even light from the front. Avoid a bright window or lamp directly behind you.
- Keep the camera and its support stable throughout the session.
- Minimize talking, turning, and large upper-body movements while readings are collected.
- Breathe naturally during the baseline; follow the on-screen guide only after starting the pacer yourself.

### Avoid

- framing that crops the upper chest or either shoulder;
- dim, uneven, strongly backlit, or rapidly changing light;
- excessive movement or a moving camera; and
- extreme high, low, or side camera angles.

Proper positioning can improve signal quality, but it does not guarantee accepted readings. The existing rules are unchanged: real mode still rejects a preflight below 24 FPS while explaining that the SDK needs at least 25 FPS, and a breathing-rate sample still needs SDK confidence of at least 45 plus valid stability, timestamp, and range checks.

## Consent and data handling

The application does not implement video or frame recording. Raw samples are held in bounded memory buffers during a session and cleared after the recap summary is created. A guide-seen flag and selected camera ID are stored in Electron `localStorage`. Sanitized diagnostics are written only in explicitly authorized live-test mode and are gitignored.

SmartSpectra still uses authenticated network services even though this app sets SDK telemetry off. The renderer bundle also contains the configured API key, so a packaged desktop key would be extractable. Read [Privacy and data handling](docs/PRIVACY.md) before using or distributing the app.

Electron permission checks and requests are denied except for video-only camera access from the application's own origin and web contents. The active-session watchdog is driven by SmartSpectra `frameSentThrough` events and stops and cleans up after eight seconds without an SDK frame. Content Security Policy hardening and comprehensive IPC sender validation are not claimed complete.

## Reading gate and receipt rules

A unique breathing-rate sample is accepted only when its SDK timestamp is valid, confidence is at least 45, the SDK marks it stable, and its value is within 4–45 breaths per minute. Samples are deduplicated by SDK timestamp; there is no fixed-clock warm-up rejection.

A full Before/After receipt requires at least two accepted readings in each phase. Before is the baseline median. After is the median of up to the final three guided readings. A partial receipt shows aggregate median, range, and count without a comparison. Fewer than two total accepted readings show **“Not enough stable readings for a receipt.”** An interrupted pacer invalidates the comparison and disables export.

## Safety and non-medical boundary

The guided pace is not a physiological measurement. The app does not diagnose, recommend treatment, make medical decisions, infer stress or relaxation, or support covert monitoring. Valid real receipts disclose: **“Measured by SmartSpectra. Not a score. Not medical.”** SmartSpectra metrics are subject to Presage's model cards and limitations.

## What is tested—and what is not

The complete automated suite passes 145 of 145 tests on the documented Windows toolchain when run with one worker (`npm test -- --maxWorkers=1`). Coverage includes SDK payload mapping, confidence/stability/range gating, timestamp deduplication, baseline and receipt calculations, pacer timing/interruption, camera preflight and cleanup, permission policy, session safety, aggregate export, onboarding, simulation isolation, and a fake real-source journey. TypeScript typecheck and the production build also pass.

Simulation, fixtures, and fake sources are never presented as real sensing evidence. No real run has produced a verified full Before/After receipt on the current build.

### Real-session evidence boundary

Private, gitignored sanitized diagnostics support the following limited claims:

| Run | Verified evidence | Boundary |
| --- | --- | --- |
| R2 | A real Camo session started at `2026-11-14T02:10:48.623Z`, Stop was clicked at `02:12:04.654Z`, and media tracks stopped 34 ms later. | Earlier diagnostics did not carry the later self-identifying summary schema; this is lifecycle evidence, not a current-build receipt result. |
| R3 | Real Camo session `6d47a40d-1a71-4062-b6e9-cf042affe72a` lasted 75.831 seconds, produced 11 unique rate samples and one accepted baseline reading, completed baseline by cap, never started the pacer, and released media. | No guided comparison or valid full receipt. |
| R4 | Real Camo session `f415802a-61d1-4738-af9a-624a33fcb469` recorded accepted readings and a pacer interval, but its first pacer interval lasted about 13 minutes 24 seconds. | Earlier-build timing failure; it motivated later three-minute, suspend/lock, and interruption safeguards and is not valid receipt evidence. |
| R5 | Run `47cf7492-16c6-4fa7-881b-2503999566b2` used the integrated webcam, lasted 40.971 seconds, produced zero unique rate samples, reported no SDK errors, logged media tracks stopped, and released 35 ms after Stop. | Wrong camera for the planned Camo validation; no measured FPS was recorded and the run is invalid for Before/After validation. |
| R6 | Run `18431cfe-270c-4e15-8c93-1410888c30eb` used Camo, lasted 91.475 seconds, produced 20 unique rate samples and one accepted baseline reading, completed baseline by cap, never started the pacer, reported no SDK errors, and released media 34 ms after Stop. | No guided comparison or valid full receipt. |
| Recent error-14 runs | Camo-over-Wi-Fi passed a recorded 30 FPS preflight, then SDK delivery fell to approximately 14–15 FPS and SmartSpectra emitted error 14; tracks were released. | Confirms sustained-low-frame-rate handling, not its root cause and not a successful receipt. Negotiated camera-settings diagnostics were added afterward and remain unverified on hardware. |

## Known limitations

- No Windows installer or code-signed distributable is provided.
- The renderer-embedded API key is not suitable as a long-term production secret.
- No successful full Before/After receipt has been verified with the real SDK on the current build.
- A 30 FPS camera preflight did not prevent later sustained-low-frame-rate failures in the observed Camo-over-Wi-Fi runs; the cause remains unproven.
- Presage-side network, telemetry, retention, and deletion behavior has not been independently verified by this project.
- The optional abdomen signal is requested but is not required for the receipt.
- This prototype is intended for adults; distribution, accessibility, licensing, and privacy review remain product-lead responsibilities.

## Challenge alignment

The first Git commit is dated November 11, 2026, inside the November 4–22 challenge window. The repository integrates the real Presage SmartSpectra SDK and contains private, gitignored evidence of real sessions. Submission readiness—including the still-placeholder demo-video URL, DEV-post URL, and public-repository URL, plus entrant status and judge instructions—is tracked in [Submission checklist](docs/SUBMISSION_CHECKLIST.md).

## Project map and license

- `src/main` — Electron lifecycle, SDK IPC binding, session safety, authorized diagnostics.
- `src/preload` — constrained application bridge and official SDK preload bridge.
- `src/renderer/src/signals` — real and simulation sources, mapping, gating, camera cleanup.
- `src/renderer/src/features` — onboarding, recorder, pacer, receipt, and PNG export.
- `docs` — product, privacy, SDK, runbook, claims, and submission evidence.

Detailed evidence and operating documents:

- [SDK integration](docs/SDK_INTEGRATION.md)
- [Privacy and data handling](docs/PRIVACY.md)
- [Claim-to-evidence register](docs/CLAIMS.md)
- [Live-test runbook](docs/R1-LIVE-TEST-RUNBOOK.md)
- [Submission checklist](docs/SUBMISSION_CHECKLIST.md)

Licensed under the [MIT License](LICENSE).
