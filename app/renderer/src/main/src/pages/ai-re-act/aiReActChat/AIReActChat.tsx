import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'

import styles from './AIReActChat.module.scss'
import { AIHandleStartResProps, AINotifyMessageProps, AIReActChatProps, AISendResProps } from './AIReActChatType'
import { AIChatTextarea } from '@/pages/ai-agent/template/template'
import { AIReActChatContents } from '../aiReActChatContents/AIReActChatContents'
import type { AIReActChatContentsRef } from '../aiReActChatContents/AIReActChatContentsType'
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
import { TodoListCardData, AIChatQSDataTypeEnum } from '../hooks/aiRender'
import { OutlineLandPlotIcon, OutlineListTodoIcon } from '@/assets/icon/outline'
import TaskDetailsPopover from '@/components/historyAIReActChat/TaskDetailsPopover'
import { YakitPopover } from '@/components/yakitUI/YakitPopover/YakitPopover'
import { SolidChatIcon } from '@/assets/icon/solid'

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
    const sessionRef = useRef<string | undefined>(undefined)
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

    const getPlanDetails = useMemoizedFn(() => {
      if (!activeChat?.SessionID) return
      return chatIPCEvents.fetchChatDataStore()?.get(activeChat?.SessionID)?.casualChat?.planDetails
    })

    const reActTaskId: string = useCreation(() => {
      if (!activeChat?.SessionID) return ''
      return getPlanDetails()?.taskId ?? ''
    }, [chatIPCData.casualChat?.toolListRenderNumber, activeChat?.SessionID])

    const todoData: TodoListCardData = useCreation(() => {
      if (!activeChat?.SessionID) return cloneDeep(DefaultTodoListCardData)
      try {
        return getPlanDetails()?.todoList || cloneDeep(DefaultTodoListCardData)
      } catch (error) {
        return cloneDeep(DefaultTodoListCardData)
      }
    }, [chatIPCData.casualChat?.toolListRenderNumber, activeChat?.SessionID])

    const aiReActChatContentsRef = useRef<AIReActChatContentsRef>(null)
    const casualConcurrentTaskList = useCreation(() => {
      return chatIPCData.casualChat.elements
        .filter((item) => item.kind === 'task' && item.type === AIChatQSDataTypeEnum.TASK_NODE_GROUP)
        .map((item) => item.token)
    }, [chatIPCData.casualChat.elements])

    const getCasualConcurrentTaskName = useMemoizedFn((token: string) => {
      const contentMap = chatIPCEvents.fetchChatDataStore()?.get(activeChat?.SessionID || '')?.casualChat?.contents
      const chatData = contentMap?.get(token)
      return (
        (chatData?.data as { taskName?: string; goal?: string })?.taskName ||
        (chatData?.data as { goal?: string })?.goal ||
        token
      )
    })

    const onScrollToConcurrentTask = useMemoizedFn((token: string) => {
      const index = chatIPCData.casualChat.elements.findIndex((item) => item.kind === 'task' && item.token === token)
      if (index !== -1) {
        aiReActChatContentsRef.current?.scrollToItemIndex(index, 'smooth')
      }
    })

    const getTaskId = useMemoizedFn(() => {
      return chatIPCEvents.fetchCurrentCasualTaskID()
    })

    const defaultTaskTabLabel = useCreation(() => {
      return typeof title === 'string' ? title : '自由对话'
    }, [title])

    const emitTaskContentTab = useMemoizedFn((type: 'add' | 'update', label?: string) => {
      const taskId = getTaskId()
      const sessionId = activeChat?.SessionID
      if (!taskId || !sessionId) return false
      if (chatDataStoreKey !== 'aiChatDataStore') return false
      emiter.emit(
        'actionAITaskContentTab',
        JSON.stringify({
          type,
          params: {
            key: sessionId,
            taskId,
            label: label || activeChat?.Title || defaultTaskTabLabel,
            goal: '',
          },
        }),
      )
      return true
    })

    const syncCasualTaskTab = useMemoizedFn(() => {
      const sessionId = activeChat?.SessionID
      if (!getTaskId() || !sessionId) return
      if (chatDataStoreKey !== 'aiChatDataStore') return
      emitTaskContentTab('add')
      sessionRef.current = sessionId
    })

    const onDetails = useMemoizedFn(() => {
      if (!getTaskId()) {
        yakitNotify('error', 'taskId不存在')
        return
      }
      if (chatDataStoreKey !== 'aiChatDataStore') {
        yakitNotify('info', '当前会话不属于 AIAgent 数据源，无法查看任务详情')
        return
      }
      syncCasualTaskTab()
    })

    useEffect(() => {
      if (sessionRef.current && sessionRef.current !== activeChat?.SessionID) {
        sessionRef.current = undefined
      }
    }, [activeChat?.SessionID])

    useEffect(() => {
      if (!casualLoading) return
      syncCasualTaskTab()
    }, [casualLoading, syncCasualTaskTab])

    useEffect(() => {
      if (!activeChat?.Title || !activeChat?.SessionID) return
      if (sessionRef.current !== activeChat.SessionID) return
      emitTaskContentTab('update', activeChat.Title)
    }, [activeChat?.Title, activeChat?.SessionID, emitTaskContentTab])

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
                      场景:<span className={styles['text']}>{focusMode}</span>
                    </YakitTag>
                  )}
                </div>
                <div className={styles['chat-header-extra']}>
                  {isShowRetract && (
                    <>
                      {!!casualConcurrentTaskList.length && (
                        <YakitPopover
                          overlayClassName={styles['chat-locate-popover']}
                          content={
                            <div className={styles['chat-locate-list']}>
                              {casualConcurrentTaskList.map((token) => (
                                <div
                                  key={token}
                                  className={styles['chat-locate-item']}
                                  onClick={() => onScrollToConcurrentTask(token)}
                                >
                                  <SolidChatIcon /> {getCasualConcurrentTaskName(token)}
                                </div>
                              ))}
                            </div>
                          }
                          placement="bottom"
                        >
                          <YakitButton type="outline2" radius="28px" icon={<OutlineLandPlotIcon />}>
                            子Agent任务
                          </YakitButton>
                        </YakitPopover>
                      )}
                      {externalParameters?.rightIcon ? (
                        <>
                          {getTaskId() && externalParameters.rightIcon.taskDetails && <TaskDetailsPopover />}
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
                              destroyOnHidden
                              classNames={{ root: styles['history-chat-tooltip'] }}
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
                        <>
                          {getTaskId() && (
                            <YakitButton
                              type="outline2"
                              radius="28px"
                              icon={<OutlineListTodoIcon />}
                              onClick={onDetails}
                            >
                              任务详情
                            </YakitButton>
                          )}
                          <ChevronleftButton onClick={(e) => handleSwitchShowFreeChat(false)} />
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>
              {reActTaskId === chatIPCEvents.fetchCurrentCasualTaskID() && todoData?.items?.length > 0 && (
                <div className={styles['todoList-wrapper']}>
                  <AIToDoList className={styles['to-do-list']} todoData={todoData} />
                </div>
              )}
              <AIReActChatContents ref={aiReActChatContentsRef} chats={chatIPCData.casualChat} />
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
