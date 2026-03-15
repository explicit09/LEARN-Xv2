import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'

import * as schema from './schema'

const isSupabase = (process.env.DATABASE_URL ?? '').includes('supabase.com')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres',
  ssl: isSupabase ? { rejectUnauthorized: false } : undefined,
})

export const db = drizzle(pool, { schema })

export type DB = typeof db
