import { createContext, useContext } from 'react'
import type { AISession } from '../type/aiChat'

export const SessionTabsContext = createContext<{
  pageId?: string
  active: boolean
  openSession?: (session: AISession) => void
  onSessionChange?: (session?: AISession) => void
  newTab?: (selection?: { employeeId?: string; agentId?: number }) => void
}>({ active: true })
export const useSessionTab = () => useContext(SessionTabsContext)
export const isSessionTabEvent = (active: boolean, pageId?: string, targetPageId?: string) =>
  active && (!targetPageId || targetPageId === pageId)
