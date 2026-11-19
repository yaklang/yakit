import { beforeEach, describe, expect, it } from 'vitest'
import { getEditorViewCache, setEditorViewCache } from '../editorViewCache'

beforeEach(() => localStorage.clear())

describe('editor view cache', () => {
  it('round trips values and removes cleared entries', () => {
    expect(getEditorViewCache('render')).toBe('')
    setEditorViewCache('render', 'beautify')
    expect(getEditorViewCache('render')).toBe('beautify')
    setEditorViewCache('render', '')
    expect(getEditorViewCache('render')).toBe('')
  })

  it('keeps different keys independent', () => {
    setEditorViewCache('request', 'hex')
    setEditorViewCache('response', 'render')
    expect(getEditorViewCache('request')).toBe('hex')
    expect(getEditorViewCache('response')).toBe('render')
  })
})
