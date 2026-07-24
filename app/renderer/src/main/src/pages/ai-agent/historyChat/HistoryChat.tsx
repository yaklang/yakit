import { memo, useEffect, useMemo, useState, type ReactNode } from 'react'
import useAIAgentStore from '../useContext/useStore'
import useAIAgentDispatcher from '../useContext/useDispatcher'
import { useUpdateEffect } from 'ahooks'
import { yakitNotify } from '@/utils/notification'
import { ReActChatEventEnum } from '../defaultConstant'
import { OutlineDesktopcomputerIcon, OutlineMessageCirclePlusIcon, OutlineSearchIcon } from '@/assets/icon/outline'
import { DingtalkIcon, FeishuIcon } from '@/assets/commonProcessIcons'
import { Tooltip } from 'antd'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitDropdownMenu } from '@/components/yakitUI/YakitDropdownMenu/YakitDropdownMenu'
import { YakitPopconfirm } from '@/components/yakitUI/YakitPopconfirm/YakitPopconfirm'
import { YakitRoundCornerTag } from '@/components/yakitUI/YakitRoundCornerTag/YakitRoundCornerTag'
import { YakitInput } from '@/components/yakitUI/YakitInput/YakitInput'
import styles from './HistoryChat.module.scss'
import { AIAgentTriggerEventInfo } from '../aiAgentType'
import emiter from '@/utils/eventBus/eventBus'
import { grpcDeleteAISession } from '../grpc'
import { AISession } from '../type/aiChat'
import { SideSettingButton } from '../aiChatWelcome/AIChatWelcome'
import HistoryChatList, { DAY_MS, getChatTimestamp } from './HistoryChatList/HistoryChatList'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import useSessionList from './HistoryChatList/hook/useSessionList'
import { type AISource } from '@/pages/ai-re-act/hooks/grpcApi'
import type { YakitRouteType } from '@/enums/yakitRoute'
import { JSONParseLog } from '@/utils/tool'
import { usePageInfo } from '@/store/pageInfo'
import { shallow } from 'zustand/shallow'
import { handAIHistoryChatRemove } from './utils'
import { getImageStoreKeyByAISource } from '@/pages/ai-re-act/hooks/useGetChatDataStoreKey'
import classNames from 'classnames'
import { filterHistorySessionsBySource, getHistorySourceQuerySources, type HistorySourceFilter } from './source'
import useGetChatDataStoreKey from '@/pages/ai-re-act/hooks/useGetChatDataStoreKey'
import useMemoizedFn from 'ahooks/lib/useMemoizedFn'
import useDebounce from 'ahooks/lib/useDebounce'

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

const renderClearConfirm = (
  label: string,
  title: string,
  onConfirm: () => void,
  overlayOptions?: {
    getPopupContainer?: () => HTMLElement
    overlayClassName?: string
  },
) => {
  return (
    <YakitPopconfirm
      placement="bottomRight"
      title={title}
      onConfirm={onConfirm}
      getPopupContainer={overlayOptions?.getPopupContainer}
      overlayClassName={overlayOptions?.overlayClassName}
    >
      <div className={styles['clear-confirm-trigger']} onClick={(e) => e.stopPropagation()}>
        {label}
      </div>
    </YakitPopconfirm>
  )
}

interface SessionDataPayload {
  type: 'refresh' | 'loadNextPage' | 'clear' | 'prependSession' | 'updateSession'
  payload?: AISession
  updates?: Partial<AISession>
  sessionId?: string
}

/** 向对话框组件进行事件触发的通信 */
export const onNewChat = () => {
  const info: AIAgentTriggerEventInfo = { type: ReActChatEventEnum.NEW_CHAT }
  emiter.emit('onReActChatEvent', JSON.stringify(info))
}

const isSessionMatchSource = (session: AISession, sources: AISource[]) => {
  const sessionSource = session.Source ?? ''
  return sources.some((source) => sessionSource === source)
}

interface HistoryChatProps {
  /** 会话来源过滤，AI Agent 侧栏为 ['ai', '']，各业务页为 [source] */
  aiSource: AISource[]
  /** 嵌入 Tooltip 等浮层场景：隐藏新建/固定按钮，弹层挂载到当前页面容器 */
  embedded?: boolean
}

const HistoryChat = memo(({ aiSource, embedded }: HistoryChatProps) => {
  const { setActiveChat, onClose, getSetting } = useAIAgentDispatcher()
  const { t } = useI18nNamespaces(['aiAgent', 'yakitUi'])
  const [historySourceFilter, setHistorySourceFilter] = useState<HistorySourceFilter>('local')
  const enableHistorySourceFilter = useMemo(() => aiSource.includes('im'), [aiSource])
  const isGlobalAIAgentHistory = useMemo(() => {
    return aiSource.includes('ai') && aiSource.includes('im') && aiSource.includes('')
  }, [aiSource])
  const historyQuerySources = useMemo(() => {
    if (!enableHistorySourceFilter) return aiSource
    return getHistorySourceQuerySources(aiSource, historySourceFilter)
  }, [aiSource, enableHistorySourceFilter, historySourceFilter])
  const [{ sessions }, dispatcher] = useSessionList(historyQuerySources)
  const { activeChat } = useAIAgentStore()

  const currentRouteKey = usePageInfo((state) => state.getCurrentPageTabRouteKey(), shallow)
  const currentPageId = usePageInfo((state) => state.getCurrentSelectPageId(state.getCurrentPageTabRouteKey()), shallow)

  const getPopupContainer = useMemoizedFn(
    () => document.getElementById(`main-operator-page-body-${currentRouteKey}`) || document.body,
  )
  const popupContainer = embedded ? getPopupContainer : undefined
  const embeddedOverlayClass = styles['history-chat-embedded-overlay']
  const embeddedPopconfirmClass = styles['history-chat-embedded-popconfirm']
  const embeddedOverlayOptions = embedded
    ? {
        getPopupContainer: popupContainer,
        overlayClassName: embeddedPopconfirmClass,
      }
    : undefined

  const [search, setSearch] = useState('')
  const searchDebounce = useDebounce(search, { wait: 500 })
  const visibleSessions = useMemo(() => {
    if (!enableHistorySourceFilter) return sessions
    return filterHistorySessionsBySource(sessions, historySourceFilter)
  }, [enableHistorySourceFilter, historySourceFilter, sessions])

  const [clearLoading, setClearLoading] = useState(false)

  const chatDataStoreKey = useGetChatDataStoreKey()

  const handleClearAllChat = useMemoizedFn(async () => {
    if (clearLoading) return
    if (!isGlobalAIAgentHistory && visibleSessions.length === 0) {
      yakitNotify('info', t('HistoryChat.noChatsToClear'))
      return
    }

    setClearLoading(true)
    try {
      const source = getSetting().Source || 'ai'
      const filter = isGlobalAIAgentHistory ? { DeleteAll: true } : { Filter: { Source: historyQuerySources } }
      await handAIHistoryChatRemove({
        grpcDeleteAISessionParams: filter,
        handleClearAIImageParams: { chatDataStoreKey, sessionID: [] }, //删除全部只需要传chatDataStoreKey
        deleteSessionsParams: {
          source,
          sessionIds: [],
          route: currentRouteKey as YakitRouteType,
          pageId: currentPageId || currentRouteKey,
        },
      })
      onClose([])
      onNewChat()
      setActiveChat?.(undefined)
      dispatcher.setSessions?.([])
      dispatcher.resetPagination?.()
      setSearch('')
      yakitNotify('success', t('HistoryChat.allChatsCleared'))
    } catch (e) {
      yakitNotify('error', t('HistoryChat.clearFailed', { error: String(e) }))
    } finally {
      setClearLoading(false)
    }
  })

  const handleClearChatByDays = useMemoizedFn(async (days: number) => {
    if (clearLoading) return

    const beforeTimestamp = Date.now() - days * DAY_MS
    const deletedChats = visibleSessions.filter((item) => getChatTimestamp(item) <= beforeTimestamp)

    if (deletedChats.length === 0) {
      yakitNotify('info', t('HistoryChat.noChatsBeforeDays', { days }))
      return
    }

    setClearLoading(true)
    try {
      const filter =
        enableHistorySourceFilter && historySourceFilter !== 'local'
          ? {
              SessionID: deletedChats.map((item) => item.SessionID),
              Source: historyQuerySources,
            }
          : {
              BeforeTimestamp: beforeTimestamp,
              Source: historyQuerySources,
            }
      const sessionIds = deletedChats.map((item) => item.SessionID)
      const source = getSetting().Source || 'ai'
      await handAIHistoryChatRemove({
        grpcDeleteAISessionParams: { Filter: filter },
        handleClearAIImageParams: { chatDataStoreKey: getImageStoreKeyByAISource(source), sessionID: sessionIds },
        deleteSessionsParams: {
          source,
          sessionIds,
          route: currentRouteKey as YakitRouteType,
          pageId: currentPageId || currentRouteKey,
        },
      })
      onClose(sessionIds)
      const nextChats = sessions.filter((item) => getChatTimestamp(item) > beforeTimestamp)
      const activeDeleted = !!activeChat && deletedChats.some((item) => item.SessionID === activeChat.SessionID)

      if (nextChats.length === 0) {
        onNewChat()
        setActiveChat?.(undefined)
        setSearch('')
      } else if (activeDeleted) {
        setActiveChat?.(nextChats[0])
      }

      dispatcher.setSessions?.(nextChats)
      dispatcher.resetPagination?.()
      yakitNotify('success', t('HistoryChat.clearedBeforeDays', { days }))
    } catch (e) {
      yakitNotify('error', t('HistoryChat.clearFailed', { error: String(e) }))
    } finally {
      setClearLoading(false)
    }
  })

  const handleResetSessions = useMemoizedFn(() => {
    dispatcher.setSessions?.([])
    dispatcher.resetPagination?.()
  })

  const refreshSessions = useMemoizedFn(async () => {
    handleResetSessions()
    await dispatcher.loadHistoryData?.(true)
  })

  const isSessionVisibleInCurrentSource = useMemoizedFn((session: AISession) => {
    if (!isSessionMatchSource(session, historyQuerySources)) return false
    if (!enableHistorySourceFilter) return true
    return filterHistorySessionsBySource([session], historySourceFilter).length > 0
  })

  const handleSetHistorySourceFilter = useMemoizedFn((filter: HistorySourceFilter) => {
    if (historySourceFilter === filter) return
    setHistorySourceFilter(filter)
  })

  useEffect(() => {
    if (!embedded) return
    setSearch('')
    refreshSessions()
  }, [embedded, aiSource, refreshSessions])

  useUpdateEffect(() => {
    if (!enableHistorySourceFilter) return
    refreshSessions()
  }, [historySourceFilter])

  useEffect(() => {
    if (!enableHistorySourceFilter || embedded || historySourceFilter === 'local') return

    const refreshIfVisible = () => {
      if (document.visibilityState === 'visible') {
        refreshSessions()
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
  }, [embedded, enableHistorySourceFilter, historySourceFilter, refreshSessions])

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
          if (isGlobalAIAgentHistory) {
            await grpcDeleteAISession({ DeleteAll: true }, true)
          } else {
            await grpcDeleteAISession(
              {
                Filter: {
                  Source: historyQuerySources,
                },
              },
              true,
            )
          }
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
  }, [dispatcher, handleResetSessions, historyQuerySources, isGlobalAIAgentHistory, isSessionVisibleInCurrentSource])

  return (
    <div className={styles['history-chat']}>
      <div className={styles['header-wrapper']}>
        <div className={styles['haeder-first']}>
          <div className={styles['first-title']}>
            <span className={styles['title-text']}>{t('HistoryChat.title')}</span>
            <YakitRoundCornerTag wrapperClassName={styles['history-count-tag']}>
              {visibleSessions.length}
            </YakitRoundCornerTag>
            {enableHistorySourceFilter && (
              <div className={styles['source-filter']}>
                {HISTORY_SOURCE_FILTER_OPTIONS.map((item) => {
                  const active = historySourceFilter === item.key
                  return (
                    <Tooltip
                      key={item.key}
                      title={item.title}
                      placement="top"
                      getPopupContainer={popupContainer}
                      overlayClassName={embedded ? embeddedOverlayClass : undefined}
                    >
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
            )}
          </div>
          <div className={styles['header-actions']}>
            <YakitDropdownMenu
              menu={{
                data: [
                  {
                    key: '1',
                    label: renderClearConfirm(
                      t('HistoryChat.oneDay'),
                      t('HistoryChat.clearConfirm', { days: t('HistoryChat.oneDay') }),
                      () => handleClearChatByDays(1),
                      embeddedOverlayOptions,
                    ),
                  },
                  {
                    key: '7',
                    label: renderClearConfirm(
                      t('HistoryChat.oneWeek'),
                      t('HistoryChat.clearConfirm', { days: t('HistoryChat.oneWeek') }),
                      () => handleClearChatByDays(7),
                      embeddedOverlayOptions,
                    ),
                  },
                  {
                    key: '30',
                    label: renderClearConfirm(
                      t('HistoryChat.thirtyDays'),
                      t('HistoryChat.clearConfirm', { days: t('HistoryChat.thirtyDays') }),
                      () => handleClearChatByDays(30),
                      embeddedOverlayOptions,
                    ),
                  },
                  { type: 'divider' },
                  {
                    key: 'all',
                    label: renderClearConfirm(
                      t('HistoryChat.clearAll'),
                      t('HistoryChat.clearAllConfirm'),
                      handleClearAllChat,
                      embeddedOverlayOptions,
                    ),
                  },
                ],
              }}
              dropdown={{
                trigger: ['click'],
                placement: 'bottomRight',
                disabled: clearLoading || (!isGlobalAIAgentHistory && visibleSessions.length === 0),
                getPopupContainer: popupContainer,
                overlayClassName: embedded ? embeddedOverlayClass : undefined,
              }}
            >
              <Tooltip
                title={t('HistoryChat.clearChats')}
                placement="topRight"
                getPopupContainer={popupContainer}
                overlayClassName={embedded ? embeddedOverlayClass : undefined}
              >
                <YakitButton
                  disabled={clearLoading || (!isGlobalAIAgentHistory && visibleSessions.length === 0)}
                  colors="danger"
                  type="outline1"
                  loading={clearLoading}
                >
                  {t('YakitButton.delete')}
                </YakitButton>
              </Tooltip>
            </YakitDropdownMenu>
            {!embedded && (
              <>
                <Tooltip title={t('HistoryChat.newChat')} placement="topRight">
                  <YakitButton icon={<OutlineMessageCirclePlusIcon />} onClick={onNewChat} />
                </Tooltip>
                <SideSettingButton />
              </>
            )}
          </div>
        </div>

        <div className={styles['header-second']}>
          <YakitInput
            prefix={<OutlineSearchIcon className={styles['search-icon']} />}
            placeholder={t('YakitInput.searchKeyWordPlaceholder')}
            allowClear
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className={styles['content']}>
        <HistoryChatList
          search={searchDebounce}
          sessionList={visibleSessions}
          aiSource={historyQuerySources}
          setSessions={dispatcher.setSessions}
          loadHistoryData={dispatcher.loadHistoryData}
          getSessions={dispatcher.getSessions}
          getPopupContainer={popupContainer}
          overlayClassName={embedded ? embeddedPopconfirmClass : undefined}
          embedded={embedded}
        />
      </div>
    </div>
  )
})

export default HistoryChat
