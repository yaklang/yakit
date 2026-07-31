import { describe, it, expect } from 'vitest'
import { isToolStdoutStream, isToolStderrStream, isToolExecStream } from '../utils'

describe('stream node id helpers', () => {
  it('B6: stdout / stderr / exec', () => {
    expect(isToolStdoutStream('tool-foo-stdout')).toBe(true)
    expect(isToolStdoutStream('tool-foo-stderr')).toBe(false)
    expect(isToolStdoutStream('')).toBe(false)

    expect(isToolStderrStream('tool-foo-stderr')).toBe(true)
    expect(isToolStderrStream('tool-foo-stdout')).toBe(false)

    expect(isToolExecStream('call-tools')).toBe(true)
    expect(isToolExecStream('tool-x-stdout')).toBe(true)
    expect(isToolExecStream('other')).toBe(false)
  })
})
