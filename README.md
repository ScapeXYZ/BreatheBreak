# Reset Receipt

*A guided breathing break with an honest measurement receipt.*

Reset Receipt is a Windows desktop app powered by Presage SmartSpectra. It guides a short breathing exercise and reports what the camera-based measurement actually observed—even when the evidence is incomplete.

**Windows · Electron · SmartSpectra SDK · v0.1.0**

## 1. Download for Windows

**[Download Reset Receipt v0.1.0 for Windows x64](https://github.com/ScapeXYZ/reset-receipt/releases/download/v0.1.0/Reset-Receipt-0.1.0-Setup-x64.exe)**

[View the GitHub Release](https://github.com/ScapeXYZ/reset-receipt/releases/tag/v0.1.0) · [Download SHA256SUMS.txt](https://github.com/ScapeXYZ/reset-receipt/releases/download/v0.1.0/SHA256SUMS.txt)

- Version: **v0.1.0** (pre-release)
- Requirement: **Windows x64**
- Installer SHA-256: `82edd4dd20b9fddea9d2224db8da14f2f8d9d92a9247f6d98d93e804bf15d363`
- The installer is **unsigned**; Windows may display an unknown-publisher warning. Do not bypass organizational security policy.

## 2. Preview

![Reset Receipt result](docs/screenshots/reset-receipt-result.png)

*Genuine rendered Reset Receipt interface from the credential-free simulation build. The visible **SIMULATION — NOT REAL** label means the values are synthetic.*

## 3. What Reset Receipt does

Reset Receipt combines a short guided breathing exercise with contactless breathing-rate measurement. It creates a receipt only from accepted SmartSpectra readings. When the evidence cannot support a comparison, it returns a partial, insufficient, or interrupted result instead of inventing a change.

It is a non-medical wellness prototype. It does not measure pulse, diagnose stress, prove relaxation, recommend treatment, or establish health improvement.

## 4. How it works

1. Choose **Simulation** or **Real measurement**.
2. For real measurement, enter your own Presage API key, choose a camera, review the consent disclosure, and start the session.
3. Hold still in stable, even lighting while the app collects a natural-breathing baseline.
4. Start the optional 45-second guided pacer when ready.
5. Stop the session and read the resulting evidence receipt.

The pacer is guidance, not a measurement. A visible three-minute maximum and cleanup on stop, lock, suspension, camera failure, or sustained SDK frame loss protect the session boundary.

## 5. Install Reset Receipt on Windows

1. Open the [Reset Receipt v0.1.0 pre-release](https://github.com/ScapeXYZ/reset-receipt/releases/tag/v0.1.0).
2. Under **Assets**, download `Reset-Receipt-0.1.0-Setup-x64.exe` for Windows x64. You can also download `SHA256SUMS.txt` from the same release.
3. Optionally verify the installer before running it. In PowerShell, open the folder that contains the download and run:

   ```powershell
   Get-FileHash .\Reset-Receipt-0.1.0-Setup-x64.exe -Algorithm SHA256
   ```

   Compare the result with the installer entry in `SHA256SUMS.txt`. The published SHA-256 is `82edd4dd20b9fddea9d2224db8da14f2f8d9d92a9247f6d98d93e804bf15d363`.
4. Run the installer. When asked, choose **Only for me** to install for your Windows user account.
5. The installer is unsigned. Windows may show an **Unknown Publisher** or SmartScreen warning. Verify that the download came from the release above and that its checksum matches before deciding whether to continue. Do not bypass a warning without that verification.
6. Finish the installation, then launch **Reset Receipt** from the Start menu or desktop shortcut.
7. Choose **Simulation** for a credential-free, camera-free tour. Simulation needs no API key or camera and is labeled **SIMULATION — NOT REAL**.
8. Choose **Real SmartSpectra** only when you have your own Presage API key and are ready to give explicit camera consent. Real sessions may use Presage credits.

The receipt can be **full**, **partial**, **insufficient**, or **interrupted**. A full receipt has enough accepted measurements for a Before/After comparison. Partial, insufficient, and interrupted states do not invent a comparison when evidence is incomplete or the pacer was interrupted.

To uninstall, open **Settings > Apps > Installed apps**, select **Reset Receipt**, and choose **Uninstall**. After closing the app and uninstalling it, `%APPDATA%\Reset Receipt` may remain. You can delete that folder manually if you want to remove remaining application data.

The installed app runs locally from `file://`; it does not require a development server or localhost.

## 6. Bring your own key (BYOK)

Real SmartSpectra sessions require a user-provided Presage API key and available Presage credits. Enter the key only in the password-masked in-app field. Reset Receipt holds it in renderer memory for the current run and passes it to SmartSpectra for authentication; it does not write the key to local storage, files, logs, diagnostics, receipts, exports, or Reset Receipt IPC. Closing the app clears it.

Never put a key in `.env`, source code, screenshots, issue reports, or commits.

## 7. Simulation

Simulation needs no API key and does not acquire a camera or consume Presage credits. Its signals and receipts are synthetic and are visibly labeled **SIMULATION — NOT REAL**. Use it to learn the flow or demonstrate the interface, never as sensing evidence.

## 8. Understanding receipts

Reset Receipt uses four application receipt kinds:

- **Full:** at least two accepted readings in both baseline and guided phases. It can show Before, After, and Change (`After − Before`).
- **Partial:** at least two accepted readings overall, but one phase is too short for a comparison. It shows session aggregates and no invented Before/After change.
- **Insufficient:** fewer than two accepted readings overall. No receipt comparison is issued.
- **Interrupted:** a qualifying pacer timing interruption invalidates the comparison. No measured receipt or PNG is issued.

An accepted breathing-rate reading needs a valid SDK timestamp, confidence of at least 45, stable SDK status, and a value from 4 to 45 breaths/min. A lower value is not inherently better and no result proves a wellness or medical outcome.

### Receipt field guide

| Field | What it means |
| --- | --- |
| **Session duration** | The elapsed session time shown when the receipt was created. |
| **Before** | For a full receipt, the median of accepted baseline breathing-rate readings. |
| **After** | For a full receipt, the median of up to the last three accepted guided-phase readings. |
| **Change** | `After − Before`, in breaths/min, shown only for a full receipt. It is a measurement comparison, not a wellness or medical outcome. |
| **Session median** | For a partial receipt, the median of all accepted receipt readings. It is not a Before/After comparison. |
| **Observed range** | For a partial receipt, the lowest to highest accepted receipt reading. |
| **Accepted readings** | For a partial receipt, the number of accepted receipt readings used for its aggregate fields. |
| **Result status** | **Complete** for a full receipt, **Partial** for a partial receipt, and **Unavailable** for insufficient or interrupted receipts. |
| **Sample quality** | Whether accepted readings were sufficient in both phases for a comparison. |
| **Readings that met the SDK threshold** | Accepted unique breathing-rate readings out of all unique timestamped rate readings observed by the app. |
| **Guide pace** | The selected inhale/exhale timing when the guide completed; otherwise **Not completed**. |
| **Before n / After n** | Accepted receipt readings assigned to the baseline and guided phases. |
| **Measured breathing trace** | A decimated chest-movement trace from the session. If no stable trace is available, the app says so. |
| **SIMULATION, NOT REAL** | Marks synthetic simulation data. Real receipts instead disclose that they were measured by SmartSpectra and are not a score or medical result. |

## 9. Camera consent and handling

Real mode requires a selected camera, an explicit consent checkbox, and the user’s **Start session** action. Camera capture starts only on that explicit path. Stop and teardown stop media tracks; suspend and lock request a forced stop. Simulation denies camera permission and does not enumerate or acquire cameras.

The app does not implement video or frame recording. It supplies a live `MediaStream` to SmartSpectra only while a user-started real session is active.

## 10. Privacy, storage, sharing, retention, and deletion

Reset Receipt stores only the guide-seen flag and selected camera ID in local storage. During an explicitly authorized live test, it can write sanitized, gitignored aggregate diagnostics; these contain no API key, raw frame, raw physiological value, or receipt export data. Diagnostics are not automatically deleted: the operator must remove them when no longer needed. Local profile data can be cleared by the user or Electron profile management.

Reset Receipt does not share its own recorded video or raw frames because it does not record them. SmartSpectra authentication and service processing are governed by Presage. The SDK is configured with telemetry disabled, but that is not a promise of zero network traffic; Presage may process credentials, device/account information, usage records, and service data under its current policies. Deleting local app data does not delete Presage-held information. The app does not use SmartSpectra Insights or another optional AI service.

Read [Privacy and data handling](docs/PRIVACY.md) before a real session.

## 11. Platforms and requirements

- Verified platform: Windows x64.
- Real measurement: compatible camera, stable lighting, Presage account, user API key, and available credits.
- Simulation: no camera and no API key.
- SmartSpectra preflight requires at least 24 FPS; 25 FPS or higher is recommended.

macOS, Linux, Windows on ARM, code signing, and automatic updates are not supported by v0.1.0.

## 12. Verified real-hardware evidence

One authorized packaged real-SDK session verified camera access, SmartSpectra callbacks, accepted readings, a completed manual pacer, safe camera cleanup, and a **partial** receipt. It did not produce a valid full Before/After comparison: the phase-aware receipt contained one baseline reading and seven guided readings.

| Evidence | What it supports | Date boundary |
| --- | --- | --- |
| [Sanitized real-session evidence](docs/evidence/REAL_SDK_SESSION_2026-11-16.md) | A real SmartSpectra partial receipt with one baseline and seven guided receipt readings. | Measurement session date: 2026-11-16. |
| [OBS real partial-receipt capture](docs/evidence/OBS_REAL_PARTIAL_RECEIPT_CAPTURE_2026-11-18.md) | Owner-confirmed demo capture showing a Partial receipt: median 9.9 breaths/min, range 8.1–11.7, and two accepted readings. | Recording captured 2026-11-18; the underlying measurement-session date is not established. |

The separate release-acceptance session reported 2,993 delivered frame callbacks, 21 unique rate samples, 147 chest-bearing metric callbacks, and five accepted post-pacer readings. These are different counters: raw frame callbacks are not rate samples, and chest-bearing callbacks are not automatically accepted measurements. See [real-session evidence](docs/evidence/REAL_SDK_SESSION_2026-11-16.md) and [SDK integration](docs/SDK_INTEGRATION.md).

## 13. Development setup and reproduction

The verified release toolchain used Node.js 24.14.1 and npm 11.18.0 on Windows.

```powershell
git clone https://github.com/ScapeXYZ/reset-receipt.git
cd reset-receipt
npm install
npm run typecheck
npm test -- --maxWorkers=1
npm run build
npm run dev:sim
```

Use `npm run dev` only for an authorized real session. Do not start real SDK sessions without camera-use and Presage-credit authorization.

## 14. Tests and release verification

The v0.1.0 acceptance run recorded 10 of 10 public-release gates as PASS, including typecheck, 147 automated tests, production build, Gitleaks scans, credential-free packaged simulation, installed-app launch, one authorized packaged real SDK session, camera cleanup, installer/uninstaller testing, and security review.

The unsigned installer, checksum, and release links were verified before publication. See [Windows release acceptance](docs/RELEASE_ACCEPTANCE.md).

## 15. Known limitations

- The v0.1.0 installer is unsigned.
- A full real Before/After receipt has not been verified on the current build.
- A camera preflight does not guarantee sustained SDK performance.
- SmartSpectra service behavior and retention are governed by Presage and have not been independently audited by this project.
- This prototype has not completed formal accessibility, clinical, or regulatory review.

## 16. Documentation and Presage challenge alignment

- [Windows installation](docs/INSTALLATION.md)
- [Privacy and data handling](docs/PRIVACY.md)
- [SDK integration](docs/SDK_INTEGRATION.md)
- [Claim-to-evidence register](docs/CLAIMS.md)
- [Release acceptance](docs/RELEASE_ACCEPTANCE.md)
- [MIT License](LICENSE)

Reset Receipt was created for the Presage SmartSpectra challenge as a consent-first demonstration of honest sensing UX: runtime BYOK, explicit camera control, clearly separated simulation, and receipt states that reflect incomplete evidence rather than overclaiming.
