# Combust

Fuel-mileage tracker with an offline-first local mode and optional cloud account with two-way sync.
One product, two independent clients on one backend:

| Folder | What |
|---|---|
| [`web/`](web) | React + Vite PWA (the reference implementation) |
| [`android/`](android) | Native Kotlin / Jetpack Compose app |
| [`backend/`](backend) | PHP + MySQL API (deployed to cPanel, see [CPANEL_SETUP.md](backend/CPANEL_SETUP.md)) |

Shared docs live at the root: [DESIGN.md](DESIGN.md), [PRODUCT.md](PRODUCT.md), [CHANGELOG.md](CHANGELOG.md).
The root [`VERSION`](VERSION) file is the single source of truth for both clients. Features ship in
both clients; see [CLAUDE.md](CLAUDE.md) for the parity and release rules.

## Web

```bash
cd web
npm install
npm run dev
```

## Android

```bash
cd android
./gradlew :app:assembleDebug
```
