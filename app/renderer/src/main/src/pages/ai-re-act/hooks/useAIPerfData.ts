import { useCreation, useMemoizedFn } from 'ahooks'
import { Uint8ArrayToString } from '@/utils/str'
import type { AIContextStatsDetail } from '@/pages/ai-agent/type/aiChat'
import { AIChatLogData, UseAIPerfDataEvents, UseAIPerfDataParams } from './type'
import { handleGrpcDataPushLog } from './utils'
import { AIAgentGrpcApi, AIOutputEvent } from './grpcApi'

const CONTEXT_STATS_SERIES_MAX = 50

/**
 * 首次建立 role_order 时，若存在这些 role_name 则按此顺序排在前面。
 *
 * P1.1 之后 aireact 已经把老的 semi_dynamic 段彻底拆成 semi_dynamic_1
 * (Skills Context + CacheToolCall) 与 semi_dynamic_2 (Persistent +
 * Schema + OutputExample) 两个独立 role；老的 semi_dynamic 已被移除,
 * 不再保留兜底位。
 *
 * 字节统计图 "从下往上" 的堆叠物理顺序固定为:
 *   high_static -> frozen_block -> semi_dynamic_1 -> semi_dynamic_2 ->
 *   timelineOpen -> dynamic
 */
const CONTEXT_STATS_ROLE_NAME_ORDER = [
  'high_static',
  'frozen_block',
  'semi_dynamic_1',
  'semi_dynamic_2',
  'timelineOpen',
  'dynamic',
] as const

const trimContextStatsSeries = (d: AIContextStatsDetail['data']) => {
  if (!Array.isArray(d.total_prompt_bytes)) d.total_prompt_bytes = []
  if (!Array.isArray(d.total_prompt_tokens)) d.total_prompt_tokens = []
  while (d.times.length > CONTEXT_STATS_SERIES_MAX) {
    d.times.shift()
    d.total_prompt_bytes.shift()
    d.total_prompt_tokens.shift()
    for (const name of d.role_order) {
      d.role_series[name]?.shift()
      d.role_tokens[name]?.shift()
    }
  }
}

/** 递归上下文成分里的summary并归类到map对象后消除summary字段内容 */
const handleSummarySectionsSummary = (
  sections: AIAgentGrpcApi.AIContextSections[],
  summaryMap: Map<string, string>,
) => {
  for (let item of sections) {
    summaryMap.set(item.key, item.summary || '')
    delete item.summary
    if (item.children) handleSummarySectionsSummary(item.children, summaryMap)
  }
}

// 属于该 hook 处理数据的类型
export const UseAIPerfDataTypes = [
  'consumption',
  'pressure',
  'ai_first_byte_cost_ms',
  'ai_total_cost_ms',
  'prompt_profile',
]

function useAIPerfData(params?: UseAIPerfDataParams): UseAIPerfDataEvents

/** 提供 AI 硬件相关性能数据 */
function useAIPerfData(params?: UseAIPerfDataParams) {
  const { pushLog, getChatDataStore } = params || {}

  const handlePushLog = useMemoizedFn((log: AIChatLogData) => {
    pushLog?.(log)
  })

  const handleSetData = useMemoizedFn((res: AIOutputEvent) => {
    try {
      let ipcContent = Uint8ArrayToString(res.Content) || ''

      if (res.Type === 'consumption') {
        // 消耗Token
        // 因为可能存在多个 ai 并发输出，所以这里的 token 量是一个集合
        const data = JSON.parse(ipcContent) as AIAgentGrpcApi.Consumption
        const consumption = getChatDataStore?.()?.aiPerfData?.consumption
        if (consumption) {
          // 这里是直接使用引用设置的值，所以不需要在使用setContentMap设置回去
          consumption.input_consumption = data.input_consumption
          consumption.output_consumption = data.output_consumption
          consumption.cache_hit_token = data.cache_hit_token
          consumption.tier_consumption = { ...data.tier_consumption }
        }
        return
      }

      if (res.Type === 'pressure') {
        // 上下文压力
        const data = JSON.parse(ipcContent) as AIAgentGrpcApi.Pressure
        const pressure = getChatDataStore?.()?.aiPerfData?.pressure
        if (pressure) {
          // 这里是直接使用引用设置的值，所以不需要在使用setContentMap设置回去
          const target = pressure[data.model_tier]
          if (!target) {
            pressure[data.model_tier] = [{ ...data, timestamp: Number(res.Timestamp) || 0 }]
          } else {
            target.push({ ...data, timestamp: Number(res.Timestamp) || 0 })
            // if (target.length > 100) target.shift()
          }
        }
        return
      }

      if (res.Type === 'ai_first_byte_cost_ms') {
        // 首字符响应耗时
        const data = JSON.parse(ipcContent) as AIAgentGrpcApi.AIFirstCostMS
        const firstCost = getChatDataStore?.()?.aiPerfData?.firstCost
        if (firstCost) {
          // 这里是直接使用引用设置的值，所以不需要在使用setContentMap设置回去
          const target = firstCost[data.model_tier]
          if (!target) {
            firstCost[data.model_tier] = [{ ...data, timestamp: Number(res.Timestamp) || 0 }]
          } else {
            target.push({ ...data, timestamp: Number(res.Timestamp) || 0 })
            // if (target.length > 100) target.shift()
          }
        }
        return
      }

      if (res.Type === 'ai_total_cost_ms') {
        // 总对话耗时
        const data = JSON.parse(ipcContent) as AIAgentGrpcApi.AITotalCostMS
        const totalCost = getChatDataStore?.()?.aiPerfData?.totalCost
        if (totalCost) {
          // 这里是直接使用引用设置的值，所以不需要在使用setContentMap设置回去
          const target = totalCost[data.model_tier]
          if (!target) {
            totalCost[data.model_tier] = [{ ...data, timestamp: Number(res.Timestamp) || 0 }]
          } else {
            target.push({ ...data, timestamp: Number(res.Timestamp) || 0 })
            // if (target.length > 100) target.shift()
          }
        }
        return
      }

      if (res.Type === 'prompt_profile') {
        // 上下文字节统计 & 上下文成分（源头：AI 流式输出事件 prompt_profile，经 useChatIPC → handleSetData）
        const data = JSON.parse(ipcContent) as AIAgentGrpcApi.ContextStatsSections
        const stats = getChatDataStore?.()?.aiPerfData?.contextStats
        if (stats) {
          const d = stats.data
          const incomingRoles = Array.isArray(data.role_stats) ? data.role_stats : []
          const ts = Number(res.Timestamp) || 0

          if (incomingRoles.length > 0) {
            // 每个 turn 后端都会按 promptSectionRolesInOrder 推全集 6 个 role
            // (P1.1: high_static / frozen_block / semi_dynamic_1 / semi_dynamic_2 /
            // timelineOpen / dynamic), 即便 bytes 为 0 也会预填. 所以这里每次
            // 都用 incoming 重新 reconcile role_order, 既能让新出现的 role
            // (如 semi_dynamic_1/2) 按 CONTEXT_STATS_ROLE_NAME_ORDER 物理顺序
            // 插入, 也能把 incoming 里彻底消失的老 role (如老的 'semi_dynamic')
            // 自动 evict 掉, 避免历史会话残留的图例顺序污染.
            const incomingMap = new Map<string, AIAgentGrpcApi.PromptProfileRoleStat>()
            for (const r of incomingRoles) {
              if (!r.role_name || incomingMap.has(r.role_name)) continue
              incomingMap.set(r.role_name, r)
            }

            const preferred = new Set<string>(CONTEXT_STATS_ROLE_NAME_ORDER)
            const desiredOrder: string[] = []
            for (const name of CONTEXT_STATS_ROLE_NAME_ORDER) {
              if (incomingMap.has(name)) desiredOrder.push(name)
            }
            for (const name of incomingMap.keys()) {
              if (!preferred.has(name) && !desiredOrder.includes(name)) {
                desiredOrder.push(name)
              }
            }

            const oldOrderSet = new Set(d.role_order)
            const newOrderSet = new Set(desiredOrder)

            // 新出现的 role: 用 0 补齐已积累的 d.times 长度, 让历史时间轴上
            // 这条线从 0 起步, 而不是凭空错位
            for (const name of desiredOrder) {
              const r = incomingMap.get(name)
              if (!oldOrderSet.has(name)) {
                d.role_labels[name] = r?.role_name_zh || name
                d.role_series[name] = new Array(d.times.length).fill(0)
              } else if (r?.role_name_zh) {
                d.role_labels[name] = r.role_name_zh
              }
            }
            // 老 role (如 'semi_dynamic') 在 incoming 中彻底消失 -> 释放 series
            for (const name of d.role_order) {
              if (!newOrderSet.has(name)) {
                delete d.role_labels[name]
                delete d.role_series[name]
              }
            }

            d.role_order = desiredOrder
          }

          stats.prompt_bytes = data.prompt_bytes ?? 0
          stats.prompt_tokens = data.prompt_tokens ?? 0
          d.times.push(ts)
          d.total_prompt_bytes.push(data.prompt_bytes ?? 0)
          d.total_prompt_tokens.push(data.prompt_tokens ?? 0)

          if (d.role_order.length > 0) {
            const map = new Map<string, number>()
            const tokenMap = new Map<string, number>()
            for (const r of incomingRoles) {
              if (!d.role_order.includes(r.role_name)) continue
              map.set(r.role_name, r.role_bytes ?? 0)
              tokenMap.set(r.role_name, r.role_tokens ?? 0)
            }
            for (const name of d.role_order) {
              if (!d.role_series[name]) d.role_series[name] = []
              d.role_series[name].push(map.get(name) ?? 0)
            }
            for (const name of d.role_order) {
              if (!d.role_tokens[name]) d.role_tokens[name] = []
              d.role_tokens[name].push(tokenMap.get(name) ?? 0)
            }
          }

          trimContextStatsSeries(d)
        }

        const sections = getChatDataStore?.()?.aiPerfData?.contextSections
        const sectionsData = data.sections || []
        if (sections) {
          // 这里是直接使用引用设置的值，所以不需要在使用setContentMap设置回去
          // 每次新的后端数据进来,需要重置上次数据逻辑处理的map对象,避免之前数据对当前数据处理造成影响
          const summaryMap = new Map<string, string>()
          handleSummarySectionsSummary(sectionsData, summaryMap)
          sections.summary = summaryMap
          sections.sections = sectionsData
        }
      }
    } catch (error) {
      handleGrpcDataPushLog({ info: res, pushLog: handlePushLog })
    }
  })

  const events: UseAIPerfDataEvents = useCreation(() => {
    return { handleSetData }
  }, [])

  return events
}

export default useAIPerfData
