---
name: release
description: Build a Combust release folder (web zip, backend zip, signed APK, checksums, release notes) for a given version.
disable-model-invocation: true
argument-hint: <version, e.g. 1.0.1>
---

Create the release `$ARGUMENTS` for Combust, following "Releasing" in the root CLAUDE.md. Work from the repo root.

## 0. Validate

- `$ARGUMENTS` must be SemVer `X.Y.Z` (strip a leading `v`). If missing or malformed, ask for it and stop.
- It must be greater than the current `VERSION`, unless `VERSION` already equals it (re-running a release whose bump was done by hand). If `releases/vX.Y.Z/` already exists, ask before overwriting.
- Confirm `android/keystore.properties` exists, otherwise the APK would be unsigned: stop and tell the user.

## 1. Work out what changed

Take the latest changes in the working tree and since the last tag/release: `git status`, `git diff`, and `git log` since the last `v*` tag (or the last release commit). Read the diffs of user-visible changes (features, fixes, behaviour); ignore pure refactors and docs unless they matter to users or self-hosters. If the tree has changes, they are part of this release; do not commit them.

## 2. Bump and document

- Write the new version to repo-root `VERSION` (newline-terminated) and to `version` in `web/package.json` (a vitest test fails if they differ). Leave `web/package-lock.json` alone.
- Add a `## X.Y.Z — <today's date, YYYY-MM-DD>` section at the top of `CHANGELOG.md`, above the previous release, using `### Added / Changed / Fixed` as needed. Write for users, in the existing voice, and tag the client: "(web)", "(Android)" or "(both clients)". Mention sync-format or backend changes (and any backend migration the self-hoster must run) and link `spec/sync-format.md`.

## 3. Verify and build

Run, stopping on any failure and reporting it:

```bash
cd web && npm run gen:fixtures && npm test && npm run build
cd ../android && export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home" && ./gradlew :core:test :app:testDebugUnitTest :app:assembleRelease
```

If `gen:fixtures` modified `spec/fixtures/`, mention it in the summary (the Android tests must then pass against the new fixtures).

Production web build needs the API URL: `web/.env` must set `VITE_API_URL=https://api.combust.slowatcoding.com`; check it before building.

## 4. Assemble `releases/vX.Y.Z/` (gitignored)

- `combust-X.Y.Z.apk`: copy `android/app/build/outputs/apk/release/app-release.apk`.
- `combust-web-X.Y.Z.zip`: zip the *contents* of `web/dist/` (files at the zip root, no `.DS_Store`): `cd web/dist && zip -qr ../../releases/vX.Y.Z/combust-web-X.Y.Z.zip . -x '.DS_Store'`. Include dotfiles such as `.htaccess`.
- `combust-backend-X.Y.Z.zip`: zip the *contents* of `backend/` (not the folder), excluding `.env` and `.DS_Store`: `cd backend && zip -qr ../releases/vX.Y.Z/combust-backend-X.Y.Z.zip . -x '.env' -x '*.DS_Store'`.
- `SHA256SUMS.txt`: `shasum -a 256` of the three files, run inside the folder, two-space separator, bare filenames.
- `RELEASE_NOTES.md`: model it on the previous `releases/v*/RELEASE_NOTES.md` (if none exists, use this shape) — title `# Combust X.Y.Z — <headline>`, plain-language sections for what's new, a Downloads table (APK, web zip, backend zip, checksums), and the APK signing certificate line. Read the cert with `~/Library/Android/sdk/build-tools/<latest>/apksigner verify --print-certs <apk>` (needs `JAVA_HOME` on PATH as above) and format it as colon-separated lowercase hex. It must equal the previous release's cert; if not, warn loudly because Android will refuse the update. Link the CHANGELOG at `https://github.com/abhi-sawant/combust/blob/main/CHANGELOG.md`.

## 5. Report

Summarise: version, folder contents with sizes, the cert check, and the changelog entry. Do NOT commit, tag, push, or create a GitHub release; remind the user of the remaining steps: commit as `release: X.Y.Z`, merge to `main`, tag `vX.Y.Z`, attach the artifacts to a GitHub Release using the CHANGELOG section as notes, and deploy the web/backend zips to cPanel per `backend/CPANEL_SETUP.md`.
