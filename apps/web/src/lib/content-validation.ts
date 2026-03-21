/**
 * Content validation utilities for lesson markdown rendering.
 * Ported from LEARN-X V1's contentValidation.ts.
 */

/**
 * Validates and sanitizes content for markdown rendering.
 * Handles object inputs, strips control characters, normalizes LaTeX delimiters.
 */
export function validateAndSanitizeContent(
  content: string | Record<string, unknown> | null | undefined,
): string {
  let str = ''

  if (content === null || content === undefined) {
    return ''
  } else if (typeof content === 'string') {
    str = content
  } else if (typeof content === 'object') {
    if ('content' in content && typeof content.content === 'string') {
      str = content.content
    } else if ('text' in content && typeof content.text === 'string') {
      str = content.text
    } else if ('markdown' in content && typeof content.markdown === 'string') {
      str = content.markdown
    } else {
      str = JSON.stringify(content)
    }
  } else {
    str = String(content)
  }

  // Strip control characters and null bytes
  // eslint-disable-next-line no-control-regex
  str = str.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, '').trim()

  // Normalize LaTeX delimiters: \[...\] → $$...$$ and \(...\) → $...$
  str = str.replace(/\\\[([\s\S]*?)\\\]/g, '$$$$1$$')
  str = str.replace(/\\\(([\s\S]*?)\\\)/g, '$$$1$')

  // Truncate extremely large content
  if (str.length > 100000) {
    str = str.substring(0, 100000) + '\n\n...(content truncated)'
  }

  return str
}

/**
 * Detects problematic content patterns like [object Object].
 */
export function isProblematicContent(content: string): boolean {
  return /\[object (Object|Array)\]/gi.test(content)
}
