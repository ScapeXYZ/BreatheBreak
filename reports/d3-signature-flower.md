# D3 signature flower report

Measured November 13, 2026 on `design-redesign`. These results use the deterministic DEV SIMULATION screenshot bundle. Camera permissions were denied, the production SDK and camera APIs were verified absent from that bundle, and no live SDK performance claim is made.

## Implementation

- Canvas 2D particle-mesh flower with deterministic preallocated geometry.
- High: 620 particles. Low: 240 particles. Auto begins at 620 and adapts from observed draw median and p95 without changing camera or SDK cadence.
- The flower reads the mutable `SessionRecorder` chest value only while signal quality is `ok`. Invalid or absent input returns the neutral static scale.
- Rendering is capped below 30 FPS, suspends on Recap, and uses production hidden-window throttling plus visibility/focus guards.
- Reduced motion limits deformation and paints only when the measured chest input changes.
- The welcome visual is a static flower labeled Preview. The live visual retains LIVE. Synthetic sessions retain the visible `Dev simulation: synthetic data, not demo evidence` disclosure.

## Performance

| Viewport | Tier | Particles | Draw median / p95 | Achieved / max FPS | CPU | D1 baseline | Increase | Memory |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1280x800 | Auto | 620 | 1.2 / 1.9 ms | 23.33 / 29.94 | 3.227% | 2.302% | +0.925 points | 451.49 MB |
| 1280x800 | High | 620 | 1.3 / 1.9 ms | 22.69 / 29.94 | 3.104% | 2.302% | +0.802 points | 436.46 MB |
| 1280x800 | Low | 240 | 0.5 / 1.0 ms | 21.90 / 29.94 | 2.368% | 2.302% | +0.066 points | 444.78 MB |
| 1440x900 | Auto | 620 | 1.3 / 2.4 ms | 23.21 / 29.94 | 3.231% | 2.103% | +1.128 points | 465.27 MB |
| 1440x900 | High | 620 | 1.0 / 1.8 ms | 22.58 / 29.94 | 2.821% | 2.103% | +0.718 points | 450.15 MB |
| 1440x900 | Low | 240 | 0.6 / 1.1 ms | 22.08 / 29.94 | 2.602% | 2.103% | +0.499 points | 449.96 MB |

Hidden-window frames and Recap frames were zero for every tier and viewport. High passes the 4 ms median, 8 ms p95, and +10 percentage-point CPU budgets at both resolutions. `screenshots/d3/performance.json` is the machine-readable source.

The verifier keeps background throttling disabled during visible draw/CPU sampling, matching prior measurement conditions, then enables Electron's production/default throttling before hiding the window. This is necessary because Electron deliberately reports a hidden off-screen window as visible when throttling is disabled.

## Evidence

- Welcome Preview: `screenshots/d3/welcome-preview-{1280x800,1440x900}.png`
- Live Auto: `screenshots/d3/live-auto-{1280x800,1440x900}.png`
- Live High: `screenshots/d3/live-high-{1280x800,1440x900}.png`
- Live Low: `screenshots/d3/live-low-{1280x800,1440x900}.png`
- Reduced motion: `screenshots/d3/reduced-motion-{1280x800,1440x900}.png`
- D2/D3 comparison: `screenshots/d3/compare.html`

## Verification

- Automated tests: 38 passed across 7 files.
- Typecheck: passed.
- Production build: passed.
- Screenshot safe-bundle audit: passed; SDK and camera APIs absent.
- Dependency audit: 0 vulnerabilities.
- Secret scan: no matches.
- `git diff --check`: passed.
- Hallmark static sweep: 0 FAIL, 0 WARN, 1 approved existing waiver (gate 29, two functional glass panels), F24 answered.
- Hallmark URL sweep linted the live URL, but its Puppeteer render tier could not run because `puppeteer-core` is not installed. Required 1280x800 and 1440x900 captures were produced by the existing Electron methodology and visually reviewed.

## Scope and unresolved items

Production Electron main/preload, the SmartSpectra adapter, consent, camera lifecycle, privacy/error behavior, and phase gates were not modified. No WebGL or Three.js was introduced. No D4 or D5 work was started.

There are no observed D3 performance-gate failures. Live SDK comparison remains intentionally unresolved until SDK stability is established; SDK Attempt 3 on November 15 remains the priority.
