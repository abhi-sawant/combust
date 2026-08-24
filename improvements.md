# Combust — Bugs, Improvements & Feature Ideas

A review of the whole codebase as of `a4e9865` (React 19 + Vite PWA frontend, hand-rolled PHP 8.1 API on cPanel/MySQL).

The architecture is sound and the code is unusually clean for a hobby project — narrow repository interfaces, a real design-token system, thoughtful comments explaining *why*. Almost everything below is either a gap left by the recent IndexedDB → server migration, or the class of hardening a public-internet API needs that a local-only app didn't.

**Legend:** 🔴 Critical · 🟠 High · 🟡 Medium · ⚪ Low

---

## 1. Bugs

### 1.1 Backend / security

#### 🔴 B1 — Missing `.env` silently disables all authentication
`Config::get()` returns `null` for absent keys, and both consumers cast that to `""`:

- [`Jwt.php:24,44`](backend/src/Auth/Jwt.php) — `hash_hmac(..., (string) Config::get('JWT_SECRET'), true)` signs and verifies with an **empty key**. Anyone who knows this can mint a token for `sub = 1`.
- [`Cors.php:15`](backend/src/Support/Cors.php) — `Config::get('FRONTEND_URL', '*')` falls back to `Access-Control-Allow-Origin: *`.

So a `.env` that fails to upload, gets renamed, or is unreadable by the PHP user degrades the API to "no auth, any origin" instead of failing closed. The `.env.example` default (`JWT_SECRET=change-me-to-a-long-random-string`) is equally dangerous if copied verbatim, which step 6 of [`CPANEL_SETUP.md`](backend/CPANEL_SETUP.md) invites.

**Fix:** boot-time assertion. In `Config::load()`, after parsing, throw if `JWT_SECRET` is missing, shorter than 32 chars, or equal to the example placeholder — and let the global exception handler return 500. Same for `DB_NAME`/`DB_USER`. Drop the `'*'` CORS fallback.

#### 🔴 B2 — No rate limiting anywhere
No endpoint counts attempts. Three concrete consequences:

1. **OTP brute force.** [`OtpRepository::findLatestValid`](backend/src/Repositories/OtpRepository.php) has no attempt counter, so a 6-digit code (10⁶ space) can be attacked for its full 10-minute life. At a few hundred req/s a single window is a meaningful fraction of the keyspace, and `/auth/forgot-password/reset` takes over the account on a hit.
2. **Password brute force.** `/auth/login` is unlimited.
3. **Mail bombing / cost.** `/auth/signup/send-otp` calls `mail()` per request with no throttle — trivially abused to spam a third party from your domain and get it blacklisted.

**Fix:** an `auth_attempts` table (or `otp_codes.attempts` column) keyed on email + IP + purpose. Cap OTP verification at 5 attempts per code (then mark it consumed), OTP sends at ~3/hour per email and ~10/hour per IP, logins at ~10/15min per email. Return 429.

#### 🟠 B3 — Cross-user entry data leak on `PUT /entries/{id}`
[`EntryRepository::updateForVehicle`](backend/src/Repositories/EntryRepository.php#L68-L86) scopes the `UPDATE` correctly (`WHERE id = ? AND vehicle_id = ?`) but then returns `$this->find($id)` — an **unscoped** lookup by primary key alone. If the id belongs to another user's vehicle, no row is modified, but the controller receives a non-null row and responds `200` with that entry's date, odometer, station, litres, and amount.

Practical exploitability is limited by UUIDv4 ids being unguessable, but this is still a broken authorization boundary — and the `?: null` contract the caller relies on for its 404 is simply wrong.

**Fix:**
```php
$stmt->execute([...]);
if ($stmt->rowCount() === 0) {
    return null;   // not ours, or nothing changed — see B4
}
return $this->find($id);
```

#### 🟠 B4 — A no-op edit is reported as "not found"
Once B3 is fixed with `rowCount()`, MySQL reports 0 affected rows when a user resubmits an edit with **identical values** — so saving an unchanged entry would 404. Guard the ownership check separately instead of inferring it from `rowCount`:

```php
$owned = $this->findForVehicle($id, $vehicleId);   // new scoped helper
if (!$owned) return null;
// ...run UPDATE, then return $this->find($id)
```

#### 🟠 B5 — Backend accepts any value in numeric and date fields
[`Validator::requireFields`](backend/src/Support/Validator.php) checks **presence only**. [`EntriesController`](backend/src/Controllers/EntriesController.php#L16) uses it as its entire validation layer, so the client is fully trusted:

- `odometerReading: "abc"` → MySQL `DECIMAL` conversion error → uncaught → generic **500**
- `date: "not-a-date"` → same
- Negative amounts, negative odometer, `litresFilled: 0` → **stored happily**, then produce `Infinity` / nonsense in `deriveEntries`
- `fuelStation` longer than 255 chars → truncation or 500 depending on SQL mode
- `amountPaid >= 99999999.99` → out-of-range for `DECIMAL(10,2)` → 500

Only the frontend Zod schema stops any of this; any direct API call bypasses it.

**Fix:** extend `Validator` with `numeric($value, min, max)`, `date($value, format)`, `maxLength()` and apply them in `EntriesController` and `VehiclesController`, returning 422 with field-level details (the `Response::error` signature already supports `$details`, and `ApiError.details` already carries them to the client).

#### 🟠 B6 — Unbounded bulk import
[`EntriesController::bulkStore`](backend/src/Controllers/EntriesController.php#L48-L67) validates every element but never caps `count($data['entries'])`. A single request can insert millions of rows in one transaction — memory exhaustion, table bloat, lock contention.

**Fix:** reject > ~500 entries per request with 422; have the client chunk. Bonus: `bulkCreate` currently issues one `INSERT` + one `SELECT` per row inside the transaction — batch into multi-row `INSERT`s.

#### 🟡 B7 — `bulkCreate` never rolls back on failure
[`EntryRepository::bulkCreate:56-65`](backend/src/Repositories/EntryRepository.php) has `beginTransaction()` … `commit()` with no `try/finally`. On a mid-loop exception the global handler calls `Response::error()` → `exit`, and rollback happens only incidentally via PDO's destructor. Make it explicit:

```php
try { /* loop */ $db->commit(); }
catch (Throwable $e) { $db->rollBack(); throw $e; }
```

#### 🟡 B8 — Signup endpoint enables account enumeration
[`AuthController::signupSendOtp`](backend/src/Controllers/AuthController.php#L41-L43) returns `409 "An account with this email already exists"`. Meanwhile `forgotPasswordSendOtp` goes out of its way to avoid exactly this leak (with a comment explaining why). One endpoint undoes the other's protection — the whole user list is enumerable.

**Fix:** always respond `200 {"message": "OTP sent"}`. If the account exists, send a "someone tried to sign up with your email — sign in instead" mail rather than a code. Keep the real 409 at `/auth/signup/verify`, which requires possession of the code.

#### 🟡 B9 — Password reset doesn't invalidate anything
`forgotPasswordReset` updates the hash and consumes the one code. It does **not**:
- invalidate other outstanding `password_reset` codes for that email,
- invalidate previously issued JWTs — and with `JWT_TTL_DAYS=30` and no server-side session store, a stolen token survives the reset for up to a month.

**Fix:** add `users.token_version INT` (or `password_changed_at`), embed it in the JWT payload, and reject tokens whose version is stale in `AuthMiddleware`. That also gives you a real "sign out everywhere".

#### 🟡 B10 — Mail failures reported as success
[`Mailer::send`](backend/src/Mail/Mailer.php) returns `mail()`'s bool; both call sites in `AuthController` discard it. The user is told "OTP sent" even when the MTA rejected it outright, and there's no log line to diagnose it.

**Fix:** `error_log()` on false, and return 500 (`"Couldn't send the code — try again"`) so the UI doesn't advance to the OTP field.

#### ⚪ B11 — OTP pepper is the JWT signing key
[`Otp::hash`](backend/src/Auth/Otp.php) uses `JWT_SECRET` as the HMAC key. Functionally fine, but it couples two independent secrets — rotating the JWT secret silently invalidates every in-flight OTP, and one leak compromises both. Add a separate `OTP_PEPPER`.

#### ⚪ B12 — `otp_codes` grows forever
No pruning and no index on `expires_at`. Add a cheap opportunistic `DELETE FROM otp_codes WHERE expires_at < NOW() - INTERVAL 1 DAY` on OTP creation, or a cPanel cron.

#### ⚪ B13 — Deleted users keep working tokens
`AuthMiddleware::requireUser` trusts `sub` without confirming the user row still exists (only `/me` checks). Harmless today because FK cascades remove the data, but it will bite once anything else keys off `sub`.

### 1.2 Frontend

#### 🔴 B14 — You can never backfill a forgotten fill-up
[`getOdometerWarning:170-179`](src/lib/calculations.ts) rejects **any** reading that has a higher-odometer entry after it:

```ts
const next = others.find((e) => e.odometerReading >= odometerReading)
if (next) {
  if (next.odometerReading === odometerReading) return `…already has this exact odometer reading.`
  return `Must be less than the next entry's reading of ${…} km.`   // ← wrong
}
```

Entries `[1000, 2000, 3000]`, new reading `2500` → blocked. So odometer readings can only ever be **appended at the top**. Forget to log one fill-up and it's unrecordable forever; the same check blocks editing a typo'd reading downward. The function's own doc comment says the check exists "so mileage math for both this entry and its neighbor stays valid" — but inserting between two entries is exactly the case `deriveEntries` handles correctly: it splits the interval into two valid segments.

**Fix:** only the equality case is a genuine error. Keep that, and downgrade the in-between case to an informational note ("This sits between your 2,000 km and 3,000 km fills — mileage for both will be recalculated"). Frame it as `FieldDescription`, not `FieldError`, and drop the hard block in `EntryForm.onSubmit`.

#### 🟠 B15 — Failed saves and deletes fail silently
[`EntryForm.onSubmit:271-285`](src/components/entries/entry-form.tsx) awaits `addEntry`/`updateEntry` with no `try/catch`. On a network error or 422 the promise rejects, react-hook-form re-throws, and the user sees **nothing**: no toast, no error, the sheet just stays open. They will assume the entry saved.

Same pattern in:
- [`entry-sheet.tsx:455`](src/components/entries/entry-sheet.tsx) `handleDelete`
- [`entries-table.tsx:60`](src/components/entries/entries-table.tsx) `handleDelete` — worse, `toast.success('Entry deleted')` is on the line after the await, so it never fires but nothing else does either
- [`add-vehicle-onboarding.tsx:27`](src/components/vehicles/add-vehicle-onboarding.tsx) `onSubmit`
- [`vehicle-switcher-sheet.tsx:41`](src/components/vehicles/vehicle-switcher-sheet.tsx) `handleAdd`

[`import-csv-sheet.tsx`](src/components/entries/import-csv-sheet.tsx) does it right — copy that shape everywhere (and surface `ApiError.details` onto the matching form field).

#### 🟠 B16 — An API outage looks like a brand-new account
[`App.tsx:104-119`](src/App.tsx):

```tsx
const { vehicles, isLoading } = useVehicles()
if (isLoading) return null
if (vehicles.length === 0) return <AddVehicleOnboarding />
```

`VehiclesContextValue.error` is populated by the provider and **never read by anything**. So when `/vehicles` fails — API down, expired session, offline — `vehicles` stays `[]`, `isLoading` flips false, and an existing user with a full history is dropped onto "Add your vehicle". Submitting that form then fails silently (B15).

**Fix:** destructure `error` and render a retry state before the empty-state branch. Same for `EntriesContextValue.error`, which is likewise never consumed anywhere (verified: no call site destructures `isLoading` or `error` from `useEntries()`).

#### 🟠 B17 — Switching vehicles shows the previous vehicle's data
[`use-entries.tsx:29-51`](src/hooks/use-entries.tsx): the fetch effect keyed on `activeVehicleId` neither clears `entries` nor sets `isLoading` back to `true`. Between the switch and the response, the header names vehicle B while every stat, chart and row still describes vehicle A. `isLoading` is only ever `true` on first mount, and nothing consumes it anyway (B16).

**Fix:** `setEntries([]); setIsLoading(true)` at the top of the effect, and render a skeleton while loading.

#### 🟠 B18 — Going offline logs you out
[`use-auth.tsx:22-32`](src/hooks/use-auth.tsx) wraps the `/me` bootstrap in a bare `catch { clearStoredToken() }` — no distinction between `401 invalid token` and "fetch failed, we're on a train". For an app that ships as an installable PWA, launching without connectivity destroys the session and shows the sign-in screen.

**Fix:** only clear on `err instanceof ApiError && err.status === 401`. On a network error, keep the token and either optimistically restore a cached user or show a "can't reach Combust" retry state.

#### 🟡 B19 — Two names, and sign-in doesn't set either
`setStoredUserName(values.name)` is called in [`sign-up-form.tsx:60`](src/components/auth/sign-up-form.tsx) but nowhere in `sign-in-form.tsx`. So Settings shows an empty "Your name" for anyone who signs in on a second device, even though `useAuth().user.name` has it. `AuthUser.name` is in fact never read by any component — the localStorage copy is a leftover from the pre-auth build and can only drift from the server value (editing it in Settings persists nowhere).

**Fix:** delete `use-user-name.ts`, read `useAuth().user.name`, and add a `PUT /me` for editing it. Also note the name isn't actually *displayed* anywhere — see F5.

#### 🟡 B20 — "Clear all data" copy is now wrong
[`settings-sheet.tsx:133`](src/components/settings/settings-sheet.tsx): *"permanently deletes every vehicle and fill-up entry **on this device**"*. Since the migration this hits `POST /account/reset-data` and wipes the account server-side, on every device. Dangerously misleading for a destructive irreversible action. Also worth requiring a typed confirmation for a wipe of this scope.

#### 🟡 B21 — Desktop row actions are styled as a mobile footer
[`entries-table.tsx:66-92`](src/components/entries/entries-table.tsx) — `renderRowActions` returns `<div className='grid grid-cols-2 w-full border-t'>`, designed for the bottom of a mobile card. The desktop table then wraps that same node in `<div className='flex justify-end gap-1'>` ([:147](src/components/entries/entries-table.tsx)), so every table row gets a full-width two-column grid with a stray top border inside its last cell. Split into `RowActionsInline` / `RowActionsFooter`, or pass a variant.

#### 🟡 B22 — Broken apple-touch-icon reference
[`index.html:6`](index.html) points at `/apple-touch-icon-180x180.png`; `public/` ships `apple-touch-icon.png`. A guaranteed 404, and iOS falls back to a screenshot for the home-screen icon. (`vite.config.ts` `includeAssets` names the correct file — only the HTML is wrong.)

#### 🟡 B23 — "Average mileage" is a straight mean of tank mileages
[`computeOverallStats:69`](src/lib/calculations.ts) averages the per-tank `mileage` values unweighted. The correct fleet figure is *total distance ÷ total litres consumed* — otherwise a 2 L top-up counts as much as a 12 L fill and skews the headline number, which is the single most prominent figure in the app ([`overview-dashboard.tsx:57`](src/components/overview/overview-dashboard.tsx)).

The same applies to `averageCostPerLitre` (should be weighted by litres) and to `StationStats.averageMileage` ([:96](src/lib/calculations.ts)).

Related: `totalLitresFilled` includes the first fill's litres, which fuelled no *measured* distance, so `totalDistanceCovered / totalLitresFilled` won't reconcile with the displayed average. Worth either excluding it or labelling the three stat cards so they're internally consistent.

#### ⚪ B24 — `1.06 vs last fill` is not a human unit
[`computeMileageTrend`](src/lib/calculations.ts) returns a raw ratio and the overview renders `trend.ratio.toFixed(2)`. Show `+6%` / `−4%` instead.

#### ⚪ B25 — `npm run lint` fails
4 errors on a clean tree:
- `settings-sheet.tsx:45` — `react-hooks/set-state-in-effect`. The `useEffect(() => { if (open) setLocalName(name) }, [open, name])` sync is also a real bug in miniature: it clobbers in-progress typing whenever `name` changes. Use `key={open ? 'open' : 'closed'}` on the field, or derive it.
- `badge.tsx:54`, `button.tsx:50`, `tabs.tsx:71` — `react-refresh/only-export-components` for the exported `cva` variants. Standard shadcn noise; either move variants to `*-variants.ts` or scope the rule off for `src/components/ui/**`.

Also: `react-hooks/incompatible-library` warning on `form.watch()` in `entry-form.tsx:70`.

#### ⚪ B26 — Dark mode gets a light status bar
`<meta name="theme-color" content="#f7f5f1">` is hardcoded ([`index.html:7`](index.html)) and the manifest pins `theme_color: '#146b54'`. Ship two `theme-color` tags with `media="(prefers-color-scheme: …)"`.

#### ⚪ B27 — Missing `alt` on every logo
[`app-header.tsx:20`](src/components/app-header.tsx), [`auth-shell.tsx:15`](src/components/auth/auth-shell.tsx), [`overview-dashboard.tsx:25`](src/components/overview/overview-dashboard.tsx). Decorative ones want `alt=""`, the auth-shell one wants `alt="Combust"`.

#### ⚪ B28 — CSV import has no error handling or preview
[`handleFile`](src/components/entries/import-csv-sheet.tsx#L599) doesn't `try/catch` `file.text()` (unreadable file → unhandled rejection), enforces no size limit, and jumps straight from "N rows ready" to insertion with no table preview. It also doesn't check imported readings against **existing** entries, so an import can inject duplicate odometer values that B14's UI check would have refused — and then the entries are unfixable through the form.

---

## 2. Improvements

### 2.1 Correctness & architecture

| # | Improvement |
|---|---|
| I1 | **Enforce odometer integrity in the DB.** Add `UNIQUE KEY uq_entry_odometer (vehicle_id, odometer_reading)` to `fuel_entries`, plus `CHECK` constraints for `odometer_reading > 0`, `litres_filled > 0`, `amount_paid >= 0`. The invariant everything downstream assumes should not live only in a React component. |
| I2 | **Stop refetching after every write.** [`use-entries.tsx`](src/hooks/use-entries.tsx) calls `refresh()` after each add/update/delete — two round trips per action, and a visible stall on mobile. All three endpoints already return the affected entity; splice it into local state and reconcile in the background. |
| I3 | **Fix `Config` typing.** `Config::get(string, ?string)` returning `?string` forces `(string)` casts at every call site, which is precisely how B1 became silent. Add `Config::require(string): string` that throws, and use it for every non-optional key. |
| I4 | **Turn on TypeScript `strict`.** [`tsconfig.app.json`](tsconfig.app.json) has `noUnusedLocals`/`noUnusedParameters` but no `strict`, `noUncheckedIndexedAccess`, or `exactOptionalPropertyTypes`. The `!` assertions scattered through `calculations.ts` and the `undefined as unknown as number` casts in [`entry-form.tsx:235-238`](src/components/entries/entry-form.tsx) are what that buys you. Enable `strict` first, then `noUncheckedIndexedAccess` (it will flag the real `sorted[index + 1]` and `values[0]` accesses in `calculations.ts` / `sparkline.tsx`). |
| I5 | **Add an `updatedAt`/`createdAt` to `fuel_entries`.** Currently there's no way to order same-odometer rows, audit an import, or build sync. |
| I6 | **Rename `src/lib/db.ts`.** It contains zero database code — it's the API resource layer. `src/lib/repositories.ts` or `src/api/`. The `EntriesRepository` interface comment still says "kept narrow so the backing store can be swapped later," which already happened. |
| I7 | **Share validation between client and server.** The Zod schema in `entry-form.tsx` and `Validator` in PHP encode the same rules twice and have already drifted (B5). At minimum, generate `REQUIRED_FIELDS` and bounds from one JSON document checked into the repo. |
| I8 | **Extract the `AuthMiddleware::requireUser()['sub']` cast.** Repeated verbatim 11 times across four controllers. `AuthMiddleware::userId(): int`. |

### 2.2 Offline & PWA (the biggest gap)

The app is *marketed* as offline-first — the manifest description says *"fully offline"* ([`vite.config.ts:22`](vite.config.ts)), and the Workbox comment claims *"All data lives in IndexedDB."* Since the migration **none of that is true**: every read and write is a network call, so the installed PWA shows a broken shell the moment connectivity drops.

| # | Improvement |
|---|---|
| I9 | **Either fix the claim or fix the app.** Short term: update the manifest/description and add an offline banner. Right answer: reinstate IndexedDB as the local source of truth with a write queue + last-write-wins sync against the API. `EntriesRepository` was designed for exactly this — a `SyncingEntriesRepository` wrapping both stores fits the existing interface. |
| I10 | **Replace the chunk-error reload hack with a real update flow.** [`error-boundary.tsx`](src/components/error-boundary.tsx) reloads the page on a stale-chunk `import()` failure — a clever patch for `registerType: 'autoUpdate'`, but the user still eats a blank tab and a reload. Switch to `registerType: 'prompt'` + a sonner toast ("New version available — Reload"), and keep the boundary purely as a safety net. |
| I11 | **`navigateFallback` for deep links / PWA shortcuts.** The Workbox config caches assets but sets no SPA navigation fallback. |

### 2.3 Testing & CI (currently zero)

| # | Improvement |
|---|---|
| I12 | **Unit-test `src/lib/`.** `calculations.ts` and `csv.ts` are pure, dense, and carry the entire value of the product. Vitest, and the first cases should be B14 (insert between two entries), B23 (weighted vs unweighted average), odometer regression, single-entry, zero-litre, and the CSV invisible-character/date-format paths. |
| I13 | **Add a `test` script and a GitHub Actions workflow** running `tsc -b`, `eslint`, and `vitest` on PRs. `npm run lint` currently fails (B25), so CI has to start green. |
| I14 | **A couple of backend tests.** Even a plain PHP script hitting a scratch database would catch B3/B5. `php -S` + `curl` in CI is enough. |
| I15 | **Delete the stub README.** [`README.md`](README.md) is still the unmodified Vite template — it documents `eslint-plugin-react-x` and says nothing about Combust, the backend, `VITE_API_URL`, or how to run either half. |

### 2.4 Accessibility

| # | Improvement |
|---|---|
| I16 | **`BottomTabBar` isn't a tablist.** [`bottom-tab-bar.tsx`](src/components/bottom-tab-bar.tsx) is four plain buttons with no `role="tab"`, `aria-selected`, or `aria-controls`, driving a `Tabs` whose real `TabsList` is `hidden sm:flex`. Screen-reader and keyboard users on mobile get no state at all. Either wire up the ARIA manually or render a styled `TabsList`. |
| I17 | **Colour-only status.** `MileageCell` badges ("Pending", "Odometer regressed") and the trend chip carry meaning in colour + short text with no `title`/`aria-label` explaining *why*. |
| I18 | **Charts have no text alternative.** Both `LineChart`s in `trends-charts.tsx` are unlabelled to assistive tech. Add a visually-hidden summary table or `aria-label` with the range and trend. |
| I19 | **Sonner toasts are the only failure channel** — and after B15 they're the only channel at all. Make sure the `Toaster` region is announced (`aria-live`), and put inline field errors on forms rather than relying solely on toasts. |

### 2.5 Dependencies & build

| # | Improvement |
|---|---|
| I20 | **`shadcn` (the CLI) is in `dependencies`.** So are `tailwindcss` and `@tailwindcss/vite`, which are build-time only. Move all three to `devDependencies`. |
| I21 | **Reconsider zod v3.** `^3.25.76` with `invalid_type_error` ([`entry-form.tsx:206`](src/components/entries/entry-form.tsx)) is v3 syntax; v4 is current and the migration is small at this size. |
| I22 | **`dist/` is committed to the working tree** (untracked in git, but present and stale — it holds a build from a previous session). Harmless, but delete it to avoid confusion about what's deployed; the cPanel guide's manual upload step is what makes this ambiguous. |
| I23 | **Automate the deploy.** [`CPANEL_SETUP.md`](backend/CPANEL_SETUP.md) step 10 is "zip `dist/`, upload via File Manager" — manual, unversioned, easy to half-apply. A GitHub Action doing `npm run build` + rsync/FTP to the two document roots removes a whole class of "which version is live?" problem. |
| I24 | **Stale `.env` keys.** The root `.env` still carries commented-out `VITE_SUPABASE_*` entries from an abandoned approach. Clean up, and add a `.env.example` for the frontend (there's one for the backend but not the app). |

---

## 3. Feature Ideas

Ordered roughly by value-per-unit-effort. Everything here builds on data the app already has or could collect with one extra field.

### 3.1 Fills the obvious holes (do these first)

- **F1 — CSV/JSON export.** [`src/lib/csv.ts`](src/lib/csv.ts) parses the export format but can't *produce* it. Import-without-export means the user's data is hostage. Same column set, one `Blob` download, ~30 lines.
- **F2 — Vehicle rename & delete.** `updateVehicle` and `deleteVehicle` exist in `VehiclesContextValue` and are fully implemented in [`use-vehicles.tsx`](src/hooks/use-vehicles.tsx) — with a working `DELETE /vehicles/{id}` behind them — but **no component calls either**. The switcher sheet only adds and switches. Add long-press / edit affordances there and the feature ships basically for free.
- **F3 — Sign out.** `AuthContextValue.signOut` is likewise implemented and never called from any component. There is currently **no way to log out** short of clearing site data. Add it to `SettingsSheet` alongside the account email.
- **F4 — Partial fill flag.** Mileage math assumes every fill is tank-to-full; a partial fill silently corrupts two data points. A `isFullTank` boolean that carries the litres forward to the next full fill is the single biggest accuracy win available. (Add `is_full_tank BOOLEAN NOT NULL DEFAULT 1`, then bucket consecutive partials in `deriveEntries`.)
- **F5 — Actually use the user's name.** It's collected at signup, stored, editable in Settings — and rendered nowhere. A "Hey Abhishek" on the overview, or just drop the field (B19).
- **F6 — Currency & units preference.** [`format.ts`](src/lib/format.ts) explicitly notes *"No currency symbol is assumed."* Yet `csv.ts` strips `₹` and `$`, and every placeholder is Indian. Store `currency` + `distanceUnit` (km/mi) + `volumeUnit` (L/gal) per user and derive `km/l` vs `mpg` from them — this is also what makes the app usable outside India.
- **F7 — Missed-fill detection.** If a gap between readings is far above the running average distance-per-tank, flag it ("looks like a fill-up is missing here") instead of silently reporting an impossible mileage. Pairs naturally with F4.

### 3.2 Deepens what's already there

- **F8 — Cost per kilometre.** The headline metric for most drivers, and every input already exists. Add it to `OverallStats` and the overview tiles.
- **F9 — Monthly / yearly summaries.** `groupByMonth` already exists for the entries list. Reuse it for a "spend per month" bar chart, a year-in-review card, and per-month distance/mileage rollups.
- **F10 — Price-trend intelligence.** With `costPerLitre` per station over time you can answer real questions: "you paid ₹4/L above your 3-month average", "Station X has been cheapest 7 of the last 9 fills". The `StationStats` "Best value" badge is the seed of this.
- **F11 — Budget & alerts.** Monthly fuel budget with a progress ring on the overview; notify at 80%.
- **F12 — Odometer-based service reminders.** Oil change every N km, chain lube, tyre rotation — the odometer timeline needed to drive them is the core data model. High value for a motorcycle app.
- **F13 — Document expiry reminders** (insurance, PUC, registration). Trivially simple, genuinely useful in India, and a strong retention hook.
- **F14 — Fill-up notes & receipt photos.** A `notes` text field, plus an optional photo (server-side upload, or a blob in IndexedDB if I9 lands).
- **F15 — Multi-vehicle comparison.** Vehicles are already first-class; a side-by-side mileage/cost-per-km view is a natural payoff.

### 3.3 Bigger swings

- **F16 — Home-screen widget / PWA shortcuts.** `shortcuts` in the manifest for "Add fill-up" gets you a one-tap logging path with almost no code.
- **F17 — Location-tagged stations.** Capture coarse geolocation at logging time to auto-suggest the station you're standing at, and map your fill-up history.
- **F18 — Receipt OCR.** Photograph the pump receipt, extract litres/amount/date. High delight, meaningful cost — worth prototyping only after F14.
- **F19 — Anonymous benchmarking.** "Your Activa averages 48 km/l; similar vehicles average 44." Needs a real corpus and a careful privacy posture, but it's the kind of thing only a multi-user backend can offer — and you now have one.
- **F20 — CO₂ / efficiency insights.** Litres → kg CO₂ is a constant multiply; presents well as a yearly card.

---

## 4. Suggested order of work

1. **Security & data integrity, in one pass** — B1, B2, B3/B4, B5, B6, B8, plus I1. These are what "public API" means; everything else can wait behind them.
2. **The silent-failure cluster** — B15, B16, B17, B18. Four small fixes that turn "the app is broken and I can't tell why" into a usable product. Cheapest user-visible win available.
3. **B14 (backfill) and B23 (weighted average)** — the two bugs that make the numbers wrong rather than merely awkward.
4. **Tests + CI + README** — I12, I13, I15. Do this before the feature work, so steps 1–3 stay fixed.
5. **F1, F2, F3** — three features already 90% implemented; a day's work for three real gaps.
6. **F4 + F7 (partial fills, missed fills)** — the accuracy foundation everything analytical sits on.
7. **Decide the offline story (I9).** Either drop the claim or build the sync layer. Leaving it half-true is the worst of the three options.
