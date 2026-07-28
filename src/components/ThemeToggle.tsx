import { useEffect, useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Sun03Icon, Moon02Icon } from '@hugeicons/core-free-icons';
import { Button } from './ui/button';

const THEME_KEY = 'combust_theme';

// index.html applies the saved/system preference to <html> before React
// even loads (to avoid a flash of the wrong theme); this component just
// reads what's already there and lets the user override it.
function isDarkApplied(): boolean {
  return document.documentElement.classList.contains('dark');
}

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(isDarkApplied);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light');
  }, [isDark]);

  return (
    <Button
      variant='outline'
      size='sm'
      className='gap-2'
      onClick={() => setIsDark((prev) => !prev)}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <HugeiconsIcon icon={isDark ? Sun03Icon : Moon02Icon} className='size-4' />
      <span className='hidden sm:inline'>{isDark ? 'Light' : 'Dark'}</span>
    </Button>
  );
}
