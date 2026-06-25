import { memo, useEffect, useState } from 'react'
import useAIAgentStore from '../useContext/useStore'
import useAIAgentDispatcher from '../useContext/useDispatcher'
import { useDebounce, useMemoizedFn } from 'ahooks'
import { yakitNotify } from '@/utils/notification'
import { ReActChatEventEnum } from '../defaultConstant'
import { OutlineMessageCirclePlusIcon, OutlineSearchIcon } from '@/assets/icon/outline'
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
import { JSONParseLog } from '@/utils/tool'
import { usePageInfo } from '@/store/pageInfo'
import { shallow } from 'zustand/shallow'
import { handAIHistoryChatRemove } from './utils'
import { getImageStoreKeyByAISource } from '@/pages/ai-re-act/hooks/useGetChatDataStoreKey'

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
  const [{ sessions }, dispatcher] = useSessionList(aiSource)
  const { activeChat } = useAIAgentStore()

  const currentRouteKey = usePageInfo((state) => state.getCurrentPageTabRouteKey(), shallow)

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

  const [clearLoading, setClearLoading] = useState(false)
  const handleClearAllChat = useMemoizedFn(async () => {
    if (clearLoading) return
    if (sessions.length === 0) {
      yakitNotify('info', t('HistoryChat.noChatsToClear'))
      return
    }

    setClearLoading(true)
    try {
      const source = getSetting().Source
      await handAIHistoryChatRemove({
        grpcDeleteAISessionParams: { Filter: { Source: aiSource } },
        handleClearAIImageParams: { chatDataStoreKey: getImageStoreKeyByAISource(source), sessionID: [] }, //删除全部只需要传chatDataStoreKey
        forceCloseSessionParams: {
          aiSource: source,
          sessionIds: [],
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
    const deletedChats = sessions.filter((item) => getChatTimestamp(item) <= beforeTimestamp)

    if (deletedChats.length === 0) {
      yakitNotify('info', t('HistoryChat.noChatsBeforeDays', { days }))
      return
    }

    setClearLoading(true)
    try {
      const sessionIds = sessions.map((item) => item.SessionID)
      const source = getSetting().Source
      await handAIHistoryChatRemove({
        grpcDeleteAISessionParams: { Filter: { BeforeTimestamp: beforeTimestamp, Source: aiSource } },
        handleClearAIImageParams: { chatDataStoreKey: getImageStoreKeyByAISource(source), sessionID: sessionIds },
        forceCloseSessionParams: {
          aiSource: source,
          sessionIds: sessionIds,
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

  useEffect(() => {
    if (!embedded) return
    setSearch('')
    refreshSessions()
  }, [embedded, aiSource, refreshSessions])

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
          await grpcDeleteAISession(
            {
              Filter: {
                Source: aiSource,
              },
            },
            true,
          )
          handleResetSessions()
          break
        case 'prependSession':
          if (payload.payload && isSessionMatchSource(payload.payload, aiSource)) {
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
  }, [aiSource, dispatcher])

  return (
    <div className={styles['history-chat']}>
      <div className={styles['header-wrapper']}>
        <div className={styles['haeder-first']}>
          <div className={styles['first-title']}>
            {t('HistoryChat.title')}
            <YakitRoundCornerTag>{sessions.length}</YakitRoundCornerTag>
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
                disabled: clearLoading || sessions.length === 0,
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
                  disabled={clearLoading || sessions.length === 0}
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
          sessionList={sessions}
          aiSource={aiSource}
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
