import { task } from '@trigger.dev/sdk/v3'

export const healthCheck = task({
  id: 'health-check',
  run: async () => {
    console.log('LEARN-X Trigger.dev health check ✓')
    return { status: 'ok', timestamp: new Date().toISOString() }
  },
})
