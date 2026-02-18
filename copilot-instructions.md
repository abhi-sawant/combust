# Combust - Project Instructions for AI Agents

## Project Overview

**Combust** is a fuel tracking application for vehicles built with React and TypeScript. It allows users to record and view fuel entries including date, amount paid, fuel filled (liters), odometer reading, and fuel station name. The application is designed for personal vehicle fuel management and mileage tracking.

## Technology Stack

### Core Framework
- **React**: 19.2.0 (latest)
- **TypeScript**: 5.9.3
- **Build Tool**: Vite 7.2.4
- **Package Manager**: npm (though pnpm or yarn can be used)

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
├── src/
│   ├── components/
│   │   ├── ui/         # shadcn/ui component library
│   │   │   ├── button.tsx
│   │   │   ├── calendar.tsx
│   │   │   ├── card.tsx
│   │   │   ├── chart.tsx
│   │   │   ├── combobox.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── field.tsx
│   │   │   ├── input.tsx
│   │   │   ├── label.tsx
│   │   │   ├── popover.tsx
│   │   │   ├── select.tsx
│   │   │   ├── separator.tsx
│   │   │   ├── table.tsx
│   │   │   ├── tabs.tsx
│   │   │   └── textarea.tsx
│   │   └── entries.tsx  # Main entries component
│   ├── lib/
│   │   └── utils.ts     # Utility functions (cn helper)
│   ├── assets/          # Application assets
│   ├── App.tsx          # Main application component
│   ├── main.tsx         # React entry point
│   ├── index.css        # Global styles & Tailwind setup
│   └── data.ts          # Static fuel entry data
├── components.json      # shadcn/ui configuration
├── tsconfig.json        # TypeScript configuration
├── vite.config.ts       # Vite configuration
├── eslint.config.js     # ESLint configuration
└── package.json         # Dependencies and scripts
```

## Key Architectural Patterns

### Component Organization
- **UI Components**: Located in `src/components/ui/`, these are shadcn/ui components built on Base UI primitives
- **Custom Components**: Feature-specific components like `entries.tsx` are in `src/components/`
- **Path Aliases**: `@/` points to `src/` directory (configured in both tsconfig.json and vite.config.ts)

### Styling Conventions
- Use the `cn()` utility from `@/lib/utils` for conditional className merging
- Components use `class-variance-authority` (cva) for type-safe variants
- CSS variables are defined in `index.css` with light/dark theme support
- All colors use OKLCH format for better color consistency across themes

### State Management
- **Local State**: Uses React's `useState` hook
- **No Global State**: Currently no Redux, Zustand, or Context API
- **Data Source**: Static data array in `data.ts` (will need migration to persistent storage)

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
   - Fuel station selection (searchable combobox)

2. **Dynamic Station Management**: 
   - Add new fuel stations via dialog modal
   - Station list dynamically updates when new stations are added
   - Combobox with search/filter functionality

3. **Entry Display**: 
   - Table view of all fuel entries
   - Shows date, fuel, amount, odometer, and station
   - Entries displayed in reverse chronological order (newest first)

4. **UI/UX**:
   - Responsive header with app branding
   - Tab navigation (Entries and Statistics tabs)
   - Upload/Download buttons (UI placeholders, not functional)
   - Clean, accessible design with proper ARIA labels

### Placeholder/Not Implemented
1. **Statistics Tab**: UI exists but content is placeholder
2. **Data Persistence**: Data is in-memory only, resets on page reload
3. **Upload/Download Functionality**: Buttons present but no implementation
4. **Entry Editing/Deletion**: No ability to modify or remove entries
5. **Charts/Analytics**: recharts is installed but not yet used
6. **Fuel Efficiency Calculations**: No mileage/efficiency metrics calculated

## Data Structure

### Fuel Entry Type
```typescript
{
  date: string;           // Format: 'YYYY/MM/DD'
  amountPaid: number;     // In INR (Indian Rupees)
  odometerReading: number; // In kilometers
  fuelFilled: number;     // In liters
  fuelStation: string;    // Station name
}
```

### Example Data
See `src/data.ts` for sample entries. Data contains 14 historical fuel entries from July 2025 to February 2026.

## Development Guidelines

### Adding New Components
1. UI components (shadcn) should go in `src/components/ui/`
2. Feature components should go in `src/components/`
3. Use the shadcn CLI to add new UI components: `npx shadcn@latest add [component]`
4. Always use Base UI primitives as the foundation (this project uses base-vega style)

### Styling Guidelines
1. Use Tailwind utility classes for styling
2. Use `cn()` helper for conditional classes
3. Define color variables in `index.css` using OKLCH format
4. Support both light and dark modes by defining colors in both `:root` and `.dark`
5. Use the predefined semantic color tokens (primary, secondary, muted, accent, destructive, etc.)

### TypeScript Guidelines
1. Enable strict mode (already configured)
2. Use proper typing for all props and state
3. Avoid `any` type unless absolutely necessary
4. Define interfaces/types for data structures
5. Use React 19's built-in types (@types/react 19.2.5)

### Component Patterns
1. **Buttons**: Use variant prop (default, outline, secondary, ghost, destructive, link)
2. **Sizes**: Components support size variants (xs, sm, default, lg, icon)
3. **Forms**: Use Field + FieldLabel for form fields
4. **Modals**: Use Dialog component with DialogContent, DialogHeader, DialogFooter
5. **Date Selection**: Use Popover + Calendar combination
6. **Searchable Selects**: Use Combobox components

### File Naming
- Use kebab-case for file names (button.tsx, input-group.tsx)
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

### Adding Persistent Storage
1. Create a custom hook (e.g., `useLocalStorage.ts` or `useIndexedDB.ts`)
2. Replace the `useState` calls in `entries.tsx` with the persistent hook
3. Add data migration logic for existing entries

### Implementing Statistics
1. Calculate derived metrics in a useMemo hook
2. Use recharts components (BarChart, LineChart, etc.)
3. Display in the Statistics tab content
4. Consider adding date range selectors

### Adding Entry Edit/Delete
1. Add state for editing mode
2. Create edit dialog similar to add station dialog
3. Add edit/delete buttons to table rows
4. Implement confirmation dialog for deletions

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

### Development Tips
- Use React DevTools to inspect component state
- Check browser console for TypeScript errors (Vite shows them in overlay)
- Hot Module Replacement (HMR) is enabled - changes reflect immediately
- If styles are broken, clear Vite cache: `rm -rf node_modules/.vite`

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

Remember to set appropriate environment variables if adding backend integration.

---

**Last Updated**: February 18, 2026
**Project Version**: 0.0.0 (initial development)
**Maintainer**: Refer to package.json for author information
