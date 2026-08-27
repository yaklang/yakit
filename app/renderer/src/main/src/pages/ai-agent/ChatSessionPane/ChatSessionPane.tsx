import { memo, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useMemoizedFn, useUpdateEffect } from 'ahooks'
import classNames from 'classnames'
import { Tooltip } from 'antd'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitInput } from '@/components/yakitUI/YakitInput/YakitInput'
import { YakitModal } from '@/components/yakitUI/YakitModal/YakitModal'
import { YakitRoundCornerTag } from '@/components/yakitUI/YakitRoundCornerTag/YakitRoundCornerTag'
import { OutlineDesktopcomputerIcon, OutlineMessageCirclePlusIcon, OutlineSearchIcon } from '@/assets/icon/outline'
import { DingtalkIcon, FeishuIcon } from '@/assets/commonProcessIcons'
import HistoryChatList from '../historyChat/HistoryChatList/HistoryChatList'
import useSessionList from '../historyChat/HistoryChatList/hook/useSessionList'
import { AI_AGENT_HISTORY_AI_SOURCES } from '@/pages/ai-re-act/hooks/useGetChatDataStoreKey'
import type { AISession } from '../type/aiChat'
import type { AISource } from '@/pages/ai-re-act/hooks/grpcApi'
import emiter from '@/utils/eventBus/eventBus'
import { JSONParseLog } from '@/utils/tool'
import { grpcDeleteAISession } from '../grpc'
import styles from './ChatSessionPane.module.scss'
import { onNewChat } from '../historyChat/HistoryChat'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import {
  filterHistorySessionsBySource,
  getHistorySourceQueryPlatform,
  getHistorySourceQuerySources,
  getSessionDisplayTitle,
  type HistorySourceFilter,
} from '../historyChat/source'
import useAIAgentDispatcher from '../useContext/useDispatcher'
import useCurrentSessionId from '@/pages/ai-re-act/hooks/useCurrentSessionId'

const HISTORY_SOURCE_FILTER_OPTIONS: {
  key: HistorySourceFilter
  title: string
  icon: ReactNode
}[] = [
  { key: 'local', title: 'Yakit 本地会话', icon: <OutlineDesktopcomputerIcon /> },
  { key: 'feishu', title: '飞书会话', icon: <FeishuIcon /> },
  { key: 'dingtalk', title: '钉钉会话', icon: <DingtalkIcon /> },
]

const IM_HISTORY_REFRESH_INTERVAL_MS = 5000

interface SessionDataPayload {
  type: 'refresh' | 'loadNextPage' | 'clear' | 'prependSession' | 'updateSession'
  payload?: AISession
  updates?: Partial<AISession>
  sessionId?: string
}

const isSessionMatchSource = (session: AISession, sources: AISource[]) => {
  const sessionSource = session.Source ?? ''
  return sources.some((source) => sessionSource === source)
}

const SessionSearchCommand: React.FC<{
  sessions: AISession[]
  onSelect: (session: AISession) => void
  onClose: () => void
}> = memo(({ sessions, onSelect, onClose }) => {
  const { t } = useI18nNamespaces(['yakitUi'])
  const [search, setSearch] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)
  const currentSessionId = useCurrentSessionId()

  const filteredSessions = useMemo(() => {
    const keyword = search.trim().toLowerCase()
    if (!keyword) return sessions
    return sessions.filter((item) => getSessionDisplayTitle(item).toLowerCase().includes(keyword))
  }, [search, sessions])

  useEffect(() => {
    setActiveIndex(0)
  }, [search])

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  const handleKeyDown = useMemoizedFn((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((index) => Math.min(index + 1, Math.max(filteredSessions.length - 1, 0)))
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((index) => Math.max(index - 1, 0))
      return
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      const item = filteredSessions[activeIndex]
      if (item) onSelect(item)
      return
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    }
  })

  return (
    <div className={styles['session-command']}>
      <div className={styles['command-input']}>
        <YakitInput
          size="small"
          bordered={false}
          autoFocus
          prefix={<OutlineSearchIcon className={styles['search-icon']} />}
          placeholder={t('YakitInput.searchKeyWordPlaceholder')}
          allowClear
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={handleKeyDown}
        />
      </div>
      <div ref={listRef} className={styles['command-list']}>
        {filteredSessions.length === 0 ? (
          <div className={styles['command-empty']}>{t('YakitEmpty.searchEmpty')}</div>
        ) : (
          filteredSessions.map((item, index) => {
            const title = getSessionDisplayTitle(item)
            return (
              <div
                key={item.SessionID}
                data-index={index}
                className={classNames(styles['command-item'], {
                  [styles['command-item-active']]: index === activeIndex,
                  [styles['command-item-current']]: item.SessionID === currentSessionId,
                })}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => onSelect(item)}
                title={title}
              >
                <span className={classNames(styles['command-item-title'], 'yakit-content-single-ellipsis')}>
                  {title}
                </span>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
})

const ChatSessionPane: React.FC = memo(() => {
  const { t } = useI18nNamespaces(['aiAgent'])
  const [searchOpen, setSearchOpen] = useState(false)
  const [historySourceFilter, setHistorySourceFilter] = useState<HistorySourceFilter>('local')
  const historyQuerySources = useMemo(
    () => getHistorySourceQuerySources(AI_AGENT_HISTORY_AI_SOURCES, historySourceFilter),
    [historySourceFilter],
  )
  const historyQueryPlatform = useMemo(() => getHistorySourceQueryPlatform(historySourceFilter), [historySourceFilter])
  const [{ sessions }, dispatcher] = useSessionList(historyQuerySources, historyQueryPlatform)
  const { setActiveChat, setSetting } = useAIAgentDispatcher()
  const visibleSessions = useMemo(
    () => filterHistorySessionsBySource(sessions, historySourceFilter),
    [historySourceFilter, sessions],
  )

  const handleResetSessions = useMemoizedFn(() => {
    dispatcher.setSessions?.([])
    dispatcher.resetPagination?.()
  })

  const handleCloseSearch = useMemoizedFn(() => {
    setSearchOpen(false)
  })

  const handleSetHistorySourceFilter = useMemoizedFn((filter: HistorySourceFilter) => {
    if (historySourceFilter === filter) return
    setHistorySourceFilter(filter)
  })

  const isSessionVisibleInCurrentSource = useMemoizedFn((session: AISession) => {
    if (!isSessionMatchSource(session, historyQuerySources)) return false
    return filterHistorySessionsBySource([session], historySourceFilter).length > 0
  })

  const handleSelectSession = useMemoizedFn((info: AISession) => {
    setSetting?.((old) => ({
      ...old,
      SyncPerceptionTrigger: info?.StartParams?.SyncPerceptionTrigger ?? false,
      EnablePlan: info?.StartParams?.EnablePlan ?? false,
      Strategy: {
        EnableMultiAgent: info?.StartParams?.Strategy?.EnableMultiAgent ?? false,
        EnableGoalMode: info?.StartParams?.Strategy?.EnableGoalMode ?? false,
        GoalMinIterations: info?.StartParams?.Strategy?.GoalMinIterations ?? 0,
        MaxSubAgents: info?.StartParams?.Strategy?.MaxSubAgents ?? 0,
      },
    }))
    setActiveChat?.(info)
    setSearchOpen(false)
  })

  useEffect(() => {
    const handleSessionData = async (data: string) => {
      const payload = JSONParseLog(data, { throwOnError: false }) as SessionDataPayload | undefined
      switch (payload?.type) {
        case 'refresh':
          if (payload.sessionId) {
            await dispatcher.refreshSession?.(payload.sessionId)
          } else {
            handleResetSessions()
            await dispatcher.loadHistoryData?.(true)
          }
          break
        case 'loadNextPage':
          await dispatcher.loadHistoryData?.()
          break
        case 'clear':
          await grpcDeleteAISession({ DeleteAll: true }, true)
          handleResetSessions()
          break
        case 'prependSession':
          if (payload.payload && isSessionVisibleInCurrentSource(payload.payload)) {
            dispatcher.setSessions((prev) => [payload.payload!, ...prev])
          }
          break
        case 'updateSession':
          if (payload.sessionId && payload.updates) {
            dispatcher.setSessions((prev) =>
              prev.map((item) => (item.SessionID === payload.sessionId ? { ...item, ...payload.updates } : item)),
            )
          }
          break
        default:
          break
      }
    }
    emiter.on('sessionData', handleSessionData)
    return () => {
      emiter.off('sessionData', handleSessionData)
    }
  }, [dispatcher, handleResetSessions, historyQuerySources, isSessionVisibleInCurrentSource])

  useUpdateEffect(() => {
    handleResetSessions()
    dispatcher.loadHistoryData?.(true)
  }, [historySourceFilter])

  useEffect(() => {
    if (historySourceFilter === 'local') return

    const refreshIfVisible = () => {
      if (document.visibilityState === 'visible') {
        handleResetSessions()
        dispatcher.loadHistoryData?.(true)
      }
    }

    window.addEventListener('focus', refreshIfVisible)
    document.addEventListener('visibilitychange', refreshIfVisible)
    const timer = window.setInterval(refreshIfVisible, IM_HISTORY_REFRESH_INTERVAL_MS)

    return () => {
      window.removeEventListener('focus', refreshIfVisible)
      document.removeEventListener('visibilitychange', refreshIfVisible)
      window.clearInterval(timer)
    }
  }, [dispatcher, handleResetSessions, historySourceFilter])

  return (
    <div className={styles['chat-session-pane']}>
      <div className={styles['chat-session-list-header']}>
        <div className={styles['header-title']}>
          <span className={styles['title-text']}>{t('ChatSessionPane.sessionList')}</span>
          <YakitRoundCornerTag wrapperClassName={styles['session-count-tag']}>
            {visibleSessions.length}
          </YakitRoundCornerTag>
          <div className={styles['source-filter']}>
            {HISTORY_SOURCE_FILTER_OPTIONS.map((item) => {
              const active = historySourceFilter === item.key
              return (
                <Tooltip key={item.key} title={item.title} placement="top">
                  <button
                    type="button"
                    aria-label={item.title}
                    className={classNames(styles['source-filter-item'], styles[`source-filter-item-${item.key}`], {
                      [styles['source-filter-item-active']]: active,
                    })}
                    onClick={() => handleSetHistorySourceFilter(item.key)}
                  >
                    {item.icon}
                  </button>
                </Tooltip>
              )
            })}
          </div>
        </div>
        <div className={styles['header-actions']}>
          <YakitButton type="text2" icon={<OutlineMessageCirclePlusIcon />} onClick={onNewChat} />
          <YakitButton
            type="text2"
            isActive={searchOpen}
            icon={<OutlineSearchIcon />}
            onClick={() => setSearchOpen(true)}
          />
        </div>
      </div>
      <YakitModal
        visible={searchOpen}
        footer={null}
        hiddenHeader
        type="white"
        width={480}
        destroyOnClose
        maskClosable
        wrapClassName={styles['session-search-modal']}
        bodyStyle={{ padding: 0 }}
        onCancel={handleCloseSearch}
      >
        <SessionSearchCommand sessions={visibleSessions} onSelect={handleSelectSession} onClose={handleCloseSearch} />
      </YakitModal>
      <div className={styles['chat-session-list']}>
        <HistoryChatList
          search=""
          sessionList={visibleSessions}
          aiSource={historyQuerySources}
          setSessions={dispatcher.setSessions}
          loadHistoryData={dispatcher.loadHistoryData}
          getSessions={dispatcher.getSessions}
        />
      </div>
    </div>
  )
})

export default ChatSessionPane
