import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  // `app/` is the separate Expo project — it has its own eslint.config.js
  // (eslint-config-expo) and its own `lint` script (`expo lint`). Without
  // this ignore, `npm run lint` here silently also lints Expo/React Native
  // files against Vite-project rules that don't apply to them.
  globalIgnores(['dist', 'app']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      'react-refresh/only-export-components': 'off',
    }
  },
])
