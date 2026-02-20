# Combust - Fuel Tracker PWA

A Progressive Web App for tracking vehicle fuel consumption, expenses, and efficiency. Built with React, TypeScript, and IndexedDB for offline-first data persistence.

## Features

- 📱 **Progressive Web App** - Install on mobile and desktop, works offline
- 💾 **Persistent Storage** - All data stored locally in IndexedDB
- 📊 **Statistics Dashboard** - Fuel efficiency, spending trends, and station comparisons
- 📈 **Visual Charts** - Interactive charts for spending and efficiency trends
- 📂 **Import/Export** - CSV and JSON file support, plus paste CSV data directly
- ✏️ **Full CRUD** - Add, edit, delete, and reorder fuel entries
- 📱 **Responsive Design** - Mobile-first with card and table views

## Tech Stack

- **React 19** with TypeScript
- **Vite** for fast builds
- **Tailwind CSS 4** for styling
- **shadcn/ui** component library
- **IndexedDB** for data persistence
- **Recharts** for data visualization
- **Workbox** for service worker

## Getting Started

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) to view the app.

### Build

```bash
npm run build
```

Outputs to `dist/` directory with service worker and PWA manifest.

### Preview Production Build

```bash
npm run preview
```

## Project Structure

```
src/
├── components/
│   ├── ui/           # shadcn/ui components
│   ├── entries.tsx   # Entry management
│   └── statistics.tsx # Statistics dashboard
├── lib/
│   ├── db.ts         # IndexedDB operations
│   └── useIndexedDB.ts # React hook for database
├── App.tsx           # Main app component
└── data.ts           # Sample data for seeding
```

## Usage

### Adding Entries

1. Navigate to the **Entries** tab
2. Fill in the form with date, fuel amount, cost, odometer, and station
3. Click **Add Entry** to save

### Viewing Statistics

1. Navigate to the **Statistics** tab
2. View overall metrics or filter by station
3. Explore charts for trends and comparisons

### Import/Export

- **Export**: Click the Export button to download data as CSV
- **Import**: Click Import to:
  - Upload CSV or JSON files, or
  - Paste CSV data directly into the textarea

## Supabase Backend

This app uses Supabase for authentication and cloud data storage, with IndexedDB as a local cache for offline support.

### Environment Variables

Create a `.env` file with your Supabase credentials:

```bash
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### Row Level Security (RLS)

**IMPORTANT:** The following RLS policies must be enabled in your Supabase dashboard for security:

#### `fuel_entries` table:
```sql
-- Enable RLS
ALTER TABLE fuel_entries ENABLE ROW LEVEL SECURITY;

-- Users can only read their own entries
CREATE POLICY "Users can view own entries" ON fuel_entries
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own entries
CREATE POLICY "Users can insert own entries" ON fuel_entries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own entries
CREATE POLICY "Users can update own entries" ON fuel_entries
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own entries (soft delete)
CREATE POLICY "Users can delete own entries" ON fuel_entries
  FOR DELETE USING (auth.uid() = user_id);
```

### Sync Strategy

- **Online-first**: When online, reads/writes go to Supabase first, then sync to IndexedDB
- **Offline fallback**: If Supabase is unreachable, operations fall back to IndexedDB and queue for sync
- **On reconnect**: Queued operations are processed and remote changes are pulled

## Deployment

Deploy to any static hosting service:

- **Vercel** (recommended)
- **Netlify**
- **GitHub Pages**
- Any static file host

HTTPS is required for PWA features in production.

## Documentation

See [copilot-instructions.md](./copilot-instructions.md) for comprehensive project documentation.

## License

MIT
