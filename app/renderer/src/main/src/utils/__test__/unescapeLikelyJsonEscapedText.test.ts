import { describe, expect, it } from 'vitest'
import { unescapeLikelyJsonEscapedText } from '../unescapeLikelyJsonEscapedText'

describe('unescapeLikelyJsonEscapedText', () => {
  it('parses a JSON-wrapped string payload', () => {
    expect(unescapeLikelyJsonEscapedText('"foo\\nbar\\tbaz"')).toBe('foo\nbar\tbaz')
  })

  it('keeps already-multiline source unchanged', () => {
    const src = 'desc("a\\nb")\nnext line'
    expect(unescapeLikelyJsonEscapedText(src)).toBe(src)
  })

  it('preserves a single literal backslash-n in one-line source', () => {
    const src = 'desc("a\\nb")'
    expect(unescapeLikelyJsonEscapedText(src)).toBe(src)
  })

  it('unescapes a one-line model dump with multiple escaped newlines', () => {
    expect(unescapeLikelyJsonEscapedText('rule x {\\n  a\\n}')).toBe('rule x {\n  a\n}')
  })

  it('returns empty and plain text as-is', () => {
    expect(unescapeLikelyJsonEscapedText('')).toBe('')
    expect(unescapeLikelyJsonEscapedText('plain')).toBe('plain')
  })
})
