# Combust - Project Instructions for AI Agents

## Project Overview

**Combust** is a Progressive Web App (PWA) for tracking vehicle fuel consumption built with React and TypeScript. It allows users to create accounts, sign in, and record and view their personal fuel entries including date, amount paid, fuel filled (liters), odometer reading, and fuel station name. The application features user authentication, offline support, persistent storage via IndexedDB, and can be installed on mobile and desktop devices. Each user's data is completely isolated and only accessible when logged in.

## Technology Stack

### Core Framework
- **React**: 19.2.0 (latest)
- **TypeScript**: 5.9.3
- **Build Tool**: Vite 7.2.4
- **Package Manager**: npm (though pnpm or yarn can be used)
- **PWA**: vite-plugin-pwa 1.2.0 with Workbox for service worker management
- **Data Storage**: IndexedDB (browser-native persistent storage)

### UI & Styling
- **UI Library**: shadcn/ui with Base UI (@base-ui/react 1.2.0)
- **Design System**: base-vega style variant from shadcn/ui
- **CSS Framework**: Tailwind CSS 4.1.17 with Vite plugin
- **Icon Library**: Hugeicons (@hugeicons/react 1.1.5)
- **Font**: Inter Variable (@fontsource-variable/inter)
- **Color Space**: OKLCH (modern color space with better perceptual uniformity)
- **Theme**: Supports both light and dark modes via CSS variables

### Supporting Libraries
- **date-fns**: Date formatting and manipulation
- **react-day-picker**: Calendar component for date selection
- **recharts**: Chart library (for future statistics feature)
- **class-variance-authority**: Type-safe component variants
- **tailwind-merge & clsx**: Conditional CSS class merging utility
- **tw-animate-css**: Animation utilities for Tailwind

### Developer Tools
- **ESLint**: Code linting with React-specific plugins
- **TypeScript ESLint**: TypeScript-aware linting rules

## Project Structure

```
combust/
├── public/              # Static assets
│   ├── manifest.json    # PWA manifest
│   ├── site.webmanifest # Web app manifest
│   ├── favicon.ico      # Favicon
│   ├── favicon.svg      # SVG favicon
│   ├── favicon-96x96.png # PNG favicon
│   ├── apple-touch-icon.png # iOS icon
│   ├── icon-192.svg     # PWA icon
│   ├── web-app-manifest-192x192.png # PWA icon 192x192
│   ├── web-app-manifest-512x512.png # PWA icon 512x512
│   └── vite.svg         # Vite logo
├── src/
│   ├── components/
│   │   ├── auth/       # Authentication components
│   │   │   ├── SignIn.tsx   # Sign in form
│   │   │   └── SignUp.tsx   # Sign up form
│   │   ├── ui/         # shadcn/ui component library
│   │   │   ├── alert-dialog.tsx
│   │   │   ├── button.tsx
│   │   │   ├── calendar.tsx
│   │   │   ├── card.tsx
│   │   │   ├── chart.tsx
│   │   │   ├── combobox.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── field.tsx
│   │   │   ├── input-group.tsx
│   │   │   ├── input.tsx
│   │   │   ├── label.tsx
│   │   │   ├── popover.tsx
│   │   │   ├── select.tsx
│   │   │   ├── separator.tsx
│   │   │   ├── table.tsx
│   │   │   ├── tabs.tsx
│   │   │   └── textarea.tsx
│   │   ├── entries.tsx    # Entries management component
│   │   └── statistics.tsx # Statistics dashboard component
│   ├── contexts/
│   │   └── AuthContext.tsx # Authentication context provider
│   ├── lib/
│   │   ├── database.ts     # Shared IndexedDB initialization
│   │   ├── db.ts           # IndexedDB operations for entries
│   │   ├── auth.ts         # Authentication & user management
│   │   ├── useIndexedDB.ts # Custom hook for IndexedDB state
│   │   └── utils.ts        # Utility functions (cn helper)
│   ├── assets/          # Application assets
│   ├── App.tsx          # Main application component
│   ├── main.tsx         # React entry point
│   ├── index.css        # Global styles & Tailwind setup
│   └── data.ts          # Sample data (historical reference)
├── components.json      # shadcn/ui configuration
├── tsconfig.json        # TypeScript configuration
├── vite.config.ts       # Vite configuration (includes PWA plugin)
├── eslint.config.js     # ESLint configuration
└── package.json         # Dependencies and scripts
```
Authentication State**: React Context API (`AuthContext`) for user session management
- **Session Persistence**: localStorage for maintaining user sessions across page reloads
- **Data Source**: IndexedDB with user-specific data isolation
- **Minimal Global State**: Only authentication state in Context; all other data in IndexedDB

### Component Organization
- **UI Components**: Located in `src/components/ui/`, these are shadcn/ui components built on Base UI primitives
- **Custom Components**: Feature-specific components like `entries.tsx` are in `src/components/`
- **Path Aliases**: `@/` points to `src/` directory (configured in both tsconfig.json and vite.config.ts)

### Styling Conventions

1. **User Authentication**:
   - Sign up with email, password, and name
   - Email validation and password strength requirements (min 6 characters)
   - Password confirmation matching
   - Sign in with email and password
   - Password hashing using Web Crypto API (SHA-256)
   - Session persistence using localStorage
   - Sign out functionality
   - User-specific data isolation (each user only sees their own entries)
   - Auto-login on page reload if session exists

2 Use the `cn()` utility from `@/lib/utils` for conditional className merging
- Components use `class-variance-authority` (cva) for type-safe variants
- CSS variables are defined in `index.css` with light/dark theme support
- All colors use OKLCH format for better color consistency across themes

### State Management
- **Local State**: Uses React's `useState` hook
   - User-specific entries (only shows logged-in user's data)
- **Persistent Storage**: IndexedDB via custom `useIndexedDBEntries` hook
- **Data Source**: IndexedDB with automatic seeding from `data.ts` on first load
- **No Global State**: No Redux, Zustand, or Context API (IndexedDB serves as source of truth)

### Form Handling
- Uses native HTML form with `FormData` API
- Controlled components for inputs (date, station selection)
- Form validation via HTML5 attributes (required, min, step, etc.)

## Current Features

### Implemented
1. **Fuel Entry Form**: Add new fuel entries with:
   - Date picker (using Popover + Calendar)
   - Fuel filled input (liters, decimal values)
   - Amount paid input (INR currency, decimal values)
   - Odometer reading input (kilometers, decimal values)
   - Fuel station selection (datalist with autocomplete)

2. **Dynamic Station Management**: 
   - Auto-suggest fuel stations from existing entries
   - Accept custom/new fuel station names
   - Station list dynamically updates as entries are added

3. **Entry Management**: 
   - Table view (desktop) and card view (mobile) of all fuel entries
   - Shows date, fuel, amount, odometer, and station
   - Edit existing entries via dialog modal
   - Delete entries with confirmation
   - Reorder entries (move up/down arrows)
   - Entries displayed in reverse chronological order (newest first)

4. **Statistics Dashboard**:
   - Six metric cards: Total Spent, Total Distance, Avg Fuel Efficiency, Avg Cost/km, Total Fuel, Avg Price/Liter
   - Filter statistics by fuel station or view all
   - Four charts: Spending Over Time, Fuel Efficiency Trend, Spending by Station, Efficiency by Station
   - Proper fuel efficiency calculations: (next_odometer - current_odometer) / next_fuelFilled
   - Responsive chart layouts with proper sizing and margins

5. **User data and fuel entries in separate object stores
   - User sessions persist in localStorage
   - Each user has isolated data storage
   - Export data as CSV file
   - Import data from CSV or JSON files
   - Import data by pasting CSV text directly into textarea
   - Replace all entries when importing

6. **Progressive Web App (PWA)**:
   - Installable on mobile authentication and data fetch
   - Mobile-responsive card view for entries
   - Dedicated authentication screens (Sign In / Sign Up)
   - User name display in header
   - Sign out button in header per user
2. **Advanced Filtering**: Filter entries by date range, station, etc.
3. **Data Export Options**: Export to additional formats (Excel, PDF)
4. **Fuel Price Tracking**: Track price-per-liter trends over time
5. **Anomaly Detection**: Alert on unusual fuel efficiency or prices
6. **Cloud Sync**: Backend integration for cross-device sync
7. **Password Reset**: Email-based password recovery
8. **Profile Management**: Edit user profile, change password
9. **Data Sharing**: Export/import data between users
10. **Remember Me**: Optional persistent login option
   - Starts with empty database (users add their own data)
   - Custom React hook (`useIndexedDBEntries`) for database operations

8. **UI/UX**:
  userId: number;         // Foreign key to users table
  date: string;           // Format: 'YYYY/MM/DD'
  amountPaid: number;     // In INR (Indian Rupees)
  odometerReading: number; // In kilometers
  fuelFilled: number;     // In liters
  fuelStation: string;    // Station name
}
```

### User Type
```typescript
{
  id?: number;            // Auto-generated by IndexedDB
  email: string;          // Unique email address
  passwordHash: string;   // SHA-256 hashed password
  name: string;           // User's display name
  createdAt: string;      // ISO timestamp of account creation
}
```

### IndexedDB Schemahistorical reference data. The app no longer auto-seeds data - users create their own entries after signing up
- **Database Name**: `CombustDB`
- **Version**: 2
- **Object Stores**: 
  - Shared Database Initialization (`src/lib/database.ts`)
Centralized database initialization that creates all object stores:
- **`openDB()`**: Opens or creates CombustDB with version 2 schema
- **`STORES`**: Object containing store names (`ENTRIES`, `USERS`)
- Creates both `entries` and `users` object stores with proper indexes
- Handles database upgrades from version 1 to 2

### Entry Database Utilities (`src/lib/db.ts`)
Custom IndexedDB wrapper for fuel entries:
- **`getAllEntries(userId)`**: Retrieves all fuel entries for a specific user
- **`addEntry(entry)`**: Adds a new entry (must include userId)
- **`updateEntry(entry)`**: Updates an existing entry by ID
- **`deleteEntry(id)`**: Deletes an entry by ID
- **`clearAllEntries(userId)`**: Removes all entries for a specific user
- **`bulkAddEntries(entries[])`**: Adds multiple entries at once
- **`replaceAllEntries(userId, entries[])`**: Clears user's entries and adds new ones (import)

### Authentication Utilities (`sruser's entries
  isLoading,         // Boolean loading state
  addEntry,          // Add new entry (auto-adds userId)
  updateEntry,       // Update existing entry
  deleteEntry,       // Delete entry by ID
  replaceAllEntries, // Replace all user entries (import)
  moveEntry,         // Reorder entries (in-memory only)
  clearAllEntries    // Delete all user entries
} = useIndexedDBEntries(userId);
```

**Key Behaviors:**
- Takes `userId` as parameter for data isolation
- Automatically loads user's entries from IndexedDB on mount
- All CRUD operations automatically sync with IndexedDB
- Automatically associates new entries with current user
- Provides loading state for better UX
- moveEntry is in-memory only (not persisted to DB)

### Authentication Context (`src/contexts/AuthContext.tsx`)
React Context for managing authentication state:

```typescript
const {
  user,              // Current user object or null
  isLoading,         // Boolean loading state during session check
  signIn,            // Function to sign in user
  signOut            // Function to sign out user
} = useAuth();
```

**Key Behaviors:**
- Provides user session state across entire app
- Automatically restores session from localStorage on app load
- Persists session to localStorage on sign in
- Clears session from localStorage on sign out
- Must wrap app with `<AuthProvider>` in main.tsx
{
  id?: number;            // Auto-generated by IndexedDB
  date: string;           // Format: 'YYYY/MM/DD'
  amountPaid: number;     // In INR (Indian Rupees)
  odometerReading: number; // In kilometers
  fuelFilled: number;     // In liters
  fuelStation: string;    // Station name
}
```

### IndexedDB Schema
- **Database Name**: `CombustDB`
- **Version**: 1
- **Object Store**: `entries`
- **Key Path**: `id` (auto-increment)
- **Indexes**: 
  - `date` (non-unique)
  - `fuelStation` (non-unique)

### Example Data
See `src/data.ts` for sample entries used for database seeding. Data contains 14 historical fuel entries from July 2025 to February 2026.

## IndexedDB Operations

### Database Utilities (`src/lib/db.ts`)
The app uses a custom IndexedDB wrapper with the following functions:

- **`openDB()`**: Opens or creates the database with proper schema
- **`getAllEntries()`**: Retrieves all fuel entries
- **`addEntry(entry)`**: Adds a new entry and returns the generated ID
- **`updateEntry(entry)`**: Updates an existing entry by ID
- **`deleteEntry(id)`**: Deletes an entry by ID
- **`clearAllEntries()`**: Removes all entries from the database
- **`bulkAddEntries(entries[])`**: Adds multiple entries at once
- **`replaceAllEntries(entries[])`**: Clears database and adds new entries (used for import)

### Custom Hook (`src/lib/useIndexedDB.ts`)
The `useIndexedDBEntries` hook provides a React-friendly interface to IndexedDB:

```typescript
const {
  entries,           // Array of all entries
  isLoading,         // Boolean loading state
  addEntry,          // Add new entry function
  updateEntry,       // Update existing entry
  deleteEntry,       // Delete entry by ID
  replaceAllEntries, // Replace all entries (import)
  moveEntry          // Reorder entries (in-memory only)
} = useIndexedDBEntries();
```

**Key Behaviors:**
- Automatically loads entries from IndexedDB on mount
- Starts with empty database (no auto-seeding)
- All CRUD operations automatically sync with IndexedDB
- Provides loading state for better UX
- moveEntry is in-memory only (not persisted to DB)

## Progressive Web App (PWA)

### Configuration (`vite.config.ts`)
The app uses `vite-plugin-pwa` with the following settings:

- **Register Type**: `autoUpdate` (automatically updates service worker)
- **Manifest**: Embedded in Vite config and generated at build time
- **Workbox**: Precaches all static assets (JS, CSS, HTML, images)
- **Runtime Caching**: Caches Google Fonts with cache-first strategy

### Service Worker
Generated automatically during build (`npm run build`):
- **File**: `dist/sw.js` (service worker)
- **Workbox**: `dist/workbox-*.js` (Workbox runtime)
- **Registration**: `dist/registerSW.js` (auto-registration script)

### Manifest (`public/manifest.json`)
- **Name**: Combust - Fuel Tracker
- **Theme Color**: #3b82f6 (blue)
- **Display**: standalone (app-like experience)
- **Icons**: Uses vite.svg as placeholder (should be replaced with proper icons)

### Installing the App
Users can install Combust as a PWA:
1. **Desktop**: Click install prompt in browser address bar
2. **Mobile**: Use "Add to Home Screen" from browser menu
3. **Offline**: App works offline after first visit

## Development Guidelines
Backend Integration** (Optional):
   - REST API for cloud sync
   - PostgreSQL or MongoDB for server-side storage
   - JWT-based authentication instead of client-side only
   - Enhanced Authentication**:
   - Email verification on signup
   - Password reset functionality
   - Two-factor authentication
   - OAuth login (Google, Facebook)
   - Remember me functionality
### SUser Profile Management**:
   - Edit profile (name, email)
   - Change password
   - Delete account
   - Profile picture upload configured)
2. Use proper typing for all props and state
3. Avoid `any` type unless absolutely necessary
4. Define interfaces/types for data structures
5. Use React 19's built-in types (@types/react 19.2.5)

### Component Patterns
1. **Buttons**: Use  Enhancements**:
   - Advanced date range filtering
   - Search across all fields
   - Saved filter presets
   
2. **Data Validation**:
   - Strict odometer reading sequence validation
   - Detect anomalies in fuel efficiency
   - Alert on unusual data patterns
   
3. **Multi-vehicle Support**:
   - Add vehicle management per user
   - Track multiple vehicles separately
   - Vehicle-specific statistics

### Low Priority
1. **Social Features**:
   - Share statistics with friends
   - Compare fuel efficiency with other users
   - Leaderboards for fuel efficiency
   
2. **Mobile Native App**: React Native version
3. **Receipt Scanning**: OCR to auto-fill entries
4. **API for Third-party Apps**: Public API for integration
- CRUD operations (addEntry, updateEntry, deleteEntry)
- Bulk operations (replaceAllEntries for import)
- Loading states

To modify database behavior:
1. Update `src/lib/database.ts` if changing database schema or adding/removing stores
2. Update `src/lib/db.ts` for entry-related IndexedDB operations
3. Update `src/lib/auth.ts` for user-related operations
4. Update `src/lib/useIndexedDB.ts` for React hook interface
5. Ensure all state changes call the appropriate database function
6. Remember to increment DB_VERSION in `database.ts` for schema changes
- Always pass `userId` to `useIndexedDBEntries(userId)`
- New entries automatically get userId attached
- Queries are automatically filtered by userId

### e kebab-case for file names (button.tsx, input-group.tsx)
- Use PascalCase for component names (Button, InputGroup)
- Use camelCase for utility functions and variables

## Commands

### Development
```bash
npm run dev          # Start Vite dev server on http://localhost:5173
npm run build        # Build for production (TypeScript check + Vite build)
npm run preview      # Preview production build
npm run lint         # Run ESLint
```

## Configuration Files

### components.json
- shadcn/ui configuration
- Style: base-vega
- Icon library: hugeicons
- Base color: zinc
- Uses CSS variables for theming
- No RSC (React Server Components) - this is a client-side app

### vite.config.ts
- Vite configuration with React plugin
- Tailwind CSS Vite plugin enabled
- Path alias `@` → `./src`

### tsconfig.json
- TypeScript project references (app and node configs)
- Path mapping for `@/*` imports

## Future Development Considerations

### High Priority Features to Implement
1. **Persistent Storage**: 
   - IndexedDB or localStorage for client-side persistence
   - Or backend API with database (PostgreSQL, MongoDB)
   
2. **Statistics Dashboard**:
   - Fuel efficiency (km/liter) calculations
   - Cost per kilometer
   - Monthly/yearly spending charts using recharts
   - Fuel price trends
   
3. **Entry Management**:
   - Edit existing entries
   - Delete entries with confirmation
   - Sort and filter entries

4. **CSV Import/Export**:
   - Implement upload button functionality
   - Implement download button to export data as CSV
9. **"Object store not found" error**: Clear IndexedDB and reload (database schema may have partially initialized)
10. **User can't sign in**: Check browser console for errors; may need to clear localStorage and IndexedDB
11. **Authentication not persisting**: Verify localStorage is enabled in browser settings
12. **Seeing another user's data**: This should never happen - report as critical bug if encountered
   - Data validation on import

### Medium Priority
1. **Search & Filter**:
   - Filter by date range
   - Filter by fuel station
   - Search functionality
   
2. **Data Validation**:
   - Validate odometer reading increases
   - Detect anomalies in fuel efficiency
   
3. **Multi-vehicle Support**:
   - Add vehicle management
   - Track multiple vehicles separately

### Low Priority
1. **User Authentication**: If making it multi-user
2. **Sync Across Devices**: Cloud storage integration
3. **Mobile App**: React Native or PWA
4. **Receipt Scanning**: OCR to auto-fill entries

## Common Tasks for AI Agents

### Adding a New UI Component from shadcn
```bash
npx shadcn@latest add [component-name]
```
This will automatically add the component to `src/components/ui/` with proper configuration.

### Working with IndexedDB (Already Implemented)
The app uses a custom `useIndexedDBEntries` hook that provides:
- Automatic loading and persistence
- CRUD operations (addEntry, updateEntry, deleteEntry)
- Bulk operations (replaceAllEntries for import)
- Loading states

To modify database behavior:
1. Update `src/lib/db.ts` for low-level IndexedDB operations
2. Update `src/lib/useIndexedDB.ts` for React hook interface
3. Ensure all state changes call the appropriate database function

### Implementing Statistics (Already Implemented)
The Statistics tab includes:
- Six metric cards with calculations
- Four responsive charts (line and bar charts)
- Fuel efficiency calculation formula: `(nextOdometer - currentOdometer) / nextFuelFilled`
- Station-based filtering for all metrics

To add new statistics:
1. Calculate metrics in `useMemo` hooks in `statistics.tsx`
2. Add new CaProper app icons configured (favicon, apple-touch-icon, PWA manifests)

### Security Considerations
- **Client-side Auth**: Currently uses client-side authentication only
- **Password Storage**: Passwords hashed with SHA-256 (better than plaintext, but not bcrypt)
- **Session Storage**: Sessions stored in localStorage (accessible to JavaScript)
- **XSS Protection**: Ensure9, 2026
**Project Version**: 0.0.0 (initial development)
**Status**: PWA with user authentication and IndexedDB persistence fully implemented
**Authentication**: Client-side authentication with password hashing and session management
**Data Storage**: User-specific data isolation in IndexedDB
**Maintainer**: Refer to package.json for author information

## Security & Privacy Notes

### Current Implementation
- **Authentication**: Client-side only (no backend server)
- **Password Hashing**: SHA-256 via Web Crypto API
- **Session Management**: localStorage with userId storage
- **Data Storage**: All data in browser's IndexedDB (local only)
- **Data Isolation**: Each user's entries filtered by userId
- **No Cloud Sync**: All data remains on the local device

### Important Limitations
1. **No Password Recovery**: If user forgets password, data is inaccessible
2. **Device-Specific**: Data doesn't sync across devices
3. **Browser Clearing**: Clearing browser data will delete all user accounts and entries
4. **Shared Devices**: Multiple users can create accounts on same browser
5. **No Email Verification**: Accounts created without email validation
6. **Client-Side Security**: Auth implementation is not suitable for sensitive data

### Recommendations for Production
Consider implementing:
- Backend authentication server with proper password hashing (bcrypt/argon2)
- JWT token-based sessions instead of localStorage
- Email verification on signup
- Password reset via email
- Cloud database for data backup and sync
- HTTPS enforcement
- Rate limiting on authentication attempts
- Session timeout and refresh tokensChart, etc.)

### Adding New Features
Examples of potential additions:
- **Price Alerts**: Track fuel price changes over time
- **Budget Tracking**: Set monthly fuel budgets
- **Trip Tracking**: Associate entries with specific trips
- **Vehicle Profiles**: Support multiple vehicles with different characteristics

## Important Notes

### Currency & Units
- Currency is hardcoded to INR (Indian Rupees)
- Fuel volume in liters
- Distance in kilometers
- Date format: YYYY/MM/DD (consistent with local Indian format)

### Accessibility
- ARIA labels are used on icon buttons
- Proper semantic HTML (header, main, section)
- Form fields have associated labels
- Keyboard navigation supported by Base UI components

### Performance
- Small dataset currently (14 entries) so no pagination needed
- Consider virtualization if entries exceed 100-200 items
- React.StrictMode enabled for development checks

### Browser Support
- Modern browsers only (ES2020+ features)
- Uses CSS features like custom properties and OKLCH colors
- No IE11 support needed

## Troubleshooting

### Common Issues
1. **Import errors**: Ensure `@/` alias is working in both TypeScript and Vite
2. **Tailwind classes not working**: Check that `@import "tailwindcss"` is first in index.css
3. **Component styling issues**: Verify theme variables are defined in both light and dark modes
4. **Date picker not showing**: Ensure Popover is properly positioned with `align` prop
5. **IndexedDB not persisting**: Check browser console for quota errors or private browsing mode
6. **Service worker not updating**: Clear browser cache and unregister old service worker from DevTools
7. **PWA not installing**: Ensure HTTPS is enabled (or using localhost for development)
8. **Data lost after import**: Verify import file format matches expected CSV/JSON structure

### Development Tips
- Use React DevTools to inspect component state
- Check browser console for TypeScript errors (Vite shows them in overlay)
- Hot Module Replacement (HMR) is enabled - changes reflect immediately
- If styles are broken, clear Vite cache: `rm -rf node_modules/.vite`
- Use Chrome DevTools > Application tab to inspect IndexedDB data
- Use Chrome DevTools > Application > Service Workers to debug PWA

## Code Style Preferences

### Component Structure
```tsx
// 1. Imports (organized: external, internal, types)
// 2. Types/Interfaces (if component-specific)
// 3. Component function
// 4. Event handlers
// 5. Render helpers (if any)
// 6. Return JSX
// 7. Exports
```

### State Updates
- Use functional updates when new state depends on old state: `setState(prev => ...)`
- Keep state close to where it's used
- Lift state up only when needed

### Props
- Destructure props in function signature
- Use default values in destructuring when appropriate
- Spread remaining props when wrapping primitives

## Testing (Not Yet Implemented)

When implementing tests in the future:
- Use Vitest (Vite's test framework)
- React Testing Library for component tests
- Test user interactions (form submissions, button clicks)
- Test state updates and data transformations
- Mock date picker and calendar components

## Deployment

The project can be deployed to:
- **Vercel**: Zero-config deployment (recommended for Vite)
- **Netlify**: Similar zero-config support
- **GitHub Pages**: Requires base path configuration in vite.config.ts
- **Any static host**: Just upload the `dist/` folder after `npm run build`

### PWA Deployment Considerations
- **HTTPS Required**: PWAs require HTTPS in production (automatic on Vercel/Netlify)
- **Service Worker Scope**: Deployed at root path by default
- **Cache Strategy**: Workbox precaches all assets on first visit
- **Updates**: Service worker auto-updates when new version is deployed
- **Icons**: Replace vite.svg with proper app icons (192x192 and 512x512 PNG)

Remember to set appropriate environment variables if adding backend integration.

---

**Last Updated**: February 18, 2026
**Project Version**: 0.0.0 (initial development)
**Status**: PWA with IndexedDB persistence fully implemented
**Maintainer**: Refer to package.json for author information
