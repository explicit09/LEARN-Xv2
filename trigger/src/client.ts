import { TriggerClient } from '@trigger.dev/sdk'

export const client = new TriggerClient({
  id: 'learn-x',
  apiKey: process.env.TRIGGER_SECRET_KEY!,
})
