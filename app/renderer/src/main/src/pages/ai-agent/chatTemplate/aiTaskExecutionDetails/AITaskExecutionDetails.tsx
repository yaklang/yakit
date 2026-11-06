import { TaskSkillList } from './TaskSkillList'
import React, { useEffect, useRef, useState } from 'react'
import classNames from 'classnames'
import type {
  AIBrowserProcessesProps,
  AITaskDetailsAddListItem,
  AITaskDetailsAddPopoverProps,
  AITaskDetailsAddPopoverResponse,
  AITaskDetailsCardListProps,
  AITaskExecutionDetailsCardProps,
  AITaskExecutionDetailsProps,
  AITaskStatisticsStatusProps,
} from './type'
import { OutlinePresentationchartbarIcon, OutlineTrashIcon, OutlineXIcon } from '@/assets/icon/outline'
import styles from './AITaskExecutionDetails.module.scss'
import { YakitTag } from '@/components/yakitUI/YakitTag/YakitTag'
import { AIDeleteNodeIcon, AIDoingNodeIcon, AIDoneNodeIcon, AIPendingNodeIcon, AISkippedNodeIcon } from './icon'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitPopconfirm } from '@/components/yakitUI/YakitPopconfirm/YakitPopconfirm'
import { AIToDoListItem } from '@/pages/ai-re-act/aiReActChat/aiToDoList/AIToDoList'
import { useCreation, useInterval, useMemoizedFn, useSelections } from 'ahooks'
import type {
  ForgesAndSkillsDynamicItem,
  PlanItemDetailsData,
  TodoListCardData,
} from '@/pages/ai-re-act/hooks/aiRender'
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
  type AIAgentGrpcApi,
  type AIInputEvent,
  AIInputEventHotPatchTypeEnum,
  AIInputEventSyncTypeEnum,
  type AIStartParams,
} from '@/pages/ai-re-act/hooks/grpcApi'
import { apiQueryYakScript } from '@/pages/plugins/utils'
import { grpcGetAllMCPServers } from '../../aiMCP/utils'
import type { GetAllMCPServersRequest, MCPServerTool } from '../../type/aiMCP'
import {
  HorizontalScrollCardItemInfoMultiple,
  HorizontalScrollCardItemInfoSingle,
} from '@/pages/plugins/operator/horizontalScrollCard/HorizontalScrollCard'
import { YakitRadioButtons } from '@/components/yakitUI/YakitRadioButtons/YakitRadioButtons'
import { timeDiffWithMoment } from '@/utils/timeUtil'
import { AITaskActionItem, AITaskExecutionList } from './aiTaskExecutionList/AITaskExecutionList'
import { AIToDoListDetail } from '@/pages/ai-re-act/aiReActChat/aiToDoList/AIToDoListDetail'
import { useCurrentRawData, useCurrentStore } from '@/pages/ai-re-act/hooks/useCurrentDataBySession'
import { useStore } from 'zustand'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { AITaskStatisticsStatus } from './aiTaskStatisticsStatus/AITaskStatisticsStatus'
import {
  TODO_STATUS_FILTER_KEYS,
  FILTER_KEY_TO_GANTT_LEGEND,
  GANTT_LEGEND_TO_FILTER_KEY,
  getTaskTodoPresentation,
  reorderFilterKeys,
  type TodoStatusFilterKey,
} from './taskStatusUtils'
import { AITaskGantt } from './aiTaskGantt/AITaskGantt'
import { AITaskSelectDropdown } from './aiTaskSelectDropdown/AITaskSelectDropdown'
import { AITaskBoardView } from './aiTaskBoard/AITaskBoardView'
import useCurrentSessionId from '@/pages/ai-re-act/hooks/useCurrentSessionId'
import useAIAgentDispatcher from '../../useContext/useDispatcher'
import { randomString } from '@/utils/randomUtil'

export const AITaskExecutionDetails: React.FC<AITaskExecutionDetailsProps> = React.memo((props) => {
  const sessionId = useCurrentSessionId()
  return <TaskExecutionDetailsContent key={`${sessionId}:${props.taskId}`} {...props} />
})

const TaskExecutionDetailsContent: React.FC<AITaskExecutionDetailsProps> = (props) => {
  const { taskId: initialTaskId, taskGoal, taskName, onClose } = props
  const [taskId, setTaskId] = useState(initialTaskId)
  const rawData = useCurrentRawData()
  const { t, i18nRefresh } = useI18nNamespaces(['aiAgent'])
  const sessionId = useCurrentSessionId()
  const store = useCurrentStore()
  const todoListUpdate = useStore(store, (state) => state.chatTodoListUpdate)
  const taskDetailsUpdate = useStore(store, (state) => state.taskDetailsUpdate)
  const [hiddenStatusKeys, setHiddenStatusKeys] = useState<TodoStatusFilterKey[]>([])
  const [statusOrder, setStatusOrder] = useState<TodoStatusFilterKey[]>(() => [...TODO_STATUS_FILTER_KEYS])
  const [todoView, setTodoView] = useState<'list' | 'board' | 'gantt'>('list')

  const [detailSnapshot, setDetailSnapshot] = useState<{ taskId: string; data: PlanItemDetailsData }>()
  const planItemDetailsData = detailSnapshot?.taskId === taskId ? detailSnapshot.data : undefined
  const perPlanItemDetailsDataUUIdRef = useRef<string>('')
  useEffect(() => {
    onReset()
    setTodoView('list')
    setHiddenStatusKeys([])
    setStatusOrder([...TODO_STATUS_FILTER_KEYS])
    getData()
  }, [taskId, sessionId, rawData])
  useEffect(() => {
    getData()
  }, [todoListUpdate, taskDetailsUpdate])
  useInterval(() => {
    getData()
  }, 5 * 1000)
  const onReset = useMemoizedFn(() => {
    setDetailSnapshot(undefined)
    perPlanItemDetailsDataUUIdRef.current = ''
  })
  const getData = useMemoizedFn(() => {
    if (!taskId) return
    const itemData = rawData.taskDetailsMap.get(taskId)
    if (!itemData) {
      if (perPlanItemDetailsDataUUIdRef.current) onReset()
      return
    }
    if (perPlanItemDetailsDataUUIdRef.current === itemData.uuid) return
    perPlanItemDetailsDataUUIdRef.current = itemData.uuid
    setDetailSnapshot({ taskId, data: cloneDeep(itemData) })
  })
  const perception = useCreation(() => {
    if (!planItemDetailsData) return
    return planItemDetailsData.perception
  }, [planItemDetailsData?.perception])

  const total = useCreation(
    () => planItemDetailsData?.todoList?.items?.length || 0,
    [planItemDetailsData?.todoList?.items?.length],
  )
  const todoListCardData = useCreation(() => planItemDetailsData?.todoList, [planItemDetailsData?.todoList])

  const toggleStatusFilter = useMemoizedFn((key: string) => {
    if (key === 'created') {
      setHiddenStatusKeys((prev) =>
        TODO_STATUS_FILTER_KEYS.every((status) => prev.includes(status)) ? [] : [...TODO_STATUS_FILTER_KEYS],
      )
    } else if (TODO_STATUS_FILTER_KEYS.includes(key as TodoStatusFilterKey)) {
      const status = key as TodoStatusFilterKey
      setHiddenStatusKeys((prev) =>
        prev.includes(status) ? prev.filter((value) => value !== status) : [...prev, status],
      )
    }
  })
  const onStatReorder = useMemoizedFn((fromKey: string, toKey: string) => {
    setStatusOrder((prev) => reorderFilterKeys(prev, fromKey, toKey))
  })
  const hiddenLegendKinds = useCreation(
    () => hiddenStatusKeys.map((key) => FILTER_KEY_TO_GANTT_LEGEND[key]),
    [hiddenStatusKeys],
  )
  const legendKindOrder = useCreation(() => statusOrder.map((key) => FILTER_KEY_TO_GANTT_LEGEND[key]), [statusOrder])
  const todoData = useCreation(() => {
    const data = getTaskTodoPresentation(planItemDetailsData?.todoList?.items || [], hiddenStatusKeys, statusOrder)
    const metadata: Record<string, Omit<AITaskStatisticsStatusProps['list'][number], 'footerLeft'>> = {
      created: { key: 'created', color: 'neutral-with-border', title: t('AITaskStatusControls.created') },
      pending: {
        key: 'pending',
        color: 'neutral-with-border',
        title: t('AITaskExecutionDetails.statusPending'),
        footerRight: <AIPendingNodeIcon />,
      },
      doing: {
        key: 'doing',
        color: 'main',
        title: t('AITaskExecutionDetails.statusDoing'),
        footerRight: <AIDoingNodeIcon />,
      },
      done: {
        key: 'done',
        color: 'green',
        title: t('AITaskExecutionDetails.statusDone'),
        footerRight: <AIDoneNodeIcon />,
      },
      skipped: {
        key: 'skipped',
        color: 'neutral',
        title: t('AITaskExecutionDetails.statusSkipped'),
        footerRight: <AISkippedNodeIcon />,
      },
      deleted: {
        key: 'deleted',
        color: 'red',
        title: t('AITaskExecutionDetails.statusDeleted'),
        footerRight: <AIDeleteNodeIcon />,
      },
    }
    return {
      ...data,
      progressNumber: ['created', ...statusOrder].map((key) => ({ ...metadata[key], footerLeft: data.counts[key] })),
    }
  }, [planItemDetailsData?.todoList?.items, hiddenStatusKeys, statusOrder, i18nRefresh])

  const forgeFixedList = useCreation(() => {
    const forgeFixed: AIAgentGrpcApi.PlanItemDetailsFixedItem[] = planItemDetailsData?.forges.fixed || []
    return forgeFixed
  }, [planItemDetailsData?.forges, planItemDetailsData?.skills])
  const forgeDynamicList = useCreation(() => {
    const forge: ForgesAndSkillsDynamicItem[] =
      planItemDetailsData?.forges?.dynamic.map((ele) => ({
        name: ele.name,
        description: ele.description,
        category: ele.category,
        skill_load_state: '',
      })) || []
    const forgeDynamic: ForgesAndSkillsDynamicItem[] = forge
    return forgeDynamic
  }, [planItemDetailsData?.forges, planItemDetailsData?.skills])

  const toolCall = useCreation(() => {
    if (!planItemDetailsData?.execution)
      return ['成功', '失败次数', '总次数'].map((item) => ({ Id: item, Data: '暂无', Timestamp: 0 }))
    return [
      {
        Data: `${planItemDetailsData?.execution?.tool_call_success ?? `0`}`,
        Id: '成功',
        Timestamp: 0,
      },
      {
        Data: `${planItemDetailsData?.execution?.tool_call_failed ?? `0`}`,
        Id: '失败次数',
        Timestamp: 0,
      },
      {
        Data: `${planItemDetailsData?.execution?.tool_call_total ?? `0`}`,
        Id: '总次数',
        Timestamp: 0,
      },
    ]
  }, [
    planItemDetailsData?.execution?.tool_call_success,
    planItemDetailsData?.execution?.tool_call_failed,
    planItemDetailsData?.execution?.tool_call_total,
  ])
  const executionMinutes = useCreation(() => {
    const startedAt = planItemDetailsData?.execution?.started_at || 0
    const endedAt = planItemDetailsData?.execution?.ended_at || 0
    if (!startedAt) return '暂无'
    if (startedAt && !endedAt) return '执行中'

    return timeDiffWithMoment(startedAt, endedAt)
  }, [
    planItemDetailsData?.execution?.status,
    planItemDetailsData?.execution?.started_at,
    planItemDetailsData?.execution?.ended_at,
  ])
  const httpFlowCount = useCreation(() => {
    if (!planItemDetailsData?.execution) return '暂无'
    return `${planItemDetailsData?.execution.http_flow_count ?? `0`}`
  }, [planItemDetailsData?.execution?.http_flow_count])
  const riskCount = useCreation(() => {
    if (!planItemDetailsData?.execution) return '暂无'
    return `${planItemDetailsData?.execution.risk_count ?? `0`}`
  }, [planItemDetailsData?.execution?.risk_count])

  const showForge = useCreation(() => {
    if (!planItemDetailsData) return false
    return forgeFixedList.length > 0 || forgeDynamicList.length > 0
  }, [forgeFixedList.length, forgeDynamicList.length])
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
            <OutlinePresentationchartbarIcon className={styles['header-icon']} />
            <span className={styles['title-text']}>任务执行详情</span>
            <AITaskSelectDropdown
              taskId={initialTaskId}
              taskName={taskName}
              value={taskId}
              onChange={setTaskId}
              taskDataUuid={planItemDetailsData?.uuid}
            />
          </div>
          {onClose && <YakitButton icon={<OutlineXIcon />} type="text2" onClick={onClose} />}
        </div>
      </div>

      <div className={styles['content-body']}>
        <div className={styles['summary-section']}>
          <HorizontalScrollCardItemInfoMultiple info={toolCall} tag={'工具调用'} />
          <HorizontalScrollCardItemInfoSingle
            item={{ Id: '执行时长', Data: executionMinutes, Timestamp: 0 }}
            tag="执行时长"
            compact={false}
          />

          <HorizontalScrollCardItemInfoSingle
            item={{ Id: '产生流量数', Data: httpFlowCount, Timestamp: 0 }}
            tag="产生流量数"
            compact={false}
          />

          <HorizontalScrollCardItemInfoSingle
            item={{ Id: '漏洞数', Data: riskCount, Timestamp: 0 }}
            tag="漏洞数"
            compact={false}
          />
        </div>
        {/* 左侧目标与意图 + 右侧统计 */}
        <div className={styles['top-section']}>
          <div className={styles['top-left']}>
            <AITaskExecutionDetailsCard title="任务目标" content={taskId === initialTaskId ? taskGoal : undefined} />
            <AITaskExecutionDetailsCard title="意图感知" content={perception?.summary} />
          </div>
          <div className={styles['task-statistics']}>
            <div className={styles['stats-header']}>
              <span className={styles['title']}>待办任务</span>
              {!!total && (
                <YakitRadioButtons
                  size="small"
                  value={todoView}
                  options={[
                    { value: 'list', label: t('AITaskBoard.list') },
                    { value: 'board', label: t('AITaskBoard.board') },
                    { value: 'gantt', label: t('AITaskGantt.title') },
                  ]}
                  onChange={(event) => setTodoView(event.target.value)}
                />
              )}
              {!!total && todoListCardData && <AIToDoListDetail todoData={todoListCardData} />}
            </div>
            {total ? (
              <>
                {/* 状态统计区块 */}
                <AITaskStatisticsStatus
                  key={taskId}
                  list={todoData.progressNumber}
                  hiddenKeys={hiddenStatusKeys}
                  onToggle={toggleStatusFilter}
                  onReorder={onStatReorder}
                />
                {!todoData.visibleItems.length && (
                  <div role="status" className={styles['filter-empty']}>
                    {t('AITaskStatusControls.noVisibleTasks')}
                  </div>
                )}
                {todoView === 'gantt' ? (
                  <AITaskGantt
                    key={taskId}
                    items={todoData.visibleItems}
                    hiddenLegendKinds={hiddenLegendKinds}
                    legendKindOrder={legendKindOrder}
                    onLegendToggle={(kind) => toggleStatusFilter(GANTT_LEGEND_TO_FILTER_KEY[kind])}
                  />
                ) : todoView === 'board' ? (
                  <AITaskBoardView items={todoData.visibleItems} statusOrder={statusOrder} />
                ) : (
                  <div className={styles['stats-content']}>
                    {/* 待办列表区块 */}
                    <div className={styles['todo-list-wrapper']}>
                      <div className={styles['todo-list-header']}>
                        <span className={styles['todo-title']}>待办</span>
                        <YakitTag border={false} fullRadius size="small">
                          {todoData.unFinish.length}
                        </YakitTag>
                      </div>
                      <div className={styles['todo-list']}>
                        {todoData.unFinish.map((item, index) => (
                          <AIToDoListItem key={index} item={item} />
                        ))}
                      </div>
                    </div>
                    {/* 已结束 */}
                    <div className={styles['todo-list-wrapper']}>
                      <div className={styles['todo-list-header']}>
                        <span className={styles['todo-title']}>已结束</span>
                        <YakitTag border={false} fullRadius size="small">
                          {todoData.finished.length}
                        </YakitTag>
                      </div>
                      <div className={styles['todo-list']}>
                        {todoData.finished.map((item, index) => (
                          <AIToDoListItem key={index} item={item} />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className={styles['empty-body']}>
                <YakitEmpty
                  imageStyle={{ width: 160, height: 140 }}
                  title="暂无待办任务"
                  description="当前任务暂未生成待办任务，请稍后查看"
                />
              </div>
            )}
          </div>
        </div>
        {showBackgroundProcesses && (
          <div className={styles['section']}>
            <AIBrowserProcesses list={planItemDetailsData?.backgroundProcesses || []} />
          </div>
        )}
        <TaskSkillList skills={planItemDetailsData?.skills} taskId={taskId} />
        {/* Forge、工具、插件 */}
        {showForge || showTool || showPlugin || showMCP ? (
          <div className={styles['section']}>
            {showForge && (
              <AITaskDetailsCardList
                key={`${taskId}-forge`}
                type="forge"
                colTitle={t('Parity.forge')}
                taskId={taskId}
                fixedList={forgeFixedList}
                dynamicList={forgeDynamicList}
              />
            )}
            {showTool && (
              <AITaskDetailsCardList
                key={`${taskId}-tool`}
                type="tool"
                colTitle={'工具'}
                taskId={taskId}
                fixedList={planItemDetailsData?.tool.fixed || []}
                dynamicList={planItemDetailsData?.tool.dynamic || []}
              />
            )}
            {showPlugin && (
              <AITaskDetailsCardList
                key={`${taskId}-yak_plugin`}
                type="yak_plugin"
                colTitle={'插件'}
                taskId={taskId}
                fixedList={planItemDetailsData?.plugins.fixed || []}
                dynamicList={planItemDetailsData?.plugins.dynamic || []}
              />
            )}
            {showMCP && (
              <AITaskDetailsCardList
                key={`${taskId}-mcp`}
                type="mcp"
                colTitle={'MCP'}
                taskId={taskId}
                fixedList={planItemDetailsData?.mcp.fixed || []}
                dynamicList={planItemDetailsData?.mcp.dynamic || []}
              />
            )}
          </div>
        ) : null}
      </div>
    </div>
  )
}

const AIBrowserProcesses: React.FC<AIBrowserProcessesProps> = React.memo((props) => {
  const { list } = props

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
      <div className={styles['browser-processes-title']}>{'浏览器进程管理'}</div>
      <AITaskExecutionList<AIBrowserProcessesProps['list'][number]>
        classNameList={styles['browser-processes-list']}
        list={list}
        renderItem={(processes) => (
          <AITaskActionItem
            key={processes.process_id}
            title={processes.process_name}
            titleExtra={
              <YakitPopconfirm title={'确定要关闭嘛?'} onConfirm={() => onRemove(processes)}>
                <YakitButton isHover icon={<OutlineTrashIcon />} type="secondary2" colors="danger" />
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
            placeholder="请输入关键词搜索"
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
            <span>全选</span>
          </div>
          <TableTotalAndSelectNumber total={response.total} selectNum={selected.length} />
        </div>
        <div className={styles['footer-right']}>
          <YakitButton onClick={onClose} type="outline1">
            取消
          </YakitButton>
          <YakitButton type="primary" onClick={onSave}>
            确定
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
const typeOptions = [
  {
    label: '固定加载',
    value: 'fixed',
  },
  {
    label: '动态加载',
    value: 'dynamic',
  },
]
const AITaskDetailsCardList: React.FC<AITaskDetailsCardListProps> = React.memo((props) => {
  const { type, colTitle, fixedList, dynamicList, taskId } = props

  const sessionId = useCurrentSessionId()
  const { onSend } = useAIAgentDispatcher()

  const [configType, setConfigType] = useState<'fixed' | 'dynamic'>('fixed')

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
          {/* <YakitTag border={false} fullRadius size="small">
{configType === 'dynamic' ? dynamicList.length : fixedList.length}
</YakitTag> */}
        </div>
        {configType === 'dynamic' && (
          <YakitPopover
            content={
              <AITaskDetailsAddPopover
                type={type}
                title={`添加${colTitle}`}
                taskId={taskId}
                onClose={() => setVisible(false)}
              />
            }
            trigger="click"
            placement="top"
            destroyTooltipOnHide
            visible={visible}
            onVisibleChange={setVisible}
            overlayClassName={styles['add-popover']}
          >
            <YakitButton type="text" className={styles['add-btn']}>
              添加
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
                <YakitPopconfirm title={'确定删除嘛?'} onConfirm={() => onRemove(dynamicItem)}>
                  <YakitButton isHover icon={<OutlineTrashIcon />} type="secondary2" colors="danger" />
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
  return (
    <div className={classNames(styles['card'], className)}>
      <div className={styles['card-title']}>{title}</div>
      <div className={styles['card-content']}>
        {content ? content : <span className={styles['empty-text']}>暂无信息...</span>}
      </div>
    </div>
  )
})
