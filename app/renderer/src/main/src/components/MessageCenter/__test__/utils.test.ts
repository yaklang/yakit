import '../../../pages/ai-re-act/hooks/__test__/setupElectron'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import emiter from '@/utils/eventBus/eventBus'
import { apiFetchMessageClear, apiFetchMessageRead, apiFetchWebMessageClear, apiFetchWebMessageRead } from '../utils'

const mocks = vi.hoisted(() => ({
  netWorkApi: vi.fn(),
}))

vi.mock('@/services/fetch', () => ({
  NetWorkApi: (...args: unknown[]) => mocks.netWorkApi(...args),
}))

describe('message read state APIs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it.each([
    ['plugin read', apiFetchMessageRead, 'plugin'],
    ['plugin clear', apiFetchMessageClear, 'plugin'],
    ['web read', apiFetchWebMessageRead, 'web'],
    ['web clear', apiFetchWebMessageClear, 'web'],
  ] as const)('%s emits unread refresh only after a successful response', async (_, request, channel) => {
    const emit = vi.spyOn(emiter, 'emit')
    mocks.netWorkApi.mockResolvedValueOnce({ ok: false })

    await expect(request({ isAll: false, hash: 'message-hash' })).resolves.toBe(false)
    expect(emit).not.toHaveBeenCalledWith('onRefreshMessageUnread', channel)

    mocks.netWorkApi.mockResolvedValueOnce({ ok: true })
    await expect(request({ isAll: false, hash: 'message-hash' })).resolves.toBe(true)
    expect(emit).toHaveBeenCalledExactlyOnceWith('onRefreshMessageUnread', channel)
  })
})
