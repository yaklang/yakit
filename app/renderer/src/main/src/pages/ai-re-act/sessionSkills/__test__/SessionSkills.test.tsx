import React from 'react'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createStore } from 'zustand/vanilla'
import { SessionSkills } from '../SessionSkills'

let store: any,
  raw: any,
  meta: any,
  session = 'session-a'
const send = vi.fn()
vi.mock('../../hooks/useCurrentSessionId', () => ({ default: () => session }))
vi.mock('../../hooks/useCurrentDataBySession', () => ({
  useCurrentStore: () => store,
  useCurrentRawData: () => raw,
  useCurrentMeta: () => meta,
}))
vi.mock('@/pages/ai-agent/useContext/useDispatcher', () => ({ default: () => ({ onSend: send }) }))
vi.mock('@/i18n/useI18nNamespaces', () => ({ useI18nNamespaces: () => ({ t: (key: string) => key }) }))
vi.mock('@/components/yakitUI/YakitButton/YakitButton', () => ({
  YakitButton: ({ children, onClick, disabled, loading, htmlType }: any) => (
    <button type={htmlType || 'button'} disabled={disabled || loading} onClick={onClick}>
      {children}
    </button>
  ),
}))
vi.mock('@/components/yakitUI/YakitInput/YakitInput', () => ({
  YakitInput: ({ value, onChange, placeholder }: any) => (
    <input value={value} onChange={onChange} placeholder={placeholder} />
  ),
}))
const publish = (key: string) => act(() => store.setState({ [key]: store.getState()[key] + 1 }))
const available = () => {
  raw.availableSkills = { skills: [{ name: 'review', description: 'Read code' }], total: 1, page: 1, has_more: false }
  publish('availableSkillsUpdate')
  fireEvent.click(screen.getByText(/SessionSkills.available/))
}
beforeEach(() => {
  vi.useFakeTimers()
  send.mockReset()
  session = 'session-a'
  store = createStore(() => ({
    execute: true,
    loadedSkillsUpdate: 0,
    availableSkillsUpdate: 0,
    skillDetailsUpdate: 0,
    syncIDUpdate: 0,
  }))
  raw = {
    loadedSkills: { skills: [], total: 0 },
    availableSkills: { skills: [], total: 0, page: 1, has_more: false },
    skillDetails: new Map(),
  }
  meta = { syncIDMap: new Map() }
  send.mockImplementation(({ params }) => {
    meta.syncIDMap.set(params.SyncID, true)
    return true
  })
})
afterEach(() => {
  cleanup()
  vi.clearAllTimers()
  vi.useRealTimers()
})

describe('session skills protocol and UI', () => {
  it('waits for data rather than ending loading on an early acknowledgement', () => {
    render(<SessionSkills />)
    expect(send).toHaveBeenCalledTimes(2)
    expect(screen.getByText('SessionSkills.refresh')).toBeDisabled()
    act(() => {
      meta.syncIDMap.clear()
      store.setState({ syncIDUpdate: 1 })
    })
    expect(screen.getByText('SessionSkills.refresh')).toBeDisabled()
    publish('loadedSkillsUpdate')
    expect(screen.getByText('SessionSkills.refresh')).not.toBeDisabled()
  })
  it('keeps a load pending until the authoritative loaded list includes that skill', () => {
    render(<SessionSkills />)
    available()
    fireEvent.click(screen.getByText('SessionSkills.load'))
    const payload = send.mock.calls[send.mock.calls.length - 1][0]
    expect(payload.params).toMatchObject({
      SyncType: 'load_skill_sync',
      SyncJsonInput: JSON.stringify({ skill_names: ['review'] }),
    })
    expect(screen.getByText('SessionSkills.load')).toBeDisabled()
    act(() => {
      meta.syncIDMap.clear()
      store.setState({ syncIDUpdate: 1 })
    })
    expect(screen.queryByText('SessionSkills.loadedSuccess')).toBeNull()
    raw.loadedSkills = { skills: [{ name: 'review', description: 'Read code' }], total: 1 }
    publish('loadedSkillsUpdate')
    expect(screen.getByText('SessionSkills.loadedSuccess')).toBeInTheDocument()
    expect(screen.queryByText('SessionSkills.load')).toBeNull()
  })
  it('shows timeout and permits retry instead of an endless spinner', () => {
    render(<SessionSkills />)
    act(() => {
      vi.advanceTimersByTime(30000)
    })
    expect(screen.getByRole('alert')).toHaveTextContent('SessionSkills.timeout')
    expect(screen.getByText('SessionSkills.refresh')).not.toBeDisabled()
    fireEvent.click(screen.getByText('SessionSkills.refresh'))
    expect(send).toHaveBeenCalledTimes(4)
  })
  it('refreshes an acknowledged load only once and reports unconfirmed results as timeout', () => {
    render(<SessionSkills />)
    available()
    publish('loadedSkillsUpdate')
    fireEvent.click(screen.getByText('SessionSkills.load'))
    act(() => {
      meta.syncIDMap.clear()
      store.setState({ syncIDUpdate: 1 })
    })
    const count = send.mock.calls.filter(([payload]) => payload.params.SyncType === 'skill_loaded_sync').length
    publish('loadedSkillsUpdate')
    publish('loadedSkillsUpdate')
    expect(send.mock.calls.filter(([payload]) => payload.params.SyncType === 'skill_loaded_sync')).toHaveLength(count)
    expect(screen.queryByText('SessionSkills.loadedSuccess')).toBeNull()
    act(() => {
      vi.advanceTimersByTime(30000)
    })
    expect(screen.getByRole('alert')).toHaveTextContent('SessionSkills.timeout')
  })
  it('uses the pinned detail payload and renders documents as read-only text', () => {
    render(<SessionSkills />)
    available()
    fireEvent.click(screen.getByText('review'))
    expect(send.mock.calls[send.mock.calls.length - 1][0].params).toMatchObject({
      SyncType: 'skill_detail_sync',
      SyncJsonInput: JSON.stringify({ skill_name: 'review' }),
    })
    raw.skillDetails.set('review', {
      name: 'review',
      loaded: false,
      skill_md: '<script>unsafe()</script>',
      file_tree: 'SKILL.md',
    })
    publish('skillDetailsUpdate')
    expect(screen.getByText('<script>unsafe()</script>')).toBeInTheDocument()
    expect(document.querySelector('script')).toBeNull()
  })
  it('searches from page one and refuses pagination for an unsubmitted query', () => {
    render(<SessionSkills />)
    available()
    raw.availableSkills.has_more = true
    publish('availableSkillsUpdate')
    fireEvent.change(screen.getByPlaceholderText('SessionSkills.searchPlaceholder'), { target: { value: 'audit' } })
    expect(screen.getByText('SessionSkills.more')).toBeDisabled()
    fireEvent.click(screen.getByText('SessionSkills.search'))
    expect(send.mock.calls[send.mock.calls.length - 1][0].params.SyncJsonInput).toBe(
      JSON.stringify({ page: 1, page_size: 50, query: 'audit' }),
    )
    expect(screen.queryByText('review')).toBeNull()
  })
  it('reports a rejected send and cancels pending timers when the session changes', () => {
    send.mockReturnValue(false)
    const view = render(<SessionSkills />)
    expect(screen.getByRole('alert')).toHaveTextContent('SessionSkills.sendFailed')
    act(() => {
      session = 'session-b'
      meta = { syncIDMap: new Map() }
      view.rerender(<SessionSkills />)
    })
    expect(send.mock.calls.every(([payload]) => payload.token === 'session-a' || payload.token === 'session-b')).toBe(
      true,
    )
    view.unmount()
    expect(vi.getTimerCount()).toBe(0)
  })
})
