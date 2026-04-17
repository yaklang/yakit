import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import {
  AIGlobalCommandPopoverProps,
  AIGlobalCommandProps,
  AIGlobalCommandRefProps,
  AIManualAdditionPopoverProps,
  AIManualAdditionProps,
  AIReActTaskChatContentProps,
  AIReActTaskChatLeftSideProps,
  AIReActTaskChatProps,
  AIRenderTaskFooterExtraProps,
} from './AIReActTaskChatType'
import styles from './AIReActTaskChat.module.scss'
import { ColorsBrainCircuitIcon } from '@/assets/icon/colors'
import { AIAgentChatStream, AIChatLeftSide } from '@/pages/ai-agent/chatTemplate/AIAgentChatTemplate'
import { useControllableValue, useCreation, useMemoizedFn, useUpdateEffect } from 'ahooks'
import classNames from 'classnames'
import useChatIPCStore from '@/pages/ai-agent/useContext/ChatIPCContent/useStore'
import { ChevrondownButton } from '../aiReActChat/AIReActComponent'
import { AIReActTaskChatReview } from '@/pages/ai-agent/aiAgentChat/AIAgentChat'
import {
  OutlineArrowscollapseIcon,
  OutlineArrowsexpandIcon,
  OutlineCodeIcon,
  OutlineExitIcon,
  OutlineHandIcon,
  OutlinePlay2Icon,
  OutlinePositionIcon,
  RedoDotIcon,
} from '@/assets/icon/outline'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import useChatIPCDispatcher from '@/pages/ai-agent/useContext/ChatIPCContent/useDispatcher'
import { AIChatQSData, AIChatQSDataTypeEnum, AIReviewType } from '../hooks/aiRender'
import { YakitPopconfirm } from '@/components/yakitUI/YakitPopconfirm/YakitPopconfirm'
import { AIInputEventSyncTypeEnum, AITaskStatus } from '../hooks/grpcApi'
import { Tooltip } from 'antd'
import useAIAgentStore from '@/pages/ai-agent/useContext/useStore'
import emiter from '@/utils/eventBus/eventBus'
import { randomString } from '@/utils/randomUtil'
import useGetAIMaterialsData from '../hooks/useGetAIMaterialsData'
import { AIRecommendItem } from '@/pages/ai-agent/aiChatWelcome/type'
import { AIMentionCommandParams } from '@/pages/ai-agent/components/aiMilkdownInput/aiMilkdownMention/aiMentionPlugin'
import { YakitResizeBox } from '@/components/yakitUI/YakitResizeBox/YakitResizeBox'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { YakitPopover } from '@/components/yakitUI/YakitPopover/YakitPopover'
import useAIGlobalConfig from '../hooks/useAIGlobalConfig'
import { YakitInput } from '@/components/yakitUI/YakitInput/YakitInput'
import { v4 as uuidv4 } from 'uuid'
import moment from 'moment'
import AIReActTaskEmpty from './AIReActTaskEmpty'

const AIReActTaskChat: React.FC<AIReActTaskChatProps> = React.memo((props) => {
  const { setShowFreeChat, setTimeLine } = props
  const [{ randomAIMaterialsData, loadingAIMaterials }, { onRefresh }] = useGetAIMaterialsData()

  const { taskChat } = useChatIPCStore().chatIPCData
  const [leftExpand, setLeftExpand] = useState(true)
  const [expand, setExpand] = useState(false)

  const onIsExpand = useMemoizedFn(() => {
    setLeftExpand(expand)
    setShowFreeChat(expand)
    setExpand((v) => !v)
  })

  useEffect(() => {
    setTimeLine(leftExpand)
  }, [leftExpand])

  const onClickItem = useMemoizedFn((item: AIRecommendItem, mentionType: AIMentionCommandParams['mentionType']) => {
    const params: AIMentionCommandParams = {
      mentionId: randomString(8),
      mentionType,
      mentionName: item.name,
    }
    emiter.emit(
      'setAIInputByType',
      JSON.stringify({
        type: 'mention',
        params,
      }),
    )
  })
  return (
    <div className={styles['ai-re-act-task-chat']}>
      <YakitResizeBox
        firstRatio={'30%'}
        lineDirection="right"
        firstMinSize={leftExpand ? 300 : 30}
        lineStyle={{ width: leftExpand ? 4 : 0 }}
        freeze={leftExpand}
        firstNodeStyle={{
          width: '30%',
          overflow: 'hidden',
          maxWidth: leftExpand ? '' : '30px',
          borderRight: leftExpand ? 'none' : '1px solid var(--Colors-Use-Neutral-Border)',
        }}
        secondNodeStyle={{ width: leftExpand ? '100%' : 'calc(100% - 30px)', overflow: 'auto hidden' }}
        firstNode={<AIReActTaskChatLeftSide leftExpand={leftExpand} setLeftExpand={setLeftExpand} />}
        secondNode={
          <>
            {!!taskChat?.elements?.length ? (
              <div className={styles['chat-content-wrapper']}>
                <div className={styles['header']}>
                  <div className={styles['title']}>
                    <ColorsBrainCircuitIcon />
                    深度规划
                  </div>
                  <div className={styles['extra']}>
                    <YakitButton
                      type="text2"
                      icon={expand ? <OutlineArrowscollapseIcon /> : <OutlineArrowsexpandIcon />}
                      onClick={onIsExpand}
                    />
                  </div>
                </div>
                <AIReActTaskChatContent />
              </div>
            ) : (
              <AIReActTaskEmpty
                loadingAIMaterials={loadingAIMaterials}
                randomAIMaterialsData={randomAIMaterialsData}
                onRefresh={onRefresh}
                onClickItem={onClickItem}
              />
            )}
          </>
        }
      />
    </div>
  )
})

export default AIReActTaskChat

const AIReActTaskChatContent: React.FC<AIReActTaskChatContentProps> = React.memo((props) => {
  const { reviewInfo, planReviewTreeKeywordsMap, chatIPCData } = useChatIPCStore()
  const { t } = useI18nNamespaces(['aiAgent'])
  const { activeChat } = useAIAgentStore()
  const { taskChat } = chatIPCData

  const [visible, setVisible] = useState<boolean>(false)

  const { handleSendSyncMessage, chatIPCEvents } = useChatIPCDispatcher()

  const streams = useCreation(() => {
    return taskChat.elements
  }, [taskChat.elements])

  const [scrollToBottom, setScrollToBottom] = useState(false)
  const onScrollToBottom = useMemoizedFn(() => {
    setScrollToBottom((v) => !v)
  })

  const getTaskInfo = useMemoizedFn(() => {
    return chatIPCEvents.fetchTaskChatID()
  })
  const getTaskId = useMemoizedFn(() => {
    return getTaskInfo()?.taskID
  })
  /**取消当前指定任务 */
  const onStopTask = useMemoizedFn(() => {
    const taskId = getTaskId()
    if (!taskId) return
    handleSendSyncMessage({
      syncType: AIInputEventSyncTypeEnum.SYNC_TYPE_REACT_CANCEL_TASK,
      SyncJsonInput: JSON.stringify({ task_id: taskId }),
    })
    if (!!reviewInfo) {
      chatIPCEvents.handleTaskReviewRelease((reviewInfo.data as AIReviewType).id)
    }
    emiter.emit('onRefreshAITaskHistoryList')
  })
  /**取消当前执行的子任务 */
  const onStopSubTask = useMemoizedFn((syncID: string) => {
    handleSendSyncMessage({
      syncType: AIInputEventSyncTypeEnum.SYNC_TYPE_SKIP_SUBTASK_IN_PLAN,
      SyncJsonInput: JSON.stringify({ reason: '用户认为这个任务不需要执行', skip_current_task: true }),
      syncID: syncID,
    })
    if (!!reviewInfo) {
      chatIPCEvents.handleTaskReviewRelease((reviewInfo.data as AIReviewType).id)
    }
    setTimeout(() => {
      handleSendSyncMessage({ syncType: AIInputEventSyncTypeEnum.SYNC_TYPE_PLAN_EXEC_TASKS })
      emiter.emit('onRefreshAITaskHistoryList')
    }, 500)
  })
  const onExtraAction = useMemoizedFn((type: 'stopTask' | 'stopSubTask' | 'recover', syncID: string) => {
    switch (type) {
      case 'stopTask':
        onStopTask()
        break
      case 'stopSubTask':
        onStopSubTask(syncID)
        break
      case 'recover':
        onRecover()
        break
      default:
        break
    }
  })
  const onRecover = useMemoizedFn(() => {
    const info = getTaskInfo()
    const coordinatorId = info?.coordinatorId
    const taskId = info?.taskID
    if (!coordinatorId) return
    // 选停止当前任务，再发送恢复的数据
    !!taskId &&
      handleSendSyncMessage({
        syncType: AIInputEventSyncTypeEnum.SYNC_TYPE_REACT_CANCEL_TASK,
        SyncJsonInput: JSON.stringify({ task_id: taskId }),
      })

    setTimeout(() => {
      handleSendSyncMessage({
        syncType: AIInputEventSyncTypeEnum.SYNC_TYPE_RECOVERY_PLAN_AND_EXEC,
        SyncJsonInput: JSON.stringify({ coordinator_id: coordinatorId }),
      })
    }, 200)
    emiter.emit('onRefreshAITaskHistoryList')
    if (!!reviewInfo) {
      chatIPCEvents.handleTaskReviewRelease((reviewInfo.data as AIReviewType).id)
    }
  })

  return (
    <>
      <div className={styles['tab-content']}>
        <AIAgentChatStream
          streams={streams}
          session={activeChat?.SessionID || ''}
          scrollToBottom={scrollToBottom}
          taskStatus={chatIPCData.taskStatus}
        />
      </div>
      {!!reviewInfo ? (
        <AIReActTaskChatReview
          reviewInfo={reviewInfo}
          planReviewTreeKeywordsMap={planReviewTreeKeywordsMap}
          setScrollToBottom={setScrollToBottom}
          footerExtra={(node) => (
            <AIRenderTaskFooterExtra
              onExtraAction={onExtraAction}
              btnProps={{ size: 'middle' }}
              subTaskBtnProps={{
                size: 'middle',
                type: 'outline2',
                className: '',
                colors: 'primary',
                radius: '4px',
              }}
            >
              {node}
            </AIRenderTaskFooterExtra>
          )}
        />
      ) : (
        streams.length > 0 && (
          <div className={styles['footer']}>
            {chatIPCData.execute && (
              <AIManualAdditionPopover chatType="task">
                <YakitButton
                  type="outline2"
                  radius="28px"
                  icon={<OutlineHandIcon />}
                  onClick={(e) => {
                    e.stopPropagation()
                  }}
                  size="large"
                >
                  {t('AIReActTaskChatContent.humanIntervention')}
                </YakitButton>
              </AIManualAdditionPopover>
            )}

            <AIGlobalCommandPopover>
              <YakitButton icon={<OutlineCodeIcon />} radius="28px" type="outline2" size="large">
                {t('AIReActTaskChatContent.globalDirective')}
              </YakitButton>
            </AIGlobalCommandPopover>
            {!!getTaskId() && (
              <>
                <AIRenderTaskFooterExtra onExtraAction={onExtraAction} />
              </>
            )}
            <YakitButton
              type="outline2"
              icon={<OutlinePositionIcon />}
              radius="50%"
              onClick={onScrollToBottom}
              className={styles['position-button']}
              size="large"
            />
          </div>
        )
      )}
    </>
  )
})
export const AIManualAdditionPopover: React.FC<AIManualAdditionPopoverProps> = React.memo((props) => {
  const { children, chatType } = props
  const [manualAdditionVisible, setManualAdditionVisible] = useControllableValue<boolean>(props, {
    defaultValue: false,
    valuePropName: 'visible',
    trigger: 'setVisible',
  })

  return (
    <YakitPopover
      visible={manualAdditionVisible}
      content={<AIManualAddition chatType={chatType} onCancel={() => setManualAdditionVisible(false)} />}
      onVisibleChange={setManualAdditionVisible}
      trigger={'click'}
    >
      {children}
    </YakitPopover>
  )
})

const AIManualAddition: React.FC<AIManualAdditionProps> = React.memo((props) => {
  const { chatType, onCancel } = props
  const { handleSendSyncMessage, chatIPCEvents } = useChatIPCDispatcher()
  const { chatIPCData, syncIdInfoMap } = useChatIPCStore()
  const [prompt, setPrompt] = useState<string>()

  const currentCoordinatorIdRef = useRef<string>('')
  const syncIdOfAddToContext = useRef<string>('')
  const syncIdOfAddAndReExecute = useRef<string>('')

  const taskStatus = useCreation(() => chatIPCData?.taskStatus, [chatIPCData?.taskStatus])

  useUpdateEffect(() => {
    if (!taskStatus.loading && currentCoordinatorIdRef.current) {
      onSendRecover(currentCoordinatorIdRef.current)
    }
  }, [taskStatus.loading])

  useEffect(() => {
    if (
      (syncIdOfAddToContext.current && !syncIdInfoMap?.get(syncIdOfAddToContext.current)) ||
      (syncIdOfAddAndReExecute.current && !syncIdInfoMap?.get(syncIdOfAddAndReExecute.current))
    ) {
      onReset()
    }
  }, [syncIdInfoMap])

  useEffect(() => {
    if (chatIPCData.execute) return
    onReset()
  }, [chatIPCData.execute])

  const onReset = useMemoizedFn(() => {
    onCancel()
    setPrompt('')
    if (syncIdOfAddToContext.current) syncIdOfAddToContext.current = ''
    if (syncIdOfAddAndReExecute.current) syncIdOfAddAndReExecute.current = ''
  })

  const onAddAndReExecute = useMemoizedFn(() => {
    if (!prompt?.trim()) return
    // 加入上下文后，停止任务再恢复任务
    syncIdOfAddAndReExecute.current = randomString(8)
    onAddToContext(syncIdOfAddAndReExecute.current)
    const info = chatIPCEvents.fetchTaskChatID()
    const taskId = info?.taskID
    const coordinatorId = info?.coordinatorId
    if (!coordinatorId) return
    currentCoordinatorIdRef.current = coordinatorId
    chatIPCEvents.handleCancelLoadingChange('task', true)
    if (taskStatus?.loading && taskId) {
      // 选停止当前任务，等待任务停止成功后，再发送恢复的数据
      handleSendSyncMessage({
        syncType: AIInputEventSyncTypeEnum.SYNC_TYPE_REACT_CANCEL_TASK,
        SyncJsonInput: JSON.stringify({ task_id: taskId }),
      })
    } else {
      onSendRecover(coordinatorId)
    }
  })
  const onSendRecover = useMemoizedFn((coordinatorId: string) => {
    handleSendSyncMessage({
      syncType: AIInputEventSyncTypeEnum.SYNC_TYPE_RECOVERY_PLAN_AND_EXEC,
      SyncJsonInput: JSON.stringify({ coordinator_id: coordinatorId }),
    })
    currentCoordinatorIdRef.current = ''
  })
  const getTypeBySyncID = useMemoizedFn(() => {
    if (!!syncIdOfAddToContext.current) return '加入上下文'
    if (!!syncIdOfAddAndReExecute.current) return '加入并重新执行'
    return ''
  })
  const onAddToContext = useMemoizedFn((syncID: string) => {
    if (!prompt?.trim()) return
    handleSendSyncMessage({
      syncType: AIInputEventSyncTypeEnum.SYNC_TYPE_USER_INTERVENTION,
      SyncJsonInput: JSON.stringify({ content: prompt }),
      syncID: syncID,
    })
    onAddToList()
  })
  const onAddToList = useMemoizedFn(() => {
    const chatData: AIChatQSData = {
      id: uuidv4(),
      chatType,
      type: AIChatQSDataTypeEnum.USER_MANUAL_INTERVENTION,
      Timestamp: moment().unix(),
      data: { type: getTypeBySyncID(), content: prompt || '' },
      AIService: '',
      AIModelName: '',
    }
    chatIPCEvents.handleUserManualIntervention(chatData)
  })
  return (
    <div className={styles['ai-manual-addition']} onClick={(e) => e.stopPropagation()}>
      <div className={styles['ai-manual-addition-heard']}>人工介入</div>
      <YakitInput.TextArea
        rows={5}
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        isShowResize={false}
        placeholder="输入补充内容会加入上下文影响任务执行"
        maxLength={500}
        showCount
      />
      <div className={styles['ai-manual-addition-footer']}>
        <YakitPopconfirm title="如果当前有任务正在执行,确认后会停止当前任务并重新执行" onConfirm={onAddAndReExecute}>
          <YakitButton
            type="outline2"
            onClick={(e) => e.stopPropagation()}
            loading={!!syncIdInfoMap?.get(syncIdOfAddAndReExecute.current)}
            className={styles['add-and-reexecute-btn']}
            disabled={!!syncIdInfoMap?.get(syncIdOfAddToContext.current)}
          >
            加入并重新执行
          </YakitButton>
        </YakitPopconfirm>
        <YakitButton
          onClick={() => {
            syncIdOfAddToContext.current = randomString(8)
            onAddToContext(syncIdOfAddToContext.current)
          }}
          loading={!!syncIdInfoMap?.get(syncIdOfAddToContext.current)}
          disabled={!!syncIdInfoMap?.get(syncIdOfAddAndReExecute.current)}
        >
          加入上下文
        </YakitButton>
      </div>
    </div>
  )
})
export const AIGlobalCommandPopover: React.FC<AIGlobalCommandPopoverProps> = React.memo((props) => {
  const { children, childrenClass } = props
  const [visible, setVisible] = useState<boolean>(false)
  //#region AI全局指令相关逻辑
  const [_, event] = useAIGlobalConfig()

  const onSave = useMemoizedFn((prompt: string) => {
    setVisible(false)
    event.setAIGlobalConfig({ AIPresetPrompt: prompt })
  })
  const aiGlobalCommandRef = useRef<AIGlobalCommandRefProps>({ value: '' })
  const onGlobalCommandVisibleChange = useMemoizedFn((visible: boolean) => {
    if (!visible) {
      onSave(aiGlobalCommandRef.current?.value || '')
    } else {
      setVisible(true)
    }
  })
  //#endregion
  return (
    <YakitPopover
      visible={visible}
      content={<AIGlobalCommand ref={aiGlobalCommandRef} onCancel={() => setVisible(false)} onSave={onSave} />}
      destroyTooltipOnHide={true}
      onVisibleChange={onGlobalCommandVisibleChange}
      trigger={'click'}
    >
      <div
        onClick={(e) => {
          e.stopPropagation()
          setVisible(true)
        }}
        className={classNames(childrenClass)}
      >
        {children}
      </div>
    </YakitPopover>
  )
})
const AIGlobalCommand: React.FC<AIGlobalCommandProps> = React.memo(
  forwardRef((props, ref) => {
    const { t } = useI18nNamespaces(['aiAgent', 'yakitUi'])
    const { onCancel, onSave } = props
    const [aiGlobalConfigData] = useAIGlobalConfig()
    const [prompt, setPrompt] = useState<string>(aiGlobalConfigData?.aiGlobalConfig.AIPresetPrompt || '')
    useImperativeHandle(ref, () => ({ value: prompt }), [prompt])

    return (
      <div className={styles['ai-global-command']} onClick={(e) => e.stopPropagation()}>
        <div className={styles['ai-global-command-heard']}>全局指令</div>
        <YakitInput.TextArea
          rows={5}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          isShowResize={false}
          onPressEnter={() => onSave(prompt)}
          placeholder="全局命令将对所有会话生效..."
          maxLength={500}
          showCount
        />
        <div className={styles['ai-global-command-footer']}>
          <YakitButton type="outline2" onClick={onCancel}>
            {t('YakitButton.cancel')}
          </YakitButton>
          <YakitButton
            onClick={() => {
              onSave(prompt)
            }}
          >
            {t('YakitButton.save')}
          </YakitButton>
        </div>
      </div>
    )
  }),
)
const AIRenderTaskFooterExtra: React.FC<AIRenderTaskFooterExtraProps> = React.memo((props) => {
  const { onExtraAction, btnProps, subTaskBtnProps, children } = props
  const { t } = useI18nNamespaces(['aiAgent'])
  const { chatIPCEvents } = useChatIPCDispatcher()
  const { chatIPCData, syncIdInfoMap } = useChatIPCStore()

  const syncIdOfStopSubTask = useRef<string>('')

  const taskChat = useCreation(() => {
    return chatIPCData.taskChat
  }, [chatIPCData.taskChat])

  const taskStatus = useCreation(() => {
    return chatIPCData.taskStatus
  }, [chatIPCData.taskStatus])

  const cancelTaskLoading = useCreation(() => {
    return chatIPCData.cancelTaskLoading
  }, [chatIPCData.cancelTaskLoading])
  const getTaskInfo = useMemoizedFn(() => {
    return chatIPCEvents.fetchTaskChatID()
  })

  const renderBtn = useMemoizedFn(() => {
    switch (getTaskInfo()?.status) {
      case AITaskStatus.inProgress:
        return (
          <YakitPopconfirm
            onConfirm={() => {
              chatIPCEvents.handleCancelLoadingChange('task', true)
              onExtraAction('stopTask', '')
            }}
            title={t('AIRenderTaskFooterExtra.cancelTaskConfirm')}
            placement="top"
          >
            <YakitButton
              type="primary"
              icon={<OutlineExitIcon />}
              className={styles['task-button']}
              radius="28px"
              size="large"
              colors="danger"
              loading={cancelTaskLoading}
              {...btnProps}
            />
          </YakitPopconfirm>
        )
      case AITaskStatus.error:
        return !taskStatus.loading ? (
          <Tooltip overlay={t('AIRenderTaskFooterExtra.resumeTask')} placement="top">
            <YakitButton
              type="primary"
              icon={<OutlinePlay2Icon />}
              radius="28px"
              size="large"
              onClick={() => {
                chatIPCEvents.handleCancelLoadingChange('task', true)
                onExtraAction('recover', '')
              }}
              loading={cancelTaskLoading}
              {...btnProps}
            >
              {t('AIRenderTaskFooterExtra.continueTask')}
            </YakitButton>
          </Tooltip>
        ) : (
          <YakitButton
            type="primary"
            icon={<OutlineExitIcon />}
            className={styles['task-button']}
            radius="28px"
            size="large"
            colors="danger"
            loading={true}
          >
            {t('AIRenderTaskFooterExtra.stoppingTask')}
          </YakitButton>
        )
      default:
        return null
    }
  })
  return (
    <>
      {getTaskInfo()?.status === AITaskStatus.inProgress && taskChat.plan.length > 0 && (
        <YakitPopconfirm
          onConfirm={() => {
            syncIdOfStopSubTask.current = randomString(8)
            onExtraAction('stopSubTask', syncIdOfStopSubTask.current)
          }}
          title={t('AIRenderTaskFooterExtra.cancelSubtaskConfirm')}
          placement="top"
        >
          <YakitButton
            type="outline1"
            icon={<RedoDotIcon />}
            className={styles['task-sub-button']}
            radius="28px"
            size="large"
            colors="danger"
            loading={!!syncIdInfoMap?.get(syncIdOfStopSubTask.current)}
            {...subTaskBtnProps}
          >
            {t('AIRenderTaskFooterExtra.skipSubtask')}
          </YakitButton>
        </YakitPopconfirm>
      )}
      {children}
      {renderBtn()}
    </>
  )
})

export const AIReActTaskChatLeftSide: React.FC<AIReActTaskChatLeftSideProps> = React.memo((props) => {
  const { taskChat } = useChatIPCStore().chatIPCData
  const [leftExpand, setLeftExpand] = useControllableValue(props, {
    defaultValue: true,
    valuePropName: 'leftExpand',
    trigger: 'setLeftExpand',
  })

  return (
    <div
      className={classNames(styles['content-left-side'], {
        [styles['content-left-side-hidden']]: !leftExpand,
      })}
    >
      <AIChatLeftSide expand={leftExpand} setExpand={setLeftExpand} tasks={taskChat.plan} />
      <div className={styles['open-wrapper']} onClick={() => setLeftExpand(true)}>
        <ChevrondownButton />
        <div className={styles['text']}>任务列表</div>
      </div>
    </div>
  )
})
