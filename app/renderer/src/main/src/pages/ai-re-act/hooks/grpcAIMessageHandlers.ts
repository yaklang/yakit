import type { AIMessageHandler, AIMessageHandlerParams } from './type'
import type { AIAgentGrpcApi } from './grpcApi'
import type {
  AIChatQSData,
  AIChatQSDataType,
  AIReviewType,
  AIToolResult,
  ChatStream,
  HttpFlowFuzzStatusCardData,
  ReActChatBaseInfo,
  ReActChatGroupElement,
  ReActChatRenderItem,
} from './aiRender'

import { Uint8ArrayToString } from '@/utils/str'
import {
  genBaseAIChatData,
  genErrorLogData,
  isAutoExecuteReviewContinue,
  isToolStderrStream,
  isToolStdoutStream,
} from './utils'
import { AIChatQSDataTypeEnum } from './aiRender'
import {
  AIReviewJudgeLevelMap,
  AIStreamContentType,
  convertNodeIdToVerbose,
  DefaultAIToolResult,
  DefaultToolResultSummary,
} from './defaultConstant'
import cloneDeep from 'lodash/cloneDeep'
import { v4 as uuidv4 } from 'uuid'

// #region Common Utils
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

/** 更新UI-State变量数据(独立单条数据) */
const handleUpdateUISingleState: (
  /** 该条grpc流数据是历史数据 */
  isHistory: AIMessageHandlerParams['res']['IsSync'],
  /** UI-State数据 */
  info: { mapKey: string; type: AIChatQSDataType } & { chatType: ReActChatBaseInfo['chatType'] },
  setElement: AIMessageHandlerParams['setElements'],
) => void = (isHistory, info, setElement) => {
  try {
    setElement((old) => {
      const find = old.find((item) => item.token === info.mapKey && item.type === info.type)
      if (find) {
        find.renderNum += 1
        return [...old]
      }

      const element: ReActChatRenderItem = {
        chatType: info.chatType,
        token: info.mapKey,
        type: info.type,
        renderNum: 1,
      }
      if (isHistory) {
        return [element, ...old]
      } else {
        return [...old, element]
      }
    })
  } catch {}
}

/** 更新UI-State变量数据(组数据) */
const handleUpdateUIGroupState: (
  /** group数据 */
  group: { mapKey: string; type: AIChatQSDataType },
  /** sub数据 */
  sub: { mapKey: string; type: AIChatQSDataType },
  setElement: AIMessageHandlerParams['setElements'],
) => void = (group, sub, setElement) => {
  try {
    setElement((old) => {
      const find = old.find((item) => item.token === group.mapKey && item.type === group.type)
      if (find && find.isGroup) {
        const subFind = find.children.find((item) => item.token === sub.mapKey && item.type === sub.type)
        if (subFind) subFind.renderNum += 1
        find.renderNum += 1
        return [...old]
      }

      return old
    })
  } catch {}
}
// #endregion

// #region 单项流数据转换为独立UI数据
/** Type='thought' 问题的思考 */
const handleThought: AIMessageHandler = (request) => {
  const { res, info, setContentMap } = request
  if (res.Type !== 'thought') return

  const ipcContent = Uint8ArrayToString(res.Content) || ''
  const { thought } = (JSON.parse(ipcContent) as AIAgentGrpcApi.AIChatThought) || {}
  const chatData: AIChatQSData = {
    ...genBaseAIChatData(res),
    chatType: info.chatType,
    type: AIChatQSDataTypeEnum.THOUGHT,
    data: thought || '',
  }
  setContentMap(chatData.id, chatData)
  handleUpdateUISingleState(
    res.IsSync,
    { mapKey: chatData.id, type: chatData.type, chatType: chatData.chatType },
    request.setElements,
  )
}

/** Type='result' 问题一次性的结果输出 */
const handleResult: AIMessageHandler = (request) => {
  const { res, info, setContentMap } = request
  if (res.Type !== 'result') return

  const ipcContent = Uint8ArrayToString(res.Content) || ''
  const { result, after_stream } = (JSON.parse(ipcContent) as AIAgentGrpcApi.AIChatResult) || {}
  if (after_stream) return

  const chatData: AIChatQSData = {
    ...genBaseAIChatData(res),
    chatType: info.chatType,
    type: AIChatQSDataTypeEnum.THOUGHT,
    data: result || '',
  }
  setContentMap(chatData.id, chatData)
  handleUpdateUISingleState(
    res.IsSync,
    { mapKey: chatData.id, type: chatData.type, chatType: chatData.chatType },
    request.setElements,
  )
}

/** Type='fail_react_task' ReAct任务(自由对话)崩溃的错误信息 */
const handleFailReactTask: AIMessageHandler = (request) => {
  const { res, info, setContentMap } = request
  if (res.Type !== 'fail_react_task') return

  const ipcContent = Uint8ArrayToString(res.Content) || ''
  const chatData: AIChatQSData = {
    ...genBaseAIChatData(res),
    chatType: info.chatType,
    type: AIChatQSDataTypeEnum.FAIL_REACT,
    data: {
      content: ipcContent,
      NodeId: res.NodeId,
      NodeIdVerbose: res.NodeIdVerbose || convertNodeIdToVerbose(res.NodeId),
    },
  }
  setContentMap(chatData.id, chatData)
  handleUpdateUISingleState(
    res.IsSync,
    { mapKey: chatData.id, type: chatData.type, chatType: chatData.chatType },
    request.setElements,
  )
}

/** Type='tool_call_decision' 工具决策 */
const handleToolCallDecision: AIMessageHandler = (request) => {
  const { res, info, setContentMap } = request
  if (res.Type !== 'tool_call_decision') return

  const ipcContent = Uint8ArrayToString(res.Content) || ''
  const data = JSON.parse(ipcContent) as AIAgentGrpcApi.ToolCallDecision
  const i18n = data?.i18n || { zh: data.action, en: data.action }
  const chatData: AIChatQSData = {
    ...genBaseAIChatData(res),
    chatType: info.chatType,
    type: AIChatQSDataTypeEnum.TOOL_CALL_DECISION,
    data: {
      ...data,
      i18n: {
        Zh: i18n.zh,
        En: i18n.en,
      },
    },
  }
  setContentMap(chatData.id, chatData)
  handleUpdateUISingleState(
    res.IsSync,
    { mapKey: chatData.id, type: chatData.type, chatType: chatData.chatType },
    request.setElements,
  )
}

/** Type='fail_plan_and_execution' 任务规划崩溃的错误信息[在任务规划启动就崩溃时，出现在自由对话中] */
const handleFailPlanAndExecution: AIMessageHandler = (request) => {
  const { res, info, setContentMap } = request
  if (res.Type !== 'fail_plan_and_execution') return

  const ipcContent = Uint8ArrayToString(res.Content) || ''
  const chatData: AIChatQSData = {
    ...genBaseAIChatData(res),
    chatType: info.chatType,
    type: AIChatQSDataTypeEnum.FAIL_PLAN_AND_EXECUTION,
    data: {
      content: ipcContent,
      NodeId: res.NodeId,
      NodeIdVerbose: res.NodeIdVerbose || convertNodeIdToVerbose(res.NodeId),
    },
  }
  setContentMap(chatData.id, chatData)
  handleUpdateUISingleState(
    res.IsSync,
    { mapKey: chatData.id, type: chatData.type, chatType: chatData.chatType },
    request.setElements,
  )
}

/** Type='structured'&NodeId='react_task_dequeue' 生成用户问题到自由对话的UI上展示 */
const handleReactTaskDequeue: AIMessageHandler = (request) => {
  const { res, info, setContentMap } = request
  if (res.Type !== 'structured' || res.NodeId !== 'react_task_dequeue') return
  // 任务规划-该类型数据为无效数据
  if (info.chatType === 'task') return

  const ipcContent = Uint8ArrayToString(res.Content) || ''
  const data = JSON.parse(ipcContent) as AIAgentGrpcApi.QuestionQueueStatusChange
  const chatData: AIChatQSData = {
    id: uuidv4(),
    chatType: 'reAct',
    type: AIChatQSDataTypeEnum.QUESTION,
    Timestamp: res.Timestamp,
    data: { qs: data.react_task_input || '', setting: {} },
    AIService: '',
    AIModelName: '',
    // showQS为了UI渲染方便，重新构建的字段
    extraValue: { showQS: data.react_task_input || '' },
  }
  setContentMap(chatData.id, chatData)
  handleUpdateUISingleState(
    res.IsSync,
    { mapKey: chatData.id, type: chatData.type, chatType: chatData.chatType },
    request.setElements,
  )
}

/** Type='api_request_failed'&NodeId='ai_call_failure' 模型/API 请求失败 */
const handleApiRequestFailed: AIMessageHandler = (request) => {
  const { res, info, setContentMap } = request
  if (res.Type !== 'api_request_failed' || res.NodeId !== 'ai_call_failure') return
  // 历史数据无用-不处理
  if (res.IsSync) return

  const ipcContent = Uint8ArrayToString(res.Content) || ''
  const data = JSON.parse(ipcContent) as AIAgentGrpcApi.AIApiRequestFailedPayload
  const chatData: AIChatQSData = {
    ...genBaseAIChatData(res),
    chatType: info.chatType,
    type: AIChatQSDataTypeEnum.AI_API_REQUEST_FAILED,
    data,
  }
  setContentMap(chatData.id, chatData)
  handleUpdateUISingleState(
    res.IsSync,
    { mapKey: chatData.id, type: chatData.type, chatType: chatData.chatType },
    request.setElements,
  )
}

/** Type='http_flow_fuzz_status' 发包统计卡片：按 fuzz_id 维护一张 HTTP_FLOW_FUZZ_STATUS 卡片 */
const handleHttpFlowFuzzStatus: AIMessageHandler = (request) => {
  const { res, info, setContentMap, getContentMap, pushLog } = request
  if (res.Type !== 'http_flow_fuzz_status') return
  // 历史数据无用-不处理
  if (res.IsSync) return

  const ipcContent = Uint8ArrayToString(res.Content) || ''
  const payload = JSON.parse(ipcContent) as AIAgentGrpcApi.GetHttpFlowFuzzStatus
  const { fuzz_id, runtime_id, reason, status } = payload
  if (!fuzz_id) {
    handleErrorGRPCToLog(res.IsSync, pushLog, genErrorLogData(res.Timestamp, `${res.Type} 数据缺少 fuzz_id`))
    return
  }

  const cardType = AIChatQSDataTypeEnum.HTTP_FLOW_FUZZ_STATUS
  const existing = getContentMap(fuzz_id)
  const isExistingCard = existing?.type === cardType

  // 引擎结束态没有对应卡片时直接丢弃，保留原行为
  if (status === 'finish' && !isExistingCard) return

  const nextData: HttpFlowFuzzStatusCardData = {
    fuzz_id,
    runtime_id,
    reason,
    engine_status: status,
    // 仅 `working` 覆盖 progress；其它状态保留上一次（新建时默认 undefined）
    progress: status === 'working' ? payload.progress : isExistingCard ? existing!.data.progress : undefined,
  }

  if (isExistingCard) {
    Object.assign(existing!.data, nextData)
  } else {
    const chatData: AIChatQSData = {
      ...genBaseAIChatData(res),
      id: fuzz_id,
      chatType: info.chatType,
      type: cardType,
      data: nextData,
    }
    setContentMap(fuzz_id, chatData)
  }

  handleUpdateUISingleState(
    res.IsSync,
    { mapKey: fuzz_id, type: cardType, chatType: info.chatType },
    request.setElements,
  )
}
// #endregion

// #region stream数据相关逻辑
/**
 * - 存放 Type:stream NodeId:tool-xxx-stderr 的内容数据
 * - call_tool_id => {content:string uuid:string status:"start" | "end"}
 * - 当stream-finished触发后，将内容全部设置到工具结果对象中的execError字段中
 * - 本NodeId和stream类型中的其他NodeId有一样的后端逻辑，但是前端需要将其区分出来
 */
const ToolResultForStreamError: Map<string, { content: string; uuid: string; status: 'start' | 'end' }> = new Map()

/** Type='stream_start' stream类型数据初始化 */
const handleStreamStart: AIMessageHandler = (request) => {
  const { res, info, setContentMap, getContentMap, pushLog } = request
  if (res.Type !== 'stream_start') return
  // 属于日志数据的不进入UI展示
  if (res.IsSystem || res.IsReason) return

  const { CallToolID, NodeId } = res
  if (!NodeId) return

  const ipcContent = Uint8ArrayToString(res.Content) || ''
  const { event_writer_id } = JSON.parse(ipcContent) as { event_writer_id: string }
  // event_writer_id为空
  if (!event_writer_id) {
    handleErrorGRPCToLog(
      res.IsSync,
      pushLog,
      genErrorLogData(res.Timestamp, `${res.Type}数据(NodeId: ${NodeId}), event_writer_id 为空`),
    )
    return
  }

  // tool-xxx-stdout 数据单独初始化逻辑
  if (isToolStdoutStream(NodeId)) {
    if (!CallToolID) {
      handleErrorGRPCToLog(
        res.IsSync,
        pushLog,
        genErrorLogData(res.Timestamp, `${res.Type}数据(NodeId: ${NodeId}), CallToolID 为空`),
      )
      return
    }
    let toolResult = getContentMap(CallToolID || '')
    if (!toolResult || toolResult.type !== AIChatQSDataTypeEnum.TOOL_RESULT) {
      handleErrorGRPCToLog(
        res.IsSync,
        pushLog,
        genErrorLogData(
          res.Timestamp,
          `NodeID: ${NodeId} 的stream数据没有对应的工具结果(CallToolID: ${CallToolID})初始化`,
        ),
      )
      return
    }

    // 这里是直接使用引用设置的值，所以不需要在使用setContentMap设置回去
    toolResult.data.stream.EventUUID = event_writer_id
    toolResult.data.type = 'stream'
    setContentMap(event_writer_id, {
      ...genBaseAIChatData(res),
      id: event_writer_id,
      chatType: info.chatType,
      type: AIChatQSDataTypeEnum.STREAM,
      data: {
        NodeId,
        NodeIdVerbose: res.NodeIdVerbose || convertNodeIdToVerbose(NodeId),
        TaskIndex: res.TaskIndex || undefined,
        CallToolID,
        EventUUID: event_writer_id,
        status: 'start',
        content: '',
        ContentType: res.ContentType,
      },
    })
    return
  }
  // tool-xxx-stderr 数据单独初始化逻辑
  if (isToolStderrStream(NodeId) && CallToolID) {
    if (!CallToolID) {
      handleErrorGRPCToLog(
        res.IsSync,
        pushLog,
        genErrorLogData(res.Timestamp, `${res.Type}数据(NodeId: ${NodeId}), CallToolID 为空`),
      )
      return
    }
    if (!ToolResultForStreamError.has(CallToolID)) {
      ToolResultForStreamError.set(CallToolID, {
        content: '',
        uuid: event_writer_id,
        status: 'start',
      })
    }
    return
  }

  // 数据集合中对应的数据
  const streamData = getContentMap(event_writer_id)

  // 数据已存在，流数据输出顺序不对, 视为异常
  if (streamData) {
    handleErrorGRPCToLog(
      res.IsSync,
      pushLog,
      genErrorLogData(
        res.Timestamp,
        `异常 ${res.Type} 类型, NodeId: ${NodeId}, eventuuid: (${event_writer_id}), 已存在对应的数据`,
      ),
    )
    return
  }

  setContentMap(event_writer_id, {
    ...genBaseAIChatData(res),
    id: event_writer_id,
    chatType: info.chatType,
    type: AIChatQSDataTypeEnum.STREAM,
    data: {
      NodeId,
      NodeIdVerbose: res.NodeIdVerbose || convertNodeIdToVerbose(NodeId),
      TaskIndex: res.TaskIndex || undefined,
      CallToolID,
      EventUUID: event_writer_id,
      status: 'start',
      content: '',
      ContentType: res.ContentType,
    },
  })
}

/** stream数据初始化到UI上的逻辑处理 */
const handleIsGroupDisplayForStream: (
  /** grpc流数据 */
  res: AIMessageHandlerParams['res'],
  /** stream类型对应的详细数据 */
  streamDetail: ChatStream,
  /** 当前渲染的数据列表 */
  data: ReActChatRenderItem[],
  /** 获取详情数据映射的函数 */
  getContentMap: AIMessageHandlerParams['getContentMap'],
) => ReActChatRenderItem[] = (res, streamDetail, data, getContentMap) => {
  const list = [...data]
  const { ContentType, IsSync } = res
  const element: ReActChatRenderItem = {
    chatType: streamDetail.chatType,
    token: streamDetail.id,
    type: streamDetail.type,
    renderNum: 1,
  }

  // 以下 判断stream数据已经渲染在UI上的逻辑处理
  const find = list.find((item) => item.token === element.token)
  if (find) {
    // 已经渲染到UI上, 再次触发渲染更新
    if (find.isGroup) {
      const subFind = find.children.find((item) => item.token === element.token && item.type === element.type)
      if (subFind) subFind.renderNum += 1
    }
    find.renderNum += 1
    return list
  }
  if (streamDetail && streamDetail.parentGroupKey) {
    // 已经渲染到UI上, 但是是组内数据, 找到组信息，并触发渲染更新
    const group = list.find(
      (item) => item.token === streamDetail.parentGroupKey && item.type === AIChatQSDataTypeEnum.STREAM_GROUP,
    )
    if (group && group.isGroup) {
      const subFind = group.children.find((item) => item.token === element.token && item.type === element.type)
      if (subFind) subFind.renderNum += 1
      group.renderNum += 1
    }
    return list
  }

  // 以下 stream数据没有渲染在UI上的逻辑处理
  if (ContentType !== AIStreamContentType.DEFAULT || !list.length) {
    // 新增不可成组类型数据
    IsSync ? list.unshift(element) : list.push(element)
    return list
  }

  const active = IsSync ? list[0] : list[list.length - 1]
  const activeDetail = getContentMap(active.token)
  if (!activeDetail || activeDetail.type !== AIChatQSDataTypeEnum.STREAM) {
    // UI详细数据没有或不是可成组类型，新增数据到UI上
    IsSync ? list.unshift(element) : list.push(element)
    return list
  }

  if (active.type === AIChatQSDataTypeEnum.STREAM && !active.isGroup) {
    if (activeDetail.data.NodeId === streamDetail.data.NodeId) {
      // 命中单项，准备整合成组数据，将原有单项的token当成组token
      const groupInfo: ReActChatGroupElement = {
        chatType: active.chatType,
        token: active.token,
        type: AIChatQSDataTypeEnum.STREAM_GROUP,
        renderNum: 1,
        isGroup: true,
        children: [],
      }
      groupInfo.children = IsSync ? [element, cloneDeep(active)] : [cloneDeep(active), element]
      const arr = groupInfo.children.map((item) => item.token)
      for (let el of arr) {
        const info = getContentMap(el)
        if (info) info.parentGroupKey = active.token
      }
      IsSync ? list.shift() : list.pop()
      IsSync ? list.unshift(groupInfo) : list.push(groupInfo)
    } else {
      IsSync ? list.unshift(element) : list.push(element)
    }
    return list
  } else if (active.type === AIChatQSDataTypeEnum.STREAM_GROUP && active.isGroup) {
    if (activeDetail.data.NodeId === streamDetail.data.NodeId) {
      // 命中组内数据，追加到组内
      streamDetail.parentGroupKey = active.token
      IsSync ? active.children.unshift(element) : active.children.push(element)
      active.renderNum += 1
    } else {
      IsSync ? list.unshift(element) : list.push(element)
    }
    return list
  } else {
    IsSync ? list.unshift(element) : list.push(element)
    return list
  }
}

/** Type='stream' stream数据 */
const handleStream: AIMessageHandler = (request) => {
  const { res, setElements, getContentMap, pushLog } = request
  if (res.Type !== 'stream') return
  // 属于日志数据的不进入UI展示
  if (res.IsSystem || res.IsReason) return

  const { CallToolID, EventUUID, NodeId } = res
  if (!EventUUID || !NodeId) return

  const content = (Uint8ArrayToString(res.Content) || '') + (Uint8ArrayToString(res.StreamDelta) || '')

  // tool-xxx-stderr 数据单独处理逻辑
  if (isToolStderrStream(NodeId)) {
    if (!CallToolID) {
      handleErrorGRPCToLog(
        res.IsSync,
        pushLog,
        genErrorLogData(res.Timestamp, `${res.Type}数据(NodeId: ${NodeId}), CallToolID 为空`),
      )
      return
    }
    const errorResult = ToolResultForStreamError.get(CallToolID)
    if (errorResult) errorResult.content += content
    return
  }
  // tool-xxx-stdout 数据单独处理逻辑
  if (isToolStdoutStream(NodeId)) {
    if (!CallToolID) {
      handleErrorGRPCToLog(
        res.IsSync,
        pushLog,
        genErrorLogData(res.Timestamp, `${res.Type}数据(NodeId: ${NodeId}), CallToolID 为空`),
      )
      return
    }
    const toolResult = getContentMap(CallToolID)
    if (!toolResult || toolResult.type !== AIChatQSDataTypeEnum.TOOL_RESULT || !toolResult.data.stream.EventUUID) {
      handleErrorGRPCToLog(
        res.IsSync,
        pushLog,
        genErrorLogData(
          res.Timestamp,
          `NodeID: ${NodeId} 的stream数据没有对应的工具结果(CallToolID: ${CallToolID})初始化`,
        ),
      )
      return
    }
    const toolForStreamData = getContentMap(toolResult.data.stream.EventUUID)
    if (!toolForStreamData || toolForStreamData.type !== AIChatQSDataTypeEnum.STREAM) {
      handleErrorGRPCToLog(
        res.IsSync,
        pushLog,
        genErrorLogData(res.Timestamp, `EventUUID: ${toolResult.data.stream.EventUUID} 的stream数据没有对应的初始化`),
      )
      return
    }
    const isRender = !toolForStreamData.data.content
    // 这里是直接使用引用设置的值，所以不需要在使用setContentMap设置回去
    toolForStreamData.data.content += content
    if (isRender) {
      handleUpdateUISingleState(
        res.IsSync,
        { mapKey: toolResult.id, type: toolResult.type, chatType: toolResult.chatType },
        setElements,
      )
    }
    return
  }

  // 数据集合中对应的数据
  const streamData = getContentMap(EventUUID)

  // 数据不存在
  if (!streamData || streamData.type !== AIChatQSDataTypeEnum.STREAM) {
    handleErrorGRPCToLog(
      res.IsSync,
      pushLog,
      genErrorLogData(res.Timestamp, `异常 stream 类型, NodeId: ${NodeId}, eventuuid: (${EventUUID})`),
    )
    return
  }

  const isRender = !streamData.data.content
  // 下面的设置: 是直接使用引用设置的值，所以不需要在使用setContentMap设置回去
  streamData.Timestamp = isRender ? res.Timestamp : streamData.Timestamp
  streamData.data.content += content

  if (isRender) {
    // 判断是否成为组UI数据展示
    setElements((old) => {
      const list = handleIsGroupDisplayForStream(res, streamData, old, getContentMap)
      return list
    })
  }
}

/** Type='structured'&NodeId='stream-finished' stream数据结束标识 */
const handleStreamFinished: AIMessageHandler = (request) => {
  const { res, setElements, getElements, getContentMap, pushLog } = request
  if (res.Type !== 'structured' || res.NodeId !== 'stream-finished') return

  let ipcContent = Uint8ArrayToString(res.Content) || ''
  const { event_writer_id, node_id, is_reason, is_system } = JSON.parse(ipcContent) as AIAgentGrpcApi.AIStreamFinished
  // 属于日志数据的不进入UI展示
  if (is_reason || is_system) return
  if (!event_writer_id) {
    handleErrorGRPCToLog(
      res.IsSync,
      pushLog,
      genErrorLogData(res.Timestamp, `stream-finished数据, event_writer_id 为空`),
    )
    return
  }

  const { CallToolID } = res
  // tool-xxx-stderr 数据单独结束逻辑
  if (isToolStderrStream(node_id)) {
    if (!CallToolID) {
      handleErrorGRPCToLog(
        res.IsSync,
        pushLog,
        genErrorLogData(res.Timestamp, `${res.NodeId}数据(NodeId: ${node_id}), CallToolID 为空`),
      )
      return
    }

    const toolErrorResult = ToolResultForStreamError.get(CallToolID)
    if (!toolErrorResult) return

    const toolResult = getContentMap(CallToolID)
    if (!toolResult || toolResult.type !== AIChatQSDataTypeEnum.TOOL_RESULT) {
      // 工具执行结果卡片UI没有展示时
      toolErrorResult.status = 'end'
    } else {
      const showUI = getElements().find((item) => item.token === toolResult.id && item.type === toolResult.type)
      // 这里是直接使用引用设置的值，所以不需要在使用setContentMap设置回去
      toolResult.data.tool.execError = toolErrorResult.content
      if (showUI) {
        handleUpdateUISingleState(
          res.IsSync,
          { mapKey: toolResult.id, type: toolResult.type, chatType: toolResult.chatType },
          setElements,
        )
      }
      ToolResultForStreamError.delete(CallToolID)
    }
    return
  }
  // tool-xxx-stdout 数据单独结束逻辑
  if (isToolStdoutStream(node_id)) {
    if (!CallToolID) {
      handleErrorGRPCToLog(
        res.IsSync,
        pushLog,
        genErrorLogData(res.Timestamp, `${res.NodeId}数据(NodeId: ${node_id}), CallToolID 为空`),
      )
      return
    }

    const toolResult = getContentMap(res.CallToolID)
    if (!toolResult || toolResult.type !== AIChatQSDataTypeEnum.TOOL_RESULT || !toolResult.data.stream.EventUUID) {
      return
    }
    const toolForStreamData = getContentMap(toolResult.data.stream.EventUUID)
    if (!toolForStreamData || toolForStreamData.type !== AIChatQSDataTypeEnum.STREAM) {
      return
    }
    // 这里是直接使用引用设置的值，所以不需要在使用setContentMap设置回去
    toolForStreamData.data.status = 'end'
    const isShowAll = toolForStreamData.data.content.length > 25600 // 50KB大概字符数25600
    const displayContent = isShowAll
      ? '...' + toolForStreamData.data.content.slice(-25600) + '...'
      : toolForStreamData.data.content
    toolResult.data.tool.toolStdoutContent = { content: displayContent, isShowAll }
    handleUpdateUISingleState(
      res.IsSync,
      { mapKey: toolResult.id, type: toolResult.type, chatType: toolResult.chatType },
      setElements,
    )
    return
  }

  // 数据集合中对应的数据
  const streamData = getContentMap(event_writer_id)
  // 数据不存在 不输出到日志，因为日志的流数据也有该类型数据
  if (!streamData || streamData.type !== AIChatQSDataTypeEnum.STREAM) return

  // 这里是直接使用引用设置的值，所以不需要在使用setContentMap设置回去
  streamData.data.status = 'end'
  if (streamData.parentGroupKey) {
    handleUpdateUIGroupState(
      { mapKey: streamData.parentGroupKey, type: AIChatQSDataTypeEnum.STREAM_GROUP },
      { mapKey: event_writer_id, type: AIChatQSDataTypeEnum.STREAM },
      setElements,
    )
  } else {
    handleUpdateUISingleState(
      res.IsSync,
      { mapKey: streamData.id, type: streamData.type, chatType: streamData.chatType },
      setElements,
    )
  }
}

/** Type='reference_material' 参考资料, 可独立或追加到别的类型数据中展示 */
const handleReferenceMaterial: AIMessageHandler = (request) => {
  const { res, info, setElements, setContentMap, getContentMap } = request
  if (res.Type !== 'reference_material') return

  const ipcContent = Uint8ArrayToString(res.Content) || ''
  const data = JSON.parse(ipcContent) as AIAgentGrpcApi.ReferenceMaterialPayload

  const chatData = getContentMap(data.event_uuid)
  const toolResult = getContentMap(res.CallToolID || '')
  if (chatData) {
    // 下面的设置: 是直接使用引用设置的值，所以不需要在使用setContentMap设置回去
    chatData.reference = (chatData.reference || []).concat([data])
    if (chatData.parentGroupKey) {
      handleUpdateUIGroupState(
        { mapKey: chatData.parentGroupKey, type: AIChatQSDataTypeEnum.STREAM_GROUP },
        { mapKey: chatData.id, type: chatData.type },
        setElements,
      )
    } else if (chatData.type === AIChatQSDataTypeEnum.STREAM) {
      if (toolResult && isToolStdoutStream(chatData.data.NodeId)) {
        // 特殊情况，更新stdout流对应的工具执行结果卡片UI
        handleUpdateUISingleState(
          res.IsSync,
          { mapKey: toolResult.id, type: toolResult.type, chatType: toolResult.chatType },
          setElements,
        )
      } else {
        setElements((old) => {
          const list = handleIsGroupDisplayForStream(
            { ...res, ContentType: chatData.data.ContentType },
            chatData,
            old,
            getContentMap,
          )
          return list
        })
      }
      return
    } else {
      handleUpdateUISingleState(
        res.IsSync,
        { mapKey: chatData.id, type: chatData.type, chatType: chatData.chatType },
        setElements,
      )
    }
  } else if (
    toolResult &&
    toolResult.type === AIChatQSDataTypeEnum.TOOL_RESULT &&
    toolResult.data.stream.EventUUID === data.event_uuid
  ) {
    toolResult.reference = (toolResult.reference || []).concat([data])
    handleUpdateUISingleState(
      res.IsSync,
      { mapKey: toolResult.id, type: toolResult.type, chatType: toolResult.chatType },
      setElements,
    )
  } else {
    const chatData: AIChatQSData = {
      ...genBaseAIChatData(res),
      id: data.event_uuid,
      chatType: info.chatType,
      type: AIChatQSDataTypeEnum.Reference_Material,
      data: {
        NodeId: res.NodeId,
        NodeIdVerbose: res.NodeIdVerbose || convertNodeIdToVerbose(res.NodeId),
      },
      reference: [data],
    }
    setContentMap(chatData.id, chatData)
    handleUpdateUISingleState(
      res.IsSync,
      { mapKey: chatData.id, type: chatData.type, chatType: chatData.chatType },
      setElements,
    )
  }
}
// #endregion

// #region 工具执行结果卡牌
/** Type='tool_call_start' 工具执行-开始标识(OK) */
const handleToolCallStart: AIMessageHandler = (request) => {
  const { res, info, setContentMap, pushLog } = request
  if (res.Type !== 'tool_call_start') return

  const ipcContent = Uint8ArrayToString(res.Content) || ''
  const { call_tool_id, tool, start_time, start_time_ms } = JSON.parse(ipcContent) as AIAgentGrpcApi.AIToolCall
  if (!call_tool_id) {
    handleErrorGRPCToLog(res.IsSync, pushLog, genErrorLogData(res.Timestamp, `${res.Type}数据, call_tool_id 为空`))
    return
  }

  const toolResult: AIToolResult = {
    ...cloneDeep(DefaultAIToolResult),
    TaskIndex: res.TaskIndex || undefined,
    callToolId: call_tool_id,
    toolName: tool?.name || '-',
    toolDescription: tool?.description || '',
    startTime: start_time || 0,
    startTimeMS: start_time_ms || 0,
  }

  setContentMap(call_tool_id, {
    ...genBaseAIChatData(res),
    id: call_tool_id,
    chatType: info.chatType,
    type: AIChatQSDataTypeEnum.TOOL_RESULT,
    data: toolResult,
  })
}

/** Type='tool_call_param' 工具执行-review参数信息 */
const handleToolCallParam: AIMessageHandler = (request) => {
  const { res, getContentMap, pushLog } = request
  if (res.Type !== 'tool_call_param') return

  const ipcContent = Uint8ArrayToString(res.Content) || ''
  const { call_tool_id, params } = JSON.parse(ipcContent) as AIAgentGrpcApi.AIToolCallParams
  if (!call_tool_id) {
    handleErrorGRPCToLog(res.IsSync, pushLog, genErrorLogData(res.Timestamp, `${res.Type}数据, call_tool_id 为空`))
    return
  }

  const toolResult = getContentMap(call_tool_id)
  if (!toolResult || toolResult.type !== AIChatQSDataTypeEnum.TOOL_RESULT) {
    handleErrorGRPCToLog(
      res.IsSync,
      pushLog,
      genErrorLogData(
        res.Timestamp,
        `${res.Type}数据(call_tool_id:${call_tool_id}), 没有对应的tool_call_start类型初始化`,
      ),
    )
    return
  }

  toolResult.data.tool.reviewParams = cloneDeep(params)

  if (toolResult.data.type === 'result') {
    handleUpdateUISingleState(
      res.IsSync,
      { mapKey: toolResult.id, type: toolResult.type, chatType: toolResult.chatType },
      request.setElements,
    )
  }
}

/** Type='tool_call_watcher' 工具执行中-可操作选项 */
const handleToolCallWatcher: AIMessageHandler = (request) => {
  const { res, getContentMap, pushLog } = request
  if (res.Type !== 'tool_call_watcher') return

  const ipcContent = Uint8ArrayToString(res.Content) || ''
  const { call_tool_id, id, selectors } = JSON.parse(ipcContent) as AIAgentGrpcApi.AIToolCallWatcher

  if (!call_tool_id || !id || !selectors || !selectors?.length) {
    handleErrorGRPCToLog(
      res.IsSync,
      pushLog,
      genErrorLogData(res.Timestamp, `${res.Type}数据, call_tool_id: ${call_tool_id || '为空'} | id: ${id || '为空'}`),
    )
    return
  }

  // 先获取工具结果数据，从里面拿到stream的EventUUID
  const toolResult = getContentMap(call_tool_id)
  if (!toolResult || toolResult.type !== AIChatQSDataTypeEnum.TOOL_RESULT || !toolResult.data.stream.EventUUID) {
    handleErrorGRPCToLog(
      res.IsSync,
      pushLog,
      genErrorLogData(
        res.Timestamp,
        `${res.Type}数据(call_tool_id:${call_tool_id}), 没有对应的tool_call_start类型初始化`,
      ),
    )
    return
  }
  // 通过上面获取到的EventUUID，获取stream数据
  const toolForStreamData = getContentMap(toolResult.data.stream.EventUUID)
  if (!toolForStreamData || toolForStreamData.type !== AIChatQSDataTypeEnum.STREAM) {
    handleErrorGRPCToLog(
      res.IsSync,
      pushLog,
      genErrorLogData(res.Timestamp, `EventUUID: ${toolResult.data.stream.EventUUID} 的stream数据没有对应的初始化`),
    )
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
    handleUpdateUISingleState(
      res.IsSync,
      { mapKey: toolResult.id, type: toolResult.type, chatType: toolResult.chatType },
      request.setElements,
    )
  }
}

/** Type='tool_call_log_dir' 工具执行-工作目录路径 */
const handleToolCallLogDir: AIMessageHandler = (request) => {
  const { res, getContentMap, pushLog } = request
  if (res.Type !== 'tool_call_log_dir') return

  const ipcContent = Uint8ArrayToString(res.Content) || ''
  const { call_tool_id, dir_path } = JSON.parse(ipcContent) as AIAgentGrpcApi.AIToolCallDirPath
  if (!call_tool_id) {
    handleErrorGRPCToLog(res.IsSync, pushLog, genErrorLogData(res.Timestamp, `${res.Type}数据, call_tool_id 为空`))
    return
  }

  const toolResult = getContentMap(call_tool_id)
  if (!toolResult || toolResult.type !== AIChatQSDataTypeEnum.TOOL_RESULT) {
    handleErrorGRPCToLog(
      res.IsSync,
      pushLog,
      genErrorLogData(
        res.Timestamp,
        `${res.Type}数据(call_tool_id:${call_tool_id}), 没有对应的tool_call_start类型初始化`,
      ),
    )
    return
  }
  if (toolResult.data.tool.dirPath) {
    handleErrorGRPCToLog(
      res.IsSync,
      pushLog,
      genErrorLogData(res.Timestamp, `${res.Type}数据(call_tool_id:${call_tool_id}), dir_path已存在，不能重复设置`),
    )
    return
  }

  // 这里是直接使用引用设置的值，所以不需要在使用setContentMap设置回去
  toolResult.data.tool.dirPath = dir_path || ''
  if (toolResult.data.tool.status !== 'default') {
    handleUpdateUISingleState(
      res.IsSync,
      { mapKey: toolResult.id, type: toolResult.type, chatType: toolResult.chatType },
      request.setElements,
    )
  }
}

/** 工具执行结果的处理逻辑 */
const handleToolCallResult: (
  request: AIMessageHandlerParams,
  status: 'user_cancelled' | 'success' | 'failed',
) => void = (request, status) => {
  const { res, getContentMap, pushLog } = request

  const ipcContent = Uint8ArrayToString(res.Content) || ''
  const { call_tool_id, ...rest } = JSON.parse(ipcContent) as AIAgentGrpcApi.AIToolCall

  if (!call_tool_id) {
    handleErrorGRPCToLog(res.IsSync, pushLog, genErrorLogData(res.Timestamp, `${res.Type}数据, call_tool_id 为空`))
    return
  }

  const toolResult = getContentMap(call_tool_id)
  if (!toolResult || toolResult.type !== AIChatQSDataTypeEnum.TOOL_RESULT) {
    handleErrorGRPCToLog(
      res.IsSync,
      pushLog,
      genErrorLogData(
        res.Timestamp,
        `${res.Type}数据(call_tool_id:${call_tool_id}), 没有对应的tool_call_start类型初始化`,
      ),
    )
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
  toolResult.data.tool.status = status

  // 设置总结内容，没有就设置成获取中，有就使用获取到的内容
  toolResult.data.tool.summary = toolResult.data.tool.summary || DefaultToolResultSummary[status]?.wait || ''
  // 设置执行结果错误数据内容(std_xxx_stderr)
  const errorResult = ToolResultForStreamError.get(call_tool_id)
  if (errorResult && errorResult.status === 'end') {
    toolResult.data.tool.execError = errorResult.content
    // error数据先出但未存在对应的工具执行结果，工具结果出现后直接使用并删除map中的缓存数据
    ToolResultForStreamError.delete(call_tool_id)
  }

  handleUpdateUISingleState(
    res.IsSync,
    { mapKey: toolResult.id, type: toolResult.type, chatType: toolResult.chatType },
    request.setElements,
  )
}

/** Type='tool_call_user_cancel' 工具执行结果-用户取消 */
const handleToolCallUserCancel: AIMessageHandler = (request) => {
  if (request.res.Type !== 'tool_call_user_cancel') return
  handleToolCallResult(request, 'user_cancelled')
}

/** Type='tool_call_done' 工具执行结果-成功 */
const handleToolCallDone: AIMessageHandler = (request) => {
  if (request.res.Type !== 'tool_call_done') return
  handleToolCallResult(request, 'success')
}

/** Type='tool_call_error' 工具执行结果-失败 */
const handleToolCallError: AIMessageHandler = (request) => {
  if (request.res.Type !== 'tool_call_error') return
  handleToolCallResult(request, 'failed')
}

/** Type='tool_call_summary' 工具执行结果-总结 */
const handleToolCallSummary: AIMessageHandler = (request) => {
  const { res, getContentMap, pushLog } = request
  if (res.Type !== 'tool_call_summary') return

  const ipcContent = Uint8ArrayToString(res.Content) || ''
  const { call_tool_id, summary } = JSON.parse(ipcContent) as AIAgentGrpcApi.AIToolCall

  if (!call_tool_id) {
    handleErrorGRPCToLog(res.IsSync, pushLog, genErrorLogData(res.Timestamp, `${res.Type}数据, call_tool_id 为空`))
    return
  }

  const toolResult = getContentMap(call_tool_id)
  if (!toolResult || toolResult.type !== AIChatQSDataTypeEnum.TOOL_RESULT) {
    handleErrorGRPCToLog(
      res.IsSync,
      pushLog,
      genErrorLogData(
        res.Timestamp,
        `${res.Type}数据(call_tool_id:${call_tool_id}), 没有对应的tool_call_start类型初始化`,
      ),
    )
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
  const errorResult = ToolResultForStreamError.get(call_tool_id)
  if (errorResult && errorResult.status === 'end') {
    toolResult.data.tool.execError = errorResult.content
    // error数据先出但未存在对应的工具执行结果，工具结果出现后直接使用并删除map中的缓存数据
    ToolResultForStreamError.delete(call_tool_id)
  }
  if (statusInfo !== 'default') {
    handleUpdateUISingleState(
      res.IsSync,
      { mapKey: toolResult.id, type: toolResult.type, chatType: toolResult.chatType },
      request.setElements,
    )
  }
}

/** 工具执行结果的流量数据计数逻辑 */
const handleTrafficCount: AIMessageHandler = (request) => {
  const { res, getContentMap, pushLog } = request
  // 历史数据中的流量计数无效
  // if (res.IsSync) return

  const ipcContent = Uint8ArrayToString(res.Content) || ''
  const data = JSON.parse(ipcContent) as AIAgentGrpcApi.HTTPTrafficNotice & AIAgentGrpcApi.RiskTrafficNotice

  if (!data.runtime_id) {
    handleErrorGRPCToLog(res.IsSync, pushLog, genErrorLogData(res.Timestamp, `${res.Type}数据, runtime_id 为空`))
    return
  }
  const toolResult = getContentMap(data.runtime_id)
  if (!toolResult || toolResult.type !== AIChatQSDataTypeEnum.TOOL_RESULT) {
    handleErrorGRPCToLog(
      res.IsSync,
      pushLog,
      genErrorLogData(res.Timestamp, `${res.Type}数据(call_tool_id:${data.runtime_id}), 没有对应的工具执行结果数据`),
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
  handleUpdateUISingleState(
    res.IsSync,
    { mapKey: toolResult.id, type: toolResult.type, chatType: toolResult.chatType },
    request.setElements,
  )
}

/** Type='yak_httpflow_count' 新增流量数据 */
const handleYakHttpFlow: AIMessageHandler = (request) => {
  if (request.res.Type !== 'yak_httpflow_count') return
  handleTrafficCount(request)
}
/** Type='yak_risk_count' 新增风险数据 */
const handleYakRisk: AIMessageHandler = (request) => {
  if (request.res.Type !== 'yak_risk_count') return
  handleTrafficCount(request)
}
// #endregion

// #region review相关的处理逻辑
/** 保存那些review_release先出现的历史review数据的id */
let reviewReleaseID: Record<string, AIAgentGrpcApi.ReviewRelease> = {}
/** 记录plan_review补充信息的唯一ID */
let currentPlanReviewId = ''

/** Type='plan_review_require' plan-review */
const handlePlanReview: AIMessageHandler = (request) => {
  const { res, info, getRequest, setContentMap, pushLog, review } = request
  if (res.Type !== 'plan_review_require') return
  // 历史数据-grpc流数据在任务规划下无效，不处理
  if (res.IsSync && info.chatType === 'task') return

  const ipcContent = Uint8ArrayToString(res.Content) || ''
  const data = JSON.parse(ipcContent) as AIAgentGrpcApi.PlanReviewRequire
  if (!data?.id || !data?.plans || !data?.plans?.root_task || !data?.selectors || !data?.selectors?.length) {
    handleErrorGRPCToLog(
      res.IsSync,
      pushLog,
      genErrorLogData(
        res.Timestamp,
        `${res.Type}数据异常: id:${data?.id || '-'}; selectors:${JSON.stringify(data?.selectors || '-')}; plans:${
          !!data?.plans?.root_task ? 'valid' : 'invalid'
        } data`,
      ),
    )
    return
  }

  const chatData: AIChatQSData = {
    ...genBaseAIChatData(res),
    chatType: info.chatType,
    id: data.id,
    type: AIChatQSDataTypeEnum.PLAN_REVIEW_REQUIRE,
    data: { ...cloneDeep(data) },
  }
  if (res.IsSync) {
    // 历史review数据，直接存入map里，等待review_release出现后渲染到UI上
    const target = reviewReleaseID[data.id]
    if (target) {
      chatData.data.selected = JSON.stringify(target.params)
      chatData.data.optionValue = target.params?.suggestion || 'continue'
    }
    setContentMap(chatData.id, cloneDeep(chatData))
    if (target) {
      handleUpdateUISingleState(
        res.IsSync,
        { mapKey: chatData.id, type: chatData.type, chatType: chatData.chatType },
        request.setElements,
      )
    }
    return
  }

  // 实时数据处理逻辑
  const isAuto = isAutoExecuteReviewContinue({ type: res.Type, getFunc: getRequest })
  if (isAuto) {
    chatData.data.selected = JSON.stringify({ suggestion: 'continue' })
    chatData.data.optionValue = 'continue'
  }
  // 将数据存入hook里的缓存变量中
  review?.handleSetReview && review.handleSetReview(isAuto ? undefined : chatData)
  if (info.chatType === 'task') {
    // 该类型的实时数据只有任务规划才有
    if (isAuto) {
      setContentMap(chatData.id, cloneDeep(chatData))
      handleUpdateUISingleState(
        res.IsSync,
        { mapKey: chatData.id, type: chatData.type, chatType: chatData.chatType },
        request.setElements,
      )
      review?.handleReviewDataToUI && review.handleReviewDataToUI(cloneDeep(chatData))
    } else {
      currentPlanReviewId = ''
      review?.onReview && review.onReview(cloneDeep(chatData))
    }
  }
}
/** Type='plan_task_analysis' plan-review的补充信息 */
const handlePlanReviewAnalysis: AIMessageHandler = (request) => {
  const { res, info, getRequest, pushLog, review } = request
  // 历史数据-该类型数据无用
  if (res.IsSync) return
  if (res.Type !== 'plan_task_analysis') return
  // 该类型数据只有任务规划才有
  if (info.chatType !== 'task') return

  const reviewDetail = review?.handleGetReview?.()
  if (!reviewDetail || reviewDetail.type !== AIChatQSDataTypeEnum.PLAN_REVIEW_REQUIRE) {
    handleErrorGRPCToLog(
      res.IsSync,
      pushLog,
      genErrorLogData(res.Timestamp, `${res.Type}数据异常: 未找到对应plan_review_require数据`),
    )
    return
  }

  const ipcContent = Uint8ArrayToString(res.Content) || ''
  const data = JSON.parse(ipcContent) as AIAgentGrpcApi.PlanReviewRequireExtra
  if (
    !data?.plans_id ||
    !data?.index ||
    !data?.keywords?.length ||
    (currentPlanReviewId && currentPlanReviewId !== data.plans_id)
  ) {
    handleErrorGRPCToLog(
      res.IsSync,
      pushLog,
      genErrorLogData(
        res.Timestamp,
        `${res.Type}数据异常: plans_id:${data?.plans_id || '-'};index:${data?.index || '-'};keywords:${JSON.stringify(
          data?.keywords || '-',
        )}`,
      ),
    )
    return
  }

  if (!currentPlanReviewId) currentPlanReviewId = data.plans_id
  const reviewInfo = reviewDetail.data
  if (!reviewInfo.taskExtra) reviewInfo.taskExtra = new Map()
  reviewInfo.taskExtra.set(data.index, data)

  const isAuto = isAutoExecuteReviewContinue({ getFunc: getRequest })
  if (!isAuto && review?.onReviewExtra) review.onReviewExtra(cloneDeep(data))
}

/** Type='task_review_require' task-review */
const handleTaskReview: AIMessageHandler = (request) => {
  const { res, info, getRequest, setContentMap, pushLog, review } = request
  if (res.Type !== 'task_review_require') return

  const ipcContent = Uint8ArrayToString(res.Content) || ''
  const data = JSON.parse(ipcContent) as AIAgentGrpcApi.TaskReviewRequire
  if (!data?.id || !data?.selectors || !data?.selectors?.length) {
    handleErrorGRPCToLog(
      res.IsSync,
      pushLog,
      genErrorLogData(
        res.Timestamp,
        `${res.Type}数据异常: id:${data?.id || '-'}; selectors:${JSON.stringify(data?.selectors || '-')}`,
      ),
    )
    return
  }

  const chatData: AIChatQSData = {
    ...genBaseAIChatData(res),
    chatType: info.chatType,
    id: data.id,
    type: AIChatQSDataTypeEnum.TASK_REVIEW_REQUIRE,
    data: { ...cloneDeep(data) },
  }
  if (res.IsSync) {
    // 历史review数据，直接存入map里，等待review_release出现后渲染到UI上
    const target = reviewReleaseID[data.id]
    if (target) {
      chatData.data.selected = JSON.stringify(target.params)
      chatData.data.optionValue = target.params?.suggestion || 'continue'
    }
    setContentMap(chatData.id, cloneDeep(chatData))
    if (target) {
      handleUpdateUISingleState(
        res.IsSync,
        { mapKey: chatData.id, type: chatData.type, chatType: chatData.chatType },
        request.setElements,
      )
    }
    return
  }

  // 实时数据处理逻辑
  const isAuto = isAutoExecuteReviewContinue({ type: res.Type, getFunc: getRequest })
  if (isAuto) {
    chatData.data.selected = JSON.stringify({ suggestion: 'continue' })
    chatData.data.optionValue = 'continue'
  }
  // 将数据存入hook里的缓存变量中
  review?.handleSetReview && review.handleSetReview(isAuto ? undefined : chatData)
  if (info.chatType === 'task') {
    if (isAuto) {
      setContentMap(chatData.id, cloneDeep(chatData))
      handleUpdateUISingleState(
        res.IsSync,
        { mapKey: chatData.id, type: chatData.type, chatType: chatData.chatType },
        request.setElements,
      )
    } else {
      review?.onReview && review.onReview(cloneDeep(chatData))
    }
  } else if (info.chatType === 'reAct') {
    setContentMap(chatData.id, cloneDeep(chatData))
    handleUpdateUISingleState(
      res.IsSync,
      { mapKey: chatData.id, type: chatData.type, chatType: chatData.chatType },
      request.setElements,
    )
  }
}

/** Type='tool_use_review_require' tool-review */
const handleToolReview: AIMessageHandler = (request) => {
  const { res, info, getRequest, setContentMap, pushLog, review } = request
  if (res.Type !== 'tool_use_review_require') return

  const ipcContent = Uint8ArrayToString(res.Content) || ''
  const data = JSON.parse(ipcContent) as AIAgentGrpcApi.ToolUseReviewRequire
  if (!data?.id || !data?.selectors || !data?.selectors?.length) {
    handleErrorGRPCToLog(
      res.IsSync,
      pushLog,
      genErrorLogData(
        res.Timestamp,
        `${res.Type}数据异常: id:${data?.id || '-'}; selectors:${JSON.stringify(data?.selectors || '-')}`,
      ),
    )
    return
  }

  const chatData: AIChatQSData = {
    ...genBaseAIChatData(res),
    chatType: info.chatType,
    id: data.id,
    type: AIChatQSDataTypeEnum.TOOL_USE_REVIEW_REQUIRE,
    data: { ...cloneDeep(data) },
  }
  if (res.IsSync) {
    // 历史review数据，直接存入map里，等待review_release出现后渲染到UI上
    const target = reviewReleaseID[data.id]
    if (target) {
      chatData.data.selected = JSON.stringify(target.params)
      chatData.data.optionValue = target.params?.suggestion || 'continue'
    }
    setContentMap(chatData.id, cloneDeep(chatData))
    if (target) {
      handleUpdateUISingleState(
        res.IsSync,
        { mapKey: chatData.id, type: chatData.type, chatType: chatData.chatType },
        request.setElements,
      )
    }
    return
  }

  // 实时数据处理逻辑
  const isAuto = isAutoExecuteReviewContinue({ type: res.Type, getFunc: getRequest })
  if (isAuto) {
    chatData.data.selected = JSON.stringify({ suggestion: 'continue' })
    chatData.data.optionValue = 'continue'
  }
  // 将数据存入hook里的缓存变量中
  review?.handleSetReview && review.handleSetReview(isAuto ? undefined : chatData)
  if (info.chatType === 'task') {
    if (isAuto) {
      setContentMap(chatData.id, cloneDeep(chatData))
      handleUpdateUISingleState(
        res.IsSync,
        { mapKey: chatData.id, type: chatData.type, chatType: chatData.chatType },
        request.setElements,
      )
    } else {
      review?.onReview && review.onReview(cloneDeep(chatData))
    }
  } else if (info.chatType === 'reAct') {
    setContentMap(chatData.id, cloneDeep(chatData))
    handleUpdateUISingleState(
      res.IsSync,
      { mapKey: chatData.id, type: chatData.type, chatType: chatData.chatType },
      request.setElements,
    )
  }
}

/** Type='require_user_interactive' AI人机交互 */
const handleUserInteractive: AIMessageHandler = (request) => {
  const { res, info, setContentMap, pushLog, review } = request
  if (res.Type !== 'require_user_interactive') return

  const ipcContent = Uint8ArrayToString(res.Content) || ''
  const data = JSON.parse(ipcContent) as AIAgentGrpcApi.AIReviewRequire
  if (!data?.id) {
    handleErrorGRPCToLog(
      res.IsSync,
      pushLog,
      genErrorLogData(res.Timestamp, `${res.Type}数据异常: id:${data?.id || '-'}`),
    )
    return
  }

  const chatData: AIChatQSData = {
    ...genBaseAIChatData(res),
    chatType: info.chatType,
    id: data.id,
    type: AIChatQSDataTypeEnum.REQUIRE_USER_INTERACTIVE,
    data: cloneDeep(data),
  }
  if (res.IsSync) {
    // 历史review数据，直接存入map里，等待review_release出现后渲染到UI上
    const target = reviewReleaseID[data.id]
    if (target) {
      chatData.data.selected = JSON.stringify(target.params)
      chatData.data.optionValue = target.params?.suggestion || 'continue'
    }
    setContentMap(chatData.id, cloneDeep(chatData))
    if (target) {
      handleUpdateUISingleState(
        res.IsSync,
        { mapKey: chatData.id, type: chatData.type, chatType: chatData.chatType },
        request.setElements,
      )
    }
    return
  }

  // 将数据存入hook里的缓存变量中
  review?.handleSetReview && review.handleSetReview(chatData)
  if (info.chatType === 'task') {
    review?.onReview && review.onReview(cloneDeep(chatData))
  } else if (info.chatType === 'reAct') {
    setContentMap(chatData.id, cloneDeep(chatData))
    handleUpdateUISingleState(
      res.IsSync,
      { mapKey: chatData.id, type: chatData.type, chatType: chatData.chatType },
      request.setElements,
    )
  }
}

/** Type='exec_aiforge_review_require' 智能体review */
const handleAIForgeReviewRequire: AIMessageHandler = (request) => {
  const { res, info, getRequest, setContentMap, pushLog, review } = request
  // 任务规划不存在该类型数据
  if (info.chatType === 'task') return
  if (res.Type !== 'exec_aiforge_review_require') return

  const ipcContent = Uint8ArrayToString(res.Content) || ''
  const data = JSON.parse(ipcContent) as AIAgentGrpcApi.ExecForgeReview
  if (!data?.id || !data?.selectors || !data?.selectors?.length) {
    handleErrorGRPCToLog(
      res.IsSync,
      pushLog,
      genErrorLogData(
        res.Timestamp,
        `${res.Type}数据异常: id:${data?.id || '-'}; selectors:${JSON.stringify(data?.selectors || '-')}`,
      ),
    )
    return
  }

  const chatData: AIChatQSData = {
    ...genBaseAIChatData(res),
    chatType: info.chatType,
    id: data.id,
    type: AIChatQSDataTypeEnum.EXEC_AIFORGE_REVIEW_REQUIRE,
    data: { ...cloneDeep(data) },
  }
  if (res.IsSync) {
    // 历史review数据，直接存入map里，等待review_release出现后渲染到UI上
    const target = reviewReleaseID[data.id]
    if (target) {
      chatData.data.selected = JSON.stringify(target.params)
      chatData.data.optionValue = target.params?.suggestion || 'continue'
    }
    setContentMap(chatData.id, cloneDeep(chatData))
    if (target) {
      handleUpdateUISingleState(
        res.IsSync,
        { mapKey: chatData.id, type: chatData.type, chatType: chatData.chatType },
        request.setElements,
      )
    }
    return
  }

  // 实时数据处理逻辑
  const isAuto = isAutoExecuteReviewContinue({ type: res.Type, getFunc: getRequest })
  if (isAuto) {
    chatData.data.selected = JSON.stringify({ suggestion: 'continue' })
    chatData.data.optionValue = 'continue'
  }
  // 将数据存入hook里的缓存变量中
  review?.handleSetReview && review.handleSetReview(isAuto ? undefined : chatData)
  setContentMap(chatData.id, cloneDeep(chatData))
  handleUpdateUISingleState(
    res.IsSync,
    { mapKey: chatData.id, type: chatData.type, chatType: chatData.chatType },
    request.setElements,
  )
}

/** AI对review信息的评分和自动化操作 */
const handleAIReviewJudgement: AIMessageHandler = (request) => {
  const { res, info, getRequest, getContentMap, pushLog, review } = request
  // 历史数据不处理该类型数据
  if (res.IsSync) return

  const reviewDetail = review?.handleGetReview?.()
  if (!reviewDetail) {
    handleErrorGRPCToLog(
      res.IsSync,
      pushLog,
      genErrorLogData(res.Timestamp, `${res.Type}数据异常: 没有对应的review数据`),
    )
    return
  }

  const ipcContent = Uint8ArrayToString(res.Content) || ''
  const score = JSON.parse(ipcContent) as AIAgentGrpcApi.AIReviewJudgement
  if (!score?.interactive_id) {
    handleErrorGRPCToLog(
      res.IsSync,
      pushLog,
      genErrorLogData(res.Timestamp, `${res.Type}数据异常: interactive_id:${score?.interactive_id || '-'}`),
    )
    return
  }

  const { interactive_id } = score
  score.levelLabel = AIReviewJudgeLevelMap[score?.level || '']?.label || undefined

  if (info.chatType === 'task') {
    if (
      reviewDetail.type !== AIChatQSDataTypeEnum.TOOL_USE_REVIEW_REQUIRE ||
      reviewDetail.data.id !== score.interactive_id
    ) {
      handleErrorGRPCToLog(
        res.IsSync,
        pushLog,
        genErrorLogData(
          res.Timestamp,
          `${res.Type}数据异常(interactive_id:${score?.interactive_id || '-'})未找到对应review`,
        ),
      )
      return
    }

    if (
      !reviewDetail.data.aiReview ||
      (reviewDetail.data.aiReview && typeof reviewDetail.data.aiReview.seconds === 'undefined')
    ) {
      // aiReview 没有或者 aiReview 的 seconds 为空时可以赋值
      reviewDetail.data.aiReview = cloneDeep(score)
    }
    const isAuto = isAutoExecuteReviewContinue({ getFunc: getRequest })
    if (!isAuto && review?.onReview) review.onReview(cloneDeep(reviewDetail))
  } else if (info.chatType === 'reAct') {
    if (
      reviewDetail.type === AIChatQSDataTypeEnum.TOOL_USE_REVIEW_REQUIRE ||
      reviewDetail.type === AIChatQSDataTypeEnum.EXEC_AIFORGE_REVIEW_REQUIRE
    ) {
      if (
        !reviewDetail.data.aiReview ||
        (reviewDetail.data.aiReview && typeof reviewDetail.data.aiReview.seconds === 'undefined')
      ) {
        reviewDetail.data.aiReview = cloneDeep(score)
      }
    }

    const chatData = getContentMap(interactive_id)
    if (
      !!chatData &&
      (chatData.type === AIChatQSDataTypeEnum.TOOL_USE_REVIEW_REQUIRE ||
        chatData.type === AIChatQSDataTypeEnum.EXEC_AIFORGE_REVIEW_REQUIRE)
    ) {
      if (
        !chatData.data.aiReview ||
        (chatData.data.aiReview && typeof chatData.data.aiReview.seconds === 'undefined')
      ) {
        // aiReview 没有或者 aiReview 的 seconds 为空时可以赋值
        chatData.data.aiReview = cloneDeep(score)
        handleUpdateUISingleState(
          res.IsSync,
          { mapKey: chatData.id, type: chatData.type, chatType: chatData.chatType },
          request.setElements,
        )
      }
    } else {
      handleErrorGRPCToLog(
        res.IsSync,
        pushLog,
        genErrorLogData(
          res.Timestamp,
          `${res.Type}数据(interactive_id:${score?.interactive_id || '-'})未找到对应review`,
        ),
      )
    }
  }
}
/** Type='ai_review_start' AI评分-开始 */
const handleAIReviewStart: AIMessageHandler = (request) => {
  if (request.res.Type !== 'ai_review_start') return
  handleAIReviewJudgement(request)
}
/** Type='ai_review_countdown' AI评分-倒计时 */
const handleAIReviewCountdown: AIMessageHandler = (request) => {
  if (request.res.Type !== 'ai_review_countdown') return
  handleAIReviewJudgement(request)
}
/** Type='ai_review_end' AI评分-结束 */
const handleAIReviewEnd: AIMessageHandler = (request) => {
  if (request.res.Type !== 'ai_review_end') return
  handleAIReviewJudgement(request)
}

/** Type='review_release' review释放通知 */
const handleReviewRelease: AIMessageHandler = (request) => {
  const { res, info, getRequest, setContentMap, getContentMap, pushLog, review } = request
  if (res.Type !== 'review_release') return
  const ipcContent = Uint8ArrayToString(res.Content) || ''
  const data = JSON.parse(ipcContent) as AIAgentGrpcApi.ReviewRelease
  if (!data?.id) {
    handleErrorGRPCToLog(
      res.IsSync,
      pushLog,
      genErrorLogData(res.Timestamp, `${res.Type}数据异常: id:${data?.id || '-'}`),
    )
    return
  }

  if (res.IsSync) {
    const reviewDetail = getContentMap(data.id)
    if (!reviewDetail) {
      reviewReleaseID[data.id] = data
      return
    }
    switch (reviewDetail.type) {
      case AIChatQSDataTypeEnum.TOOL_USE_REVIEW_REQUIRE:
      case AIChatQSDataTypeEnum.EXEC_AIFORGE_REVIEW_REQUIRE:
      case AIChatQSDataTypeEnum.REQUIRE_USER_INTERACTIVE:
      case AIChatQSDataTypeEnum.PLAN_REVIEW_REQUIRE:
      case AIChatQSDataTypeEnum.TASK_REVIEW_REQUIRE:
        reviewDetail.data.selected = JSON.stringify(data.params)
        reviewDetail.data.optionValue = data.params?.suggestion || 'continue'
        handleUpdateUISingleState(
          res.IsSync,
          { mapKey: reviewDetail.id, type: reviewDetail.type, chatType: reviewDetail.chatType },
          request.setElements,
        )
        return
    }
  } else {
    const reviewDetail = review?.handleGetReview?.()
    if (!reviewDetail) return

    const reviewInfo = cloneDeep(reviewDetail?.data) as AIReviewType
    if (reviewInfo?.id !== data.id) {
      handleErrorGRPCToLog(
        res.IsSync,
        pushLog,
        genErrorLogData(
          res.Timestamp,
          `${res.Type}数据(id:${data?.id || '-'})和当前展示review数据(id:${reviewInfo?.id || '-'})不匹配`,
        ),
      )
      return
    }

    reviewInfo.selected = JSON.stringify({ suggestion: 'continue' })
    reviewInfo.optionValue = 'continue'
    const chatData: AIChatQSData = {
      ...reviewDetail,
      data: reviewInfo as any,
    }
    review?.handleSetReview && review.handleSetReview(undefined)
    if (info.chatType === 'task') {
      currentPlanReviewId = ''
      review?.handleReviewDataToUI && review.handleReviewDataToUI(cloneDeep(chatData))
    }
    setContentMap(chatData.id, cloneDeep(chatData))
    handleUpdateUISingleState(
      res.IsSync,
      { mapKey: chatData.id, type: chatData.type, chatType: chatData.chatType },
      request.setElements,
    )

    const isAuto = isAutoExecuteReviewContinue({ type: chatData.type, getFunc: getRequest })
    if (!isAuto) review?.onReviewRelease && review.onReviewRelease(data.id)
  }
}
// #endregion

/** 切换session会话后的重置逻辑 */
export const handleResetForNewSession: () => void = () => {
  ToolResultForStreamError.clear()
  reviewReleaseID = {}
  currentPlanReviewId = ''
}

/**
 * grpc流数据的各种类型处理逻辑集合
 * 该逻辑集合里的方法处理，没有使用try-catch拦截，因为在hook层进行了同一try-catch拦截
 * 注意！别的地方单独使用时，请自行加入try-catch拦截错误
 */
export const grpcAIMessageHandlers: Record<string, AIMessageHandler> = {
  thought: handleThought,
  result: handleResult,
  fail_react_task: handleFailReactTask,
  tool_call_decision: handleToolCallDecision,
  fail_plan_and_execution: handleFailPlanAndExecution,
  tool_call_start: handleToolCallStart,
  tool_call_param: handleToolCallParam,
  tool_call_watcher: handleToolCallWatcher,
  tool_call_log_dir: handleToolCallLogDir,
  tool_call_user_cancel: handleToolCallUserCancel,
  tool_call_done: handleToolCallDone,
  tool_call_error: handleToolCallError,
  tool_call_summary: handleToolCallSummary,
  yak_httpflow_count: handleYakHttpFlow,
  yak_risk_count: handleYakRisk,
  stream_start: handleStreamStart,
  stream: handleStream,
  'stream-finished': handleStreamFinished,
  reference_material: handleReferenceMaterial,
  plan_review_require: handlePlanReview,
  plan_task_analysis: handlePlanReviewAnalysis,
  task_review_require: handleTaskReview,
  tool_use_review_require: handleToolReview,
  require_user_interactive: handleUserInteractive,
  exec_aiforge_review_require: handleAIForgeReviewRequire,
  ai_review_start: handleAIReviewStart,
  ai_review_countdown: handleAIReviewCountdown,
  ai_review_end: handleAIReviewEnd,
  review_release: handleReviewRelease,
  react_task_dequeue: handleReactTaskDequeue,
  api_request_failed: handleApiRequestFailed,
  http_flow_fuzz_status: handleHttpFlowFuzzStatus,
}
