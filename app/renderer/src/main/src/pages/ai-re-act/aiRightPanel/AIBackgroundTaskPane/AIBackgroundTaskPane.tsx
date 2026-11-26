import type { FC } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useStore } from 'zustand'
import { useMemoizedFn } from 'ahooks'
import classNames from 'classnames'
import { Tooltip } from 'antd'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import useAIAgentDispatcher from '@/pages/ai-agent/useContext/useDispatcher'
import { randomString } from '@/utils/randomUtil'
import { useCurrentRawData, useCurrentStore } from '../../hooks/useCurrentDataBySession'
import useCurrentSessionId from '../../hooks/useCurrentSessionId'
import { AIInputEventSyncTypeEnum, AsyncExecutionState } from '../../hooks/grpcApi'
import type { AIAgentGrpcApi } from '../../hooks/grpcApi'
import {
  CheckCircleOutlined,
  ChevronRightOutlined,
  LoadingOutlined,
  QuestionMarkCircleOutlined,
  XCircleOutlined,
  XOutlined,
} from '@yakit-libs/yakit-ui-icons/outline'
import styles from './AIBackgroundTaskPane.module.scss'
import { YakitTag } from '@/components/yakitUI/YakitTag/YakitTag'
import { YakitEmpty } from '@/components/yakitUI/YakitEmpty/YakitEmpty'
import moment from 'moment'
import { timeDiffWithMoment } from '@/utils/timeUtil'

const emptySnapshot = (): AIAgentGrpcApi.AsyncExecutionSnapshot => ({
  revision: 0,
  running_count: 0,
  updated_at: 0,
  executions: [],
})

const canStop = (state?: AsyncExecutionState) =>
  state === AsyncExecutionState.pending ||
  state === AsyncExecutionState.running ||
  state === AsyncExecutionState.stopping

const failedStates = new Set<AsyncExecutionState>([
  AsyncExecutionState.failed,
  AsyncExecutionState.cancelled,
  AsyncExecutionState.timedOut,
])

const expandLimit = 5
type BackgroundTaskSectionKey = 'running' | 'succeeded' | 'failed'

const formatExecutionTime = (value?: string) => {
  if (!value) return ''
  const date = moment(value)
  return date.isValid() ? date.format('YYYY-MM-DD HH:mm') : value
}

const formatRunningDuration = (execution: AIAgentGrpcApi.AsyncExecutionSummary, nowUnix: number) => {
  const start = moment(execution.started_at || execution.created_at)
  if (!start.isValid()) return ''
  return timeDiffWithMoment(start.unix(), nowUnix)
}

const renderExecutionItem = (
  sectionKey: BackgroundTaskSectionKey,
  execution: AIAgentGrpcApi.AsyncExecutionSummary,
  t: (key: string) => string,
  nowUnix: number,
  onStop: (executeId: string) => void,
) => {
  switch (sectionKey) {
    case 'running':
      return (
        <div key={execution.execute_id} className={classNames(styles['execution-item'], styles['running-item'])}>
          <div className={styles['execution-item-content']}>
            <LoadingOutlined color="currentColor" className={styles['running']} />
            <div>{execution.metadata?.name || execution.execute_id}</div>
          </div>
          <span className={styles['execution-time']}>
            {t('AIRightPanel.executionDuration')}
            {formatRunningDuration(execution, nowUnix)}
          </span>
          {canStop(execution.state) && (
            <span
              className={styles['execution-cancel']}
              onClick={(event) => {
                event.stopPropagation()
                onStop(execution.execute_id)
              }}
            >
              <XOutlined color="currentColor" />
              {t('AIRightPanel.executionCancel')}
            </span>
          )}
        </div>
      )
    case 'succeeded':
      return (
        <div key={execution.execute_id} className={styles['execution-item']}>
          <div className={styles['execution-item-content']}>
            <CheckCircleOutlined color="currentColor" className={styles['completed']} />
            <div>{execution.metadata?.name || execution.execute_id}</div>
          </div>
          <span className={classNames(styles['execution-time'])}>{formatExecutionTime(execution.ended_at)}</span>
        </div>
      )
    case 'failed':
      return (
        <div key={execution.execute_id} className={styles['execution-item']}>
          <div className={styles['execution-item-content']}>
            <XCircleOutlined color="currentColor" className={styles['failed']} />
            <div>{execution.metadata?.name || execution.execute_id}</div>
          </div>
          <span className={classNames(styles['execution-time'], styles['execution-time-hide'])}>
            {formatExecutionTime(execution.ended_at)}
          </span>
          <Tooltip title={execution.error || execution.cancel_reason}>
            <span className={styles['execution-fail-reason']}>
              <QuestionMarkCircleOutlined color="currentColor" />
              {t('AIRightPanel.executionFailReason')}
            </span>
          </Tooltip>
        </div>
      )
    default:
      return null
  }
}

const groupExecutions = (executions: AIAgentGrpcApi.AsyncExecutionSummary[]) => {
  const running: AIAgentGrpcApi.AsyncExecutionSummary[] = []
  const succeeded: AIAgentGrpcApi.AsyncExecutionSummary[] = []
  const failed: AIAgentGrpcApi.AsyncExecutionSummary[] = []
  executions.forEach((execution) => {
    if (execution.state === AsyncExecutionState.completed) succeeded.push(execution)
    else if (execution.state && failedStates.has(execution.state)) failed.push(execution)
    else running.push(execution)
  })
  return { running, succeeded, failed }
}

const defaultExpanded = (grouped: ReturnType<typeof groupExecutions>) => ({
  running: true,
  succeeded: grouped.running.length <= expandLimit,
  failed: grouped.running.length <= expandLimit && grouped.succeeded.length <= expandLimit,
})

/** 后台执行快照：先把协议数据原样放出来，停止走 stop_async_execution_sync */
export const AIBackgroundTaskPane: FC = () => {
  const { t } = useI18nNamespaces(['aiAgent', 'yakitUi'])
  const store = useCurrentStore()
  const rawData = useCurrentRawData()
  const sessionId = useCurrentSessionId()
  const { onSend } = useAIAgentDispatcher()
  useStore(store, (state) => state.asyncExecutionUpdate)
  const snapshot = rawData.asyncExecution ?? emptySnapshot()

  useEffect(() => {
    if (!sessionId || !onSend) return
    onSend({
      token: sessionId,
      type: '',
      params: {
        IsSyncMessage: true,
        SyncType: AIInputEventSyncTypeEnum.SYNC_TYPE_ASYNC_EXECUTION,
        SyncID: randomString(8),
      },
    })
  }, [onSend, sessionId])

  const onStop = useMemoizedFn((executeId: string) => {
    if (!sessionId || !onSend) return
    onSend({
      token: sessionId,
      type: '',
      params: {
        IsSyncMessage: true,
        SyncType: AIInputEventSyncTypeEnum.SYNC_TYPE_STOP_ASYNC_EXECUTION,
        SyncID: randomString(8),
        SyncJsonInput: JSON.stringify({ execute_id: executeId }),
      },
    })
  })

  const grouped = useMemo(() => groupExecutions(snapshot.executions), [snapshot.executions])
  const [nowUnix, setNowUnix] = useState(() => moment().unix())
  useEffect(() => {
    if (grouped.running.length === 0) return
    const timer = setInterval(() => setNowUnix(moment().unix()), 1000)
    return () => clearInterval(timer)
  }, [grouped.running.length])
  const [expanded, setExpanded] = useState(() => defaultExpanded(grouped))
  const expandedInitedRef = useRef(grouped.running.length + grouped.succeeded.length + grouped.failed.length > 0)
  useEffect(() => {
    if (expandedInitedRef.current) return
    if (grouped.running.length + grouped.succeeded.length + grouped.failed.length === 0) return
    expandedInitedRef.current = true
    setExpanded(defaultExpanded(grouped))
  }, [grouped])
  const toggleSection = useMemoizedFn((key: BackgroundTaskSectionKey) => {
    setExpanded((current) => ({ ...current, [key]: !current[key] }))
  })
  const sections = (
    [
      {
        key: 'running' as const,
        title: t('AIRightPanel.executionRunning'),
        items: grouped.running,
      },
      {
        key: 'succeeded' as const,
        title: t('AIRightPanel.executionSucceeded'),
        items: grouped.succeeded,
      },
      {
        key: 'failed' as const,
        title: t('AIRightPanel.executionFailed'),
        items: grouped.failed,
      },
    ] satisfies { key: BackgroundTaskSectionKey; title: string; items: AIAgentGrpcApi.AsyncExecutionSummary[] }[]
  ).filter((section) => section.items.length > 0)

  if (sections.length === 0) {
    return (
      <div className={styles['empty']}>
        <YakitEmpty />
      </div>
    )
  }

  return (
    <div className={styles['content']}>
      {sections.map((section) => (
        <div key={section.key}>
          <div
            className={classNames(styles['group-title'], { [styles['expanded']]: expanded[section.key] })}
            onClick={() => toggleSection(section.key)}
          >
            <ChevronRightOutlined color="currentColor" />
            {section.title}
            <YakitTag size="small" fullRadius>
              {section.items.length}
            </YakitTag>
          </div>
          <div className={classNames(styles['group-list'], { [styles['expanded']]: expanded[section.key] })}>
            <div className={styles['group-list-inner']}>
              {section.items.map((execution) => renderExecutionItem(section.key, execution, t, nowUnix, onStop))}
            </div>
          </div>
        </div>
      ))}
      <div className={styles['list-end']}>{t('YakitEmpty.end_of_list')}</div>
    </div>
  )
}
