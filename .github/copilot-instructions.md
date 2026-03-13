# Combust — Project Instructions for AI Agents

## Project Overview

**Combust** is a cross-platform fuel consumption tracker with two independent, fully-functional frontends sharing the same Supabase cloud backend:

| Platform | Location | Stack |
|---|---|---|
| **PWA (Web)** | `src/` | React 19, TypeScript, Vite, Tailwind CSS 4, shadcn/ui, IndexedDB + Supabase |
| **Native App** | `app/` | Expo 54, React Native 0.81.5, expo-router, Supabase |

Both apps allow users to sign up, sign in, and manage personal fuel entries (date, amount paid, fuel filled in litres, odometer reading, station name). Both support Supabase cloud auth with email confirmation, statistics charts, and CSV/JSON import/export.

---

## Repository Structure

```
combust/
├── src/                    # PWA (React + Vite)
│   ├── App.tsx             # Root component, route handler, sync listener
│   ├── main.tsx            # React DOM entry point
│   ├── index.css           # Global styles + Tailwind import
│   ├── data.ts             # Historical sample data (reference only)
│   ├── assets/
│   ├── components/
│   │   ├── auth/
│   │   │   ├── SignIn.tsx
│   │   │   ├── SignUp.tsx
│   │   │   └── EmailConfirmation.tsx
│   │   ├── ui/             # shadcn/ui + Base UI components
│   │   ├── entries.tsx     # Fuel entries list + CRUD
│   │   └── statistics.tsx  # Stats dashboard + recharts
│   ├── contexts/
│   │   └── AuthContext.tsx # Supabase auth + local IndexedDB user mapping
│   ├── lib/
│   │   ├── database.ts     # IndexedDB init (CombustDB v2)
│   │   ├── db.ts           # Low-level IndexedDB CRUD for entries
│   │   ├── auth.ts         # Local user management (IndexedDB users store)
│   │   ├── supabaseClient.ts # Supabase client + type definitions
│   │   ├── useIndexedDB.ts # React hook for IndexedDB CRUD
│   │   └── utils.ts        # cn() helper (clsx + tailwind-merge)
│   └── services/
│       └── fuelService.ts  # Offline-first: IndexedDB + Supabase sync queue
├── app/                    # Native App (Expo / React Native)
│   ├── app.json            # Expo config (icons, splash, plugins)
│   ├── package.json        # Native-specific dependencies
│   ├── app/                # expo-router file-based routes
│   │   ├── _layout.tsx     # Root layout: ThemeProvider + AuthProvider
│   │   ├── modal.tsx
│   │   ├── (auth)/
│   │   │   ├── _layout.tsx
│   │   │   ├── sign-in.tsx
│   │   │   ├── sign-up.tsx
│   │   │   └── email-confirmation.tsx
│   │   └── (tabs)/
│   │       ├── _layout.tsx  # Bottom tab navigator
│   │       ├── index.tsx    # Entries screen
│   │       └── explore.tsx  # Statistics screen
│   ├── components/
│   │   ├── themed-text.tsx, themed-view.tsx, haptic-tab.tsx
│   │   └── ui/collapsible.tsx, icon-symbol.tsx
│   ├── contexts/
│   │   └── AuthContext.tsx # Supabase auth via supabase.auth + AsyncStorage
│   ├── lib/
│   │   ├── auth.ts         # Legacy SQLite auth (unused; AuthContext uses Supabase)
│   │   └── supabaseClient.ts # Supabase client + FuelEntryDB/FuelEntry types
│   ├── services/
│   │   └── fuelService.ts  # Supabase CRUD for fuel_entries table
│   ├── constants/theme.ts  # Colors + platform-aware font stacks
│   ├── hooks/              # useColorScheme, useThemeColor
│   └── assets/images/      # App icons, splash screen
├── public/                 # PWA static assets (favicons, manifest icons)
├── vite.config.ts          # Vite + PWA plugin + Tailwind + path aliases
├── package.json            # PWA root dependencies
├── tsconfig.json           # TypeScript project references
├── components.json         # shadcn/ui config (base-vega, hugeicons, zinc)
└── eslint.config.js        # ESLint config for PWA
```

---

## PWA (Web — `src/`)

### Technology Stack

| Category | Library | Version |
|---|---|---|
| Framework | React | 19.2.0 |
| Language | TypeScript | 5.9.3 |
| Build tool | Vite | 7.2.4 |
| PWA | vite-plugin-pwa + Workbox | 1.2.0 |
| CSS | Tailwind CSS (Vite plugin) | 4.1.17 |
| UI | shadcn/ui (base-vega) + @base-ui/react | 1.2.0 |
| Icons | @hugeicons/react | 1.1.5 |
| Font | @fontsource-variable/inter | — |
| Charts | recharts | 2.15.x |
| Dates | date-fns + react-day-picker | 4.x / 9.x |
| Cloud | @supabase/supabase-js | 2.97.x |
| Local storage | IndexedDB (browser native) | — |
| Utilities | clsx, tailwind-merge, class-variance-authority | — |

### Architecture

The PWA uses an **offline-first** architecture with dual storage:

1. **IndexedDB** (`CombustDB` v2) — always-available local store (entries + users)
2. **Supabase** — cloud sync, used when online; a pending sync queue in `localStorage` handles offline writes

**Auth flow:**
- Supabase email/password auth with email confirmation
- On sign in a local IndexedDB user ID is generated and mapped to the Supabase UUID (stored in `localStorage` as `combust_local_user_map`)
- Sessions managed by the Supabase JS client (`persistSession: true`, `detectSessionInUrl: true`)
- `AuthContext` listens to `supabase.auth.onAuthStateChange`

**Data flow:**
- `src/services/fuelService.ts` wraps IndexedDB + Supabase sync
- All reads/writes go to IndexedDB first; when online, changes are pushed to Supabase
- Offline writes are queued in `localStorage` (`combust_sync_queue`) and flushed on reconnect
- `window.online` event in `App.tsx` triggers `fuelService.fullSync()`

### Key PWA Files

#### `src/lib/database.ts`
Opens/creates `CombustDB` (IndexedDB v2). Exports `openDB()` and `STORES`.
- `entries` store: `keyPath: 'id'` (auto-increment), indexes: `date`, `fuelStation`, `userId`
- `users` store: `keyPath: 'id'` (auto-increment), unique index: `email`
- Increment `DB_VERSION` here to trigger `onupgradeneeded` schema migrations.

#### `src/lib/db.ts`
Low-level IndexedDB CRUD for `entries` store:
- `getAllEntries(userId)`, `addEntry(entry)`, `updateEntry(entry)`, `deleteEntry(id)`
- `clearAllEntries(userId)`, `bulkAddEntries(entries[])`, `replaceAllEntries(userId, entries[])`

#### `src/lib/auth.ts`
Local user management for the IndexedDB `users` store (SHA-256 via Web Crypto API):
- `registerUser(email, password, name)`, `verifyCredentials(email, password)`, `getUserByEmail(email)`, `getUserById(id)`

#### `src/lib/supabaseClient.ts`
Env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
Exports: `supabase` client, `FuelEntryDB` type (snake_case, includes `local_id`, `is_deleted`, `synced_at`), `isOnline()` helper.

#### `src/services/fuelService.ts`
Offline-first service. Key functions:
- `getAllEntries(userId, supabaseUserId?)` — from IndexedDB
- `createEntry(entry, userId, supabaseUserId?)` — IndexedDB + queue Supabase sync
- `updateEntry(entry, supabaseUserId?)` — local + queue sync
- `deleteEntry(entry, supabaseUserId?)` — soft delete locally + queue sync
- `fullSync(userId, supabaseUserId)` — flush queue + pull remote
- `replaceAllEntries(userId, entries[], supabaseUserId?)` — import

#### `src/lib/useIndexedDB.ts`
React hook `useIndexedDBEntries(userId)`:
```typescript
const { entries, isLoading, addEntry, updateEntry, deleteEntry,
        replaceAllEntries, moveEntry, clearAllEntries } = useIndexedDBEntries(userId);
```
`moveEntry` is in-memory only (UI reorder, not persisted).

#### `src/contexts/AuthContext.tsx`
Auth states: `'loading'` | `'unauthenticated'` | `'authenticated'` | `'awaiting_confirmation'`
Exports: `user`, `isLoading`, `authState`, `signIn`, `signUp`, `signOut`, `resendConfirmationEmail`, `setAwaitingConfirmation`, `clearAwaitingConfirmation`

#### `src/App.tsx`
- Routes between SignIn / SignUp / EmailConfirmation / main app
- Loads entries from `fuelService` when `user` changes
- `window.online` listener triggers sync
- Owns import (CSV text in Dialog) and export (CSV download) logic
- Renders `<Tabs>` with `<Entries>` and `<Statistics>`

### PWA UI Components

**shadcn/ui** (in `src/components/ui/`): `button`, `input`, `card`, `dialog`, `alert-dialog`, `tabs`, `popover`, `calendar`, `select`, `combobox`, `label`, `field`, `table`, `separator`, `textarea`, `chart`, `input-group`

**Feature components:**
- `entries.tsx` — table (desktop) / cards (mobile), add form, edit dialog, delete confirm, reorder, station autocomplete, import/export
- `statistics.tsx` — 6 metric cards, 4 recharts charts (spending over time, efficiency trend, spending by station, efficiency by station), station filter

### PWA Styling

- **Color space**: OKLCH throughout (CSS variables in `index.css`)
- **Theme**: light + dark via CSS custom properties
- **Variants**: `class-variance-authority` for component variants
- **Path alias**: `@/` → `src/`
- **Font**: Inter Variable
- **Animations**: `tw-animate-css`

### PWA Data Types

```typescript
// src/services/fuelService.ts
type FuelEntry = {
  id?: number;             // IndexedDB auto-generated
  supabaseId?: string;     // Supabase UUID
  userId: number;          // Local IndexedDB user ID
  supabaseUserId?: string;
  date: string;            // 'YYYY/MM/DD'
  amountPaid: number;      // INR
  odometerReading: number; // km
  fuelFilled: number;      // litres
  fuelStation: string;
  syncedAt?: string | null;
  isDeleted?: boolean;
};
```

### PWA Commands

```bash
# Run from repo root
npm install          # install dependencies
npm run dev          # http://localhost:5173
npm run build        # TypeScript check + Vite build -> dist/
npm run preview      # preview production build
npm run lint         # ESLint
```

### PWA Deployment

Deploy `dist/` to Vercel, Netlify, or GitHub Pages. **HTTPS required** for PWA install prompt and service worker. Service worker auto-updates (`autoUpdate` register type) on new deploy.

### PWA Configuration Files

- **`vite.config.ts`**: PWA manifest (`theme_color: '#7f22fe'`, standalone, portrait), Workbox precache all assets + runtime cache Google Fonts
- **`components.json`**: shadcn/ui — style `base-vega`, icons `hugeicons`, base color `zinc`
- **Env**: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

### PWA Troubleshooting

| Problem | Fix |
|---|---|
| "Object store not found" | Clear IndexedDB in DevTools -> Application -> Storage |
| Service worker stale | DevTools -> Application -> Service Workers -> Skip Waiting |
| Supabase env vars missing | Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to `.env` |
| Tailwind classes missing | Ensure `@import "tailwindcss"` is the first line in `index.css` |
| Sync not flushing offline writes | Check `combust_sync_queue` key in localStorage via DevTools |

---

## Native App (Expo / React Native — `app/`)

### Technology Stack

| Category | Library | Version |
|---|---|---|
| Framework | Expo | ~54.0.33 |
| Runtime | React Native | 0.81.5 |
| Language | TypeScript | ~5.9.2 |
| Router | expo-router (file-based) | ~6.0.23 |
| Navigation | @react-navigation/bottom-tabs | ^7.4.0 |
| Cloud / Auth | @supabase/supabase-js + AsyncStorage | 2.99.x |
| Charts | react-native-chart-kit | ^6.12.0 |
| Date picker | @react-native-community/datetimepicker | 8.4.4 |
| Icons | @expo/vector-icons (Ionicons) | ^15.0.3 |
| File ops | expo-document-picker, expo-file-system, expo-sharing | — |
| Animations | react-native-reanimated | ~4.1.1 |
| Haptics | expo-haptics | ~15.0.8 |
| Crypto | expo-crypto | ~15.0.8 |

### Architecture

The native app uses **Supabase as the sole backend** — no local database:

- All fuel entries stored in Supabase `fuel_entries` table (soft delete via `is_deleted`)
- Auth via `supabase.auth` (email/password + email confirmation)
- Sessions persisted in `AsyncStorage` by the Supabase JS client
- No offline queue — data requires connectivity

**Routing (expo-router):**
```
app/_layout.tsx                     Root layout: ThemeProvider + AuthProvider + Stack
app/(auth)/sign-in.tsx              Sign in screen
app/(auth)/sign-up.tsx              Sign up screen
app/(auth)/email-confirmation.tsx   Confirm email screen
app/(tabs)/index.tsx                Entries screen
app/(tabs)/explore.tsx              Statistics screen
```

Auth guard in `app/_layout.tsx` (`RootLayoutNav`): uses `useSegments` + `useRouter` to redirect unauthenticated users to `/(auth)/sign-in` and authenticated users away from auth screens.

### Key Native App Files

#### `app/lib/supabaseClient.ts`
Env vars: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
- Supabase client with `AsyncStorage` session, `detectSessionInUrl: false`
- `FuelEntryDB` (DB snake_case), `FuelEntry` (app camelCase), `dbToEntry()` converter

#### `app/services/fuelService.ts`
Supabase CRUD for `fuel_entries`:
- `getAllEntries(userId)` — non-deleted, ordered by date desc
- `addEntry(entry, userId)` — insert, returns `FuelEntry`
- `updateEntry(entry)` — by `id` + `user_id`
- `deleteEntry(entry)` — soft delete (`is_deleted: true`)
- `deleteAllEntries(userId)`, `replaceAllEntries(userId, entries[])` — import

#### `app/contexts/AuthContext.tsx`
`user.id` is a Supabase UUID string. Exposes same interface as PWA AuthContext: `user`, `isLoading`, `authState`, `signIn`, `signUp`, `signOut`, `resendConfirmationEmail`.
Listens to `supabase.auth.onAuthStateChange` for real-time session updates.

#### `app/app/(tabs)/index.tsx` — Entries Screen
- `AddEntryForm` — native `DateTimePicker`, station autocomplete (TextInput + FlatList), numeric inputs
- `FlatList` card list for entries
- Edit via `Modal`, delete via `Alert.alert` confirmation
- Import: `expo-document-picker` + `expo-file-system` (CSV/JSON)
- Export: `expo-sharing` share sheet

#### `app/app/(tabs)/explore.tsx` — Statistics Screen
- Fetches from Supabase on mount
- 6 stat cards (total spent, distance, avg efficiency, cost/km, avg price/L, total fills)
- `LineChart` (spending over time, efficiency trend) + `BarChart` (by station)
- Station filter modal

#### `app/app/(tabs)/_layout.tsx` — Tab Navigator
- Bottom tabs, active tint `#7f22fe`
- Header: Combust flame logo, user name, sign-out button
- Tabs: "Entries" (list-outline) and "Statistics" (bar-chart-outline)

### Native App Data Types

```typescript
// app/lib/supabaseClient.ts
type FuelEntryDB = {
  id: string;               // UUID primary key
  user_id: string;          // Supabase auth UUID
  date: string;             // 'YYYY/MM/DD'
  amount_paid: number;      // INR
  odometer_reading: number; // km
  fuel_filled: number;      // litres
  fuel_station: string;
  is_deleted: boolean;
  created_at?: string;
  updated_at?: string;
};

type FuelEntry = {
  id?: string;              // Supabase UUID
  userId: string;           // Supabase auth UUID
  date: string;
  amountPaid: number;
  odometerReading: number;
  fuelFilled: number;
  fuelStation: string;
};

// app/contexts/AuthContext.tsx
type User = {
  id: string;               // Supabase UUID
  email: string;
  name: string;             // from user_metadata.name
  emailConfirmed: boolean;  // from email_confirmed_at
};
```

### Native App Configuration

- **`app.json`**: `scheme: "app"`, `newArchEnabled: true`, `experiments.reactCompiler: true`
  - Plugins: `expo-router`, `expo-splash-screen`, `expo-secure-store`, `@react-native-community/datetimepicker`
  - Android: adaptive icon (foreground/background/monochrome), edge-to-edge, `com.anonymous.combust`
- **Env**: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` in `app/.env`

### Native App Commands

```bash
# Run from app/ directory
cd app
npm install
npx expo start                # Metro + Expo DevTools
npx expo start --ios          # iOS Simulator
npx expo start --android      # Android Emulator
npx expo run:ios              # Full native build for iOS
npx expo run:android          # Full native build for Android
npx expo start --web          # Web preview
npm run lint
```

### Native App Troubleshooting

| Problem | Fix |
|---|---|
| Metro cache stale | `npx expo start --clear` |
| Supabase env vars missing | Add `EXPO_PUBLIC_*` vars to `app/.env` |
| Email not confirmed | App redirects to `email-confirmation` screen; check Supabase email logs |
| Android build fails | `cd android && ./gradlew clean`, then rebuild |
| DateTimePicker not showing | Ensure `@react-native-community/datetimepicker` is in `app.json` plugins |

---

## Shared Backend — Supabase

Both platforms use the same Supabase project.

### `fuel_entries` Table Schema

```sql
CREATE TABLE fuel_entries (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES auth.users(id),
  date             text NOT NULL,            -- 'YYYY/MM/DD'
  amount_paid      numeric NOT NULL,          -- INR
  odometer_reading numeric NOT NULL,          -- km
  fuel_filled      numeric NOT NULL,          -- litres
  fuel_station     text NOT NULL,
  is_deleted       boolean DEFAULT false,
  local_id         integer,                   -- PWA IndexedDB local record id
  synced_at        timestamptz,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz
);

ALTER TABLE fuel_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own entries" ON fuel_entries
  FOR ALL USING (auth.uid() = user_id);
```

### Auth Flow (Both Platforms)

1. Sign up — Supabase sends confirmation email
2. User confirms email — allowed to sign in
3. Sign in — JWT session established
4. Session auto-refreshes via Supabase client
5. Sign out — session cleared from storage

---

## Common Patterns & Conventions

### TypeScript
- No `any` — use proper types; `unknown` if type is truly unknown
- Interfaces for all data structures passed between components/services
- Path alias `@/` maps to `src/` (PWA) or root of `app/` (native)

### Naming
- Files: kebab-case (`fuel-service.ts`)
- Components: PascalCase (`StatCard`, `AddEntryForm`)
- Functions/variables: camelCase
- Constants: SCREAMING_SNAKE_CASE

### State Management
- No Redux / Zustand — local `useState` or React Context only
- Functional state updates: `setState(prev => ...)`
- `useCallback` + `useMemo` for stable refs and expensive derived values
- Keep state co-located; lift only when truly shared

### Adding shadcn/ui Components (PWA only)
```bash
# from repo root
npx shadcn@latest add [component-name]
# Added to src/components/ui/
```

### Working with IndexedDB (PWA)
1. Schema changes — increment `DB_VERSION` in `src/lib/database.ts`
2. New stores — add to `onupgradeneeded` handler
3. New entry operations — add to `src/lib/db.ts`
4. Hook surface changes — update `src/lib/useIndexedDB.ts`

### Working with Supabase (Both Platforms)
1. Table schema changes — update `FuelEntryDB` in `supabaseClient.ts` on both platforms
2. New queries — add to `fuelService.ts` in the relevant platform's `services/`
3. Always filter by `user_id` + `is_deleted = false` for entry reads
4. Always use soft delete (`is_deleted: true`, `updated_at: now()`) — never hard delete

---

## Security Requirements

### PWA
- Only use `VITE_SUPABASE_ANON_KEY` — never the service role key in client code
- RLS must be enabled on all Supabase tables with `auth.uid() = user_id` policy
- Local SHA-256 password hashing (Web Crypto) is acceptable for local-only fallback auth

### Native App
- Only use `EXPO_PUBLIC_SUPABASE_ANON_KEY` — never service role key
- `expo-secure-store` is available for sensitive storage if needed
- Supabase session in `AsyncStorage` is standard for React Native

### Both Platforms
- RLS enforced server-side — users can never access another user's data
- Email confirmation required before accessing fuel data
- Never log auth tokens or password hashes

---

## Development Units & Locale

- **Currency**: INR (Rs.)
- **Volume**: Litres (L)
- **Distance**: Kilometres (km)
- **Date format stored**: `YYYY/MM/DD`
- **Efficiency formula**: `(nextOdometer - currentOdometer) / currentFuelFilled` = km/L

---

## Future Development

### High Priority
- Password reset via email (Supabase supports this natively)
- Profile management (edit name, change email)
- Multi-vehicle support (vehicle profiles per user)
- Native offline queue (similar to PWA sync queue using AsyncStorage)

### Medium Priority
- Advanced date range filtering
- Anomaly detection (efficiency spikes, unusual prices)
- Push notifications for fuel reminders

### Low Priority
- OAuth (Google, Apple Sign-In)
- Receipt OCR auto-fill
- Social / sharing features

---

**Last Updated**: March 2026
**PWA Version**: 0.0.0 | **Native App Version**: 1.0.0
**Status**: Both platforms fully functional with Supabase cloud backend
