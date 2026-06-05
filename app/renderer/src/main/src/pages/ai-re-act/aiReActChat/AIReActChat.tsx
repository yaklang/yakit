import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'

import styles from './AIReActChat.module.scss'
import { AIHandleStartResProps, AINotifyMessageProps, AIReActChatProps, AISendResProps } from './AIReActChatType'
import { AIChatTextarea } from '@/pages/ai-agent/template/template'
import { AIReActChatContents } from '../aiReActChatContents/AIReActChatContents'
import { AIChatTextareaRefProps, AIChatTextareaSubmit } from '@/pages/ai-agent/template/type'
import { useControllableValue, useCreation, useMemoizedFn } from 'ahooks'
import { yakitNotify } from '@/utils/notification'
import { ColorsChatIcon } from '@/assets/icon/colors'
import useAIAgentStore from '@/pages/ai-agent/useContext/useStore'
import classNames from 'classnames'
import useChatIPCStore from '@/pages/ai-agent/useContext/ChatIPCContent/useStore'
import useChatIPCDispatcher from '@/pages/ai-agent/useContext/ChatIPCContent/useDispatcher'
import { ChevrondownButton, ChevronleftButton, RoundedStopButton } from './AIReActComponent'
import { Tooltip } from 'antd'
import { ClockIcon } from '@/assets/newIcon'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import HistoryChat from '@/pages/ai-agent/historyChat/HistoryChat'
import { AIInputEvent, AIInputEventSyncTypeEnum, AIStartParams } from '../hooks/grpcApi'
import { AITaskQuery } from '@/pages/ai-agent/components/aiTaskQuery/AITaskQuery'
import { HandleStartParams } from '@/pages/ai-agent/aiAgentChat/type'
import { formatAIAgentSetting, getAIReActRequestParams } from '@/pages/ai-agent/utils'
import { YakitTag } from '@/components/yakitUI/YakitTag/YakitTag'
import { AISession } from '@/pages/ai-agent/type/aiChat'
import useAIAgentDispatcher from '@/pages/ai-agent/useContext/useDispatcher'
import { randomString } from '@/utils/randomUtil'
import useAINodeLabel from '../hooks/useAINodeLabel'
import useSessionId from '../hooks/useSessionId'
import useGetChatDataStoreKey, {
  getAISourceFromChatDataStoreKey,
  getAISourceListFromChatDataStoreKey,
} from '../hooks/useGetChatDataStoreKey'
import { AISendSyncMessageParams } from '@/pages/ai-agent/useContext/ChatIPCContent/ChatIPCContent'
import emiter from '@/utils/eventBus/eventBus'
import { omit } from 'lodash'
import AIContextToken from '@/pages/ai-agent/aiChatContent/AIContextToken/AIContextToken'
import { AIToDoList } from './aiToDoList/AIToDoList'
import { cloneDeep } from 'lodash'
import { DefaultTodoListCardData } from '../hooks/defaultConstant'
import { TodoListCardData } from '../hooks/aiRender'

export const AIReActChat: React.FC<AIReActChatProps> = React.memo(
  forwardRef((props, ref) => {
    const {
      mode,
      chatContainerClassName,
      chatContainerHeaderClassName,
      title = '自由对话',
      sendRequest,
      startRequest,
      externalParameters,
    } = props
    const { setActiveChat } = useAIAgentDispatcher()

    const { chatDataStoreKey } = useGetChatDataStoreKey()
    const historyChatAISource = useCreation(
      () => getAISourceListFromChatDataStoreKey(chatDataStoreKey),
      [chatDataStoreKey],
    )
    const { chatIPCData } = useChatIPCStore()
    const { chatIPCEvents, handleSendSyncMessage } = useChatIPCDispatcher()
    const execute = useCreation(() => chatIPCData.execute, [chatIPCData.execute])
    const focusMode = useCreation(() => chatIPCData.focusMode, [chatIPCData.focusMode])
    const notifyMessage = useCreation(() => chatIPCData.notifyMessage, [chatIPCData.notifyMessage])

    const wrapperRef = useRef<HTMLDivElement>(null)

    const [showFreeChat, setShowFreeChat] = useControllableValue<boolean>(props, {
      defaultValue: true,
      valuePropName: 'showFreeChat',
      trigger: 'setShowFreeChat',
    })

    const { activeChat, setting } = useAIAgentStore()
    const { getSession } = useSessionId()

    const contextTokenSession = useCreation(() => {
      return activeChat?.SessionID || setting.TimelineSessionID
    }, [activeChat?.SessionID, setting.TimelineSessionID])

    const questionQueue = useCreation(() => chatIPCData.questionQueue, [chatIPCData.questionQueue])

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
      if (execute) {
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

      const request: AIStartParams = {
        ...formatAIAgentSetting(setting),
        UserQuery: qs,
        CoordinatorId: '',
        Sequence: 1,
        PreferSessionCachedConfig: true,
        Source: getAISourceFromChatDataStoreKey(chatDataStoreKey),
      }

      const session = getSession(sessionId)

      request.TimelineSessionID = session
      const { extra, attachedResourceInfo } = getAIReActRequestParams(value)
      // 发送初始化参数
      const aiInputEvent: AIInputEvent = {
        IsStart: true,
        Params: {
          ...request,
        },
        AttachedResourceInfo: attachedResourceInfo,
        FocusModeLoop: value.focusMode,
      }
      const onStart = (res: AIHandleStartResProps) => {
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
          emiter.emit('sessionData', JSON.stringify({ type: 'prependSession', payload: newChat }))
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
        chatIPCEvents.onStart({ token: request.TimelineSessionID!, params, extraValue: extra })
      }
      if (!!startRequest) {
        startRequest({
          params: aiInputEvent,
        })
          .then((res) => {
            onStart(res)
          })
          .catch(() => {
            onStart({
              params: aiInputEvent,
            })
          })
      } else {
        onStart({
          params: aiInputEvent,
        })
      }
    })

    /**自由对话 */
    const handleSend = useMemoizedFn((data: HandleStartParams) => {
      if (!activeChat?.SessionID) return
      try {
        const { extra, attachedResourceInfo } = getAIReActRequestParams(data)
        const chatMessage: AIInputEvent = {
          IsFreeInput: true,
          FreeInput: data.qs,
          AttachedResourceInfo: attachedResourceInfo,
          FocusModeLoop: data.focusMode,
        }
        const onSend = (res: AISendResProps) => {
          const { params } = res
          chatIPCEvents.onSend({
            token: activeChat.SessionID,
            type: 'casual',
            params: {
              IsFreeInput: true,
              ...params,
            },
            extraValue: extra,
          })
          emiter.emit('sessionData', JSON.stringify({ type: 'refresh', sessionId: activeChat.SessionID }))
        }
        if (!!sendRequest) {
          sendRequest?.({ params: chatMessage })
            .then((res) => {
              const { params } = res
              // 发送到服务端
              onSend({
                params,
              })
            })
            .catch(() => {
              onSend({
                params: chatMessage,
              })
            })
        } else {
          onSend({
            params: chatMessage,
          })
        }
      } catch (error) {}
    })

    // #endregion

    const isShowRetract = useCreation(() => {
      return mode === 'task' && showFreeChat
    }, [mode, showFreeChat])
    const isShowExpand = useCreation(() => {
      return mode === 'task' && !showFreeChat
    }, [mode, showFreeChat])
    const handleSwitchShowFreeChat = useMemoizedFn((v) => {
      setShowFreeChat(v)
    })

    const onSetQuestion = useMemoizedFn((value: string) => {
      aiChatTextareaRef?.current?.setValue(value ?? '')
    })

    const cancelCasualLoading = useCreation(() => {
      return chatIPCData.cancelCasualLoading
    }, [chatIPCData.cancelCasualLoading])
    const casualLoading = useCreation(() => {
      return chatIPCData.casualLoading
    }, [chatIPCData.casualLoading])
    const handleStopCasualTask = useMemoizedFn(() => {
      const currentCasualTaskID = chatIPCEvents.fetchCurrentCasualTaskID()
      if (!chatIPCData.execute || !currentCasualTaskID) return

      chatIPCEvents.handleCancelLoadingChange('reAct', true)
      const params: AISendSyncMessageParams = {
        syncType: AIInputEventSyncTypeEnum.SYNC_TYPE_REACT_CANCEL_TASK,
        SyncJsonInput: JSON.stringify({ task_id: currentCasualTaskID }),
      }
      handleSendSyncMessage(params)
    })
    const todoData: TodoListCardData = useCreation(() => {
      if (!activeChat?.SessionID) return cloneDeep(DefaultTodoListCardData)
      try {
        return (
          chatIPCEvents.fetchChatDataStore()?.get(activeChat?.SessionID)?.casualChat.todoList ||
          cloneDeep(DefaultTodoListCardData)
        )
      } catch (error) {
        return cloneDeep(DefaultTodoListCardData)
      }
    }, [chatIPCData.casualChat.toolListRenderNumber, activeChat?.SessionID])
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
              <div className={classNames(styles['chat-header'], chatContainerHeaderClassName)}>
                <div className={styles['chat-header-title']}>
                  <ColorsChatIcon />
                  <span className={styles['chat-header-title-text']}>{title}</span>
                  {focusMode && (
                    <YakitTag fullRadius={true} className={styles['chat-header-focus-mode']}>
                      场景:{focusMode}
                    </YakitTag>
                  )}
                </div>
                <div className={styles['chat-header-extra']}>
                  {isShowRetract &&
                    (externalParameters?.rightIcon ? (
                      <>
                        {externalParameters.rightIcon.dataDetails && (
                          <AIContextToken
                            iconOnly
                            execute={execute}
                            session={contextTokenSession}
                            buttonProps={
                              externalParameters.rightIcon.dataDetails === true
                                ? undefined
                                : externalParameters.rightIcon.dataDetails
                            }
                          />
                        )}
                        {externalParameters.rightIcon.history && (
                          <Tooltip
                            trigger={['click']}
                            destroyTooltipOnHide
                            overlayClassName={styles['history-chat-tooltip']}
                            title={
                              <div className={styles['history-chat-tooltip-content']}>
                                <HistoryChat embedded aiSource={historyChatAISource} />
                              </div>
                            }
                          >
                            <YakitButton type="text2" icon={<ClockIcon />} title="" />
                          </Tooltip>
                        )}
                        {externalParameters.rightIcon.add}
                        {externalParameters.rightIcon.close}
                      </>
                    ) : (
                      <ChevronleftButton onClick={(e) => handleSwitchShowFreeChat(false)} />
                    ))}
                </div>
              </div>
              {todoData?.items?.length > 0 && (
                <div className={styles['todoList-wrapper']}>
                  <AIToDoList className={styles['to-do-list']} todoData={todoData} />
                </div>
              )}
              <AIReActChatContents chats={chatIPCData.casualChat} />
            </div>
            <div className={classNames(styles['chat-footer'])}>
              <div className={styles['footer-body']}>
                <div className={styles['footer-inputs']}>
                  {execute && questionQueue?.total > 0 && <AITaskQuery />}
                  {execute && notifyMessage?.content && <AINotifyMessage notifyMessage={notifyMessage} />}

                  <div className={classNames(styles['footer-inputs-file-list'])}>
                    <AIChatTextarea
                      ref={aiChatTextareaRef}
                      loading={false}
                      onSubmit={handleSubmit}
                      inputFooterRight={
                        <div className={styles['extra-footer-right']}>
                          {casualLoading && (
                            <RoundedStopButton
                              loading={cancelCasualLoading}
                              onClick={handleStopCasualTask}
                              style={{ width: 24, height: 24 }}
                            />
                          )}
                        </div>
                      }
                      chatDataStoreKey={chatDataStoreKey}
                      {...omit(externalParameters, 'rightIcon')}
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

const AINotifyMessage: React.FC<AINotifyMessageProps> = React.memo((props) => {
  const { notifyMessage } = props
  const { nodeLabel } = useAINodeLabel(notifyMessage?.label)
  return (
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
  )
})
