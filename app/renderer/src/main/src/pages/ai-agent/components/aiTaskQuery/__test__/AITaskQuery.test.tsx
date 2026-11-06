import '@/pages/ai-re-act/hooks/__test__/setupElectron'
import React from 'react'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { createStore } from 'zustand/vanilla'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
const m = vi.hoisted(() => ({
  store: null as any,
  meta: { syncIDMap: new Map() },
  send: vi.fn(),
  push: vi.fn(),
  failed: vi.fn(),
}))
vi.mock('@/pages/ai-re-act/hooks/useCurrentDataBySession', () => ({
  useCurrentStore: () => m.store,
  useCurrentMeta: () => m.meta,
}))
vi.mock('@/pages/ai-re-act/hooks/useCurrentSessionId', () => ({ default: () => 'session-a' }))
vi.mock('@/pages/ai-agent/useContext/useDispatcher', () => ({ default: () => ({ onSend: m.send }) }))
vi.mock('@/pages/ai-re-act/hooks/ChatMultiSessionController', () => ({
  globalSessionEngine: { pushDataToSession: m.push },
}))
vi.mock('@/utils/notification', () => ({ failed: m.failed }))
vi.mock('@/i18n/useI18nNamespaces', () => ({ useI18nNamespaces: () => ({ t: (k: string) => k }) }))
vi.mock('@/components/yakitUI/YakitButton/YakitButton', () => ({
  YakitButton: ({ children, loading, type, icon, ...p }: any) => (
    <button {...p} disabled={loading || p.disabled}>
      {children}
    </button>
  ),
}))
vi.mock('antd', () => ({ Tooltip: ({ children }: any) => children }))
vi.mock('@/components/yakitUI/YakitTag/YakitTag', () => ({ YakitTag: ({ children }: any) => <span>{children}</span> }))
import { AITaskQuery } from '../AITaskQuery'
beforeEach(() => {
  vi.useFakeTimers()
  vi.clearAllMocks()
  m.meta = { syncIDMap: new Map() }
  m.store = createStore(() => ({
    execute: true,
    syncIDUpdate: 0,
    questionQueue: { total: 1, data: [{ id: 'queued-1', user_input: '补充调查' }] },
  }))
  m.send.mockImplementation((request) => {
    m.meta.syncIDMap.set(request.params.SyncID, true)
    m.store.setState((s: any) => ({ syncIDUpdate: s.syncIDUpdate + 1 }))
    return true
  })
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})
function open() {
  render(<AITaskQuery />)
  fireEvent.click(screen.getByText('AITaskQuery.taskQueue'))
}
describe('queue conversions', () => {
  it('dequeues once, appends as a non-current todo and prevents a duplicate conversion', () => {
    open()
    fireEvent.click(screen.getByLabelText('AITaskQuery.addToDo'))
    fireEvent.click(screen.getByLabelText('AITaskQuery.adjustDirection'))
    expect(m.send.mock.calls.map(([r]) => r.params.SyncType)).toEqual([
      'react_remove_task',
      'add_todo_sync',
      'queue_info',
    ])
    expect(m.send.mock.calls[1][0]).toMatchObject({
      token: 'session-a',
      params: { SyncJsonInput: JSON.stringify({ text: '补充调查', set_current: false }) },
    })
    expect(m.push).not.toHaveBeenCalled()
  })
  it('adjusts direction and records intervention only when the send is accepted', () => {
    open()
    fireEvent.click(screen.getByLabelText('AITaskQuery.adjustDirection'))
    expect(m.send.mock.calls[1][0]).toMatchObject({
      token: 'session-a',
      type: 'task',
      params: { SyncType: 'user_intervention', SyncJsonInput: JSON.stringify({ content: '补充调查' }) },
    })
    expect(m.push).toHaveBeenCalledWith(
      'session-a',
      expect.objectContaining({ data: { type: '加入上下文', content: '补充调查' } }),
    )
  })
  it('stops after a failed dequeue and does not manufacture intervention history', () => {
    m.send.mockReturnValue(false)
    open()
    fireEvent.click(screen.getByLabelText('AITaskQuery.adjustDirection'))
    expect(m.send).toHaveBeenCalledTimes(1)
    expect(m.push).not.toHaveBeenCalled()
    expect(m.failed).toHaveBeenCalled()
  })
  it('waits for the matching receipt and releases controls after timeout', () => {
    open()
    fireEvent.click(screen.getByLabelText('AITaskQuery.addToDo'))
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(screen.getByLabelText('AITaskQuery.addToDo')).toBeDisabled()
    act(() => {
      vi.advanceTimersByTime(30000)
    })
    expect(screen.getByLabelText('AITaskQuery.addToDo')).not.toBeDisabled()
    expect(m.failed).toHaveBeenCalledWith('SessionSkills.timeout')
  })
  it('unlocks after acknowledgement without displaying a later false timeout', () => {
    open()
    fireEvent.click(screen.getByLabelText('AITaskQuery.addToDo'))
    act(() => {
      m.meta.syncIDMap.clear()
      m.store.setState({ syncIDUpdate: 100 })
      vi.advanceTimersByTime(350)
    })
    expect(screen.getByLabelText('AITaskQuery.addToDo')).not.toBeDisabled()
    act(() => vi.advanceTimersByTime(30000))
    expect(m.failed).not.toHaveBeenCalled()
  })
})
