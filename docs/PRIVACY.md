# Privacy and data handling

This document separates behavior implemented by Reset Receipt from statements made by Presage about SmartSpectra. It is not a promise of zero network traffic or exclusively on-device processing.

## What Reset Receipt stores locally

- During an explicitly authorized live test, the app writes sanitized NDJSON diagnostics to `.diagnostics/r1-live-test.ndjson`. The directory is gitignored. Records contain launch/session identifiers, source mode, event timestamps, SDK error codes, camera label, aggregate counts, confidence-bin counts, timing, CPU percentage, and signal-window share. They do not contain raw frames or physiological values.
- The first-run guide writes `breathebreak.guideSeen.v1=true` to renderer `localStorage` after the guide is skipped or completed.
- Camera selection writes the selected device ID to `localStorage` as `breathebreak.cameraId`. Removing the selection removes that value.
- During a session, bounded chest-trace, breathing-rate, quality, and guided-completion buffers are held in memory. Stop creates the approved recap summary and then clears the raw recorder buffers. The in-memory recap can include aggregate values and a decimated chest trace until the user resets or closes the app.

Live-test diagnostics are disabled unless `BREATHEBREAK_LIVE_TEST` exactly equals the authorization sentinel. Local diagnostics are not deleted automatically by the app; the operator must delete the ignored `.diagnostics` directory when it is no longer needed. Browser/Electron `localStorage` values remain until cleared by the app, the user, or the Electron profile. These retention behaviors are supported by source inspection but have not been independently verified against every failure or operating-system shutdown mode.

## What Reset Receipt does not store

Reset Receipt does not implement video or frame recording and does not write camera images to its diagnostics or receipt export. The live source supplies a `MediaStream` to SmartSpectra while a user-started session is active. Source inspection found no application code that saves those frames. This has not been independently verified by a network or filesystem capture on every supported machine.

The PNG receipt exporter receives approved aggregate receipt fields only. It does not receive run IDs, session IDs, camera labels, raw readings, or frames.

## Consent and camera lifecycle

Normal real mode requires an available SDK key, a selected camera, an explicit consent checkbox, and the **Start session** action. Camera enumeration can occur on the welcome screen in real mode so the user can select a device; capture starts only during the explicit session-start path. Stop and teardown call the source cleanup path, which stops media tracks. Suspend and lock events request a forced stop. Current-build hardware behavior has not yet been independently verified.

Source-only simulation mode is separate. It disables environment-file loading and SDK entry points, denies permission requests, and does not enumerate or acquire cameras. It is interface evidence only.

## What Presage says the SDK sends

Reset Receipt constructs `SmartSpectraSDK` with `enableTelemetry: false`. Presage's [SDK Telemetry & Privacy page](https://smartspectra.presagetech.com/docs/telemetry-and-privacy/) says telemetry defaults on, and that when disabled the SDK “starts no telemetry session and transmits nothing” **for telemetry**. That setting does not imply zero SDK network traffic.

Presage says enabled measurement-session telemetry contains SDK/runtime details, session shape, performance counts, validation-state counts, coarse errors, and a wall-clock timestamp. It says telemetry excludes raw video/image frames and measured physiological values. It also says authenticated requests may be correlated with an account and must not be described as anonymous.

Presage's [SmartSpectra SDK Privacy Policy](https://presagetech.com/legal/privacy-policy) separately states that SDK services may receive:

- application credentials, app attestation, hashed device identifiers, SDK version, IP address, and related information for authentication and model delivery;
- usage records such as session/batch identifiers, start/end times, and produced-measurement counts;
- measurements, request metadata, and prompt text when Insights are generated.

Reset Receipt does not call `requestInsight` and does not provide an Insights prompt. It requests chest breathing, breathing rate, and abdomen breathing metrics. Whether the installed Node SDK sends any derived measurement values without an Insights request has not been independently verified; Presage's current policy should be treated as authoritative for its service behavior. No claim of zero network traffic or exclusively on-device processing is made here.

## Presage retention and deletion

Presage's telemetry page says full readiness reports and access logs currently have no automatic expiration configured and are governed by applicable policies. Reset Receipt does not call the device-readiness API.

The SmartSpectra SDK Privacy Policy states retention periods including up to 365 days for usage records and telemetry, up to 365 days for ordinary logs, up to seven years for security/audit archives, and backup expiry within 90 days. It says authentication/device records are deleted within 60 days after the developer account closes, while de-identified and aggregated information may be kept without a time limit. These Presage-side practices have not been independently verified by this project and may change; consult the current policy before use or distribution.

Presage directs privacy requests to `support@presagetech.com` and notes that it may need information from the developer or application to locate an end user's records. Deleting Reset Receipt's local files or profile does not itself delete information held by Presage.

## API-key limitation

Real mode reads `VITE_SMARTSPECTRA_API_KEY` in renderer code and passes it to the SDK constructor. Vite therefore embeds the value in the renderer bundle. A packaged desktop application cannot keep that value secret from a determined user. Use only a suitably restricted key under Presage's policy, never commit it, and do not distribute a production credential until the product lead has approved the credential model.

## No optional AI service in this app

Reset Receipt does not request SmartSpectra LLM Insights and has no other AI-service integration. Presage documents Insights as an optional service that can send buffered metric values and prompt text to Presage and an LLM; that feature is outside this app's implemented flow.

