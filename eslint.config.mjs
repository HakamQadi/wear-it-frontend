import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts']),
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      // Every page here renders on the client and authenticates with a bearer token held
      // in localStorage, so there is no server-component path for loading data: fetching
      // on mount inside an effect and storing the result in state is the intended pattern.
      'react-hooks/set-state-in-effect': 'off',
    },
  },
]);
