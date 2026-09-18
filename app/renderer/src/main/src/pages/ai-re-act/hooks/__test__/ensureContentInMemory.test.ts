import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ensureContentInMemory } from '../persist/ensureContentInMemory'
import { SessionLifecycle } from '../sessionLifecycle'
import { AIChatQSDataTypeEnum, type AIChatQSData } from '../aiRender'

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

  it('does not read or return cached content for an invalidated connection', async () => {
    const lifecycle = new SessionLifecycle()
    lifecycle.current = false
    const current: AIChatQSData = {
      id: 't1',
      type: AIChatQSDataTypeEnum.THOUGHT,
      chatType: 'reAct',
      data: 'cached',
      Timestamp: 1,
      AIService: '',
      AIModelName: '',
    }
    const create = vi.fn(() => current)
    expect(await ensureContentInMemory('s1', 't1', new Map([['t1', current]]), create, lifecycle)).toBeUndefined()
    expect(persistGetSessionContent).not.toHaveBeenCalled()
    expect(create).not.toHaveBeenCalled()
  })

  it.each(['hit', 'miss', 'error'])(
    'discards a late IDB %s without overwriting new content or rebuilding',
    async (outcome) => {
      let resolve!: (value: AIChatQSData | undefined) => void
      let reject!: (error: Error) => void
      persistGetSessionContent.mockReturnValueOnce(
        new Promise<AIChatQSData | undefined>((yes, no) => {
          resolve = yes
          reject = no
        }),
      )
      const lifecycle = new SessionLifecycle()
      const contents = new Map<string, AIChatQSData>()
      const current: AIChatQSData = {
        id: 't1',
        type: AIChatQSDataTypeEnum.THOUGHT,
        chatType: 'reAct',
        data: 'new connection',
        Timestamp: 1,
        AIService: '',
        AIModelName: '',
      }
      const create = vi.fn(() => current)
      const pending = ensureContentInMemory('s1', 't1', contents, create, lifecycle)
      expect(persistGetSessionContent).toHaveBeenCalledWith('s1', 't1')
      lifecycle.current = false
      contents.set('t1', current)
      if (outcome === 'error') reject(new Error('read failed'))
      else resolve(outcome === 'hit' ? { ...current, data: 'old connection' } : undefined)
      expect(await pending).toBeUndefined()
      expect(contents.get('t1')).toBe(current)
      expect(create).not.toHaveBeenCalled()
    },
  )

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
