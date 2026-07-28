# Combust — Improvements Tracker

Findings from a full review of `src/` (the Vite PWA). Ordered by severity: **Bug** (produces
visibly wrong numbers today) → **Risk** (data loss / correctness under specific conditions) →
**Tidy** (dead code, hygiene, perf, a11y) → **UI** (redesign direction).

**Status:** everything is done except one Tidy item (local user ids — a product call, not a bug,
on how much cleanup is worth doing; see below). Both tabs now share the same hero + sparkline +
station-chip design language. Verified end-to-end against your live account in the browser —
typecheck, lint, and production build are all clean.

---

## Bugs

- [x] **Efficiency depends on row order, and the offline fallback order is reversed.**
      `entries.tsx` computes `(entries[i-1].odometerReading - entry.odometerReading) / entry.fuelFilled`,
      assuming the array is newest-first. Supabase returns it that way, but the IndexedDB path
      (`index.getAll`) returns insertion order — oldest first — so every average goes negative
      offline.
      Fixed by `deriveLegs()` in `src/types.ts`, which sorts by parsed date rather than trusting
      array order.

- [x] **The two tabs disagree about the same fill-up.**
      Entries divides distance by `entry.fuelFilled` (the older fill); Statistics divides by
      `prevEntry.fuelFilled` (the newer one). Statistics is correct under the full-tank assumption.
      Fixed: both `entries.tsx` and `statistics.tsx` now read from the single `deriveLegs()`
      selector.

- [x] **The oldest leg is always discarded; a lone entry reports odometer as distance.**
      The `index === sortedEntries.length - 1` guard assumed ascending sort but the array was
      descending. Fixed as part of `deriveLegs()` — the oldest entry now correctly reports
      `null` distance/efficiency (nothing to compare against) rather than the newest wrongly
      reporting it.

---

## Risks

- [x] **A submit with no date saves an empty date.**
      Fixed in `entries.tsx` — `handleSubmit`/`handleEditSubmit` now validate the date is picked
      before calling `addEntry`/`updateEntry`, and validate the odometer reading is consistent
      with neighboring entries by date (`validateOdometer`).

- [x] **`addEntry` is called without `await`, then the form resets regardless.**
      Fixed — the form now awaits, catches, shows an inline error, and only resets on success.

- [x] **Signing out deletes unsynced local data.**
      Fixed — `signOut` no longer calls `clearLocalEntries`. Local rows are already scoped by
      `localUserId` (mapped 1:1 from the Supabase uuid) so a different account never sees them
      anyway; there was nothing to gain and unsynced work to lose by wiping the cache. `signOut`
      now does a best-effort `fullSync` first to push anything pending while the session is
      still valid.

- [x] **Import replaces everything, one round trip at a time.**
      Fixed — added `bulkCreateEntries`/`bulkDeleteEntries` to `fuelService.ts` (one Supabase
      round trip instead of N). `replaceAllEntries` now inserts the new data *before* deleting
      the old, so a failure partway through never leaves the account wiped with nothing to show
      for it.

- [x] **Sync identity is a tuple of floats.**
      Fixed, after running the schema migration:
      ```sql
      alter table fuel_entries add column client_id text unique;
      ```
      `Entry.clientId` (`src/types.ts`) is generated once with `crypto.randomUUID()` in
      `createEntry`/`bulkCreateEntries` and never reassigned. `pushUnsyncedEntries` and
      `syncToLocal` now match on it first — a single indexed lookup instead of four `eq()`
      filters on floating-point columns — and only fall back to the old
      `date/amount_paid/odometer_reading/fuel_filled` tuple match for rows created before this
      column existed (yours: all rows currently have `client_id = null` until you next edit or
      re-sync them, which is fine — the fallback covers exactly that case). Also added a
      `clientId` index to IndexedDB (DB version 4) and updated `FuelEntryDB` in
      `supabaseClient.ts` to include `client_id`.

- [x] **The sync queue over-deletes and never gives up.**
      Fixed — each queue item now carries its own `id` (a `crypto.randomUUID()`), so completing
      one operation can no longer delete a different still-pending one for the same entry. Added
      an attempt counter (`MAX_SYNC_ATTEMPTS = 5`) so a permanently failing item is dropped with
      a clear console error instead of retrying forever.

- [x] **Two sync paths race on load; each remote read rescans the whole store.**
      Fixed — `fullSync` now guards against concurrent calls for the same user
      (`syncInFlight` set). Added a `supabaseId` index to the IndexedDB store (DB version 3);
      `findLocalBySupabaseId` is now a direct index lookup instead of a cursor scan.

- [x] **Missing env vars produce a blank page.**
      Fixed — `main.tsx` checks for the required env vars *before* importing `App.tsx` (and,
      transitively, `supabaseClient.ts`, which still throws — that's fine now, since that whole
      chain is never imported if the vars are missing). Renders `ConfigurationError.tsx` instead.
      Verified by temporarily removing `.env` and confirming the message renders correctly.

---

## Tidy

- [x] **`npm run lint` has never run.** Fixed the invalid `'ignore'` severity → `'off'`. Also
      found and fixed: the root config was unintentionally also linting `app/` (the separate
      Expo project, which has its own `eslint-config-expo` setup) — added it to
      `globalIgnores`. Lint is clean.

- [x] **Delete the dead code, starting with the password hashes.** Removed `lib/auth.ts` (and
      the legacy-session branch in `AuthContext.tsx` that used it), `lib/useIndexedDB.ts`,
      `data.ts`, `ui/combobox.tsx`, and `ui/input-group.tsx` (only used by combobox). Kept
      `ui/alert-dialog.tsx` — it's now used by the alert/confirm replacement below instead of
      being dead.

- [x] **One `Entry` type, one date format.** Added `src/types.ts` as the single source of truth
      (`Entry`, `Leg`, `deriveLegs`, `parseEntryDate`). New writes save dates as ISO
      (`yyyy-MM-dd`); `parseEntryDate` stays tolerant of the legacy `yyyy/MM/dd` format already
      sitting in existing rows, so nothing needed a data migration.

- [x] **Rows keyed by index; dialogs addressed by index.** Fixed — rows are now keyed by
      `entry.id`, and the edit dialog holds the actual `Entry` object rather than an index.

- [x] **Two elements share `id="stations-list"`.** Fixed — the edit dialog's datalist now has
      its own id.

- [x] **`alert()`/`confirm()` are the entire feedback layer.** Replaced with a small toast system
      (`ui/toast.tsx`) for notifications and `AlertDialog` for delete/replace confirmations, in
      both `App.tsx` and `entries.tsx`.

- [x] **CSV export breaks on a quote; import trusts whatever it parses.** Export now escapes
      embedded quotes (RFC 4180 doubling). Import now validates every row (date parses, numbers
      are finite and positive, station name non-empty) and reports how many rows were skipped
      rather than writing `NaN` into the database.

- [x] **Recharts ships on first paint; the font cache targets fonts we don't load.**
      `Statistics` is now `React.lazy`-loaded (confirmed via build output: it's a separate
      ~446 kB chunk no longer in the main bundle). Removed the dead `fonts.googleapis.com`
      runtime-caching rule — deliberately did *not* replace it with a rule caching Supabase
      responses, since the app already has its own offline-first layer (IndexedDB + sync queue)
      that's aware of sync state and soft-deletes; a second HTTP-cache layer over the same data
      would just be another place for it to go stale.

- [x] **Accessibility gaps around the parts that matter most.** Icon buttons now have
      `aria-label`s, the table has a `<caption>` (visually hidden) and `scope="col"` headers,
      and all four charts get a computed one-sentence `aria-label` (`role="img"`) summarizing
      the trend, since Recharts renders bare SVG with no text alternative.

- [x] **Cumulative spending is quadratic.** Fixed — one running total via `reduce`, O(n) instead
      of O(n²). Also fixed a real direction bug this exposed: the old code summed against a
      newest-first array, so "cumulative spending" actually peaked at the *oldest* fill-up
      instead of the most recent one. Both trend charts (spending, efficiency) now plot
      chronologically (oldest → newest, left → right) as a trend chart should.

- [ ] **Local user ids are timestamps kept in a different storage layer.** *(not done)*
      `getOrCreateLocalUserId` still mints `Date.now()` and maps it in `localStorage` while the
      rows it identifies live in IndexedDB. Clearing site data on one and not the other orphans
      local entries. Fix: key local rows by the Supabase uuid directly instead of a synthetic
      timestamp id. Didn't get to this one — flagging it here rather than silently skipping it.
      `src/contexts/AuthContext.tsx:41-58`

---

## UI redesign

- [x] **`deriveLegs()` selector** — landed as part of the Bugs fixes above; this is what both
      `Entries` and `Statistics` now read from.
- [x] **New color tokens (light + dark)** — sodium-amber for actions, instrument-teal for the
      efficiency series, warm graphite neutrals, replacing the default shadcn violet. Wired into
      `index.css`, the chart config (`statistics.tsx`), and a real dark-mode toggle
      (`ThemeToggle.tsx`) — the `.dark` tokens existed before but nothing ever applied the
      class; there's now an inline script in `index.html` that applies the saved/system
      preference before first paint (no flash), plus a toggle button in the header. Also added
      `--success`/`--warning` semantic tokens (distinct from the amber brand accent) for the
      efficiency delta badge and the best/lowest pills below.

- [x] **Rebuild `Entries` around leg-cards + side-rail form (desktop) / bottom sheet (mobile).**
      Full rebuild, verified against your live 23-entry account:
      - **Hero**: last measured tank's km/L as a headline number, a delta badge against the
        trailing-4 average, and a hand-rolled sparkline (`EfficiencySparkline.tsx` — no Recharts
        dependency, so the Entries tab doesn't pull in the chunk that's lazy-loaded for
        Statistics) with a 6/12/all-fills range toggle.
      - **Secondary strip**: cost/km, price/litre, distance, spent — for whatever's currently
        filtered (station chips + range), distinct from Statistics' full-history view.
      - **Fill-up log**: the odometer table is gone — each row is now the *leg* between two
        fills (distance, litres, cost, a proportional efficiency bar), with best/lowest pills
        when more than one leg is in view. Sorted and computed via `deriveLegs()`, so this can
        never disagree with Statistics.
      - **Entry form**: moved out of the top of the page into a sticky side panel
        (`FillUpForm`, desktop) and a bottom sheet opened by a floating "Log a fill-up" button
        (mobile) — the same component in both places, each with independently-scoped element
        ids via `useId()` (the two instances stay mounted simultaneously, switched by a CSS
        breakpoint, not by conditional mounting) so the datalist-id-collision bug from earlier
        can't reappear. Litres/amount/odometer are live-computed as you type: ₹/L, and "this
        tank would read X km/L" — or a warning if the odometer doesn't clear your last reading.
      - **By station**: a small comparison card (avg km/L + bar per station) below the form.

      Found and fixed one real bug this exposed: some existing rows in your data have invisible
      Unicode "format" characters (zero-width space, etc. — Unicode category Cf) embedded in the
      date field, likely from a clipboard paste through the CSV importer at some point. The old
      UI never called `date-fns format()` on parsed dates, so it never noticed; the new hero and
      leg-card labels do, and `format()` throws on the resulting invalid date. Fixed by having
      `parseEntryDate()` strip `\p{Cf}` characters before parsing (`src/types.ts`) — the
      underlying rows still have the invisible character in storage, only the display/parsing
      path is hardened, so nothing needed to change in your database.

- [x] **Promote efficiency readout + sparkline to top of `Statistics`.**
      Rebuilt to match Entries' hero treatment, using the same `EfficiencySparkline` component
      and station-chip filter (the `Select` dropdown is gone — `ui/select.tsx` was deleted, since
      nothing else in the app used it):
      - **Hero**: average efficiency across the current filter as the headline number (not a
        trailing delta like Entries — Statistics' whole point is the complete picture, so it
        leads with the full range instead: "ranging from X to Y km/L across N tanks").
      - **Secondary strip**: the other 5 aggregate stats (total spent, distance, fuel filled,
        cost/km, price/litre) — the old 6-card grid's 6th card (avg efficiency) moved into the
        hero, so this is the other 5.
      - Removed the standalone "Fuel Efficiency Trend" line chart — it plotted the exact same
        series the new hero sparkline shows, and the rebuilt Entries tab doesn't show any metric
        twice in two chart forms either. "Spending Over Time" and the two by-station bar charts
        stay, since those carry information the hero doesn't.
