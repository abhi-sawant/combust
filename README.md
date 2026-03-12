# Combust - Cross-Platform Fuel Tracker

Combust is a cross-platform app for tracking vehicle fuel consumption, spending, and efficiency. It includes:
- **PWA (Web)**: React, TypeScript, Vite, IndexedDB, shadcn/ui, Tailwind
- **Native App (Expo/React Native)**: Expo, React Native, Supabase, platform theming

## Features (Both Platforms)
- User authentication (sign up, sign in, email confirmation, sign out)
- Add/edit/delete/reorder fuel entries
- Import/export (CSV, JSON, file/text)
- Statistics dashboard: total spent, distance, avg efficiency, cost/km, price/liter, charts
- Filter by station/date
- Responsive UI: card/table views, mobile/desktop
- Offline-first: works without internet
- Installable: PWA (Add to Home Screen), Native (App Store/Play Store)
- Cloud sync: Supabase (optional)
- Accessibility: ARIA labels, keyboard navigation, semantic HTML/native widgets

## Project Structure

```
combust/
├── src/           # PWA (web)
│   ├── components/
│   │   ├── auth/  # SignIn, SignUp, EmailConfirmation
│   │   ├── ui/    # shadcn/ui components
│   │   ├── entries.tsx
│   │   └── statistics.tsx
│   ├── contexts/  # AuthContext
│   ├── lib/       # IndexedDB, auth, utils
│   ├── App.tsx, main.tsx, index.css
├── app/           # Native (Expo/React Native)
│   ├── app/       # File-based routing
│   │   ├── (auth)/sign-in.tsx, sign-up.tsx, email-confirmation.tsx
│   │   ├── (tabs)/index.tsx, explore.tsx
│   ├── components/ # ThemedView, ThemedText, Collapsible, etc.
│   ├── contexts/   # AuthContext
│   ├── lib/        # auth, supabaseClient
│   ├── services/   # fuelService
│   ├── constants/  # theme.ts
│   ├── assets/     # Icons, splash
│   ├── app.json    # Expo config
├── public/        # PWA static assets
├── vite.config.ts # PWA config
├── package.json   # Shared dependencies
```

## Getting Started

### PWA (Web)

1. Install dependencies
   ```bash
   npm install
   ```
2. Start development server
   ```bash
   npm run dev
   ```
3. Open [http://localhost:5173](http://localhost:5173)

### Native App (Expo/React Native)

1. Install dependencies
   ```bash
   npm install
   ```
2. Start Expo
   ```bash
   npx expo start
   ```
3. Open in Expo Go, iOS Simulator, or Android Emulator

## Build & Deployment

### PWA
- `npm run build` → outputs to `dist/` with service worker and manifest
- Deploy to Vercel, Netlify, GitHub Pages
- HTTPS required for install

### Native App
- Build with Expo, deploy to App Store/Play Store
- Adaptive icons, splash, edge-to-edge UI

## Usage

- Add entries: date, fuel amount, cost, odometer, station
- View statistics: efficiency, spending, charts
- Import/export: CSV, JSON, file/text
- Filter by station/date
- Cloud sync (optional)

## Authentication & Storage

- **PWA**: IndexedDB for entries/users, localStorage for session, password hashing via Web Crypto
- **Native**: Supabase for entries/users, session, password hashing via expo-crypto
- **Supabase**: Optional cloud sync for both platforms, email confirmation, session management
- **User data isolation**: Each user only sees their own entries

## UI & Styling

- **PWA**: shadcn/ui, Tailwind, OKLCH colors, Inter font, cva variants, cn utility, light/dark mode via CSS variables
- **Native**: ThemedView/ThemedText, platform colors/fonts, light/dark mode, adaptive icons, splash

## Troubleshooting

- IndexedDB errors: clear storage, restart app
- Auth/session issues: check localStorage, Supabase session
- PWA install: check HTTPS, manifest, icons
- Native install: check Expo config, icons, splash

## Testing

- Use Vitest (PWA), Expo tests (native)
- React Testing Library for components
- Mock date picker, calendar, file import/export

## License

See package.json for license and author info.

---

**Last Updated**: March 12, 2026
**Project Version**: 1.0.0
