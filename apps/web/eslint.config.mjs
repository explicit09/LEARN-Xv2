// @ts-check
import nextPlugin from 'eslint-config-next/core-web-vitals'

export default Array.isArray(nextPlugin) ? nextPlugin : [nextPlugin]
