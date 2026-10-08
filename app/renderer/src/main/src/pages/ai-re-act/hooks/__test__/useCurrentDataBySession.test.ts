import { cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { useCurrentMeta, useCurrentRawData, useCurrentRequest, useCurrentStore } from '../useCurrentDataBySession'

const mocks = vi.hoisted(() => ({
  sessionId: '',
  pendingChat: undefined as { status: string; data: unknown } | undefined,
  ensureSession: vi.fn(),
}))
vi.mock('@/pages/ai-agent/useContext/useStore', () => ({ default: () => ({ pendingChat: mocks.pendingChat }) }))
vi.mock('../useCurrentSessionId', () => ({ default: () => mocks.sessionId }))
vi.mock('../ChatMultiSessionController', () => ({ globalSessionEngine: { ensureSession: mocks.ensureSession } }))

const useData = () => ({
  store: useCurrentStore(),
  rawData: useCurrentRawData(),
  meta: useCurrentMeta(),
  request: useCurrentRequest(),
})
const makeData = () => ({ store: { renderStore: {} }, rawData: {}, meta: {}, request: {} })
beforeEach(() => {
  vi.clearAllMocks()
  mocks.sessionId = ''
  mocks.pendingChat = undefined
})
afterEach(cleanup)

it.each(['connecting', 'failed'])('renders %s data without creating a session under an empty ID', (status) => {
  const data = makeData()
  mocks.pendingChat = { status, data }
  const { result, rerender } = renderHook(useData)
  expect(result.current).toEqual({ ...data, store: data.store.renderStore })
  expect(mocks.ensureSession).not.toHaveBeenCalled()

  mocks.pendingChat = undefined
  mocks.sessionId = 'backend-session'
  mocks.ensureSession.mockReturnValue(data)
  rerender()
  expect(mocks.ensureSession).toHaveBeenCalledWith('backend-session')
  expect(result.current.store).toBe(data.store.renderStore)
  expect(result.current.rawData).toBe(data.rawData)

  const history = makeData()
  mocks.sessionId = 'history'
  mocks.ensureSession.mockReturnValue(history)
  rerender()
  expect(mocks.ensureSession).toHaveBeenLastCalledWith('history')
  expect(result.current.store).toBe(history.store.renderStore)
  expect(result.current.store).not.toBe(data.store.renderStore)
})
