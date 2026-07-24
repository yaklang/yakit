import type { AIMessageHandler, AIMessageHandlerParams } from '../type'
import type { AIAgentGrpcApi } from '../grpcApi'
import { Uint8ArrayToString } from '@/utils/str'
import { genBaseAIChatData, generateTaskNodeDataID, isToolStderrStream, isToolStdoutStream } from '../utils'
import { AIChatQSDataTypeEnum, type AIChatQSData } from '../aiRender'
import { AIStreamContentType, convertNodeIdToVerbose } from '../defaultConstant'
import { aiAgentLogEmitter } from '../AIAgentLogEmitter'
import { v4 as uuidv4 } from 'uuid'
import aiChatPersistStore from '../persist/aiChatPersistStore'
import {
  appendReferenceToContent,
  persistIndependentItem,
  persistToolResultIfTerminal,
  upsertSessionContent,
} from '../persist/contentPersistHelper'

/** 生成stream_group组数据 */
const genStreamGroupData = (
  params: {
    group: string
    tokens: string[]
  } & AIMessageHandlerParams,
) => {
  const { group, tokens, sessionId, res, chatType, rawData, store, meta } = params

  const groupDetail = rawData.contents.get(group)
  // 设置组数据详情
  if (groupDetail && groupDetail.type === AIChatQSDataTypeEnum.STREAM_GROUP) {
    groupDetail.data.lastToken = tokens[tokens.length - 1]
    persistIndependentItem(sessionId, groupDetail)
  } else {
    const chatData: AIChatQSData = {
      id: group,
      chatType: chatType,
      type: AIChatQSDataTypeEnum.STREAM_GROUP,
      data: {
        NodeId: res.NodeId,
        NodeIdVerbose: res.NodeIdVerbose,
        lastToken: tokens[tokens.length - 1],
      },
      TaskId: generateTaskNodeDataID({
        chatType,
        planID: chatType === 'reAct' ? store.getState().currentCasualTaskID : store.getState().taskStatus.taskID,
        taskID: res.TaskId,
        isExist: (key) => rawData.contents.has(key),
      }),
      AIService: '',
      AIModelName: '',
      Timestamp: res.Timestamp,
    }
    rawData.contents.set(group, chatData)
    persistIndependentItem(sessionId, chatData)
  }

  tokens.forEach((mapKey) => {
    const mapValue = rawData.contents.get(mapKey)
    if (!mapValue) return
    mapValue.parentGroupToken = group
    // 流已结束后才入组：需补写 parentGroupToken
    if (mapValue.type === AIChatQSDataTypeEnum.STREAM && mapValue.data.status === 'end') {
      upsertSessionContent(sessionId, mapValue.id, mapValue)
    }
  })
}

const handleStreamStart: AIMessageHandler = (requestInfo) => {
  const { res, chatType, store, rawData, meta } = requestInfo
  if (res.Type !== 'stream_start') return

  if (res.IsSystem || res.IsReason) return

  const { CallToolID, NodeId } = res
  if (!NodeId) return

  const ipcContent = Uint8ArrayToString(res.Content) || ''
  const { event_writer_id } = JSON.parse(ipcContent) as { event_writer_id: string }
  // event_writer_id为空
  if (!event_writer_id) {
    requestInfo.pushLog({ level: 'error', message: `${res.Type}数据异常: ${ipcContent}` })
    return
  }

  // tool-xxx-stderr 数据单独初始化逻辑
  if (isToolStderrStream(NodeId) && CallToolID) {
    if (!CallToolID) {
      requestInfo.pushLog({ level: 'error', message: `${res.Type}数据(NodeId: ${NodeId}), CallToolID 为空` })
      return
    }
    if (!meta.toolStderrStreamData.has(CallToolID)) {
      meta.toolStderrStreamData.set(CallToolID, {
        content: '',
        uuid: event_writer_id,
        status: 'start',
      })
    }
    return
  }
  // tool-xxx-stdout 数据单独初始化逻辑
  if (isToolStdoutStream(NodeId)) {
    if (!CallToolID) {
      requestInfo.pushLog({ level: 'error', message: `${res.Type}数据(NodeId: ${NodeId}), CallToolID 为空` })
      return
    }
    let toolResult = rawData.contents.get(CallToolID)
    if (!toolResult || toolResult.type !== AIChatQSDataTypeEnum.TOOL_RESULT) {
      requestInfo.pushLog({
        level: 'error',
        message: `NodeID: ${NodeId} 的stream数据没有对应的工具结果(CallToolID: ${CallToolID})初始化`,
      })
      return
    }

    rawData.contents.set(event_writer_id, {
      ...genBaseAIChatData(res),
      id: event_writer_id,
      chatType: chatType,
      type: AIChatQSDataTypeEnum.STREAM,
      data: {
        NodeId,
        NodeIdVerbose: res.NodeIdVerbose || convertNodeIdToVerbose(NodeId),
        CallToolID,
        EventUUID: event_writer_id,
        status: 'start',
        content: '',
        ContentType: res.ContentType,
      },
      TaskId: generateTaskNodeDataID({
        chatType,
        planID: chatType === 'reAct' ? store.getState().currentCasualTaskID : store.getState().taskStatus.taskID,
        taskID: res.TaskId,
        isExist: (key) => rawData.contents.has(key),
      }),
    })
    toolResult.data.stream.EventUUID = event_writer_id
    toolResult.data.type = 'stream'
    return
  }

  // 数据集合中对应的数据
  const streamData = rawData.contents.get(event_writer_id)

  // 数据已存在，流数据输出顺序不对, 视为异常
  if (streamData) {
    requestInfo.pushLog({
      level: 'error',
      message: `Stream-NodeId: ${NodeId}, EventUUID: (${event_writer_id}), 已存在对应的数据`,
    })
    return
  }

  rawData.contents.set(event_writer_id, {
    ...genBaseAIChatData(res),
    id: event_writer_id,
    chatType: chatType,
    type: AIChatQSDataTypeEnum.STREAM,
    data: {
      NodeId,
      NodeIdVerbose: res.NodeIdVerbose || convertNodeIdToVerbose(NodeId),
      CallToolID,
      EventUUID: event_writer_id,
      status: 'start',
      content: '',
      ContentType: res.ContentType,
    },
    TaskId: generateTaskNodeDataID({
      chatType,
      planID: chatType === 'reAct' ? store.getState().currentCasualTaskID : store.getState().taskStatus.taskID,
      taskID: res.TaskId,
      isExist: (key) => rawData.contents.has(key),
    }),
  })
}

const handleStream: AIMessageHandler = (requestInfo) => {
  const { res, chatType, store, rawData, meta } = requestInfo
  if (res.Type !== 'stream') return
  // 历史数据-(系统信息|推理信息)数据，不处理
  if (res.IsSync && (res.IsSystem || res.IsReason)) return

  const { CallToolID, EventUUID, NodeId } = res
  const content = (Uint8ArrayToString(res.Content) || '') + (Uint8ArrayToString(res.StreamDelta) || '')
  if (!EventUUID || !NodeId) {
    requestInfo.pushLog({ level: 'error', message: `${res.Type}数据缺失: EventUUID(${EventUUID}) NodeId(${NodeId})` })
    return
  }

  if (res.IsSystem) {
    // 实时数据-系统信息
    const lastUUID = meta.systemEventUUID[meta.systemEventUUID.length - 1]
    if (lastUUID) {
      if (lastUUID === EventUUID) {
        // 由UI进行定时获取渲染(打字机效果)
        rawData.systemStream += content
      } else {
        if (meta.systemEventUUID.includes(EventUUID)) return
        meta.systemEventUUID.push(EventUUID)
        rawData.systemStream = content
      }
    } else {
      meta.systemEventUUID.push(EventUUID)
      rawData.systemStream = content
    }
    store.getState().updateStateCount('updateSystemStream')
    return
  }
  if (res.IsReason) {
    // 实时数据-推理信息-系统信息输出到日志中
    aiAgentLogEmitter.dispatch({
      session: requestInfo.sessionId,
      type: 'stream',
      Timestamp: res.Timestamp,
      stream: {
        NodeId: res.NodeId,
        EventUUID: res.EventUUID,
        content: (Uint8ArrayToString(res.Content) || '') + (Uint8ArrayToString(res.StreamDelta) || ''),
        status: 'start',
      },
    })
    return
  }

  // tool-xxx-stderr 数据单独处理逻辑
  if (isToolStderrStream(NodeId)) {
    if (!CallToolID) {
      requestInfo.pushLog({ level: 'error', message: `${res.Type}数据(NodeId: ${NodeId}), CallToolID 为空` })
      return
    }
    const errorResult = meta.toolStderrStreamData.get(CallToolID)
    if (errorResult) errorResult.content += content
    return
  }
  // tool-xxx-stdout 数据单独处理逻辑
  if (isToolStdoutStream(NodeId)) {
    if (!CallToolID) {
      requestInfo.pushLog({ level: 'error', message: `${res.Type}数据(NodeId: ${NodeId}), CallToolID 为空` })
      return
    }
    const toolResult = rawData.contents.get(CallToolID)
    if (!toolResult || toolResult.type !== AIChatQSDataTypeEnum.TOOL_RESULT || !toolResult.data.stream.EventUUID) {
      requestInfo.pushLog({
        level: 'error',
        message: `Stream-NodeID: ${NodeId} 数据没有对应的工具结果(CallToolID: ${CallToolID})初始化`,
      })
      return
    }
    const toolForStreamData = rawData.contents.get(toolResult.data.stream.EventUUID)
    if (!toolForStreamData || toolForStreamData.type !== AIChatQSDataTypeEnum.STREAM) {
      requestInfo.pushLog({
        level: 'error',
        message: `Stream-EventUUID: ${toolResult.data.stream.EventUUID} 数据没有对应的初始化`,
      })
      return
    }
    const isRender = !toolForStreamData.data.content
    // 这里是直接使用引用设置的值，所以不需要在使用setContentMap设置回去
    toolForStreamData.data.content += content
    if (isRender) {
      // 先确定是UI定时拿数据还是流数据触发渲染，还有就是，UI已经渲染出来工具卡片了吗
      store.getState().incrementNodeVersion(toolForStreamData.id, 'item')
    }
    return
  }

  // 数据集合中对应的数据
  const streamData = rawData.contents.get(EventUUID)

  // 数据不存在
  if (!streamData || streamData.type !== AIChatQSDataTypeEnum.STREAM) {
    requestInfo.pushLog({ level: 'error', message: `Stream-NodeId: ${NodeId}, EventUUID: (${EventUUID}) 数据未初始化` })
    return
  }

  const isRender = !streamData.data.content
  // 下面的设置: 是直接使用引用设置的值，所以不需要在使用setContentMap设置回去
  streamData.Timestamp = isRender ? res.Timestamp : streamData.Timestamp
  streamData.data.content += content

  if (isRender) {
    // 判断是否成为组UI数据展示
    store.getState().dispatchStreamingNode({
      chatType: chatType,
      parentTaskId: streamData.TaskId,
      node: {
        token: streamData.id,
        kind: 'item',
        type: streamData.type,
        isHistory: res.IsSync,
        nodeId: res.ContentType === AIStreamContentType.DEFAULT ? res.NodeId : undefined,
        groupExtra: (group: string, tokens: string[]) => {
          genStreamGroupData({ group, tokens, ...requestInfo })
        },
      },
    })
  }
}

const handleStreamFinished: AIMessageHandler = (requestInfo) => {
  const { res, store, rawData, meta } = requestInfo
  if (res.Type !== 'structured' || res.NodeId !== 'stream-finished') return
  // 历史数据-(系统信息|推理信息)数据，不处理
  if (res.IsSync && (res.IsSystem || res.IsReason)) return

  let ipcContent = Uint8ArrayToString(res.Content) || ''
  const { event_writer_id, node_id, is_reason, is_system } = JSON.parse(ipcContent) as AIAgentGrpcApi.AIStreamFinished
  if (!event_writer_id) {
    requestInfo.pushLog({ level: 'error', message: `stream-finished数据, event_writer_id 为空` })
    return
  }

  // 实时数据-系统信息(不需要结束处理, 由下一个自动顶替)
  if (is_system) return
  // 实时数据-推理信息-系统信息输出到日志中
  if (is_reason) {
    aiAgentLogEmitter.dispatch({
      session: requestInfo.sessionId,
      type: 'stream',
      Timestamp: res.Timestamp,
      stream: {
        NodeId: node_id,
        EventUUID: event_writer_id,
        content: '',
        status: 'end',
      },
    })
    return
  }

  const { CallToolID } = res
  // tool-xxx-stderr 数据单独结束逻辑
  if (isToolStderrStream(node_id)) {
    if (!CallToolID) {
      requestInfo.pushLog({ level: 'error', message: `数据(NodeId: ${node_id}), CallToolID 为空` })
      return
    }

    const toolErrorResult = meta.toolStderrStreamData.get(CallToolID)
    if (!toolErrorResult) {
      requestInfo.pushLog({ level: 'error', message: `NodeId(${node_id})&CallToolID(${CallToolID}) 数据没有初始化` })
      return
    }

    const toolResult = rawData.contents.get(CallToolID)
    if (!toolResult || toolResult.type !== AIChatQSDataTypeEnum.TOOL_RESULT) {
      // 工具执行结果卡片UI没有展示时
      toolErrorResult.status = 'end'
    } else {
      const showUI = store.getState().items[toolResult.id]
      // 这里是直接使用引用设置的值，所以不需要在使用setContentMap设置回去
      toolResult.data.tool.execError = toolErrorResult.content
      if (showUI) store.getState().incrementNodeVersion(toolResult.id, 'item')
      persistToolResultIfTerminal(requestInfo.sessionId, toolResult)
      meta.toolStderrStreamData.delete(CallToolID)
    }
    return
  }
  // tool-xxx-stdout 数据单独结束逻辑
  if (isToolStdoutStream(node_id)) {
    if (!CallToolID) {
      requestInfo.pushLog({ level: 'error', message: `(NodeId: ${node_id})的数据, CallToolID 为空` })
      return
    }

    const toolResult = rawData.contents.get(res.CallToolID)
    if (!toolResult || toolResult.type !== AIChatQSDataTypeEnum.TOOL_RESULT || !toolResult.data.stream.EventUUID) {
      return
    }
    const toolForStreamData = rawData.contents.get(toolResult.data.stream.EventUUID)
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
    store.getState().incrementNodeVersion(toolResult.id, 'item')
    // stdout 流结束：落库该 STREAM；若工具已终态则同步刷新 TOOL_RESULT
    upsertSessionContent(requestInfo.sessionId, toolForStreamData.id, toolForStreamData)
    persistToolResultIfTerminal(requestInfo.sessionId, toolResult)
    return
  }

  // 数据集合中对应的数据
  const streamData = rawData.contents.get(event_writer_id)
  // 数据不存在 不输出到日志，因为日志的流数据也有该类型数据
  if (!streamData || streamData.type !== AIChatQSDataTypeEnum.STREAM) return

  // 这里是直接使用引用设置的值，所以不需要在使用setContentMap设置回去
  streamData.data.status = 'end'
  store.getState().incrementNodeVersion(streamData.id, 'item')
  upsertSessionContent(requestInfo.sessionId, streamData.id, streamData)
}

const handleReferenceMaterial: AIMessageHandler = (requestInfo) => {
  const { sessionId, res, chatType, store, rawData } = requestInfo
  if (res.Type !== 'reference_material') return

  const ipcContent = Uint8ArrayToString(res.Content) || ''
  const data = JSON.parse(ipcContent) as AIAgentGrpcApi.ReferenceMaterialPayload

  const chatData = rawData.contents.get(data.event_uuid)
  const toolResult = rawData.contents.get(res.CallToolID || '')

  // 收数时自动生成 refToken，立刻落表3；内存只挂 token，不存完整 payload
  const refToken = uuidv4()
  aiChatPersistStore.setSessionReference(sessionId, refToken, data).catch(() => {})

  if (chatData) {
    chatData.reference = [...(chatData.reference || []), refToken]
    // STREAM：仅 status=end 后才追加写正文；未 end 只挂内存，等 finished 一并落库
    // 非 STREAM：有内存则立刻 upsert（独立单条晚到参考资料）
    const shouldUpsertContent = chatData.type === AIChatQSDataTypeEnum.STREAM ? chatData.data.status === 'end' : true
    if (shouldUpsertContent) {
      upsertSessionContent(sessionId, chatData.id, chatData)
    }
    if (store.getState().items[chatData.id]) {
      // 属于item元素，已经在UI上渲染了
      store.getState().incrementNodeVersion(chatData.id, 'item')
    } else if (store.getState().groups[chatData.id]) {
      // 属于group元素，已经在UI上渲染了
      store.getState().incrementNodeVersion(chatData.id, 'group')
    } else if (store.getState().tasks[chatData.id]) {
      // 属于task元素，已经在UI上渲染了
      store.getState().incrementNodeVersion(chatData.id, 'task')
    } else if (chatData.type === AIChatQSDataTypeEnum.STREAM) {
      // 属于stream类型数据，但未在UI上渲染
      if (toolResult && isToolStdoutStream(chatData.data.NodeId)) {
        // 特殊情况，更新stdout流对应的工具执行结果卡片UI
        store.getState().incrementNodeVersion(toolResult.id, 'item')
      } else {
        // 触发UI渲染
        store.getState().dispatchStreamingNode({
          chatType: chatType,
          parentTaskId: chatData.TaskId,
          node: {
            token: chatData.id,
            kind: 'item',
            type: chatData.type,
            isHistory: res.IsSync,
            nodeId: chatData.data.ContentType === AIStreamContentType.DEFAULT ? chatData.data.NodeId : undefined,
            groupExtra: (group: string, tokens: string[]) => {
              genStreamGroupData({ group, tokens, ...requestInfo })
            },
          },
        })
      }
      return
    } else {
      // 其余类型，触发UI渲染
      store.getState().dispatchStreamingNode({
        chatType: chatType,
        parentTaskId: chatData.TaskId,
        node: {
          token: chatData.id,
          kind: 'item',
          type: chatData.type,
          isHistory: res.IsSync,
        },
      })
    }
  } else {
    // 数据不存在，直接生成一个参考资料的UI元素
    // 现阶段直接注释，因为UI还没有写入专门的参考资料元素
    // const chatData: AIChatQSData = {
    //   ...genBaseAIChatData(res),
    //   id: refToken,
    //   chatType: chatType,
    //   type: AIChatQSDataTypeEnum.Reference_Material,
    //   data: {
    //     NodeId: res.NodeId,
    //     NodeIdVerbose: res.NodeIdVerbose || convertNodeIdToVerbose(res.NodeId),
    //   },
    //   reference: [refToken],
    //   TaskId: generateTaskNodeDataID({
    //     chatType,
    //     planID: chatType === 'reAct' ? store.getState().currentCasualTaskID : meta.currentTaskPlanID?.taskID,
    //     taskID: res.TaskId,
    //     isExist: (key) => rawData.contents.has(key),
    //   }),
    // }
    // rawData.contents.set(chatData.id, chatData)
    // persistIndependentItem(requestInfo.sessionId, chatData)
    // store.getState().dispatchStreamingNode({
    //   chatType: chatType,
    //   parentTaskId: chatData.TaskId,
    //   node: {
    //     token: chatData.id,
    //     kind: 'item',
    //     type: chatData.type,
    //     isHistory: res.IsSync,
    //   },
    // })
  }
}
// #endregion

/** stream数据相关处理逻辑集合 */
export const aiStreamDataHandlers = {
  stream_start: handleStreamStart,
  stream: handleStream,
  'stream-finished': handleStreamFinished,
  reference_material: handleReferenceMaterial,
} as const
