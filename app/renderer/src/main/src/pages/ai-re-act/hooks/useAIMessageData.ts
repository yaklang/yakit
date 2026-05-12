import { useRef, useState } from 'react'
import aiChatMessageStore from '../../ai-agent/store/aiChatMessageStore'
import type { GetDialoguesData, StoreName } from '../../ai-agent/store/type'
import { useMemoizedFn } from 'ahooks'
import { indexedDBDataToReActChatRenderItem } from './utils'
import type { AIMessageDataProps, PaginationCursors, UseAIMessageDataEvents, UseAIMessageDataState } from './type'

const LIMIT = 10

const useAIMessageData = ({
  setContentMap,
  setCasualElements,
  setTaskElements,
  grpcLoadMore,
  type,
}: AIMessageDataProps): [UseAIMessageDataState, UseAIMessageDataEvents] => {
  const [initLoading, setInitLoading] = useState(false)
  const [taskLoadMoreLoading, setTaskLoadMoreLoading] = useState(false)
  const [casualLoadMoreLoading, setCasualLoadMoreLoading] = useState(false)
  const [saveLoading, setSaveLoading] = useState(false)
  // 是否还有数据
  const hasMoreRef = useRef({ casual: true, task: true })
  // 分页id
  const cursorsRef = useRef<PaginationCursors>({})
  // 记录后端的id
  const grpcIdRef = useRef<number>()

  const handleLoadInit: UseAIMessageDataEvents['handleLoadInit'] = async (sessionId) => {
    setInitLoading(true)
    // 重置分页状态
    handleReset()

    try {
      await aiChatMessageStore.open()
      const [casualResult, taskResult, sessionMetadata] = await Promise.all([
        aiChatMessageStore.getDialogues({ storeName: `${type}CasualDB`, sessionId, limit: LIMIT }),
        aiChatMessageStore.getDialogues({ storeName: `${type}TaskDB`, sessionId, limit: LIMIT }),
        aiChatMessageStore.getSessionMetadata(sessionId),
      ])
      if (sessionMetadata?.offset === -1) {
        grpcLoadMore?.({ limit: 1, start_id: grpcIdRef.current })
      }
      grpcIdRef.current = sessionMetadata?.offset
      // 记录分页游标（第一条记录的 id）
      cursorsRef.current = {
        casualId: casualResult.items.at(0)?.id,
        taskId: taskResult.items.at(0)?.id,
      }
      if (!casualResult.hasMore) {
        grpcLoadMore?.({ limit: 1, start_id: grpcIdRef.current })
        console.log('1111:', 1111, grpcIdRef.current)
        hasMoreRef.current = {
          casual: false,
          task: taskResult.hasMore,
        }
      } else {
        hasMoreRef.current = {
          casual: casualResult.hasMore,
          task: taskResult.hasMore,
        }
      }
      console.log('casualResult:', casualResult)
      setCasualElements(indexedDBDataToReActChatRenderItem('reAct', casualResult.items))
      setTaskElements(indexedDBDataToReActChatRenderItem('task', taskResult.items))

      // 用每条记录的 id 作为 pid 查询对应的正文内容。
      const [casualContents, taskContents] = await Promise.all([
        aiChatMessageStore.getDialogueContentsByPid({ sessionId, pids: casualResult.items.map((item) => item.id) }),
        aiChatMessageStore.getDialogueContentsByPid({ sessionId, pids: taskResult.items.map((item) => item.id) }),
      ])
      casualContents.forEach((item) => {
        setContentMap('reAct', item.id, JSON.parse(item.content))
      })
      taskContents.forEach((item) => {
        setContentMap('task', item.id, JSON.parse(item.content))
      })
    } catch (err) {
      throw err instanceof Error ? err : new Error('未知错误')
    } finally {
      setInitLoading(false)
    }
  }

  // ─── 加载更多：按 chatType 分别翻页 ─────────────────────────────────
  const handleLoadMore: UseAIMessageDataEvents['handleLoadMore'] = async (sessionId, chatType) => {
    const isCasual = chatType === 'reAct'
    const hasMore = isCasual ? hasMoreRef.current.casual : hasMoreRef.current.task
    const loadMoreLoading = isCasual ? casualLoadMoreLoading : taskLoadMoreLoading
    // 没有更多数据或正在加载时直接返回，防止重复请求
    if (!hasMore || loadMoreLoading) return

    isCasual ? setCasualLoadMoreLoading(true) : setTaskLoadMoreLoading(true)
    try {
      const storeName = (isCasual ? `${type}CasualDB` : `${type}TaskDB`) as StoreName
      const cursorId = isCasual ? cursorsRef.current.casualId : cursorsRef.current.taskId

      const result: GetDialoguesData = await aiChatMessageStore.getDialogues({
        storeName,
        sessionId,
        id: cursorId,
        limit: LIMIT,
      })

      // 更新游标
      if (isCasual) {
        cursorsRef.current.casualId = result.items.at(0)?.id
        if (!result.hasMore) {
          grpcLoadMore?.({ limit: 1, start_id: grpcIdRef.current })
          hasMoreRef.current.casual = false
        } else {
          hasMoreRef.current.casual = result.hasMore
        }
        setCasualElements((prev) => [...prev, ...indexedDBDataToReActChatRenderItem('reAct', result.items)])
      } else {
        cursorsRef.current.taskId = result.items.at(0)?.id
        hasMoreRef.current.task = result.hasMore
        setTaskElements((prev) => [...prev, ...indexedDBDataToReActChatRenderItem('task', result.items)])
      }

      const contents = await aiChatMessageStore.getDialogueContentsByPid({
        sessionId,
        pids: result.items.map((item) => item.id),
      })
      contents.forEach((item) => {
        setContentMap(chatType, item.id, JSON.parse(item.content))
      })
    } catch (err) {
    } finally {
      isCasual ? setCasualLoadMoreLoading(false) : setTaskLoadMoreLoading(false)
    }
  }

  const handleSave: UseAIMessageDataEvents['handleSave'] = async (
    sessionId,
    { casualElements, taskElements, casualContentMap, taskContentMap },
  ) => {
    console.log('handleSave:', casualElements, casualContentMap)
    setSaveLoading(true)
    const sessionMetadataPromise = aiChatMessageStore.setSessionMetadata({
      sessionId,
      offset: grpcIdRef.current || 0,
    })
    const casualDialoguesPromise = aiChatMessageStore.setDialogues({
      storeName: `${type}CasualDB`,
      data: casualElements.map((item, index) => ({
        id: item.token,
        type: item.type,
        isGroup: item.isGroup || false,
        children: JSON.stringify('children' in item && item.isGroup ? item.children : []),
        sessionId,
        cacheOrder: index,
      })),
    })
    const taskDialoguesPromise = aiChatMessageStore.setDialogues({
      storeName: `${type}TaskDB`,
      data: taskElements.map((item, index) => ({
        id: item.token,
        type: item.type,
        isGroup: item.isGroup || false,
        children: JSON.stringify('children' in item && item.isGroup ? item.children : []),
        sessionId,
        cacheOrder: index,
      })),
    })
    const allContents = [...casualContentMap.values(), ...taskContentMap.values()]

    const dialogueContentPromise = aiChatMessageStore.setDialogueContent({
      data: allContents.map((content) => ({
        id: content.id,
        sessionId,
        content: JSON.stringify(content),
        pid: content.id,
      })),
    })
    await Promise.all([sessionMetadataPromise, casualDialoguesPromise, taskDialoguesPromise, dialogueContentPromise])
      .catch((err) => {
        console.error('保存聊天数据失败', err)
      })
      .finally(() => {
        setSaveLoading(false)
      })
  }

  // ─── 重置 ────────────────────────────────────────────────────────────
  const handleReset: UseAIMessageDataEvents['handleReset'] = () => {
    hasMoreRef.current = { casual: true, task: true }
    cursorsRef.current = {}
  }

  const handleGrpcLoadMore: UseAIMessageDataEvents['handleGrpcLoadMore'] = useMemoizedFn(
    async ({ has_more, next_start_id }) => {
      console.log('1111:', { has_more, next_start_id })
      hasMoreRef.current.casual = has_more
      grpcIdRef.current = next_start_id
    },
  )

  const handleHasMore: UseAIMessageDataEvents['handleHasMore'] = (chatType) => {
    return hasMoreRef.current[chatType === 'reAct' ? 'casual' : 'task']
  }

  return [
    {
      /** 初始化加载中 */
      initLoading,
      /** 加载更多加载中 */
      casualLoadMoreLoading,
      taskLoadMoreLoading,
      saveLoading,
    },
    {
      handleLoadInit,
      handleLoadMore,
      handleReset,
      handleSave,
      handleGrpcLoadMore,
      handleHasMore,
    },
  ]
}

export default useAIMessageData
