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

Every session has a visible three-minute maximum. Suspend or lock requests an immediate stop. The first-run guide, four receipt states, aggregate-only PNG export, reliability counts, and insufficient-data handling are implemented.

## SmartSpectra integration

The Electron main process binds the official SDK IPC bridge in `src/main/index.ts`. `src/preload/index.ts` loads the official SDK preload bridge, and `src/renderer/src/signals/smartspectra.ts` owns camera acquisition, SDK construction, metric delivery, bounded reconnection, and cleanup. Mapping and acceptance live in `smartspectraMapping.ts` and `gating.ts`.

The app requests chest breathing, breathing rate, and optional abdomen breathing. It does not request LLM Insights. See [SDK integration](docs/SDK_INTEGRATION.md) for the complete wiring and file map.

## Run in simulation

Simulation-only mode is for interface review and offline development. It needs no camera or API key, uses synthetic data, and is persistently labelled **SIMULATION, NOT REAL**.

```powershell
git clone https://github.com/ScapeXYZ/BreatheBreak.git
cd BreatheBreak
npm install
npm run dev:sim
```

This source-only command disables environment-file loading, substitutes disabled SDK modules before renderer initialization, does not bind SmartSpectra IPC, and denies camera permissions. Simulation output is not evidence of real sensing.

## Run with real hardware

Use your own SmartSpectra key and never commit it:

```powershell
Copy-Item .env.example .env
# Edit .env and set VITE_SMARTSPECTRA_API_KEY to your own key.
npm run dev
```

Real mode requires an OS-visible camera and an authorized SmartSpectra account. The user must select a camera, check consent, and press **Start session**. Do not start a live session unless camera use and Presage credit consumption are authorized. There is no installer; this repository currently runs from source.

## Consent and data handling

The application does not implement video or frame recording. Raw samples are held in bounded memory buffers during a session and cleared after the recap summary is created. A guide-seen flag and selected camera ID are stored in Electron `localStorage`. Sanitized diagnostics are written only in explicitly authorized live-test mode and are gitignored.

SmartSpectra still uses authenticated network services even though this app sets SDK telemetry off. The renderer bundle also contains the configured API key, so a packaged desktop key would be extractable. Read [Privacy and data handling](docs/PRIVACY.md) before using or distributing the app.

## Reading gate and receipt rules

A unique breathing-rate sample is accepted only when its SDK timestamp is valid, confidence is at least 45, the SDK marks it stable, and its value is within 4–45 breaths per minute. Samples are deduplicated by SDK timestamp; there is no fixed-clock warm-up rejection.

A full Before/After receipt requires at least two accepted readings in each phase. Before is the baseline median. After is the median of up to the final three guided readings. A partial receipt shows aggregate median, range, and count without a comparison. Fewer than two total accepted readings show **“Not enough stable readings for a receipt.”** An interrupted pacer invalidates the comparison and disables export.

## Safety and non-medical boundary

The guided pace is not a physiological measurement. The app does not diagnose, recommend treatment, make medical decisions, infer stress or relaxation, or support covert monitoring. Valid real receipts disclose: **“Measured by SmartSpectra. Not a score. Not medical.”** SmartSpectra metrics are subject to Presage's model cards and limitations.

## What is tested—and what is not

Offline automated coverage includes SDK payload mapping, confidence/stability/range gating, timestamp deduplication, baseline and receipt calculations, pacer timing/interruption, session safety, aggregate export, onboarding, simulation isolation, and a fake real-source journey.

R3 and R4 produced sanitized real-SDK telemetry on earlier builds. They do not verify the current merged build's receipt UI, three-minute stop, suspend/lock release, or interruption behavior. Those current-build behaviors require the separately authorized R5 hardware run. Simulation, fixtures, and fake sources are never presented as real evidence.

## Known limitations

- No Windows installer or code-signed distributable is provided.
- The renderer-embedded API key is not suitable as a long-term production secret.
- Current-build real-hardware acceptance remains pending R5.
- Presage-side network, telemetry, retention, and deletion behavior has not been independently verified by this project.
- The optional abdomen signal is requested but is not required for the receipt.
- This prototype is intended for adults; distribution, accessibility, licensing, and privacy review remain product-lead responsibilities.

## Challenge alignment

The first Git commit is dated November 11, 2026, inside the November 4–22 challenge window. The repository integrates the real Presage SmartSpectra SDK and contains private, gitignored evidence of earlier real sessions. Submission readiness—including the demo, DEV post, public-repository check, entrant status, and judge instructions—is tracked in [SUBMISSION_CHECKLIST.md](docs/SUBMISSION_CHECKLIST.md).

## Project map and license

- `src/main` — Electron lifecycle, SDK IPC binding, session safety, authorized diagnostics.
- `src/preload` — constrained application bridge and official SDK preload bridge.
- `src/renderer/src/signals` — real and simulation sources, mapping, gating, camera cleanup.
- `src/renderer/src/features` — onboarding, recorder, pacer, receipt, and PNG export.
- `docs` — product, privacy, SDK, runbook, claims, and submission evidence.

Licensed under the [MIT License](LICENSE).