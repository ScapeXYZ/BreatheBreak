# Reset Receipt product definition

Reset Receipt is a consent-first, non-medical breathing experience lasting about 75 seconds: about 25 seconds of measured baseline, followed by 45 seconds of guided breathing and a measured Before-vs-After receipt. The guided pace is an instruction, not a physiological measurement. The receipt uses only stable, gated breathing-rate readings and must never infer stress, relaxation, recovery, or clinical change.

## Three product features

1. **Live reset** — about 25 seconds of baseline followed by a 45-second guided breathing exercise alongside the live, measured breathing visualization.
2. **Receipt with image export** — a clearly sourced start-vs-end receipt that can be exported as an image only after the receipt is valid.
3. **Three-step first-run guide** — explain consent and camera use, position the user for a valid signal, then explain the guided reset and measured receipt.

## Receipt definition

- **Before:** median of all stable, gated breathing-rate readings collected during the baseline phase after warm-up; at least three baseline readings are required.
- **After:** median of the last three stable, gated breathing-rate readings collected during the guided phase; at least three guided-phase readings are required.
- Show the guide pace next to the measured rate so the instruction and observation remain distinct.
- With fewer than six readings, show exactly: **“Not enough stable readings for a receipt”**.
- If either Before or After is missing, do not show a change value.
- Label a valid receipt exactly: **“Measured by SmartSpectra. Not a score. Not medical.”**
- Start and end values are observations, not proof of improvement or any medical, stress, recovery, or relaxation outcome.
- Raw physiological measurements remain in memory only for the active session and are cleared after the immutable receipt summary is created.

## Deferred

- Abdomen layer
- Recorded-session replay
- Settings
- Windows installer
- Pulse
- Flower density work
