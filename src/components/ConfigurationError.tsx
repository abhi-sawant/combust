import { HugeiconsIcon } from '@hugeicons/react';
import { Alert02Icon, FuelStationIcon } from '@hugeicons/core-free-icons';

type ConfigurationErrorProps = {
  missingVars: string[];
};

// Rendered instead of the app when required env vars are absent, so a bad
// deploy shows a clear message instead of a blank page. main.tsx checks for
// this case before it ever imports App.tsx (and, transitively,
// lib/supabaseClient.ts, which throws at module scope if these are unset) —
// an error boundary can't help here since that throw happens during static
// import resolution, before React starts rendering anything.
export function ConfigurationError({ missingVars }: ConfigurationErrorProps) {
  return (
    <div className='min-h-screen flex items-center justify-center bg-background p-4'>
      <div className='w-full max-w-md rounded-xl border bg-card p-8 space-y-5 text-center'>
        <div className='flex justify-center'>
          <div className='flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10'>
            <HugeiconsIcon icon={Alert02Icon} className='size-8 text-destructive' strokeWidth={2} />
          </div>
        </div>
        <div className='space-y-2'>
          <h1 className='text-xl font-semibold'>Combust isn't configured yet</h1>
          <p className='text-sm text-muted-foreground'>
            This deploy is missing the Supabase environment variables it needs to run:
          </p>
        </div>
        <ul className='space-y-1.5 text-left'>
          {missingVars.map((name) => (
            <li key={name} className='rounded-md bg-muted/50 px-3 py-2 font-mono text-sm'>
              {name}
            </li>
          ))}
        </ul>
        <p className='text-xs text-muted-foreground'>
          Set these in your <span className='font-mono'>.env</span> file (or your host's environment
          variable settings) and rebuild.
        </p>
        <div className='flex justify-center pt-1 text-muted-foreground/60'>
          <HugeiconsIcon icon={FuelStationIcon} className='size-4' />
        </div>
      </div>
    </div>
  );
}
