import type React from 'react'
import { act, render } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
// 先于被测模块注册 window.require('electron') stub
import './setupElectron'
import AIAgentContext from '@/pages/ai-agent/useContext/AIAgentContext'
import { globalSessionEngine } from '../ChatMultiSessionController'
import { useSyncLoadingState } from '../useSyncLoadingState'

// 渲染树无关的持久化/AIAgentLogEmitter 依赖打桩
vi.mock('../persist/contentPersistHelper', () => ({
  persistIndependentItem: vi.fn(),
  persistToolResultIfTerminal: vi.fn(),
  drainSessionContentWrites: vi.fn().mockResolvedValue([]),
  applyHydratedStageSettled: (content: any) => content,
}))
vi.mock('../AIAgentLogEmitter', () => ({
  aiAgentLogEmitter: { dispatch: vi.fn(), clearSessionBuffer: vi.fn() },
}))

const SESSION_ID = 'sync-loading-test-session'

/** 探针组件：渲染 hook 的 loading 并暴露 markSending 给用例 */
const captured: { markSending?: (syncId: string) => void } = {}
const Probe: React.FC = () => {
  const { loading, markSending } = useSyncLoadingState()
  captured.markSending = markSending
  return <div data-testid="loading">{String(loading)}</div>
}

const renderProbe = () => {
  const contextValue = {
    store: { setting: {}, activeChat: { SessionID: SESSION_ID } },
    dispatcher: {
      onStart: vi.fn(),
      onSend: vi.fn(),
      onClose: vi.fn(),
      onUpdatePageId: vi.fn(),
      setSetting: vi.fn(),
      getSetting: () => ({}),
      setActiveChat: vi.fn(),
    },
  }
  return render(
    <AIAgentContext.Provider value={contextValue as never}>
      <Probe />
    </AIAgentContext.Provider>,
  )
}

const loadingText = (container: HTMLElement) => container.querySelector('[data-testid="loading"]')?.textContent || ''

/** 模拟真实链路：markSending 搭配的 SyncID 消息经 handleSendMessage 发出时被写入 meta.syncIDMap 并触发计数 */
const registerPending = (syncId: string) => {
  const { meta, store } = globalSessionEngine.ensureSession(SESSION_ID)
  meta.syncIDMap.set(syncId, true)
  store.getState().updateStateCount('syncIDUpdate')
}

/** 模拟后端回执：响应携带该 SyncID 时从 syncIDMap 删除并触发 syncIDUpdate 计数 */
const receiveReceipt = (syncId: string) => {
  const { meta, store } = globalSessionEngine.ensureSession(SESSION_ID)
  meta.syncIDMap.delete(syncId)
  store.getState().updateStateCount('syncIDUpdate')
}

describe('useSyncLoadingState', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('markSending 后 loading 置位（后端未回执期间保持 true）', () => {
    const { container } = renderProbe()
    expect(loadingText(container)).toBe('false')

    act(() => {
      captured.markSending!('sync-1')
      registerPending('sync-1')
    })
    expect(loadingText(container)).toBe('true')
  })

  it('后端回执（syncIDMap 移除 + syncIDUpdate 计数）后 loading 转为 false', async () => {
    const { container } = renderProbe()
    act(() => {
      captured.markSending!('sync-2')
      registerPending('sync-2')
    })
    expect(loadingText(container)).toBe('true')

    await act(async () => {
      receiveReceipt('sync-2')
      await vi.advanceTimersByTimeAsync(300)
    })
    expect(loadingText(container)).toBe('false')
  })

  it('回执快于最短展示时长时，loading 至少保持 300ms（debounce 窗口之上的余量）', async () => {
    const { container } = renderProbe()
    act(() => {
      captured.markSending!('sync-3')
      registerPending('sync-3')
    })
    expect(loadingText(container)).toBe('true')

    // 50ms 即收到回执，仍处于最短展示期内
    await act(async () => {
      await vi.advanceTimersByTimeAsync(50)
      receiveReceipt('sync-3')
    })
    expect(loadingText(container)).toBe('true')

    // 满 300ms 后关闭
    await act(async () => {
      await vi.advanceTimersByTimeAsync(260)
    })
    expect(loadingText(container)).toBe('false')
  })

  it('回执慢于最短展示时长时，loading 保持到回执到达为止', async () => {
    const { container } = renderProbe()
    act(() => {
      captured.markSending!('sync-4')
      registerPending('sync-4')
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300)
    })
    // 300ms 宽限结束但后端仍未回执，pending 仍为 true
    expect(loadingText(container)).toBe('true')

    await act(async () => {
      receiveReceipt('sync-4')
    })
    expect(loadingText(container)).toBe('false')
  })

  it('多次 markSending 复用同一实例时以最后一次为准', async () => {
    const { container } = renderProbe()
    act(() => {
      captured.markSending!('sync-5')
      registerPending('sync-5')
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(310)
      receiveReceipt('sync-5')
    })
    expect(loadingText(container)).toBe('false')

    act(() => {
      captured.markSending!('sync-6')
      registerPending('sync-6')
    })
    expect(loadingText(container)).toBe('true')
  })

  it('卸载时清理最短展示定时器', async () => {
    const { container, unmount } = renderProbe()
    act(() => {
      captured.markSending!('sync-7')
    })
    expect(loadingText(container)).toBe('true')
    unmount()
    // 卸载后推进定时器不应抛错
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300)
    })
    expect(container.querySelector('[data-testid="loading"]')).toBeNull()
  })
})
