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
