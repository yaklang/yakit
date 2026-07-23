import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import {
  AIGlobalCommandPopoverProps,
  AIGlobalCommandProps,
  AIGlobalCommandRefProps,
  AIInputSettingFormProps,
  AIInputSettingPopoverProps,
  AIManualAdditionPopoverProps,
  AIManualAdditionProps,
  AIPlanPromptPopoverProps,
  AIPlanPromptProps,
  AIPlanPromptRefProps,
  AIReActTaskChatContentProps,
  AIReActTaskChatLeftSideProps,
  AIReActTaskChatProps,
  AIRenderTaskFooterExtraProps,
} from './AIReActTaskChatType'
import styles from './AIReActTaskChat.module.scss'
import { AIAgentChatStream, AIChatLeftSide } from '@/pages/ai-agent/chatTemplate/AIAgentChatTemplate'
import { useControllableValue, useCreation, useMemoizedFn, useUpdateEffect } from 'ahooks'
import classNames from 'classnames'
import { ChevrondownButton } from '../aiReActChat/AIReActComponent'
import {
  OutlineArrowscollapseIcon,
  OutlineArrowsexpandIcon,
  OutlineCodeIcon,
  OutlineExitIcon,
  OutlineHandIcon,
  OutlineInformationcircleIcon,
  OutlinePlay2Icon,
  OutlinePositionIcon,
} from '@/assets/icon/outline'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { AIChatQSData, AIChatQSDataTypeEnum } from '../hooks/aiRender'
import { YakitPopconfirm } from '@/components/yakitUI/YakitPopconfirm/YakitPopconfirm'
import { AIInputEvent, AIInputEventHotPatchTypeEnum, AIInputEventSyncTypeEnum, AITaskStatus } from '../hooks/grpcApi'
import { Form, Tooltip } from 'antd'
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
import { YakitSwitch } from '@/components/yakitUI/YakitSwitch/YakitSwitch'
import useAIAgentDispatcher from '@/pages/ai-agent/useContext/useDispatcher'
import { has } from 'lodash'
import { AITaskContent } from '../aiTaskContent/AITaskContent'
import { useTaskChatExtraAction } from './useTaskChatExtraAction'
import { useCurrentMeta, useCurrentStore } from '../hooks/useCurrentDataBySession'
import { useStore } from 'zustand'
import useCurrentSessionId from '../hooks/useCurrentSessionId'
import { globalSessionEngine } from '../hooks/ChatMultiSessionController'

const AIReActTaskChat: React.FC<AIReActTaskChatProps> = React.memo((props) => {
  const { setShowFreeChat, setTimeLine } = props
  const [{ randomAIMaterialsData, loadingAIMaterials }, { onRefresh }] = useGetAIMaterialsData()

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
        secondNodeStyle={{ width: leftExpand ? '100%' : 'calc(100% - 30px)', padding: 0, overflow: 'auto hidden' }}
        firstNode={<AIReActTaskChatLeftSide leftExpand={leftExpand} setLeftExpand={setLeftExpand} />}
        secondNode={
          <>
            <AITaskContent
              tabBarExtraContent={
                <YakitButton
                  type="text2"
                  icon={expand ? <OutlineArrowscollapseIcon /> : <OutlineArrowsexpandIcon />}
                  onClick={onIsExpand}
                />
              }
              emptyNode={
                <AIReActTaskEmpty
                  loadingAIMaterials={loadingAIMaterials}
                  randomAIMaterialsData={randomAIMaterialsData}
                  onRefresh={onRefresh}
                  onClickItem={onClickItem}
                />
              }
            />
          </>
        }
      />
    </div>
  )
})

export default AIReActTaskChat

export const AIReActTaskChatContent: React.FC<AIReActTaskChatContentProps> = React.memo((props) => {
  const { scrollToBottom, onScrollToBottom } = props
  const { t } = useI18nNamespaces(['aiAgent'])
  const { onExtraAction } = useTaskChatExtraAction()

  const store = useCurrentStore()
  const meta = useCurrentMeta()
  const streams = useStore(store, (state) => state.taskChat.elements)
  const execute = useStore(store, (state) => state.execute)
  const taskStatus = useStore(store, (state) => state.taskStatus)
  const currentPlanReviewToken = useStore(store, (state) => state.currentPlanReviewToken)
  return (
    <>
      <div className={styles['tab-content']}>
        <AIAgentChatStream scrollToBottom={scrollToBottom} taskStatus={taskStatus} />
      </div>
      {!currentPlanReviewToken.token && streams.length > 0 && (
        <div className={styles['footer']}>
          {execute && (
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
          {execute && !!meta.currentTaskPlanID && <AIRenderTaskFooterExtra onExtraAction={onExtraAction} />}
          <YakitButton
            type="outline2"
            icon={<OutlinePositionIcon />}
            radius="50%"
            onClick={onScrollToBottom}
            className={styles['position-button']}
            size="large"
          />
        </div>
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

export const AIInputSettingPopover: React.FC<AIInputSettingPopoverProps> = React.memo((props) => {
  const { children } = props

  const { onSend } = useAIAgentDispatcher()

  const sessionId = useCurrentSessionId()

  const { setting, activeChat } = useAIAgentStore()
  const { setSetting } = useAIAgentDispatcher()
  const [visible, setVisible] = useControllableValue<boolean>(props, {
    defaultValue: false,
    valuePropName: 'visible',
    trigger: 'setVisible',
  })
  const [form] = Form.useForm<AIInputSettingFormProps>()

  const onHotSyncPerceptionTrigger = useMemoizedFn((value: boolean) => {
    const info: AIInputEvent = {
      IsConfigHotpatch: true,
      HotpatchType: AIInputEventHotPatchTypeEnum.HotPatchType_SyncPerceptionTrigger,
      Params: {
        SyncPerceptionTrigger: value,
      },
    }
    onSend({ token: sessionId, type: 'casual', params: info })
    if (activeChat?.SessionID) {
      emiter.emit(
        'sessionData',
        JSON.stringify({
          type: 'updateSession',
          sessionId: activeChat.SessionID,
          updates: {
            StartParams: {
              ...(activeChat.StartParams || {}),
              SyncPerceptionTrigger: value,
            },
          },
        }),
      )
    }
  })
  const onValuesChange = useMemoizedFn((changedValues: AIInputSettingFormProps) => {
    if (has(changedValues, 'SyncPerceptionTrigger')) {
      onHotSyncPerceptionTrigger(!!changedValues.SyncPerceptionTrigger)
    }
    setSetting?.((v) => ({
      ...v,
      ...changedValues,
    }))
  })
  return (
    <YakitPopover
      visible={visible}
      content={
        <Form
          form={form}
          labelCol={{ span: 18 }}
          wrapperCol={{ span: 6 }}
          onValuesChange={onValuesChange}
          initialValues={{
            SyncPerceptionTrigger: setting.SyncPerceptionTrigger,
            EnablePlan: setting.EnablePlan,
          }}
        >
          <Form.Item
            label={
              <>
                同步意图识别
                <Tooltip overlayClassName={styles['form-info-icon-tooltip']} title={'开启后回答精度更高，但速度会变慢'}>
                  <OutlineInformationcircleIcon className={styles['info-icon']} />
                </Tooltip>
              </>
            }
            name="SyncPerceptionTrigger"
            valuePropName="checked"
          >
            <YakitSwitch />
          </Form.Item>
        </Form>
      }
      onVisibleChange={setVisible}
      trigger={'click'}
      destroyTooltipOnHide={true}
    >
      {children}
    </YakitPopover>
  )
})

const AIManualAddition: React.FC<AIManualAdditionProps> = React.memo((props) => {
  const { chatType, onCancel } = props

  const { onSend } = useAIAgentDispatcher()

  const sessionId = useCurrentSessionId()
  const meta = useCurrentMeta()
  const store = useCurrentStore()
  const taskStatus = useStore(store, (state) => state.taskStatus)
  const execute = useStore(store, (state) => state.execute)
  const syncIDUpdate = useStore(store, (state) => state.syncIDUpdate)

  const [prompt, setPrompt] = useState<string>()

  const currentCoordinatorIdRef = useRef<string>('')
  const syncIdOfAddToContext = useRef<string>('')
  const syncIdOfAddAndReExecute = useRef<string>('')

  useUpdateEffect(() => {
    if (!taskStatus.loading && currentCoordinatorIdRef.current) {
      onSendRecover(currentCoordinatorIdRef.current)
    }
  }, [taskStatus.loading])

  useEffect(() => {
    if (
      (syncIdOfAddToContext.current && !meta.syncIDMap?.get(syncIdOfAddToContext.current)) ||
      (syncIdOfAddAndReExecute.current && !meta.syncIDMap?.get(syncIdOfAddAndReExecute.current))
    ) {
      onReset()
    }
  }, [syncIDUpdate])

  useEffect(() => {
    if (execute) return
    onReset()
  }, [execute])

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
    const info = meta.currentTaskPlanID
    const taskId = info?.taskID
    const coordinatorId = info?.coordinatorId
    if (!coordinatorId) return
    currentCoordinatorIdRef.current = coordinatorId

    store.getState().updateState({
      cancelTaskLoading: true,
    })

    if (taskStatus?.loading && taskId) {
      // 选停止当前任务，等待任务停止成功后，再发送恢复的数据
      const info: AIInputEvent = {
        IsSyncMessage: true,
        SyncType: AIInputEventSyncTypeEnum.SYNC_TYPE_REACT_CANCEL_TASK,
        SyncJsonInput: JSON.stringify({ task_id: taskId }),

        SyncID: randomString(8),
      }
      onSend({ token: sessionId, type: 'task', params: info })
    } else {
      onSendRecover(coordinatorId)
    }
  })
  const onSendRecover = useMemoizedFn((coordinatorId: string) => {
    const info: AIInputEvent = {
      IsSyncMessage: true,
      SyncType: AIInputEventSyncTypeEnum.SYNC_TYPE_RECOVERY_PLAN_AND_EXEC,
      SyncJsonInput: JSON.stringify({ coordinator_id: coordinatorId }),

      SyncID: randomString(8),
    }
    onSend({ token: sessionId, type: 'task', params: info })
    currentCoordinatorIdRef.current = ''
  })
  const getTypeBySyncID = useMemoizedFn(() => {
    if (!!syncIdOfAddToContext.current) return '加入上下文'
    if (!!syncIdOfAddAndReExecute.current) return '加入并重新执行'
    return ''
  })
  const onAddToContext = useMemoizedFn((syncID: string) => {
    if (!prompt?.trim()) return
    const info: AIInputEvent = {
      IsSyncMessage: true,
      SyncType: AIInputEventSyncTypeEnum.SYNC_TYPE_USER_INTERVENTION,
      SyncJsonInput: JSON.stringify({ content: prompt }),

      SyncID: randomString(8),
    }
    onSend({ token: sessionId, type: 'task', params: info })
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
    globalSessionEngine.pushDataToSession(sessionId, chatData)
  })

  const addAndReExecuteLoading = useCreation(() => {
    return !!meta.syncIDMap?.get(syncIdOfAddAndReExecute.current)
  }, [syncIDUpdate])

  const addAndToContextLoading = useCreation(() => {
    return !!meta.syncIDMap?.get(syncIdOfAddToContext.current)
  }, [syncIDUpdate])
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
            loading={addAndReExecuteLoading}
            className={styles['add-and-reexecute-btn']}
            disabled={!addAndToContextLoading}
          >
            加入并重新执行
          </YakitButton>
        </YakitPopconfirm>
        <YakitButton
          onClick={() => {
            syncIdOfAddToContext.current = randomString(8)
            onAddToContext(syncIdOfAddToContext.current)
          }}
          loading={addAndToContextLoading}
          disabled={!addAndReExecuteLoading}
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
export const AIPlanPromptPopover: React.FC<AIPlanPromptPopoverProps> = React.memo((props) => {
  const { children, childrenClass } = props
  const [visible, setVisible] = useState<boolean>(false)
  const [_, event] = useAIGlobalConfig()

  const onSave = useMemoizedFn((prompt: string) => {
    setVisible(false)
    event.setAIGlobalConfig({ AIPlanPrompt: prompt })
  })
  const aiPlanPromptRef = useRef<AIPlanPromptRefProps>({ value: '' })
  const onPlanPromptVisibleChange = useMemoizedFn((visible: boolean) => {
    if (!visible) {
      onSave(aiPlanPromptRef.current?.value || '')
    } else {
      setVisible(true)
    }
  })
  return (
    <YakitPopover
      visible={visible}
      content={<AIPlanPrompt ref={aiPlanPromptRef} onCancel={() => setVisible(false)} onSave={onSave} />}
      destroyTooltipOnHide={true}
      onVisibleChange={onPlanPromptVisibleChange}
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
const AIPlanPrompt: React.FC<AIPlanPromptProps> = React.memo(
  forwardRef((props, ref) => {
    const { t } = useI18nNamespaces(['aiAgent', 'yakitUi'])
    const { onCancel, onSave } = props
    const [aiGlobalConfigData] = useAIGlobalConfig()
    const [prompt, setPrompt] = useState<string>(aiGlobalConfigData?.aiGlobalConfig.AIPlanPrompt || '')
    useImperativeHandle(ref, () => ({ value: prompt }), [prompt])

    return (
      <div className={styles['ai-global-command']} onClick={(e) => e.stopPropagation()}>
        <div className={styles['ai-global-command-heard']}>{t('AIReActTaskChatContent.planPrompt')}</div>
        <YakitInput.TextArea
          rows={5}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          isShowResize={false}
          onPressEnter={() => onSave(prompt)}
          placeholder={t('AIReActTaskChatContent.planPromptPlaceholder')}
          maxLength={2000}
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
export const AIRenderTaskFooterExtra: React.FC<AIRenderTaskFooterExtraProps> = React.memo((props) => {
  const { onExtraAction, btnProps, children } = props
  const { t } = useI18nNamespaces(['aiAgent'])

  const store = useCurrentStore()
  const meta = useCurrentMeta()

  const taskStatus = useStore(store, (state) => state.taskStatus)
  const cancelTaskLoading = useStore(store, (state) => state.cancelTaskLoading)

  const status = useCreation(() => {
    return meta.currentTaskPlanID?.status
  }, [taskStatus.loading])

  const renderBtn = useMemoizedFn(() => {
    switch (status) {
      case AITaskStatus.inProgress:
        return (
          <YakitPopconfirm
            onConfirm={() => {
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
          <YakitButton
            type="primary"
            icon={<OutlinePlay2Icon />}
            radius="28px"
            size="large"
            onClick={() => {
              store.getState().updateState({
                cancelTaskLoading: true,
              })
              onExtraAction('recover', '')
            }}
            loading={cancelTaskLoading}
            {...btnProps}
          >
            {t('AIRenderTaskFooterExtra.continueTask')}
          </YakitButton>
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
      {/* {getTaskInfo()?.status === AITaskStatus.inProgress && isSubTaskInProgress() && (
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
      )} */}
      {children}
      {renderBtn()}
    </>
  )
})

export const AIReActTaskChatLeftSide: React.FC<AIReActTaskChatLeftSideProps> = React.memo((props) => {
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
      <AIChatLeftSide expand={leftExpand} setExpand={setLeftExpand} />
      <div className={styles['open-wrapper']} onClick={() => setLeftExpand(true)}>
        <ChevrondownButton />
        <div className={styles['text']}>任务列表</div>
      </div>
    </div>
  )
})
