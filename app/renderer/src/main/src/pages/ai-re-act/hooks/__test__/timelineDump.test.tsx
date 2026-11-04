import React from 'react'
import './setupElectron'
import { act, cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { StringToUint8Array } from '@/utils/str'
import { ChatMultiSessionController } from '../ChatMultiSessionController'
import { useTimelineDump } from '../useTimelineDump'
vi.mock('lottie-web', () => ({ default: vi.fn() }))
vi.mock('@/pages/yakRunner/utils', () => ({ isYaklangScriptDeliveryPath: vi.fn() }))
const fixture = vi.hoisted(() => ({ id: 'A', send: vi.fn() }))
let controller: ChatMultiSessionController
vi.mock('../useCurrentSessionId', () => ({ default: () => fixture.id }))
vi.mock('../useCurrentDataBySession', () => ({
  useCurrentRawData: () => controller.ensureSession(fixture.id).rawData,
  useCurrentStore: () => controller.ensureSession(fixture.id).store,
}))
vi.mock('@/pages/ai-agent/useContext/useDispatcher', () => ({ default: () => ({ onSend: fixture.send }) }))
let result: ReturnType<typeof useTimelineDump>
const Harness = () => {
  result = useTimelineDump()
  return <div>{result.dump}</div>
}
const emit = async (id: string, content: unknown, syncID?: string) =>
  await controller.handleGrpcOutputEvent(id, {
    Type: 'structured',
    NodeId: 'timeline',
    IsSync: true,
    IsJson: true,
    SyncID: syncID || controller.ensureSession(id).rawData.timelineDumpSyncID,
    Content: StringToUint8Array(JSON.stringify(content)),
  } as any)
beforeEach(() => {
  vi.useFakeTimers()
  fixture.id = 'A'
  fixture.send.mockReset().mockReturnValue(true)
  controller = new ChatMultiSessionController()
  for (const id of ['A', 'B']) {
    controller.ensureSession(id).store.getState().updateState({ execute: true, initLoading: false })
    ;(controller as any).readyChannels.add(id)
  }
})
afterEach(() => {
  cleanup()
  vi.clearAllTimers()
  vi.useRealTimers()
  vi.restoreAllMocks()
})
describe('timeline dump via existing session stream', () => {
  it('sends the official timeline sync and waits for data rather than a generic acknowledgement', async () => {
    render(<Harness />)
    const sent = fixture.send.mock.calls[0][0]
    expect(sent).toMatchObject({
      token: 'A',
      params: { IsSyncMessage: true, SyncType: 'timeline', SyncJsonInput: '{"limit":50}' },
    })
    expect(result.loading).toBe(true)
    await act(async () => {
      await emit('A', { dump: 'actual dump' })
    })
    expect(result.dump).toBe('actual dump')
    expect(result.loading).toBe(false)
  })
  it('retains previous text on malformed refresh, then permits retry and a valid empty result', async () => {
    controller.ensureSession('A').rawData.timelineDump = 'cached'
    render(<Harness />)
    await act(async () => {
      await emit('A', { error: 'failed' })
    })
    expect(result.dump).toBe('cached')
    expect(result.error).toBe('invalid')
    act(() => result.refreshDump())
    await act(async () => {
      await emit('A', { dump: '' })
    })
    expect(result.dump).toBe('')
    expect(result.error).toBeUndefined()
  })
  it('rejects send failure without marking the UI applied and preserves cached content', async () => {
    fixture.send.mockReturnValue(false)
    controller.ensureSession('A').rawData.timelineDump = 'cached'
    render(<Harness />)
    expect(result.loading).toBe(false)
    expect(result.error).toBe('send')
    expect(result.dump).toBe('cached')
  })
  it('times out honestly and ignores stale replies from the previous refresh', async () => {
    render(<Harness />)
    const old = controller.ensureSession('A').rawData.timelineDumpSyncID
    act(() => vi.advanceTimersByTime(10000))
    expect(result.error).toBe('timeout')
    act(() => result.refreshDump())
    await act(async () => {
      await emit('A', { dump: 'stale' }, old)
    })
    expect(result.dump).toBe('')
    expect(result.loading).toBe(true)
    await act(async () => {
      await emit('A', { dump: 'new' })
    })
    expect(result.dump).toBe('new')
  })
  it('isolates sessions and releases pending state on unmount', async () => {
    const { rerender, unmount } = render(<Harness />)
    const old = controller.ensureSession('A').rawData.timelineDumpSyncID
    fixture.id = 'B'
    rerender(<Harness />)
    expect(fixture.send.mock.calls[1][0].token).toBe('B')
    await act(async () => {
      await emit('A', { dump: 'A secret' }, old)
    })
    expect(result.dump).toBe('')
    await act(async () => {
      await emit('B', { dump: 'B content' })
    })
    expect(result.dump).toBe('B content')
    unmount()
    expect(controller.ensureSession('B').rawData.timelineDumpSyncID).toBeUndefined()
    expect(vi.getTimerCount()).toBe(0)
  })
  it('does not send while disconnected or history restore is in progress', async () => {
    controller.ensureSession('A').store.getState().updateState({ initLoading: true })
    render(<Harness />)
    expect(fixture.send).not.toHaveBeenCalled()
    expect(result.ready).toBe(false)
  })
})
