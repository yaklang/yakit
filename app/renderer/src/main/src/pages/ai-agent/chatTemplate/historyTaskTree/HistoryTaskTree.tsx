import React, { memo, useRef, useState } from 'react'
import styles from './HistoryTaskTree.module.scss' // 假设你有对应的样式文件
import {
  AIHistoryContinueTaskProps,
  HistoryTaskTreeItemProps,
  HistoryTaskTreeProps,
  SendRecoverParams,
} from './HistoryTaskTreeType'
import { useCreation, useMemoizedFn, useUpdateEffect } from 'ahooks'
import useChatIPCDispatcher from '../../useContext/ChatIPCContent/useDispatcher'
import { AIInputEventSyncTypeEnum, AITaskStatus } from '@/pages/ai-re-act/hooks/grpcApi'
import { AITree } from '../../aiTree/AITree'
import useChatIPCStore from '../../useContext/ChatIPCContent/useStore'
import YakitCollapse from '@/components/yakitUI/YakitCollapse/YakitCollapse'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { formatTimestamp } from '@/utils/timeUtil'
import { OutlineLoadingIcon, OutlinePlay2Icon } from '@/assets/icon/outline'
import { YakitPopconfirm } from '@/components/yakitUI/YakitPopconfirm/YakitPopconfirm'
import { AITaskInfoProps } from '@/pages/ai-re-act/hooks/aiRender'
import { Tooltip } from 'antd'
import { YakitTag } from '@/components/yakitUI/YakitTag/YakitTag'

export const HistoryTaskTree: React.FC<HistoryTaskTreeProps> = memo((props) => {
  const { data, currentTaskItem } = props

  const currentCoordinatorId = useCreation(() => {
    return currentTaskItem?.coordinator_id || ''
  }, [currentTaskItem?.coordinator_id])
  const [activeKey, setActiveKey] = useState<string>('')
  const historyContainerRef = useRef<HTMLDivElement>(null)

  useUpdateEffect(() => {
    const firstItemId = data.records[0]?.coordinator_id || ''
    if (!!currentTaskItem.coordinator_id) {
      setActiveKey(currentTaskItem.coordinator_id)
    } else if (!!firstItemId) {
      setActiveKey(firstItemId)
    }
  }, [currentTaskItem.coordinator_id, data.records[0]])

  const treeData = useCreation(() => {
    if (currentTaskItem.task_tree.length === 0) return data.records || []
    return [currentTaskItem].concat(data.records || [])
  }, [currentTaskItem.task_tree.length, data.records])
  return (
    <div className={styles['history-task-tree-container']} ref={historyContainerRef}>
      <YakitCollapse
        destroyInactivePanel
        accordion
        bordered={false}
        activeKey={activeKey}
        onChange={(k) => setActiveKey(k as string)}
        style={{ marginBottom: 8 }}
      >
        {treeData.map((item) => {
          return (
            <YakitCollapse.YakitPanel
              header={
                <div className={styles['history-task-tree-item-header']}>
                  <div className={styles['history-task-tree-item-header-left']}>
                    <div className={styles['history-task-tree-item-header-title']} title={item?.root_task_name}>
                      {item?.root_task_name}
                    </div>
                    {item.coordinator_id === currentCoordinatorId && (
                      <YakitTag color="info" size="small" fullRadius>
                        当前任务
                      </YakitTag>
                    )}
                  </div>
                </div>
              }
              key={item.coordinator_id}
            >
              <HistoryTaskTreeItem item={item} currentCoordinatorId={currentTaskItem.coordinator_id} />
            </YakitCollapse.YakitPanel>
          )
        })}
      </YakitCollapse>
    </div>
  )
})

const AIHistoryContinueTask: React.FC<AIHistoryContinueTaskProps> = React.memo((props) => {
  const { coordinatorId, taskIndex } = props
  const { chatIPCData } = useChatIPCStore()
  const { chatIPCEvents, handleSendSyncMessage } = useChatIPCDispatcher()
  const [visible, setVisible] = useState<boolean>(false)

  const sendRecoverParamsRef = useRef<SendRecoverParams>()

  const taskStatus = useCreation(() => {
    return chatIPCData.taskStatus
  }, [chatIPCData.taskStatus])

  const isExecuting = useCreation(() => {
    return taskStatus.loading
  }, [taskStatus.loading])

  const loading = useCreation(() => {
    return sendRecoverParamsRef.current?.taskIndex === taskIndex && isExecuting
  }, [isExecuting, taskIndex, sendRecoverParamsRef.current?.taskIndex])

  const getTaskInfo = useMemoizedFn(() => {
    return chatIPCEvents.fetchTaskChatID()
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
    if (coordinatorId === currentCoordinatorId) {
      show = taskInfo?.status === AITaskStatus.error && !chatIPCData?.taskStatus?.loading
    } else {
      show = chatIPCData?.execute
    }
    // 如果当前有任务正在等待被恢复
    if (sendRecoverParamsRef.current) {
      // 仅保持被点击的那个任务节点按钮显示（用于展示 loading 状态），隐藏其他所有的继续按钮
      return (
        sendRecoverParamsRef.current.coordinatorId === coordinatorId &&
        sendRecoverParamsRef.current.taskIndex === taskIndex
      )
    }
    const isStopping = taskInfo?.status === AITaskStatus.error && taskStatus.loading

    // 如果系统正处于正在停止/取消任务的全局 Loading 状态，或当前任务本身正处于停止进行中的状态
    if (chatIPCData.cancelTaskLoading || isStopping) {
      return false
    }

    return show
  })
  const onSendRecover = useMemoizedFn((params: SendRecoverParams) => {
    const { coordinatorId, taskIndex } = params
    handleSendSyncMessage({
      syncType: AIInputEventSyncTypeEnum.SYNC_TYPE_RECOVERY_PLAN_AND_EXEC,
      SyncJsonInput: JSON.stringify({ coordinator_id: coordinatorId, start_task_index: taskIndex }),
    })
    sendRecoverParamsRef.current = undefined
  })
  const onRecover = useMemoizedFn(() => {
    const taskId = getTaskId()

    if (!coordinatorId) return
    sendRecoverParamsRef.current = {
      coordinatorId,
      taskIndex,
    }
    chatIPCEvents.handleCancelLoadingChange('task', true)
    if (taskStatus.loading && taskId) {
      // 选停止当前任务，等待任务停止成功后，再发送恢复的数据
      handleSendSyncMessage({
        syncType: AIInputEventSyncTypeEnum.SYNC_TYPE_REACT_CANCEL_TASK,
        SyncJsonInput: JSON.stringify({ task_id: taskId }),
      })
    } else {
      onSendRecover(sendRecoverParamsRef.current)
    }
  })
  return isShow() ? (
    <YakitPopconfirm
      title={isExecuting ? '停掉当前正在执行的任务，恢复此任务' : '是否确认恢复该此任务'}
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

/**任务历史的单个树节点 */
const HistoryTaskTreeItem: React.FC<HistoryTaskTreeItemProps> = memo((props) => {
  const { item, currentCoordinatorId } = props
  const time = useCreation(() => {
    return formatTimestamp(item.created_at_unix)
  }, [item.created_at_unix])
  const onAITreeTitleExtraNode = useMemoizedFn((value: AITaskInfoProps) => {
    return <AIHistoryContinueTask coordinatorId={item.coordinator_id} taskIndex={value.index} />
  })
  return (
    <div className={styles['tree-item']}>
      {!(item.coordinator_id === currentCoordinatorId) && <div className={styles['time']}>更新时间:{time}</div>}

      <AITree tasks={item.task_tree} className={styles['tree-wrapper']} aiTreeTitleExtraNode={onAITreeTitleExtraNode} />
    </div>
  )
})
