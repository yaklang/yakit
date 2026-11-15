import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AISession } from '../../type/aiChat'

const key = 'yakit.coding-project-preferences'
beforeEach(() => {
  vi.resetModules()
  localStorage.removeItem(key)
})

describe('project list preferences', () => {
  it('persists pins and reversible removals without deleting other preferences', async () => {
    const preferences = await import('../projectPreferences')
    preferences.setCodingProjectPinned('one', true)
    preferences.setCodingProjectPinned('one', true)
    preferences.setCodingProjectHidden('two', true)
    expect(JSON.parse(localStorage.getItem(key)!)).toMatchObject({ pinned: ['one'], hidden: ['two'] })
    vi.resetModules()
    const reloaded = await import('../projectPreferences')
    reloaded.setCodingProjectHidden('two', false)
    expect(JSON.parse(localStorage.getItem(key)!)).toMatchObject({ pinned: ['one'], hidden: [] })
    reloaded.setCodingProjectPinned('one', false)
    expect(JSON.parse(localStorage.getItem(key)!)).toMatchObject({ pinned: [] })
  })
  it('marks chats read and makes later activity unread again', async () => {
    const { isCodingSessionUnread, markCodingSessionsRead } = await import('../projectPreferences')
    const session = { SessionID: 'chat', CreatedAt: 10, UpdatedAt: 20, LastUsedAt: 15 } as AISession
    expect(isCodingSessionUnread(session, {})).toBe(true)
    markCodingSessionsRead([session])
    const saved = JSON.parse(localStorage.getItem(key)!)
    expect(isCodingSessionUnread(session, saved.readAt)).toBe(false)
    expect(isCodingSessionUnread({ ...session, UpdatedAt: 21 }, saved.readAt)).toBe(true)
    markCodingSessionsRead([{ ...session, UpdatedAt: 10 }])
    expect(JSON.parse(localStorage.getItem(key)!).readAt.chat).toBe(20)
  })
  it('recovers from corrupt persisted settings', async () => {
    localStorage.setItem(key, 'broken json')
    const { setCodingProjectPinned } = await import('../projectPreferences')
    setCodingProjectPinned('one', true)
    expect(JSON.parse(localStorage.getItem(key)!)).toEqual({ pinned: ['one'], hidden: [], readAt: {} })
  })
})
