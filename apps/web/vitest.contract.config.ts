import fs from 'fs'
import { defineConfig } from 'vitest/config'

function loadEnvFile(path: string): Record<string, string> {
  try {
    return Object.fromEntries(
      fs
        .readFileSync(path, 'utf-8')
        .split('\n')
        .filter((l) => l && !l.startsWith('#') && l.includes('='))
        .map((l) => [l.split('=')[0]!.trim(), l.split('=').slice(1).join('=').trim()]),
    )
  } catch {
    return {}
  }
}

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.contract.test.ts'],
    // Contract tests require supabase running — run sequentially
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
    env: loadEnvFile('.env.local'),
  },
})
