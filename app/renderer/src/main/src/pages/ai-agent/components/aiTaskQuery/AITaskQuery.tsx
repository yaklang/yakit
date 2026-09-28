import React, { useEffect, useRef, useState } from 'react'
import type { AITaskQueryItemProps, AITaskQueryProps } from './type'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import {
  ArrowUpOutlined,
  ChatOutlined,
  InformationCircleOutlined,
  ListTodoOutlined,
  TrashOutlined,
  XOutlined,
} from '@yakit-libs/yakit-ui-icons/outline'
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
              <ListTodoOutlined className={styles['list-todo-icon']} color="currentColor" />
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
              <YakitButton type="text2" icon={<XOutlined color="currentColor" />} onClick={() => setShowList(false)} />
            </div>
          </div>
          <div className={styles['task-query-list']}>
            {questionQueue.data.map((item) => {
              return <AITaskQueryItem key={item.id} item={item} />
            })}
          </div>
        </div>
      ) : (
        <YakitButton
          type="outline2"
          icon={<ListTodoOutlined color="currentColor" />}
          radius={9999}
          onClick={() => setShowList(true)}
        >
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
  /** 调整方向 / 追加待办共用：任一发送中同时禁用两个按钮，避免连点各发一次 remove_task */
  const { loading: dequeueLoading, markSending: markDequeueSending } = useSyncLoadingState()

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
  /** 从队列移除当前项后执行主动作，再 QUEUE_INFO 刷新列表（调整方向 / 追加待办共用） */
  const dequeueThenAct = useMemoizedFn((opts: { action: (syncId: string) => void; after?: () => void }) => {
    if (!execute || dequeueLoading) return

    const removeTaskInfo: AIInputEvent = {
      IsSyncMessage: true,
      SyncType: AIInputEventSyncTypeEnum.SYNC_TYPE_REACT_REMOVE_TASK,
      SyncJsonInput: JSON.stringify({ task_id: item.id }),
      Params: {},
      SyncID: randomString(8),
    }
    onSend({ token: sessionId, type: '', params: removeTaskInfo })

    const syncId = randomString(8)
    markDequeueSending(syncId)
    opts.action(syncId)

    const queueInfo: AIInputEvent = {
      IsSyncMessage: true,
      SyncType: AIInputEventSyncTypeEnum.SYNC_TYPE_QUEUE_INFO,
      Params: {},
      SyncID: randomString(8),
    }
    onSend({ token: sessionId, type: '', params: queueInfo })

    opts.after?.()
  })

  /** 调整方向（原人工介入）：删队列后以 user_input 发介入信号，并写入聊天记录 */
  const onTaskImmediate = useDebounceFn(
    () => {
      dequeueThenAct({
        action: (syncId) => {
          const interventionInfo: AIInputEvent = {
            IsSyncMessage: true,
            SyncType: AIInputEventSyncTypeEnum.SYNC_TYPE_USER_INTERVENTION,
            SyncJsonInput: JSON.stringify({ content: item.user_input }),
            Params: {},
            SyncID: syncId,
          }
          onSend({ token: sessionId, type: 'task', params: interventionInfo })
        },
        after: () => onAddToList(item.user_input),
      })
    },
    { wait: 200, leading: true },
  ).run

  /** 追加待办：删队列后发 add_todo_sync */
  const onAddToDo = useDebounceFn(
    () => {
      const text = (item.user_input || '').trim()
      if (!text) return
      dequeueThenAct({
        action: (syncId) => {
          const addTodoInfo: AIInputEvent = {
            IsSyncMessage: true,
            SyncType: AIInputEventSyncTypeEnum.SYNC_TYPE_ADD_TODO,
            SyncJsonInput: JSON.stringify({ text, set_current: false }),
            Params: {},
            SyncID: syncId,
          }
          onSend({ token: sessionId, type: '', params: addTodoInfo })
        },
      })
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
        <ChatOutlined className={styles['chat-icon']} color="currentColor" />
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
            <InformationCircleOutlined className={styles['info-icon']} color="currentColor" />
          </Tooltip>
        )}
        <YakitButton size="small" type="text2" onClick={onAddToDo} loading={dequeueLoading} disabled={dequeueLoading}>
          {t('AITaskQuery.addToDo')}
        </YakitButton>
        <YakitButton
          size="small"
          type="text2"
          onClick={onTaskImmediate}
          loading={dequeueLoading}
          disabled={dequeueLoading}
        >
          {t('AITaskQuery.adjustDirection')}
        </YakitButton>
        <div className={styles['divider-style']} />
        <YakitButton
          type="text2"
          icon={<ArrowUpOutlined color="currentColor" />}
          onClick={onTaskUp}
          loading={upLoading}
        />
        <YakitButton
          type="text2"
          icon={<TrashOutlined color="currentColor" />}
          onClick={onTaskRemove}
          loading={removeLoading}
        />
      </div>
    </div>
  )
})
