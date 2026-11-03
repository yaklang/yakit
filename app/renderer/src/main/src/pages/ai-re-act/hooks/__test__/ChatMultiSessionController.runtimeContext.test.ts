import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ipcRendererMock } from './setupElectron'

vi.mock('lottie-web', () => ({ default: vi.fn() }))
vi.mock('@/pages/yakRunner/utils', () => ({ isYaklangScriptDeliveryPath: vi.fn() }))

import { ChatMultiSessionController } from '../ChatMultiSessionController'
import type { AIStartParams } from '../grpcApi'
import { YakitRoute } from '@/enums/yakitRoute'

beforeEach(() => {
  vi.useFakeTimers()
  ipcRendererMock.invoke.mockReset().mockResolvedValue(undefined)
})

afterEach(() => {
  vi.clearAllTimers()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('session startup runtime context boundary', () => {
  it.each([
    { limit: 307200, expected: 307200 },
    { limit: '307200', expected: 307200 },
    { limit: undefined, expected: 0 },
  ])(
    'sends $expected bytes for saved threshold $limit and preserves employee startup parameters',
    async ({ limit, expected }) => {
      const controller = new ChatMultiSessionController()
      // Isolate disk preparation; exercise the real session registration and outbound startup path.
      vi.spyOn(
        controller as unknown as { prepareSessionPersistBeforeStart: (id: string) => Promise<void> },
        'prepareSessionPersistBeforeStart',
      ).mockResolvedValue(undefined)
      const original = Object.freeze({
        RuntimeContextSizeLimit: limit,
        TimelineContentSizeLimit: 61440,
        ForgeName: 'employee-forge',
        EnablePlan: true,
      })
      const event = { IsStart: true, Params: original as AIStartParams }
      expect(
        controller.handleStartSession({
          token: 'saved-session',
          params: event,
          route: YakitRoute.AI_Agent,
          pageId: YakitRoute.AI_Agent,
        }),
      ).toBe(true)
      await vi.advanceTimersByTimeAsync(0)
      expect(ipcRendererMock.invoke).toHaveBeenCalledWith('start-ai-re-act', 'saved-session', {
        IsStart: true,
        Params: { RuntimeContextSizeLimit: expected, ForgeName: 'employee-forge', EnablePlan: true },
      })
      expect(event.Params).toBe(original)
      expect(original.TimelineContentSizeLimit).toBe(61440)
      expect(original.RuntimeContextSizeLimit).toBe(limit)
    },
  )
})
