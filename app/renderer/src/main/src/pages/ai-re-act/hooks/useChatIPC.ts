import type {
  AIChatIPCNotifyMessage,
  AIChatIPCStartParams,
  AIChatSendParams,
  AIFileSystemPin,
  AIMessageDataProps,
  AIQuestionQueues,
  HistoryChatType,
  PlanLoadingStatus,
  TaskChatTaskInfo,
  UseCasualChatEvents,
  UseChatIPCEvents,
  UseChatIPCParams,
  UseChatIPCState,
  UseHookBaseParams,
  UseTaskChatEvents,
} from './type'
import type {
  AIAgentGrpcApi,
  AIEventQueryRequest,
  AIInputEvent,
  AIOutputEvent,
  AIOutputI18n,
  AIStartParams,
} from './grpcApi'
import type { AIChatData } from '@/pages/ai-agent/type/aiChat'
import type { DeepPartial } from '@/pages/ai-agent/store/ChatDataStore'
import type { AIChatQSData, ChatListRenderType } from './aiRender'

import { useEffect, useRef, useState } from 'react'
import { yakitNotify } from '@/utils/notification'
import { useCreation, useInterval, useMemoizedFn, useThrottleFn } from 'ahooks'
import { Uint8ArrayToString } from '@/utils/str'
import useGetSetState from '@/pages/pluginHub/hooks/useGetSetState'
import useCasualChat from './useCasualChat'
import useYakExecResult, { UseYakExecResultTypes } from './useYakExecResult'
import useTaskChat from './useTaskChat'
import { genErrorLogData, genExecTasks, handleGrpcDataPushLog } from './utils'
import { AITaskStatus, AIInputEventSyncTypeEnum } from './grpcApi'
import useAIChatLog from './useAIChatLog'
import cloneDeep from 'lodash/cloneDeep'
import {
  convertNodeIdToVerbose,
  DefaultAIQuestionQueues,
  DefaultMemoryList,
  DefaultPlanHistoryList,
  DefaultPlanLoadingStatus,
} from './defaultConstant'
import useThrottleState from '@/hook/useThrottleState'
import { grpcQueryAIEvent } from '@/pages/ai-agent/grpc'
import useAINodeLabel from './useAINodeLabel'
import { formatAIAgentSetting } from '@/pages/ai-agent/utils'
import { handleResetForNewSession } from './grpcAIMessageHandlers'
import useAIMessageData from './useAIMessageData'
import { getDomainFromAISource } from './useGetChatDataStoreKey'

const { ipcRenderer } = window.require('electron')
function useChatIPC(params?: UseChatIPCParams): [UseChatIPCState, UseChatIPCEvents]

function useChatIPC(params?: UseChatIPCParams) {
  const {
    autoConnect,
    cacheDataStore,
    setSessionChatName,
    onTaskStart,
    onTaskReview,
    onTaskReviewExtra,
    onReviewRelease,
    onEnd,
    onSyncIDChange,
    getSetting,
    onHttpFuzzRequestChange,
    onGetHttpFlowFuzzStatus,
    aiSource = 'ai',
  } = params || {}

  const { getLabelByParams } = useAINodeLabel()

  // #region 全局公共方法集合
  /** 自由对话(ReAct)-review 信息的自动释放 */
  const handleCasualReviewRelease = useMemoizedFn((id: string) => {
    onReviewRelease && onReviewRelease('casual', id)
  })
  // 任务规划-review 信息的自动释放
  const handleTaskReviewRelease = useMemoizedFn((id: string) => {
    onReviewRelease && onReviewRelease('task', id)
  })

  /** 消息通知提醒弹框 */
  const handleNotifyMessage = useMemoizedFn((message: AIChatIPCNotifyMessage) => {
    const { NodeIdVerbose, Content } = message
    const verbose = getLabelByParams(NodeIdVerbose)
    yakitNotify('info', {
      message: verbose,
      description: Content,
    })
  })

  /** 向进行中的grpc流接口发送请求 */
  const sendRequest = useMemoizedFn((request: AIInputEvent) => {
    if (!chatID.current) return
    // console.log('send-ai-re-act---\n', chatID.current, request)
    ipcRenderer.invoke('send-ai-re-act', chatID.current, request)
  })

  /** 获取当前会话数据集类实例 */
  const fetchChatDataStore = useMemoizedFn(() => {
    return cacheDataStore
  })
  // #endregion

  // #region 全局状态变量
  /** 通信的唯一标识符 */
  const chatID = useRef<string>('')
  const fetchToken = useMemoizedFn(() => {
    return chatID.current
  })

  /** 启动流接口的请求参数 */
  const aiRequest = useRef<AIStartParams>()
  const fetchAIRequest = useMemoizedFn(() => {
    return cloneDeep(aiRequest.current)
  })
  const handleResetAIRequest = useMemoizedFn(() => {
    aiRequest.current = undefined
  })

  /** 建立grpc连接的初次问题数据 */
  const firstQS = useRef<AIInputEvent>()

  /** 获取全部聊天数据 */
  const getChatDataStore: UseHookBaseParams['getChatDataStore'] = useMemoizedFn(() => {
    if (!chatID.current) return
    return cacheDataStore?.get(chatID.current)
  })

  // 通信的状态
  const [execute, setExecute, getExecute] = useGetSetState(false)
  // #endregion

  // #region 接口更新的(文件|文件夹)数据集合
  const [grpcFolders, setGrpcFolders] = useState<AIFileSystemPin[]>([])
  const handleSetGrpcFolders = useMemoizedFn((info: AIFileSystemPin) => {
    setGrpcFolders((old) => {
      const isExist = old.find((item) => item.path === info.path)
      if (!!isExist) return old
      return [...old, info]
    })
  })

  const handleResetGrpcFile = useMemoizedFn(() => {
    setGrpcFolders([])
  })
  // #endregion

  // #region grpc流里所有的runtimeIDs集合
  // http数据的run_time_id合集
  const [httpRunTimeIDs, setHttpRunTimeIDs] = useState<string[]>([])
  // risk数据的run_time_id合集
  const [riskRunTimeIDs, setRiskRunTimeIDs] = useState<string[]>([])

  const handleResetRunTimeIDs = useMemoizedFn(() => {
    setHttpRunTimeIDs([])
    setRiskRunTimeIDs([])
  })
  // #endregion

  // #region 问题队列相关逻辑
  // 问题队列(自由对话专属)[todo: 后续存在任务规划的问题队列后，需要放入对应的hook中进行处理和储存]
  const [questionQueue, setQuestionQueue] = useState<AIQuestionQueues>(cloneDeep(DefaultAIQuestionQueues))

  const handleResetQuestionQueue = useMemoizedFn(() => {
    setQuestionQueue(cloneDeep(DefaultAIQuestionQueues))
  })
  // #endregion

  // #region 实时记忆列表相关逻辑
  const [memoryList, setMemoryList] = useState<AIAgentGrpcApi.MemoryEntryList>(cloneDeep(DefaultMemoryList))

  // #endregion

  // #region 时间线相关逻辑
  // 实时时间线
  const [reActTimelines, setReActTimelines] = useThrottleState<AIAgentGrpcApi.TimelineItem[]>([], { wait: 100 })

  const handleResetReActTimelines = useMemoizedFn(() => {
    setReActTimelines(() => [])
  })
  // #endregion

  // #region 系统信息流展示相关逻辑
  /** 记录都存在过的系统信息uuid, 只展示最新的一条系统信息 */
  const systemEventUUID = useRef<string[]>([])
  const [systemStream, setSystemStream] = useState('')
  const handleSetSystemStream = useMemoizedFn((uuid: string, content: string) => {
    const lastUUID = systemEventUUID.current[systemEventUUID.current.length - 1]
    if (lastUUID) {
      if (lastUUID === uuid) {
        setSystemStream((old) => old + content)
      } else {
        if (systemEventUUID.current.includes(uuid)) return
        systemEventUUID.current.push(uuid)
        setSystemStream(content)
      }
    } else {
      systemEventUUID.current.push(uuid)
      setSystemStream(content)
    }
  })
  const handleResetSystemStream = useMemoizedFn(() => {
    systemEventUUID.current = []
    setSystemStream('')
  })
  // #endregion

  // #region 场景状态相关逻辑
  const [focusMode, setFocusMode] = useState<string>('')

  // #endregion

  // #region 通知消息相关逻辑
  const [notifyMessage, setNotifyMessage] = useState<UseChatIPCState['notifyMessage']>(null)

  // #endregion

  // #region 历史任务规划列表相关逻辑
  const [planHistoryList, setPlanHistoryList] = useState<AIAgentGrpcApi.PlanHistoryList>(
    cloneDeep(DefaultPlanHistoryList),
  )

  // #endregion

  // #region 单次流执行时的输出展示数据
  // 日志
  const logEvents = useAIChatLog()

  // 执行过程中插件输出的卡片
  const [yakExecResult, yakExecResultEvent] = useYakExecResult({
    pushLog: logEvents.pushLog,
    getChatDataStore,
  })
  // #endregion

  // #region 自由对话(ReAct)相关变量和hook
  /** 当前执行问题的task_id */
  const currentCasualTaskID = useRef('')
  const fetchCurrentCasualTaskID = useMemoizedFn(() => {
    return currentCasualTaskID.current
  })

  /** 用户主动关闭当前问题的loading状态(自由对话) */
  const [cancelCasualLoading, setCancelCasualLoading] = useState(false)

  /** 自由对话(ReAct)的loading状态 */
  /** 自由对话loading状态中的显示文案 */
  const [casualTitle, setCasualTitle] = useState<string>('')
  /** 自由对话是否在进行中 */
  const [casualLoading, setCasualLoading] = useState<boolean>(false)
  const handleUpdateCasualStatus = useMemoizedFn((type: 'add' | 'remove' | 'reset') => {
    if (type === 'reset') {
      setCasualLoading(false)
      setCasualTitle('')
      return
    }

    if (type === 'add') {
      setCasualLoading(true)
    } else if (type === 'remove') {
      setCasualLoading(false)
    }
  })

  const [casualChat, casualChatEvent] = useCasualChat({
    pushLog: logEvents.pushLog,
    getChatDataStore,
    getRequest: fetchAIRequest,
    onReviewRelease: handleCasualReviewRelease,
  })
  // #endregion

  // #region 任务规划相关变量和hook
  /** 任务规划对应的问题信息, 供UI使用，因为任务结束后，该变量不会清空 */
  const currentTaskPlanID = useRef<TaskChatTaskInfo>()
  const fetchCurrentTaskPlanID = useMemoizedFn(() => {
    return currentTaskPlanID.current
  })
  const resetCurrentTaskPlanID = useMemoizedFn(() => {
    currentTaskPlanID.current = undefined
  })

  /** 用户主动(关闭/恢复)当前问题的loading状态(任务规划) */
  const [cancelTaskLoading, setCancelTaskLoading] = useState(false)

  /** 任务规划的loading状态 */
  const [taskStatus, setTaskStatus] = useState<PlanLoadingStatus>(cloneDeep(DefaultPlanLoadingStatus))
  const handleResetTaskStatus = useMemoizedFn(() => {
    setTaskStatus(cloneDeep(DefaultPlanLoadingStatus))
  })

  const [taskChat, taskChatEvent] = useTaskChat({
    pushLog: logEvents.pushLog,
    getChatDataStore,
    getRequest: fetchAIRequest,
    getCurrentTaskPlanID: fetchCurrentTaskPlanID,
    onReview: onTaskReview,
    onReviewExtra: onTaskReviewExtra,
    onReviewRelease: handleTaskReviewRelease,
    sendRequest: sendRequest,
  })
  // #endregion

  /** 向对应列表(自由对话|任务规划)里的map设置数据 */
  const handleSetContentMap: AIMessageDataProps['setContentMap'] = useMemoizedFn((chatType, token, content) => {
    if (chatType === 'reAct') {
      casualChatEvent.setContentMap(token, content)
    } else if (chatType === 'task') {
      taskChatEvent.setContentMap(token, content)
    }
  })

  // #region 历史数据的请求hook
  const [requestState, requestEvents] = useAIMessageData({
    type: getDomainFromAISource(aiSource),
    getChatStore: getChatDataStore,
    setContentMap: handleSetContentMap,
    setCasualElements: casualChatEvent.setElements,
    setTaskElements: taskChatEvent.setElements,
    grpcLoadMore: (request) => {
      sendRequest({
        IsSyncMessage: true,
        SyncType: AIInputEventSyncTypeEnum.SYNC_TYPE_RECOVERY_HISTORY,
        SyncJsonInput: JSON.stringify(request),
      })
    },
    setGrpcFiles: setGrpcFolders,
    setTimelines: setReActTimelines,
  })

  /** 请求更多数据加载 */
  const handleLoadMore: UseChatIPCEvents['handleLoadMoreHistory'] = useMemoizedFn((chatType: HistoryChatType) => {
    if (!chatID.current) return
    return requestEvents.handleLoadMore(chatID.current, chatType)
  })
  /** 是否还有更多历史数据 */
  const handleHasMore: UseChatIPCEvents['handleHasMoreHistory'] = useMemoizedFn((chatType: HistoryChatType) => {
    if (!chatID.current) return false
    return requestEvents.handleHasMore(chatType)
  })
  // #endregion

  /** 用户主动取消问题的loading状态变换 */
  const handleCancelLoadingChange = useMemoizedFn((type: ChatListRenderType, status: boolean) => {
    if (type === 'reAct') {
      setCancelCasualLoading(status)
    } else {
      setCancelTaskLoading(status)
    }
  })

  // #region 问题和问题队列相关逻辑
  /** 更新问题队列状态 */
  const handleTriggerQuestionQueueRequest = useThrottleFn(
    () => {
      sendRequest({ IsSyncMessage: true, SyncType: AIInputEventSyncTypeEnum.SYNC_TYPE_QUEUE_INFO })
    },
    { wait: 50, leading: false },
  ).run

  // 问题队列清空操作-进行通知逻辑
  const handleReActTaskCleared = useMemoizedFn((res: AIOutputEvent) => {
    try {
      const { Type, NodeId, NodeIdVerbose, Timestamp } = res
      handleNotifyMessage({
        Type,
        NodeId,
        NodeIdVerbose,
        Timestamp,
        Content: '已清空所有任务队列数据',
      })
    } catch (error) {
      handleGrpcDataPushLog({
        info: res,
        pushLog: logEvents.pushLog,
      })
    }
  })
  // #endregion

  // #region review事件相关方法
  /** review 界面选项触发事件 */
  const onSend = useMemoizedFn(({ token, type, params, optionValue, extraValue }: AIChatSendParams) => {
    try {
      if (!getExecute()) {
        yakitNotify('warning', 'AI 未执行任务，无法发送选项')
        return
      }
      if (!chatID.current || chatID.current !== token) {
        yakitNotify('warning', '该选项非本次 AI 执行的回答选项')
        return
      }

      if (params.IsConfigHotpatch) {
        aiRequest.current = { ...(aiRequest.current || {}), ...(params.Params || {}) }
      }
      if (params.IsFreeInput) {
        setCasualTitle('等待回复中...')
      }

      switch (type) {
        case 'casual':
        case 'task':
          const events: UseCasualChatEvents | UseTaskChatEvents = type === 'casual' ? casualChatEvent : taskChatEvent
          events.handleSend({
            request: params,
            optionValue,
            extraValue,
            cb: () => {
              sendRequest(params)
            },
          })
          break

        default:
          sendRequest(params)
          break
      }
    } catch (error) {}
  })
  // #endregion

  // #region 外界进行删除会话数据操作时的重置逻辑
  const delChats = useRef<string[]>([])
  const onDelChats = useMemoizedFn(async (session: string[]) => {
    const filterSessions = session.filter((item) => !delChats.current.includes(item))
    delChats.current.push(...filterSessions)

    let failedSessions: string[] = []
    let err: any = null
    for (let item of filterSessions) {
      try {
        cacheDataStore?.remove(item)
      } catch (error) {
        failedSessions.push(item)
        err = error
      }
    }
    await requestEvents.handleDeleteSession(filterSessions)
    if (failedSessions.length > 0 && !!err) {
      yakitNotify('error', `删除会话(${failedSessions.join(',')})失败: ${err}`)
    }
  })
  // #endregion

  /** grpc接口流断开瞬间, 需要将状态相关变量进行重置 */
  const handleResetGrpcStatus = useMemoizedFn(() => {
    taskChatEvent.handleCloseGrpc()
    setExecute(false)
    setCasualLoading(false)
    handleResetTaskStatus()
  })

  /** 流接口开始前需要重置的一些状态 */
  const handleResetBeforeStart = useMemoizedFn(() => {
    // 清空自由对话相关的ID
    currentCasualTaskID.current = ''
    // 清空任务规划相关的ID
    resetCurrentTaskPlanID()
    taskChatEvent.handleResetPlanTree()
  })

  /** 重置所有数据 */
  const onReset = useMemoizedFn(() => {
    chatID.current = ''
    handleResetAIRequest()
    setExecute(false)
    handleResetGrpcFile()
    handleResetRunTimeIDs()
    handleResetQuestionQueue()
    handleResetReActTimelines()
    handleResetSystemStream()
    currentCasualTaskID.current = ''
    handleUpdateCasualStatus('reset')
    resetCurrentTaskPlanID()
    handleResetTaskStatus()

    setCancelCasualLoading(false)
    setCancelTaskLoading(false)
    yakExecResultEvent.handleResetData()
    casualChatEvent.handleResetData()
    taskChatEvent.handleResetData()

    // 清除类型处理方法库里的临时数据
    handleResetForNewSession()
    // 重置历史数据请求
    requestEvents.handleReset()
  })

  /** 建立会话连接后需要同步的数据 */
  const handleSyncDataAfterConnect = useMemoizedFn(() => {
    // 获取任务规划历史任务树
    sendRequest({ IsSyncMessage: true, SyncType: AIInputEventSyncTypeEnum.SYNC_TYPE_PLAN_EXEC_TASKS })
  })

  /** 需要轮询获取最新的数据请求 */
  const handleStartSyncDataInterval = useMemoizedFn(() => {
    // 获取最新问题队列数据
    sendRequest({ IsSyncMessage: true, SyncType: AIInputEventSyncTypeEnum.SYNC_TYPE_QUEUE_INFO })
    // 获取最新记忆列表数据
    sendRequest({ IsSyncMessage: true, SyncType: AIInputEventSyncTypeEnum.SYNC_TYPE_MEMORY_CONTEXT })
  })

  /** 保存state类型的数据 */
  const saveStateDataOfEnd = useMemoizedFn((session: string) => {
    if (delChats.current.includes(session)) {
      // 该session对应的会话数据实例已被删除
      delChats.current = delChats.current.filter((item) => item !== session)
      return
    }

    const answer: DeepPartial<AIChatData> = {
      httpRunTimeIDs: cloneDeep(httpRunTimeIDs),
      riskRunTimeIDs: cloneDeep(riskRunTimeIDs),
      yakExecResult: cloneDeep(yakExecResult),
      casualChat: cloneDeep(casualChat),
      taskChat: cloneDeep(taskChat),
      grpcFolders: cloneDeep(grpcFolders),
      reActTimelines: cloneDeep(reActTimelines),
    }
    try {
      cacheDataStore?.updater(session, answer)
      const store = getChatDataStore()
      if (!store) return
      requestEvents.handleSave(session, {
        casualElements: store.casualChat.elements,
        taskElements: store.taskChat.elements,
        casualContentMap: store.casualChat.contents,
        taskContentMap: store.taskChat.contents,
      })
    } catch {}
  })

  /** 获取对应session会话的流数据最新ID, 用于获取历史数据的偏移量 */
  const handleGetLatestID = useMemoizedFn(async (session: string) => {
    let lastID = 0
    try {
      const request: AIEventQueryRequest = {
        Filter: {
          SessionID: session,
        },
        Pagination: { Page: 1, Limit: 1, OrderBy: 'created_at', Order: 'desc' },
      }
      const { Events } = await grpcQueryAIEvent(request)
      if (Events.length) lastID = Number(Events[0].ID) || 0
    } catch {
    } finally {
      const chatStore = getChatDataStore()
      if (chatStore) chatStore.beforeID.chatID = lastID
      return lastID
    }
  })

  const onStart = useMemoizedFn(async (args: AIChatIPCStartParams, cb?: () => void) => {
    const { token, params } = args

    if (getExecute()) {
      yakitNotify('warning', 'useChatIPC AI任务正在执行中，请稍后再试！')
      return
    }

    const isInit = chatID.current !== token
    if (isInit) {
      onReset()
      try {
        cacheDataStore?.create(token)
      } catch (error) {}
    }
    handleResetBeforeStart()
    chatID.current = token

    /** 先设置等待文案再设置为执行中 */
    setCasualTitle('发送问题，开启会话...')
    setExecute(true)

    aiRequest.current = params.Params

    const nextID = await handleGetLatestID(token)

    ipcRenderer.on(`${token}-data`, (e, res: AIOutputEvent) => {
      try {
        if (res.Type === 'pong') {
          // pong类型消息是用来检测grpc连接是否成功的，不需要展示在界面上
          // 以及把需要在grpc连接后的操作进行触发的地方
          if (firstQS.current) {
            sendRequest(firstQS.current)
            firstQS.current = undefined
            setCasualTitle('等待回复中...')
          } else {
            // 如果建立流时，已经初始化过，则不在进行历史初始化
            // 场景: 删除记忆库，会断开流，如果用户在当前会话继续问问题，就会建立新的流，这时候就不需要再进行一次历史数据的初始化了
            if (isInit) requestEvents.handleLoadInit(token, nextID)
          }
          handleSyncDataAfterConnect()
          handleStartSyncDataInterval()
          cb?.()
          return
        }

        if (res.SyncID) {
          onSyncIDChange?.(res.SyncID)
        }

        let ipcContent = Uint8ArrayToString(res.Content) || ''

        if (res.Type === 'structured' && res.NodeId === 'recovery_history') {
          const recoveryHistory = JSON.parse(ipcContent) as AIAgentGrpcApi.RecoveryHistory
          const chatStore = getChatDataStore()
          if (chatStore) chatStore.beforeID.chatID = recoveryHistory.next_start_id
          requestEvents.handleGrpcLoadMore(recoveryHistory)
          return
        }

        if (res.Type === 'structured' && res.NodeId === 'react_task_cleared') {
          // 自由对话里的问题队列清空消息
          if (currentTaskPlanID.current?.coordinatorId === res.CoordinatorId) return
          // 问题队列清空操作
          handleReActTaskCleared(res)
          return
        }

        if (UseYakExecResultTypes.includes(res.Type)) {
          if (res.IsSync) return
          // 执行过程中插件输出的卡片
          yakExecResultEvent.handleSetData(res)
          return
        }

        if (res.Type === 'structured') {
          const obj = JSON.parse(ipcContent) || ''

          if (obj?.level) {
            // 执行日志信息
            const data = obj as AIAgentGrpcApi.Log
            logEvents.pushLog({
              type: 'log',
              Timestamp: res.Timestamp,
              data: data,
            })
          } else {
            // 因为流数据有日志类型，所以都放入日志逻辑过滤一遍
            if (res.NodeId === 'stream-finished') {
              const { event_writer_id, is_reason, is_system } = JSON.parse(
                ipcContent,
              ) as AIAgentGrpcApi.AIStreamFinished
              if (!event_writer_id) {
                logEvents.pushLog(genErrorLogData(res.Timestamp, `stream-finished数据异常, event_writer_id缺失`))
                return
              }
              logEvents.sendStreamLog(event_writer_id)

              // 非stream数据不需要进行后续的流结束处理逻辑
              if (is_reason || is_system) return
            }

            if (currentTaskPlanID.current?.coordinatorId === res.CoordinatorId) {
              taskChatEvent.handleSetData(res)
            } else {
              casualChatEvent.handleSetData(res)
            }
          }
          return
        }

        if (res.Type === 'stream') {
          if (res.IsSystem || res.IsReason) {
            const { CallToolID, NodeId, NodeIdVerbose, EventUUID, StreamDelta, ContentType } = res
            if (!NodeId || !EventUUID) return
            let ipcStreamDelta = Uint8ArrayToString(StreamDelta) || ''
            const content = ipcContent + ipcStreamDelta
            logEvents.pushLog({
              type: 'stream',
              Timestamp: res.Timestamp,
              data: {
                CallToolID,
                NodeId,
                NodeIdVerbose: NodeIdVerbose || convertNodeIdToVerbose(NodeId),
                EventUUID,
                status: 'start',
                content: content,
                ContentType,
              },
            })

            // 输出实时系统信息流
            if (res.IsSystem) handleSetSystemStream(EventUUID, content)
            return
          }

          if (currentTaskPlanID.current?.coordinatorId === res.CoordinatorId) {
            taskChatEvent.handleSetData(res)
          } else {
            casualChatEvent.handleSetData(res)
          }
          return
        }

        // 自由对话和任务规划共用的类型
        if (currentTaskPlanID.current?.coordinatorId === res.CoordinatorId) {
          taskChatEvent.handleSetData(res)
        } else {
          casualChatEvent.handleSetData(res)
        }
        return
      } catch (error) {
        handleGrpcDataPushLog({ info: res, pushLog: logEvents.pushLog })
      }
    })
    ipcRenderer.on(`${token}-end`, (e, res: any) => {
      // console.log("end", res)
      handleResetGrpcStatus()
      saveStateDataOfEnd(token)
      setCasualTitle('会话已停止')
      onEnd && onEnd()
      if (endAfterSession.current) {
        handleSwitchSessionData(endAfterSession.current)
      }

      ipcRenderer.invoke('cancel-ai-re-act', token).catch(() => {})
      ipcRenderer.removeAllListeners(`${token}-data`)
      ipcRenderer.removeAllListeners(`${token}-end`)
      ipcRenderer.removeAllListeners(`${token}-error`)
    })
    // ipcRenderer.on(`${token}-error`, (e, err: any) => {
    //   console.log('error', err)
    //   yakitNotify('error', `AI执行失败: ${err}`)
    // })
    // console.log('start-ai-re-act', token, params)

    if (params.Params?.UserQuery) {
      // 判断建立grpc连接时是否附带问题
      // 如有，需要剥离出来，在grpc建立成功后再执行
      firstQS.current = {
        IsFreeInput: true,
        FreeInput: params.Params.UserQuery,
        AttachedResourceInfo: params.AttachedResourceInfo,
        FocusModeLoop: params.FocusModeLoop,
      }
    }
    ipcRenderer.invoke('start-ai-re-act', token, params)
  })

  /**
   * 切换session会话的数据
   * @param isCreate
   * 该参数主要识别，切换是欢迎页切换到历史会话，还是欢迎页直接新建会话的情况
   * 新建会话不触发自动连接逻辑，否则UI条用的连接逻辑直接被拦截失效
   */
  const handleSwitchSessionData = useMemoizedFn((session: string, isCreate?: boolean) => {
    if (!session) {
      setTimeout(() => {
        setSwitchLoading(false)
      }, 200)
      return
    }

    onReset()

    if (session === 'clear') {
      setTimeout(() => {
        setSwitchLoading(false)
      }, 200)
      endAfterSession.current = ''
      cacheDataStore?.clear()
      return
    }

    const chatData = cacheDataStore?.get(session)
    if (chatData) {
      // 后续只有当前会话的数据存放在类实例中
      // 切换会话时，会自动把类实例的数据clear掉，所以这个判断下面代码不可能执行
      chatID.current = session
      setGrpcFolders(chatData.grpcFolders || [])
      setHttpRunTimeIDs(chatData.httpRunTimeIDs || [])
      setRiskRunTimeIDs(chatData.riskRunTimeIDs || [])
      setReActTimelines(() => chatData.reActTimelines || [])
      yakExecResultEvent.handleSetYakResult(chatData.yakExecResult || {})
      casualChatEvent.setElements(chatData.casualChat?.elements || [])
      taskChatEvent.setElements(chatData.taskChat?.elements || [])
    } else {
      cacheDataStore?.clear()
    }
    endAfterSession.current = ''
    setSwitchLoading(false)
    if (autoConnect && getSetting && !getExecute()) {
      if (isCreate) return
      onStart({
        token: session,
        params: {
          IsStart: true,
          Params: {
            ...formatAIAgentSetting(getSetting()),
            UserQuery: '',
            TimelineSessionID: session,
            CoordinatorId: '',
            Sequence: 1,
          },
        },
      })
    }
  })

  const [switchLoading, setSwitchLoading] = useState(false)
  /**
   * 标记session会话切换后，是否设置新的session
   * @return clear 代表清空数据并不设置数据
   * @return session 代表清空数据并设置新session对应的数据
   */
  const endAfterSession = useRef('')
  const onSwitchChat: UseChatIPCEvents['onSwitchChat'] = useMemoizedFn((session, isCreate) => {
    if (!chatID.current && getExecute()) {
      yakitNotify('warning', 'AI异常, 未记录session却处于执行状态, 请关闭AI页面重试!')
      return
    }
    if (!chatID.current && !session) return
    if (session && chatID.current && chatID.current === session) return

    setSwitchLoading(true)
    if (getExecute()) {
      endAfterSession.current = session || 'clear'
      // 这里使用chatID是因为session是替换chatID的新值，所以需要先取消旧session的会话
      onClose(chatID.current)
    } else {
      endAfterSession.current = ''
      // 直接切换数据逻辑
      handleSwitchSessionData(session || 'clear', isCreate)
    }
  })

  const onClose = useMemoizedFn((token: string, option?: { tip: () => void }) => {
    ipcRenderer.invoke('cancel-ai-re-act', token).catch(() => {})
    if (option?.tip) {
      option.tip()
    } else {
      // yakitNotify("info", "useChatIPC AI 任务已取消")
    }
  })

  useInterval(
    () => {
      handleStartSyncDataInterval()
    },
    execute ? 5000 : undefined,
  )

  useEffect(() => {
    return () => {
      if (getExecute() && chatID.current) {
        onClose(chatID.current)
      }
      // 多个接口流不会清空，只在页面卸载时触发清空并关闭页面
      logEvents.cancelLogsWin()
    }
  }, [])

  /** 清空指定变量数据 */
  const handleResetTarget = useMemoizedFn((target: 'memoryList') => {})

  /** 用户手动创建内容的执行方法 */
  const handleUserManualIntervention = useMemoizedFn((chatInfo: AIChatQSData) => {
    try {
      if (chatInfo.chatType === 'reAct') {
        casualChatEvent.handleUserManualIntervention(chatInfo)
      }
      if (chatInfo.chatType === 'task') {
        taskChatEvent.handleUserManualIntervention(chatInfo)
      }
    } catch (error) {
      yakitNotify('error', `用户手动干预操作失败: ${error}`)
    }
  })

  const state: UseChatIPCState = useCreation(() => {
    return {
      execute,
      httpRunTimeIDs,
      riskRunTimeIDs,
      yakExecResult,
      casualChat,
      taskChat,
      grpcFolders,
      questionQueue,
      reActTimelines,
      memoryList,

      taskStatus,
      casualTitle,
      casualLoading,

      systemStream,
      focusMode,
      switchLoading,
      planHistoryList,
      cancelCasualLoading,
      cancelTaskLoading,
      notifyMessage,
      requestHistoryState: requestState,
    }
  }, [
    execute,
    httpRunTimeIDs,
    riskRunTimeIDs,
    yakExecResult,
    casualChat,
    taskChat,
    grpcFolders,
    questionQueue,
    reActTimelines,
    memoryList,

    taskStatus,
    casualTitle,
    casualLoading,

    systemStream,
    focusMode,
    switchLoading,
    planHistoryList,
    cancelCasualLoading,
    cancelTaskLoading,
    notifyMessage,
    requestState,
  ])

  const event: UseChatIPCEvents = useCreation(() => {
    return {
      fetchToken,
      fetchAIRequest,
      fetchCurrentCasualTaskID,
      fetchCurrentTaskPlanID,
      fetchChatDataStore,
      onSwitchChat,
      onStart,
      onSend,
      onClose,
      onReset,
      handleTaskReviewRelease,
      onDelChats,
      handleCancelLoadingChange,
      handleResetTarget,
      handleUserManualIntervention,
      handleLoadMoreHistory: handleLoadMore,
      handleHasMoreHistory: handleHasMore,
      resetCurrentTaskPlanID,
    }
  }, [])

  return [state, event] as const
}

export default useChatIPC
