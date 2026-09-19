# Android build guide

- Package name: `xyz.dbdwz.app`
- Version: `0.5.3` (`503`)
- Build resources: `npm run build:app-plus`

The native client and website share the same HTTPS API, database and access rules. Content under `src/static/web` is intentionally excluded from the Android resource build and is loaded from the authenticated server when needed.

Before producing a release APK, obtain a DCloud AppID in HBuilderX and configure your own Android signing certificate. Keep the keystore, alias, certificate password and DCloud credentials outside Git. Use HBuilderX to import `dist/build/app` and perform the signed Android cloud build.

After packaging, verify login, logout, expired-session handling, content access, uploads, downloads and the Android back button. Confirm the final package name and signing fingerprint with Android build tools before distribution.
