import React, { useEffect } from 'react'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useSessionTab, isSessionTabEvent } from '../SessionTabsContext'
import { parseSessionTabCache, sessionMatchesDelete } from '../tabCache'

const mocks = vi.hoisted(() => ({
  read: vi.fn(),
  write: vi.fn(),
  query: vi.fn(),
  disposed: vi.fn(),
  events: new Map<string, Set<(raw: string) => void>>(),
}))
vi.mock('@/utils/kv', () => ({ getRemoteValue: mocks.read, setRemoteValue: mocks.write }))
vi.mock('../../grpc', () => ({ grpcQueryAISession: mocks.query }))
vi.mock('@/pages/digitalEmployee/DigitalEmployeeContext', () => ({
  DigitalEmployeeProvider: ({ children }: any) => children,
}))
vi.mock('@/pages/ai-re-act/hooks/ChatMultiSessionController', () => ({
  globalSessionEngine: { getSessionExecute: () => false },
}))
vi.mock('@/i18n/useI18nNamespaces', () => ({ useI18nNamespaces: () => ({ t: (key: string) => key }) }))
vi.mock('@/utils/eventBus/eventBus', () => ({
  default: {
    on: (name: string, fn: any) => {
      if (!mocks.events.has(name)) mocks.events.set(name, new Set())
      mocks.events.get(name)!.add(fn)
    },
    off: (name: string, fn: any) => mocks.events.get(name)?.delete(fn),
  },
}))
vi.mock('../../AIAgent', () => ({
  AIAgentPane: ({ pageId, initialSession }: any) => {
    const tab = useSessionTab()
    useEffect(() => {
      tab.onSessionChange?.(initialSession)
      return () => mocks.disposed(pageId)
    }, [])
    return (
      <div>
        <input aria-label="draft" defaultValue="" />
        <button onClick={() => tab.openSession?.(session('same'))}>history</button>
        <span>{pageId}</span>
      </div>
    )
  },
}))
import { AIAgentWorkbench } from '../AIAgentWorkbench'
const session = (id: string) =>
  ({ SessionID: id, Title: id, Source: 'ai', CreatedAt: 100, StartParams: { EnablePlan: false } }) as any

beforeEach(() => {
  mocks.read.mockReset().mockResolvedValue('')
  mocks.write.mockReset().mockResolvedValue(undefined)
  mocks.query.mockReset().mockResolvedValue({ Data: [] })
  mocks.disposed.mockReset()
  mocks.events.clear()
})
afterEach(cleanup)

describe('AI Senso session tabs', () => {
  it('ignores delayed panel navigation from a background page while retaining legacy visible-page events', () => {
    expect(isSessionTabEvent(true, 'front', 'background')).toBe(false)
    expect(isSessionTabEvent(false, 'background', 'background')).toBe(false)
    expect(isSessionTabEvent(true, 'front', 'front')).toBe(true)
    expect(isSessionTabEvent(true, 'front')).toBe(true)
  })
  it('keeps independent drafts mounted when switching and closes only the selected pane', async () => {
    render(<AIAgentWorkbench pageId="workspace" />)
    await screen.findByRole('tab')
    fireEvent.change(screen.getByLabelText('draft'), { target: { value: 'first draft' } })
    fireEvent.click(screen.getByLabelText('SessionTabs.newTab'))
    expect(screen.getAllByRole('tab')).toHaveLength(2)
    expect(mocks.disposed).not.toHaveBeenCalled()
    fireEvent.change(within(screen.getByRole('tabpanel')).getByLabelText('draft'), {
      target: { value: 'second draft' },
    })
    fireEvent.click(screen.getAllByRole('tab')[0])
    const first = screen.getByRole('tabpanel')
    expect((within(first).getByLabelText('draft') as HTMLInputElement).value).toBe('first draft')
    fireEvent.click(screen.getAllByLabelText('SessionTabs.close')[1])
    expect(mocks.disposed).toHaveBeenCalledTimes(1)
    expect((within(screen.getByRole('tabpanel')).getByLabelText('draft') as HTMLInputElement).value).toBe('first draft')
  })
  it('deduplicates opening history, persists only references, and drops missing sessions on restart', async () => {
    mocks.read.mockResolvedValue(
      JSON.stringify({
        version: 1,
        activeId: 'gone',
        tabs: [
          { id: 'one', sessionId: 'same' },
          { id: 'gone', sessionId: 'deleted' },
        ],
      }),
    )
    mocks.query.mockResolvedValue({ Data: [session('same')] })
    render(<AIAgentWorkbench pageId="workspace" />)
    await screen.findByRole('tab', { name: 'same' })
    fireEvent.click(screen.getByText('history'))
    fireEvent.click(screen.getByText('history'))
    expect(screen.getAllByRole('tab')).toHaveLength(1)
    await waitFor(() => expect(mocks.write).toHaveBeenCalled())
    const saved = JSON.parse(mocks.write.mock.calls.at(-1)![1])
    expect(saved.tabs).toHaveLength(1)
    expect(saved.tabs[0].sessionId).toBe('same')
    expect(JSON.stringify(saved)).not.toContain('StartParams')
  })
  it('does not overwrite caches when history restoration fails', async () => {
    mocks.read.mockRejectedValue(new Error('offline'))
    render(<AIAgentWorkbench pageId="workspace" />)
    await screen.findByText('SessionTabs.restoreFailed')
    expect(mocks.write).not.toHaveBeenCalled()
  })
  it('reports a cache write failure while keeping the tabs usable', async () => {
    mocks.write.mockRejectedValue(new Error('disk unavailable'))
    render(<AIAgentWorkbench pageId="workspace" />)
    await screen.findByRole('tab')
    await screen.findByRole('alert')
    expect(screen.getByRole('tab')).toBeTruthy()
    mocks.write.mockResolvedValue(undefined)
    fireEvent.click(screen.getByLabelText('SessionTabs.newTab'))
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull())
    expect(screen.getAllByRole('tab')).toHaveLength(2)
  })
  it('rejects malformed caches and duplicate session references', () => {
    expect(parseSessionTabCache('{bad')).toBeUndefined()
    const parsed = parseSessionTabCache(
      JSON.stringify({ version: 1, tabs: [{ id: 'a', sessionId: 's' }, { id: 'b', sessionId: 's' }, { id: 'a' }] }),
    )!
    expect(parsed.tabs).toHaveLength(1)
    expect(parsed.activeId).toBe('a')
  })
  it('matches deletion by session, source, platform and time without removing other tabs', () => {
    const item = { ...session('one'), Source: 'im', IMSourceMeta: { Platform: 'feishu' } }
    expect(sessionMatchesDelete(item, { Filter: { SessionID: ['two'] } })).toBe(false)
    expect(sessionMatchesDelete(item, { Filter: { Source: ['ai'] } })).toBe(false)
    expect(sessionMatchesDelete(item, { Filter: { Platform: ['dingtalk'] } })).toBe(false)
    expect(sessionMatchesDelete(item, { Filter: { BeforeTimestamp: 99999 } })).toBe(false)
    expect(sessionMatchesDelete(item, { Filter: { BeforeTimestamp: 100000, Platform: ['feishu'] } })).toBe(true)
  })
})
