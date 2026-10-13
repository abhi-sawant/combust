# Combust web

React 19, TypeScript, Vite 8, Tailwind v4, shadcn (base-nova) on `@base-ui/react`, Recharts, IndexedDB (`idb`).
Run everything from `web/`: `npm run dev`, `npm test`, `npm run build`, `npm run gen:fixtures`.

- State: context providers in `src/hooks` (auth, sync, vehicles, entries). No router; tabs are state in `src/App.tsx`.
- Local data: `src/lib/local-db.ts` (IndexedDB). Sync: `src/lib/sync.ts`. API: `src/lib/api-client.ts` (`VITE_API_URL`).
- Logic shared with Android lives in `src/lib/{calculations,sector,csv,format}.ts` — covered by the golden
  fixtures in `src/spec/`. If you change behaviour, run `npm run gen:fixtures` and port the change to `android/core`.
- App version: `__APP_VERSION__` (from the root `VERSION`).
- `web/.env` (gitignored) sets `VITE_API_URL`. Test-account credentials are in `web/.env.test.local` (gitignored).
