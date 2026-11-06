import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { fuzzerTablePreview, type FuzzerPreviewMemory } from '../fuzzerTablePreview'

const header = 'HTTP/1.1 200 OK\r\n\r\n'
const responseChunk = (isFinal = false) => ({ Direction: 2, IsFinal: isFinal })

describe('fuzzer table quick preview', () => {
  it('keeps a normal response as-is and does not replay', () => {
    const seen = fuzzerTablePreview({
      uuid: 'row-1',
      chunks: [],
      showingResponse: true,
      responseText: header + 'body',
      memory: { header: '' },
    })
    expect(seen.responseText).toBe(header + 'body')
    expect(seen.resetKey).toBeUndefined()
  })

  it('ignores request chunks', () => {
    const seen = fuzzerTablePreview({
      uuid: 'row-1',
      chunks: [{ Direction: 1, IsFinal: false }],
      showingResponse: true,
      responseText: header + 'body',
      memory: { header: '' },
    })
    expect(seen.resetKey).toBeUndefined()
    expect(seen.responseText).toBe(header + 'body')
  })

  it('replays when the stored header arrives, and still replays after the bytes are cleared', () => {
    const memory: FuzzerPreviewMemory = { header: '' }
    const waiting = fuzzerTablePreview({
      uuid: 'row-1',
      chunks: [responseChunk()],
      showingResponse: true,
      responseText: '',
      memory,
    })
    expect(waiting.responseText).toBe('')
    expect(waiting.resetKey).toBe('')

    const hydrated = fuzzerTablePreview({
      uuid: 'row-1',
      chunks: [responseChunk()],
      showingResponse: true,
      responseText: header,
      memory: waiting.memory,
    })
    expect(hydrated.responseText).toBe(header)
    expect(hydrated.resetKey).toBe(header)

    const hidden = fuzzerTablePreview({
      uuid: 'row-1',
      chunks: [responseChunk()],
      showingResponse: true,
      responseText: '',
      memory: hydrated.memory,
    })
    expect(hidden.responseText).toBe(header)
    expect(hidden.resetKey).toBe(header)
  })

  it('does not replay onto the request view, but still remembers the header', () => {
    const seen = fuzzerTablePreview({
      uuid: 'row-1',
      chunks: [responseChunk()],
      showingResponse: false,
      responseText: header,
      memory: { header: '' },
    })
    expect(seen.resetKey).toBeUndefined()
    expect(seen.memory.header).toBe(header)
  })

  it('stops replaying after the last chunk, and forgets the header when the row changes', () => {
    const done = fuzzerTablePreview({
      uuid: 'row-1',
      chunks: [
        { ...responseChunk(false), text: 'hello' },
        { ...responseChunk(true), text: ' world' },
      ],
      showingResponse: true,
      responseText: header,
      memory: { uuid: 'row-1', header },
    })
    expect(done.resetKey).toBeUndefined()
    expect(done.responseText).toBe(header + 'hello world')

    const hidden = fuzzerTablePreview({
      uuid: 'row-1',
      chunks: [
        { ...responseChunk(false), text: 'hello' },
        { ...responseChunk(true), text: ' world' },
      ],
      showingResponse: true,
      responseText: '',
      memory: done.memory,
    })
    expect(hidden.resetKey).toBeUndefined()
    expect(hidden.responseText).toBe(header + 'hello world')

    const fullBody = fuzzerTablePreview({
      uuid: 'row-1',
      chunks: [{ ...responseChunk(true), text: ' world' }],
      showingResponse: true,
      responseText: header + 'already complete',
      memory: { uuid: 'row-1', header },
    })
    expect(fullBody.responseText).toBe(header + 'already complete')

    // 流已结束才首次选中：memory 为空，库里已是完整 H+B，不能再拼 chunk 里的 B
    const firstOpenDone = fuzzerTablePreview({
      uuid: 'row-1',
      chunks: [
        { ...responseChunk(false), text: 'hello' },
        { ...responseChunk(true), text: ' world' },
      ],
      showingResponse: true,
      responseText: header + 'hello world',
      memory: { header: '' },
    })
    expect(firstOpenDone.responseText).toBe(header + 'hello world')

    // 流已结束才首次选中：库里只有头，仍要把 chunk 正文拼回去
    const firstOpenHeaderOnly = fuzzerTablePreview({
      uuid: 'row-1',
      chunks: [
        { ...responseChunk(false), text: 'hello' },
        { ...responseChunk(true), text: ' world' },
      ],
      showingResponse: true,
      responseText: header,
      memory: { header: '' },
    })
    expect(firstOpenHeaderOnly.responseText).toBe(header + 'hello world')

    const truncated = fuzzerTablePreview({
      uuid: 'row-1',
      chunks: [{ ...responseChunk(true), text: 'tail-only' }],
      showingResponse: true,
      responseText: header,
      memory: { uuid: 'row-1', header },
      truncated: true,
    })
    expect(truncated.responseText).toBe(header)
    expect(truncated.resetKey).toBe(header)

    const nextRow = fuzzerTablePreview({
      uuid: 'row-2',
      chunks: [responseChunk()],
      showingResponse: true,
      responseText: '',
      memory: done.memory,
    })
    expect(nextRow.memory.header).toBe('')
    expect(nextRow.memory.uuid).toBe('row-2')
  })

  it('quick preview passes that reset key into the chunk scroller', () => {
    const source = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../HTTPFuzzerPageTable.tsx'), 'utf8')
    expect(source).toContain('resetKey: preview.resetKey')
    expect(source).toContain('preview.responseText')
  })
})
