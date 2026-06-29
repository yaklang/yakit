import type { AIMessageHandler } from '../type'
import type { AIAgentGrpcApi, AIOutputEvent } from '../grpcApi'
import { Uint8ArrayToString } from '@/utils/str'
import {
  genBaseAIChatData,
  generateTaskNodeDataID,
  pushLogToOtherWindow,
  isToolStderrStream,
  isToolStdoutStream,
} from '../utils'
import { type AIChatQSData, AIChatQSDataTypeEnum } from '../aiRender'
import { convertNodeIdToVerbose } from '../defaultConstant'
import { aiAgentLogEmitter } from '../AIAgentLogEmitter'

const handleStreamStart: AIMessageHandler = (requestInfo) => {
  const { res, chatType, rawData, meta } = requestInfo
  if (res.Type !== 'stream_start') return

  if (res.IsSystem || res.IsReason) return

  const { CallToolID, NodeId } = res
  if (!NodeId) return

  const ipcContent = Uint8ArrayToString(res.Content) || ''
  const { event_writer_id } = JSON.parse(ipcContent) as { event_writer_id: string }
  // event_writer_id为空
  if (!event_writer_id) {
    pushLogToOtherWindow({
      sessionId: requestInfo.sessionId,
      isHistory: res.IsSync,
      Timestamp: res.Timestamp,
      level: 'error',
      message: `${res.Type}数据异常: ${ipcContent}`,
    })
    return
  }

  // tool-xxx-stderr 数据单独初始化逻辑
  if (isToolStderrStream(NodeId) && CallToolID) {
    if (!CallToolID) {
      pushLogToOtherWindow({
        sessionId: requestInfo.sessionId,
        isHistory: res.IsSync,
        Timestamp: res.Timestamp,
        level: 'error',
        message: `${res.Type}数据(NodeId: ${NodeId}), CallToolID 为空`,
      })
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
      pushLogToOtherWindow({
        sessionId: requestInfo.sessionId,
        isHistory: res.IsSync,
        Timestamp: res.Timestamp,
        level: 'error',
        message: `${res.Type}数据(NodeId: ${NodeId}), CallToolID 为空`,
      })
      return
    }
    let toolResult = rawData.contents.get(CallToolID)
    if (!toolResult || toolResult.type !== AIChatQSDataTypeEnum.TOOL_RESULT) {
      pushLogToOtherWindow({
        sessionId: requestInfo.sessionId,
        isHistory: res.IsSync,
        Timestamp: res.Timestamp,
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
      taskIndex: generateTaskNodeDataID({
        chatType,
        planID: meta.currentTaskPlanID?.taskID,
        taskID: res.TaskIndex,
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
    pushLogToOtherWindow({
      sessionId: requestInfo.sessionId,
      isHistory: res.IsSync,
      Timestamp: res.Timestamp,
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
    taskIndex: generateTaskNodeDataID({
      chatType,
      planID: meta.currentTaskPlanID?.taskID,
      taskID: res.TaskIndex,
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
    pushLogToOtherWindow({
      sessionId: requestInfo.sessionId,
      isHistory: res.IsSync,
      Timestamp: res.Timestamp,
      level: 'error',
      message: `${res.Type}数据缺失: EventUUID(${EventUUID}) NodeId(${NodeId})`,
    })
    return
  }

  if (res.IsSystem) {
    // 实时数据-系统信息
    const lastUUID = meta.systemEventUUID[meta.systemEventUUID.length - 1]
    if (lastUUID) {
      if (lastUUID === EventUUID) {
        // 由UI进行定时获取渲染(打字机效果)
        rawData.systemStream += content
        store.getState().updateStateCount('updateSystemStream')
      } else {
        if (meta.systemEventUUID.includes(EventUUID)) return
        meta.systemEventUUID.push(EventUUID)
        rawData.systemStream = content
        store.getState().updateStateCount('updateSystemStream')
      }
    } else {
      meta.systemEventUUID.push(EventUUID)
      rawData.systemStream = content
      store.getState().updateStateCount('updateSystemStream')
    }
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
      pushLogToOtherWindow({
        sessionId: requestInfo.sessionId,
        isHistory: res.IsSync,
        Timestamp: res.Timestamp,
        level: 'error',
        message: `${res.Type}数据(NodeId: ${NodeId}), CallToolID 为空`,
      })
      return
    }
    const errorResult = meta.toolStderrStreamData.get(CallToolID)
    if (errorResult) errorResult.content += content
    return
  }
  // tool-xxx-stdout 数据单独处理逻辑
  if (isToolStdoutStream(NodeId)) {
    if (!CallToolID) {
      pushLogToOtherWindow({
        sessionId: requestInfo.sessionId,
        isHistory: res.IsSync,
        Timestamp: res.Timestamp,
        level: 'error',
        message: `${res.Type}数据(NodeId: ${NodeId}), CallToolID 为空`,
      })
      return
    }
    const toolResult = rawData.contents.get(CallToolID)
    if (!toolResult || toolResult.type !== AIChatQSDataTypeEnum.TOOL_RESULT || !toolResult.data.stream.EventUUID) {
      pushLogToOtherWindow({
        sessionId: requestInfo.sessionId,
        isHistory: res.IsSync,
        Timestamp: res.Timestamp,
        level: 'error',
        message: `Stream-NodeID: ${NodeId} 数据没有对应的工具结果(CallToolID: ${CallToolID})初始化`,
      })
      return
    }
    const toolForStreamData = rawData.contents.get(toolResult.data.stream.EventUUID)
    if (!toolForStreamData || toolForStreamData.type !== AIChatQSDataTypeEnum.STREAM) {
      pushLogToOtherWindow({
        sessionId: requestInfo.sessionId,
        isHistory: res.IsSync,
        Timestamp: res.Timestamp,
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
    pushLogToOtherWindow({
      sessionId: requestInfo.sessionId,
      isHistory: res.IsSync,
      Timestamp: res.Timestamp,
      level: 'error',
      message: `Stream-NodeId: ${NodeId}, EventUUID: (${EventUUID}) 数据未初始化`,
    })
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
      parentTaskId: streamData.taskIndex,
      node: {
        token: streamData.id,
        kind: 'item',
        type: streamData.type,
        dataOrigin: res.IsSync ? 'grpc_history_data' : 'grpc_realtime_data',
      },
      groupTokenGenerator: () => '',
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
    pushLogToOtherWindow({
      sessionId: requestInfo.sessionId,
      isHistory: res.IsSync,
      Timestamp: res.Timestamp,
      level: 'error',
      message: `stream-finished数据, event_writer_id 为空`,
    })
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
      pushLogToOtherWindow({
        sessionId: requestInfo.sessionId,
        isHistory: res.IsSync,
        Timestamp: res.Timestamp,
        level: 'error',
        message: `数据(NodeId: ${node_id}), CallToolID 为空`,
      })
      return
    }

    const toolErrorResult = meta.toolStderrStreamData.get(CallToolID)
    if (!toolErrorResult) {
      pushLogToOtherWindow({
        sessionId: requestInfo.sessionId,
        isHistory: res.IsSync,
        Timestamp: res.Timestamp,
        level: 'error',
        message: `NodeId(${node_id})&CallToolID(${CallToolID}) 数据没有初始化`,
      })
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
      meta.toolStderrStreamData.delete(CallToolID)
    }
    return
  }
  // tool-xxx-stdout 数据单独结束逻辑
  if (isToolStdoutStream(node_id)) {
    if (!CallToolID) {
      pushLogToOtherWindow({
        sessionId: requestInfo.sessionId,
        isHistory: res.IsSync,
        Timestamp: res.Timestamp,
        level: 'error',
        message: `(NodeId: ${node_id})的数据, CallToolID 为空`,
      })
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
    return
  }

  // 数据集合中对应的数据
  const streamData = rawData.contents.get(event_writer_id)
  // 数据不存在 不输出到日志，因为日志的流数据也有该类型数据
  if (!streamData || streamData.type !== AIChatQSDataTypeEnum.STREAM) return

  // 这里是直接使用引用设置的值，所以不需要在使用setContentMap设置回去
  streamData.data.status = 'end'
  store.getState().incrementNodeVersion(streamData.id, 'item')
}

const handleReferenceMaterial: AIMessageHandler = (requestInfo) => {
  const { res, chatType, store, rawData, request, meta } = requestInfo
  if (res.Type !== 'reference_material') return

  const ipcContent = Uint8ArrayToString(res.Content) || ''
  const data = JSON.parse(ipcContent) as AIAgentGrpcApi.ReferenceMaterialPayload

  const chatData = rawData.contents.get(data.event_uuid)
  const toolResult = rawData.contents.get(res.CallToolID || '')
  if (chatData) {
    // 下面的设置: 是直接使用引用设置的值，所以不需要在使用setContentMap设置回去
    chatData.reference = (chatData.reference || []).concat([data])
    if (chatData.parentGroupKey) {
      store.getState().dispatchStreamingNode({
        chatType: chatType,
        parentTaskId: chatData.taskIndex,
        node: {
          token: chatData.id,
          kind: 'item',
          type: chatData.type,
          dataOrigin: res.IsSync ? 'grpc_history_data' : 'grpc_realtime_data',
        },
        groupTokenGenerator: () => '',
      })
    } else if (chatData.type === AIChatQSDataTypeEnum.STREAM) {
      if (toolResult && isToolStdoutStream(chatData.data.NodeId)) {
        // 特殊情况，更新stdout流对应的工具执行结果卡片UI
        store.getState().incrementNodeVersion(toolResult.id, 'item')
      } else {
        store.getState().dispatchStreamingNode({
          chatType: chatType,
          parentTaskId: chatData.taskIndex,
          node: {
            token: chatData.id,
            kind: 'item',
            type: chatData.type,
            dataOrigin: res.IsSync ? 'grpc_history_data' : 'grpc_realtime_data',
          },
          groupTokenGenerator: () => '',
        })
      }
      return
    } else {
      store.getState().dispatchStreamingNode({
        chatType: chatType,
        parentTaskId: chatData.taskIndex,
        node: {
          token: chatData.id,
          kind: 'item',
          type: chatData.type,
          dataOrigin: res.IsSync ? 'grpc_history_data' : 'grpc_realtime_data',
        },
        groupTokenGenerator: () => '',
      })
    }
  } else if (
    toolResult &&
    toolResult.type === AIChatQSDataTypeEnum.TOOL_RESULT &&
    toolResult.data.stream.EventUUID === data.event_uuid
  ) {
    toolResult.reference = (toolResult.reference || []).concat([data])
    store.getState().incrementNodeVersion(toolResult.id, 'item')
  } else {
    const chatData: AIChatQSData = {
      ...genBaseAIChatData(res),
      id: data.event_uuid,
      chatType: chatType,
      type: AIChatQSDataTypeEnum.Reference_Material,
      data: {
        NodeId: res.NodeId,
        NodeIdVerbose: res.NodeIdVerbose || convertNodeIdToVerbose(res.NodeId),
      },
      reference: [data],
      taskIndex: generateTaskNodeDataID({
        chatType,
        planID: meta.currentTaskPlanID?.taskID,
        taskID: res.TaskIndex,
        isExist: (key) => rawData.contents.has(key),
      }),
    }
    rawData.contents.set(chatData.id, chatData)
    store.getState().dispatchStreamingNode({
      chatType: chatType,
      parentTaskId: chatData.taskIndex,
      node: {
        token: chatData.id,
        kind: 'item',
        type: chatData.type,
        dataOrigin: res.IsSync ? 'grpc_history_data' : 'grpc_realtime_data',
      },
      groupTokenGenerator: () => '',
    })
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

const exampleHandle = (res: AIOutputEvent) => {
  let funcKey = res.Type
  if (res.Type === 'structured' && ['stream-finished'].includes(res.NodeId)) {
    // stream数据结束标识
    funcKey = res.NodeId
  }
}
