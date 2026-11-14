# Reset Receipt product definition

Reset Receipt is a consent-first, non-medical breathing experience: a 60-second guided reset that ends with a measured start-vs-end breathing receipt. The guided pace is an instruction, not a physiological measurement. The receipt uses only valid, gated breathing-rate readings and must never infer stress, relaxation, recovery, or clinical change.

## Three product features

1. **Live reset** — a 60-second guided breathing exercise alongside the live, measured breathing visualization.
2. **Receipt with image export** — a clearly sourced start-vs-end receipt that can be exported as an image only after the receipt is valid.
3. **Three-step first-run guide** — explain consent and camera use, position the user for a valid signal, then explain the guided reset and measured receipt.

## Receipt definition

- **Start:** median of the first three stable, gated breathing-rate readings collected after warm-up.
- **End:** median of the last three stable, gated breathing-rate readings from the same session.
- A receipt requires at least six stable, gated readings.
- With fewer than six readings, show exactly: **“Not enough stable readings for a receipt”**.
- Start and end values are observations, not proof of improvement or any medical, stress, recovery, or relaxation outcome.
- Raw physiological measurements remain in memory only for the active session and are cleared after the immutable receipt summary is created.

## Deferred

- Abdomen layer
- Recorded-session replay
- Settings
- Windows installer
- Pulse
- Flower density work
