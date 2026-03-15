module.exports = {
  // Run lint across workspace (turbo doesn't accept file paths)
  '*.{ts,tsx}': () => 'pnpm lint',
  '*.{ts,tsx,json,md,yaml}': 'prettier --write',
}
