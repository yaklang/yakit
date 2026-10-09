import React, { useEffect, useRef, useState } from 'react'
import { useDebounceFn, useInViewport, useMemoizedFn } from 'ahooks'
import { Tooltip } from 'antd'
import {
  PlusOutlined,
  QuestionMarkCircleOutlined,
  RefreshOutlined,
  SearchOutlined,
} from '@yakit-libs/yakit-ui-icons/outline'
import { YakitInput } from '@/components/yakitUI/YakitInput/YakitInput'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitRoundCornerTag } from '@/components/yakitUI/YakitRoundCornerTag/YakitRoundCornerTag'
import { showYakitModal } from '@/components/yakitUI/YakitModal/YakitModalConfirm'
import { genDefaultPagination } from '@/pages/invoker/schema'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import type { AIReActSchedule } from '../../ai-re-act/hooks/grpcApi'
import { grpcGetAIReActSchedule, grpcQueryAIReActSchedules, grpcRunAIReActScheduleNow } from './utils'
import type { AIScheduledTasksProps } from './type'
import ScheduledTasksForm from './scheduledTasksForm/ScheduledTasksForm'
import AIScheduledTasksList from './AIScheduledTasksList'
import { SideSettingButton } from '../aiChatWelcome/AIChatWelcomeSideSetting'
import { yakitNotify } from '@/utils/notification'
import emiter from '@/utils/eventBus/eventBus'
import { grpcQueryAISession } from '../grpc'
import useAIAgentDispatcher from '../useContext/useDispatcher'
import { waitForAISessionPush } from './waitForAISessionPush'
import styles from './AIScheduledTasks.module.scss'

const AIScheduledTasks: React.FC<AIScheduledTasksProps> = React.memo((props) => {
  const { visible } = props
  const { t } = useI18nNamespaces(['aiAgent', 'yakitUi'])
  const { setActiveChat } = useAIAgentDispatcher()

  const [keyWord, setKeyWord] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [schedules, setSchedules] = useState<AIReActSchedule[]>([])
  const requestIdRef = useRef(0)
  const listRef = useRef<HTMLDivElement>(null)
  const [inViewPort = true] = useInViewport(listRef)

  const { run: getList, cancel: cancelGetList } = useDebounceFn(
    async () => {
      const requestId = ++requestIdRef.current
      setLoading(true)
      try {
        const res = await grpcQueryAIReActSchedules({
          Pagination: genDefaultPagination(-1),
          Filter: { Status: [], Keyword: keyWord },
        })
        if (requestId === requestIdRef.current) setSchedules(res.Data || [])
      } catch {
      } finally {
        setTimeout(() => {
          if (requestId === requestIdRef.current) setLoading(false)
        }, 200)
      }
    },
    { wait: 500 },
  )

  useEffect(() => {
    if (inViewPort) getList()
    // 关键词变化、离开视口或卸载后，取消待执行查询并忽略旧请求。
    return () => {
      cancelGetList()
      requestIdRef.current += 1
    }
  }, [inViewPort, keyWord, getList, cancelGetList])

  // 侧栏通过 width:0 折叠，重新展开时主动刷新。
  const prevVisibleRef = useRef<boolean>(undefined)
  useEffect(() => {
    const prev = prevVisibleRef.current
    prevVisibleRef.current = visible
    if (visible && prev === false) getList()
  }, [visible])

  const onSetData = useMemoizedFn((item: AIReActSchedule) => {
    setSchedules((previous) => previous.map((schedule) => (schedule.UUID === item.UUID ? item : schedule)))
  })
  const openForm = useMemoizedFn((editing?: AIReActSchedule) => {
    const m = showYakitModal({
      title: (modalT) => modalT(editing ? 'AIScheduledTasks.editTitle' : 'AIScheduledTasks.createTitle'),
      width: 600,
      footer: null,
      content: (
        <ScheduledTasksForm
          editing={editing}
          onClose={() => m.destroy()}
          onSuccess={() => {
            if (editing?.UUID) {
              // 编辑成功只拉取该任务最新数据，经 onSetData 原位更新列表行，
              // 同时由列表项同步打开中的详情；不整表刷新以保留当前滚动位置
              grpcGetAIReActSchedule({ UUID: editing.UUID }, true)
                .then((latest) => {
                  if (latest?.UUID) onSetData(latest)
                })
                .catch(() => {})
            } else {
              getList()
            }
            m.destroy()
          }}
        />
      ),
    })
  })
  const onAdd = useMemoizedFn(() => openForm())

  // 立即运行定时任务：成功后等待后端 ai_session 推送（最多 2s），
  // 直接查询并激活会话；超时（旧引擎/通知丢失）则沿用最新本地会话兜底，不依赖历史浮层挂载。
  const runScheduleNow = useMemoizedFn((item: AIReActSchedule) => {
    return grpcRunAIReActScheduleNow({ UUID: item.UUID })
      .then(() => waitForAISessionPush(2000))
      .then(async (sessionId) => {
        yakitNotify('success', t('AIScheduledTasks.runStarted'))
        // 已打开的历史列表仍需刷新；会话激活由下方直接处理。
        emiter.emit('sessionData', JSON.stringify({ type: 'refresh', sessionId }))
        try {
          const { Data } = await grpcQueryAISession(
            {
              Pagination: { Page: 1, Limit: 1, OrderBy: 'last_used_at', Order: 'desc' },
              Filter: sessionId ? { SessionID: [sessionId] } : { Source: ['ai', ''] },
            },
            true,
          )
          const session = sessionId ? Data.find((item) => item.SessionID === sessionId) : Data[0]
          if (session) {
            setActiveChat(session)
          } else {
            yakitNotify('warning', t('AIScheduledTasks.openRunSessionFailed'))
          }
        } catch {
          yakitNotify('warning', t('AIScheduledTasks.openRunSessionFailed'))
        }
      })
      .catch(() => {})
  })

  return (
    <div className={styles['ai-schedule-list-wrapper']} ref={listRef}>
      <div className={styles['ai-schedule-list-header']}>
        <div className={styles['ai-schedule-list-header-left']}>
          <span className={styles['ai-schedule-list-header-title']}>{t('AIScheduledTasks.title')}</span>
          <YakitRoundCornerTag>{schedules.length}</YakitRoundCornerTag>
        </div>
        <div className={styles['ai-schedule-list-header-right']}>
          <SideSettingButton type="text2" />
          <Tooltip title={t('AIScheduledTasks.maxConcurrentRuns')}>
            <YakitButton type="text2" icon={<QuestionMarkCircleOutlined />} className={styles['question-icon']} />
          </Tooltip>
          <Tooltip title={t('YakitButton.add')}>
            <YakitButton type="text2" icon={<PlusOutlined />} onClick={onAdd} />
          </Tooltip>
          <Tooltip title={t('YakitButton.refresh')}>
            <YakitButton type="text2" icon={<RefreshOutlined />} onClick={() => getList()} />
          </Tooltip>
        </div>
      </div>
      <div className={styles['ai-schedule-list-search']}>
        <YakitInput
          prefix={<SearchOutlined className={styles['search-icon']} />}
          allowClear
          placeholder={t('YakitInput.searchKeyWordPlaceholder')}
          value={keyWord}
          onChange={(e) => setKeyWord(e.target.value)}
        />
      </div>
      <AIScheduledTasksList
        data={schedules}
        loading={loading}
        filtered={keyWord.trim() !== ''}
        onClearFilter={() => setKeyWord('')}
        onAdd={onAdd}
        onSetData={onSetData}
        onRefresh={getList}
        onEdit={openForm}
        onRunNow={runScheduleNow}
      />
    </div>
  )
})
export default AIScheduledTasks
