import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const autoApproveYTrayPairings = vi.fn((_snapshot?: unknown) =>
  Promise.resolve({ snapshot: { pending: [] }, errors: {} }),
)
const onData = vi.fn()
const cancel = vi.fn()
const duplexWrite = vi.fn()

vi.mock('@/pages/browserExtension/browserExtensionClient', () => ({
  autoApproveYTrayPairings: (...args: unknown[]) => autoApproveYTrayPairings(...args),
}))

vi.mock('@/services/electronBridge', () => ({
  yakitDuplex: {
    write: (...args: unknown[]) => duplexWrite(...args),
    start: vi.fn(() => Promise.resolve()),
  },
  yakitStream: {
    cancel: (...args: unknown[]) => cancel(...args),
    onData: (...args: unknown[]) => onData(...args),
    onError: () => () => {},
    onEnd: () => () => {},
  },
}))

vi.mock('@/utils/notification', () => ({
  info: vi.fn(),
  yakitFailed: vi.fn(),
  yakitNotify: vi.fn(),
}))

vi.mock('@/utils/kv', () => ({
  setRemoteValue: vi.fn(),
  getRemoteValue: vi.fn(),
}))

vi.mock('@/utils/clipboard', () => ({
  setClipboardText: vi.fn(),
}))

vi.mock('@/utils/mitmDebugHooks', () => ({
  areMITMDebugHooksEnabled: () => false,
}))

vi.mock('@/components/yakitUI/YakitButton/YakitButton', () => ({
  YakitButton: () => null,
}))

vi.mock('@/components/HTTPFlowTable/HTTPFlowTable.observability', () => ({
  mitmFlowObservability: {
    setFlowCommittedMode: vi.fn(),
    recordDuplexNotification: vi.fn(),
    recordHTTPFlowCommitted: vi.fn(),
  },
}))

vi.mock('@/components/HTTPFlowTable/HTTPFlowTable.committed', () => ({
  createMITMFlowCommittedRefreshScheduler: () => ({
    request: vi.fn(),
    cancel: vi.fn(),
  }),
}))

import emiter from '@/utils/eventBus/eventBus'
import { startupDuplexConn } from '../duplex'

describe('duplex managed browser auto-approve', () => {
  let dataHandler: ((data: { MessageType: string; Timestamp?: number; Data?: Uint8Array }) => void) | undefined

  beforeEach(() => {
    vi.clearAllMocks()
    dataHandler = undefined
    onData.mockImplementation((_token: string, handler: typeof dataHandler) => {
      dataHandler = handler
      return () => {}
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it.each(['global', 'browser_extension'] as const)(
    '%s 消息触发 autoApproveYTrayPairings 并在结束后发出 onBrowserExtensionChanged',
    async (messageType) => {
      const onChanged = vi.fn()
      emiter.on('onBrowserExtensionChanged', onChanged)

      startupDuplexConn()
      expect(onData).toHaveBeenCalled()
      expect(dataHandler).toBeTypeOf('function')

      dataHandler?.({
        MessageType: messageType,
        Timestamp: Date.now(),
        Data: new TextEncoder().encode('{}'),
      })

      await vi.waitFor(() => {
        expect(autoApproveYTrayPairings).toHaveBeenCalledTimes(1)
        expect(onChanged).toHaveBeenCalledWith('')
      })

      emiter.off('onBrowserExtensionChanged', onChanged)
    },
  )
})
