---
name: add-migration
description: Add a new Supabase database migration following LEARN-X conventions
---

Follow these steps to add a database migration:

1. Create a new file in `supabase/migrations/` named `{timestamp}_{description}.sql`
   - Get timestamp via: `date +%Y%m%d%H%M%S`
   - Use snake_case description: e.g. `20260314120000_add_study_plans_table.sql`

2. Write the SQL migration. Requirements:
   - Every `CREATE TABLE` must have explicit `ON DELETE` on all foreign keys
   - Every table with `user_id` or `workspace_id` needs RLS enabled + policy
   - Every new table needs an index on its primary lookup column
   - Vector columns use `vector(3072)` — do not change dimensions
   - HNSW index (not IVFFlat) for any new embedding columns

3. Update `apps/web/src/server/db/schema.ts` to mirror the migration exactly

4. Run `supabase db reset` to verify migration applies cleanly

5. Run `pnpm test:integration` to verify RLS and RPC functions still pass

6. Run `pnpm db:verify-migration` to check no rows dropped, HNSW index intact

Never edit schema directly in the Supabase dashboard.
See `docs/03-database.md` for full schema and RLS patterns.
