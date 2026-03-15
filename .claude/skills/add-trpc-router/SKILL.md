---
name: add-trpc-router
description: Add a new tRPC router following LEARN-X API conventions
---

Steps to add a new tRPC router:

1. Add Zod schemas to `packages/validators/src/{entity}.ts`
   - Input schema: `create{Entity}InputSchema`, `update{Entity}InputSchema`
   - Output schema: `{entity}Schema`
   - Export from `packages/validators/src/index.ts`

2. Infer TypeScript types in `packages/types/src/index.ts`
   - `export type {Entity} = z.infer<typeof {entity}Schema>`
   - Never hand-write types that duplicate a Zod schema

3. Create `apps/web/src/server/routers/{entity}.ts`
   - Use `protectedProcedure` for all authenticated operations
   - Use `publicProcedure` only for unauthenticated endpoints (rare)
   - All inputs validated against schemas from `@learn-x/validators`
   - Return the created/updated entity from mutations
   - List queries support cursor pagination

4. Add to `apps/web/src/server/routers/_app.ts`:
   ```typescript
   import { {entity}Router } from './{entity}'
   export const appRouter = router({ ..., {entity}: {entity}Router })
   ```

5. Add contract tests in `apps/web/src/server/routers/__tests__/{entity}.contract.test.ts`
   - Test unauthenticated rejection
   - Test invalid input rejection
   - Test output shape
   - Test ownership enforcement (403 for wrong user)

See `docs/05-api-design.md` for all procedure patterns and error codes.
