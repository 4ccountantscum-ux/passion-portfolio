// @ts-check
import { defineConfig } from 'astro/config';

// https://docs.astro.build/en/reference/configuration-reference/
export default defineConfig({
  // Fail the build (instead of warning) when two entries share an id
  // or two pages would be generated at the same URL.
  prerenderConflictBehavior: 'error',
});
