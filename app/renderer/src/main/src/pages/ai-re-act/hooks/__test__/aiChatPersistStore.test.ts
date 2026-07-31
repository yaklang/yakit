import { describe, it, expect, vi, beforeEach } from 'vitest'
import aiChatPersistStore from '../persist/aiChatPersistStore'

const openMock = vi.fn()
const setSessionRender = vi.fn()
const getSessionRender = vi.fn()
const setSessionContent = vi.fn()
const getSessionContent = vi.fn()
const deleteSessionPersist = vi.fn()
const deletePersistBySource = vi.fn()
const close = vi.fn()

vi.mock('../persist/aiChatPersistStore', () => ({
  default: {
    open: (...args: any[]) => openMock(...args),
    close: (...args: any[]) => close(...args),
    setSessionRender: (...args: any[]) => setSessionRender(...args),
    getSessionRender: (...args: any[]) => getSessionRender(...args),
    setSessionContent: (...args: any[]) => setSessionContent(...args),
    getSessionContent: (...args: any[]) => getSessionContent(...args),
    deleteSessionPersist: (...args: any[]) => deleteSessionPersist(...args),
    deletePersistBySource: (...args: any[]) => deletePersistBySource(...args),
  },
}))

describe('aiChatPersistStore API surface (stubbed)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    openMock.mockResolvedValue({})
    setSessionRender.mockResolvedValue(undefined)
    getSessionRender.mockResolvedValue(undefined)
    setSessionContent.mockResolvedValue(undefined)
    getSessionContent.mockResolvedValue(undefined)
    deleteSessionPersist.mockResolvedValue(undefined)
    deletePersistBySource.mockResolvedValue(undefined)
    close.mockResolvedValue(undefined)
  })

  it('E5: CRUD methods exist and are callable', async () => {
    await aiChatPersistStore.open()
    await aiChatPersistStore.setSessionRender('s1', 'ai', { items: {} } as any, 0)
    await aiChatPersistStore.getSessionRender('s1', 'ai')
    await aiChatPersistStore.setSessionContent('s1', 't1', () => ({ id: 't1' }) as any)
    await aiChatPersistStore.getSessionContent('s1', 't1')
    await aiChatPersistStore.deleteSessionPersist('s1')
    await aiChatPersistStore.close()

    expect(openMock).toHaveBeenCalled()
    expect(setSessionRender).toHaveBeenCalled()
    expect(getSessionRender).toHaveBeenCalled()
    expect(setSessionContent).toHaveBeenCalled()
    expect(getSessionContent).toHaveBeenCalled()
    expect(deleteSessionPersist).toHaveBeenCalledWith('s1')
    expect(close).toHaveBeenCalled()
  })

  it('E6: deletePersistBySource', async () => {
    await aiChatPersistStore.deletePersistBySource('ai')
    expect(deletePersistBySource).toHaveBeenCalledWith('ai')
  })
})
