import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'

import styles from './AIReActChat.module.scss'
import { AIHandleStartResProps, AINotifyMessageProps, AIReActChatProps, AISendResProps } from './AIReActChatType'
import { AIReActChatContents } from '../aiReActChatContents/AIReActChatContents'
import { AIChatTextareaRefProps, AIChatTextareaSubmit } from '@/pages/ai-agent/template/type'
import { useControllableValue, useCreation, useMemoizedFn } from 'ahooks'
import { yakitNotify } from '@/utils/notification'
import useAIAgentStore from '@/pages/ai-agent/useContext/useStore'
import classNames from 'classnames'
import { ChevrondownButton } from './AIReActComponent'
import { AIInputEvent, AIInputEventSyncTypeEnum, AISourceEnum, AIStartParams } from '../hooks/grpcApi'
import { AITaskQuery } from '@/pages/ai-agent/components/aiTaskQuery/AITaskQuery'
import { HandleStartParams } from '@/pages/ai-agent/aiAgentChat/type'
import { formatAIAgentSetting, getAIReActRequestParams } from '@/pages/ai-agent/utils'
import { AISession } from '@/pages/ai-agent/type/aiChat'
import useAIAgentDispatcher from '@/pages/ai-agent/useContext/useDispatcher'
import { randomString } from '@/utils/randomUtil'
import useAINodeLabel from '../hooks/useAINodeLabel'
import useSessionId from '../hooks/useSessionId'
import emiter from '@/utils/eventBus/eventBus'
import { useCurrentMeta, useCurrentStore } from '../hooks/useCurrentDataBySession'
import { useStore } from 'zustand'
import useCurrentSessionId from '../hooks/useCurrentSessionId'
import { AIReActChatHeader } from './aiReActChatHeader/AIReActChatHeader'
import { AIToDoListWrapper } from './aiToDoListWrapper/AIToDoListWrapper'
import { AIReactChatTextarea } from './aiReactChatTextarea/AIReactChatTextarea'

export const AIReActChat: React.FC<AIReActChatProps> = React.memo(
  forwardRef((props, ref) => {
    const {
      chatContainerClassName,
      chatContainerHeaderClassName,
      title = '自由对话',
      sendRequest,
      startRequest,
      externalParameters,
    } = props
    const { setActiveChat, getSetting, onStart, onSend } = useAIAgentDispatcher()

    const sessionId = useCurrentSessionId()
    const store = useCurrentStore()
    const meta = useCurrentMeta()

    const wrapperRef = useRef<HTMLDivElement>(null)

    const [showFreeChat, setShowFreeChat] = useControllableValue<boolean>(props, {
      defaultValue: true,
      valuePropName: 'showFreeChat',
      trigger: 'setShowFreeChat',
    })

    const { activeChat, setting } = useAIAgentStore()
    const { getSession } = useSessionId()

    const aiChatTextareaRef = useRef<AIChatTextareaRefProps>({
      setMention: () => {},
      setValue: () => {},
      setHttpFlow: () => {},
      getValue: () => {},
    })
    useImperativeHandle(ref, () => {
      return {
        ...aiChatTextareaRef.current,
        handleStart: (value) => handleStart(value),
      }
    }, [])
    useEffect(() => {
      if (!!activeChat?.SessionID) {
        aiChatTextareaRef.current.setValue('')
      }
    }, [activeChat?.SessionID])
    // #region 问题相关逻辑
    // 初始化 AI ReAct
    const handleSubmit = useMemoizedFn((value: AIChatTextareaSubmit) => {
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

    const handleStart = useMemoizedFn((value: HandleStartParams) => {
      const { qs, sessionId } = value
      const sessionID = activeChat?.SessionID || '' // 判断历史还是新建

      const source = getSetting().Source ?? AISourceEnum.aiAgent // getSetting保证最新
      const request: AIStartParams = {
        ...formatAIAgentSetting(setting),
        UserQuery: qs,
        CoordinatorId: '',
        Sequence: 1,
        PreferSessionCachedConfig: true,
        Source: source,
      }

      const session = getSession(sessionId)

      request.TimelineSessionID = session
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
        const { params, extraParams, onChat, onChatFromHistory } = res
        if (!sessionID) {
          // 创建新的聊天记录
          const newChat: AISession = {
            Id: extraParams?.chatId || session,
            Title: qs || `AI Agent - ${new Date().toLocaleString()}`,
            question: qs,
            CreatedAt: new Date().getTime(),
            UpdatedAt: new Date().getTime(),
            StartParams: request,
            SessionID: session,
            TitleInitialized: false,
            Source: request.Source ?? 'ai',
            LastUsedAt: new Date().getTime(),
            isCreate: true,
          }

          setActiveChat && setActiveChat(newChat)
          emiter.emit(
            'sessionData',
            JSON.stringify({ type: 'prependSession', payload: { ...newChat, isCreate: false } }),
          )
          // 新建的额外操作
          onChat?.()
        } else {
          // 历史中的额外操作
          onChatFromHistory?.(sessionID)
        }
        aiChatTextareaRef.current.setMention({
          mentionId: params.FocusModeLoop || randomString(8),
          mentionType: 'focusMode',
          mentionName: params.FocusModeLoop || '',
        })
        onStart({
          params,
        })
      }
      if (!!startRequest) {
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

    /**自由对话 */
    const handleSend = useMemoizedFn((data: HandleStartParams) => {
      if (!activeChat?.SessionID) return
      try {
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
        if (!!sendRequest) {
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
      } catch (error) {}
    })

    // #endregion

    const isShowRetract = useCreation(() => {
      return showFreeChat
    }, [showFreeChat])
    const isShowExpand = useCreation(() => {
      return !showFreeChat
    }, [showFreeChat])
    const handleSwitchShowFreeChat = useMemoizedFn((v) => {
      setShowFreeChat(v)
    })

    const onSetQuestion = useMemoizedFn((value: string) => {
      aiChatTextareaRef?.current?.setValue(value ?? '')
    })

    const handleStopCasualTask = useMemoizedFn(() => {
      const currentCasualTaskID = meta.currentCasualTaskID
      if (!store.getState().execute || !currentCasualTaskID) return

      store.getState().updateState({
        cancelCasualLoading: true,
      })
      const info: AIInputEvent = {
        IsSyncMessage: true,
        SyncType: AIInputEventSyncTypeEnum.SYNC_TYPE_REACT_CANCEL_TASK,
        SyncJsonInput: JSON.stringify({ task_id: currentCasualTaskID }),
        SyncID: randomString(8),
      }
      onSend({ token: sessionId, type: 'casual', params: info })
    })

    return (
      <>
        <div
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
            <div className={classNames(styles['chat-container'], chatContainerClassName)}>
              <AIReActChatHeader
                title={title}
                chatContainerHeaderClassName={chatContainerHeaderClassName}
                isShowRetract={isShowRetract}
                externalParameters={externalParameters}
                handleSwitchShowFreeChat={handleSwitchShowFreeChat}
              />
              <AIToDoListWrapper />
              <AIReActChatContents />
            </div>
            <div className={classNames(styles['chat-footer'])}>
              <div className={styles['footer-body']}>
                <div className={styles['footer-inputs']}>
                  <AITaskQuery />
                  <AINotifyMessage />
                  <div className={classNames(styles['footer-inputs-file-list'])}>
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
          <div className={styles['open-wrapper']} onClick={(e) => handleSwitchShowFreeChat(true)}>
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

  const { nodeLabel } = useAINodeLabel(notifyMessage?.label)

  return execute && notifyMessage?.content ? (
    <div className={styles['notify-message']}>
      <div>{nodeLabel}</div>
      <div className={styles['content-wrapper']}>
        <div className={styles['marquee-inner']}>
          <div className={styles['content']}>{notifyMessage?.content}</div>
          <div aria-hidden="true" className={styles['content']}>
            {notifyMessage?.content}
          </div>
        </div>
      </div>
    </div>
  ) : (
    <></>
  )
})
