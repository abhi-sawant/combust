
# Combust Constitution

<!-- Sync Impact Report
Version change: 0.0.0 → 1.0.0 (major, full rewrite from template)
Modified principles: All (template → concrete Combust rules)
Added sections: Project Identity, Architecture Principles, Technology Choices, Code Conventions, Data Layer Rules, Auth & Security Rules, UI/UX Conventions, Cross-Platform Parity Rules, Forbidden Practices, Future Development Protocol
Removed sections: Template placeholders
Templates requiring updates: plan-template.md ✅, spec-template.md ✅, tasks-template.md ✅
Follow-up TODOs: RATIFICATION_DATE (unknown, needs project lead input)
-->

## Project Identity

Combust is a cross-platform fuel consumption tracker, available as a PWA and native app, both powered by a shared Supabase backend. It helps users log fuel fill-ups, track efficiency (km/L), and visualize spending trends. Non-negotiable constraints: all units are INR (₹), litres (L), kilometres (km); only soft deletes allowed; no hard deletes; all data is user-isolated.

## Architecture Principles

- PWA is offline-first (IndexedDB + Supabase sync); native app is online-only (Supabase only) for reliability and platform constraints.
- Dual-storage pattern: PWA reads/writes to IndexedDB first, syncs to Supabase when online; native app reads/writes directly to Supabase.
- Shared backend: Both platforms must remain schema-compatible; any Supabase table changes must be reflected in both platforms' types.
- Sync queue contract: PWA queues offline writes in localStorage (`combust_sync_queue`), flushes on reconnect; native app will implement similar queue in future.

## Technology Choices (Locked)

**Locked libraries/tools:**
- React 19 (PWA): Modern, stable, ecosystem support
- Vite (PWA): Fast build, PWA plugin support
- Tailwind CSS 4 (PWA): Consistent design, OKLCH color space
- shadcn/ui (PWA): Unified UI primitives
- IndexedDB (PWA): Browser-native offline storage
- Supabase: Auth, cloud DB, charts, RLS
- Expo 54 + React Native 0.81 (Native): Cross-platform, stable
- expo-router: File-based routing
- AsyncStorage: Session persistence (Native)
- @supabase/supabase-js: Auth + DB client

**Open areas:**
- Charting libraries (Recharts, react-native-chart-kit)
- Date picker (react-day-picker, @react-native-community/datetimepicker)
- File ops (expo-document-picker, expo-file-system)
- Future UI primitives (native)

## Code Conventions (Enforced)

- TypeScript only; no `any` types (use `unknown` if needed)
- Interfaces for all data structures
- File naming: kebab-case; components: PascalCase; functions/variables: camelCase; constants: SCREAMING_SNAKE_CASE
- State: `useState` + React Context only; no Redux/Zustand/global state managers
- Component co-location: keep state local unless truly shared; lift only when necessary
- Path alias: `@/` → `src/` (PWA), root of `app/` (native)

## Data Layer Rules

- FuelEntry contract: PWA uses camelCase service type; DB uses snake_case (`FuelEntryDB`)
- Supabase table: always filter `is_deleted=false`, always filter by `user_id`, always soft delete (never hard delete)
- IndexedDB versioning: bump `DB_VERSION` in `src/lib/database.ts` for schema changes
- Sync queue: PWA uses `combust_sync_queue` in localStorage; flush triggered by `window.online` event

## Auth & Security Rules

- Never use service role key in client code; only anon key (`VITE_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`)
- RLS is always enabled; users can only access their own data
- Email confirmation is mandatory before accessing fuel data
- Never hard delete; delete means `is_deleted=true`, entry hidden from user, not removed from DB
- Never log auth tokens or password hashes

## UI/UX Conventions

- PWA: shadcn/ui for all primitives; OKLCH color space; brand color `#7f22fe` (purple) used for primary actions, tabs, charts
- Native: themed components, platform-aware fonts, brand color `#7f22fe` for active tab, header, buttons
- Responsive breakpoints: PWA uses table layout for desktop, card layout for mobile
- Add new shadcn/ui components via `npx shadcn@latest add [component-name]` (PWA only)

## Cross-Platform Parity Rules

- Features that MUST exist on both: auth (sign up/in/out, email confirmation), fuel entry CRUD, statistics dashboard, import/export, station autocomplete
- Platform-specific features: PWA offline queue, native app direct Supabase access (no offline yet)
- New features must be implemented on both unless platform constraints or user experience rationale is documented

## What Is Explicitly Forbidden

- Hard deletes (DB or local)
- `any` types
- Service role key in client code
- Redux, Zustand, or other global state managers
- Logging auth tokens or password hashes
- Breaking schema compatibility between platforms
- Unreviewed changes to DB version or FuelEntry types

## Future Development Protocol

- Backlog is prioritized: High (password reset, profile management, multi-vehicle, native offline queue), Medium (date range filtering, anomaly detection, push notifications), Low (OAuth, receipt OCR, social features)
- To promote a backlog item: must be user-requested, technically feasible, and schema changes must be reflected in both platforms' types
- Any new Supabase columns must be added to both `FuelEntryDB` types and all CRUD logic

## Governance

- This constitution supersedes all other practices; amendments require documentation, approval, and migration plan
- All PRs/reviews must verify compliance with constitution rules
- Versioning: MAJOR for breaking changes, MINOR for new principles/sections, PATCH for clarifications/wording
- Compliance review required for every release; use README and copilot-instructions for runtime guidance

**Version**: 1.0.0 | **Ratified**: TODO(RATIFICATION_DATE): project lead to supply | **Last Amended**: 2026-03-13
