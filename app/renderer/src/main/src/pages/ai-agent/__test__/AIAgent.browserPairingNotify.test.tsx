import '../../ai-re-act/hooks/__test__/setupElectron'
import type { ReactNode } from 'react'
import type * as EnvfileModule from '@/utils/envfile'
import { act, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { pendingRef, instancesRef, memfitRef } = vi.hoisted(() => ({
  pendingRef: { current: [] as { id: string }[] },
  instancesRef: { current: [] as { id: string; online: boolean; identity?: string; name: string }[] },
  memfitRef: { current: true },
}))

vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({ t: (key: string, params?: { identity?: string }) => params?.identity ?? key }),
}))

vi.mock('@/utils/notification', () => ({
  failed: vi.fn(),
  yakitNotify: vi.fn(),
}))

vi.mock('@/utils/eventBus/eventBus', () => ({
  default: { on: vi.fn(), off: vi.fn(), emit: vi.fn() },
}))

vi.mock('lottie-web', () => ({
  default: {
    loadAnimation: () => ({ destroy: () => undefined, play: () => undefined, stop: () => undefined }),
  },
}))

vi.mock('../browserInstances/browserInstanceStore', () => ({
  useBrowserInstances: () => ({
    instances: instancesRef.current,
    pending: pendingRef.current,
    selectedId: '',
    loading: false,
    error: '',
  }),
}))

vi.mock('@/utils/envfile', async () => {
  const actual = await vi.importActual<typeof EnvfileModule>('@/utils/envfile')
  return { ...actual, isMemfit: () => memfitRef.current }
})

vi.mock('@/utils/kv', () => ({
  getRemoteValue: vi.fn().mockResolvedValue(''),
  setRemoteValue: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/routes/newRoute', () => ({ YakitRouteToPageInfo: { 'ai-agent': { label: 'AIAgent' } } }))

vi.mock('../AIAgentSideList', () => ({
  AIAgentSideList: () => null,
}))

vi.mock('@/components/yakitUI/YakitResizeBox/YakitResizeBox', () => ({
  YakitResizeBox: ({ firstNode, secondNode }: { firstNode: ReactNode; secondNode: ReactNode }) => (
    <>
      {firstNode}
      {secondNode}
    </>
  ),
}))

vi.mock('../aiBottomSideBar/AIBottomSideBar', () => ({
  AIBottomSideBar: () => null,
}))

vi.mock('../aiBottomDetails/AIBottomDetails', () => ({
  AIBottomDetails: () => null,
}))

vi.mock('../../yakRunner/SplitView/SplitView', () => ({
  SplitView: ({ elements }: { elements: { element: ReactNode }[] }) => (
    <>
      {elements.map((item, index) => (
        <div key={index}>{item.element}</div>
      ))}
    </>
  ),
}))

vi.mock('../aiAgentChat/AIAgentChat', () => ({
  AIAgentChat: () => null,
}))

vi.mock('../../ai-re-act/hooks/useChatIPC', () => ({
  useChatIPC: () => ({
    onStart: vi.fn(),
    onSend: vi.fn(),
    onClose: vi.fn(),
    onUpdatePageId: vi.fn(),
  }),
}))

vi.mock('../../ai-re-act/hooks/ChatMultiSessionController', async () => {
  const { createStore } = await import('zustand/vanilla')
  return {
    globalSessionEngine: {
      registerDraftSession: vi.fn(),
      discardUnsentDraft: vi.fn(),
      updateSessionConfig: vi.fn(),
      sessionStores: createStore(() => new Map()),
    },
  }
})

vi.mock('../../KnowledgeBase/hooks/useKnowledgeBase', () => ({
  useKnowledgeBase: () => ({ initialize: vi.fn(), knowledgeBases: [] }),
}))

vi.mock('../components/aiFileSystemList/store/useHistoryFolder', () => ({
  loadRemoteHistory: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../components/aiFileSystemList/store/useCustomFolder', () => ({
  initCustomFolderStore: vi.fn().mockResolvedValue(undefined),
}))

import { AIAgent } from '../AIAgent'
import { BrowserPairingNotify, resetBrowserPairingNotifyState } from '../browserPairingNotify/BrowserPairingNotify'
import { yakitNotify } from '@/utils/notification'
import emiter from '@/utils/eventBus/eventBus'
import { YakitRoute } from '@/enums/yakitRoute'
import { AIAgentTabListEnum, SwitchAIAgentTabEventEnum } from '../defaultConstant'

type EmitterCall = [string, (value: string) => void]

const approvedListeners = () =>
  (vi.mocked(emiter.on).mock.calls as unknown as EmitterCall[]).filter(
    ([event]) => event === 'onBrowserExtensionAutoApproved',
  )

const approvedListener = () => {
  const listener = approvedListeners()[0]?.[1]
  if (!listener) throw new Error('missing onBrowserExtensionAutoApproved listener')
  return listener
}

describe('AIAgent 浏览器配对提示', () => {
  beforeEach(() => {
    pendingRef.current = []
    instancesRef.current = []
    memfitRef.current = true
    resetBrowserPairingNotifyState()
    vi.mocked(yakitNotify).mockClear()
    vi.mocked(emiter.emit).mockClear()
    vi.mocked(emiter.on).mockClear()
  })

  afterEach(() => {
    pendingRef.current = []
    instancesRef.current = []
  })

  it('已有在线实例时提示自动连接，同一实例不重复提示', async () => {
    instancesRef.current = [{ id: 'browser-1', online: true, identity: 'A', name: 'Chrome' }]
    const { rerender } = render(<BrowserPairingNotify />)
    expect(yakitNotify).toHaveBeenCalledTimes(1)
    expect(yakitNotify).toHaveBeenCalledWith(
      'success',
      expect.objectContaining({
        onClick: expect.any(Function),
      }),
    )

    instancesRef.current = [
      { id: 'browser-1', online: true, identity: 'A', name: 'Chrome' },
      { id: 'browser-2', online: false, identity: 'B', name: 'Edge' },
    ]
    await act(async () => {
      rerender(<BrowserPairingNotify />)
    })
    expect(yakitNotify).toHaveBeenCalledTimes(1)
  })

  it('挂载后实例由离线变为在线时提示', async () => {
    instancesRef.current = [{ id: 'browser-1', online: false, identity: 'A', name: 'Chrome' }]
    const { rerender } = render(<BrowserPairingNotify />)
    expect(yakitNotify).not.toHaveBeenCalled()

    instancesRef.current = [{ id: 'browser-1', online: true, identity: 'A', name: 'Chrome' }]
    await act(async () => {
      rerender(<BrowserPairingNotify />)
    })
    expect(yakitNotify).toHaveBeenCalledTimes(1)
    expect(yakitNotify).toHaveBeenCalledWith('success', expect.objectContaining({ onClick: expect.any(Function) }))
  })

  it('自动连接事件和实例列表命中同一 identity 只提示一次', async () => {
    instancesRef.current = [{ id: 'browser-1', online: true, identity: 'A', name: 'Chrome' }]
    render(<BrowserPairingNotify />)

    act(() => approvedListener()('A'))

    expect(yakitNotify).toHaveBeenCalledTimes(1)
  })

  it('没有 identity 时用 name 去重', async () => {
    instancesRef.current = [
      { id: 'browser-1', online: true, name: 'Chrome' },
      { id: 'browser-2', online: true, name: 'Chrome' },
    ]
    const { rerender } = render(<BrowserPairingNotify />)
    expect(yakitNotify).toHaveBeenCalledTimes(1)

    instancesRef.current = [
      { id: 'browser-1', online: true, name: 'Chrome' },
      { id: 'browser-3', online: true, name: 'Edge' },
    ]
    await act(async () => {
      rerender(<BrowserPairingNotify />)
    })
    expect(yakitNotify).toHaveBeenCalledTimes(2)
  })

  it('非 Memfit 不挂载配对提示，Memfit 由 AIAgent 挂载', async () => {
    memfitRef.current = false
    let yakitPage!: ReturnType<typeof render>
    await act(async () => {
      yakitPage = render(<AIAgent pageId="test" />)
    })
    expect(approvedListeners()).toHaveLength(0)
    await act(async () => {
      yakitPage.unmount()
    })

    memfitRef.current = true
    await act(async () => {
      render(<AIAgent pageId="test" />)
    })
    expect(approvedListeners()).toHaveLength(1)
  })

  it('初次出现 pending id 时通知，点击打开浏览器页签', async () => {
    const { rerender } = render(<BrowserPairingNotify />)
    expect(yakitNotify).not.toHaveBeenCalled()

    pendingRef.current = [{ id: 'pair-1' }]
    await act(async () => {
      rerender(<BrowserPairingNotify />)
    })
    expect(yakitNotify).toHaveBeenCalledTimes(1)
    expect(yakitNotify).toHaveBeenCalledWith(
      'info',
      expect.objectContaining({
        onClick: expect.any(Function),
      }),
    )

    const payload = vi.mocked(yakitNotify).mock.calls[0][1] as { onClick: () => void }
    act(() => payload.onClick())
    expect(emiter.emit).toHaveBeenCalledWith('menuOpenPage', JSON.stringify({ route: YakitRoute.AI_Agent }))
    expect(emiter.emit).toHaveBeenCalledWith(
      'switchAIAgentTab',
      JSON.stringify({
        type: SwitchAIAgentTabEventEnum.SET_TAB_ACTIVE,
        params: { active: AIAgentTabListEnum.Browser, show: true },
      }),
    )
  })

  it('pending 更新但无新 id 时不重复通知', async () => {
    const { rerender } = render(<BrowserPairingNotify />)
    pendingRef.current = [{ id: 'pair-1' }]
    await act(async () => {
      rerender(<BrowserPairingNotify />)
    })
    expect(yakitNotify).toHaveBeenCalledTimes(1)

    pendingRef.current = [{ id: 'pair-1' }]
    await act(async () => {
      rerender(<BrowserPairingNotify />)
    })
    expect(yakitNotify).toHaveBeenCalledTimes(1)
  })

  it('多个页签同时挂载只提示一次，卸载后重开不重弹', async () => {
    pendingRef.current = [{ id: 'pair-1' }]
    const first = render(
      <>
        <BrowserPairingNotify />
        <BrowserPairingNotify />
      </>,
    )
    expect(yakitNotify).toHaveBeenCalledTimes(1)
    first.unmount()

    render(<BrowserPairingNotify />)
    expect(yakitNotify).toHaveBeenCalledTimes(1)
  })

  it('自动批准后通知，并可进入浏览器页签', async () => {
    render(<BrowserPairingNotify />)

    act(() => approvedListener()('A'))

    expect(yakitNotify).toHaveBeenCalledWith(
      'success',
      expect.objectContaining({
        onClick: expect.any(Function),
      }),
    )
    const payload = vi.mocked(yakitNotify).mock.calls[0][1] as { onClick: () => void }
    act(() => payload.onClick())
    expect(emiter.emit).toHaveBeenCalledWith('menuOpenPage', JSON.stringify({ route: YakitRoute.AI_Agent }))
    expect(emiter.emit).toHaveBeenCalledWith(
      'switchAIAgentTab',
      JSON.stringify({
        type: SwitchAIAgentTabEventEnum.SET_TAB_ACTIVE,
        params: { active: AIAgentTabListEnum.Browser, show: true },
      }),
    )
  })
})
