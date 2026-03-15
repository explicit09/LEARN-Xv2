import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    // Exclude contract tests from unit test run — they require supabase start
    exclude: ['**/*.contract.test.ts', '**/node_modules/**'],
    // No unit tests in apps/web yet (Phase 0) — don't fail if no files found
    passWithNoTests: true,
  },
})
