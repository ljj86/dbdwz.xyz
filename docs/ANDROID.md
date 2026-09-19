# Android build guide

- Package name: `com.example.app`
- Version: `0.5.3` (`503`)
- Build resources: `npm run build:app-plus`

The native client and website share the same HTTPS API, database and access rules. Content under `src/static/web` is intentionally excluded from the Android resource build and is loaded from the authenticated server when needed.

The Android build alone shows the APP filing number `皖ICP备2026013884号-4A`; the website keeps its separate website filing number. The Android build also includes an authenticated update button next to the sidebar avatar. Release metadata follows `deploy/android-release.example.json`, while APK files and signing credentials stay outside Git.

Before producing a release APK, obtain a DCloud AppID in HBuilderX and configure your own Android signing certificate. Keep the keystore, alias, certificate password and DCloud credentials outside Git. Use HBuilderX to import `dist/build/app` and perform the signed Android cloud build.

After packaging, verify login, logout, expired-session handling, content access, uploads, downloads and the Android back button. Confirm the final package name and signing fingerprint with Android build tools before distribution.
