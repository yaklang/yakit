import { bindExternalStoreHook, createExternalStore } from '@/utils/createExternalStore'
import type { AISession } from '../type/aiChat'

interface ProjectPreferences {
  pinned: string[]
  hidden: string[]
  readAt: Record<string, number>
}

const key = 'yakit.coding-project-preferences'
const read = (): ProjectPreferences => {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '{}')
    return {
      pinned: Array.isArray(value.pinned) ? value.pinned.filter((id: unknown) => typeof id === 'string') : [],
      hidden: Array.isArray(value.hidden) ? value.hidden.filter((id: unknown) => typeof id === 'string') : [],
      readAt: Object.fromEntries(
        Object.entries(value.readAt || {}).filter(([, time]) => typeof time === 'number' && Number.isFinite(time)),
      ) as Record<string, number>,
    }
  } catch {
    return { pinned: [], hidden: [], readAt: {} }
  }
}
const store = createExternalStore(read())
export const useCodingProjectPreferences = bindExternalStoreHook(store)

const update = (next: ProjectPreferences) => {
  localStorage.setItem(key, JSON.stringify(next))
  store.setSnapshot(() => next)
}
export const setCodingProjectPinned = (id: string, pinned: boolean) => {
  const value = store.getSnapshot()
  update({ ...value, pinned: [...value.pinned.filter((item) => item !== id), ...(pinned ? [id] : [])] })
}
// 仅控制本机项目列表，不删除后端绑定、聊天或磁盘目录。
export const setCodingProjectHidden = (id: string, hidden: boolean) => {
  const value = store.getSnapshot()
  update({ ...value, hidden: [...value.hidden.filter((item) => item !== id), ...(hidden ? [id] : [])] })
}
const sessionVersion = (session: AISession) =>
  Math.max(session.UpdatedAt || 0, session.LastUsedAt || 0, session.CreatedAt || 0)
export const isCodingSessionUnread = (session: AISession, readAt: ProjectPreferences['readAt']) =>
  !(session.SessionID in readAt) || sessionVersion(session) > readAt[session.SessionID]

export const markCodingSessionsRead = (sessions: AISession[]) => {
  const value = store.getSnapshot()
  const unread = sessions.filter((session) => isCodingSessionUnread(session, value.readAt))
  if (!unread.length) return
  update({
    ...value,
    readAt: {
      ...value.readAt,
      ...Object.fromEntries(unread.map((session) => [session.SessionID, sessionVersion(session)])),
    },
  })
}
