import type { FC } from 'react'
import { memo, useEffect, useRef, useState } from 'react'
import { useCreation, useInViewport, useMemoizedFn } from 'ahooks'
import classNames from 'classnames'
import moment from 'moment'
import { useStore } from 'zustand'
import { ChevronDownOutlined, ClockOutlined, LoadingOutlined } from '@yakit-libs/yakit-ui-icons/outline'
import { ChatAlt2Solid } from '@yakit-libs/yakit-ui-icons/solid'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { AI_AGENT_HISTORY_AI_SOURCES } from '@/pages/ai-re-act/hooks/useGetChatDataStoreKey'
import { AITaskStatus } from '@/pages/ai-re-act/hooks/grpcApi'
import { globalSessionEngine } from '@/pages/ai-re-act/hooks/ChatMultiSessionController'
import { JSONParseLog } from '@/utils/tool'
import { grpcQueryAISession } from '../../grpc'
import { openAIAgentChatTab } from '../../historyChat/HistoryChat'
import { mergeAISessionUpdate } from '../../historyChat/mergeAISessionUpdate'
import { getSessionDisplayTitle } from '../../historyChat/source'
import { normalizeTimestamp } from '../../historyChat/HistoryChatList/HistoryChatList'
import { idleSessionStore } from '../../historyChat/idleSessionStore'
import type { AISession } from '../../type/aiChat'
import useAIAgentDispatcher from '../../useContext/useDispatcher'
import useAIAgentStore from '../../useContext/useStore'
import { AIAgentTabListEnum, SwitchAIAgentTabEventEnum } from '../../defaultConstant'
import emiter from '@/utils/eventBus/eventBus'
import styles from './WelcomeRecentSessions.module.scss'

const RECENT_SESSION_LIMIT = 5

/** 大屏 5 条；中等高 3 条；小屏默认收起（手动展开时也按 3 条） */
export type WelcomeRecentSessionsDensity = 'full' | 'three' | 'collapsed'

const VISIBLE_COUNT_BY_DENSITY: Record<WelcomeRecentSessionsDensity, number> = {
  full: 5,
  three: 3,
  collapsed: 3,
}

export const getRecentSessionTimestamp = (item: AISession) => {
  // LastUsedAt 等 int64 经主进程 longs:String 后，零值可能是 '0'（真值），需先归一化再回退
  return normalizeTimestamp(item.LastUsedAt) || normalizeTimestamp(item.UpdatedAt) || normalizeTimestamp(item.CreatedAt)
}

export const formatRecentSessionTime = (
  timestamp: number,
  t: (key: string, options?: Record<string, unknown>) => string,
) => {
  if (!timestamp) return ''
  const now = moment()
  const time = moment(timestamp)
  const minutes = Math.max(now.diff(time, 'minutes'), 0)
  if (minutes < 1) return t('AIChatWelcome.justNow')
  if (minutes < 60) return t('AIChatWelcome.minutesAgo', { count: minutes })
  const hours = Math.max(now.diff(time, 'hours'), 0)
  if (hours < 24) return t('AIChatWelcome.hoursAgo', { count: hours })
  if (now.clone().startOf('day').diff(time.clone().startOf('day'), 'days') === 1) {
    return t('AIChatWelcome.yesterday')
  }
  return t('AIChatWelcome.monthDay', { month: time.month() + 1, day: time.date() })
}

interface WelcomeRecentSessionItemProps {
  item: AISession
  onSelect: (item: AISession) => void
}

const WelcomeRecentSessionItem: FC<WelcomeRecentSessionItemProps> = memo(({ item, onSelect }) => {
  const { t } = useI18nNamespaces(['aiAgent'])
  const store = useStore(globalSessionEngine.sessionStores, (stores) => stores.get(item.SessionID))
  const running = useStore(
    store ?? idleSessionStore,
    (state) => state.currentChatStatus.status === AITaskStatus.inProgress,
  )
  const title = useCreation(() => getSessionDisplayTitle(item), [item])
  const timeText = useCreation(
    () => formatRecentSessionTime(getRecentSessionTimestamp(item), t),
    [item.LastUsedAt, item.UpdatedAt, item.CreatedAt, t],
  )

  return (
    <div className={styles['welcome-recent-item']} title={title} onClick={() => onSelect(item)}>
      <div className={styles['welcome-recent-item-main']}>
        <span className={styles['welcome-recent-item-status']}>
          {running ? (
            <LoadingOutlined className={styles['welcome-recent-item-loading']} color="currentColor" />
          ) : (
            <ChatAlt2Solid className={styles['welcome-recent-item-chat']} color="currentColor" />
          )}
        </span>
        <span className={classNames(styles['welcome-recent-item-title'], 'yakit-content-single-ellipsis')}>
          {title}
        </span>
      </div>
      <span className={styles['welcome-recent-item-time']}>{timeText}</span>
    </div>
  )
})

interface WelcomeRecentSessionsProps {
  /** 按可用高度：full=5 / three=3 / collapsed=默认收起 */
  density?: WelcomeRecentSessionsDensity
}

const WelcomeRecentSessions: FC<WelcomeRecentSessionsProps> = memo(({ density = 'full' }) => {
  const { t } = useI18nNamespaces(['aiAgent'])
  const containerRef = useRef<HTMLDivElement>(null)
  const [inViewport = true] = useInViewport(containerRef)
  const [expanded, setExpanded] = useState(density !== 'collapsed')
  const [sessions, setSessions] = useState<AISession[]>([])
  const [total, setTotal] = useState(0)
  const { setActiveChat, setSetting } = useAIAgentDispatcher()
  const { openChatInNewTab } = useAIAgentStore()
  // 递增作废在途查询，避免可见性抖动 / 并发 refresh 时旧响应覆盖新结果
  const loadGenRef = useRef(0)
  const visibleCount = VISIBLE_COUNT_BY_DENSITY[density]
  const visibleSessions = useCreation(() => sessions.slice(0, visibleCount), [sessions, visibleCount])
  const showViewMore = total > visibleCount

  useEffect(() => {
    setExpanded(density !== 'collapsed')
  }, [density])

  const loadRecentSessions = useMemoizedFn(() => {
    const gen = ++loadGenRef.current
    return grpcQueryAISession(
      {
        Pagination: {
          Page: 1,
          Limit: RECENT_SESSION_LIMIT,
          OrderBy: 'last_used_at',
          Order: 'desc',
        },
        Filter: {
          Source: AI_AGENT_HISTORY_AI_SOURCES,
        },
      },
      true,
    )
      .then((res) => {
        if (gen !== loadGenRef.current) return
        setSessions((res.Data || []).slice(0, RECENT_SESSION_LIMIT))
        setTotal(res.Total || 0)
      })
      .catch(() => {})
  })

  useEffect(() => {
    if (!inViewport) return
    loadRecentSessions()
    return () => {
      // 可见性抖动 / 卸载时作废在途响应（等价 cancelled）
      loadGenRef.current += 1
    }
  }, [inViewport])

  const updateSession = useMemoizedFn((sessionId: string, updates: Partial<AISession>) => {
    setSessions((prev) => prev.map((session) => mergeAISessionUpdate(session, sessionId, updates)))
  })

  // 侧栏新建/删除/清空/增量更新后同步首页最近会话
  useEffect(() => {
    const handleSessionData = (data: string) => {
      const payload = JSONParseLog(data, { throwOnError: false }) as
        | {
            type?: string
            sessionId?: string
            updates?: Partial<AISession>
          }
        | undefined
      if (!payload?.type) return
      if (payload.type === 'updateSession') {
        if (payload.sessionId && payload.updates) {
          updateSession(payload.sessionId, payload.updates)
        }
        return
      }
      if (payload.type === 'refresh' || payload.type === 'clear' || payload.type === 'prependSession') {
        if (payload.type === 'clear') {
          loadGenRef.current += 1
          setSessions([])
          setTotal(0)
          return
        }
        loadRecentSessions()
      }
    }
    emiter.on('sessionData', handleSessionData)
    return () => {
      emiter.off('sessionData', handleSessionData)
    }
  }, [loadRecentSessions, updateSession])

  const handleSelect = useMemoizedFn((info: AISession) => {
    if (openChatInNewTab) {
      openAIAgentChatTab(info)
      return
    }
    setSetting?.((old) => ({
      ...old,
      SyncPerceptionTrigger: info?.StartParams?.SyncPerceptionTrigger ?? false,
      EnablePlan: info?.StartParams?.EnablePlan ?? false,
      SingleModelMode: info?.StartParams?.SingleModelMode ?? false,
      DisableMemoryTriage: info?.StartParams?.DisableMemoryTriage ?? false,
      Strategy: {
        EnableMultiAgent: info?.StartParams?.Strategy?.EnableMultiAgent ?? false,
        EnableGoalMode: info?.StartParams?.Strategy?.EnableGoalMode ?? false,
        GoalMinIterations: info?.StartParams?.Strategy?.GoalMinIterations ?? 0,
        MaxSubAgents: info?.StartParams?.Strategy?.MaxSubAgents ?? 0,
      },
    }))
    setActiveChat?.(info)
  })

  const handleViewMore = useMemoizedFn(() => {
    emiter.emit(
      'switchAIAgentTab',
      JSON.stringify({
        type: SwitchAIAgentTabEventEnum.SET_TAB_ACTIVE,
        params: { active: AIAgentTabListEnum.Session, show: true },
      }),
    )
  })

  if (sessions.length === 0) return null

  return (
    <div className={styles['welcome-recent-sessions']} ref={containerRef} data-ai-ripple-disabled>
      <div
        className={styles['welcome-recent-header']}
        onClick={() => setExpanded((prev) => !prev)}
        role="button"
        aria-expanded={expanded}
      >
        <ClockOutlined className={styles['welcome-recent-header-icon']} color="currentColor" />
        <span className={styles['welcome-recent-title']}>{t('AIChatWelcome.recentSessions')}</span>
        <ChevronDownOutlined
          className={classNames(styles['welcome-recent-header-arrow'], {
            [styles['welcome-recent-header-arrow-collapsed']]: !expanded,
          })}
          color="currentColor"
        />
      </div>
      <div
        className={classNames(styles['welcome-recent-list-wrapper'], {
          [styles['welcome-recent-list-wrapper-expanded']]: expanded,
        })}
      >
        <div className={styles['welcome-recent-list-inner']}>
          <div className={styles['welcome-recent-list']}>
            {visibleSessions.map((item) => (
              <WelcomeRecentSessionItem key={item.SessionID} item={item} onSelect={handleSelect} />
            ))}
          </div>
          {showViewMore && (
            <div className={styles['welcome-recent-more']} onClick={handleViewMore} role="button">
              {t('AIChatWelcome.viewMoreSessions')}
              <ChevronDownOutlined className={styles['welcome-recent-header-arrow']} color="currentColor" />
            </div>
          )}
        </div>
      </div>
    </div>
  )
})

export default WelcomeRecentSessions
