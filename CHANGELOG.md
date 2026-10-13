# Changelog

Combust follows [Semantic Versioning](https://semver.org). The repo-root `VERSION` file is the single
source of truth for both clients; see "Releasing" in [CLAUDE.md](CLAUDE.md).

## 1.0.0 — 2026-10-13

First versioned release, and the first with a native Android app alongside the web app.

### Added

- **Android app.** A native Kotlin app with the same features and Ember look as the web app, running
  on the same backend: vehicles, fill-ups, Overview / Entries / Stats / Trends, CSV import, light and
  dark themes, and optional cloud account with two-way sync.
- **Version in Settings (web).** Settings now shows the app version.

### Changed

- The repository is now a monorepo: `web/`, `android/`, `backend/`. Web deploys now build from `web/`
  (see [backend/CPANEL_SETUP.md](backend/CPANEL_SETUP.md)).

### Sync format

- No changes. Both clients use `POST /sync`; the contract is documented in
  [spec/sync-format.md](spec/sync-format.md).
