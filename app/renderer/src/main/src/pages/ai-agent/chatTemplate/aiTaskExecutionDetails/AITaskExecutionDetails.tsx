import React, { useEffect, useState } from 'react'
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
import {
  PresentationChartBarOutlined,
  PresentationChartLineOutlined,
  TrashOutlined,
  XOutlined,
  ViewBoardsOutlined,
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
import { AITaskBoard } from './aiTaskBoard/AITaskBoard'
import { AITaskGantt } from './aiTaskGantt/AITaskGantt'
import { AIToDoListDetail } from '@/pages/ai-re-act/aiReActChat/aiToDoList/AIToDoListDetail'
import useCurrentTaskData from '@/pages/ai-re-act/hooks/useCurrentTaskData/useCurrentTaskData'
import useCurrentSessionId from '@/pages/ai-re-act/hooks/useCurrentSessionId'
import useAIAgentDispatcher from '../../useContext/useDispatcher'
import { randomString } from '@/utils/randomUtil'
import { getSessionRiskTagEntries } from '@/pages/ai-re-act/aiRightPanel/riskLevelCount'
import { YakitSegmented } from '@/components/yakitUI/YakitSegmented/YakitSegmented'

type TodoViewMode = 'board' | 'gantt'

export const AITaskExecutionDetails: React.FC<AITaskExecutionDetailsProps> = React.memo((props) => {
  const { taskId, taskGoal, taskName, onClose } = props
  const [todoViewMode, setTodoViewMode] = useState<TodoViewMode>('board')
  const taskData = useCurrentTaskData(taskId, 5)
  // taskDetailsMap 中的数据会原地更新，使用 uuid 作为快照变更信号，避免详情组件持有可变引用。
  const planItemDetailsData = useCreation<PlanItemDetailsData | undefined>(
    () => (taskData ? cloneDeep(taskData) : undefined),
    [taskId, taskData?.uuid],
  )
  const perception = useCreation(() => {
    if (!planItemDetailsData) return
    return planItemDetailsData.perception
  }, [planItemDetailsData?.perception])

  const total = useCreation(
    () => planItemDetailsData?.todoList?.items?.length || 0,
    [planItemDetailsData?.todoList?.items?.length],
  )
  const todoListCardData = useCreation(() => planItemDetailsData?.todoList, [planItemDetailsData?.todoList])

  const todoData = useCreation(() => {
    const items = planItemDetailsData?.todoList?.items || []
    const pending: TodoListCardData['items'] = []
    const doing: TodoListCardData['items'] = []
    const done: TodoListCardData['items'] = []
    const skippedOrDeleted: TodoListCardData['items'] = []
    const progressNumber: AITaskStatisticsStatusProps['list'] = [
      {
        key: 'created',
        color: 'neutral-with-border',
        title: '已创建',
        footerLeft: items.length,
        footerRight: null,
      },
      {
        key: 'pending',
        color: 'neutral-with-border',
        title: '待处理',
        footerLeft: 0,
        footerRight: <AIPendingNodeIcon />,
      },
      { key: 'doing', color: 'main', title: '进行中', footerLeft: 0, footerRight: <AIDoingNodeIcon /> },
      { key: 'done', color: 'green', title: '已完成', footerLeft: 0, footerRight: <AIDoneNodeIcon /> },
      { key: 'skipped', color: 'neutral', title: '已跳过', footerLeft: 0, footerRight: <AISkippedNodeIcon /> },
      { key: 'deleted', color: 'red', title: '已删除', footerLeft: 0, footerRight: <AIDeleteNodeIcon /> },
    ]
    const progressByKey = Object.fromEntries(progressNumber.map((item) => [item.key, item])) as Record<
      string,
      AITaskStatisticsStatusProps['list'][number]
    >

    for (const item of items) {
      switch (item.status) {
        case 'PENDING':
          progressByKey.pending.footerLeft += 1
          pending.push(item)
          break

        case 'DOING':
          progressByKey.doing.footerLeft += 1
          doing.push(item)
          break

        case 'DONE':
          progressByKey.done.footerLeft += 1
          done.push(item)
          break

        case 'SKIPPED':
          progressByKey.skipped.footerLeft += 1
          skippedOrDeleted.push(item)
          break

        case 'DELETED':
          progressByKey.deleted.footerLeft += 1
          skippedOrDeleted.push(item)
          break
        default:
          break
      }
    }
    const boardColumns = [
      { key: 'pending', title: '待处理', icon: <AIPendingNodeIcon />, items: pending },
      { key: 'doing', title: '运行中', icon: <AIDoingNodeIcon />, items: doing },
      { key: 'done', title: '已完成', icon: <AIDoneNodeIcon />, items: done },
      {
        key: 'skippedOrDeleted',
        title: '已跳过/已删除',
        icon: (
          <>
            <AISkippedNodeIcon />
            <AIDeleteNodeIcon />
          </>
        ),
        items: skippedOrDeleted,
      },
    ]
    return { boardColumns, progressNumber }
  }, [planItemDetailsData?.todoList?.items])

  const forgeFixedList = useCreation(() => {
    const forgeFixed: AIAgentGrpcApi.PlanItemDetailsFixedItem[] =
      planItemDetailsData?.skills.fixed.concat(planItemDetailsData?.forges.fixed || []) || []
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
    const skills: ForgesAndSkillsDynamicItem[] = planItemDetailsData?.skills?.dynamic.map((ele) => ele) || []
    const forgeDynamic: ForgesAndSkillsDynamicItem[] = skills.concat(forge) || []
    return forgeDynamic
  }, [planItemDetailsData?.forges, planItemDetailsData?.skills])

  const toolCall = useCreation(() => {
    if (!planItemDetailsData?.execution)
      return ['成功', '失败', '总尝试次数'].map((item) => ({ Id: item, Data: '暂无', Timestamp: 0 }))
    return [
      {
        Data: `${planItemDetailsData?.execution?.tool_call_success ?? `0`}`,
        Id: '成功',
        Timestamp: 0,
      },
      {
        Data: `${planItemDetailsData?.execution?.tool_call_failed ?? `0`}`,
        Id: '失败',
        Timestamp: 0,
      },
      {
        Data: `${planItemDetailsData?.execution?.tool_call_total ?? `0`}`,
        Id: '总尝试次数',
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
  const riskLevelEntries = useCreation(
    () => getSessionRiskTagEntries(planItemDetailsData?.execution?.risk_level_count),
    [planItemDetailsData?.execution?.risk_level_count],
  )
  const riskCountFallback = useCreation(() => {
    if (!planItemDetailsData?.execution) return '暂无'
    return `${planItemDetailsData.execution.risk_level_count?.total ?? planItemDetailsData.execution.risk_count ?? 0}`
  }, [planItemDetailsData?.execution?.risk_count, planItemDetailsData?.execution?.risk_level_count?.total])

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
            <PresentationChartBarOutlined className={styles['header-icon']} color="currentColor" />
            <span className={styles['title-text']}>任务执行详情</span>
            <div className={styles['header-subtitle']}>{taskName}</div>
          </div>
          {onClose && <YakitButton icon={<XOutlined color="currentColor" />} type="text2" onClick={onClose} />}
        </div>
      </div>

      <div className={styles['content-body']}>
        <div className={styles['summary-section']}>
          <HorizontalScrollCardItemInfoMultiple
            info={toolCall}
            tag={'工具调用统计'}
            className={styles['summary-tool-card']}
          />
          <div className={styles['summary-metric-stack']}>
            <HorizontalScrollCardItemInfoSingle
              item={{ Id: '执行时长', Data: executionMinutes, Timestamp: 0 }}
              tag="执行时长"
              compact
              className={styles['summary-metric-lake-blue']}
            />
            <HorizontalScrollCardItemInfoSingle
              item={{ Id: '产生流量数', Data: httpFlowCount, Timestamp: 0 }}
              tag="产生流量数"
              compact
              className={styles['summary-metric-purple']}
            />
            <div className={classNames(styles['summary-metric-risk'], styles['summary-metric-magenta'])}>
              <div className={styles['summary-metric-label']}>漏洞个数</div>
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
                <div className={styles['summary-metric-data']}>{riskCountFallback}</div>
              )}
            </div>
          </div>
          <AITaskExecutionDetailsCard title="任务目标" content={taskGoal} className={styles['summary-info-card']} />
          <AITaskExecutionDetailsCard
            title="意图感知"
            content={perception?.summary}
            className={styles['summary-info-card']}
          />
        </div>
        <div className={styles['task-statistics']}>
          <div className={styles['stats-header']}>
            <div className={styles['stats-header-left']}>
              <span className={styles['title']}>任务统计</span>
              <YakitSegmented
                size="small"
                value={todoViewMode}
                onChange={(v) => setTodoViewMode(v as TodoViewMode)}
                options={[
                  {
                    label: (
                      <span className={styles['todo-view-option']}>
                        <ViewBoardsOutlined size={16} color="currentColor" />
                        看板
                      </span>
                    ),
                    value: 'board',
                  },
                  {
                    label: (
                      <span className={styles['todo-view-option']}>
                        <PresentationChartLineOutlined size={16} color="currentColor" />
                        甘特图
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
              <AITaskStatisticsStatus list={todoData.progressNumber} />
              {todoViewMode === 'board' ? (
                <AITaskBoard columns={todoData.boardColumns} />
              ) : (
                <AITaskGantt items={planItemDetailsData?.todoList?.items || []} />
              )}
            </>
          ) : (
            <div className={styles['empty-body']}>
              <YakitEmpty
                styles={{ image: { width: 160, height: 140 } }}
                title="暂无待办任务"
                description="当前任务暂未生成待办任务，请稍后查看"
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
        {showForge || showTool || showPlugin || showMCP ? (
          <div className={styles['section']}>
            {showForge && (
              <AITaskDetailsCardList
                key="forge"
                type="forge"
                colTitle="技能"
                taskId={taskId}
                fixedList={forgeFixedList}
                dynamicList={forgeDynamicList}
              />
            )}
            {showTool && (
              <AITaskDetailsCardList
                key="tool"
                type="tool"
                colTitle={'工具'}
                taskId={taskId}
                fixedList={planItemDetailsData?.tool.fixed || []}
                dynamicList={planItemDetailsData?.tool.dynamic || []}
              />
            )}
            {showPlugin && (
              <AITaskDetailsCardList
                key="yak_plugin"
                type="yak_plugin"
                colTitle={'插件'}
                taskId={taskId}
                fixedList={planItemDetailsData?.plugins.fixed || []}
                dynamicList={planItemDetailsData?.plugins.dynamic || []}
              />
            )}
            {showMCP && (
              <AITaskDetailsCardList
                key="mcp"
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
})

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
            destroyOnHidden
            open={visible}
            onOpenChange={setVisible}
            classNames={{ root: styles['add-popover'] }}
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
  return (
    <div className={classNames(styles['card'], className)}>
      <div className={styles['card-title']}>{title}</div>
      <div className={styles['card-content']}>
        {content ? content : <span className={styles['empty-text']}>暂无信息...</span>}
      </div>
    </div>
  )
})

const AITaskStatisticsStatus: React.FC<AITaskStatisticsStatusProps> = React.memo((props) => {
  const { list } = props
  return (
    <div className={styles['stats-overview']}>
      {list.map((item) => (
        <div key={item.key} className={classNames(styles['stat-box'], styles[`stat-${item.color}`])}>
          <div className={styles['stat-footer-left']}>{item.footerLeft}</div>
          <div className={styles['stat-footer']}>
            <div className={styles['stat-label']}>{item.title}</div>
            <div className={styles['stat-footer-right']}> {item.footerRight} </div>
          </div>
        </div>
      ))}
    </div>
  )
})
