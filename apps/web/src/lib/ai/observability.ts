import Langfuse from 'langfuse'

export const langfuse = new Langfuse({
  publicKey: process.env.LANGFUSE_PUBLIC_KEY ?? '',
  secretKey: process.env.LANGFUSE_SECRET_KEY ?? '',
  baseUrl: process.env.LANGFUSE_HOST ?? 'https://cloud.langfuse.com',
  // Flush on each request in serverless environments
  flushAt: 1,
  flushInterval: 0,
})

// Prompts directory — populated in Phase 1D when lesson generation is built
// All prompts live in apps/web/src/lib/ai/prompts/ as versioned .ts files
// e.g. prompts/lesson-generation.v1.ts
