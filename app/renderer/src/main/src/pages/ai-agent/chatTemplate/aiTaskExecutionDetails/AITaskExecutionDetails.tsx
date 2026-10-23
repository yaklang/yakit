import React, { useEffect, useState } from 'react'
import classNames from 'classnames'
import {
  FILTER_KEY_TO_GANTT_LEGEND,
  GANTT_LEGEND_TO_FILTER_KEY,
  TODO_STATUS_FILTER_KEYS,
  TODO_STATUS_TO_FILTER_KEY,
  type AIBrowserProcessesProps,
  type AITaskDetailsAddListItem,
  type AITaskDetailsAddPopoverProps,
  type AITaskDetailsAddPopoverResponse,
  type AITaskDetailsCardListProps,
  type AITaskExecutionDetailsCardProps,
  type AITaskExecutionDetailsProps,
  type AITaskStatisticsStatusItem,
  type AITaskStatisticsStatusProps,
  type TodoStatusFilterKey,
  type TodoViewMode,
} from './type'
import {
  PresentationChartBarOutlined,
  TrashOutlined,
  XOutlined,
  ViewBoardsOutlined,
  SquareGanttChartOutlined,
} from '@yakit-libs/yakit-ui-icons/outline'
import styles from './AITaskExecutionDetails.module.scss'
import { YakitTag } from '@/components/yakitUI/YakitTag/YakitTag'
import { AIDeleteNodeIcon } from '@yakit-libs/yakit-ui-icons/oldicon/AIDeleteNodeIcon'
import { AIDoingNodeIcon } from '@yakit-libs/yakit-ui-icons/oldicon/AIDoingNodeIcon'
import { AIDoneNodeIcon } from '@yakit-libs/yakit-ui-icons/oldicon/AIDoneNodeIcon'
import { AIPendingNodeIcon } from '@yakit-libs/yakit-ui-icons/oldicon/AIPendingNodeIcon'
import { AISkippedNodeIcon } from '@yakit-libs/yakit-ui-icons/oldicon/AISkippedNodeIcon'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitPopconfirm } from '@/components/yakitUI/YakitPopconfirm/YakitPopconfirm'
import { useCreation, useMemoizedFn, useSelections } from 'ahooks'
import type { PlanItemDetailsData, TodoListCardData } from '@/pages/ai-re-act/hooks/aiRender'
import cloneDeep from 'lodash/cloneDeep'
import isEqual from 'lodash/isEqual'
import { YakitEmpty } from '@/components/yakitUI/YakitEmpty/YakitEmpty'
import { YakitPopover } from '@/components/yakitUI/YakitPopover/YakitPopover'
import { YakitInput } from '@/components/yakitUI/YakitInput/YakitInput'
import { RollingLoadList } from '@/components/RollingLoadList/RollingLoadList'
import {
  genDefaultPagination,
  type PaginationSchema,
  type QueryYakScriptRequest,
  type YakScript,
} from '@/pages/invoker/schema'
import type { AIForge, QueryAIForgeRequest } from '../../type/forge'
import { grpcQueryAIForge } from '../../grpc'
import type { AITool, GetAIToolListRequest } from '../../type/aiTool'
import { grpcGetAIToolList } from '../../aiToolList/utils'
import { YakitCheckbox } from '@/components/yakitUI/YakitCheckbox/YakitCheckbox'
import { TableTotalAndSelectNumber } from '@/components/TableTotalAndSelectNumber/TableTotalAndSelectNumber'
import { YakitSpin } from '@/components/yakitUI/YakitSpin/YakitSpin'
import {
  type AIInputEvent,
  AIInputEventHotPatchTypeEnum,
  AIInputEventSyncTypeEnum,
  type AIStartParams,
} from '@/pages/ai-re-act/hooks/grpcApi'
import { apiQueryYakScript } from '@/pages/plugins/utils'
import { grpcGetAllMCPServers } from '../../aiMCP/utils'
import type { GetAllMCPServersRequest, MCPServerTool } from '../../type/aiMCP'
import { HorizontalScrollCardItemInfoMultiple } from '@/pages/plugins/operator/horizontalScrollCard/HorizontalScrollCard'
import { YakitRadioButtons } from '@/components/yakitUI/YakitRadioButtons/YakitRadioButtons'
import { timeDiffWithMoment } from '@/utils/timeUtil'
import { AITaskActionItem, AITaskExecutionList } from './aiTaskExecutionList/AITaskExecutionList'
import { AITaskBoard } from './aiTaskBoard/AITaskBoard'
import { AITaskGantt } from './aiTaskGantt/AITaskGantt'
import { AIToDoListDetail } from '@/pages/ai-re-act/aiReActChat/aiToDoList/AIToDoListDetail'
import useCurrentTaskData from '@/pages/ai-re-act/hooks/useCurrentTaskData/useCurrentTaskData'
import useCurrentSessionId from '@/pages/ai-re-act/hooks/useCurrentSessionId'
import useAIAgentDispatcher from '../../useContext/useDispatcher'
import { randomString } from '@/utils/randomUtil'
import { getSessionRiskTagEntries } from '@/pages/ai-re-act/aiRightPanel/riskLevelCount'
import { YakitSegmented } from '@/components/yakitUI/YakitSegmented/YakitSegmented'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { AITaskSelectDropdown } from './aiTaskSelectDropdown/AITaskSelectDropdown'
import { AITaskSkillList } from './aiTaskSkillList/AITaskSkillList'

/** 顶部状态统计项配置（title 在渲染时用 t 注入） */
const TODO_STAT_META: Array<{
  key: string
  color: AITaskStatisticsStatusItem['color']
  titleKey: string
}> = [
  { key: 'created', color: 'neutral', titleKey: 'AITaskExecutionDetails.statusCreated' },
  { key: 'pending', color: 'neutral', titleKey: 'AITaskExecutionDetails.statusPending' },
  { key: 'doing', color: 'main', titleKey: 'AITaskExecutionDetails.statusDoing' },
  { key: 'done', color: 'green', titleKey: 'AITaskExecutionDetails.statusDone' },
  { key: 'skipped', color: 'neutral', titleKey: 'AITaskExecutionDetails.statusSkipped' },
  { key: 'deleted', color: 'red', titleKey: 'AITaskExecutionDetails.statusDeleted' },
]

export const AITaskExecutionDetails: React.FC<AITaskExecutionDetailsProps> = React.memo((props) => {
  const { taskId, taskGoal, taskName, onClose } = props
  const { t, i18nRefresh } = useI18nNamespaces(['aiAgent', 'yakitUi'])
  const [todoViewMode, setTodoViewMode] = useState<TodoViewMode>('board')
  const [hiddenStatusKeys, setHiddenStatusKeys] = useState<TodoStatusFilterKey[]>([])
  const [selectedTaskId, setSelectedTaskId] = useState(taskId)

  useEffect(() => {
    setSelectedTaskId(taskId)
  }, [taskId])

  const taskData = useCurrentTaskData(selectedTaskId, 3000)
  // taskDetailsMap 中的数据会原地更新，使用 uuid 作为快照变更信号，避免详情组件持有可变引用。
  const planItemDetailsData = useCreation<PlanItemDetailsData | undefined>(
    () => (taskData ? cloneDeep(taskData) : undefined),
    [selectedTaskId, taskData?.uuid],
  )

  const perception = useCreation(() => {
    if (!planItemDetailsData) return
    return planItemDetailsData.perception
  }, [planItemDetailsData?.perception])

  // props.taskGoal 仅对应打开详情时的初始任务；切换下拉后快照无 goal，清空避免串任务
  const selectedTaskGoal = selectedTaskId === taskId ? taskGoal : undefined

  const total = useCreation(
    () => planItemDetailsData?.todoList?.items?.length || 0,
    [planItemDetailsData?.todoList?.items?.length],
  )
  const todoListCardData = useCreation(() => planItemDetailsData?.todoList, [planItemDetailsData?.todoList])

  const toggleStatusFilter = useMemoizedFn((key: string) => {
    // 已创建：在「全显示」与「全隐藏」之间切换
    if (key === 'created') {
      setHiddenStatusKeys((prev) =>
        TODO_STATUS_FILTER_KEYS.every((k) => prev.includes(k)) ? [] : [...TODO_STATUS_FILTER_KEYS],
      )
      return
    }
    if (!TODO_STATUS_FILTER_KEYS.includes(key as TodoStatusFilterKey)) return
    const filterKey = key as TodoStatusFilterKey
    setHiddenStatusKeys((prev) =>
      prev.includes(filterKey) ? prev.filter((k) => k !== filterKey) : [...prev, filterKey],
    )
  })

  const hiddenStatusKeySet = useCreation(() => new Set(hiddenStatusKeys), [hiddenStatusKeys])

  const hiddenLegendKinds = useCreation(
    () => hiddenStatusKeys.map((key) => FILTER_KEY_TO_GANTT_LEGEND[key]),
    [hiddenStatusKeys],
  )

  const todoData = useCreation(() => {
    const allItems = planItemDetailsData?.todoList?.items || []
    const visibleItems: TodoListCardData['items'] = []
    const pending: TodoListCardData['items'] = []
    const doing: TodoListCardData['items'] = []
    const done: TodoListCardData['items'] = []
    const skippedOrDeleted: TodoListCardData['items'] = []
    const progressNumber: AITaskStatisticsStatusProps['list'] = TODO_STAT_META.map((meta) => ({
      key: meta.key,
      color: meta.color,
      title: t(meta.titleKey),
      footerLeft: meta.key === 'created' ? allItems.length : 0,
    }))
    const progressByKey = Object.fromEntries(progressNumber.map((item) => [item.key, item])) as Record<
      string,
      AITaskStatisticsStatusProps['list'][number]
    >

    // 一次遍历：统计全量、收集可见项（保序）、填充看板列
    for (const item of allItems) {
      const filterKey = TODO_STATUS_TO_FILTER_KEY[item.status]
      const visible = !filterKey || !hiddenStatusKeySet.has(filterKey)
      switch (item.status) {
        case 'PENDING':
          progressByKey.pending.footerLeft += 1
          if (visible) {
            visibleItems.push(item)
            pending.push(item)
          }
          break
        case 'DOING':
          progressByKey.doing.footerLeft += 1
          if (visible) {
            visibleItems.push(item)
            doing.push(item)
          }
          break
        case 'DONE':
          progressByKey.done.footerLeft += 1
          if (visible) {
            visibleItems.push(item)
            done.push(item)
          }
          break
        case 'SKIPPED':
          progressByKey.skipped.footerLeft += 1
          if (visible) {
            visibleItems.push(item)
            skippedOrDeleted.push(item)
          }
          break
        case 'DELETED':
          progressByKey.deleted.footerLeft += 1
          if (visible) {
            visibleItems.push(item)
            skippedOrDeleted.push(item)
          }
          break
        default:
          break
      }
    }
    const boardColumns = [
      {
        key: 'pending',
        title: t('AITaskExecutionDetails.columnPending'),
        icon: <AIPendingNodeIcon />,
        items: pending,
      },
      { key: 'doing', title: t('AITaskExecutionDetails.columnDoing'), icon: <AIDoingNodeIcon />, items: doing },
      { key: 'done', title: t('AITaskExecutionDetails.columnDone'), icon: <AIDoneNodeIcon />, items: done },
      {
        key: 'skippedOrDeleted',
        title: t('AITaskExecutionDetails.columnSkippedOrDeleted'),
        icon: (
          <>
            <AISkippedNodeIcon />
            <AIDeleteNodeIcon />
          </>
        ),
        items: skippedOrDeleted,
      },
    ]
    return { boardColumns, progressNumber, visibleItems }
  }, [planItemDetailsData?.todoList?.items, hiddenStatusKeySet, i18nRefresh])

  const skillFixedList = planItemDetailsData?.skills.fixed || []
  const skillDynamicList = planItemDetailsData?.skills.dynamic || []

  const toolCall = useCreation(() => {
    const noData = t('AITaskExecutionDetails.noData')
    if (!planItemDetailsData?.execution)
      return [
        t('AITaskExecutionDetails.success'),
        t('AITaskExecutionDetails.failed'),
        t('AITaskExecutionDetails.totalAttempts'),
      ].map((item) => ({ Id: item, Data: noData, Timestamp: 0 }))
    return [
      {
        Data: `${planItemDetailsData?.execution?.tool_call_success ?? `0`}`,
        Id: t('AITaskExecutionDetails.success'),
        Timestamp: 0,
      },
      {
        Data: `${planItemDetailsData?.execution?.tool_call_failed ?? `0`}`,
        Id: t('AITaskExecutionDetails.failed'),
        Timestamp: 0,
      },
      {
        Data: `${planItemDetailsData?.execution?.tool_call_total ?? `0`}`,
        Id: t('AITaskExecutionDetails.totalAttempts'),
        Timestamp: 0,
      },
    ]
  }, [
    planItemDetailsData?.execution?.tool_call_success,
    planItemDetailsData?.execution?.tool_call_failed,
    planItemDetailsData?.execution?.tool_call_total,
    i18nRefresh,
  ])
  const executionMinutes = useCreation(() => {
    const startedAt = planItemDetailsData?.execution?.started_at || 0
    const endedAt = planItemDetailsData?.execution?.ended_at || 0
    if (!startedAt) return t('AITaskExecutionDetails.noData')
    if (startedAt && !endedAt) return t('AITaskExecutionDetails.executing')

    return timeDiffWithMoment(startedAt, endedAt)
  }, [
    planItemDetailsData?.execution?.status,
    planItemDetailsData?.execution?.started_at,
    planItemDetailsData?.execution?.ended_at,
    i18nRefresh,
  ])
  const httpFlowCount = useCreation(() => {
    if (!planItemDetailsData?.execution) return t('AITaskExecutionDetails.noData')
    return `${planItemDetailsData?.execution.http_flow_count ?? `0`}`
  }, [planItemDetailsData?.execution?.http_flow_count, i18nRefresh])
  const riskLevelEntries = useCreation(
    () => getSessionRiskTagEntries(planItemDetailsData?.execution?.risk_level_count),
    [planItemDetailsData?.execution?.risk_level_count],
  )
  const riskCountFallback = useCreation(() => {
    if (!planItemDetailsData?.execution) return t('AITaskExecutionDetails.noData')
    return `${planItemDetailsData.execution.risk_level_count?.total ?? planItemDetailsData.execution.risk_count ?? 0}`
  }, [planItemDetailsData?.execution?.risk_count, planItemDetailsData?.execution?.risk_level_count?.total, i18nRefresh])
  const showSkill = useCreation(() => {
    if (!planItemDetailsData) return false
    return skillFixedList.length > 0 || skillDynamicList.length > 0
  }, [skillFixedList.length, skillDynamicList.length])
  const showTool = useCreation(() => {
    if (!planItemDetailsData) return false
    return (planItemDetailsData?.tool.fixed.length || planItemDetailsData?.tool.dynamic.length) > 0
  }, [planItemDetailsData?.tool.fixed.length, planItemDetailsData?.tool.dynamic.length])
  const showPlugin = useCreation(() => {
    if (!planItemDetailsData) return false
    return (planItemDetailsData?.plugins.fixed.length || planItemDetailsData?.plugins.dynamic.length) > 0
  }, [planItemDetailsData?.plugins.fixed.length, planItemDetailsData?.plugins.dynamic.length])
  const showMCP = useCreation(() => {
    if (!planItemDetailsData) return false
    return (planItemDetailsData?.mcp.fixed.length || planItemDetailsData?.mcp.dynamic.length) > 0
  }, [planItemDetailsData?.mcp.fixed.length, planItemDetailsData?.mcp.dynamic.length])
  const showBackgroundProcesses = useCreation(() => {
    if (!planItemDetailsData) return false
    return (planItemDetailsData?.backgroundProcesses?.length || 0) > 0
  }, [planItemDetailsData?.backgroundProcesses?.length])

  return (
    <div
      className={classNames(styles['ai-task-execution-details-container'], {
        [styles['with-close']]: !!onClose,
      })}
    >
      {/* 头部 */}
      <div className={styles['header']}>
        <div className={styles['header-row']}>
          <div className={styles['header-title']}>
            <PresentationChartBarOutlined className={styles['header-icon']} color="currentColor" />
            <span className={styles['title-text']}>{t('AITaskExecutionDetails.title')}</span>
            <AITaskSelectDropdown
              taskId={taskId}
              taskName={taskName}
              value={selectedTaskId}
              onChange={setSelectedTaskId}
              taskDataUuid={taskData?.uuid}
            />
          </div>
          {onClose && <YakitButton icon={<XOutlined color="currentColor" />} type="text2" onClick={onClose} />}
        </div>
      </div>

      <div className={styles['content-body']}>
        <div className={styles['summary-section']}>
          <HorizontalScrollCardItemInfoMultiple
            info={toolCall}
            tag={t('AITaskExecutionDetails.toolCallStats')}
            className={styles['summary-tool-card']}
          />
          <div className={styles['summary-metric-list']}>
            <div className={styles['summary-metric-row']}>
              <span className={styles['summary-metric-label']}>{t('AITaskExecutionDetails.executionDuration')}</span>
              <span className={styles['summary-metric-value']}>{executionMinutes}</span>
            </div>
            <div className={styles['summary-metric-row']}>
              <span className={styles['summary-metric-label']}>{t('AITaskExecutionDetails.httpFlowCount')}</span>
              <span className={styles['summary-metric-value']}>{httpFlowCount}</span>
            </div>
            <div className={styles['summary-metric-row']}>
              <span className={styles['summary-metric-label']}>{t('AITaskExecutionDetails.riskCount')}</span>
              {riskLevelEntries.length > 0 ? (
                <span className={styles['risk-tag']}>
                  {riskLevelEntries.map((entry, index) => (
                    <React.Fragment key={entry.field}>
                      {index > 0 && <span className={styles['risk-tag-separator']}>｜</span>}
                      <span className={classNames(styles['risk-tag-value'], styles[`risk-tag-value-${entry.field}`])}>
                        {entry.value}
                      </span>
                    </React.Fragment>
                  ))}
                </span>
              ) : (
                <span className={styles['summary-metric-value']}>{riskCountFallback}</span>
              )}
            </div>
          </div>
          <AITaskExecutionDetailsCard
            title={t('AITaskExecutionDetails.taskGoal')}
            content={selectedTaskGoal}
            className={styles['summary-info-card']}
          />
          <AITaskExecutionDetailsCard
            title={t('AITaskExecutionDetails.intentAwareness')}
            content={perception?.summary}
            className={styles['summary-info-card']}
          />
        </div>
        <div className={styles['task-statistics']}>
          <div className={styles['stats-header']}>
            <div className={styles['stats-header-left']}>
              <span className={styles['title']}>{t('AITaskExecutionDetails.taskStatistics')}</span>
              <YakitSegmented
                size="small"
                value={todoViewMode}
                onChange={(v) => setTodoViewMode(v as TodoViewMode)}
                options={[
                  {
                    label: (
                      <span className={styles['todo-view-option']}>
                        <ViewBoardsOutlined size={16} color="currentColor" />
                        {t('AITaskExecutionDetails.board')}
                      </span>
                    ),
                    value: 'board',
                  },
                  {
                    label: (
                      <span className={styles['todo-view-option']}>
                        <SquareGanttChartOutlined size={16} color="currentColor" />
                        {t('AITaskExecutionDetails.progress')}
                      </span>
                    ),
                    value: 'gantt',
                  },
                ]}
              />
            </div>
            {!!total && todoListCardData && <AIToDoListDetail todoData={todoListCardData} />}
          </div>
          {total ? (
            <>
              <AITaskStatisticsStatus
                list={todoData.progressNumber}
                hiddenKeys={hiddenStatusKeys}
                onToggle={toggleStatusFilter}
              />
              {todoViewMode === 'board' ? (
                <AITaskBoard columns={todoData.boardColumns} />
              ) : (
                <AITaskGantt
                  items={todoData.visibleItems}
                  hiddenLegendKinds={hiddenLegendKinds}
                  onLegendToggle={(kind) => {
                    const key = GANTT_LEGEND_TO_FILTER_KEY[kind]
                    if (key) toggleStatusFilter(key)
                  }}
                />
              )}
            </>
          ) : (
            <div className={styles['empty-body']}>
              <YakitEmpty
                styles={{ image: { width: 160, height: 140 } }}
                title={t('AITaskExecutionDetails.emptyTodoTitle')}
                description={t('AITaskExecutionDetails.emptyTodoDesc')}
              />
            </div>
          )}
        </div>
        {showBackgroundProcesses && (
          <div className={styles['section']}>
            <AIBrowserProcesses list={planItemDetailsData?.backgroundProcesses || []} />
          </div>
        )}
        {/* 技能、工具、插件三列 */}
        {showSkill || showTool || showPlugin || showMCP ? (
          <div className={styles['section']}>
            {showSkill && (
              <div className={styles['section-card']}>
                <div className={styles['section-card-title']}>{t('AITaskExecutionDetails.skill')}</div>
                <AITaskSkillList skills={planItemDetailsData?.skills} taskId={selectedTaskId} />
              </div>
            )}
            {showTool && (
              <AITaskDetailsCardList
                key="tool"
                type="tool"
                colTitle={t('AITaskExecutionDetails.tool')}
                taskId={selectedTaskId}
                fixedList={planItemDetailsData?.tool.fixed || []}
                dynamicList={planItemDetailsData?.tool.dynamic || []}
              />
            )}
            {showPlugin && (
              <AITaskDetailsCardList
                key="yak_plugin"
                type="yak_plugin"
                colTitle={t('AITaskExecutionDetails.plugin')}
                taskId={selectedTaskId}
                fixedList={planItemDetailsData?.plugins.fixed || []}
                dynamicList={planItemDetailsData?.plugins.dynamic || []}
              />
            )}
            {showMCP && (
              <AITaskDetailsCardList
                key="mcp"
                type="mcp"
                colTitle={t('AITaskExecutionDetails.mcp')}
                taskId={selectedTaskId}
                fixedList={planItemDetailsData?.mcp.fixed || []}
                dynamicList={planItemDetailsData?.mcp.dynamic || []}
              />
            )}
          </div>
        ) : null}
      </div>
    </div>
  )
})

const AIBrowserProcesses: React.FC<AIBrowserProcessesProps> = React.memo((props) => {
  const { list } = props
  const { t } = useI18nNamespaces(['aiAgent'])

  const sessionId = useCurrentSessionId()
  const { onSend } = useAIAgentDispatcher()

  const onRemove = useMemoizedFn((processes: AIBrowserProcessesProps['list'][number]) => {
    const info: AIInputEvent = {
      IsSyncMessage: true,
      SyncType: AIInputEventSyncTypeEnum.SYNC_CLOSE_BROWSER,
      SyncID: randomString(8),
      SyncJsonInput: JSON.stringify({
        process_id: processes.process_id,
      }),
    }
    onSend({ token: sessionId, type: '', params: info })
  })
  return (
    <div className={classNames(styles['browser-processes'])}>
      <div className={styles['browser-processes-title']}>{t('AITaskExecutionDetails.browserProcessManage')}</div>
      <AITaskExecutionList<AIBrowserProcessesProps['list'][number]>
        classNameList={styles['browser-processes-list']}
        list={list}
        renderItem={(processes) => (
          <AITaskActionItem
            key={processes.process_id}
            title={processes.process_name}
            titleExtra={
              <YakitPopconfirm title={t('AITaskExecutionDetails.confirmClose')} onConfirm={() => onRemove(processes)}>
                <YakitButton isHover icon={<TrashOutlined color="currentColor" />} type="secondary2" colors="danger" />
              </YakitPopconfirm>
            }
          />
        )}
      />
    </div>
  )
})

const AITaskDetailsAddPopover: React.FC<AITaskDetailsAddPopoverProps> = React.memo((props) => {
  const { title, type, onClose, taskId } = props
  const { t } = useI18nNamespaces(['aiAgent', 'yakitUi'])

  const sessionId = useCurrentSessionId()
  const { onSend } = useAIAgentDispatcher()

  const [keyword, setKeyword] = useState<string>()
  const [loading, setLoading] = useState<boolean>(false)
  const [hasMore, setHasMore] = useState<boolean>(false)
  const [spinning, setSpinning] = useState<boolean>(false)
  const [isRef, setIsRef] = useState<boolean>(false)
  const [response, setResponse] = useState<AITaskDetailsAddPopoverResponse>({
    Pagination: { ...genDefaultPagination(20) },
    data: [],
    total: 0,
  })
  const { selected, allSelected, isSelected, toggle, toggleAll, unSelectAll, partiallySelected } = useSelections(
    response.data,
  )
  useEffect(() => {
    getList()
  }, [])

  const getList = useMemoizedFn((page?: number) => {
    switch (type) {
      case 'forge':
        getForge(page)
        break
      case 'tool':
        getTool(page)
        break
      case 'yak_plugin':
        getYakPlugin(page)
        break
      case 'mcp':
        getMCPServices(page)
        break
      default:
        break
    }
  })

  /**
   * 基础查询方法：接收目标页码、请求函数和数据映射函数
   */
  const getListBase = useMemoizedFn(
    async <T,>(
      page: number | undefined,
      fetcher: (targetPage: number, kw?: string) => Promise<{ data: T[]; total: number; pagination: PaginationSchema }>,
      mapper: (item: T) => AITaskDetailsAddListItem,
    ) => {
      const targetPage = page || 1
      if (targetPage === 1) {
        setSpinning(true)
        unSelectAll()
      }
      try {
        const res = await fetcher(targetPage, keyword)
        const rawData = res.data || []
        const newData = rawData.map(mapper)
        const newPage = +(res.pagination?.Page || targetPage)

        const currentDataLength = newPage === 1 ? newData.length : newData.length + response.data.length
        setHasMore(currentDataLength < +res.total)

        setResponse((prev) => {
          return {
            data: newPage === 1 ? newData : [...prev.data, ...newData],
            Pagination: res.pagination || prev.Pagination,
            total: +res.total,
          }
        })

        if (newPage === 1) {
          setIsRef(!isRef)
        }
      } catch (error) {
      } finally {
        setTimeout(() => {
          setLoading(false)
          setSpinning(false)
        }, 300)
      }
    },
  )

  const getForge = useMemoizedFn(async (page?: number) => {
    getListBase(
      page,
      async (p, kw) => {
        const request: QueryAIForgeRequest = {
          Pagination: {
            ...response.Pagination,
            Page: p,
          },
        }
        if (kw) {
          request.Filter = { Keyword: kw }
        }
        const res = await grpcQueryAIForge(request)
        return {
          data: res.Data || [],
          total: res.Total,
          pagination: res.Pagination,
        }
      },
      (item: AIForge) => ({
        label: item.ForgeVerboseName || item.ForgeName,
        type: item.ForgeType === 'skillmd' ? 'skill' : 'forge',
        value: item.ForgeName,
      }),
    )
  })

  const getTool = useMemoizedFn((page?: number) => {
    getListBase(
      page,
      async (p, kw) => {
        const newQuery: GetAIToolListRequest = {
          Query: '',
          ToolName: '',
          Pagination: {
            ...response.Pagination,
            Page: p,
          },
          OnlyFavorites: false,
        }
        if (kw) {
          newQuery.Query = kw
        }
        const res = await grpcGetAIToolList(newQuery)
        return {
          data: res.Tools || [],
          total: res.Total,
          pagination: res.Pagination,
        }
      },
      (item: AITool) => ({
        label: item.VerboseName || item.Name,
        type: 'tool',
        value: item.Name,
      }),
    )
  })

  const getYakPlugin = useMemoizedFn((page?: number) => {
    getListBase(
      page,
      async (p, kw) => {
        const query: QueryYakScriptRequest = {
          Pagination: {
            ...response.Pagination,
            Page: p,
          },
          EnableForAI: true,
        }
        if (kw) {
          query.FieldKeywords = kw
        }
        const res = await apiQueryYakScript(query)
        return {
          data: res.Data || [],
          total: res.Total,
          pagination: res.Pagination,
        }
      },
      (item: YakScript) => ({
        label: item.ScriptName,
        type: 'plugin',
        value: item.ScriptName,
      }),
    )
  })

  const getMCPServices = useMemoizedFn((page?: number) => {
    getListBase(
      page,
      async (p, kw) => {
        const query: GetAllMCPServersRequest = {
          Keyword: '',
          Pagination: {
            ...genDefaultPagination(20),
            OrderBy: 'created_at',
            Page: page || 1,
            Limit: -1,
          },
          IsShowToolList: true,
        }
        if (kw) {
          query.Keyword = kw
        }
        const res = await grpcGetAllMCPServers(query)
        const mcpTools: MCPServerTool[] = res.MCPServers?.flatMap((server) => server.Tools || []) || []
        return {
          data: mcpTools,
          total: res.Total,
          pagination: res.Pagination,
        }
      },
      (item: MCPServerTool) => ({
        label: item.Name,
        type: 'mcp_tool',
        value: item.Name,
      }),
    )
  })

  const onSearch = useMemoizedFn((value: string) => {
    setKeyword(value)
    setTimeout(() => {
      getList()
    }, 200)
  })
  const onPressEnter = useMemoizedFn((e) => {
    onSearch(e.target.value)
  })
  const loadMoreData = useMemoizedFn(() => getList(+response.Pagination.Page + 1))

  const onSave = useMemoizedFn(() => {
    const enabledCapabilities: AIStartParams['EnabledCapabilities'] = selected.map((item) => {
      return {
        Name: item.value,
        Type: item.type,
      }
    })
    const info: AIInputEvent = {
      IsConfigHotpatch: true,
      HotpatchType: AIInputEventHotPatchTypeEnum.HotPatchType_EnabledCapabilities,
      Params: {
        EnabledCapabilities: enabledCapabilities,
      },
      TaskId: taskId,
    }
    onSend({ token: sessionId, type: '', params: info })
    setTimeout(() => {
      const info: AIInputEvent = {
        IsSyncMessage: true,
        SyncType: AIInputEventSyncTypeEnum.SYNC_CAPABILITY_INVENTORY,
        SyncID: randomString(8),
      }
      onSend({ token: sessionId, type: '', params: info })
    }, 1000)
    onClose()
  })
  return (
    <div className={styles['ai-add-popover']}>
      <div className={styles['ai-add-popover-content']}>
        <div className={styles['ai-add-popover-title']}>
          {title}
          <YakitInput.Search
            placeholder={t('YakitInput.searchKeyWordPlaceholder')}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onSearch={onSearch}
            onPressEnter={onPressEnter}
            wrapperStyle={{ marginTop: 4 }}
          />
        </div>
        <div className={styles['list-body']}>
          <YakitSpin spinning={spinning}>
            {response.data.length > 0 ? (
              <RollingLoadList<AITaskDetailsAddListItem>
                data={response.data}
                renderRow={(rowData: AITaskDetailsAddListItem, index: number) => {
                  return (
                    <React.Fragment key={rowData.value}>
                      <YakitCheckbox checked={isSelected(rowData)} onChange={(e) => toggle(rowData)} />
                      <div className={styles['title']}>
                        <div className={styles['label']}>{rowData.label}</div>
                        {rowData.type === 'skill' && (
                          <YakitTag color="info" size="small">
                            skill
                          </YakitTag>
                        )}
                      </div>
                    </React.Fragment>
                  )
                }}
                classNameRow={styles['ai-add-list-item']}
                classNameList={styles['ai-add-list']}
                defItemHeight={28}
                rowKey="value"
                loadMoreData={loadMoreData}
                page={+response.Pagination.Page}
                hasMore={hasMore}
                loading={loading}
                isRef={isRef}
              />
            ) : (
              <YakitEmpty style={{ marginTop: 24 }} />
            )}
          </YakitSpin>
        </div>
      </div>
      <div className={styles['footer']}>
        <div className={styles['footer-left']}>
          <div className={styles['select-all']}>
            <YakitCheckbox checked={allSelected} onChange={() => toggleAll()} indeterminate={partiallySelected} />
            <span>{t('YakitCheckbox.selectAll')}</span>
          </div>
          <TableTotalAndSelectNumber total={response.total} selectNum={selected.length} />
        </div>
        <div className={styles['footer-right']}>
          <YakitButton onClick={onClose} type="outline1">
            {t('YakitButton.cancel')}
          </YakitButton>
          <YakitButton type="primary" onClick={onSave}>
            {t('YakitButton.ok')}
          </YakitButton>
        </div>
      </div>
    </div>
  )
})

const getType = (value: string) => {
  let type = value
  switch (value) {
    case 'yak_plugin':
      type = 'plugin'
      break

    default:
      break
  }
  return type
}
const AITaskDetailsCardList: React.FC<AITaskDetailsCardListProps> = React.memo((props) => {
  const { type, colTitle, fixedList, dynamicList, taskId } = props
  const { t, i18nRefresh } = useI18nNamespaces(['aiAgent', 'yakitUi'])

  const sessionId = useCurrentSessionId()
  const { onSend } = useAIAgentDispatcher()

  const [configType, setConfigType] = useState<'fixed' | 'dynamic'>('fixed')

  const typeOptions = useCreation(
    () => [
      { label: t('AITaskExecutionDetails.fixedLoad'), value: 'fixed' },
      { label: t('AITaskExecutionDetails.dynamicLoad'), value: 'dynamic' },
    ],
    [i18nRefresh],
  )

  const [visible, setVisible] = useState<boolean>(false)
  const onRemove = useMemoizedFn((dynamicItem) => {
    const info: AIInputEvent = {
      IsConfigHotpatch: true,
      HotpatchType: AIInputEventHotPatchTypeEnum.HotPatchType_DisabledCapabilities,
      Params: {
        EnabledCapabilities: dynamicList
          .filter((ele) => isEqual(ele, dynamicItem))
          .map((item) => ({
            Name: item.name,
            Type: getType(item.category),
          })),
      },
      TaskId: taskId,
    }
    onSend({ token: sessionId, type: '', params: info })
    setTimeout(() => {
      const info: AIInputEvent = {
        IsSyncMessage: true,
        SyncType: AIInputEventSyncTypeEnum.SYNC_CAPABILITY_INVENTORY,
        SyncID: randomString(8),
      }
      onSend({ token: sessionId, type: '', params: info })
    }, 1000)
  })
  const renderHeader = useMemoizedFn(() => {
    return (
      <>
        <div className={styles['plugin-group-title']}>
          <YakitRadioButtons
            buttonStyle="solid"
            value={configType}
            onChange={(e) => setConfigType(e.target.value)}
            options={typeOptions}
            // size="small"
          />
          <YakitTag border={false} fullRadius size="small">
            {configType === 'dynamic' ? dynamicList.length : fixedList.length}
          </YakitTag>
        </div>
        {configType === 'dynamic' && (
          <YakitPopover
            content={
              <AITaskDetailsAddPopover
                type={type}
                title={t('AITaskExecutionDetails.addWithTitle', { title: colTitle })}
                taskId={taskId}
                onClose={() => setVisible(false)}
              />
            }
            trigger="click"
            placement="top"
            destroyOnHidden
            open={visible}
            onOpenChange={setVisible}
            classNames={{ root: styles['add-popover'] }}
          >
            <YakitButton type="text" className={styles['add-btn']}>
              {t('YakitButton.add')}
            </YakitButton>
          </YakitPopover>
        )}
      </>
    )
  })
  return (
    <div className={styles['section-card']}>
      <div className={styles['section-card-title']}>{colTitle}</div>
      {configType === 'dynamic' ? (
        <AITaskExecutionList<AITaskDetailsCardListProps['dynamicList'][number]>
          list={dynamicList}
          header={renderHeader()}
          renderItem={(dynamicItem, index) => (
            <AITaskActionItem
              key={dynamicItem.name}
              title={dynamicItem.name}
              description={dynamicItem.description}
              category={dynamicItem.category}
              titleExtra={
                <YakitPopconfirm
                  title={t('AITaskExecutionDetails.confirmDelete')}
                  onConfirm={() => onRemove(dynamicItem)}
                >
                  <YakitButton
                    isHover
                    icon={<TrashOutlined color="currentColor" />}
                    type="secondary2"
                    colors="danger"
                  />
                </YakitPopconfirm>
              }
            />
          )}
        />
      ) : (
        <AITaskExecutionList<AITaskDetailsCardListProps['fixedList'][number]>
          list={fixedList}
          header={renderHeader()}
          renderItem={(fixedItem, index) => (
            <AITaskActionItem
              key={fixedItem.verbose_name + fixedItem.name}
              title={fixedItem.verbose_name || fixedItem.name}
              category={fixedItem.category}
              description={fixedItem.description}
            />
          )}
        />
      )}
    </div>
  )
})

const AITaskExecutionDetailsCard: React.FC<AITaskExecutionDetailsCardProps> = React.memo((props) => {
  const { title, content, className } = props
  const { t } = useI18nNamespaces(['aiAgent'])
  return (
    <div className={classNames(styles['card'], className)}>
      <div className={styles['card-title']}>{title}</div>
      <div className={styles['card-content']}>
        {content ? content : <span className={styles['empty-text']}>{t('AITaskExecutionDetails.noInfo')}</span>}
      </div>
    </div>
  )
})

const AITaskStatisticsStatus: React.FC<AITaskStatisticsStatusProps> = React.memo((props) => {
  const { list, hiddenKeys = [], onToggle } = props
  const hiddenSet = useCreation(() => new Set(hiddenKeys), [hiddenKeys])
  const allHidden = useCreation(() => TODO_STATUS_FILTER_KEYS.every((key) => hiddenSet.has(key)), [hiddenSet])
  return (
    <div className={styles['stats-overview']}>
      {list.map((item) => {
        const filterable = !!onToggle
        // 已创建：全隐藏时灰显；单项：自身在 hiddenKeys 中时灰显
        const hidden = item.key === 'created' ? allHidden : hiddenSet.has(item.key)
        return (
          <div
            key={item.key}
            className={classNames(styles['stat-item'], {
              [styles['stat-main']]: item.color === 'main',
              [styles['stat-green']]: item.color === 'green',
              [styles['stat-red']]: item.color === 'red',
              [styles['stat-item-clickable']]: filterable,
              [styles['stat-item-hidden']]: hidden,
            })}
            onClick={filterable ? () => onToggle?.(item.key) : undefined}
            role={filterable ? 'button' : undefined}
            tabIndex={filterable ? 0 : undefined}
            onKeyDown={
              filterable
                ? (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      onToggle?.(item.key)
                    }
                  }
                : undefined
            }
          >
            <span className={styles['stat-count']}>{item.footerLeft}</span>
            <span className={styles['stat-label']}>{item.title}</span>
          </div>
        )
      })}
    </div>
  )
})
