import '../../../ai-re-act/hooks/__test__/setupElectron'
import { beforeEach, expect, it, vi } from 'vitest'
import { onReStart } from '..'
import type { AISession } from '../../type/aiChat'

const mocks = vi.hoisted(() => ({ getSessionExecute: vi.fn(), isSessionClosing: vi.fn(), whenSessionClosed: vi.fn() }))
vi.mock('lottie-web', () => ({ default: vi.fn() }))
vi.mock('@/pages/yakRunner/utils', () => ({ isYaklangScriptDeliveryPath: vi.fn() }))
vi.mock('../../historyChat/utils', async () => await import('../../historyChat/deleteSource'))
vi.mock('@/pages/ai-re-act/hooks/ChatMultiSessionController', () => ({ globalSessionEngine: mocks }))
beforeEach(() => {
  mocks.isSessionClosing.mockReset().mockReturnValue(false)
  mocks.whenSessionClosed.mockReset()
  mocks.getSessionExecute.mockReset().mockReturnValue(false)
})

it.each([undefined, { TimelineSessionID: 'stale-settings', UserQuery: '' }])(
  'resumes the selected ID regardless of saved settings (%s)',
  (setting) => {
    const onStart = vi.fn()
    const activeChat = {
      SessionID: 'selected',
      Source: 'ai',
      StartParams: { TimelineSessionID: 'stale-history', UserQuery: 'old first question' },
    } as AISession
    onReStart({ activeChat, setting, onStart })
    expect(onStart).toHaveBeenCalledExactlyOnceWith({
      kind: 'resume',
      sessionId: 'selected',
      localSource: undefined,
      params: { IsStart: true, Params: expect.objectContaining({ TimelineSessionID: 'selected', UserQuery: '' }) },
    })
    if (!setting) expect(onStart.mock.calls[0][0].params.Params.PreferSessionCachedConfig).toBe(true)
    expect(activeChat.StartParams?.TimelineSessionID).toBe('stale-history')
  },
)

it('does not open another connection for an executing session or an empty selection', () => {
  const onStart = vi.fn()
  onReStart({ activeChat: { SessionID: '' } as AISession, onStart })
  expect(mocks.getSessionExecute).not.toHaveBeenCalled()
  mocks.getSessionExecute.mockReturnValue(true)
  onReStart({ activeChat: { SessionID: 'running' } as AISession, onStart })
  expect(mocks.getSessionExecute).toHaveBeenCalledWith('running')
  expect(onStart).not.toHaveBeenCalled()
})

it('waits for the previous Tab to finish closing before reopening its session', async () => {
  let finish!: () => void
  mocks.isSessionClosing.mockReturnValue(true)
  mocks.whenSessionClosed.mockReturnValue(
    new Promise<void>((resolve) => {
      finish = resolve
    }),
  )
  const onStart = vi.fn()
  onReStart({ activeChat: { SessionID: 'closing' } as AISession, onStart })
  expect(onStart).not.toHaveBeenCalled()
  expect(mocks.whenSessionClosed).toHaveBeenCalledWith('closing')
  finish()
  await Promise.resolve()
  expect(onStart).toHaveBeenCalledWith(expect.objectContaining({ kind: 'resume', sessionId: 'closing' }))
})
