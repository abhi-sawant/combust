# Changelog

Combust follows [Semantic Versioning](https://semver.org). The repo-root `VERSION` file is the single
source of truth for both clients; see "Releasing" in [CLAUDE.md](CLAUDE.md).

## 1.1.0 — 2026-11-01

### Added

- **Service tracker (both clients).** Track periodic parts and services per vehicle (engine oil, filters, brake pads, tyres,
  battery, ...). Each item stores the date and odometer of its last change plus an optional interval in km
  and/or months; it is overdue or due soon when either is reached. Pick from common presets or add your own,
  and tap "Changed today" to log a replacement. A new Service tab (the Trends charts now live under Stats),
  and an Overview card lists what needs attention.
- **Service reminders (Android).** A daily check posts a notification when an item becomes due soon or
  overdue. Web shows the same status in-app only.

### Sync format

- New `services` record type and array on `POST /sync` (see [spec/sync-format.md](spec/sync-format.md)).
  Backend migration `003_service_items.sql` must be run before deploying the new backend. Older clients keep
  working (a missing `services` key is treated as empty).

## 1.0.0 — 2026-10-13

First versioned release, and the first with a native Android app alongside the web app.

### Added

- **Android app.** A native Kotlin app with the same features and Ember look as the web app, running
  on the same backend: vehicles, fill-ups, Overview / Entries / Stats / Trends, CSV import, light and
  dark themes, and an optional cloud account with two-way sync. Everything works offline.
- **Update notifications (Android).** The app checks GitHub for a newer release when it opens and shows
  what's new, with "Update", "Not now" and "Skip this version". Updating opens the release page, where the
  signed APK is attached. Install it over the old one and your data stays.
- **Version in Settings (both clients).** Settings shows the app version.

### Changed

- The repository is now a monorepo: `web/`, `android/`, `backend/`. Web deploys now build from `web/`
  (see [backend/CPANEL_SETUP.md](backend/CPANEL_SETUP.md)).

### Sync format

- No changes. Both clients use `POST /sync`; the contract is documented in
  [spec/sync-format.md](spec/sync-format.md).
