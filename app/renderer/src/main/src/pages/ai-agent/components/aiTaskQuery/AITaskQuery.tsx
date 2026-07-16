import React, { useState } from 'react'
import { AITaskQueryItemProps, AITaskQueryProps } from './type'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import {
  OutlineArrowupIcon,
  OutlineChatIcon,
  OutlineInformationcircleIcon,
  OutlineListTodoIcon,
  OutlineTrashIcon,
  OutlineXIcon,
} from '@/assets/icon/outline'
import styles from './AITaskQuery.module.scss'
import { YakitTag } from '@/components/yakitUI/YakitTag/YakitTag'
import { AIInputEvent, AIInputEventSyncTypeEnum } from '@/pages/ai-re-act/hooks/grpcApi'
import { Tooltip } from 'antd'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { useCurrentStore } from '@/pages/ai-re-act/hooks/useCurrentDataBySession'
import { useStore } from 'zustand'
import useAIAgentDispatcher from '../../useContext/useDispatcher'
import { randomString } from '@/utils/randomUtil'
import useCurrentSessionId from '@/pages/ai-re-act/hooks/useCurrentSessionId'
import useMemoizedFn from 'ahooks/lib/useMemoizedFn'
import useDebounceFn from 'ahooks/lib/useDebounceFn'

export const AITaskQuery: React.FC<AITaskQueryProps> = React.memo(() => {
  const { t } = useI18nNamespaces(['aiAgent', 'yakitUi'])

  const [loading, setLoading] = useState<boolean>(false)

  const sessionId = useCurrentSessionId()
  const store = useCurrentStore()
  const questionQueue = useStore(store, (state) => state.questionQueue)
  const execute = useStore(store, (state) => state.execute)
  const { onSend } = useAIAgentDispatcher()

  const [showList, setShowList] = useState<boolean>(true)

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
    <div className={styles['ai-task-query']}>
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
  const [upLoading, setUpLoading] = useState<boolean>(false)
  const [removeLoading, setRemoveLoading] = useState<boolean>(false)

  const sessionId = useCurrentSessionId()
  const store = useCurrentStore()
  const execute = useStore(store, (state) => state.execute)
  const { onSend } = useAIAgentDispatcher()

  const onTaskUp = useDebounceFn(
    () => {
      if (!execute || upLoading) return
      setUpLoading(true)
      const jumpInfo: AIInputEvent = {
        IsSyncMessage: true,
        SyncType: AIInputEventSyncTypeEnum.SYNC_TYPE_REACT_JUMP_QUEUE,
        SyncJsonInput: JSON.stringify({ task_id: item.id }),
        Params: {},
        SyncID: randomString(8),
      }
      onSend({ token: sessionId, type: '', params: jumpInfo })

      const queueInfo: AIInputEvent = {
        IsSyncMessage: true,
        SyncType: AIInputEventSyncTypeEnum.SYNC_TYPE_QUEUE_INFO,
        Params: {},
        SyncID: randomString(8),
      }
      onSend({ token: sessionId, type: '', params: queueInfo })

      setTimeout(() => {
        setUpLoading(false)
      }, 500)
    },
    { wait: 500, leading: true },
  ).run
  const onTaskRemove = useDebounceFn(
    () => {
      if (!execute || removeLoading) return
      setRemoveLoading(true)

      const jumpInfo: AIInputEvent = {
        IsSyncMessage: true,
        SyncType: AIInputEventSyncTypeEnum.SYNC_TYPE_REACT_REMOVE_TASK,
        SyncJsonInput: JSON.stringify({ task_id: item.id }),
        Params: {},
        SyncID: randomString(8),
      }
      onSend({ token: sessionId, type: '', params: jumpInfo })

      const queueInfo: AIInputEvent = {
        IsSyncMessage: true,
        SyncType: AIInputEventSyncTypeEnum.SYNC_TYPE_QUEUE_INFO,
        Params: {},
        SyncID: randomString(8),
      }
      onSend({ token: sessionId, type: '', params: queueInfo })

      setTimeout(() => {
        setRemoveLoading(false)
      }, 500)
    },
    { wait: 500, leading: true },
  ).run
  return (
    <div key={item.id} className={styles['task-query-list-item']}>
      <div className={styles['item-left']}>
        <OutlineChatIcon className={styles['chat-icon']} />
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
        <YakitButton type="text2" icon={<OutlineArrowupIcon />} onClick={onTaskUp} loading={upLoading} />
        <YakitButton type="text2" icon={<OutlineTrashIcon />} onClick={onTaskRemove} loading={removeLoading} />
      </div>
    </div>
  )
})
