import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  clonePersistableContent,
  isToolResultTerminalStatus,
  persistToolResultIfTerminal,
  upsertSessionContent,
  persistIndependentItem,
  deletePersistedContent,
  setSessionReferencePersist,
  drainSessionContentWrites,
} from '../persist/contentPersistHelper'
import { AIChatQSDataTypeEnum } from '../aiRender'
import aiChatPersistStore from '../persist/aiChatPersistStore'

vi.mock('../persist/aiChatPersistStore', () => {
  return {
    default: {
      setSessionContent: vi.fn().mockResolvedValue(undefined),
      deleteSessionContent: vi.fn().mockResolvedValue(undefined),
      setSessionReference: vi.fn().mockResolvedValue(undefined),
    },
  }
})

describe('contentPersistHelper', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('E1: isToolResultTerminalStatus', () => {
    expect(isToolResultTerminalStatus('success')).toBe(true)
    expect(isToolResultTerminalStatus('failed')).toBe(true)
    expect(isToolResultTerminalStatus('user_cancelled')).toBe(true)
    expect(isToolResultTerminalStatus('default')).toBe(false)
    expect(isToolResultTerminalStatus(undefined)).toBe(false)
  })

  it('E1: persistToolResultIfTerminal only writes terminal', async () => {
    const nonTerminal = {
      id: 't1',
      type: AIChatQSDataTypeEnum.TOOL_RESULT,
      data: { tool: { status: 'default' } },
    } as any
    expect(persistToolResultIfTerminal('s1', nonTerminal)).toBeUndefined()

    const terminal = {
      id: 't1',
      type: AIChatQSDataTypeEnum.TOOL_RESULT,
      data: { tool: { status: 'success' } },
    } as any
    await persistToolResultIfTerminal('s1', terminal)
    expect(aiChatPersistStore.setSessionContent).toHaveBeenCalled()
  })

  it('E3: clone / persistIndependent / delete', async () => {
    const data = {
      id: 'x1',
      type: AIChatQSDataTypeEnum.THOUGHT,
      data: 'hi',
    } as any
    const cloned = clonePersistableContent(data)
    expect(cloned).toEqual(data)
    expect(cloned).not.toBe(data)

    await persistIndependentItem('s1', data)
    expect(aiChatPersistStore.setSessionContent).toHaveBeenCalledWith('s1', 'x1', expect.any(Function))

    await deletePersistedContent('s1', 'x1')
    expect(aiChatPersistStore.deleteSessionContent).toHaveBeenCalledWith('s1', 'x1')
  })

  it('E4: setSessionReferencePersist / drain', async () => {
    await setSessionReferencePersist('s1', 'ref-1', { id: 'ref-1' } as any)
    expect(aiChatPersistStore.setSessionReference).toHaveBeenCalled()
    await expect(drainSessionContentWrites('s1')).resolves.toBeTruthy()
  })
})

describe('contentPersistHelper write queue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('E2: serializes writes for same token', async () => {
    const order: number[] = []
    ;(aiChatPersistStore.setSessionContent as any).mockImplementation(async () => {
      order.push(1)
      await Promise.resolve()
      order.push(2)
    })

    const p1 = upsertSessionContent('s1', 'tok', { id: 'tok', type: AIChatQSDataTypeEnum.THOUGHT, data: 'a' } as any)
    const p2 = upsertSessionContent('s1', 'tok', { id: 'tok', type: AIChatQSDataTypeEnum.THOUGHT, data: 'b' } as any)
    await Promise.all([p1, p2])
    expect(order).toEqual([1, 2, 1, 2])
  })

  it('E2: write chain self-clears after settle so drain is empty', async () => {
    await upsertSessionContent('s-clear', 'tok', {
      id: 'tok',
      type: AIChatQSDataTypeEnum.THOUGHT,
      data: 'a',
    } as any)
    // finally 自清后，再 drain 应立刻得到空数组（无悬挂链）
    await expect(drainSessionContentWrites('s-clear')).resolves.toEqual([])
  })
})
