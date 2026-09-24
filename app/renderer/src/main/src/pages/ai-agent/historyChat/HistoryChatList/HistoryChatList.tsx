import { memo, useMemo, useRef, useState, type FC, type MouseEvent } from 'react'
import { Virtuoso } from 'react-virtuoso'
import styles from './HistoryChatList.module.scss'
import { PencilAltOutlined, TrashOutlined } from '@yakit-libs/yakit-ui-icons/outline'
import { ChatAlt2Solid, UserSolid, UsersSolid } from '@yakit-libs/yakit-ui-icons/solid'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitPopconfirm } from '@/components/yakitUI/YakitPopconfirm/YakitPopconfirm'
import { Tooltip } from 'antd'
import classNames from 'classnames'
import { YakitAIAgentPageID } from '../../defaultConstant'
import { EditChatNameModal } from '../../UtilModals'
import type { AISession } from '../../type/aiChat'
import { useCreation, useInfiniteScroll, useMemoizedFn } from 'ahooks'
import { grpcUpdateAISessionTitle } from '../../grpc'
import useAIAgentStore from '../../useContext/useStore'
import useAIAgentDispatcher from '../../useContext/useDispatcher'
import { yakitNotify } from '@/utils/notification'
import { onNewChat, openAIAgentChatTab } from '../HistoryChat'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import type { SessionListDispatcher } from './hook/useSessionList'
import { AITaskStatus, type AISource } from '@/pages/ai-re-act/hooks/grpcApi'
import { getHistorySessionIconMeta, getSessionDisplayTitle } from '../source'
import { handAIHistoryChatRemove, AISessionDeleteCancelledError } from '../utils'
import useGetChatDataStoreKey, { AI_AGENT_HISTORY_AI_SOURCES } from '@/pages/ai-re-act/hooks/useGetChatDataStoreKey'
import { globalSessionEngine } from '@/pages/ai-re-act/hooks/ChatMultiSessionController'
import type { HistoryChatListItemProps } from './type'
import useCurrentSessionId from '@/pages/ai-re-act/hooks/useCurrentSessionId'
import { useStore } from 'zustand'
import { YakitSolidLoading } from '@/components/yakitUI/YakitSolidLoading/YakitSolidLoading'
import { YakitSpin } from '@/components/yakitUI/YakitSpin/YakitSpin'

export const HOUR_MS = 60 * 60 * 1000
export const DAY_MS = 24 * HOUR_MS
export const WEEK_MS = 7 * DAY_MS
export const THIRTY_DAYS_MS = 30 * DAY_MS

const CHAT_GROUPS = [
  { key: 'justNow', label: 'HistoryChatList.justNow' },
  { key: 'oneHour', label: 'HistoryChatList.oneHour' },
  { key: 'oneDay', label: 'HistoryChatList.oneDay' },
  { key: 'oneWeek', label: 'HistoryChatList.oneWeek' },
  { key: 'thirtyDays', label: 'HistoryChatList.thirtyDays' },
] as const

type ChatGroupKey = (typeof CHAT_GROUPS)[number]['key']

type HistoryRow =
  | { type: 'group'; key: string; label: string; first: boolean }
  | { type: 'session'; key: string; session: AISession }

export const normalizeTimestamp = (timestamp?: number | string) => {
  if (!timestamp) return 0
  const value = Number(timestamp)
  if (Number.isNaN(value)) return 0
  return value < 1e12 ? value * 1000 : value
}

export const getChatTimestamp = (item: AISession) => {
  return normalizeTimestamp(item.UpdatedAt || item.CreatedAt)
}

const getChatGroupKey = (timestamp?: number | string): ChatGroupKey => {
  const time = normalizeTimestamp(timestamp)
  const diff = Math.max(Date.now() - time, 0)

  if (diff <= HOUR_MS) return 'justNow'
  if (diff <= DAY_MS) return 'oneHour'
  if (diff <= WEEK_MS) return 'oneDay'
  if (diff <= THIRTY_DAYS_MS) return 'oneWeek'
  return 'thirtyDays'
}

const getNextActiveChat = (chats: AISession[], currentIndex: number) => {
  const prev = chats[currentIndex - 1]
  const next = chats[currentIndex + 1]
  return prev ?? next
}

const updateChatTitle = (list: AISession[], info: AISession) => {
  return list.map((item) => {
    if (item.SessionID === info.SessionID) {
      return info
    }
    return item
  })
}

const HistorySessionIcon: FC<{
  item: AISession
  getPopupContainer?: () => HTMLElement
  overlayClassName?: string
}> = ({ item, getPopupContainer, overlayClassName }) => {
  const iconMeta = getHistorySessionIconMeta(item)
  const Icon = iconMeta.isIM ? (iconMeta.isGroupLike ? UsersSolid : UserSolid) : ChatAlt2Solid

  return (
    <Tooltip
      title={iconMeta.label}
      placement="top"
      classNames={{ root: classNames(styles['history-item-extra-tooltip'], overlayClassName) }}
      getPopupContainer={getPopupContainer}
    >
      <div
        className={classNames(
          styles['item-icon'],
          styles[`item-icon-${iconMeta.source}`],
          styles[`item-icon-${iconMeta.chatKind}`],
        )}
      >
        <Icon color="currentColor" />
      </div>
    </Tooltip>
  )
}

const HistoryChatList: FC<{
  search: string
  sessionList: AISession[]
  aiSource: AISource[]
  getSessions?: SessionListDispatcher['getSessions']
  setSessions?: SessionListDispatcher['setSessions']
  loadHistoryData?: SessionListDispatcher['loadHistoryData']
  getPopupContainer?: () => HTMLElement
  overlayClassName?: string
  embedded?: boolean
}> = ({
  search,
  sessionList,
  aiSource,
  getSessions,
  setSessions,
  loadHistoryData,
  getPopupContainer,
  overlayClassName,
  embedded,
}) => {
  const { t } = useI18nNamespaces(['aiAgent', 'yakitUi'])
  const { activeChat, openChatInNewTab, pageId } = useAIAgentStore()
  const { setActiveChat, setSetting } = useAIAgentDispatcher()
  const listRef = useRef<HTMLDivElement | null>(null)
  const chatTotalRef = useRef(0)
  const editInfo = useRef<AISession>()
  const [editShow, setEditShow] = useState(false)

  const chatDataStoreKey = useGetChatDataStoreKey()

  const activeSessionId = useMemo(() => {
    return activeChat?.SessionID || ''
  }, [activeChat])

  const { loading } = useInfiniteScroll(
    async () => {
      const total = await loadHistoryData?.()
      chatTotalRef.current = total ?? 0
      return { list: [] }
    },
    {
      target: listRef,
      isNoMore: () => (getSessions?.().length || 0) >= chatTotalRef.current,
      threshold: 100,
      manual: embedded,
    },
  )

  const handleOpenEditName = useMemoizedFn((info: AISession) => {
    if (editShow) return
    editInfo.current = info
    setEditShow(true)
  })

  const showHistory = useMemo(() => {
    if (!search) return sessionList
    const lower = search.toLowerCase()
    return sessionList.filter((item) => getSessionDisplayTitle(item).toLowerCase().includes(lower))
  }, [sessionList, search])

  const groupedHistory = useMemo(() => {
    const groupMap = CHAT_GROUPS.reduce<Record<ChatGroupKey, AISession[]>>(
      (acc, item) => {
        acc[item.key] = []
        return acc
      },
      {} as Record<ChatGroupKey, AISession[]>,
    )

    showHistory.forEach((item) => {
      const groupKey = getChatGroupKey(getChatTimestamp(item))
      groupMap[groupKey].push(item)
    })

    return CHAT_GROUPS.map((item) => ({
      ...item,
      list: groupMap[item.key],
    })).filter((item) => item.list.length > 0)
  }, [showHistory])

  // Keep all sessions available to search, but only mount rows in the viewport.
  // A mounted session row also subscribes to its chat store and several popovers.
  const historyRows = useMemo<HistoryRow[]>(() => {
    return groupedHistory.flatMap((group, index) => [
      { type: 'group' as const, key: `group:${group.key}`, label: group.label, first: index === 0 },
      ...group.list.map((session) => ({ type: 'session' as const, key: `session:${session.SessionID}`, session })),
    ])
  }, [groupedHistory])

  const setScrollerRef = useMemoizedFn((element: HTMLElement | Window | null) => {
    listRef.current = element instanceof HTMLElement ? (element as HTMLDivElement) : null
  })

  const handleCallbackEditName = useMemoizedFn(async (result: boolean, info?: AISession) => {
    if (result && info) {
      try {
        await grpcUpdateAISessionTitle({ SessionID: info.SessionID, Title: info.Title })
        setSessions?.((old) => updateChatTitle(old, info))
      } catch (error) {
        yakitNotify('error', t('HistoryChatList.updateTitleFailed', { error: String(error) }))
      }
    }
    setEditShow(false)
    editInfo.current = undefined
  })

  const { getSetting, onClose } = useAIAgentDispatcher()
  const handleDeleteChat = useMemoizedFn(async (info: AISession) => {
    return new Promise<void>(async (resolve, reject) => {
      const { SessionID } = info

      const findIndex = sessionList.findIndex((item) => item.SessionID === SessionID)
      if (findIndex === -1) {
        yakitNotify('error', t('HistoryChatList.chatNotFound'))
        reject()
        return
      }

      const newChats = sessionList.filter((item) => item.SessionID !== SessionID)
      const active = getNextActiveChat(sessionList, findIndex)

      try {
        const sessionIds = [SessionID]
        await handAIHistoryChatRemove({
          grpcDeleteAISessionParams: { Filter: { SessionID: [SessionID], Source: aiSource } },
          handleClearAIImageParams: { chatDataStoreKey, sessionID: sessionIds },
          deleteSessionsParams: { sessionIds, source: [] },
        })
        setSessions && setSessions(newChats)
        if (newChats.length === 0) {
          onNewChat(false, pageId)
        } else if (activeSessionId === SessionID && active) {
          handleSetActiveChat(active)
        }
        resolve()
      } catch (error) {
        setSessions?.(sessionList)
        if (activeSessionId === SessionID) {
          handleSetActiveChat(info)
        }
        if (!(error instanceof AISessionDeleteCancelledError)) {
          yakitNotify('error', t('HistoryChatList.deleteFailed', { error: String(error) }))
        }
        reject()
      }
    })
  })
  const onSetChat = useMemoizedFn((info: AISession) => {
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
    setActiveChat && setActiveChat(info)
  })
  const [closeLoading, setCloseLoading] = useState(false)
  // 如果当前历史在aiagent页面中，直接切换会话；其余页面需要判断对话是否在执行，执行中需要先断开会话再设置新会话
  const handleSetActiveChat = useMemoizedFn((info: AISession) => {
    if (openChatInNewTab) {
      openAIAgentChatTab(info)
      return
    }
    if (aiSource.some((source) => AI_AGENT_HISTORY_AI_SOURCES.includes(source))) {
      onSetChat(info)
      return
    }
    const activeExecute = globalSessionEngine?.getSessionExecute(info.SessionID)
    if (activeExecute) {
      yakitNotify('info', '会话正在执行中')
      return
    }
    const currentExecute = globalSessionEngine?.getSessionExecute(activeSessionId)
    if (currentExecute) {
      setCloseLoading(true)
      onClose([activeSessionId], () => {
        onSetChat(info)
        setTimeout(() => {
          setCloseLoading(false)
        }, 200)
      })
    } else {
      onSetChat(info)
    }
  })

  return (
    <YakitSpin spinning={closeLoading}>
      <div className={styles['history-chat-list-virtual']}>
        <Virtuoso
          className={styles['history-virtual-list']}
          style={{ height: '100%', width: '100%' }}
          data={historyRows}
          scrollerRef={setScrollerRef}
          computeItemKey={(_index, row) => row.key}
          defaultItemHeight={32}
          overscan={160}
          itemContent={(_index, row) =>
            row.type === 'group' ? (
              <div
                className={classNames(styles['history-group-title'], {
                  [styles['history-group-spaced']]: !row.first,
                })}
              >
                {t(row.label)}
              </div>
            ) : (
              <HistoryChatListItem
                item={row.session}
                handleSetActiveChat={handleSetActiveChat}
                getPopupContainer={getPopupContainer}
                overlayClassName={overlayClassName}
                handleOpenEditName={handleOpenEditName}
                handleDeleteChat={handleDeleteChat}
              />
            )
          }
        />
        {loading && <div className={styles['history-loading']}>{t('YakitSpin.loading')}</div>}

        {editInfo.current && (
          <EditChatNameModal
            getContainer={
              embedded && getPopupContainer
                ? getPopupContainer()
                : document.getElementById(YakitAIAgentPageID) || undefined
            }
            zIndex={embedded ? 1110 : undefined}
            info={editInfo.current}
            visible={editShow}
            onCallback={handleCallbackEditName}
          />
        )}
      </div>
    </YakitSpin>
  )
}

export default HistoryChatList

const HistoryChatListItem: FC<HistoryChatListItemProps> = memo((props) => {
  const { item, handleSetActiveChat, getPopupContainer, handleOpenEditName, overlayClassName, handleDeleteChat } = props

  const { t } = useI18nNamespaces(['aiAgent'])
  const activeSessionId = useCurrentSessionId()

  const store = useCreation(() => {
    return globalSessionEngine?.ensureSession(item.SessionID)?.store
  }, [item.SessionID])

  const loading = useStore(store, (state) => state.currentChatStatus.status === AITaskStatus.inProgress)
  const [delLoading, setDelLoading] = useState<boolean>(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const displayTitle = useCreation(() => {
    return getSessionDisplayTitle(item)
  }, [item])
  const handleDeleteChatItem = useMemoizedFn(async (info: AISession) => {
    setDelLoading(true)
    try {
      await handleDeleteChat(info)
    } catch {
      // The parent restores the list and reports errors; cancellation is also handled there.
    } finally {
      setDelLoading(false)
    }
  })

  const handleConfirmDelete = useMemoizedFn((e?: MouseEvent<HTMLElement>) => {
    e?.stopPropagation()
    setDeleteConfirmOpen(false)
    handleDeleteChatItem(item)
  })

  const handleCancelDelete = useMemoizedFn((e?: MouseEvent<HTMLElement>) => {
    e?.stopPropagation()
    setDeleteConfirmOpen(false)
  })

  return (
    <div
      key={item.SessionID}
      className={classNames(styles['history-item'], {
        [styles['history-item-active']]: activeSessionId === item.SessionID,
      })}
      onClick={() => handleSetActiveChat(item)}
    >
      <div className={styles['item-info']}>
        {loading ? (
          <YakitSolidLoading />
        ) : (
          <HistorySessionIcon item={item} getPopupContainer={getPopupContainer} overlayClassName={overlayClassName} />
        )}
        <div className={classNames(styles['info-title'], 'yakit-content-single-ellipsis')} title={displayTitle}>
          {displayTitle}
        </div>
      </div>

      <div className={styles['item-extra']} style={deleteConfirmOpen || delLoading ? { display: 'flex' } : undefined}>
        <Tooltip
          title={t('HistoryChatList.editTitle')}
          placement="topRight"
          classNames={{ root: classNames(styles['history-item-extra-tooltip'], overlayClassName) }}
          getPopupContainer={getPopupContainer}
        >
          <YakitButton
            type="text2"
            icon={<PencilAltOutlined color="currentColor" />}
            onClick={(e) => {
              e.stopPropagation()
              handleOpenEditName(item)
            }}
          />
        </Tooltip>
        <YakitPopconfirm
          title={t('HistoryChatList.deleteConfirm')}
          open={deleteConfirmOpen}
          onOpenChange={setDeleteConfirmOpen}
          placement="bottom"
          getPopupContainer={getPopupContainer}
          classNames={{ root: overlayClassName }}
          onConfirm={handleConfirmDelete}
          onCancel={handleCancelDelete}
        >
          <YakitButton
            loading={delLoading}
            type="text2"
            icon={<TrashOutlined className={styles['del-icon']} color="currentColor" />}
            onClick={(e) => e.stopPropagation()}
          />
        </YakitPopconfirm>
      </div>
    </div>
  )
})
