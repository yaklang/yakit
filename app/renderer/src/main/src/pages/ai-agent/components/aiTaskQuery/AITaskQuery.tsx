import React, { useEffect, useRef, useState } from 'react'
import type { AITaskQueryItemProps, AITaskQueryProps } from './type'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import {
  OutlineArrowupIcon,
  OutlineChatIcon,
  OutlineInformationcircleIcon,
  OutlineListTodoIcon,
  OutlineTrashIcon,
  OutlineXIcon,
} from '@/assets/icon/outline'
import { useMemoizedFn, useDebounceFn, useInViewport } from 'ahooks'
import styles from './AITaskQuery.module.scss'
import { YakitTag } from '@/components/yakitUI/YakitTag/YakitTag'
import { type AIInputEvent, AIInputEventSyncTypeEnum } from '@/pages/ai-re-act/hooks/grpcApi'
import { Tooltip } from 'antd'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { useCurrentStore } from '@/pages/ai-re-act/hooks/useCurrentDataBySession'
import { useSyncLoadingState } from '@/pages/ai-re-act/hooks/useSyncLoadingState'
import { useStore } from 'zustand'
import useAIAgentDispatcher from '../../useContext/useDispatcher'
import { randomString } from '@/utils/randomUtil'
import useCurrentSessionId from '@/pages/ai-re-act/hooks/useCurrentSessionId'
import emiter from '@/utils/eventBus/eventBus'
import { AIChatQSDataTypeEnum, type AIChatQSData } from '@/pages/ai-re-act/hooks/aiRender'
import { globalSessionEngine } from '@/pages/ai-re-act/hooks/ChatMultiSessionController'
import moment from 'moment'
import { v4 as uuidv4 } from 'uuid'

export const AITaskQuery: React.FC<AITaskQueryProps> = React.memo(() => {
  const { t } = useI18nNamespaces(['aiAgent', 'yakitUi'])

  const [loading, setLoading] = useState<boolean>(false)

  const sessionId = useCurrentSessionId()
  const store = useCurrentStore()
  const questionQueue = useStore(store, (state) => state.questionQueue)
  const execute = useStore(store, (state) => state.execute)
  const { onSend } = useAIAgentDispatcher()

  const [showList, setShowList] = useState<boolean>(true)
  const taskQueryRef = useRef<HTMLDivElement>(null)
  const [inViewport = true] = useInViewport(taskQueryRef)

  useEffect(() => {
    if (inViewport) {
      emiter.on('changeAITaskQueryShow', onActionAITaskContentTab)
      return () => {
        emiter.off('changeAITaskQueryShow', onActionAITaskContentTab)
      }
    }
  }, [inViewport])
  const onActionAITaskContentTab = useMemoizedFn((data: string) => {
    setShowList(data === 'true')
  })
  const onClearTaskQueue = useMemoizedFn(() => {
    if (!execute) return
    if (!sessionId) return
    setLoading(true)

    const clearTaskInfo: AIInputEvent = {
      IsSyncMessage: true,
      SyncType: AIInputEventSyncTypeEnum.SYNC_TYPE_REACT_CLEAR_TASK,

      Params: {},
      SyncID: randomString(8),
    }
    onSend({ token: sessionId, type: '', params: clearTaskInfo })

    const queueInfo: AIInputEvent = {
      IsSyncMessage: true,
      SyncType: AIInputEventSyncTypeEnum.SYNC_TYPE_QUEUE_INFO,

      Params: {},
      SyncID: randomString(8),
    }
    onSend({ token: sessionId, type: '', params: queueInfo })

    setTimeout(() => {
      setLoading(false)
      setShowList(false)
    }, 500)
  })
  return execute && questionQueue?.total > 0 ? (
    <div className={styles['ai-task-query']} ref={taskQueryRef}>
      {showList ? (
        <div className={styles['ai-task-query-list-wrapper']}>
          <div className={styles['ai-task-query-list-header']}>
            <div className={styles['header-left']}>
              <OutlineListTodoIcon className={styles['list-todo-icon']} />
              <div className={styles['task-query-title']}>{t('AITaskQuery.taskQueue')}</div>
              <YakitTag size="small" fullRadius={true}>
                {questionQueue.total}
              </YakitTag>
              {/* <OutlineQuestionmarkcircleIcon className={styles["question-mark-circle"]} /> */}
            </div>
            <div className={styles['header-right']}>
              <YakitButton
                type="text"
                danger
                className={styles['clear-btn']}
                onClick={onClearTaskQueue}
                loading={loading}
              >
                {t('YakitButton.clear')}
              </YakitButton>
              <YakitButton type="text2" icon={<OutlineXIcon />} onClick={() => setShowList(false)} />
            </div>
          </div>
          <div className={styles['task-query-list']}>
            {questionQueue.data.map((item) => {
              return <AITaskQueryItem key={item.id} item={item} />
            })}
          </div>
        </div>
      ) : (
        <YakitButton type="outline2" icon={<OutlineListTodoIcon />} radius={9999} onClick={() => setShowList(true)}>
          {t('AITaskQuery.taskQueue')}
        </YakitButton>
      )}
    </div>
  ) : (
    <></>
  )
})

const AITaskQueryItem: React.FC<AITaskQueryItemProps> = React.memo((props) => {
  const { item } = props
  const { t } = useI18nNamespaces(['aiAgent'])

  const sessionId = useCurrentSessionId()
  const store = useCurrentStore()
  const execute = useStore(store, (state) => state.execute)
  const { onSend } = useAIAgentDispatcher()

  const { loading: upLoading, markSending: markUpSending } = useSyncLoadingState()
  const { loading: removeLoading, markSending: markRemoveSending } = useSyncLoadingState()
  const { loading: immediateLoading, markSending: markInterventionSending } = useSyncLoadingState()

  const onTaskUp = useDebounceFn(
    () => {
      if (!execute || upLoading) return
      const syncId = randomString(8)
      markUpSending(syncId)
      const jumpInfo: AIInputEvent = {
        IsSyncMessage: true,
        SyncType: AIInputEventSyncTypeEnum.SYNC_TYPE_REACT_JUMP_QUEUE,
        SyncJsonInput: JSON.stringify({ task_id: item.id }),
        Params: {},
        SyncID: syncId,
      }
      onSend({ token: sessionId, type: '', params: jumpInfo })

      const queueInfo: AIInputEvent = {
        IsSyncMessage: true,
        SyncType: AIInputEventSyncTypeEnum.SYNC_TYPE_QUEUE_INFO,
        Params: {},
        SyncID: randomString(8),
      }
      onSend({ token: sessionId, type: '', params: queueInfo })
    },
    { wait: 200, leading: true },
  ).run
  const onTaskRemove = useDebounceFn(
    () => {
      if (!execute || removeLoading) return
      const syncId = randomString(8)
      markRemoveSending(syncId)
      const jumpInfo: AIInputEvent = {
        IsSyncMessage: true,
        SyncType: AIInputEventSyncTypeEnum.SYNC_TYPE_REACT_REMOVE_TASK,
        SyncJsonInput: JSON.stringify({ task_id: item.id }),
        Params: {},
        SyncID: syncId,
      }
      onSend({ token: sessionId, type: '', params: jumpInfo })

      const queueInfo: AIInputEvent = {
        IsSyncMessage: true,
        SyncType: AIInputEventSyncTypeEnum.SYNC_TYPE_QUEUE_INFO,
        Params: {},
        SyncID: randomString(8),
      }
      onSend({ token: sessionId, type: '', params: queueInfo })
    },
    { wait: 200, leading: true },
  ).run
  /** 调整方案（原人工介入）：先发删除该条队列任务的信号，再把该条 user_input 作为
   * 人工介入消息发给后端，最后补发一次队列快照刷新（QUEUE_INFO）让本条立即消失 */
  const onTaskImmediate = useDebounceFn(
    () => {
      if (!execute || immediateLoading) return

      const removeTaskInfo: AIInputEvent = {
        IsSyncMessage: true,
        SyncType: AIInputEventSyncTypeEnum.SYNC_TYPE_REACT_REMOVE_TASK,
        SyncJsonInput: JSON.stringify({ task_id: item.id }),
        Params: {},
        SyncID: randomString(8),
      }
      onSend({ token: sessionId, type: '', params: removeTaskInfo })

      const syncId = randomString(8)
      markInterventionSending(syncId)
      const interventionInfo: AIInputEvent = {
        IsSyncMessage: true,
        SyncType: AIInputEventSyncTypeEnum.SYNC_TYPE_USER_INTERVENTION,
        SyncJsonInput: JSON.stringify({ content: item.user_input }),
        Params: {},
        SyncID: syncId,
      }
      onSend({ token: sessionId, type: 'task', params: interventionInfo })

      // 与置顶/删除一致：补发队列快照刷新，让本条立即从列表消失，不等 5s 轮询
      const queueInfo: AIInputEvent = {
        IsSyncMessage: true,
        SyncType: AIInputEventSyncTypeEnum.SYNC_TYPE_QUEUE_INFO,
        Params: {},
        SyncID: randomString(8),
      }
      onSend({ token: sessionId, type: '', params: queueInfo })

      onAddToList(item.user_input)
    },
    { wait: 200, leading: true },
  ).run
  const onAddToList = useMemoizedFn((prompt: string) => {
    const chatData: AIChatQSData = {
      id: uuidv4(),
      chatType: 'reAct',
      type: AIChatQSDataTypeEnum.USER_MANUAL_INTERVENTION,
      Timestamp: moment().unix(),
      data: { type: '加入上下文', content: prompt || '' },
      AIService: '',
      AIModelName: '',
    }
    globalSessionEngine.pushDataToSession(sessionId, chatData)
  })
  return (
    <div key={item.id} className={styles['task-query-list-item']}>
      <div className={styles['item-left']}>
        <OutlineChatIcon className={styles['chat-icon']} />
        {item.is_recovery && (
          <YakitTag color="info" size="small" fullRadius className={styles['recovery-tag']}>
            恢复任务
          </YakitTag>
        )}
        <span className="content-ellipsis" title={item.user_input}>
          {item.user_input}
        </span>
      </div>
      <div className={styles['item-right']}>
        {item.focus_mode && (
          <Tooltip title={t('AITaskQuery.focusMode', { mode: item.focus_mode })}>
            <OutlineInformationcircleIcon className={styles['info-icon']} />
          </Tooltip>
        )}
        <YakitButton
          size="small"
          type="outline2"
          onClick={onTaskImmediate}
          loading={immediateLoading}
          disabled={immediateLoading}
        >
          {t('AITaskQuery.immediate')}
        </YakitButton>
        <YakitButton type="text2" icon={<OutlineArrowupIcon />} onClick={onTaskUp} loading={upLoading} />
        <YakitButton type="text2" icon={<OutlineTrashIcon />} onClick={onTaskRemove} loading={removeLoading} />
      </div>
    </div>
  )
})
