import { useCreation, useMemoizedFn } from 'ahooks'
import { Uint8ArrayToString } from '@/utils/str'
import type { AIContextStatsDetail } from '@/pages/ai-agent/type/aiChat'
import { AIChatLogData, UseAIPerfDataEvents, UseAIPerfDataParams } from './type'
import { handleGrpcDataPushLog } from './utils'
import { AIAgentGrpcApi, AIOutputEvent } from './grpcApi'

const CONTEXT_STATS_SERIES_MAX = 50

/** 首次建立 role_order 时，若存在这些 role_name 则按此顺序排在前面 */
const CONTEXT_STATS_ROLE_NAME_ORDER = [
  'high_static',
  'frozen_block',
  'semi_dynamic',
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

          if (incomingRoles.length > 0 && d.role_order.length === 0) {
            if (d.times.length > 0) {
              d.times = []
            }
            d.total_prompt_bytes = []
            d.total_prompt_tokens = []
            d.role_order = []
            d.role_labels = {}
            d.role_series = {}
            d.role_tokens = {}

            const seenNames = new Set<string>()
            const incomingOrder: string[] = []
            const labels: Record<string, string> = {}
            for (const r of incomingRoles) {
              const name = r.role_name
              if (!name || seenNames.has(name)) continue
              seenNames.add(name)
              incomingOrder.push(name)
              labels[name] = r.role_name_zh || name
            }

            const preferred = new Set<string>(CONTEXT_STATS_ROLE_NAME_ORDER)
            const ordered: string[] = []
            for (const name of CONTEXT_STATS_ROLE_NAME_ORDER) {
              if (seenNames.has(name)) ordered.push(name)
            }
            for (const name of incomingOrder) {
              if (!preferred.has(name)) ordered.push(name)
            }

            for (const name of ordered) {
              d.role_order.push(name)
              d.role_labels[name] = labels[name] ?? name
              d.role_series[name] = []
              d.role_tokens[name] = []
            }
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
