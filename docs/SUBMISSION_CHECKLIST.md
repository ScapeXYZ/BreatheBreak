# Reset Receipt submission checklist

Status reflects evidence available locally on 2026-11-16. `PASS` means the requirement is directly supported by source, documentation, or sanitized telemetry; it does not imply a successful full Before/After receipt unless stated.

| Official requirement | Status | Evidence | Remaining work |
| --- | --- | --- | --- |
| SmartSpectra SDK integrated | PASS | `package.json`; `src/main/index.ts`; `src/preload/index.ts`; `src/renderer/src/signals/smartspectra.ts` | Keep the production credential private and follow the SDK's distribution terms. |
| At least one live Presage signal | PASS | [November 16 real-SDK evidence](evidence/REAL_SDK_SESSION_2026-11-16.md) and [receipt screenshot](images/real-sdk-receipt-2026-11-16.png) document a current-build real run with 30 unique rate samples and a partial receipt. | The run did not qualify for a full Before/After comparison; do not publish private diagnostics. |
| Public repository with setup instructions | PARTIAL | Git remote `backup` points to `https://github.com/ScapeXYZ/reset-receipt.git`; setup and local credential instructions are in `README.md`. Public accessibility was not verified offline. | Confirm unauthenticated public access and that clean-clone setup succeeds. |
| Demo video | FAIL | No demo-video artifact or link was found in the repository. | Record and publish an honest demo using authorized real evidence; clearly label any simulation footage. |
| DEV post using the official template and `#presagechallenge` | UNKNOWN | No DEV-post draft or published URL was found locally. | Create the post from the official template, include `#presagechallenge`, and record its public URL. |
| Consent and Data Handling disclosure: storage, sharing, retention, deletion, SDK telemetry, and optional AI-service use | PARTIAL | `README.md` sections â€œConsent and camera behaviorâ€ and â€œPrivacy and securityâ€; `docs/PRODUCT.md`. Storage, in-memory retention/clearing, camera-frame handling, and SDK telemetry are described. Sharing and optional AI-service use are not explicitly addressed, and SDK/service behavior remains subject to SmartSpectra documentation. | Add explicit sharing and optional-AI statements, precise retention/deletion language, and any SDK-side telemetry/data handling that can be authoritatively supported. |
| No diagnosis or treatment claims | PASS | `README.md` states the app is non-medical and produces no diagnostic or medical scores; `docs/PRODUCT.md` prohibits clinical interpretation. | Preserve this wording in submission and demo materials. |
| No medical decision-making | PASS | `docs/PRODUCT.md` defines observations as non-clinical and prohibits inferred health outcomes; the receipt disclosure is â€œNot medical.â€ | Preserve this boundary in submission and demo materials. |
| No covert monitoring | PASS | `README.md` documents explicit source/camera selection, consent, and Start; camera processing occurs only during an explicitly started session. | Ensure demo and judge instructions follow the same consent flow. |
| Project started during the Nov 4â€“22 challenge window | PASS | First commit `209c56ec6ae90d6d0519928e7aa6e154c5cf49ff`, authored `2026-11-11T01:23:03+01:00`. | Retain Git history showing this date. |
| Individual entry | UNKNOWN | No local submission record identifies the entrant count or team status. | Product lead/entrant must confirm individual eligibility in the submission. |
| Instructions for judges to test | PARTIAL | `README.md` contains setup and launch instructions; `docs/R1-LIVE-TEST-RUNBOOK.md` contains a controlled real-SDK procedure. Neither is currently a concise judge-facing test section. | Add judge-specific prerequisites, launch steps, consent flow, expected results, simulation caveat, and safe failure guidance. |

## Submission blockers visible from local evidence

- Demo video is missing.
- DEV post evidence is missing.
- Public repository accessibility is unverified.
- Individual-entry status is unverified.
- Consent and Data Handling wording is incomplete for sharing and optional AI-service use.
- Judge-facing test instructions need a concise submission-ready section.
