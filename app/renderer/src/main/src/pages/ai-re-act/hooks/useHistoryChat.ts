import { useCreation, useGetState, useMemoizedFn } from 'ahooks'
import type {
  AIFileSystemPin,
  loadMoreType,
  UpdateRenderDataParams,
  UseHistoryChatEvents,
  UseHistoryChatParams,
  UseHistoryChatState,
} from './type'
import { grpcQueryAIEvent } from '@/pages/ai-agent/grpc'
import type { PaginationSchema } from '@/pages/invoker/schema'
import { yakitNotify } from '@/utils/notification'
import { AITaskStatus, type AIAgentGrpcApi, type AIEventQueryRequest, type AIOutputEvent } from './grpcApi'
import { Uint8ArrayToString } from '@/utils/str'
import { useRef, useState } from 'react'
import {
  AIChatQSDataTypeEnum,
  ReActChatGroupElement,
  ReActChatRenderItem,
  type AIChatQSData,
  type AIChatQSDataType,
} from './aiRender'
import { genBaseAIChatData, isToolStderrStream, isToolStdoutStream } from './utils'
import {
  AIStreamContentType,
  convertNodeIdToVerbose,
  DefaultAIToolResult,
  DefaultToolResultSummary,
} from './defaultConstant'
import cloneDeep from 'lodash/cloneDeep'
import { v4 as uuidv4 } from 'uuid'
import useGetSetState from '@/pages/pluginHub/hooks/useGetSetState'

const DefaultHistoryPagination: PaginationSchema = { Page: 1, Limit: 200, OrderBy: 'created_at', Order: 'desc' }

function useHistoryChat(params?: UseHistoryChatParams): [UseHistoryChatState, UseHistoryChatEvents]

function useHistoryChat(params?: UseHistoryChatParams) {
  const {
    getChatDataStore,
    setTimelines,
    setGrpcFiles,
    setCasualElements,
    getCasualElements,
    setTaskElements,
    getTaskElements,
  } = params || {}

  // 更新当前session的历史数据请求基线(beforeID)
  const updateBeforeID = useMemoizedFn((type: loadMoreType, chatID: string) => {
    const dataStore = getChatDataStore?.()
    if (dataStore && dataStore.beforeID) {
      dataStore.beforeID[type] = chatID
    }
  })

  // #region 历史数据-时间线
  const [timelinesLoading, setTimelinesLoading, getTimelinesLoading] = useGetSetState(false)
  const hasMoreTimeline = useRef(true)
  const getTimelineBeforeID = useMemoizedFn(() => {
    return getChatDataStore?.()?.beforeID?.timelineID || undefined
  })
  const handleHistoryTimelines = useMemoizedFn(async (session: string) => {
    if (getTimelinesLoading()) return
    if (!hasMoreTimeline.current) return
    if (getTimelinesLoading()) return

    if (!session) {
      yakitNotify('error', '会话ID不存在，无法获取历史聊天记录')
      return
    }

    const request: AIEventQueryRequest = {
      Filter: { SessionID: session, NodeId: ['timeline_item'] },
      Pagination: { ...DefaultHistoryPagination },
    }
    if (getTimelineBeforeID()) {
      request.Pagination!.BeforeId = Number(getTimelineBeforeID())
    }
    setTimelinesLoading(true)
    try {
      const { Events, Total } = await grpcQueryAIEvent(request, true)
      if (Number(Total) === 0) {
        hasMoreTimeline.current = false
        return
      }

      updateBeforeID('timelineID', `${Events[Events.length - 1].ID}`)
      const timelineItems: AIAgentGrpcApi.TimelineItem[] = Events.map((item) => {
        let ipcContent = Uint8ArrayToString(item.Content) || ''
        return JSON.parse(ipcContent) as AIAgentGrpcApi.TimelineItem
      }).reverse()
      hasMoreTimeline.current = Events.length === request.Pagination?.Limit!
      setTimelines?.((old) => [...timelineItems, ...old])
    } catch {
    } finally {
      setTimeout(() => {
        setTimelinesLoading(false)
      }, 200)
    }
  })
  // #endregion

  // #region 历史数据-运行产生的文件记录
  const handleHistoryFileSystem = useMemoizedFn(async (session: string) => {
    if (!session) {
      yakitNotify('error', '会话ID不存在，无法获取历史聊天记录')
      return
    }

    const request: AIEventQueryRequest = {
      Filter: { SessionID: session, EventType: ['filesystem_pin_directory', 'filesystem_pin_filename'] },
      Pagination: { ...DefaultHistoryPagination, Limit: -1 },
    }
    try {
      const { Events, Total } = await grpcQueryAIEvent(request)
      if (Total === 0) return

      const files: AIFileSystemPin[] = Events.map((item) => {
        let ipcContent = Uint8ArrayToString(item.Content) || ''
        const { path } = JSON.parse(ipcContent) as AIAgentGrpcApi.FileSystemPin
        return { path, isFolder: item.Type === 'filesystem_pin_directory' }
      })
      // 去重
      const filterFiles: AIFileSystemPin[] = [...new Map(files.map((item) => [item.path, item])).values()]
      setGrpcFiles?.((old) => [...filterFiles, ...old])
    } catch {}
  })
  // #endregion

  // #region 历史数据-数据的更新相关方法
  const getCasualContentMap = useMemoizedFn((mapKey: string) => {
    const contentMap = getChatDataStore?.()?.casualChat?.contents
    if (!contentMap) return undefined
    return contentMap.get(mapKey)
  })
  const setCasualContentMap = useMemoizedFn((mapKey: string, value: AIChatQSData) => {
    const contentMap = getChatDataStore?.()?.casualChat?.contents
    contentMap && contentMap.set(mapKey, value)
  })

  const getTaskContentMap = useMemoizedFn((mapKey: string) => {
    const contentMap = getChatDataStore?.()?.taskChat?.contents
    if (!contentMap) return undefined
    return contentMap.get(mapKey)
  })
  const setTaskContentMap = useMemoizedFn((mapKey: string, value: AIChatQSData) => {
    const contentMap = getChatDataStore?.()?.taskChat?.contents
    contentMap && contentMap.set(mapKey, value)
  })

  /** 本轮请求数据解析成渲染数据的临时存放数组 */
  const tempCasualElements = useRef<ReActChatRenderItem[]>([])
  /** 本轮请求数据解析成渲染数据已更新至UI上， */
  const parsedCasualElements = useRef<{ main: UpdateRenderDataParams; sub?: UpdateRenderDataParams }[]>([])
  const handleParseCasual = useMemoizedFn((params: UpdateRenderDataParams) => {
    if (!getCasualElements) return

    const { mapKey, type } = params

    const renderTarget = getCasualElements().findIndex((item) => item.token === mapKey && item.type === type)
    if (renderTarget >= 0) {
      parsedCasualElements.current.unshift({ main: params })
      return
    }

    const unRenderTarget = tempCasualElements.current.findIndex((item) => item.token === mapKey && item.type === type)
    // 如果 unRenderTarget>=0，说明已经存在tempCasualElements里面，里面的数据还没有渲染，就不需要对renderNum+1了
    if (unRenderTarget < 0) {
      tempCasualElements.current.unshift({ chatType: 'reAct', token: mapKey, type, renderNum: 1 })
      return
    }
  })
  const handleParseGroupCasual = useMemoizedFn(
    (params: { main: UpdateRenderDataParams; sub: UpdateRenderDataParams }) => {
      if (!getCasualElements) return

      const { main, sub } = params

      const renderTarget = getCasualElements().find((item) => item.token === main.mapKey && item.type === main.type)
      if (renderTarget) {
        parsedCasualElements.current.unshift({ ...params })
        return
      }

      const unRenderTarget = tempCasualElements.current.find(
        (item) => item.token === main.mapKey && item.type === main.type,
      )
      // 如果 unRenderTarget存在，说明已经存在tempCasualElements里面，里面的数据还没有渲染，就不需要对renderNum+1了
      if (unRenderTarget) {
        if (!unRenderTarget.isGroup) return
        const unRenderSubTarget = unRenderTarget.children.find(
          (item) => item.token === sub.mapKey && item.type === sub.type,
        )
        if (!unRenderSubTarget)
          unRenderTarget.children.unshift({
            chatType: 'reAct',
            token: sub.mapKey,
            type: sub.type,
            renderNum: 1,
          })
      } else {
        const info: ReActChatRenderItem = {
          chatType: 'reAct',
          token: main.mapKey,
          type: main.type,
          renderNum: 1,
          isGroup: true,
          children: [{ chatType: 'reAct', token: sub.mapKey, type: sub.type, renderNum: 1 }],
        }
        tempCasualElements.current.unshift(info)
        for (let el of info.children) {
          const subData = getCasualContentMap(el.token)
          if (subData) subData.parentGroupKey = main.mapKey
        }
      }
    },
  )

  /** 是否因为没有可更新的渲染数据，再次主动触发请求 */
  const isUpdateCasual = useRef(false)
  const updateCasualElement = useMemoizedFn((session: string) => {
    if (!setCasualElements) return
    if (
      (!tempCasualElements.current.length || tempCasualElements.current.length === 1) &&
      !parsedCasualElements.current.length
    ) {
      isUpdateCasual.current = true
      handleLoadMore('chatID', session)
      return
    }
    try {
      setCasualElements((old) => {
        let newArr = [...old]
        // 更新已渲染数据
        for (let el of parsedCasualElements.current) {
          const target = newArr.find((item) => item.token === el.main.mapKey && item.type === el.main.type)
          if (target) {
            if (target.isGroup && el.sub) {
              const subTarget = target.children.find(
                (item) => item.token === el.sub?.mapKey && item.type === el.sub?.type,
              )
              if (subTarget) {
                subTarget.renderNum += 1
              } else {
                target.children.unshift({
                  chatType: 'reAct',
                  token: el.sub?.mapKey,
                  type: el.sub?.type,
                  renderNum: 1,
                })
              }
            } else if (!target.isGroup && !el.sub) {
              target.renderNum += 1
            }
          }
        }
        parsedCasualElements.current = []

        if (tempCasualElements.current.length) {
          if (tempCasualElements.current[0].type === AIChatQSDataTypeEnum.STREAM) {
            const beforeArr = tempCasualElements.current.slice(1)
            newArr = [...beforeArr, ...newArr]
            tempCasualElements.current = [tempCasualElements.current[0]]
          } else {
            newArr = [...tempCasualElements.current, ...newArr]
            tempCasualElements.current = []
          }
        }
        tempCasualElements.current = []

        return newArr
      })
    } catch (error) {}
  })
  // TODO 没有调整逻辑，无法直接使用
  const updateTaskElement = useMemoizedFn((main: UpdateRenderDataParams, sub?: UpdateRenderDataParams) => {
    if (!getTaskElements || !setTaskElements) return
    // 先判断该项是否存在
    const target = getTaskElements().findIndex(
      (item) => item.token === main.mapKey && item.type === main.type && (sub ? item.isGroup : true),
    )
    try {
      if (target >= 0) {
        const newArr = [...getTaskElements()]

        const item = newArr[target]
        const newItem = { ...item, renderNum: item.renderNum + 1 }
        newArr[target] = newItem

        if (!sub || !newItem.isGroup) {
          setTaskElements(newArr)
          return newArr
        }
        const newChildren = [...newItem.children]
        const subIndex = newChildren.findIndex((item) => item.token === sub.mapKey && item.type === sub.type)
        if (subIndex >= 0) {
          newChildren[subIndex] = {
            ...newChildren[subIndex],
            renderNum: newChildren[subIndex].renderNum + 1,
          }
        } else {
          newChildren.unshift({
            chatType: 'task',
            token: sub.mapKey,
            type: sub.type,
            renderNum: 1,
          })
        }
        newItem.children = newChildren
        setTaskElements(newArr)
      } else {
        if (sub) {
          setTaskElements((old) => [
            {
              chatType: 'task',
              token: main.mapKey,
              type: main.type,
              renderNum: 1,
              isGroup: true,
              children: [{ chatType: 'task', token: sub.mapKey, type: sub.type, renderNum: 1 }],
            },
            ...old,
          ])
        } else {
          setTaskElements((old) => [{ chatType: 'task', token: main.mapKey, type: main.type, renderNum: 1 }, ...old])
        }
      }
    } catch (error) {}
  })
  // #endregion

  // #region 历史数据-会话数据的组装相关逻辑
  /** 可能成为分组UI */
  const handleParseIsGroup = useMemoizedFn(
    (params: {
      mapKey: string
      type: AIChatQSDataType
      nodeID: AIOutputEvent['NodeId']
      contentType: AIOutputEvent['ContentType']
    }) => {
      const { mapKey, type, nodeID, contentType } = params

      // 查看要更新的数据类型是否符合 || 没有任何渲染数据时直接渲染
      if (contentType !== AIStreamContentType.DEFAULT || !tempCasualElements.current.length) {
        handleParseCasual({ mapKey, type })
        return
      }
      // 看看已有数据是否符合分组条件
      const beforeEl = tempCasualElements.current[0]
      if (beforeEl.token === mapKey && beforeEl.type === type) {
        if (beforeEl.isGroup) {
          handleParseGroupCasual({ main: { mapKey, type }, sub: { mapKey, type } })
        } else {
          handleParseCasual({ mapKey, type })
        }
        return
      }
      // 获取beforeEl的详细信息
      const beforeData = getCasualContentMap(beforeEl.token)
      if (!beforeData || beforeData.type !== AIChatQSDataTypeEnum.STREAM) {
        handleParseCasual({ mapKey, type })
        return
      }

      if (beforeEl.type === AIChatQSDataTypeEnum.STREAM && !beforeEl.isGroup) {
        if (beforeData.data.NodeId === nodeID) {
          tempCasualElements.current.shift()
          // 命中单项，准备整合成组数据，将原有单项的token当成组token
          const groupInfo: ReActChatGroupElement = {
            chatType: 'reAct',
            token: beforeEl.token,
            type: AIChatQSDataTypeEnum.STREAM_GROUP,
            renderNum: 1,
            isGroup: true,
            children: [{ chatType: 'reAct', token: mapKey, type: type, renderNum: 1 }, cloneDeep(beforeEl)],
          }
          const arr = groupInfo.children.map((item) => item.token)
          for (let el of arr) {
            const info = getCasualContentMap(el)
            if (info) info.parentGroupKey = beforeEl.token
          }
          tempCasualElements.current.unshift(groupInfo)
        } else {
          handleParseCasual({ mapKey, type })
        }
      } else if (beforeEl.type === AIChatQSDataTypeEnum.STREAM_GROUP && beforeEl.isGroup) {
        if (beforeData.data.NodeId === nodeID) {
          const subData = getCasualContentMap(mapKey)
          if (subData) subData.parentGroupKey = beforeEl.token
          handleParseGroupCasual({ main: { mapKey: beforeEl.token, type: beforeEl.type }, sub: { mapKey, type } })
        } else {
          handleParseCasual({ mapKey, type })
        }
      } else {
        handleParseCasual({ mapKey, type })
      }
    },
  )

  /**
   * - 存放 Type:stream NodeId:tool-xxx-stderr 的内容数据
   * - call_tool_id => {content:string uuid:string status:"start" | "end"}
   * - 当stream-finished触发后，将内容全部设置到工具结果对象中的execError字段中
   * - 本NodeId和stream类型中的其他NodeId有一样的后端逻辑，但是前端需要将其区分出来
   */
  const streamToToolResultError = useRef<Map<string, { content: string; uuid: string; status: 'start' | 'end' }>>(
    new Map(),
  )
  /**
   * 记录任务规划里叶子任务的执行结果状态
   * task_uuid=>status
   */
  const taskUUIDToStatus = useRef<Map<string, AITaskStatus | undefined>>(new Map())

  // 解析数据方法
  const handleChatData = useMemoizedFn((res: AIOutputEvent[]) => {
    for (let item of res) {
      try {
        let ipcContent = Uint8ArrayToString(item.Content) || ''

        if (item.Type === 'thought') {
          const { thought } = (JSON.parse(ipcContent) as AIAgentGrpcApi.AIChatThought) || {}

          const chatData: AIChatQSData = {
            ...genBaseAIChatData(item),
            chatType: 'reAct',
            type: AIChatQSDataTypeEnum.THOUGHT,
            data: thought || '',
          }
          setCasualContentMap(chatData.id, chatData)
          handleParseCasual({ mapKey: chatData.id, type: chatData.type })
          continue
        }
        if (item.Type === 'result') {
          const { result, after_stream } = (JSON.parse(ipcContent) as AIAgentGrpcApi.AIChatResult) || {}
          if (!!after_stream) continue

          const chatData: AIChatQSData = {
            ...genBaseAIChatData(item),
            chatType: 'reAct',
            type: AIChatQSDataTypeEnum.THOUGHT,
            data: result || '',
          }
          setCasualContentMap(chatData.id, chatData)
          handleParseCasual({ mapKey: chatData.id, type: chatData.type })
          continue
        }
        if (item.Type === 'fail_react_task') {
          const chatData: AIChatQSData = {
            ...genBaseAIChatData(item),
            chatType: 'reAct',
            type: AIChatQSDataTypeEnum.FAIL_REACT,
            data: {
              content: ipcContent,
              NodeId: item.NodeId,
              NodeIdVerbose: item.NodeIdVerbose || convertNodeIdToVerbose(item.NodeId),
            },
          }
          setCasualContentMap(chatData.id, chatData)
          handleParseCasual({ mapKey: chatData.id, type: chatData.type })
          continue
        }

        if (item.Type === 'tool_call_start') {
          const { call_tool_id, tool, start_time, start_time_ms } = JSON.parse(ipcContent) as AIAgentGrpcApi.AIToolCall
          if (!call_tool_id) continue

          let toolResult = getCasualContentMap(call_tool_id)
          if (toolResult && toolResult.type !== AIChatQSDataTypeEnum.TOOL_RESULT) continue
          let isNew = false
          if (!toolResult) {
            isNew = true
            toolResult = {
              ...genBaseAIChatData(item),
              id: call_tool_id,
              chatType: 'reAct',
              type: AIChatQSDataTypeEnum.TOOL_RESULT,
              data: {
                ...cloneDeep(DefaultAIToolResult),
                type: '',
                TaskIndex: item.TaskIndex || undefined,
                callToolId: call_tool_id,
              },
            }
          }

          toolResult.data.toolName = tool?.name || '-'
          toolResult.data.toolDescription = tool?.description || ''
          toolResult.data.startTime = start_time || 0
          toolResult.data.startTimeMS = start_time_ms || 0
          if (isNew) setCasualContentMap(toolResult.id, toolResult)
          if (toolResult.data.type) handleParseCasual({ mapKey: toolResult.id, type: toolResult.type })
          continue
        }
        if (item.Type === 'tool_call_param') {
          const { call_tool_id, params } = JSON.parse(ipcContent) as AIAgentGrpcApi.AIToolCallParams
          if (!call_tool_id) continue
          let toolResult = getCasualContentMap(call_tool_id)
          if (toolResult && toolResult.type !== AIChatQSDataTypeEnum.TOOL_RESULT) continue
          let isNew = false
          if (!toolResult) {
            isNew = true
            toolResult = {
              ...genBaseAIChatData(item),
              id: call_tool_id,
              chatType: 'reAct',
              type: AIChatQSDataTypeEnum.TOOL_RESULT,
              data: {
                ...cloneDeep(DefaultAIToolResult),
                type: 'result',
                TaskIndex: item.TaskIndex || undefined,
                callToolId: call_tool_id,
              },
            }
          }

          toolResult.data.tool.reviewParams = cloneDeep(params)
          if (isNew) setCasualContentMap(toolResult.id, toolResult)
          if (toolResult.data.type) handleParseCasual({ mapKey: toolResult.id, type: toolResult.type })
          continue
        }

        if (item.Type === 'stream_start') {
          // 因为数据已经通过stream-finish构建了，而该条数据是正序初始化，所以无用了
          continue
        }
        if (item.Type === 'stream') {
          // 属于日志数据的不进入UI展示
          if (item.IsSystem || item.IsReason) continue

          const { CallToolID, EventUUID, NodeId } = item
          if (!EventUUID || !NodeId) continue
          const content = (Uint8ArrayToString(item.Content) || '') + (Uint8ArrayToString(item.StreamDelta) || '')

          // tool-xxx-stderr 数据单独处理逻辑
          if (isToolStderrStream(NodeId)) {
            if (!CallToolID) continue
            const toolResult = getCasualContentMap(CallToolID)
            const errorStream = streamToToolResultError.current.get(CallToolID)
            if (toolResult && toolResult.type === AIChatQSDataTypeEnum.TOOL_RESULT) {
              toolResult.data.tool.execError = errorStream?.content ? errorStream.content + content : content
              streamToToolResultError.current.delete(CallToolID)
              if (toolResult.data.tool.status === 'default') {
                handleParseCasual({ mapKey: toolResult.id, type: toolResult.type })
              }
            } else {
              streamToToolResultError.current.set(CallToolID, {
                content: errorStream?.content ? errorStream?.content + content : content,
                uuid: EventUUID,
                status: 'end',
              })
            }
            continue
          }
          // tool-xxx-stdout 数据单独处理逻辑
          if (isToolStdoutStream(NodeId)) {
            if (!CallToolID) continue

            let toolResult = getCasualContentMap(CallToolID)
            // 工具结果类型不符合
            if (toolResult && toolResult.type !== AIChatQSDataTypeEnum.TOOL_RESULT) continue
            // 工具结果里stream的EventUUID不匹配
            if (toolResult && toolResult.data.stream.EventUUID && toolResult.data.stream.EventUUID !== EventUUID) {
              continue
            }

            let isToolNew = false
            if (!toolResult) {
              isToolNew = true
              toolResult = {
                ...genBaseAIChatData(item),
                id: CallToolID,
                chatType: 'reAct',
                type: AIChatQSDataTypeEnum.TOOL_RESULT,
                data: {
                  ...cloneDeep(DefaultAIToolResult),
                  type: 'stream',
                  TaskIndex: item.TaskIndex || undefined,
                  callToolId: CallToolID,
                  stream: { EventUUID: EventUUID },
                },
              }
            }
            if (isToolNew) setCasualContentMap(toolResult.id, toolResult)

            let toolForStreamData = getCasualContentMap(EventUUID)
            if (toolForStreamData && toolForStreamData.type !== AIChatQSDataTypeEnum.STREAM) continue
            let isStreamNew = false
            if (!toolForStreamData) {
              isStreamNew = true
              toolForStreamData = {
                ...genBaseAIChatData(item),
                id: EventUUID,
                chatType: 'reAct',
                type: AIChatQSDataTypeEnum.STREAM,
                data: {
                  NodeId: NodeId,
                  NodeIdVerbose: item.NodeIdVerbose || convertNodeIdToVerbose(NodeId),
                  TaskIndex: item.TaskIndex,
                  CallToolID,
                  EventUUID: EventUUID,
                  status: 'start',
                  content: '',
                  ContentType: item.ContentType,
                },
              }
            }

            // 这里是直接使用引用设置的值，所以不需要在使用setContentMap设置回去
            toolForStreamData.data.NodeIdVerbose = item.NodeIdVerbose || convertNodeIdToVerbose(NodeId)
            toolForStreamData.data.status = 'end'
            toolForStreamData.data.content += content
            toolForStreamData.data.ContentType = item.ContentType
            const isShowAll = toolForStreamData.data.content.length > 25600 // 50KB大概字符数25600
            const displayContent = isShowAll
              ? '...' + toolForStreamData.data.content.slice(-25600) + '...'
              : toolForStreamData.data.content
            toolResult.data.tool.toolStdoutContent = { content: displayContent, isShowAll }
            if (isStreamNew) setCasualContentMap(toolForStreamData.id, toolForStreamData)

            handleParseCasual({ mapKey: toolResult.id, type: toolResult.type })
            continue
          }

          // 数据集合中对应的数据
          let streamData = getCasualContentMap(EventUUID)
          if (streamData && streamData.type !== AIChatQSDataTypeEnum.STREAM) continue
          let isStreamNew = false
          if (!streamData) {
            isStreamNew = true
            streamData = {
              ...genBaseAIChatData(item),
              id: EventUUID,
              chatType: 'reAct',
              type: AIChatQSDataTypeEnum.STREAM,
              data: {
                NodeId: NodeId,
                NodeIdVerbose: item.NodeIdVerbose || convertNodeIdToVerbose(NodeId),
                TaskIndex: item.TaskIndex,
                CallToolID,
                EventUUID: EventUUID,
                status: 'start',
                content: '',
                ContentType: item.ContentType,
              },
            }
          }
          streamData.data.NodeIdVerbose = item.NodeIdVerbose || convertNodeIdToVerbose(NodeId)
          streamData.data.status = 'end'
          streamData.data.content += content
          streamData.data.ContentType = item.ContentType
          if (isStreamNew) setCasualContentMap(streamData.id, { ...streamData })

          handleParseIsGroup({
            mapKey: EventUUID,
            type: streamData.type,
            nodeID: NodeId,
            contentType: item.ContentType,
          })
          continue
        }
        if (item.Type === 'structured' && item.NodeId === 'stream-finished') {
          const { CallToolID } = item
          const { event_writer_id, node_id, is_reason, is_system, task_index } = JSON.parse(
            ipcContent,
          ) as AIAgentGrpcApi.AIStreamFinished
          if (is_reason || is_system) continue
          if (!event_writer_id) continue

          // tool-xxx-stderr 数据单独结束逻辑
          if (isToolStderrStream(node_id)) {
            if (!CallToolID) continue
            if (!streamToToolResultError.current.has(CallToolID)) {
              streamToToolResultError.current.set(CallToolID, {
                content: '',
                uuid: event_writer_id,
                status: 'start',
              })
            }
            continue
          }
          // tool-xxx-stdout 数据单独结束逻辑
          if (isToolStdoutStream(node_id)) {
            if (!CallToolID) continue
            let toolResult = getCasualContentMap(CallToolID)
            if (toolResult && toolResult.type !== AIChatQSDataTypeEnum.TOOL_RESULT) continue
            let isNew = false
            if (!toolResult) {
              isNew = true
              toolResult = {
                ...genBaseAIChatData(item),
                id: CallToolID,
                chatType: 'reAct',
                type: AIChatQSDataTypeEnum.TOOL_RESULT,
                data: {
                  ...cloneDeep(DefaultAIToolResult),
                  type: 'stream',
                  TaskIndex: item.TaskIndex || undefined,
                  callToolId: CallToolID,
                },
              }
            }

            if (isNew) setCasualContentMap(toolResult.id, toolResult)
            toolResult.data.stream.EventUUID = event_writer_id
            setCasualContentMap(event_writer_id, {
              ...genBaseAIChatData(item),
              id: event_writer_id,
              chatType: 'reAct',
              type: AIChatQSDataTypeEnum.STREAM,
              data: {
                NodeId: node_id,
                NodeIdVerbose: convertNodeIdToVerbose(node_id),
                TaskIndex: item.TaskIndex || undefined,
                CallToolID,
                EventUUID: event_writer_id,
                status: 'start',
                content: '',
                ContentType: item.ContentType,
              },
            })
            continue
          }

          // 数据集合中对应的数据
          const streamData = getCasualContentMap(event_writer_id)
          // 数据存在，则该数据无效
          if (streamData) continue

          setCasualContentMap(event_writer_id, {
            ...genBaseAIChatData(item),
            id: event_writer_id,
            chatType: 'reAct',
            type: AIChatQSDataTypeEnum.STREAM,
            data: {
              NodeId: node_id,
              NodeIdVerbose: convertNodeIdToVerbose(node_id),
              TaskIndex: task_index,
              CallToolID,
              EventUUID: event_writer_id,
              status: 'start',
              content: '',
              ContentType: item.ContentType,
            },
          })
          continue
        }

        if (item.Type === 'tool_call_watcher') {
          // 这个类型数据无效了，只在实时数据时使用，用于选择额外的操作
          continue
        }
        if (item.Type === 'tool_call_log_dir') {
          const { call_tool_id, dir_path } = JSON.parse(ipcContent) as AIAgentGrpcApi.AIToolCallDirPath
          if (!call_tool_id) continue
          let toolResult = getCasualContentMap(call_tool_id)
          if (toolResult && toolResult.type !== AIChatQSDataTypeEnum.TOOL_RESULT) continue
          let isNew = false
          if (!toolResult) {
            isNew = true
            toolResult = {
              ...genBaseAIChatData(item),
              id: call_tool_id,
              chatType: 'reAct',
              type: AIChatQSDataTypeEnum.TOOL_RESULT,
              data: {
                ...cloneDeep(DefaultAIToolResult),
                type: 'result',
                TaskIndex: item.TaskIndex || undefined,
                callToolId: call_tool_id,
              },
            }
          }
          if (toolResult.data.tool.dirPath) continue

          // 这里是直接使用引用设置的值，所以不需要在使用setContentMap设置回去
          toolResult.data.tool.dirPath = dir_path || ''
          if (isNew) setCasualContentMap(toolResult.id, toolResult)
          if (toolResult.data.type) handleParseCasual({ mapKey: toolResult.id, type: toolResult.type })
          continue
        }

        if (['tool_call_user_cancel', 'tool_call_done', 'tool_call_error'].includes(item.Type)) {
          const { call_tool_id, ...rest } = JSON.parse(ipcContent) as AIAgentGrpcApi.AIToolCall
          if (!call_tool_id) continue

          let toolResult = getCasualContentMap(call_tool_id)
          if (toolResult && toolResult.type !== AIChatQSDataTypeEnum.TOOL_RESULT) continue
          let isNew = false
          if (!toolResult) {
            isNew = true
            toolResult = {
              ...genBaseAIChatData(item),
              id: call_tool_id,
              chatType: 'reAct',
              type: AIChatQSDataTypeEnum.TOOL_RESULT,
              data: {
                ...cloneDeep(DefaultAIToolResult),
                type: 'result',
                TaskIndex: item.TaskIndex || undefined,
                callToolId: call_tool_id,
              },
            }
          }
          const status =
            item.Type === 'tool_call_user_cancel'
              ? 'user_cancelled'
              : item.Type === 'tool_call_done'
                ? 'success'
                : 'failed'

          // 下面的设置: 是直接使用引用设置的值，所以不需要在使用setContentMap设置回去
          // 设置工具执行的开始时间、结束时间和持续时间等数据
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
          const errorResult = streamToToolResultError.current.get(call_tool_id)
          if (errorResult && errorResult.status === 'end') {
            toolResult.data.tool.execError = errorResult.content
            // error数据先出但未存在对应的工具执行结果，工具结果出现后直接使用并删除map中的缓存数据
            streamToToolResultError.current.delete(call_tool_id)
          }
          if (isNew) setCasualContentMap(toolResult.id, toolResult)
          handleParseCasual({ mapKey: toolResult.id, type: toolResult.type })
          continue
        }
        if (item.Type === 'tool_call_summary') {
          const { call_tool_id, summary } = JSON.parse(ipcContent) as AIAgentGrpcApi.AIToolCall
          if (!call_tool_id) continue

          let toolResult = getCasualContentMap(call_tool_id)
          if (toolResult && toolResult.type !== AIChatQSDataTypeEnum.TOOL_RESULT) continue
          let isNew = false
          if (!toolResult) {
            isNew = true
            toolResult = {
              ...genBaseAIChatData(item),
              id: call_tool_id,
              chatType: 'reAct',
              type: AIChatQSDataTypeEnum.TOOL_RESULT,
              data: {
                ...cloneDeep(DefaultAIToolResult),
                type: 'result',
                TaskIndex: item.TaskIndex || undefined,
                callToolId: call_tool_id,
              },
            }
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
          const errorResult = streamToToolResultError.current.get(call_tool_id)
          if (errorResult && errorResult.status === 'end') {
            toolResult.data.tool.execError = errorResult.content
            // error数据先出但未存在对应的工具执行结果，工具结果出现后直接使用并删除map中的缓存数据
            streamToToolResultError.current.delete(call_tool_id)
          }
          if (isNew) setCasualContentMap(toolResult.id, toolResult)
          // 如果不等于 default，说明流数据里，结果已经进行了解析，只需要更新渲染数据即可
          if (statusInfo !== 'default') handleParseCasual({ mapKey: toolResult.id, type: toolResult.type })
          continue
        }

        if (item.Type === 'tool_call_decision') {
          const data = JSON.parse(ipcContent) as AIAgentGrpcApi.ToolCallDecision
          const i18n = data?.i18n || { zh: data.action, en: data.action }
          const chatData: AIChatQSData = {
            ...genBaseAIChatData(item),
            chatType: 'reAct',
            type: AIChatQSDataTypeEnum.TOOL_CALL_DECISION,
            data: {
              ...data,
              i18n: {
                Zh: i18n.zh,
                En: i18n.en,
              },
            },
          }
          setCasualContentMap(chatData.id, chatData)
          handleParseCasual({ mapKey: chatData.id, type: chatData.type })
          continue
        }

        if (item.Type === 'fail_plan_and_execution') {
          const chatData: AIChatQSData = {
            ...genBaseAIChatData(item),
            chatType: 'reAct',
            type: AIChatQSDataTypeEnum.FAIL_PLAN_AND_EXECUTION,
            data: {
              content: ipcContent,
              NodeId: item.NodeId,
              NodeIdVerbose: item.NodeIdVerbose || convertNodeIdToVerbose(item.NodeId),
            },
          }
          setCasualContentMap(chatData.id, chatData)
          handleParseCasual({ mapKey: chatData.id, type: chatData.type })
          continue
        }

        if (item.Type === 'reference_material') {
          const data = JSON.parse(ipcContent) as AIAgentGrpcApi.ReferenceMaterialPayload
          const chatData = getCasualContentMap(data.event_uuid)
          const toolResult = getCasualContentMap(item.CallToolID || '')
          if (!chatData && !toolResult) continue

          if (chatData) {
            // 下面的设置: 是直接使用引用设置的值，所以不需要在使用setContentMap设置回去
            chatData.reference = (chatData.reference || []).concat([data])
            if (chatData.parentGroupKey) {
              handleParseGroupCasual({
                main: { mapKey: chatData.parentGroupKey, type: AIChatQSDataTypeEnum.STREAM_GROUP },
                sub: { mapKey: data.event_uuid, type: chatData.type },
              })
            } else if (chatData.type === AIChatQSDataTypeEnum.STREAM) {
              if (toolResult && isToolStdoutStream(chatData.data.NodeId)) {
                // 特殊情况，更新stdout流对应的工具执行结果卡片UI
                handleParseCasual({ mapKey: toolResult.id, type: toolResult.type })
                continue
              }
              handleParseIsGroup({
                mapKey: chatData.id,
                type: chatData.type,
                nodeID: chatData.data.NodeId,
                contentType: chatData.data.ContentType,
              })
            } else {
              handleParseCasual({ mapKey: data.event_uuid, type: chatData.type })
            }
          } else if (
            toolResult &&
            toolResult.type === AIChatQSDataTypeEnum.TOOL_RESULT &&
            toolResult.data.stream.EventUUID === data.event_uuid
          ) {
            // 工具执行结果的参考资料
            toolResult.reference = (toolResult.reference || []).concat([data])
            handleParseCasual({ mapKey: toolResult.id, type: toolResult.type })
          } else {
            const chatData: AIChatQSData = {
              ...genBaseAIChatData(item),
              id: data.event_uuid,
              chatType: 'reAct',
              type: AIChatQSDataTypeEnum.Reference_Material,
              data: {
                NodeId: item.NodeId,
                NodeIdVerbose: item.NodeIdVerbose || convertNodeIdToVerbose(item.NodeId),
              },
              reference: [data],
            }
            setCasualContentMap(chatData.id, chatData)
            handleParseCasual({ mapKey: chatData.id, type: AIChatQSDataTypeEnum.Reference_Material })
          }
          continue
        }

        if (item.Type === 'structured' && item.NodeId === 'system') {
          const data = JSON.parse(ipcContent) || ''

          if (!!data && typeof data === 'object' && data?.type === 'push_task') {
            const info = JSON.parse(ipcContent) as AIAgentGrpcApi.ChangeTask
            // 任务树根节点不进行节点展示
            if (info.task.index === '1') continue

            const chatData: AIChatQSData = {
              ...genBaseAIChatData(item),
              chatType: 'reAct',
              type: AIChatQSDataTypeEnum.TASK_INDEX_NODE,
              data: {
                taskIndex: info.task.index,
                taskName: info.task.name,
                goal: info.task.goal,
                status: AITaskStatus.inProgress,
              },
            }
            if (info.task.task_uuid) {
              chatData.id = info.task.task_uuid
              if (taskUUIDToStatus.current.has(info.task.task_uuid)) {
                chatData.data.status = taskUUIDToStatus.current.get(info.task.task_uuid) || AITaskStatus.inProgress
                taskUUIDToStatus.current.delete(info.task.task_uuid)
              }
            }
            setCasualContentMap(chatData.id, chatData)
            handleParseCasual({ mapKey: chatData.id, type: chatData.type })
            continue
          }

          if (!!data && typeof data === 'object' && data?.type === 'pop_task') {
            // 结束任务 & 请求更新任务树最新状态数据
            const info = JSON.parse(ipcContent) as AIAgentGrpcApi.ChangeTask
            // 任务树根节点不进行节点展示
            if (info.task.index === '1') continue
            // 任务结束时, 如果没有task_uuid则不进行UI更新, 因为无法确定哪个节点结束了
            if (!info.task.task_uuid) continue

            const taskNodeInfo = getCasualContentMap(info.task.task_uuid)
            if (taskNodeInfo) {
              if (taskNodeInfo.type !== AIChatQSDataTypeEnum.TASK_INDEX_NODE) continue
              taskNodeInfo.data.status = info.task.task_status
              handleParseCasual({ mapKey: taskNodeInfo.id, type: taskNodeInfo.type })
            } else {
              taskUUIDToStatus.current.set(info.task.task_uuid, info.task.task_status)
            }
            continue
          }
        }

        if (item.Type === 'structured' && item.NodeId === 'react_task_dequeue') {
          const data = JSON.parse(ipcContent) as AIAgentGrpcApi.QuestionQueueStatusChange
          const chatData: AIChatQSData = {
            id: uuidv4(),
            chatType: 'reAct',
            type: AIChatQSDataTypeEnum.QUESTION,
            Timestamp: item.Timestamp,
            data: { qs: data.react_task_input || '', setting: {} },
            AIService: '',
            AIModelName: '',
            extraValue: { showQS: data.react_task_input || '' },
          }
          setCasualContentMap(chatData.id, chatData)
          handleParseCasual({ mapKey: chatData.id, type: chatData.type })
          continue
        }
      } catch (error) {}
    }
  })
  // #endregion

  // #region 历史数据-会话列表数据
  const [chatsLoading, setChatsLoading, getChatsLoading] = useGetState(false)
  const hasMoreChats = useRef(true)

  const getChatBeforeID = useMemoizedFn(() => {
    return getChatDataStore?.()?.beforeID?.chatID || undefined
  })

  const handleHistoryChats = useMemoizedFn(async (session: string) => {
    if (!hasMoreChats.current) return

    if (!session) {
      yakitNotify('error', '会话ID不存在，无法获取历史聊天记录')
      return
    }

    const request: AIEventQueryRequest = {
      Filter: {
        SessionID: session,
        // EventType: [
        //   'stream',
        //   'plan_review_require',
        //   'task_review_require',
        //   'tool_use_review_require',
        //   'require_user_interactive',
        //   'exec_aiforge_review_require',
        //   'review_release',
        //   'ai_review_start',
        //   'ai_review_countdown',
        //   'ai_review_end',
        //   'thought',
        //   'result',
        //   'fail_react_task',
        //   'stream_start',
        //   'tool_call_start',
        //   'tool_call_param',
        //   'tool_call_watcher',
        //   'tool_call_log_dir',
        //   'tool_call_user_cancel',
        //   'tool_call_done',
        //   'tool_call_error',
        //   'tool_call_summary',
        //   'tool_call_decision',
        //   'fail_plan_and_execution',
        //   'reference_material',
        // ],
        // NodeId: ['react_task_dequeue', 'stream-finished', 'system'],
        // UseOR: true,
      },
      Pagination: { ...DefaultHistoryPagination },
    }
    if (getChatBeforeID()) {
      request.Pagination!.BeforeId = Number(getChatBeforeID())
    }
    setChatsLoading(true)
    try {
      const { Events, Total } = await grpcQueryAIEvent(request)
      if (Total === 0) {
        hasMoreChats.current = false
        return
      }
      updateBeforeID('chatID', `${Events[Events.length - 1].ID}`)
      isUpdateCasual.current = false
      handleChatData([...Events])
      updateCasualElement(session)
      hasMoreChats.current = Events.length === request.Pagination?.Limit
    } catch {
    } finally {
      if (!isUpdateCasual.current) {
        setTimeout(() => {
          setChatsLoading(false)
        }, 300)
      }
    }
  })
  // #endregion

  // 重置状态
  const handleReset = useMemoizedFn(() => {
    hasMoreTimeline.current = true
    setTimelinesLoading(false)
    streamToToolResultError.current.clear()
    taskUUIDToStatus.current.clear()
    isUpdateCasual.current = false
    hasMoreChats.current = true
    setChatsLoading(false)
  })

  // 是否还有更多数据可供加载
  const fetchHasMore = useMemoizedFn((type: loadMoreType) => {
    switch (type) {
      case 'timelineID':
        return hasMoreTimeline.current
      case 'chatID':
        return hasMoreChats.current
      default:
        return false
    }
  })

  const [initLoading, setInitLoading] = useState(false)
  // 初始化加载
  const handleHistoryInit = useMemoizedFn((session: string) => {
    handleReset()
    setInitLoading(true)
    Promise.allSettled([
      handleHistoryTimelines(session),
      handleHistoryFileSystem(session),
      handleHistoryChats(session),
    ]).finally(() => {
      setTimeout(() => {
        setInitLoading(false)
      }, 200)
    })
  })

  const handleLoadMore = useMemoizedFn((type: loadMoreType, session: string) => {
    if (!session) {
      yakitNotify('error', '会话ID不存在，无法获取历史聊天记录')
      return
    }
    switch (type) {
      case 'timelineID':
        handleHistoryTimelines(session)
        break
      case 'chatID':
        if (getChatsLoading()) return
        handleHistoryChats(session)
        break

      default:
        break
    }
  })

  const state: UseHistoryChatState = useCreation(() => {
    return { initLoading: initLoading, timelinesLoading: timelinesLoading, chatsLoading: chatsLoading }
  }, [initLoading, timelinesLoading, chatsLoading])

  const events: UseHistoryChatEvents = useCreation(() => {
    return { fetchHasMore, loadInit: handleHistoryInit, loadMore: handleLoadMore }
  }, [])

  return [state, events] as const
}

export default useHistoryChat
