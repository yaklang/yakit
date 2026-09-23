import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'

import styles from './AIReActChat.module.scss'
import type { AIHandleStartResProps, AINotifyMessageProps, AIReActChatProps, AISendResProps } from './AIReActChatType'
import { AIReActChatContents } from '../aiReActChatContents/AIReActChatContents'
import type { AIReActChatContentsRef } from '../aiReActChatContents/AIReActChatContentsType'
import type { AIChatTextareaRefProps, AIChatTextareaSubmit } from '@/pages/ai-agent/template/type'
import { useControllableValue, useCreation, useInViewport, useMemoizedFn } from 'ahooks'
import { yakitNotify } from '@/utils/notification'
import useAIAgentStore from '@/pages/ai-agent/useContext/useStore'
import classNames from 'classnames'
import { ChevrondownButton } from './AIReActComponent'
import {
  type AIInputEvent,
  AIInputEventSyncTypeEnum,
  AINotifyType,
  AISourceEnum,
  type AIStartParams,
} from '../hooks/grpcApi'
import { AITaskQuery } from '@/pages/ai-agent/components/aiTaskQuery/AITaskQuery'
import type { HandleStartParams } from '@/pages/ai-agent/aiAgentChat/type'
import { formatAIAgentSetting, getAIReActRequestParams } from '@/pages/ai-agent/utils'
import type { AISession } from '@/pages/ai-agent/type/aiChat'
import useAIAgentDispatcher from '@/pages/ai-agent/useContext/useDispatcher'
import { randomString } from '@/utils/randomUtil'
import useAINodeLabel from '../hooks/useAINodeLabel'
import emiter from '@/utils/eventBus/eventBus'
import { useCurrentStore } from '../hooks/useCurrentDataBySession'
import { useStore } from 'zustand'
import useCurrentSessionId from '../hooks/useCurrentSessionId'
import { AIReactChatTextarea } from './aiReactChatTextarea/AIReactChatTextarea'
import { AIReActChatHeader } from './aiReActChatHeader/AIReActChatHeader'
import { AIToDoListWrapper } from './aiToDoListWrapper/AIToDoListWrapper'
import { AIReActTaskChatReview } from '@/pages/ai-agent/aiAgentChat/AIAgentChat'
import { globalSessionEngine } from '../hooks/ChatMultiSessionController'
import { AIRightPanel } from '../aiRightPanel/AIRightPanel'
import {
  ExclamationCircleOutlined,
  ExclamationOutlined,
  HourglassOutlined,
  XOutlined,
} from '@yakit-libs/yakit-ui-icons/outline'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { isCommunityEdition } from '@/utils/envfile'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'

export const AIReActChat: React.FC<AIReActChatProps> = React.memo(
  forwardRef((props, ref) => {
    const {
      chatContainerClassName,
      chatContainerHeaderClassName,
      showAIRightPanel,
      title,
      sendRequest,
      startRequest,
      externalParameters,
      rightPanelLayoutRef,
    } = props
    const { setActiveChat, getSetting, onStart, onSend, cancelPendingChat } = useAIAgentDispatcher()

    const sessionId = useCurrentSessionId()
    const store = useCurrentStore()

    const wrapperRef = useRef<HTMLDivElement>(null)
    const [inViewPort = true] = useInViewport(wrapperRef)

    const [showFreeChat, setShowFreeChat] = useControllableValue<boolean>(props, {
      defaultValue: true,
      valuePropName: 'showFreeChat',
      trigger: 'setShowFreeChat',
    })

    const { activeChat, setting, pendingChat } = useAIAgentStore()

    const aiChatTextareaRef = useRef<AIChatTextareaRefProps>({
      setMention: () => {},
      setValue: () => {},
      setHttpFlow: () => {},
      getValue: () => {},
    })
    useEffect(() => {
      if (activeChat?.SessionID) {
        // 关键词: flushSync warning, Milkdown ReactRenderer, prosemirror-adapter flushSync
        // setEditorValue 内部会 view.dispatch(tr), 经 ProseMirror updateState -> updatePluginViews
        // 触发 @prosemirror-adapter/react 的 ReactRenderer.update, 内部会 flushSync 重新渲染 portal.
        // 而本段处于 useEffect(passive mount) 阶段, React 已经在渲染中, 同步 dispatch 会让第三方库的
        // flushSync 撞上 "React cannot flush when React is already rendering" 警告.
        // 用 queueMicrotask 把 dispatch 推迟到当前渲染周期之后, 时序最接近原行为.
        // cancelled 守卫: 防止微任务执行前组件已卸载, 避免对已销毁的 editor 做无意义写入.
        let cancelled = false
        queueMicrotask(() => {
          if (!cancelled) {
            aiChatTextareaRef.current?.setValue('')
          }
        })
        return () => {
          cancelled = true
        }
      }
    }, [activeChat?.SessionID])

    // #region
    /**
     * 1.切换Session后设置当前选中的 SessionID ，如果该组件被卸载意外着当前没有任何对话在显示
     * 2.当该组件从不可见变可见的时候，需要设置当前选中的 SessionID
     * */
    useEffect(() => {
      if (activeChat?.SessionID) {
        globalSessionEngine?.setActiveShowSession(activeChat?.SessionID)
      }
      return () => {
        globalSessionEngine?.setActiveShowSession('')
      }
    }, [activeChat?.SessionID])
    useEffect(() => {
      if (inViewPort) {
        globalSessionEngine?.setActiveShowSession(activeChat?.SessionID ?? '')

        return () => {
          globalSessionEngine?.setActiveShowSession('')
        }
      }
    }, [inViewPort])
    //#endregion
    // #region 问题相关逻辑
    const lastStart = useRef<HandleStartParams | undefined>(undefined)
    const handleStart = useMemoizedFn((value: HandleStartParams) => {
      lastStart.current = value
      const { qs, sessionId, enabledCapabilities } = value
      const sessionID = activeChat?.SessionID || '' // 判断历史还是新建

      const source = getSetting().Source ?? AISourceEnum.aiAgent // getSetting保证最新
      const formattedSetting = formatAIAgentSetting(setting)
      const request: AIStartParams = {
        ...formattedSetting,
        UserQuery: qs,
        CoordinatorId: '',
        Sequence: 1,
        PreferSessionCachedConfig: true,
        Source: source,
        EnabledCapabilities: enabledCapabilities,
      }

      if (sessionID) request.TimelineSessionID = sessionID
      else {
        delete request.TimelineSessionID
        request.PreferSessionCachedConfig = false
      }
      const { attachedResourceInfo } = getAIReActRequestParams(value)
      // 发送初始化参数
      const aiInputEvent: AIInputEvent = {
        IsStart: true,
        Params: {
          ...request,
        },
        AttachedResourceInfo: attachedResourceInfo,
        FocusModeLoop: value.focusMode,
      }
      const onStartChat = (res: AIHandleStartResProps) => {
        const { params, extraParams, onChat, onSessionBound } = res
        let streamToken = ''
        if (!sessionID) onChat?.()
        aiChatTextareaRef.current.setMention({
          mentionId: params.FocusModeLoop || randomString(8),
          mentionType: 'focusMode',
          mentionName: params.FocusModeLoop || '',
        })
        onStart({
          kind: sessionID ? 'resume' : 'new',
          sessionId: sessionID || undefined,
          draftId: sessionId,
          params,
          onLinkStart: (token) => {
            streamToken = token
          },
          onLinkSuccess: (id) => {
            onSessionBound?.(id)
            if (sessionID) return
            const newChat: AISession = {
              Id: extraParams?.chatId || id,
              SessionID: id,
              viewKey: streamToken,
              Title: qs || `AI Agent - ${new Date().toLocaleString()}`,
              question: qs,
              CreatedAt: Date.now(),
              UpdatedAt: Date.now(),
              LastUsedAt: Date.now(),
              StartParams: { ...params.Params, TimelineSessionID: id, UserQuery: '' },
              TitleInitialized: false,
              Source: request.Source ?? 'ai',
              isCreate: true,
            }
            setActiveChat(newChat)
            emiter.emit(
              'sessionData',
              JSON.stringify({ type: 'prependSession', payload: { ...newChat, isCreate: false } }),
            )
          },
        })
      }
      if (startRequest) {
        startRequest({
          params: aiInputEvent,
        })
          .then((res) => {
            onStartChat(res)
          })
          .catch(() => {
            onStartChat({
              params: aiInputEvent,
            })
          })
      } else {
        onStartChat({
          params: aiInputEvent,
        })
      }
    })

    useImperativeHandle(ref, () => {
      return {
        setHttpFlow: (ids) => aiChatTextareaRef.current?.setHttpFlow(ids),
        setValue: (value) => aiChatTextareaRef.current?.setValue(value),
        getValue: () => aiChatTextareaRef.current?.getValue(),
        setMention: (value) => aiChatTextareaRef.current?.setMention(value),
        handleStart: (value) => handleStart(value),
      }
    }, [])
    /**自由对话 */
    const handleSend = useMemoizedFn((data: HandleStartParams) => {
      if (!activeChat?.SessionID) return
      const sendChat = () => {
        const { attachedResourceInfo } = getAIReActRequestParams(data)
        const chatMessage: AIInputEvent = {
          IsFreeInput: true,
          FreeInput: data.qs,
          AttachedResourceInfo: attachedResourceInfo,
          FocusModeLoop: data.focusMode,
        }
        const onSendChat = (res: AISendResProps) => {
          const { params } = res
          onSend({
            token: activeChat.SessionID,
            type: 'casual',
            params: {
              IsFreeInput: true,
              ...params,
            },
          })
          emiter.emit('sessionData', JSON.stringify({ type: 'refresh', sessionId: activeChat.SessionID }))
        }
        if (sendRequest) {
          sendRequest?.({ params: chatMessage })
            .then((res) => {
              const { params } = res
              // 发送到服务端
              onSendChat({
                params,
              })
            })
            .catch(() => {
              onSendChat({
                params: chatMessage,
              })
            })
        } else {
          onSendChat({
            params: chatMessage,
          })
        }
      }
      try {
        sendChat()
      } catch (error) {}
    })

    // #endregion

    const isShowRetract = useCreation(() => {
      return showFreeChat
    }, [showFreeChat])
    const isShowExpand = useCreation(() => {
      return !showFreeChat
    }, [showFreeChat])

    const onSetQuestion = useMemoizedFn((value: string) => {
      aiChatTextareaRef?.current?.setValue(value ?? '')
    })

    // 初始化 AI ReAct
    const handleSubmit = useMemoizedFn((value: AIChatTextareaSubmit) => {
      if (pendingChat?.status === 'connecting') return
      if (!setting) {
        yakitNotify('error', '请先配置 AI ReAct 参数')
        return
      }
      if (store.getState().execute) {
        handleSend(value)
      } else {
        handleStart(value)
      }
      onSetQuestion('')
      externalParameters?.onAfterSubmit?.()
    })

    const handleStopCasualTask = useMemoizedFn(() => {
      if (pendingChat) {
        cancelPendingChat()
        return
      }
      const currentCasualTaskID = store.getState().currentChatStatus.questionID
      if (!store.getState().execute || !currentCasualTaskID) return

      store.getState().updateState({
        cancelChatLoading: true,
      })
      const info: AIInputEvent = {
        IsSyncMessage: true,
        SyncType: AIInputEventSyncTypeEnum.SYNC_TYPE_REACT_CANCEL_TASK,
        SyncJsonInput: JSON.stringify({ task_id: currentCasualTaskID }),
        SyncID: randomString(8),
      }
      onSend({ token: sessionId, type: 'casual', params: info })
    })

    const aiReActChatContentsRef = useRef<AIReActChatContentsRef>(null)
    const scrollToItemIndex = useMemoizedFn<AIReActChatContentsRef['scrollToItemIndex']>((index, behavior) => {
      aiReActChatContentsRef.current?.scrollToItemIndex(index, behavior)
    })

    return (
      <>
        <div
          ref={rightPanelLayoutRef}
          className={classNames(styles['ai-re-act'], {
            [styles['content-re-act-side']]: isShowRetract,
            [styles['content-re-act-side-hidden']]: isShowExpand,
          })}
        >
          <div
            ref={wrapperRef}
            className={classNames(styles['ai-re-act-chat'], {
              [styles['ai-re-act-chat-hidden']]: !showFreeChat,
            })}
          >
            <div className={styles['chat-layout-wrapper']}>
              <div className={classNames(styles['chat-container'], chatContainerClassName)}>
                {title && (
                  <AIReActChatHeader
                    title={title}
                    chatContainerHeaderClassName={chatContainerHeaderClassName}
                    isShowRetract={isShowRetract}
                    externalParameters={externalParameters}
                    scrollToItemIndex={scrollToItemIndex}
                  />
                )}
                <AIToDoListWrapper />
                <AIReActChatContents ref={aiReActChatContentsRef} />
                {pendingChat?.status === 'failed' && (
                  <div className={styles['connection-error']} role="status">
                    {pendingChat.error || '连接已停止'}
                    <YakitButton
                      type="text"
                      onClick={() => {
                        if (lastStart.current) handleStart(lastStart.current)
                      }}
                    >
                      重试
                    </YakitButton>
                  </div>
                )}
                <AIReActTaskChatReview />
              </div>
              <div className={classNames(styles['chat-footer'])}>
                <div className={styles['footer-body']}>
                  <div className={styles['footer-inputs']}>
                    <AITaskQuery />
                    <div className={classNames(styles['footer-inputs-file-list'])}>
                      <AINotifyMessage />
                      <AIReactChatTextarea
                        ref={aiChatTextareaRef}
                        handleSubmit={handleSubmit}
                        externalParameters={externalParameters}
                        handleStopCasualTask={handleStopCasualTask}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {showAIRightPanel && showFreeChat && <AIRightPanel layoutRef={wrapperRef} />}
          <div className={styles['open-wrapper']} onClick={() => setShowFreeChat(true)}>
            <ChevrondownButton />
            <div className={styles['text']}>自由对话</div>
          </div>
        </div>
      </>
    )
  }),
)

const AINotifyMessage: React.FC<AINotifyMessageProps> = React.memo(() => {
  const store = useCurrentStore()
  const execute = useStore(store, (state) => state.execute)
  const notifyMessage = useStore(store, (state) => state.notifyMessage)
  const { t } = useI18nNamespaces(['layout', 'yakitUi'])

  const { nodeLabel } = useAINodeLabel(notifyMessage?.label)

  const notifyIcon = useCreation(() => {
    switch (notifyMessage?.type) {
      case AINotifyType.notify429TypeRateLimited:
        return <HourglassOutlined className={classNames(styles['notify-icon'], styles['notify-icon-yellow'])} />
      case AINotifyType.notify429TypeQuotaExceeded:
        return <ExclamationOutlined className={classNames(styles['notify-icon'], styles['notify-icon-error'])} />
      default:
        return <ExclamationCircleOutlined className={classNames(styles['notify-icon'], styles['notify-icon-yellow'])} />
    }
  }, [notifyMessage?.type])

  const isQuotaExceeded = notifyMessage?.type === AINotifyType.notify429TypeQuotaExceeded && isCommunityEdition() // yakit/IRify/MEMFIT 得社区版才有这个充值按钮

  const onClose = () => {
    store.getState().updateState({ notifyMessage: null })
  }
  return (execute || isQuotaExceeded) && notifyMessage?.content ? (
    <div className={styles['notify-message']}>
      <div className={styles['notify-label']}>
        {notifyIcon}
        {nodeLabel}
      </div>
      <div className={styles['content-wrapper']}>
        <div className={styles['marquee-inner']}>
          <div className={styles['content']}>{notifyMessage?.content}</div>
          <div aria-hidden="true" className={styles['content']}>
            {notifyMessage?.content}
          </div>
        </div>
      </div>
      {isQuotaExceeded && (
        <div className={styles['notify-actions']}>
          <YakitButton type="primary" onClick={() => emiter.emit('onOpenRecharge', '')}>
            {t('CeUserMenu.recharge')}
          </YakitButton>
          <YakitButton type="text" aria-label={t('YakitButton.close')} icon={<XOutlined />} onClick={onClose} />
        </div>
      )}
    </div>
  ) : (
    <></>
  )
})
