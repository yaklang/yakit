import { useCreation, useMemoizedFn } from 'ahooks'
import { Uint8ArrayToString } from '@/utils/str'
import { AIChatLogData, UseAIPerfDataEvents, UseAIPerfDataParams } from './type'
import { handleGrpcDataPushLog } from './utils'
import { AIAgentGrpcApi, AIOutputEvent } from './grpcApi'

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
        // 上下文字节统计 & 上下文成分
        const data = JSON.parse(ipcContent) as AIAgentGrpcApi.ContextStatsSections

        const stats = getChatDataStore?.()?.aiPerfData?.contextStats
        if (stats) {
          // 这里是直接使用引用设置的值，所以不需要在使用setContentMap设置回去
          stats.prompt_bytes = data.prompt_bytes
          stats.data.prompt_bytes.push(data.prompt_bytes ?? 0)
          if (stats.data.prompt_bytes.length > 50) stats.data.prompt_bytes.shift()
          stats.data.system_prompt_bytes.push(data.system_prompt_bytes ?? 0)
          if (stats.data.system_prompt_bytes.length > 50) stats.data.system_prompt_bytes.shift()
          stats.data.runtime_context_bytes.push(data.runtime_context_bytes ?? 0)
          if (stats.data.runtime_context_bytes.length > 50) stats.data.runtime_context_bytes.shift()
          stats.data.user_input_bytes.push(data.user_input_bytes ?? 0)
          if (stats.data.user_input_bytes.length > 50) stats.data.user_input_bytes.shift()
          stats.data.times.push(Number(res.Timestamp) || 0)
          if (stats.data.times.length > 50) stats.data.times.shift()
        }

        const sections = getChatDataStore?.()?.aiPerfData?.contextSections
        const sectionsData = data.sections || []
        if (sections) {
          // 这里是直接使用引用设置的值，所以不需要在使用setContentMap设置回去
          const summaryMap = sections.summary || new Map<string, string>()
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
