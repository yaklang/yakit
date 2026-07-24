import React, { memo, useRef, useState } from 'react'
import styles from './HistoryTaskTree.module.scss'
import {
  AIHistoryContinueTaskProps,
  HistoryTaskTreeItemProps,
  HistoryTaskTreeProps,
  SendRecoverParams,
} from './HistoryTaskTreeType'
import { useCreation, useMemoizedFn, useUpdateEffect } from 'ahooks'
import { AIAgentGrpcApi, AIInputEvent, AIInputEventSyncTypeEnum, AITaskStatus } from '@/pages/ai-re-act/hooks/grpcApi'
import { AITree } from '../../aiTree/AITree'
import YakitCollapse from '@/components/yakitUI/YakitCollapse/YakitCollapse'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { formatTimestamp } from '@/utils/timeUtil'
import { OutlineLoadingIcon, OutlinePlay2Icon, RedoDotIcon } from '@/assets/icon/outline'
import { YakitPopconfirm } from '@/components/yakitUI/YakitPopconfirm/YakitPopconfirm'
import { AITaskInfoProps } from '@/pages/ai-re-act/hooks/aiRender'
import { Tooltip } from 'antd'
import { YakitTag } from '@/components/yakitUI/YakitTag/YakitTag'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import useAIAgentStore from '../../useContext/useStore'
import useAIAgentDispatcher from '../../useContext/useDispatcher'
import { randomString } from '@/utils/randomUtil'
import { useCurrentMeta, useCurrentStore } from '@/pages/ai-re-act/hooks/useCurrentDataBySession'
import { useStore } from 'zustand'
import useCurrentSessionId from '@/pages/ai-re-act/hooks/useCurrentSessionId'
import { formatAIAgentSetting, onReStart } from '../../utils'

export const HistoryTaskTree: React.FC<HistoryTaskTreeProps> = memo((props) => {
  const store = useCurrentStore()
  const meta = useCurrentMeta()
  const planHistoryList = useStore(store, (state) => state.planHistoryList ?? [])
  const taskTree = useStore(store, (state) => state.taskChat.plan.task_tree ?? [])
  const taskName = useStore(store, (state) => state.taskChat.plan.root_task_name ?? '')

  const currentTaskItem = useCreation(() => {
    const coordinatorId = meta.currentTaskPlanID?.coordinatorId || ''
    const item: AIAgentGrpcApi.PlanHistory = {
      coordinator_id: coordinatorId,
      created_at: '',
      created_at_unix: 0,
      session_id: '',
      task_progress: {
        total_tasks: 0,
        completed_tasks: 0,
        skipped_tasks: 0,
        aborted_tasks: 0,
        current_index: 0,
        current_task_index: '',
        current_task: '',
        current_goal: '',
        phase: 'NotCompleted',
        updated_at: 0,
      },
      task_tree: taskTree,
      updated_at: '',
      updated_at_unix: 0,
      root_task_name: taskName,
    }
    return item
  }, [taskTree, taskName])

  const currentCoordinatorId = useCreation(() => {
    return currentTaskItem?.coordinator_id || ''
  }, [currentTaskItem?.coordinator_id])
  const [activeKey, setActiveKey] = useState<string>(
    currentCoordinatorId || planHistoryList.records[0]?.coordinator_id || '',
  )
  const historyContainerRef = useRef<HTMLDivElement>(null)

  useUpdateEffect(() => {
    const firstItemId = planHistoryList.records[0]?.coordinator_id || ''
    if (!!currentCoordinatorId) {
      setActiveKey(currentCoordinatorId)
    } else if (!!firstItemId) {
      setActiveKey(firstItemId)
    }
  }, [currentCoordinatorId, planHistoryList.records[0]])
  return (
    <div className={styles['history-task-tree-container']} ref={historyContainerRef}>
      <YakitCollapse
        destroyInactivePanel
        accordion
        bordered={false}
        activeKey={activeKey}
        onChange={(k) => setActiveKey(k as string)}
        style={{ marginBottom: 8, height: '100%' }}
      >
        {currentTaskItem.task_tree.length > 0 && (
          <YakitCollapse.YakitPanel
            header={
              <div className={styles['history-task-tree-item-header']}>
                <div className={styles['history-task-tree-item-header-left']}>
                  <div
                    className={styles['history-task-tree-item-header-title']}
                    title={currentTaskItem?.root_task_name}
                  >
                    {currentTaskItem?.root_task_name}
                  </div>
                  <YakitTag color="info" size="small" fullRadius>
                    当前任务
                  </YakitTag>
                </div>
              </div>
            }
            key={currentCoordinatorId}
          >
            <HistoryTaskTreeItem
              item={currentTaskItem}
              currentCoordinatorId={currentCoordinatorId}
              taskType="current"
            />
          </YakitCollapse.YakitPanel>
        )}
        {planHistoryList.records
          // 历史任务树会包含当前正在执行的任务树，需要将其过滤
          .filter((ele) => ele.coordinator_id !== currentCoordinatorId)
          .map((item) => {
            return (
              <YakitCollapse.YakitPanel
                header={
                  <div className={styles['history-task-tree-item-header']}>
                    <div className={styles['history-task-tree-item-header-left']}>
                      <div className={styles['history-task-tree-item-header-title']} title={item?.root_task_name}>
                        {item?.root_task_name}
                      </div>
                    </div>
                  </div>
                }
                key={item.coordinator_id}
              >
                <HistoryTaskTreeItem item={item} currentCoordinatorId={currentCoordinatorId} taskType="history" />
              </YakitCollapse.YakitPanel>
            )
          })}
      </YakitCollapse>
    </div>
  )
})

export const AIHistoryContinueTask: React.FC<AIHistoryContinueTaskProps> = React.memo((props) => {
  const { coordinatorId, taskId } = props
  const { t } = useI18nNamespaces(['aiAgent'])

  const sessionId = useCurrentSessionId()
  const meta = useCurrentMeta()
  const store = useCurrentStore()
  const taskStatus = useStore(store, (state) => state.taskStatus)
  const cancelTaskLoading = useStore(store, (state) => state.cancelTaskLoading)
  const execute = useStore(store, (state) => state.execute)

  const { activeChat } = useAIAgentStore()
  const { getSetting, onSend, onStart } = useAIAgentDispatcher()

  const [visible, setVisible] = useState<boolean>(false)

  const sendRecoverParamsRef = useRef<SendRecoverParams>()

  const isExecuting = useCreation(() => {
    return taskStatus.loading
  }, [taskStatus.loading])

  const loading = useCreation(() => {
    return sendRecoverParamsRef.current?.taskId === taskId && isExecuting
  }, [isExecuting, taskId])

  const getTaskInfo = useMemoizedFn(() => {
    return meta.currentTaskPlanID
  })
  const getTaskId = useMemoizedFn(() => {
    const taskInfo = getTaskInfo()
    return taskInfo?.taskID || ''
  })
  useUpdateEffect(() => {
    if (!isExecuting && sendRecoverParamsRef.current) {
      onSendRecover(sendRecoverParamsRef.current)
    }
  }, [isExecuting])
  const isShow = useMemoizedFn(() => {
    const currentCoordinatorId = getTaskInfo()?.coordinatorId || ''
    const taskInfo = getTaskInfo()
    let show = true
    if (!execute) return true
    if (coordinatorId === currentCoordinatorId) {
      show = taskInfo?.status === AITaskStatus.error && !taskStatus?.loading
    }
    // 如果当前有任务正在等待被恢复
    if (sendRecoverParamsRef.current) {
      // 仅保持被点击的那个任务节点按钮显示（用于展示 loading 状态），隐藏其他所有的继续按钮
      return (
        sendRecoverParamsRef.current.coordinatorId === coordinatorId && sendRecoverParamsRef.current.taskId === taskId
      )
    }
    const isStopping = taskInfo?.status === AITaskStatus.error && taskStatus.loading

    // 如果系统正处于正在停止/取消任务的全局 Loading 状态，或当前任务本身正处于停止进行中的状态
    if (cancelTaskLoading || isStopping) {
      return false
    }

    return show
  })
  const onSendRecover = useMemoizedFn((params: SendRecoverParams) => {
    const { coordinatorId } = params

    const info: AIInputEvent = {
      IsSyncMessage: true,
      SyncType: AIInputEventSyncTypeEnum.SYNC_TYPE_RECOVERY_PLAN_AND_EXEC,
      SyncJsonInput: JSON.stringify({ coordinator_id: coordinatorId, start_task_id: taskId }),
      SyncID: randomString(8),
    }
    onSend({ token: sessionId, type: 'task', params: info })
    meta.currentTaskPlanID = undefined

    sendRecoverParamsRef.current = undefined
  })
  const onRecover = useMemoizedFn(() => {
    const currentTaskId = getTaskId()

    if (!coordinatorId) return
    sendRecoverParamsRef.current = {
      coordinatorId,
      taskId,
    }
    store.getState().updateState({
      cancelCasualLoading: true,
    })
    if (taskStatus.loading && currentTaskId) {
      // 选停止当前任务，等待任务停止成功后，再发送恢复的数据
      const info: AIInputEvent = {
        IsSyncMessage: true,
        SyncType: AIInputEventSyncTypeEnum.SYNC_TYPE_REACT_CANCEL_TASK,
        SyncJsonInput: JSON.stringify({ task_id: currentTaskId }),

        SyncID: randomString(8),
      }
      onSend({ token: sessionId, type: 'task', params: info })
    } else if (execute) {
      onSendRecover(sendRecoverParamsRef.current)
    } else if (activeChat?.SessionID) {
      onReStart({
        setting: {
          ...formatAIAgentSetting(getSetting()),
          UserQuery: '',
          TimelineSessionID: activeChat?.SessionID,
          CoordinatorId: '',
          Sequence: 1,
        },
        activeChat,
        onStart: (data) => onChatStart(data),
      })
    }
  })
  const onChatStart = useMemoizedFn((data) => {
    onStart({
      ...data,
      onSuccess: () => {
        sendRecoverParamsRef.current && onSendRecover(sendRecoverParamsRef.current)
      },
    })
  })
  return isShow() ? (
    <YakitPopconfirm
      title={isExecuting ? t('HistoryTaskTree.stopCurrentTask') : t('HistoryTaskTree.restoreTaskConfirm')}
      onConfirm={(e) => {
        e?.stopPropagation()
        setVisible(false)
        onRecover()
      }}
      onCancel={(e) => {
        e?.stopPropagation()
        setVisible(false)
      }}
      visible={visible}
      onVisibleChange={setVisible}
      destroyTooltipOnHide={true}
    >
      <Tooltip title="从该节点开始继续任务" destroyTooltipOnHide={true}>
        <YakitButton
          type="text"
          onClick={(e) => {
            e.stopPropagation()
          }}
          className={styles['continue-task-button']}
          radius="50%"
          size="small"
        >
          {loading ? (
            <OutlineLoadingIcon className={styles['icon-primary']} />
          ) : (
            <OutlinePlay2Icon className={styles['play2-icon']} />
          )}
        </YakitButton>
      </Tooltip>
    </YakitPopconfirm>
  ) : null
})
// 跳过任务
export const AIHistorySkipTask: React.FC<{ taskId?: string | null; isTask?: boolean }> = React.memo(
  ({ taskId, isTask = true }) => {
    const { t } = useI18nNamespaces(['aiAgent'])
    const syncIdOfStopSubTask = useRef<string>('')
    const store = useCurrentStore()
    const syncIDUpdate = useStore(store, (state) => state.syncIDUpdate)

    const meta = useCurrentMeta()
    const sessionId = useCurrentSessionId()
    const { onSend } = useAIAgentDispatcher()
    const onCancelTask = useMemoizedFn(() => {
      if (isTask) {
        if (!taskId) return
        syncIdOfStopSubTask.current = randomString(8)
        const info: AIInputEvent = {
          IsSyncMessage: true,
          SyncType: AIInputEventSyncTypeEnum.SYNC_TYPE_SKIP_SUBTASK_IN_PLAN,
          SyncJsonInput: JSON.stringify({ reason: '用户认为这个任务不需要执行', subtask_id: taskId }),

          SyncID: syncIdOfStopSubTask.current,
        }
        onSend({ token: sessionId, type: 'task', params: info })
      } else {
        const info: AIInputEvent = {
          IsSyncMessage: true,
          SyncType: AIInputEventSyncTypeEnum.SYNC_TYPE_REACT_CANCEL_TASK,
          SyncJsonInput: JSON.stringify({ task_id: taskId }),
        }
        onSend({ token: sessionId, type: 'task', params: info })
      }
    })

    const skipLoading = useCreation(() => {
      return !!meta.syncIDMap?.get(syncIdOfStopSubTask.current)
    }, [syncIDUpdate])
    return (
      <YakitPopconfirm
        title={t('AITree.cancelSubtaskConfirm')}
        onConfirm={(e) => {
          e?.stopPropagation()
          onCancelTask()
        }}
        onCancel={(e) => {
          e?.stopPropagation()
        }}
      >
        <Tooltip title="跳过当前任务" destroyTooltipOnHide={true}>
          <YakitButton
            size="small"
            icon={<RedoDotIcon />}
            type="text"
            loading={skipLoading}
            onClick={(e) => {
              e.stopPropagation()
            }}
          />
        </Tooltip>
      </YakitPopconfirm>
    )
  },
)

/**任务历史的单个树节点 */
const HistoryTaskTreeItem: React.FC<HistoryTaskTreeItemProps> = memo((props) => {
  const { item, currentCoordinatorId, taskType } = props
  const { t } = useI18nNamespaces(['aiAgent'])
  const time = useCreation(() => {
    return formatTimestamp(item.created_at_unix)
  }, [item.created_at_unix])
  const onAITreeTitleExtraNode = useMemoizedFn((value: AITaskInfoProps) => {
    return <AIHistoryContinueTask coordinatorId={item.coordinator_id} taskId={value.task_id} />
  })
  return (
    <div className={styles['tree-item']}>
      {!(item.coordinator_id === currentCoordinatorId) && (
        <div className={styles['time']}>{t('HistoryTaskTree.updateTime', { time })}</div>
      )}

      <AITree
        tasks={item.task_tree}
        className={styles['tree-wrapper']}
        aiTreeTitleExtraNode={onAITreeTitleExtraNode}
        taskType={taskType}
      />
    </div>
  )
})
