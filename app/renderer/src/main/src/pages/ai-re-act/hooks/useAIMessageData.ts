import { useRef, useState } from 'react'
import aiChatMessageStore from '../../ai-agent/store/aiChatMessageStore'
import type { GetDialoguesData, StoreName } from '../../ai-agent/store/type'
import { useMemoizedFn } from 'ahooks'
import { indexedDBDataToReActChatRenderItem } from './utils'
import type {
  AIMessageDataProps,
  PaginationCursors,
  AIFnBaseParams,
  LoadMoreParams,
  UseAIMessageDataEvents,
} from './type'

interface SessionMetadata {
  offset: number
}

interface SaveParams extends AIFnBaseParams {
  casualElements: ReActChatRenderItem[]
  taskElements: ReActChatRenderItem[]
  contentMap: Record<string, DialogueContentRecord[]>
  sessionMetadata: SessionMetadata
}

const LIMIT = 10

const useAIMessageData = ({
  setContentMap,
  setCasualElements,
  setTaskElements,
  grpcLoadMore,
  type,
}: AIMessageDataProps) => {
  const [initLoading, setInitLoading] = useState(false)
  const [loadMoreLoading, setLoadMoreLoading] = useState(false)

  // 是否还有数据
  const hasMoreRef = useRef({ casual: true, task: true })
  // 分页id
  const cursorsRef = useRef<PaginationCursors>({})

  const initRequest: UseAIMessageDataEvents['handleLoadInit'] = async ({ sessionId }: AIFnBaseParams) => {
    setInitLoading(true)
    // 重置分页状态
    reset()

    try {
      await aiChatMessageStore.open()
      const [casualResult, taskResult] = await Promise.all([
        aiChatMessageStore.getDialogues({ storeName: `${type}CasualDB`, sessionId, limit: LIMIT }),
        aiChatMessageStore.getDialogues({ storeName: `${type}TaskDB`, sessionId, limit: LIMIT }),
      ])

      // 记录分页游标（第一条记录的 id）
      cursorsRef.current = {
        casualId: casualResult.items.at(0)?.id,
        taskId: taskResult.items.at(0)?.id,
      }
      if (!casualResult.hasMore) grpcLoadMore?.()
      hasMoreRef.current = {
        casual: casualResult.hasMore,
        task: taskResult.hasMore,
      }
      setCasualElements(indexedDBDataToReActChatRenderItem('reAct', casualResult.items))
      setTaskElements(indexedDBDataToReActChatRenderItem('task', taskResult.items))

      // 用每条记录的 id 作为 pid 查询对应的正文内容。
      const [casualContents, taskContents] = await Promise.all([
        aiChatMessageStore.getDialogueContentsByPid({ sessionId, pids: casualResult.items.map((item) => item.id) }),
        aiChatMessageStore.getDialogueContentsByPid({ sessionId, pids: taskResult.items.map((item) => item.id) }),
      ])
      setContentMap('reAct', casualContents)
      setContentMap('task', taskContents)
    } catch (err) {
      throw err instanceof Error ? err : new Error('未知错误')
    } finally {
      setInitLoading(false)
    }
  }

  // ─── 加载更多：按 chatType 分别翻页 ─────────────────────────────────
  const loadMore: UseAIMessageDataEvents['handleLoadMore'] = async ({ sessionId, chatType }: LoadMoreParams) => {
    const isCasual = chatType === 'reAct'
    const hasMore = isCasual ? hasMoreRef.current.casual : hasMoreRef.current.task

    // 没有更多数据或正在加载时直接返回，防止重复请求
    if (!hasMore || loadMoreLoading) return

    setLoadMoreLoading(true)
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
        if (!result.hasMore) grpcLoadMore?.()
        hasMoreRef.current.casual = result.hasMore
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
      setContentMap(chatType, contents)
    } catch (err) {
    } finally {
      setLoadMoreLoading(false)
    }
  }

  const save = async ({ sessionId, casualElements, taskElements, contentMap, sessionMetadata }: SaveParams) => {
    const sessionMetadataPromise = aiChatMessageStore.setSessionMetadata({
      sessionId,
      offset: sessionMetadata.offset,
    })
    const casualDialoguesPromise = aiChatMessageStore.setDialogues({
      storeName: `${type}CasualDB`,
      data: casualElements.map((item, index) => ({
        id: item.token,
        type: item.type,
        isGroup: item.isGroup || false,
        children: JSON.stringify('children' in item && item.isGroup ? item.children : []),
        sessionId,
        orderNum: index,
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
        orderNum: index,
      })),
    })
    const allContents = [...Object.values(contentMap)].flat()
    const dialogueContentPromise = aiChatMessageStore.setDialogueContent({
      data: allContents,
    })
    await Promise.all([
      sessionMetadataPromise,
      casualDialoguesPromise,
      taskDialoguesPromise,
      dialogueContentPromise,
    ]).catch((err) => {
      console.error('保存聊天数据失败', err)
    })
  }

  // ─── 重置 ────────────────────────────────────────────────────────────
  const reset: UseAIMessageDataEvents['handleReset'] = () => {
    hasMoreRef.current = { casual: true, task: true }
    cursorsRef.current = {}
  }

  const grpcLoadMoreWrapper: UseAIMessageDataEvents['handleGrpcLoadMore'] = useMemoizedFn(async (has_more: boolean) => {
    hasMoreRef.current.casual = has_more
  })

  return {
    /** 初始化加载中 */
    initLoading,
    /** 加载更多加载中 */
    loadMoreLoading,
    /** 是否还有更多数据 */
    hasMore: hasMoreRef.current,
    initRequest,
    loadMore,
    reset,
    save,
    grpcLoadMoreWrapper,
  }
}

export default useAIMessageData
