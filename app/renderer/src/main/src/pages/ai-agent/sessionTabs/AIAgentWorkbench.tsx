import React, { useEffect, useRef, useState } from 'react'
import { Modal } from 'antd'
import { useMemoizedFn } from 'ahooks'
import { AIAgentPane } from '../AIAgent'
import type { AIAgentProps } from '../aiAgentType'
import type { AISession } from '../type/aiChat'
import { grpcQueryAISession } from '../grpc'
import { getRemoteValue, setRemoteValue } from '@/utils/kv'
import { randomString } from '@/utils/randomUtil'
import { DigitalEmployeeProvider } from '@/pages/digitalEmployee/DigitalEmployeeContext'
import { globalSessionEngine } from '@/pages/ai-re-act/hooks/ChatMultiSessionController'
import emiter from '@/utils/eventBus/eventBus'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { SessionTabsContext } from './SessionTabsContext'
import { parseSessionTabCache, sessionMatchesDelete, type CachedSessionTab } from './tabCache'
import styles from './SessionTabs.module.scss'

interface Tab extends CachedSessionTab {
  session?: AISession
}
const CACHE_KEY = 'AI-Senso.session-tabs.v1'
const freshTab = (): Tab => ({ id: `ai-session-${randomString(16)}` })

export const AIAgentWorkbench: React.FC<AIAgentProps> = (props) => {
  const { t } = useI18nNamespaces(['aiAgent'])
  const [tabs, setTabs] = useState<Tab[]>([])
  const [activeId, setActiveId] = useState('')
  const [ready, setReady] = useState(false)
  const [error, setError] = useState(false)
  const [saveError, setSaveError] = useState(false)
  const mounted = useRef(true)
  const restoreEpoch = useRef(0)
  const initialize = useMemoizedFn(async () => {
    const epoch = ++restoreEpoch.current
    setError(false)
    try {
      const cached = parseSessionTabCache((await getRemoteValue(CACHE_KEY)) || '')
      const ids = cached?.tabs.flatMap((tab) => (tab.sessionId ? [tab.sessionId] : [])) || []
      const sessions = ids.length
        ? (
            await grpcQueryAISession(
              {
                Pagination: { Page: 1, Limit: ids.length, OrderBy: 'last_used_at', Order: 'desc' },
                Filter: { SessionID: ids },
              },
              true,
            )
          ).Data
        : []
      const byId = new Map(sessions.map((session) => [session.SessionID, session]))
      if (restoreEpoch.current !== epoch) return
      const restored: Tab[] = (cached?.tabs || [])
        .filter((tab) => !tab.sessionId || byId.has(tab.sessionId))
        .map((tab) => ({
          ...tab,
          title: (tab.sessionId ? byId.get(tab.sessionId)?.Title : undefined) || tab.title,
          session: tab.sessionId ? { ...byId.get(tab.sessionId)!, isCreate: false } : undefined,
        }))
      if (!restored.length) restored.push(freshTab())
      setTabs(restored)
      setActiveId(restored.some((tab) => tab.id === cached?.activeId) ? cached!.activeId : restored[0].id)
      setReady(true)
    } catch {
      if (restoreEpoch.current === epoch) setError(true)
    }
  })
  useEffect(() => {
    mounted.current = true
    initialize()
    return () => {
      mounted.current = false
      restoreEpoch.current++
    }
  }, [])
  // Serialize writes so a slow older cache write cannot resurrect a closed tab.
  const writeQueue = useRef(Promise.resolve())
  useEffect(() => {
    if (!ready) return
    const value = JSON.stringify({
      version: 1,
      activeId,
      tabs: tabs.map(({ id, sessionId, title, employeeId, agentId }) => ({
        id,
        sessionId,
        title,
        employeeId,
        agentId,
      })),
    })
    writeQueue.current = writeQueue.current
      .catch(() => {})
      .then(() => setRemoteValue(CACHE_KEY, value))
      .then(() => {
        if (mounted.current) setSaveError(false)
      })
      .catch(() => {
        if (mounted.current) setSaveError(true)
      })
  }, [tabs, activeId, ready])
  const openSession = useMemoizedFn((session: AISession) => {
    if (!mounted.current) return
    setTabs((current) => {
      const existing = current.find((tab) => tab.sessionId === session.SessionID)
      if (existing) {
        setActiveId(existing.id)
        return current
      }
      const tab = {
        ...freshTab(),
        sessionId: session.SessionID,
        title: session.Title,
        session: { ...session, isCreate: false },
      }
      setActiveId(tab.id)
      return [...current, tab]
    })
  })
  const newTab = useMemoizedFn((selection?: { employeeId?: string; agentId?: number }) => {
    if (!mounted.current) return
    const tab = { ...freshTab(), ...selection }
    setTabs((current) => [...current, tab])
    setActiveId(tab.id)
  })
  useEffect(() => {
    const update = (raw: string) => {
      try {
        const data = JSON.parse(raw)
        if (data.type === 'updateSession' && data.updates?.Title) {
          setTabs((current) =>
            current.map((tab) => (tab.sessionId === data.sessionId ? { ...tab, title: data.updates.Title } : tab)),
          )
        }
        if (data.type === 'deletedSessions') {
          setTabs((current) => {
            const next = current.filter((tab) => !sessionMatchesDelete(tab.session, data.request))
            if (!next.length) next.push(freshTab())
            setActiveId((id) => (next.some((tab) => tab.id === id) ? id : next[0].id))
            return next
          })
        }
      } catch {
        /* unrelated history event */
      }
    }
    emiter.on('sessionData', update)
    return () => emiter.off('sessionData', update)
  }, [])
  const remove = (tab: Tab) => {
    const close = () => {
      setTabs((current) => {
        const index = current.findIndex((item) => item.id === tab.id)
        const next = current.filter((item) => item.id !== tab.id)
        if (!next.length) next.push(freshTab())
        if (activeId === tab.id) setActiveId(next[Math.min(index, next.length - 1)].id)
        return next
      })
    }
    if (tab.sessionId && globalSessionEngine.getSessionExecute(tab.sessionId)) {
      Modal.confirm({ title: t('SessionTabs.closeRunning'), onOk: close })
    } else close()
  }
  if (!ready)
    return (
      <div role="status">
        {error ? <button onClick={initialize}>{t('SessionTabs.restoreFailed')}</button> : t('SessionTabs.restoring')}
      </div>
    )
  return (
    <div className={styles.workspace}>
      {saveError && <div role="alert">{t('SessionTabs.saveFailed')}</div>}
      <div className={styles.tabs} role="tablist" aria-label={t('SessionTabs.label')}>
        {tabs.map((tab) => (
          <div key={tab.id} className={styles.tab}>
            <button
              role="tab"
              aria-selected={activeId === tab.id}
              aria-controls={`pane-${tab.id}`}
              id={`tab-${tab.id}`}
              onClick={() => setActiveId(tab.id)}
              title={tab.title}
            >
              {tab.title || t('SessionTabs.newChat')}
            </button>
            <button aria-label={t('SessionTabs.close')} onClick={() => remove(tab)}>
              ×
            </button>
          </div>
        ))}
        <button aria-label={t('SessionTabs.newTab')} onClick={() => newTab()}>
          ＋
        </button>
      </div>
      {tabs.map((tab) => (
        <div
          key={tab.id}
          id={`pane-${tab.id}`}
          role="tabpanel"
          aria-labelledby={`tab-${tab.id}`}
          hidden={activeId !== tab.id}
          className={styles.pane}
        >
          <SessionTabsContext.Provider
            value={{
              pageId: tab.id,
              active: activeId === tab.id,
              openSession,
              newTab,
              onSessionChange: (session) =>
                setTabs((current) => {
                  const existing = current.find((item) => item.id === tab.id)
                  if (!existing || (existing.sessionId === session?.SessionID && (existing.title || !session?.Title)))
                    return current
                  return current.map((item) =>
                    item.id === tab.id
                      ? { ...item, session, sessionId: session?.SessionID, title: session?.Title }
                      : item,
                  )
                }),
            }}
          >
            <DigitalEmployeeProvider
              enabled
              inheritSelection
              initialEmployeeId={tab.employeeId}
              initialAgentId={tab.agentId}
            >
              <AIAgentPane {...props} pageId={tab.id} initialSession={tab.session} />
            </DigitalEmployeeProvider>
          </SessionTabsContext.Provider>
        </div>
      ))}
    </div>
  )
}
