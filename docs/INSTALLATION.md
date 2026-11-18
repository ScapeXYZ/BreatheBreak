# Windows installation

## Obtain and verify

Download `Reset-Receipt-0.1.0-Setup-x64.exe` and `SHA256SUMS.txt` from the [v0.1.0 GitHub Release](https://github.com/ScapeXYZ/reset-receipt/releases/tag/v0.1.0). Verify before running:

```powershell
Get-FileHash .\Reset-Receipt-0.1.0-Setup-x64.exe -Algorithm SHA256
Get-Content .\SHA256SUMS.txt
```

The hashes must match exactly. This review build is not Authenticode-signed, so Windows may show an unknown-publisher warning. Do not bypass organizational security policy.

## Install and launch

1. Run `Reset-Receipt-0.1.0-Setup-x64.exe`.
2. Review the installer destination and continue.
3. Launch **Reset Receipt** from the Start menu or optional desktop shortcut.

The installed application uses packaged `file://` assets. It does not require PowerShell, localhost, or a development server.

For real measurement, open **Start a reset**, enter your own Presage SmartSpectra API key in the password field, select a camera, review consent, and press **Start session**. The key is kept only in memory for the app run. Simulation needs no key and does not start camera capture.

## Uninstall

Open **Settings → Apps → Installed apps**, find **Reset Receipt**, and select **Uninstall**. The installer is configured per-user and does not intentionally remove the Electron profile on uninstall, so the non-sensitive guide-seen flag and selected camera ID may remain until the profile is deleted manually.

The v0.1.0 per-user installer, installed launch, shortcuts, credential-free simulation, and official NSIS uninstaller were verified during release acceptance. The uninstaller removes the application and shortcuts but intentionally retains the Electron profile under `%APPDATA%\Reset Receipt`; remove that directory manually only if you also want to clear the non-credential preferences and caches.
