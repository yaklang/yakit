import React, { useEffect, useRef, useState } from 'react'
import classNames from 'classnames'
import {
  AITaskActionItemProps,
  AITaskDetailsAddListItem,
  AITaskDetailsAddPopoverProps,
  AITaskDetailsAddPopoverResponse,
  AITaskDetailsCardListProps,
  AITaskExecutionDetailsCardProps,
  AITaskExecutionDetailsProps,
  AITaskStatisticsStatusProps,
} from './type'
import { OutlinePresentationchartbarIcon, OutlineTrashIcon } from '@/assets/icon/outline'
import styles from './AITaskExecutionDetails.module.scss'
import { YakitTag } from '@/components/yakitUI/YakitTag/YakitTag'
import { AIDeleteNodeIcon, AIDoingNodeIcon, AIDoneNodeIcon, AIPendingNodeIcon, AISkippedNodeIcon } from './icon'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitPopconfirm } from '@/components/yakitUI/YakitPopconfirm/YakitPopconfirm'
import { AIToDoListItem } from '@/pages/ai-re-act/aiReActChat/aiToDoList/AIToDoList'
import { useCreation, useInterval, useMemoizedFn, useSelections } from 'ahooks'
import useChatIPCDispatcher from '../../useContext/ChatIPCContent/useDispatcher'
import useAIAgentStore from '../../useContext/useStore'
import { ForgesAndSkillsDynamicItem, PlanItemDetailsData, TodoListCardData } from '@/pages/ai-re-act/hooks/aiRender'
import cloneDeep from 'lodash/cloneDeep'
import isEqual from 'lodash/isEqual'
import { Progress } from 'antd'
import { YakitEmpty } from '@/components/yakitUI/YakitEmpty/YakitEmpty'
import { YakitPopover } from '@/components/yakitUI/YakitPopover/YakitPopover'
import { YakitInput } from '@/components/yakitUI/YakitInput/YakitInput'
import { RollingLoadList } from '@/components/RollingLoadList/RollingLoadList'
import { genDefaultPagination, PaginationSchema, QueryYakScriptRequest, YakScript } from '@/pages/invoker/schema'
import { AIForge, QueryAIForgeRequest } from '../../type/forge'
import { grpcQueryAIForge } from '../../grpc'
import { AITool, GetAIToolListRequest } from '../../type/aiTool'
import { grpcGetAIToolList } from '../../aiToolList/utils'
import { YakitCheckbox } from '@/components/yakitUI/YakitCheckbox/YakitCheckbox'
import { TableTotalAndSelectNumber } from '@/components/TableTotalAndSelectNumber/TableTotalAndSelectNumber'
import { YakitSpin } from '@/components/yakitUI/YakitSpin/YakitSpin'
import {
  AIAgentGrpcApi,
  AIInputEventHotPatchTypeEnum,
  AIInputEventSyncTypeEnum,
  AIStartParams,
} from '@/pages/ai-re-act/hooks/grpcApi'
import { apiQueryYakScript } from '@/pages/plugins/utils'
import { grpcGetAllMCPServers } from '../../aiMCP/utils'
import { GetAllMCPServersRequest, MCPServerTool } from '../../type/aiMCP'
import {
  HorizontalScrollCardItemInfoMultiple,
  HorizontalScrollCardItemInfoSingle,
} from '@/pages/plugins/operator/horizontalScrollCard/HorizontalScrollCard'
import { YakitRadioButtons } from '@/components/yakitUI/YakitRadioButtons/YakitRadioButtons'
import { timeDiffWithMoment } from '@/utils/timeUtil'

export const AITaskExecutionDetails: React.FC<AITaskExecutionDetailsProps> = React.memo((props) => {
  const { taskId, taskGoal, taskName } = props
  const { chatIPCEvents } = useChatIPCDispatcher()
  const { activeChat } = useAIAgentStore()

  const [planItemDetailsData, setPlanItemDetailsData] = useState<PlanItemDetailsData>()
  const perPlanItemDetailsDataUUIdRef = useRef<string>('')
  useEffect(() => {
    onReset()
    getData()
  }, [taskId])
  useInterval(() => {
    getData()
  }, 5 * 1000)
  const onReset = useMemoizedFn(() => {
    setPlanItemDetailsData(undefined)
    perPlanItemDetailsDataUUIdRef.current = ''
  })
  const getData = useMemoizedFn(() => {
    if (!taskId) return
    let itemData: PlanItemDetailsData | undefined = undefined
    if (taskId.includes('react')) {
      itemData = chatIPCEvents.fetchChatDataStore()?.get(activeChat?.SessionID || '')?.casualChat.planDetails
    } else {
      const planDetailsMap = chatIPCEvents.fetchChatDataStore()?.get(activeChat?.SessionID || '')
        ?.taskChat.planDetailsMap
      if (!planDetailsMap || planDetailsMap.size === 0) return
      itemData = planDetailsMap.get(taskId)
    }
    if (!itemData) return
    if (perPlanItemDetailsDataUUIdRef.current === itemData.uuid) return
    perPlanItemDetailsDataUUIdRef.current = itemData.uuid
    setPlanItemDetailsData(cloneDeep(itemData))
  })
  const perception = useCreation(() => {
    if (!planItemDetailsData) return
    return planItemDetailsData.perception
  }, [planItemDetailsData?.perception])

  const finishedCount = useCreation(() => {
    return (
      (planItemDetailsData?.todoList?.stats?.deleted || 0) +
      (planItemDetailsData?.todoList?.stats?.done || 0) +
      (planItemDetailsData?.todoList?.stats?.skipped || 0)
    )
  }, [planItemDetailsData?.todoList?.stats])
  const total = useCreation(
    () => planItemDetailsData?.todoList?.items?.length || 0,
    [planItemDetailsData?.todoList?.items?.length],
  )

  const todoData = useCreation(() => {
    const unFinish: TodoListCardData['items'] = []
    const finished: TodoListCardData['items'] = []
    const progressNumber: AITaskStatisticsStatusProps['list'] = [
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

    for (const item of planItemDetailsData?.todoList?.items || []) {
      switch (item.status) {
        case 'PENDING':
          progressNumber[0].footerLeft = progressNumber[0].footerLeft + 1
          unFinish.push(item)
          break

        case 'DOING':
          progressNumber[1].footerLeft = progressNumber[1].footerLeft + 1
          unFinish.push(item)
          break

        case 'DONE':
          progressNumber[2].footerLeft = progressNumber[2].footerLeft + 1
          finished.push(item)
          break

        case 'SKIPPED':
          progressNumber[3].footerLeft = progressNumber[3].footerLeft + 1
          finished.push(item)
          break

        case 'DELETED':
          progressNumber[4].footerLeft = progressNumber[4].footerLeft + 1
          finished.push(item)
          break
        default:
          break
      }
    }
    return { unFinish, finished, progressNumber }
  }, [planItemDetailsData?.todoList?.items])

  const forgeFixedList = useCreation(() => {
    let forgeFixed: AIAgentGrpcApi.PlanItemDetailsFixedItem[] =
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
    let forgeDynamic: ForgesAndSkillsDynamicItem[] = skills.concat(forge) || []
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
  return (
    <div className={styles['ai-task-execution-details-container']}>
      {/* 头部 */}
      <div className={styles['header']}>
        <div className={styles['header-title']}>
          <OutlinePresentationchartbarIcon className={styles['header-icon']} />
          <span className={styles['title-text']}>任务执行详情</span>
        </div>
        <div className={styles['header-subtitle']}>{taskName}</div>
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
            <AITaskExecutionDetailsCard title="任务目标" content={taskGoal} />
            <AITaskExecutionDetailsCard title="意图感知" content={perception?.summary} />
          </div>
          <div className={styles['task-statistics']}>
            <div className={styles['stats-header']}>
              <span className={styles['title']}>待办任务</span>
              {!!total && (
                <>
                  <span className={styles['progress-text']}>
                    进度
                    <span className={styles['progress-number']}>
                      {finishedCount}/{total || 1}
                    </span>
                  </span>
                  <Progress
                    strokeColor="var(--Colors-Use-Neutral-Disable)"
                    trailColor="var(--Colors-Use-Neutral-Bg-Hover)"
                    percent={Math.ceil(finishedCount / total) * 100}
                    size="small"
                    showInfo={false}
                    className={styles['progress-bar']}
                  />
                </>
              )}
            </div>
            {!!total ? (
              <>
                {/* 状态统计区块 */}
                <AITaskStatisticsStatus list={todoData.progressNumber} />
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

        {/* 技能、工具、插件三列 */}
        <div className={styles['bottom-section']}>
          <AITaskDetailsCardList
            key="forge"
            type="forge"
            colTitle="技能"
            taskId={taskId}
            fixedList={forgeFixedList}
            dynamicList={forgeDynamicList}
          />
          <AITaskDetailsCardList
            key="tool"
            type="tool"
            colTitle={'工具'}
            taskId={taskId}
            fixedList={planItemDetailsData?.tool.fixed || []}
            dynamicList={planItemDetailsData?.tool.dynamic || []}
          />
          <AITaskDetailsCardList
            key="yak_plugin"
            type="yak_plugin"
            colTitle={'插件'}
            taskId={taskId}
            fixedList={planItemDetailsData?.plugins.fixed || []}
            dynamicList={planItemDetailsData?.plugins.dynamic || []}
          />
          <AITaskDetailsCardList
            key="mcp"
            type="mcp"
            colTitle={'MCP'}
            taskId={taskId}
            fixedList={planItemDetailsData?.mcp.fixed || []}
            dynamicList={planItemDetailsData?.mcp.dynamic || []}
          />
        </div>
      </div>
    </div>
  )
})

const AITaskDetailsAddPopover: React.FC<AITaskDetailsAddPopoverProps> = React.memo((props) => {
  const { title, type, onClose, taskId } = props
  const { handleSendConfigHotpatch, handleSendSyncMessage } = useChatIPCDispatcher()

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
    handleSendConfigHotpatch({
      hotpatchType: AIInputEventHotPatchTypeEnum.HotPatchType_EnabledCapabilities,
      params: {
        EnabledCapabilities: enabledCapabilities,
      },
      taskId,
    })
    setTimeout(() => {
      handleSendSyncMessage({
        syncType: AIInputEventSyncTypeEnum.SYNC_CAPABILITY_INVENTORY,
      })
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
  const { handleSendConfigHotpatch, handleSendSyncMessage } = useChatIPCDispatcher()
  const [configType, setConfigType] = useState<'fixed' | 'dynamic'>('fixed')
  const [scroll, setScroll] = useState<boolean>(false)
  const [visible, setVisible] = useState<boolean>(false)
  const onRemove = useMemoizedFn((dynamicItem) => {
    handleSendConfigHotpatch({
      hotpatchType: AIInputEventHotPatchTypeEnum.HotPatchType_DisabledCapabilities,
      params: {
        EnabledCapabilities: dynamicList
          .filter((ele) => isEqual(ele, dynamicItem))
          .map((item) => ({
            Name: item.name,
            Type: getType(item.category),
          })),
      },
      taskId,
    })
    setTimeout(() => {
      handleSendSyncMessage({
        syncType: AIInputEventSyncTypeEnum.SYNC_CAPABILITY_INVENTORY,
      })
    }, 1000)
  })
  const renderList = useMemoizedFn(() => {
    switch (configType) {
      case 'fixed':
        return fixedList.map((fixedItem, index) => (
          <AITaskActionItem
            key={fixedItem.verbose_name + fixedItem.name}
            title={fixedItem.verbose_name || fixedItem.name}
            category={fixedItem.category}
            description={fixedItem.description}
          />
        ))
      case 'dynamic':
        return dynamicList.map((dynamicItem, index) => (
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
        ))
      default:
        return <></>
    }
  })
  return (
    <div className={styles['section-card']}>
      <div className={styles['section-card-title']}>{colTitle}</div>
      <div className={styles['plugin-group']}>
        <div className={styles['plugin-group-header']}>
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
        </div>
        <div
          className={styles['plugin-list']}
          style={{ overflowY: scroll ? 'auto' : 'hidden' }}
          onMouseEnter={() => setScroll(true)}
          onMouseLeave={() => setScroll(false)}
        >
          {renderList()}
        </div>
      </div>
    </div>
  )
})

const AITaskActionItem: React.FC<AITaskActionItemProps> = React.memo((props) => {
  const { title, category, description, titleExtra } = props
  return (
    <div className={classNames(styles['plugin-item'])}>
      <div className={styles['plugin-item-heard']}>
        <div className={styles['plugin-item-title']}>
          <div className={styles['text']} title={title}>
            {title}
          </div>
          {category === 'skill' && (
            <YakitTag color="info" size="small">
              skill
            </YakitTag>
          )}
        </div>
        {titleExtra && <div className={styles['plugin-item-actions']}>{titleExtra}</div>}
      </div>
      {description && (
        <div className={styles['plugin-item-desc']} title={description}>
          {description}
        </div>
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
        {!!content ? content : <span className={styles['empty-text']}>暂无信息...</span>}
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
          <div className={styles['stat-label']}>{item.title}</div>
          <div className={styles['stat-footer']}>
            <div className={styles['stat-footer-left']}>{item.footerLeft}</div>
            <div className={styles['stat-footer-right']}> {item.footerRight} </div>
          </div>
        </div>
      ))}
    </div>
  )
})
