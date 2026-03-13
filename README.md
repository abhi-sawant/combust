# Combust

> A cross-platform fuel consumption tracker — available as an installable PWA and a native iOS/Android app, both powered by Supabase.

---

## What is Combust?

Combust helps you track every fuel fill-up for your vehicle. Log the date, fuel station, litres filled, amount paid, and odometer reading. The app calculates your fuel efficiency (km/L) and spending trends automatically, and displays them in charts and summary cards.

**Two fully independent frontends. One shared Supabase backend.**

| | PWA (Web) | Native App |
|---|---|---|
| **Location** | `src/` | `app/` |
| **Framework** | React 19 + Vite | Expo 54 + React Native 0.81 |
| **Storage** | IndexedDB (offline-first) + Supabase | Supabase only |
| **Auth** | Supabase (email/password + confirmation) | Supabase (email/password + confirmation) |
| **Installable** | Yes — PWA (Add to Home Screen) | Yes — App Store / Play Store |

---

## Features

Both platforms ship with:

- **Authentication** — sign up, sign in, email confirmation, sign out
- **Fuel entries** — add, edit, delete fuel records with date, station, litres, amount paid, odometer
- **Statistics dashboard** — 6 summary cards + 4 charts (spending over time, efficiency trend, spending by station, efficiency by station)
- **Station autocomplete** — suggestions from your existing fill-up history
- **Import / Export** — CSV and JSON support
- **Charts** — visualise spending and fuel efficiency trends
- **Data isolation** — each user only sees their own entries

---

## Project Structure

```
combust/
├── src/                    # PWA — React + Vite
│   ├── App.tsx             # Root component; handles routing + sync
│   ├── main.tsx            # React DOM entry
│   ├── index.css           # Tailwind + global CSS variables (OKLCH)
│   ├── components/
│   │   ├── auth/           # SignIn, SignUp, EmailConfirmation
│   │   ├── ui/             # shadcn/ui primitives
│   │   ├── entries.tsx     # Entries list + CRUD forms
│   │   └── statistics.tsx  # Stats dashboard + recharts
│   ├── contexts/
│   │   └── AuthContext.tsx # Supabase session + local user ID mapping
│   ├── lib/
│   │   ├── database.ts     # IndexedDB setup (CombustDB v2)
│   │   ├── db.ts           # CRUD helpers for entries store
│   │   ├── auth.ts         # Local user store (SHA-256, IndexedDB)
│   │   ├── supabaseClient.ts
│   │   ├── useIndexedDB.ts # React hook for IndexedDB state
│   │   └── utils.ts        # cn() (clsx + tailwind-merge)
│   └── services/
│       └── fuelService.ts  # Offline-first CRUD + sync queue
│
├── app/                    # Native App — Expo + React Native
│   ├── app.json            # Expo config
│   ├── package.json
│   ├── app/                # File-based routes (expo-router)
│   │   ├── _layout.tsx     # Root layout: ThemeProvider + AuthProvider
│   │   ├── (auth)/         # sign-in, sign-up, email-confirmation
│   │   └── (tabs)/         # Bottom tabs: index (Entries) + explore (Stats)
│   ├── components/         # ThemedText, ThemedView, HapticTab, etc.
│   ├── contexts/
│   │   └── AuthContext.tsx # Supabase auth + AsyncStorage session
│   ├── lib/
│   │   └── supabaseClient.ts
│   ├── services/
│   │   └── fuelService.ts  # Direct Supabase CRUD
│   └── constants/
│       └── theme.ts        # Color tokens + platform fonts
│
├── public/                 # PWA icons, manifest
├── vite.config.ts          # Vite + PWA plugin + Tailwind
├── package.json            # PWA dependencies
├── components.json         # shadcn/ui config
└── tsconfig.json
```

---

## PWA (Web)

### Getting Started

```bash
# From the repo root
npm install
npm run dev      # → http://localhost:5173
```

### Tech Stack

| Category | Library | Version |
|---|---|---|
| Framework | React | 19.2.0 |
| Language | TypeScript | 5.9.3 |
| Build | Vite | 7.2.4 |
| PWA | vite-plugin-pwa + Workbox | 1.2.0 |
| CSS | Tailwind CSS v4 (Vite plugin) | 4.1.17 |
| UI | shadcn/ui (base-vega) + @base-ui/react | 1.2.0 |
| Icons | Hugeicons | 1.1.5 |
| Charts | Recharts | 2.15.x |
| Dates | date-fns + react-day-picker | 4.x / 9.x |
| Cloud | @supabase/supabase-js | 2.97.x |

### Architecture

The PWA is **offline-first**:

1. All reads and writes go to **IndexedDB** (`CombustDB` v2) first — always available
2. When online, changes sync to **Supabase** (`fuel_entries` table)
3. Offline writes queue in `localStorage` (`combust_sync_queue`) and flush on reconnect via `window.online`

**Auth** uses Supabase (email/password + email confirmation). On sign-in, a local IndexedDB user ID is created and mapped to the Supabase UUID via `localStorage` (`combust_local_user_map`).

### Key Files

| File | Purpose |
|---|---|
| `src/lib/database.ts` | IndexedDB init — `CombustDB` v2, stores: `entries`, `users` |
| `src/lib/db.ts` | CRUD for `entries` store (`getAllEntries`, `addEntry`, `updateEntry`, `deleteEntry`, etc.) |
| `src/lib/auth.ts` | Local user management via IndexedDB + SHA-256 (Web Crypto API) |
| `src/lib/supabaseClient.ts` | Supabase client, `FuelEntryDB` type, `isOnline()` |
| `src/lib/useIndexedDB.ts` | React hook `useIndexedDBEntries(userId)` |
| `src/services/fuelService.ts` | Offline-first service wrapping IndexedDB + sync queue + Supabase |
| `src/contexts/AuthContext.tsx` | Supabase auth state + local user ID mapping |
| `src/App.tsx` | Root: auth routing, entry state, online sync, import/export |
| `src/components/entries.tsx` | Entry list (table/cards), add form, edit dialog, delete, reorder |
| `src/components/statistics.tsx` | 6 stat cards, 4 recharts charts, station filter |

### Environment Variables

Create `.env` in the repo root:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Scripts

```bash
npm run dev      # development server
npm run build    # TypeScript check + Vite build → dist/
npm run preview  # preview production build
npm run lint     # ESLint
```

### Build & Deploy

```bash
npm run build
# Deploy dist/ to Vercel, Netlify, or GitHub Pages
# HTTPS required for service worker + PWA install prompt
```

### UI Library

shadcn/ui components live in `src/components/ui/`. Add new components with:

```bash
npx shadcn@latest add [component-name]
```

### Troubleshooting

| Problem | Fix |
|---|---|
| "Object store not found" | Clear IndexedDB: DevTools → Application → Storage → Delete |
| Service worker is stale | DevTools → Application → Service Workers → Skip Waiting |
| Supabase env vars missing | Create `.env` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` |
| Tailwind styles missing | Ensure `@import "tailwindcss"` is the first line in `index.css` |
| Offline sync not flushing | Inspect `combust_sync_queue` in DevTools → Application → Local Storage |

---

## Native App (Expo / React Native)

### Getting Started

```bash
cd app
npm install
npx expo start          # Metro bundler + Expo DevTools
```

Then press `i` for iOS Simulator, `a` for Android Emulator, or scan the QR code with Expo Go.

### Tech Stack

| Category | Library | Version |
|---|---|---|
| Framework | Expo | ~54.0.33 |
| Runtime | React Native | 0.81.5 |
| Language | TypeScript | ~5.9.2 |
| Router | expo-router | ~6.0.23 |
| Navigation | @react-navigation/bottom-tabs | ^7.4.0 |
| Auth / DB | @supabase/supabase-js | 2.99.x |
| Charts | react-native-chart-kit | ^6.12.0 |
| Date picker | @react-native-community/datetimepicker | 8.4.4 |
| Icons | @expo/vector-icons (Ionicons) | ^15.0.3 |
| File ops | expo-document-picker, expo-file-system, expo-sharing | — |
| Animations | react-native-reanimated | ~4.1.1 |
| Haptics | expo-haptics | ~15.0.8 |

### Architecture

The native app talks directly to **Supabase** — there is no local database:

- All fuel entries live in the `fuel_entries` Supabase table (soft deleted with `is_deleted`)
- Auth is fully managed by `supabase.auth`
- Sessions are persisted in `AsyncStorage` by the Supabase JS client
- No offline queue; the app requires a network connection

**Routing** is file-based via expo-router:

```
app/_layout.tsx              # ThemeProvider + AuthProvider + Stack
(auth)/sign-in.tsx           # Sign in
(auth)/sign-up.tsx           # Sign up
(auth)/email-confirmation.tsx
(tabs)/index.tsx             # Entries screen
(tabs)/explore.tsx           # Statistics screen
```

The root layout `RootLayoutNav` uses `useSegments` + `useRouter` to redirect unauthenticated users to the sign-in screen and authenticated users away from auth screens.

### Key Files

| File | Purpose |
|---|---|
| `app/lib/supabaseClient.ts` | Supabase client (AsyncStorage session), `FuelEntryDB` / `FuelEntry` types, `dbToEntry()` |
| `app/services/fuelService.ts` | `getAllEntries`, `addEntry`, `updateEntry`, `deleteEntry`, `replaceAllEntries` |
| `app/contexts/AuthContext.tsx` | Supabase auth (`user.id` = UUID), `onAuthStateChange` listener |
| `app/app/(tabs)/index.tsx` | Entries screen: `AddEntryForm`, `FlatList` cards, edit `Modal`, import/export |
| `app/app/(tabs)/explore.tsx` | Stats: 6 cards, `LineChart` + `BarChart`, station filter |
| `app/app/(tabs)/_layout.tsx` | Bottom tabs: Combust logo, user name, sign-out; active tint `#7f22fe` |
| `app/app/_layout.tsx` | Root layout with auth guard |
| `app/constants/theme.ts` | Light/dark colors, platform-aware fonts |

### Environment Variables

Create `app/.env`:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Scripts

```bash
cd app
npx expo start                # Expo DevTools (scan QR for Expo Go)
npx expo start --ios          # Open iOS Simulator directly
npx expo start --android      # Open Android Emulator directly
npx expo run:ios              # Full native build (iOS)
npx expo run:android          # Full native build (Android)
npx expo start --web          # Web preview
npm run lint
```

### Build & Deploy

```bash
# Using EAS (Expo Application Services)
npx eas build --platform all   # Build for iOS + Android
npx eas submit                 # Submit to App Store / Play Store
npx eas update                 # Push OTA update
```

### Expo Config (`app.json`)

| Key | Value |
|---|---|
| `scheme` | `app` (deep link scheme) |
| `newArchEnabled` | `true` |
| `experiments.reactCompiler` | `true` |
| Android package | `com.anonymous.combust` |
| Plugins | expo-router, expo-splash-screen, expo-secure-store, datetimepicker |

### Troubleshooting

| Problem | Fix |
|---|---|
| Metro cache stale | `npx expo start --clear` |
| Supabase env vars missing | Create `app/.env` with `EXPO_PUBLIC_*` vars |
| Email not confirmed error | User must click the link in the confirmation email |
| Android build fails | `cd android && ./gradlew clean`, then rebuild |
| DateTimePicker not rendering | Confirm `@react-native-community/datetimepicker` is in `app.json` plugins |
| iOS Simulator not found | Open Xcode, install iOS Simulator from Platforms |

---

## Shared Backend — Supabase

Both the PWA and the native app read from and write to the same Supabase project.

### Database Schema

```sql
CREATE TABLE fuel_entries (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES auth.users(id),
  date             text NOT NULL,            -- stored as 'YYYY/MM/DD'
  amount_paid      numeric NOT NULL,          -- Indian Rupees
  odometer_reading numeric NOT NULL,          -- kilometres
  fuel_filled      numeric NOT NULL,          -- litres
  fuel_station     text NOT NULL,
  is_deleted       boolean DEFAULT false,     -- soft delete
  local_id         integer,                   -- PWA IndexedDB reference
  synced_at        timestamptz,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz
);

-- Row Level Security
ALTER TABLE fuel_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own entries"
  ON fuel_entries FOR ALL
  USING (auth.uid() = user_id);
```

### Auth Flow

1. **Sign up** — Supabase sends a confirmation email
2. **Email confirmed** — user can sign in
3. **Sign in** — Supabase returns a JWT; session stored (localStorage/AsyncStorage)
4. Session auto-refreshes while the app is open
5. **Sign out** — session cleared from storage

> Email confirmation is required on both platforms before the user can access their data.

---

## Data Format

| Field | Format | Unit |
|---|---|---|
| `date` | `YYYY/MM/DD` | — |
| `amount_paid` | number | Indian Rupees (₹) |
| `odometer_reading` | number | kilometres |
| `fuel_filled` | number | litres |

**Efficiency calculation**: `(next odometer − current odometer) / current fuel filled` = km/L

---

## Authentication

| Feature | PWA | Native |
|---|---|---|
| Provider | Supabase | Supabase |
| Method | Email + password | Email + password |
| Email confirmation | Required | Required |
| Session storage | `localStorage` (via Supabase JS) | `AsyncStorage` (via Supabase JS) |
| Local user record | IndexedDB `users` store | Not used |

---

## Security

- **Never commit** `.env` or `app/.env` files
- Use only the **anon key** (`VITE_SUPABASE_ANON_KEY` / `EXPO_PUBLIC_SUPABASE_ANON_KEY`) — never the service role key
- **Row Level Security (RLS)** is enforced on the Supabase side — users cannot access other users' data
- The PWA's local auth uses **SHA-256** (Web Crypto API) for hashing locally stored passwords

---

## Import / Export

Both platforms support importing and exporting fuel data:

| Format | Import | Export |
|---|---|---|
| CSV | Yes (file or paste) | Yes (file download / share sheet) |
| JSON | Yes (file) | — |

CSV column order: `date, amountPaid, odometerReading, fuelFilled, fuelStation`

---

## Future Plans

- **Password reset** — email-based (Supabase native support)
- **Profile management** — update name/email
- **Multi-vehicle** — separate profiles per vehicle
- **Native offline queue** — AsyncStorage-based sync queue matching the PWA
- **Date range filter** — advanced filtering for statistics
- **Fuel price trends** — price-per-litre over time chart
- **Anomaly detection** — flag unusual efficiency or price readings
- **OAuth** — Google / Apple sign-in

---

## Development Notes

- All TypeScript; no `any` types
- State: `useState` + React Context — no Redux or Zustand
- Soft delete only — never `DELETE` from Supabase tables
- Both platforms use the same shadcn/ui design language where possible (purple `#7f22fe` brand colour)
- Path alias `@/` points to `src/` (PWA) and the root of `app/` (native)
