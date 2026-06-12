import type { AIMessageHandler, AIMessageHandlerParams } from './type'
import { AIInputEventSyncTypeEnum, AITaskStatus, type AIAgentGrpcApi, type AIOutputEvent } from './grpcApi'
import { Uint8ArrayToString } from '@/utils/str'
import { genBaseAIChatData, genErrorLogData, genExecTasks } from './utils'
import { type AIChatQSData, AIChatQSDataTypeEnum } from './aiRender'
import cloneDeep from 'lodash/cloneDeep'
import { DefaultPlanLoadingStatus, DefaultTodoListCardData } from './defaultConstant'
import { aiPerfDataHandlers } from './grpcStreamHandler/aiPerfData'
import { aiOtherDataHandlers } from './grpcStreamHandler/aiOtherData'

/** grpc流数据转换成错误信息输出到日志中 */
const handleErrorGRPCToLog: (
  /** 该条grpc流数据是历史数据 */
  isHistory: AIMessageHandlerParams['res']['IsSync'],
  pushLog: AIMessageHandlerParams['pushLog'],
  error: ReturnType<typeof genErrorLogData>,
) => void = (isHistory, pushLog, error) => {
  if (isHistory) return
  pushLog(error)
}

/** run_time_id数据计数逻辑 */
const handleTrafficCount: AIMessageHandler = (request) => {
  const { res, chatType, store, rawData, pushLog } = request

  const ipcContent = Uint8ArrayToString(res.Content) || ''
  const data = JSON.parse(ipcContent) as AIAgentGrpcApi.HTTPTrafficNotice & AIAgentGrpcApi.RiskTrafficNotice
  if (!data.runtime_id) {
    handleErrorGRPCToLog(res.IsSync, pushLog, genErrorLogData(res.Timestamp, `${res.Type}数据, runtime_id 为空`))
    return
  }

  // 更新流量表和风险表数据, 历史数据不处理
  if (!res.IsSync) {
    if (res.Type === 'yak_httpflow_count' && !rawData.httpRunTimeIDs.includes(data.runtime_id)) {
      rawData.httpRunTimeIDs.push(data.runtime_id)
      store.getState().updateHttpData()
    } else if (res.Type === 'yak_risk_count' && !rawData.riskRunTimeIDs.includes(data.runtime_id)) {
      rawData.riskRunTimeIDs.push(data.runtime_id)
      store.getState().updateRiskData()
    }
  }

  // 更新工具执行结果卡片里的流量和风险数量
  const toolResult = rawData.contents.get(data.runtime_id)
  if (!toolResult || toolResult.type !== AIChatQSDataTypeEnum.TOOL_RESULT || toolResult.chatType !== chatType) {
    handleErrorGRPCToLog(
      res.IsSync,
      pushLog,
      genErrorLogData(res.Timestamp, `${res.Type}数据, 未找到对应的工具(call_tool_id:${data.runtime_id})结果卡片数据`),
    )
    return
  }
  let update = false
  switch (res.Type) {
    case 'yak_httpflow_count':
      if (data.http_flow_count !== toolResult.data.httpFlowDataCount) {
        toolResult.data.httpFlowDataCount = data.http_flow_count ?? 0
        update = true
      }
      break
    case 'yak_risk_count':
      if (data.risk_count !== toolResult.data.riskFlowDataCount) {
        toolResult.data.riskFlowDataCount = data.risk_count ?? 0
        update = true
      }
      break
    default:
      break
  }
  if (!update) return
  store.getState().incrementNodeVersion(toolResult.id, 'item')
}

/**
 * grpc流数据的各种类型处理逻辑集合
 * 该逻辑集合里的方法处理，没有使用try-catch拦截，因为在hook层进行了同一try-catch拦截
 * 注意！别的地方单独使用时，请自行加入try-catch拦截错误
 */
export const grpcAIMessageHandlers: Record<string, AIMessageHandler> = {
  ...aiPerfDataHandlers,
  ...aiOtherDataHandlers,
  yak_httpflow_count: handleTrafficCount,
  yak_risk_count: handleTrafficCount,
}

const adad = (res: AIOutputEvent) => {
  let funcKey = res.Type
  if (
    res.Type === 'structured' &&
    [
      'session_title',
      'react_task_enqueue',
      'react_task_dequeue',
      'queue_info',
      'timeline_item',
      'react_task_status_changed',
      'status',
    ].includes(res.NodeId)
  ) {
    // stream数据结束标识
    funcKey = res.NodeId
  } else if (res.Type === 'api_request_failed' && res.NodeId === 'ai_call_failure') {
    funcKey = res.Type
  }
}
