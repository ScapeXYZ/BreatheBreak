# Claim-to-evidence register

This register covers the substantive claims in `README.md` and `docs/PRIVACY.md`. A source path shows implementation or an existing test; it does not mean tests were rerun for this documentation change. Presage behavior is attributed to Presage and is not independently verified unless stated.

| Claim | Evidence | Verification status |
| --- | --- | --- |
| Reset Receipt is an Electron application using SmartSpectra SDK 3.5.0. | `package.json`; `src/main/index.ts` | Verified by source and dependency manifest. |
| The product is non-medical and does not diagnose, treat, score health, make medical decisions, or infer stress/relaxation. | `docs/PRODUCT.md`; `src/renderer/src/features/receipt/receipt.ts` disclosure | Product boundary; absence of every possible future misuse is not independently verifiable. |
| Measured chest/rate signals are kept distinct from guided pacing. | `src/renderer/src/App.tsx`; `src/renderer/src/features/pacer/GuidedPacer.tsx`; `src/renderer/src/components/SessionVisuals.tsx` | Verified by source. |
| A three-step first-run guide is implemented. | `src/renderer/src/features/onboarding/FirstRunGuide.tsx`; `task3FirstRunGuide.pending.test.tsx` | Verified by source; current hardware presentation not verified. |
| Real start requires source availability, camera selection, consent, and Start. | `src/renderer/src/App.tsx` (`canStart`, `start`); `src/renderer/src/store/session.ts` | Verified by source and existing journey tests. |
| Baseline completes after three accepted readings or unlocks at 45 seconds. | `receipt.ts`; `App.tsx`; `store/session.ts`; `store/session.test.ts` | Verified offline by source/test. |
| Guided pacing is user-started and lasts 45 seconds. | `receipt.ts`; `GuidedPacer.tsx`; `pacer.test.ts` | Verified offline. |
| Sessions stop automatically at three minutes. | `src/main/sessionSafety.ts`; `App.tsx`; `sessionSafetyJourney.test.tsx` | Verified offline; current real-hardware behavior unverified. |
| Suspend and lock request a stop. | `src/main/index.ts`; `sessionSafety.ts`; `sessionSafetyJourney.test.tsx` | Verified offline; hardware release behavior unverified on current build. |
| Stop creates a recap and clears raw recorder buffers. | `App.tsx` (`finalizeSuccessfulSession`); `features/sessions/recorder.ts`; `fullJourney.test.tsx` | Verified offline. |
| Full, partial, insufficient, and interrupted receipts are implemented. | `features/receipt/receipt.ts`; `ReceiptView.tsx`; receipt tests | Verified offline. |
| PNG export is aggregate-only and limited to full/partial receipts. | `features/receipt/exportReceipt.ts`; `task3PngExport.pending.test.ts`; `App.test.tsx` | Verified offline; downloaded-file behavior varies by runtime and is not independently verified on all systems. |
| Main binds the official SDK bridge in normal mode. | `src/main/index.ts`; `simulationIsolation.test.ts` | Verified by source/test. |
| Preload imports the official SDK preload bridge. | `src/preload/index.ts`; `simulationIsolation.test.ts` | Verified by source/test. |
| The renderer source owns exact-camera acquisition, SDK construction, metrics, reconnection, and cleanup. | `signals/smartspectra.ts`; `signals/cameras.ts`; `signals/reconnection.ts` | Verified by source; current hardware behavior unverified. |
| Requested metrics are chest breathing, breathing rate, and abdomen breathing. | `signals/smartspectra.ts` (`REQUESTED_METRICS`) | Verified by source. |
| Reset Receipt does not call LLM Insights. | Repository search; `signals/smartspectra.ts`; no `requestInsight` call | Verified for current tracked source. |
| Simulation-only mode needs no key/camera and isolates SDK/camera before initialization. | `scripts/dev-sim.mjs`; `electron.vite.config.ts`; `src/preload/simulation.ts`; `simulationIsolation.test.ts` | Verified offline. |
| Simulation is persistently labelled and is not real sensing evidence. | `App.tsx`; `SimulationReceiptProfiles.tsx`; `exportReceipt.ts` | Verified by source. |
| No installer or signed distributable is provided. | `package.json`; repository file inventory | Verified locally. |
| Real mode reads the user's key from `.env` through `VITE_SMARTSPECTRA_API_KEY`. | `.env.example`; `signals/smartspectra.ts`; Vite configuration | Verified by source. |
| The key is embedded in the renderer bundle and is extractable from a packaged desktop app. | Renderer use of `import.meta.env.VITE_SMARTSPECTRA_API_KEY`; Vite compile-time environment semantics | Verified design limitation; no packaged artifact was inspected in this task. |
| A rate must have a valid timestamp, confidence ≥45, `stable=true`, and value 4–45. | `signals/gating.ts`; `gating.test.ts`; `smartspectraMapping.test.ts` | Verified offline. |
| Samples are deduplicated by SDK timestamp. | `signals/gating.ts` (`UniqueRateGateCounter`) | Verified offline. |
| No fixed-clock warm-up rejection remains. | `signals/gating.ts` | Verified by production gate source. |
| Before is the baseline median; After is the median of up to the last three guided values; each requires n≥2. | `features/receipt/receipt.ts`; `receipt.test.ts` | Verified offline. |
| Partial receipt uses overall median/range/count, while fewer than two readings are insufficient. | `receipt.ts`; `ReceiptView.tsx`; receipt tests | Verified offline. |
| Interrupted pacing invalidates comparison and export. | `receipt.ts`; `ReceiptView.tsx`; `exportReceipt.ts`; pacer/receipt tests | Verified offline. |
| R3 and R4 were real-SDK sessions on earlier builds. | Private gitignored `.diagnostics/r1-live-test.ndjson`; `docs/CHECKLIST.md` | Verified from sanitized lifecycle/source records; not current-build evidence. |
| Current-build real-hardware evidence includes a real partial receipt, but not a successful full Before/After receipt. | `docs/evidence/REAL_SDK_SESSION_2026-11-16.md`; `docs/images/real-sdk-receipt-2026-11-16.png`; private gitignored `.diagnostics/r1-live-test.ndjson` | Verified boundary: the November 16 run produced one baseline and seven guided receipt readings, so comparison eligibility was not met. |
| The first commit was November 11, 2026. | Git commit `209c56e` | Verified from local Git history. |
| Live-test diagnostics run only for the exact authorization sentinel and are gitignored. | `src/shared/liveTest.ts`; `src/main/index.ts`; `.gitignore`; `R1-LIVE-TEST-RUNBOOK.md` | Verified by source. |
| Diagnostics contain allowlisted identity, timestamps, errors, counts, confidence bins, timing, CPU, camera label, and signal share. | `src/shared/liveTest.ts` exact record types/validators | Verified by source. |
| Diagnostics contain no raw frames or physiological values. | `src/shared/liveTest.ts`; schema tests | Verified for application-owned records; third-party behavior is separate. |
| Local diagnostics are not automatically deleted. | `src/main/index.ts` append-only implementation; no deletion path | Verified by source. |
| The guide-seen flag is `breathebreak.guideSeen.v1`. | `FirstRunGuide.tsx` | Verified by source. |
| Camera selection is stored as `breathebreak.cameraId`. | `store/session.ts`; `store/session.test.ts` | Verified by source/test. |
| Raw samples use bounded in-memory buffers; recap may retain aggregates and a decimated trace until reset/close. | `features/sessions/recorder.ts`; `store/session.ts`; `App.tsx` | Verified by source. |
| Reset Receipt does not implement video/frame recording or save camera images. | `signals/smartspectra.ts`; diagnostics/export schemas; repository search | Supported by current source; not independently verified by exhaustive filesystem/network capture. |
| Receipt export excludes IDs, camera labels, raw readings, and frames. | `features/receipt/exportReceipt.ts`; export tests | Verified by allowlisted export object. |
| Camera capture starts only from explicit session Start, though real-mode enumeration occurs beforehand. | `App.tsx`; `signals/smartspectra.ts` | Verified by source; OS/SDK behavior not independently verified. |
| Cleanup stops SDK and media tracks. | `signals/smartspectra.ts`; `signals/cameras.ts`; journey tests; `docs/evidence/REAL_SDK_SESSION_2026-11-16.md` | Verified offline and by the November 16 hardware run, which logged track release 57 ms after Stop. |
| Authorized diagnostics record negotiated width, height, and frame rate without device IDs. | `src/shared/liveTest.ts`; `signals/cameras.ts`; `docs/evidence/REAL_SDK_SESSION_2026-11-16.md` | Verified by source and a real 640×480/30 FPS record. |
| SmartSpectra telemetry is configured off. | `signals/smartspectra.ts` (`enableTelemetry:false`) | Verified by source. |
| Presage says disabling telemetry starts no telemetry session and transmits nothing for telemetry. | [Presage SDK Telemetry & Privacy](https://smartspectra.presagetech.com/docs/telemetry-and-privacy/) | Vendor statement; not independently verified. |
| Presage says telemetry can include SDK/runtime, session, performance, quality/error, and timestamp data but excludes frames and physiological values. | Presage SDK Telemetry & Privacy | Vendor statement; not independently verified. |
| Presage says authenticated requests can be correlated with an account and are not categorically anonymous. | Presage SDK Telemetry & Privacy, “Data boundaries and authentication” | Vendor statement; not independently verified. |
| Presage's policy describes credentials, attestation, hashed device identifiers, IP, usage records, and related service data. | [SmartSpectra SDK Privacy Policy](https://presagetech.com/legal/privacy-policy), sections 4.3–4.4 | Vendor policy; not independently verified. |
| Presage's policy describes measurements, metadata, and prompts for Insights. | SmartSpectra SDK Privacy Policy, sections 4.2 and 7 | Vendor policy; Reset Receipt does not invoke Insights; installed-SDK behavior without an Insights request is unverified. |
| Presage-side retention includes stated 365-day, 60-day-after-close, 90-day-backup, seven-year archive, and indefinite de-identified categories. | SmartSpectra SDK Privacy Policy, section 10 | Vendor policy; not independently verified and subject to change. |
| The telemetry page says full readiness reports/access logs have no automatic expiration configured. | Presage SDK Telemetry & Privacy, “Storage and retention” | Vendor statement; Reset Receipt does not invoke readiness checks; not independently verified. |
| Deleting local Reset Receipt data does not delete Presage-held data. | Separate local deletion implementation and Presage privacy-request process | Logical boundary supported by source/policy; Presage deletion execution unverified. |
| Reset Receipt has no optional AI-service integration. | No `requestInsight` call or AI dependency; `signals/smartspectra.ts`; `package.json` | Verified for current source. |
| The prototype is intended for adults. | Presage SDK Privacy Policy section 13 states SDK Services are for people 18+ | Vendor requirement; application UI does not independently age-gate users. |

## Explicitly unverified

- A successful current-build real full Before/After receipt.
- Complete SDK network traffic in a real session, including whether derived measurements leave the device when Insights are not requested.
- Presage's actual storage, retention, deletion, correlation, security, and subprocessors beyond its published documentation.
- File-system behavior across every crash, power loss, forced termination, or supported Windows configuration.
- Public accessibility and clean-clone success of the configured GitHub repository.
- Installer behavior, because no installer exists.
