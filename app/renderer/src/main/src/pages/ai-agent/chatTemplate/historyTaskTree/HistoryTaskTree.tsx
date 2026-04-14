import React, { memo, useEffect, useRef, useState } from 'react'
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
import { YakitEmpty } from '@/components/yakitUI/YakitEmpty/YakitEmpty'
import YakitCollapse from '@/components/yakitUI/YakitCollapse/YakitCollapse'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { formatTimestamp } from '@/utils/timeUtil'
import { OutlineLoadingIcon, OutlinePlay2Icon } from '@/assets/icon/outline'
import { YakitPopconfirm } from '@/components/yakitUI/YakitPopconfirm/YakitPopconfirm'
import { AITaskInfoProps } from '@/pages/ai-re-act/hooks/aiRender'

export const isHaveExecutingTask = (list: AITaskInfoProps[]) => {
  return list.every((item) => !!item.progress)
}

export const HistoryTaskTree: React.FC<HistoryTaskTreeProps> = memo((props) => {
  const { data } = props

  const [activeKey, setActiveKey] = useState<string>(data.records[0]?.coordinator_id)
  const historyContainerRef = useRef<HTMLDivElement>(null)

  useUpdateEffect(() => {
    data.records[0] && setActiveKey(data.records[0]?.coordinator_id)
  }, [data.records[0]])

  return (
    <div className={styles['history-task-tree-container']} ref={historyContainerRef}>
      {data.records.length === 0 ? (
        <YakitEmpty style={{ marginTop: '20%' }} title="暂无历史任务" />
      ) : (
        <YakitCollapse
          destroyInactivePanel
          accordion
          bordered={false}
          activeKey={activeKey}
          onChange={(key) => setActiveKey(key as string)}
          style={{ marginBottom: 8 }}
        >
          {data.records.map((item) => {
            return (
              <YakitCollapse.YakitPanel
                header={
                  <div className={styles['history-task-tree-item-header']}>
                    <div className={styles['history-task-tree-item-header-left']}>
                      <div className={styles['history-task-tree-item-header-title']} title={item?.root_task_name}>
                        {item?.root_task_name}
                      </div>
                    </div>
                    {isHaveExecutingTask(item.task_tree) && (
                      <AIHistoryContinueTask coordinatorId={item.coordinator_id} taskIndex={''} />
                    )}
                  </div>
                }
                key={item.coordinator_id}
              >
                <HistoryTaskTreeItem item={item} />
              </YakitCollapse.YakitPanel>
            )
          })}
        </YakitCollapse>
      )}
    </div>
  )
})

export const AIHistoryContinueTask: React.FC<AIHistoryContinueTaskProps> = React.memo((props) => {
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
  const disabled = useCreation(() => {
    return isExecuting && !!sendRecoverParamsRef.current?.taskIndex
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
    // 如果当前有任务正在等待被恢复
    if (sendRecoverParamsRef.current) {
      // 仅保持被点击的那个任务节点按钮显示（用于展示 loading 状态），隐藏其他所有的继续按钮
      return (
        sendRecoverParamsRef.current.coordinatorId === coordinatorId &&
        sendRecoverParamsRef.current.taskIndex === taskIndex
      )
    }
    const isStopping = getTaskInfo()?.status === AITaskStatus.error && taskStatus.loading
    // 如果系统正处于正在停止/取消任务的全局 Loading 状态，或当前任务本身正处于停止进行中的状态
    if (chatIPCData.cancelTaskLoading || isStopping) {
      return false
    }

    return true
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
    >
      <YakitButton
        type="text"
        onClick={(e) => {
          e.stopPropagation()
        }}
        disabled={disabled}
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
    </YakitPopconfirm>
  ) : null
})

/**任务历史的单个树节点 */
const HistoryTaskTreeItem: React.FC<HistoryTaskTreeItemProps> = memo((props) => {
  const { item } = props
  const { chatIPCData } = useChatIPCStore()
  const time = useCreation(() => {
    return formatTimestamp(item.created_at_unix)
  }, [item.created_at_unix])

  const onAITreeTitleExtraNode = useMemoizedFn((value: AITaskInfoProps) => {
    return chatIPCData?.execute ? (
      <AIHistoryContinueTask coordinatorId={item.coordinator_id} taskIndex={value.index} />
    ) : null
  })
  return (
    <div className={styles['tree-item']}>
      <div className={styles['time']}>更新时间:{time}</div>
      <AITree tasks={item.task_tree} className={styles['tree-wrapper']} aiTreeTitleExtraNode={onAITreeTitleExtraNode} />
    </div>
  )
})
