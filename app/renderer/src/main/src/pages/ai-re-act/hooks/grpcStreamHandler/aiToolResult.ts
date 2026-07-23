import type { AIMessageHandler } from '../type'
import type { AIAgentGrpcApi } from '../grpcApi'
import { Uint8ArrayToString } from '@/utils/str'
import { genBaseAIChatData, generateTaskNodeDataID } from '../utils'
import { AIChatQSDataTypeEnum, type AIToolResult } from '../aiRender'
import cloneDeep from 'lodash/cloneDeep'
import { DefaultAIToolResult, DefaultToolResultSummary } from '../defaultConstant'
import { persistToolResultIfTerminal, upsertSessionContent } from '../persist/contentPersistHelper'

const handleToolCallStart: AIMessageHandler = (requestInfo) => {
  const { res, chatType, store, rawData, meta } = requestInfo
  if (res.Type !== 'tool_call_start') return

  const ipcContent = Uint8ArrayToString(res.Content) || ''
  const { call_tool_id, tool, start_time, start_time_ms } = JSON.parse(ipcContent) as AIAgentGrpcApi.AIToolCall
  if (!call_tool_id) {
    requestInfo.pushLog({ level: 'error', message: `${res.Type}数据异常, ${ipcContent}` })
    return
  }

  const toolResult: AIToolResult = {
    ...cloneDeep(DefaultAIToolResult),
    callToolId: call_tool_id,
    toolName: tool?.name || '-',
    verboseName: tool?.verbose_name_i18n,
    toolDescription: tool?.description || '',
    startTime: start_time || 0,
    startTimeMS: start_time_ms || 0,
  }

  rawData.contents.set(call_tool_id, {
    ...genBaseAIChatData(res),
    id: call_tool_id,
    chatType: chatType,
    type: AIChatQSDataTypeEnum.TOOL_RESULT,
    data: toolResult,
    TaskId: generateTaskNodeDataID({
      chatType,
      planID: chatType === 'reAct' ? store.getState().currentCasualTaskID : meta.currentTaskPlanID?.taskID,
      taskID: res.TaskId,
      isExist: (key) => rawData.contents.has(key),
    }),
  })
}

const handleToolCallParam: AIMessageHandler = (requestInfo) => {
  const { res, store, rawData } = requestInfo
  if (res.Type !== 'tool_call_param') return

  const ipcContent = Uint8ArrayToString(res.Content) || ''
  const { call_tool_id, params } = JSON.parse(ipcContent) as AIAgentGrpcApi.AIToolCallParams
  if (!call_tool_id) {
    requestInfo.pushLog({ level: 'error', message: `${res.Type}数据异常, ${ipcContent}` })
    return
  }

  const toolResult = rawData.contents.get(call_tool_id)
  if (!toolResult || toolResult.type !== AIChatQSDataTypeEnum.TOOL_RESULT) {
    requestInfo.pushLog({
      level: 'error',
      message: `${res.Type}数据(call_tool_id:${call_tool_id}), 没有对应的tool_call_start类型初始化`,
    })
    return
  }

  toolResult.data.tool.reviewParams = cloneDeep(params)
  if (toolResult.data.type === 'result') store.getState().incrementNodeVersion(toolResult.id, 'item')
  persistToolResultIfTerminal(requestInfo.sessionId, toolResult)
}

const handleToolCallWatcher: AIMessageHandler = (requestInfo) => {
  const { res, store, rawData } = requestInfo
  if (res.Type !== 'tool_call_watcher') return

  const ipcContent = Uint8ArrayToString(res.Content) || ''
  const { call_tool_id, id, selectors } = JSON.parse(ipcContent) as AIAgentGrpcApi.AIToolCallWatcher

  if (!call_tool_id || !id || !selectors || !selectors?.length) {
    requestInfo.pushLog({ level: 'error', message: `${res.Type}数据异常, ${ipcContent}` })
    return
  }

  // 先获取工具结果数据，从里面拿到stream的EventUUID
  const toolResult = rawData.contents.get(call_tool_id)
  if (!toolResult || toolResult.type !== AIChatQSDataTypeEnum.TOOL_RESULT || !toolResult.data.stream.EventUUID) {
    requestInfo.pushLog({
      level: 'error',
      message: `${res.Type}数据(call_tool_id:${call_tool_id}), 没有对应的tool_call_start类型初始化`,
    })
    return
  }
  // 通过上面获取到的EventUUID，获取stream数据
  const toolForStreamData = rawData.contents.get(toolResult.data.stream.EventUUID)
  if (!toolForStreamData || toolForStreamData.type !== AIChatQSDataTypeEnum.STREAM) {
    requestInfo.pushLog({
      level: 'error',
      message: `EventUUID: ${toolResult.data.stream.EventUUID} 的stream数据没有对应的初始化`,
    })
    return
  }
  // 这里是直接使用引用设置的值，所以不需要在使用setContentMap设置回去
  toolForStreamData.data.selectors = {
    callToolId: call_tool_id,
    InteractiveId: id,
    selectors: selectors,
  }

  if (toolResult.data.type === 'stream') {
    // 历史数据-该类型不出发渲染更新
    if (res.IsSync) return
    store.getState().incrementNodeVersion(toolResult.id, 'item')
  }
}

const handleToolCallLogDir: AIMessageHandler = (requestInfo) => {
  const { res, store, rawData } = requestInfo
  if (res.Type !== 'tool_call_log_dir') return

  const ipcContent = Uint8ArrayToString(res.Content) || ''
  const { call_tool_id, dir_path } = JSON.parse(ipcContent) as AIAgentGrpcApi.AIToolCallDirPath
  if (!call_tool_id) {
    requestInfo.pushLog({ level: 'error', message: `${res.Type}数据异常, ${ipcContent}` })
    return
  }

  const toolResult = rawData.contents.get(call_tool_id)
  if (!toolResult || toolResult.type !== AIChatQSDataTypeEnum.TOOL_RESULT) {
    requestInfo.pushLog({
      level: 'error',
      message: `${res.Type}数据(call_tool_id:${call_tool_id}), 没有对应的tool_call_start类型初始化`,
    })
    return
  }
  if (toolResult.data.tool.dirPath) {
    requestInfo.pushLog({
      level: 'error',
      message: `${res.Type}数据(call_tool_id:${call_tool_id}), dir_path已存在，不能重复设置`,
    })
    return
  }

  // 这里是直接使用引用设置的值，所以不需要在使用setContentMap设置回去
  toolResult.data.tool.dirPath = dir_path || ''
  if (toolResult.data.tool.status !== 'default') store.getState().incrementNodeVersion(toolResult.id, 'item')
  persistToolResultIfTerminal(requestInfo.sessionId, toolResult)
}

const handleToolCallResult: AIMessageHandler = (requestInfo) => {
  const { res, store, rawData, meta } = requestInfo
  if (!['tool_call_user_cancel', 'tool_call_done', 'tool_call_error'].includes(res.Type)) return
  const status =
    { tool_call_user_cancel: 'user_cancelled', tool_call_done: 'success', tool_call_error: 'failed' }[res.Type] ||
    'default'
  if (status === 'default') return

  const ipcContent = Uint8ArrayToString(res.Content) || ''
  const { call_tool_id, ...rest } = JSON.parse(ipcContent) as AIAgentGrpcApi.AIToolCall

  if (!call_tool_id) {
    requestInfo.pushLog({ level: 'error', message: `${res.Type}数据异常, ${ipcContent}` })
    return
  }

  const toolResult = rawData.contents.get(call_tool_id)
  if (!toolResult || toolResult.type !== AIChatQSDataTypeEnum.TOOL_RESULT) {
    requestInfo.pushLog({
      level: 'error',
      message: `${res.Type}数据(call_tool_id:${call_tool_id}), 没有对应的tool_call_start类型初始化`,
    })
    return
  }

  // 下面的设置: 是直接使用引用设置的值，所以不需要在使用setContentMap设置回去
  // 设置工具执行的开始时间、结束时间和持续时间等数据
  toolResult.data.type = 'result'
  toolResult.data.startTime = rest.start_time || 0
  toolResult.data.startTimeMS = rest.start_time_ms || 0
  toolResult.data.endTime = rest.end_time || 0
  toolResult.data.endTimeMS = rest.end_time_ms || 0
  toolResult.data.durationMS = rest.duration_ms || 0
  toolResult.data.durationSeconds = rest.duration_seconds || 0
  toolResult.data.tool.status = status as 'user_cancelled' | 'success' | 'failed' | 'default'
  /** 触发这个函数说明状态一定不是 processing_params */
  toolResult.data.isProcessingParams = false

  // 设置总结内容，没有就设置成获取中，有就使用获取到的内容
  toolResult.data.tool.summary = toolResult.data.tool.summary || DefaultToolResultSummary[status]?.wait || ''
  // 设置执行结果错误数据内容(std_xxx_stderr)
  const errorResult = meta.toolStderrStreamData.get(call_tool_id)
  if (errorResult && errorResult.status === 'end') {
    toolResult.data.tool.execError = errorResult.content
    // error数据先出但未存在对应的工具执行结果，工具结果出现后直接使用并删除map中的缓存数据
    meta.toolStderrStreamData.delete(call_tool_id)
  }

  store.getState().incrementNodeVersion(toolResult.id, 'item')
  upsertSessionContent(requestInfo.sessionId, toolResult.id, toolResult)
}

const handleToolCallSummary: AIMessageHandler = (requestInfo) => {
  const { res, store, rawData, meta } = requestInfo
  if (res.Type !== 'tool_call_summary') return

  const ipcContent = Uint8ArrayToString(res.Content) || ''
  const { call_tool_id, summary } = JSON.parse(ipcContent) as AIAgentGrpcApi.AIToolCall

  if (!call_tool_id) {
    requestInfo.pushLog({ level: 'error', message: `${res.Type}数据异常, ${ipcContent}` })
    return
  }

  const toolResult = rawData.contents.get(call_tool_id)
  if (!toolResult || toolResult.type !== AIChatQSDataTypeEnum.TOOL_RESULT) {
    requestInfo.pushLog({
      level: 'error',
      message: `${res.Type}数据(call_tool_id:${call_tool_id}), 没有对应的tool_call_start类型初始化`,
    })
    return
  }

  const statusInfo = toolResult.data.tool.status
  const summaryContent = !summary || summary === 'null' ? '' : summary
  // 下面的设置: 是直接使用引用设置的值，所以不需要在使用setContentMap设置回去
  // 设置总结内容，没有就设置成默认的状态展示内容，有就使用获取到的内容
  toolResult.data.tool.summary =
    statusInfo === 'user_cancelled'
      ? '当前工具调用已被取消，会使用当前输出结果进行后续工作决策'
      : summaryContent || DefaultToolResultSummary[toolResult.data.tool.status]?.result || ''
  // 设置执行结果错误数据内容(std_xxx_stderr)
  const errorResult = meta.toolStderrStreamData.get(call_tool_id)
  if (errorResult && errorResult.status === 'end') {
    toolResult.data.tool.execError = errorResult.content
    // error数据先出但未存在对应的工具执行结果，工具结果出现后直接使用并删除map中的缓存数据
    meta.toolStderrStreamData.delete(call_tool_id)
  }
  if (statusInfo !== 'default') {
    store.getState().incrementNodeVersion(toolResult.id, 'item')
  }
  persistToolResultIfTerminal(requestInfo.sessionId, toolResult)
}

const handleToolCallStatus: AIMessageHandler = (requestInfo) => {
  const { res, store, rawData } = requestInfo
  if (res.Type !== 'tool_call_status') return

  const ipcContent = Uint8ArrayToString(res.Content) || ''
  const { call_tool_id, status } = JSON.parse(ipcContent) as AIAgentGrpcApi.AIToolCall
  if (!call_tool_id) {
    requestInfo.pushLog({ level: 'error', message: `${res.Type}数据异常, ${ipcContent}` })
    return
  }

  const toolResult = rawData.contents.get(call_tool_id)
  if (!toolResult || toolResult.type !== AIChatQSDataTypeEnum.TOOL_RESULT) {
    requestInfo.pushLog({
      level: 'error',
      message: `${res.Type}数据(call_tool_id:${call_tool_id}), 没有对应的tool_call_start类型初始化`,
    })
    return
  }

  const isProcessingParams = status === 'processing_params'
  if (toolResult.data.isProcessingParams === isProcessingParams) return

  toolResult.data.isProcessingParams = status === 'processing_params'
  store.getState().incrementNodeVersion(toolResult.id, 'item')
  persistToolResultIfTerminal(requestInfo.sessionId, toolResult)
}

const handleToolCallReason: AIMessageHandler = (requestInfo) => {
  const { res, store, rawData } = requestInfo
  if (res.Type !== 'tool_call_reason') return

  const ipcContent = Uint8ArrayToString(res.Content) || ''
  const { call_tool_id, reason } = JSON.parse(ipcContent) as AIAgentGrpcApi.AIToolCall

  if (!call_tool_id) {
    requestInfo.pushLog({ level: 'error', message: `${res.Type}数据异常, ${ipcContent}` })
    return
  }

  const toolResult = rawData.contents.get(call_tool_id)
  if (!toolResult || toolResult.type !== AIChatQSDataTypeEnum.TOOL_RESULT) {
    requestInfo.pushLog({
      level: 'error',
      message: `${res.Type}数据(call_tool_id:${call_tool_id}), 没有对应的tool_call_start类型初始化`,
    })
    return
  }

  toolResult.data.tool.reason = reason || ''
  if (toolResult.data.type !== 'create') store.getState().incrementNodeVersion(toolResult.id, 'item')
  persistToolResultIfTerminal(requestInfo.sessionId, toolResult)
}

export const aiToolResultDataHandlers = {
  tool_call_start: handleToolCallStart,
  tool_call_param: handleToolCallParam,
  tool_call_watcher: handleToolCallWatcher,
  tool_call_log_dir: handleToolCallLogDir,
  tool_call_user_cancel: handleToolCallResult,
  tool_call_done: handleToolCallResult,
  tool_call_error: handleToolCallResult,
  tool_call_summary: handleToolCallSummary,
  tool_call_status: handleToolCallStatus,
  tool_call_reason: handleToolCallReason,
} as const
