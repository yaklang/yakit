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
import { AIChatQSDataTypeEnum, type AIChatQSData, type ReActChatBaseInfo } from './aiRender'

import { useEffect, useRef, useState } from 'react'
import { yakitNotify } from '@/utils/notification'
import { useCreation, useInterval, useMemoizedFn, useThrottleFn } from 'ahooks'
import { Uint8ArrayToString } from '@/utils/str'
import useGetSetState from '@/pages/pluginHub/hooks/useGetSetState'
import useAIPerfData, { UseAIPerfDataTypes } from './useAIPerfData'
import useCasualChat from './useCasualChat'
import useYakExecResult, { UseYakExecResultTypes } from './useYakExecResult'
import useTaskChat from './useTaskChat'
import { genBaseAIChatData, genErrorLogData, genExecTasks, handleGrpcDataPushLog } from './utils'
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
import { aiSystemStreamStore } from '@/store/aiSystemStream'
import { grpcQueryAIEvent } from '@/pages/ai-agent/grpc'
import useAINodeLabel from './useAINodeLabel'
import { formatAIAgentSetting } from '@/pages/ai-agent/utils'
import { handleResetForNewSession } from './grpcAIMessageHandlers'
import useAIMessageData from './useAIMessageData'
import { getDomainFromAISource } from './useGetChatDataStoreKey'
import { v4 as uuidv4 } from 'uuid'
import moment from 'moment'
import { AttachedResourceKeyEnum, AttachedResourceTypeEnum } from '@/pages/ai-agent/defaultConstant'

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
    onYaklangCodeChange,
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

  /** ping请求的计时器 */
  const pingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  /** ping请求的syncID
   * 初次ping请求没有id，因为初次在主进程进行的
   * 后续两次ping都有对应的syncID，在该文件进行的
   */
  const pingSyncID = useRef<string>('')
  const handlePingTimer = useMemoizedFn(() => {
    if (pingTimerRef.current) clearInterval(pingTimerRef.current)
    pingTimerRef.current = setInterval(() => {
      pingSyncID.current = uuidv4()
      sendRequest({
        IsSyncMessage: true,
        SyncType: AIInputEventSyncTypeEnum.SYNC_TYPE_PING,
        SyncID: pingSyncID.current,
      })
    }, 5000)
  })
  const resetPingTimer = useMemoizedFn(() => {
    if (pingTimerRef.current) clearInterval(pingTimerRef.current)
    pingTimerRef.current = null
    pingSyncID.current = ''
  })

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
  const reactMemorys = useRef<AIAgentGrpcApi.MemoryEntryList>(cloneDeep(DefaultMemoryList))
  const taskMemorys = useRef<AIAgentGrpcApi.MemoryEntryList>(cloneDeep(DefaultMemoryList))
  const [memoryList, setMemoryList] = useState<AIAgentGrpcApi.MemoryEntryList>(cloneDeep(DefaultMemoryList))

  const handleResetMemoryList = useMemoizedFn(() => {
    reactMemorys.current = cloneDeep(DefaultMemoryList)
    taskMemorys.current = cloneDeep(DefaultMemoryList)
    setMemoryList(cloneDeep(DefaultMemoryList))
  })
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
  const handleSetSystemStream = useMemoizedFn((uuid: string, content: string) => {
    aiSystemStreamStore.appendChunk(uuid, content)
  })
  const handleResetSystemStream = useMemoizedFn(() => {
    aiSystemStreamStore.reset()
  })
  // #endregion

  // #region 场景状态相关逻辑
  const [focusMode, setFocusMode] = useState<string>('')
  const handleFocusModeChange = useMemoizedFn((mode: string) => {
    setFocusMode(mode)
  })

  const handleResetFocusMode = useMemoizedFn(() => {
    setFocusMode('')
  })
  // #endregion

  // #region 通知消息相关逻辑
  const [notifyMessage, setNotifyMessage] = useState<UseChatIPCState['notifyMessage'] | null>(null)
  const notifyMessageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const handleSetNotifyMessage = useMemoizedFn((raw: AIAgentGrpcApi.Notify, label: AIOutputI18n) => {
    if (notifyMessageTimerRef.current !== null) {
      clearTimeout(notifyMessageTimerRef.current)
      notifyMessageTimerRef.current = null
    }
    const { type, content } = raw
    setNotifyMessage({ type, content, label })

    let durationMs = 0
    if (typeof raw.duration_ms === 'number' && !Number.isNaN(raw.duration_ms) && raw.duration_ms > 0) {
      durationMs = raw.duration_ms
    } else if (
      typeof raw.duration_seconds === 'number' &&
      !Number.isNaN(raw.duration_seconds) &&
      raw.duration_seconds > 0
    ) {
      durationMs = raw.duration_seconds * 1000
    } else if (typeof raw.duration === 'number' && !Number.isNaN(raw.duration) && raw.duration > 0) {
      durationMs = raw.duration * 1000
    }
    if (durationMs > 0) {
      notifyMessageTimerRef.current = setTimeout(() => {
        notifyMessageTimerRef.current = null
        setNotifyMessage(null)
      }, durationMs)
    }
  })
  const handleResetNotifyMessage = useMemoizedFn(() => {
    if (notifyMessageTimerRef.current !== null) {
      clearTimeout(notifyMessageTimerRef.current)
      notifyMessageTimerRef.current = null
    }
    setNotifyMessage(null)
  })
  // #endregion

  // #region 历史任务规划列表相关逻辑
  const [planHistoryList, setPlanHistoryList] = useState<AIAgentGrpcApi.PlanHistoryList>(
    cloneDeep(DefaultPlanHistoryList),
  )
  const handlePlanHistoryListChange = useMemoizedFn((list: AIAgentGrpcApi.PlanHistoryList) => {
    try {
      const arr = cloneDeep(list.records)
      if (!arr || arr.length === 0) {
        setPlanHistoryList({ ...list })
        return
      }
      const newArr = arr
        .map((item) => {
          // 因为后端给过来的task_progress是一个json的string类型数据
          item.task_progress = JSON.parse(item.task_progress as unknown as string) as AIAgentGrpcApi.PlanHistoryProgress
          // 因为后端给过来的task_tree是一个json的string类型数据，所以需要转换成树形结构的数据，供UI展示使用
          const tree = JSON.parse(item.task_tree as unknown as string) as AIAgentGrpcApi.PlanTask
          // 记录任务虎根节点的名字，供UI展示使用
          item.root_task_name = tree.name
          item.task_tree = genExecTasks(tree)
          return item
        })
        .filter((item) => item.task_progress.phase !== 'Completed')
      setPlanHistoryList({ ...list, records: newArr })
    } catch (error) {}
  })
  const handleResetPlanHistoryList = useMemoizedFn(() => {
    setPlanHistoryList(cloneDeep(DefaultPlanHistoryList))
  })
  // #endregion

  // #region 单次流执行时的输出展示数据
  // 日志
  const logEvents = useAIChatLog()

  // AI性能相关数据和逻辑
  const aiPerfDataEvent = useAIPerfData({
    pushLog: logEvents.pushLog,
    getChatDataStore,
  })
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

  /** 记录所有自由对话的子任务-taskID */
  const casualSubTaskIDs = useRef<Set<string>>(new Set())

  /** 用户主动关闭当前问题的loading状态(自由对话) */
  const [cancelCasualLoading, setCancelCasualLoading] = useState(false)

  /** 自由对话(ReAct)的loading状态 */
  /** 自由对话loading状态中的显示文案 */
  const [casualTitle, setCasualTitle] = useState<string>('')
  /** 自由对话是否在进行中 */
  const [casualLoading, setCasualLoading] = useState<boolean>(false)
  const handleResetCasualStatus = useMemoizedFn(() => {
    setCasualLoading(false)
    setCasualTitle('')
    return
  })

  const [casualChat, casualChatEvent] = useCasualChat({
    pushLog: logEvents.pushLog,
    getChatDataStore,
    getRequest: fetchAIRequest,
    getCurrentCasualTaskID: fetchCurrentCasualTaskID,
    onReview: onTaskReview,
    onReviewRelease: handleCasualReviewRelease,
    onSubTaskID: (taskID) => {
      casualSubTaskIDs.current.add(taskID)
    },
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
  const handleCancelLoadingChange = useMemoizedFn((type: ReActChatBaseInfo['chatType'], status: boolean) => {
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
        // 如果自由对话引起了任务规划，那么自由对话其实是空闲状态
        const isCasualIdle = casualLoading && currentCasualTaskID.current === currentTaskPlanID.current?.taskID
        if (!casualLoading || isCasualIdle) {
          const chatID = uuidv4()
          const AttachedResourceInfos = params.AttachedResourceInfo || []
          AttachedResourceInfos.push({
            Key: AttachedResourceKeyEnum.CONTEXT_PROVIDER_KEY_DEFAULT,
            Type: AttachedResourceTypeEnum.USER_FREE_INPUT_UUID,
            Value: chatID,
          })
          params.AttachedResourceInfo = AttachedResourceInfos
          const chatData: AIChatQSData = {
            id: chatID,
            chatType: 'reAct',
            type: AIChatQSDataTypeEnum.QUESTION,
            Timestamp: moment().unix(),
            data: { qs: params.FreeInput || '', setting: {} },
            AIService: '',
            AIModelName: '',
            // showQS为了UI渲染方便，重新构建的字段
            extraValue: { showQS: params.FreeInput || '' },
          }
          casualChatEvent.setContentMap(chatData.id, chatData)
          casualChatEvent.setElements((old) => {
            return [
              ...old,
              { token: chatData.id, type: chatData.type, renderNum: 1, chatType: 'reAct', kind: 'task', children: [] },
            ]
          })
        }
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
    resetPingTimer()
    taskChatEvent.handleCloseGrpc()
    setExecute(false)
    setCasualLoading(false)
    handleResetTaskStatus()
  })

  /** 流接口开始前需要重置的一些状态 */
  const handleResetBeforeStart = useMemoizedFn(() => {
    // 清空场景
    handleResetFocusMode()
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
    handleResetMemoryList()
    handleResetReActTimelines()
    handleResetSystemStream()
    handleResetFocusMode()
    handleResetNotifyMessage()
    handleResetPlanHistoryList()
    currentCasualTaskID.current = ''
    casualSubTaskIDs.current.clear()
    handleResetCasualStatus()
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
          // 如果返回的pong没有值，但是pingSyncID有值，说明该条消息已经过期
          if (!res.SyncID && pingSyncID.current) return
          // 如果返回的pong有值，但是和pingSyncID不一样，说明该条消息已经过期
          if (res.SyncID && res.SyncID !== pingSyncID.current) return
          // 该条消息有效，不需要在轮询ping请求了
          resetPingTimer()
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
        // console.log('ipcContent', res, `------${res.TaskId}`, ipcContent)
        if (res.Type === 'structured' && res.NodeId === 'recovery_history') {
          const recoveryHistory = JSON.parse(ipcContent) as AIAgentGrpcApi.RecoveryHistory
          const chatStore = getChatDataStore()
          if (chatStore) chatStore.beforeID.chatID = recoveryHistory.next_start_id
          requestEvents.handleGrpcLoadMore(recoveryHistory)
          return
        }

        if (res.Type === 'yak_httpflow_count') {
          // 产生一条http流量数据时的通知
          // 不能在这个if里return，因为这个数据在工具卡片中还要进行计数逻辑使用
          const httpNotice = JSON.parse(ipcContent) as AIAgentGrpcApi.HTTPTrafficNotice
          if (!res.IsSync) {
            setHttpRunTimeIDs((old) => {
              if (old.includes(httpNotice.runtime_id)) return old
              return [...old, httpNotice.runtime_id]
            })
          }
        }

        if (res.Type === 'yak_risk_count') {
          // 产生一条risk流量数据时的通知
          // 不能在这个if里return，因为这个数据在工具卡片中还要进行计数逻辑使用
          const riskNotice = JSON.parse(ipcContent) as AIAgentGrpcApi.RiskTrafficNotice
          if (!res.IsSync) {
            setRiskRunTimeIDs((old) => {
              if (old.includes(riskNotice.runtime_id)) return old
              return [...old, riskNotice.runtime_id]
            })
          }
        }

        if (res.Type === 'http_fuzz_request_change') {
          if (res.IsSync) return
          // http_fuzz_request_change
          const httpFuzzRequest = JSON.parse(ipcContent) as AIAgentGrpcApi.HttpFuzzRequestChange
          onHttpFuzzRequestChange?.(httpFuzzRequest)
          return
        }

        if (res.Type === 'http_flow_fuzz_status') {
          const httpFlowFuzzStatus = JSON.parse(ipcContent) as AIAgentGrpcApi.GetHttpFlowFuzzStatus
          onGetHttpFlowFuzzStatus?.(httpFlowFuzzStatus)
        }

        if (res.Type === 'yaklang_code_change') {
          if (res.IsSync) return
          const yaklangCodeChange = JSON.parse(ipcContent) as AIAgentGrpcApi.YaklangCodeChange
          onYaklangCodeChange?.(yaklangCodeChange)
          return
        }

        if (res.Type === 'structured' && res.NodeId === 'session_title') {
          if (res.IsSync) return
          // 生成会话的名称
          const nameInfo = JSON.parse(ipcContent) as { title: string }
          if (nameInfo && nameInfo.title && !!setSessionChatName) setSessionChatName(chatID.current, nameInfo.title)
          return
        }

        if (res.Type === 'start_plan_and_execution') {
          if (res.IsSync) return
          /** 清空任务规划的todolist详情 */
          getChatDataStore()?.taskChat.planDetailsMap.clear()
          // 触发任务规划，并传出任务规划流的标识 coordinator_id
          const startInfo = JSON.parse(ipcContent) as AIAgentGrpcApi.AIStartPlanAndExecution
          if (startInfo.coordinator_id && currentTaskPlanID.current?.coordinatorId !== startInfo.coordinator_id) {
            // 设置任务规划对应的问题ID, 并清除自由对话(ReAct)的loading状态
            currentTaskPlanID.current = {
              taskID: startInfo['re-act_task'],
              status: AITaskStatus.inProgress,
              // 取消任务规划需要的数据id
              coordinatorId: startInfo.coordinator_id,
            }
            // 开始任务规划后，刷新历史任务树
            sendRequest({ IsSyncMessage: true, SyncType: AIInputEventSyncTypeEnum.SYNC_TYPE_PLAN_EXEC_TASKS })
            // 任务规划的loading开始置为true
            setTaskStatus(() => ({ loading: true, plan: '加载中...', task: '加载中...' }))
            // 触发任务规划UI展示的回调
            onTaskStart && onTaskStart()
            const chatData: AIChatQSData = {
              ...genBaseAIChatData(res),
              id: `${currentTaskPlanID.current.taskID}-unknown`,
              chatType: 'task',
              type: AIChatQSDataTypeEnum.TASK_DEFAULT_GROUP,
            } as AIChatQSData
            getChatDataStore?.()?.taskChat?.contents.set(chatData.id, chatData)
            taskChatEvent.setElements((old) => {
              const exists = old.some((item) => item.token === chatData.id && item.type === chatData.type)
              if (exists) return old
              return [
                ...old,
                { token: chatData.id, type: chatData.type, renderNum: 1, chatType: 'task', kind: 'task', children: [] },
              ]
            })
          }
          /** 获取最新任务树状态 */
          sendRequest({ IsSyncMessage: true, SyncType: AIInputEventSyncTypeEnum.SYNC_TYPE_PLAN })
          /** 恢复任务规划的时候，这个指令执行成功后，在这里取消loading */
          setCancelTaskLoading(false)
          return
        }
        if (res.Type === 'end_plan_and_execution') {
          if (res.IsSync) return
          // 结束任务规划，并传出任务规划流的标识 coordinator_id
          const startInfo = JSON.parse(ipcContent) as AIAgentGrpcApi.AIStartPlanAndExecution
          if (startInfo.coordinator_id && currentTaskPlanID.current?.coordinatorId === startInfo.coordinator_id) {
            taskChatEvent.handlePlanExecEnd(res)
            /**先修改任务状态loading，再改变任务树的状态 */
            handleResetTaskStatus()
            taskChatEvent.handleCloseGrpc()
          }
          return
        }

        if (res.Type === 'memory_context') {
          // 实时记忆列表
          const lists = JSON.parse(ipcContent) as AIAgentGrpcApi.MemoryEntryList
          if (currentTaskPlanID.current?.coordinatorId === res.CoordinatorId) {
            taskMemorys.current = lists
          } else {
            reactMemorys.current = lists
          }
          try {
            const newMemoryEntryList: AIAgentGrpcApi.MemoryEntryList = {
              memories: [...(taskMemorys.current.memories || []), ...(reactMemorys.current.memories || [])],
              memory_pool_limit:
                Number(taskMemorys.current.memory_pool_limit) + Number(reactMemorys.current.memory_pool_limit),
              memory_session_id: reactMemorys.current.memory_session_id,
              total_memories: Number(taskMemorys.current.total_memories) + Number(reactMemorys.current.total_memories),
              total_size: Number(taskMemorys.current.total_size) + Number(reactMemorys.current.total_size),
              score_overview: {
                A_total:
                  Number(taskMemorys.current.score_overview.A_total) +
                  Number(reactMemorys.current.score_overview.A_total),
                C_total:
                  Number(taskMemorys.current.score_overview.C_total) +
                  Number(reactMemorys.current.score_overview.C_total),
                E_total:
                  Number(taskMemorys.current.score_overview.E_total) +
                  Number(reactMemorys.current.score_overview.E_total),

                O_total:
                  Number(taskMemorys.current.score_overview.O_total) +
                  Number(reactMemorys.current.score_overview.O_total),
                P_total:
                  Number(taskMemorys.current.score_overview.P_total) +
                  Number(reactMemorys.current.score_overview.P_total),
                R_total:
                  Number(taskMemorys.current.score_overview.R_total) +
                  Number(reactMemorys.current.score_overview.R_total),
                T_total:
                  Number(taskMemorys.current.score_overview.T_total) +
                  Number(reactMemorys.current.score_overview.T_total),
              },
            }
            setMemoryList(newMemoryEntryList)
          } catch (error) {}

          return
        }

        if (['filesystem_pin_directory', 'filesystem_pin_filename'].includes(res.Type)) {
          if (res.IsSync) return
          // 会话在本地缓存数据的(文件夹/文件)路径-更新就通知[不区分自由对话和任务规划]
          const { path } = JSON.parse(ipcContent) as AIAgentGrpcApi.FileSystemPin
          handleSetGrpcFolders({ path, isFolder: res.Type === 'filesystem_pin_directory' })
          return
        }

        if (res.Type === 'structured' && res.NodeId === 'react_task_enqueue') {
          if (res.IsSync) return
          if (currentTaskPlanID.current?.coordinatorId === res.CoordinatorId) return
          handleTriggerQuestionQueueRequest()
        }
        if (res.Type === 'structured' && res.NodeId === 'react_task_dequeue') {
          // 自由对话里的问题出队消息
          if (currentTaskPlanID.current?.coordinatorId === res.CoordinatorId) return

          if (!res.IsSync) {
            handleTriggerQuestionQueueRequest()
            const data = JSON.parse(ipcContent) as AIAgentGrpcApi.QuestionQueueStatusChange
            const newCasualTaskId = res.TaskId || data.react_task_id
            currentCasualTaskID.current = newCasualTaskId
            casualChatEvent.resetTodoListData(newCasualTaskId)
            if (data.focus_mode) {
              // 记录场景状态
              handleFocusModeChange(data.focus_mode)
            } else {
              // 非场景状态
              handleResetFocusMode()
            }
            setCasualLoading(true)
          }
          // 不能return，因为自由对话的hook要进行问题的UI渲染逻辑处理
        }
        if (res.Type === 'structured' && res.NodeId === 'react_task_cleared') {
          // 自由对话里的问题队列清空消息
          if (currentTaskPlanID.current?.coordinatorId === res.CoordinatorId) return
          // 问题队列清空操作
          handleReActTaskCleared(res)
          return
        }

        if (res.Type === 'notify') {
          const data = JSON.parse(ipcContent) as AIAgentGrpcApi.Notify
          handleSetNotifyMessage(data, res.NodeIdVerbose)
          return
        }

        if (res.Type === 'structured' && res.NodeId === 'plan_exec_tasks') {
          // 任务规划历史数据列表
          const list = JSON.parse(ipcContent) as AIAgentGrpcApi.PlanHistoryList
          handlePlanHistoryListChange(list)
          return
        }

        if (UseAIPerfDataTypes.includes(res.Type)) {
          if (res.IsSync) return
          // AI性能数据处理
          aiPerfDataEvent.handleSetData(res)
          return
        }

        if (UseYakExecResultTypes.includes(res.Type)) {
          if (res.IsSync) return
          // 执行过程中插件输出的卡片
          yakExecResultEvent.handleSetData(res)
          return
        }

        if (res.Type === 'structured' && res.NodeId === 'queue_info') {
          // 因为问题队列也分自由对话和任务规划队列，所以需要先屏蔽处理任务规划的队列信息
          if (currentTaskPlanID.current?.coordinatorId === res.CoordinatorId) return
          // 问题队列信息由chatIPC-hook进行收集
          const { tasks, total_tasks } = JSON.parse(ipcContent) as AIAgentGrpcApi.QuestionQueues
          setQuestionQueue({
            total: total_tasks,
            data: tasks ?? [],
          })
          return
        }

        if (res.Type === 'structured' && res.NodeId === 'timeline_item') {
          if (res.IsSync) return
          // 自由对话子任务的time-line-item不展示
          if (casualSubTaskIDs.current.has(res.TaskId)) return
          /* 实时时间线单条 */
          const timelineItem = JSON.parse(ipcContent) as AIAgentGrpcApi.TimelineItem
          setReActTimelines((old) => [...old, timelineItem])
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
          } else if (res.NodeId === 'react_task_status_changed') {
            if (res.IsSync) return
            // 只负责获取自由对话的任务状态
            if (currentTaskPlanID.current?.coordinatorId === res.CoordinatorId) return
            /* 问题的状态变化 */

            const params = JSON.parse(ipcContent) as AIAgentGrpcApi.ReactTaskChanged
            const { react_task_now_status } = params
            const react_task_id = res.TaskId || params.react_task_id
            if (['completed', 'aborted', 'skipped'].includes(react_task_now_status)) {
              if (currentCasualTaskID.current && currentCasualTaskID.current === react_task_id) {
                setCancelCasualLoading(false)
                setCasualLoading(false)
              }
              if (currentCasualTaskID.current === react_task_id) handleResetFocusMode()
              if (currentTaskPlanID.current?.taskID === react_task_id) {
                currentTaskPlanID.current.status = react_task_now_status as AITaskStatus
                setCancelTaskLoading(false)
              }
            }
            casualChatEvent.handleSetData(res)
            return
          } else if (res.NodeId === 'status') {
            if (res.IsSync) return
            const data = JSON.parse(ipcContent) as { key: string; value: string }
            if (data.key === 're-act-loading-status-key') {
              if (currentTaskPlanID.current?.coordinatorId === res.CoordinatorId) {
                // 任务规划-loading展示标题
                setTaskStatus((old) => {
                  if (old.loading) {
                    return { ...old, task: data.value || '加载中...' }
                  }
                  return old
                })
              } else {
                if (res.TaskId !== currentCasualTaskID.current) return
                // 自由对话-loading展示标题
                setCasualTitle(data.value)
              }
            } else if (data.key === 'plan-executing-loading-status-key') {
              if (currentTaskPlanID.current?.coordinatorId === res.CoordinatorId) {
                // 任务规划-loading展示标题
                setTaskStatus((old) => {
                  if (old.loading) {
                    return { ...old, plan: data.value || '加载中...' }
                  }
                  return old
                })
              }
            } else {
              // 执行状态卡片处理
              yakExecResultEvent.handleSetData(res)
            }
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

      const chatID = uuidv4()

      const AttachedResourceInfos = params.AttachedResourceInfo || []
      AttachedResourceInfos.push({
        Key: AttachedResourceKeyEnum.CONTEXT_PROVIDER_KEY_DEFAULT,
        Type: AttachedResourceTypeEnum.USER_FREE_INPUT_UUID,
        Value: chatID,
      })
      firstQS.current = {
        IsFreeInput: true,
        FreeInput: params.Params.UserQuery,
        AttachedResourceInfo: AttachedResourceInfos,
        FocusModeLoop: params.FocusModeLoop,
      }
      // 用户问了问题后，立即显示到UI上
      // 问题对应的re_act_task_id先由前端生成，并发送给后端
      // 后续生成re_act_task_id时，会把前端生成的uuid替换为后端生成的re_act_task_id
      const chatData: AIChatQSData = {
        id: chatID,
        chatType: 'reAct',
        type: AIChatQSDataTypeEnum.QUESTION,
        Timestamp: moment().unix(),
        data: { qs: firstQS.current.FreeInput || '', setting: {} },
        AIService: '',
        AIModelName: '',
        // showQS为了UI渲染方便，重新构建的字段
        extraValue: { showQS: firstQS.current.FreeInput || '' },
      }
      casualChatEvent.setContentMap(chatData.id, chatData)
      casualChatEvent.setElements((old) => {
        return [
          ...old,
          { token: chatData.id, type: chatData.type, renderNum: 1, chatType: 'reAct', kind: 'task', children: [] },
        ]
      })
    }
    ipcRenderer.invoke('start-ai-re-act', token, params)

    // 建立会话连接时，在主进程进行了一次ping请求
    // 如果五秒没有返回pong消息，则再次进行ping请求
    handlePingTimer()
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
      chatID.current = ''
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
  const handleResetTarget = useMemoizedFn((target: 'memoryList') => {
    switch (target) {
      case 'memoryList':
        handleResetMemoryList()
        break

      default:
        break
    }
  })

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
