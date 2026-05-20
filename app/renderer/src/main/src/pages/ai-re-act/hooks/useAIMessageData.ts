import { useRef, useState } from 'react'
import aiChatMessageStore from '../../ai-agent/store/aiChatMessageStore'
import type { GetDialoguesData, StoreName } from '../../ai-agent/store/type'
import { useCreation, useMemoizedFn } from 'ahooks'
import { getTreeDataIds, indexedDBDataToReActChatRenderItem, toDialogueData } from './utils'
import type {
  AIFileSystemPin,
  AIMessageDataProps,
  loadMoreType,
  PaginationCursors,
  UseAIMessageDataEvents,
  UseAIMessageDataState,
} from './type'
import { yakitNotify } from '@/utils/notification'
import { AIAgentGrpcApi, AIEventQueryRequest } from './grpcApi'
import type { PaginationSchema } from '@/pages/invoker/schema'
import useGetSetState from '@/pages/pluginHub/hooks/useGetSetState'
import { grpcQueryAIEvent } from '@/pages/ai-agent/grpc'
import { Uint8ArrayToString } from '@/utils/str'

const LIMIT = 30

const DefaultHistoryPagination: PaginationSchema = { Page: 1, Limit: 200, OrderBy: 'created_at', Order: 'desc' }

const useAIMessageData = ({
  type,
  getChatStore,
  setContentMap,
  setCasualElements,
  setTaskElements,
  setTimelines,
  setGrpcFiles,
  grpcLoadMore,
}: AIMessageDataProps): [UseAIMessageDataState, UseAIMessageDataEvents] => {
  const [initLoading, setInitLoading] = useState(false)
  const [taskLoadMoreLoading, setTaskLoadMoreLoading] = useState(false)
  const [casualLoadMoreLoading, setCasualLoadMoreLoading] = useState(false)
  const [saveLoading, setSaveLoading] = useState(false)
  // 是否还有数据
  const hasMoreRef = useRef({ casual: true, task: true, grpc: true })
  // 分页id
  const cursorsRef = useRef<PaginationCursors>({})
  // 记录后端的id
  const grpcIdRef = useRef<number>(0)
  // 是否是新会话
  const isCreateSession = useRef(false)

  const isInitGrpc = useRef(false)

  const handleLoadInit: UseAIMessageDataEvents['handleLoadInit'] = useMemoizedFn(async (sessionId, offset) => {
    setInitLoading(true)
    // 重置分页状态
    handleReset()
    isCreateSession.current = true
    try {
      await aiChatMessageStore.open()
      const [casualSettled, taskSettled, metaSettled] = await Promise.allSettled([
        aiChatMessageStore.getDialogues({ storeName: `${type}CasualDB`, sessionId, limit: LIMIT }),
        aiChatMessageStore.getDialogues({ storeName: `${type}TaskDB`, sessionId, limit: LIMIT }),
        aiChatMessageStore.getSessionMetadata(sessionId),
        handleHistoryTimelines(sessionId),
        handleHistoryFileSystem(sessionId),
      ])
      const casualResult = casualSettled.status === 'fulfilled' ? casualSettled.value : { items: [], hasMore: false }
      const taskResult = taskSettled.status === 'fulfilled' ? taskSettled.value : { items: [], hasMore: false }
      const sessionMetadata = metaSettled.status === 'fulfilled' ? metaSettled.value : undefined
      if (sessionMetadata?.offset !== undefined && sessionMetadata.offset !== -1) {
        grpcIdRef.current = sessionMetadata?.offset
        const chatStore = getChatStore()
        if (chatStore) chatStore.beforeID.chatID = sessionMetadata.offset
      } else {
        grpcIdRef.current = offset ?? -1
      }
      // 记录分页游标（第一条记录的 token）
      cursorsRef.current = {
        casualId: casualResult.items.at(0)?.token,
        taskId: taskResult.items.at(0)?.token,
      }
      hasMoreRef.current = { casual: casualResult.hasMore, task: taskResult.hasMore, grpc: grpcIdRef.current > 0 }

      // 用每条记录的 token 作为 pToken 查询对应的正文内容。
      const [casualContents, taskContents] = await Promise.all([
        aiChatMessageStore.getDialogueContentsByPid({ sessionId, pTokens: getTreeDataIds(casualResult.items) }),
        aiChatMessageStore.getDialogueContentsByPid({ sessionId, pTokens: getTreeDataIds(taskResult.items) }),
      ])
      casualContents.forEach((item) => {
        setContentMap('reAct', item.token, JSON.parse(item.content))
      })
      taskContents.forEach((item) => {
        setContentMap('task', item.token, JSON.parse(item.content))
      })
      setCasualElements(indexedDBDataToReActChatRenderItem('reAct', casualResult.items))
      setTaskElements(indexedDBDataToReActChatRenderItem('task', taskResult.items))

      if (!casualResult.hasMore && grpcIdRef.current > 0) {
        isInitGrpc.current = true
        grpcLoadMore?.({ limit: LIMIT, start_id: grpcIdRef.current })
      }
    } catch (err) {
      yakitNotify('error', err instanceof Error ? err.message : '未知错误')
    } finally {
      if (isInitGrpc.current) return
      setInitLoading(false)
    }
  })

  // ─── 加载更多：按 chatType 分别翻页 ─────────────────────────────────
  const handleLoadMore: UseAIMessageDataEvents['handleLoadMore'] = useMemoizedFn(async (sessionId, chatType) => {
    switch (chatType) {
      case 'timelines':
        if (isCreateSession.current) handleHistoryTimelines(sessionId)
        break
      case 'reAct':
      case 'task':
        handleLoadMoreChatData(sessionId, chatType)
        break
      default:
        break
    }
  })

  const handleLoadMoreChatData = useMemoizedFn(async (sessionId, chatType) => {
    const isCasual = chatType === 'reAct'
    const hasMore = isCasual ? hasMoreRef.current.casual : hasMoreRef.current.task
    const loadMoreLoading = isCasual ? casualLoadMoreLoading : taskLoadMoreLoading
    // 没有更多数据或正在加载时直接返回，防止重复请求
    if (loadMoreLoading) return
    // 判断indexedDB是否还有数据可加载，没有则尝试通过grpc加载（仅限 casual）
    if (hasMore) {
      isCasual ? setCasualLoadMoreLoading(true) : setTaskLoadMoreLoading(true)
      try {
        const storeName = (isCasual ? `${type}CasualDB` : `${type}TaskDB`) as StoreName
        const cursorId = isCasual ? cursorsRef.current.casualId : cursorsRef.current.taskId

        const result: GetDialoguesData = await aiChatMessageStore.getDialogues({
          storeName,
          sessionId,
          token: cursorId,
          limit: LIMIT,
        })

        const contents = await aiChatMessageStore.getDialogueContentsByPid({
          sessionId,
          pTokens: result.items.map((item) => item.token),
        })
        contents.forEach((item) => {
          setContentMap(chatType, item.token, JSON.parse(item.content))
        })
        // 更新游标
        if (isCasual) {
          cursorsRef.current.casualId = result.items.at(0)?.token
          hasMoreRef.current.casual = result.hasMore
          if (!result.hasMore && grpcIdRef.current > 0) grpcLoadMore?.({ limit: LIMIT, start_id: grpcIdRef.current })
          setCasualElements((prev) => [...indexedDBDataToReActChatRenderItem('reAct', result.items), ...prev])
        } else {
          cursorsRef.current.taskId = result.items.at(0)?.token
          hasMoreRef.current.task = result.hasMore
          setTaskElements((prev) => [...indexedDBDataToReActChatRenderItem('task', result.items), ...prev])
        }
      } catch (err) {
        yakitNotify('error', err instanceof Error ? err.message : '未知错误')
      } finally {
        isCasual ? setCasualLoadMoreLoading(false) : setTaskLoadMoreLoading(false)
      }
    } else if (isCasual && hasMoreRef.current.grpc && grpcIdRef.current > 0) {
      // grpc 加载更多（仅限 casual）
      setCasualLoadMoreLoading(true)
      await grpcLoadMore?.({ limit: 60, start_id: grpcIdRef.current })
    }
  })

  const handleSave: UseAIMessageDataEvents['handleSave'] = useMemoizedFn(
    async (sessionId, { casualElements, taskElements, casualContentMap, taskContentMap }) => {
      if (casualElements.length === 0) return
      setSaveLoading(true)

      const sessionMetadataPromise = aiChatMessageStore.setSessionMetadata({
        sessionId,
        offset: grpcIdRef.current || 0,
      })
      const casualDialoguesPromise = aiChatMessageStore.setDialogues({
        storeName: `${type}CasualDB`,
        data: toDialogueData(casualElements, sessionId),
      })
      const taskDialoguesPromise = aiChatMessageStore.setDialogues({
        storeName: `${type}TaskDB`,
        data: toDialogueData(taskElements, sessionId),
      })
      const allContents = [...casualContentMap.values(), ...taskContentMap.values()]

      const dialogueContentPromise = aiChatMessageStore.setDialogueContent({
        data: allContents.map((content) => ({
          token: content.id,
          sessionId,
          content: JSON.stringify(content),
          pToken: content.id,
        })),
      })
      await Promise.all([sessionMetadataPromise, casualDialoguesPromise, taskDialoguesPromise, dialogueContentPromise])
        .catch(() => {
          yakitNotify('error', '保存聊天数据失败')
        })
        .finally(() => {
          setSaveLoading(false)
        })
    },
  )

  // ─── 重置 ────────────────────────────────────────────────────────────
  const handleReset: UseAIMessageDataEvents['handleReset'] = useMemoizedFn(() => {
    hasMoreRef.current = { casual: true, task: true, grpc: true }
    cursorsRef.current = {}
    grpcIdRef.current = 0

    setCasualLoadMoreLoading(false)
    setTaskLoadMoreLoading(false)

    hasMoreTimeline.current = true
    setTimelinesLoading(false)

    isInitGrpc.current = false

    isCreateSession.current = false
  })

  const handleGrpcLoadMore: UseAIMessageDataEvents['handleGrpcLoadMore'] = useMemoizedFn(
    async ({ has_more, next_start_id }) => {
      if (has_more === false) {
        grpcIdRef.current = 0
        hasMoreRef.current.grpc = false
      }
      if (grpcIdRef.current > 0) {
        hasMoreRef.current.grpc = has_more
      }
      grpcIdRef.current = next_start_id
      setCasualLoadMoreLoading(false)
      if (isInitGrpc.current) {
        setInitLoading(false)
        isInitGrpc.current = false
      }
    },
  )

  const handleHasMore: UseAIMessageDataEvents['handleHasMore'] = useMemoizedFn((chatType) => {
    if (chatType === 'timelines') return hasMoreTimeline.current
    if (chatType === 'task') return hasMoreRef.current.task
    return hasMoreRef.current.casual || hasMoreRef.current.grpc
  })

  const handleDeleteSession: UseAIMessageDataEvents['handleDeleteSession'] = useMemoizedFn(async (sessions) => {
    setSaveLoading(true)
    try {
      await aiChatMessageStore.deleteSession({ domain: type, sessions })
      // 删除成功后重置状态
      handleReset()
    } catch (err) {
      yakitNotify('error', err instanceof Error ? err.message : '删除聊天数据失败')
    } finally {
      setSaveLoading(false)
    }
  })

  // 更新当前session的历史数据请求基线(beforeID)
  const updateBeforeID = useMemoizedFn((type: loadMoreType, chatID: number) => {
    const dataStore = getChatStore?.()
    if (dataStore && dataStore.beforeID) {
      dataStore.beforeID[type] = chatID
    }
  })

  // #region 历史数据-时间线
  const [timelinesLoading, setTimelinesLoading, getTimelinesLoading] = useGetSetState(false)
  const hasMoreTimeline = useRef(true)
  const getTimelineBeforeID = useMemoizedFn(() => {
    return getChatStore?.()?.beforeID?.timelineID || undefined
  })
  const handleHistoryTimelines = useMemoizedFn(async (session: string) => {
    if (getTimelinesLoading()) return
    if (!hasMoreTimeline.current) return

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

      updateBeforeID('timelineID', Number(Events[Events.length - 1].ID))
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
      setGrpcFiles?.((old) => {
        const newFiles = [...new Map([...filterFiles, ...old].map((item) => [item.path, item])).values()]
        return newFiles
      })
    } catch {}
  })
  // #endregion

  const state: UseAIMessageDataState = useCreation(() => {
    return {
      /** 初始化加载中 */
      initLoading,
      /** 加载更多加载中 */
      casualLoadMoreLoading,
      taskLoadMoreLoading,
      saveLoading,
      /** 时间线加载中 */
      timelinesLoading,
    }
  }, [initLoading, casualLoadMoreLoading, taskLoadMoreLoading, saveLoading, timelinesLoading])

  const events: UseAIMessageDataEvents = useCreation(() => {
    return {
      handleLoadInit,
      handleLoadMore,
      handleReset,
      handleSave,
      handleGrpcLoadMore,
      handleHasMore,
      handleDeleteSession,
    }
  }, [])

  return [state, events]
}

export default useAIMessageData
