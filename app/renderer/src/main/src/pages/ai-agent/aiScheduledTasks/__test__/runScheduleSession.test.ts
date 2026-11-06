import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ query: vi.fn(), run: vi.fn(), listeners: new Set<(raw: string) => void>() }))
vi.mock('../../grpc', () => ({ grpcQueryAISession: mocks.query }))
vi.mock('../utils', () => ({ grpcRunAIReActScheduleNow: mocks.run }))
vi.mock('@/utils/eventBus/eventBus', () => ({
  default: {
    on: (_: string, fn: any) => mocks.listeners.add(fn),
    off: (_: string, fn: any) => mocks.listeners.delete(fn),
  },
}))
import { chooseScheduleSession, runScheduleAndFindSession } from '../runScheduleSession'
const schedule = {
  UUID: 'job',
  Name: 'scheduled task',
  TargetMode: 'new_session_per_run',
  Payload: { Prompt: 'question' },
} as any
const candidate = (id: string, title = schedule.Name) =>
  ({ SessionID: id, Title: title, CreatedAt: Date.now(), StartParams: { UserQuery: 'question' } }) as any
beforeEach(() => {
  vi.useFakeTimers()
  mocks.listeners.clear()
  mocks.query.mockReset()
  mocks.run.mockReset()
})
afterEach(() => {
  vi.useRealTimers()
})
describe('scheduled session routing', () => {
  it('listens before execution, catches an early push, and deduplicates double clicks', async () => {
    mocks.query
      .mockResolvedValueOnce({ Data: [] })
      .mockResolvedValueOnce({ Data: [candidate('right'), candidate('unrelated', 'other')] })
    mocks.run.mockImplementation(async () => {
      for (const fn of mocks.listeners) fn(JSON.stringify({ sessionId: 'right' }))
    })
    const first = runScheduleAndFindSession(schedule)
    expect(runScheduleAndFindSession(schedule)).toBe(first)
    await vi.advanceTimersByTimeAsync(2100)
    expect((await first)?.SessionID).toBe('right')
    expect(mocks.run).toHaveBeenCalledTimes(1)
    expect(mocks.query.mock.calls[1][0].Filter.SessionID).toEqual(['right'])
    expect(mocks.listeners.size).toBe(0)
  })
  it('does not select the latest unrelated or ambiguous session', () => {
    expect(chooseScheduleSession(schedule, [candidate('other', 'other')], new Set(), Date.now())).toBeUndefined()
    expect(chooseScheduleSession(schedule, [candidate('one'), candidate('two')], new Set(), Date.now())).toBeUndefined()
    expect(chooseScheduleSession(schedule, [candidate('old')], new Set(['old']), Date.now())).toBeUndefined()
  })
  it('opens only the exact continue-session target', () => {
    const target = { ...schedule, TargetMode: 'continue_session', TargetSessionID: 'target' }
    expect(chooseScheduleSession(target, [candidate('other')], new Set(), Date.now())).toBeUndefined()
    expect(chooseScheduleSession(target, [candidate('target')], new Set(['target']), Date.now())?.SessionID).toBe(
      'target',
    )
  })
  it('cleans listeners on execution errors and permits retry', async () => {
    mocks.query.mockResolvedValue({ Data: [] })
    mocks.run.mockRejectedValue(new Error('failed'))
    await expect(runScheduleAndFindSession(schedule)).rejects.toThrow('failed')
    expect(mocks.listeners.size).toBe(0)
    await expect(runScheduleAndFindSession(schedule)).rejects.toThrow('failed')
    expect(mocks.run).toHaveBeenCalledTimes(2)
  })
  it('uses only a unique new matching candidate when pushes are missing', async () => {
    mocks.query
      .mockResolvedValueOnce({ Data: [candidate('old')] })
      .mockResolvedValueOnce({ Data: [candidate('new'), candidate('old')] })
    mocks.run.mockResolvedValue(undefined)
    const result = runScheduleAndFindSession(schedule)
    await vi.advanceTimersByTimeAsync(2100)
    expect((await result)?.SessionID).toBe('new')
  })
})
