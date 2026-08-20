import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ensureContentInMemory } from '../persist/ensureContentInMemory'
import { AIChatQSDataTypeEnum } from '../aiRender'

const persistGetSessionContent = vi.hoisted(() => vi.fn())

vi.mock('../persist/contentPersistHelper', () => ({
  applyHydratedStageSettled: (content: { stageSettled?: boolean }) => {
    if (content.stageSettled !== false) content.stageSettled = true
    return content
  },
  persistGetSessionContent,
}))

describe('ensureContentInMemory', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns existing without reading IDB', async () => {
    const contents = new Map<string, any>()
    const current = { id: 't1', type: AIChatQSDataTypeEnum.THOUGHT, data: 'a' }
    contents.set('t1', current)
    const got = await ensureContentInMemory('s1', 't1', contents)
    expect(got).toBe(current)
    expect(persistGetSessionContent).not.toHaveBeenCalled()
  })

  it('hydrates from IDB and treats missing stageSettled as true', async () => {
    persistGetSessionContent.mockResolvedValue({
      id: 't1',
      type: AIChatQSDataTypeEnum.THOUGHT,
      data: 'from-idb',
    })
    const contents = new Map<string, any>()
    const got = await ensureContentInMemory('s1', 't1', contents)
    expect(got?.data).toBe('from-idb')
    expect(got?.stageSettled).toBe(true)
    expect(contents.get('t1')).toBe(got)
  })

  it('rebuilds from create when IDB misses', async () => {
    persistGetSessionContent.mockResolvedValue(undefined)
    const contents = new Map<string, any>()
    const created = {
      id: 'ew-1',
      type: AIChatQSDataTypeEnum.STREAM,
      stageSettled: false,
      data: { status: 'start', content: '' },
    } as any
    const got = await ensureContentInMemory('s1', 'ew-1', contents, () => created)
    expect(got).toBe(created)
    expect(contents.get('ew-1')).toBe(created)
  })
})
