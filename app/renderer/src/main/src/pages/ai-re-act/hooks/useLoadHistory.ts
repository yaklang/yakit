import { useMemoizedFn } from 'ahooks'
import { useEffect, useRef, useState } from 'react'

const PREPEND_OFFSET = 1000000

interface UseLoadHistoryProps {
  loading: boolean
  dataLength: number
  fetchHasMore: () => boolean
  loadMore: () => void
  SessionID: string
}

const useLoadHistory = ({ loading, dataLength, SessionID, fetchHasMore, loadMore }: UseLoadHistoryProps) => {
  const [firstItemIndex, setFirstItemIndex] = useState(PREPEND_OFFSET)

  const isPrependingRef = useRef(false)
  const atTopRef = useRef(false)
  const wasLoadingRef = useRef(false)

  // 【新增核心机制】：排队锁。用于接住那些因为 React 状态延迟而“撞墙”的请求
  const pendingRequestRef = useRef(false)

  // 【核心机制：Render 阶段状态派生】(保留你的完美逻辑)
  const [prevDataLength, setPrevDataLength] = useState(dataLength)
  const [prevSessionID, setPrevSessionID] = useState(SessionID)

  if (SessionID !== prevSessionID) {
    setFirstItemIndex(PREPEND_OFFSET)
    setPrevDataLength(dataLength)
    setPrevSessionID(SessionID)
    pendingRequestRef.current = false // 切换会话清空排队
  } else if (dataLength !== prevDataLength) {
    const diff = dataLength - prevDataLength
    if (diff > 0 && isPrependingRef.current) {
      setFirstItemIndex((prev) => Math.max(0, prev - diff))
    }
    setPrevDataLength(dataLength)
  }

  const handleLoadMore = useMemoizedFn(() => {
    if (!fetchHasMore() || !SessionID) return

    // 【关键修复】：如果当前还没解锁，不要直接 return 丢弃！
    // 把它标记为 pending，等 loading 结束时立刻补发
    if (loading) {
      pendingRequestRef.current = true
      return
    }

    isPrependingRef.current = true
    loadMore()
  })

  const handleAtTopStateChange = useMemoizedFn((atTop: boolean) => {
    atTopRef.current = atTop
    if (atTop) {
      handleLoadMore()
    } else {
      // 离开顶部，清空排队
      pendingRequestRef.current = false
    }
  })

  // 3. 统一处理加载完成后的副作用
  useEffect(() => {
    // 判定条件：刚结束加载 (之前是 true，现在是 false)
    if (wasLoadingRef.current && !loading) {
      // 在 DOM Commit 后安全释放向上插入的标记
      isPrependingRef.current = false

      // 【关键修复】：释放后立刻检查，刚才 loading 期间是不是有被拦截的请求？
      if (pendingRequestRef.current) {
        pendingRequestRef.current = false
        handleLoadMore()
      }
      // 兜底补拉：去掉了会导致死锁的 topAutoLoadDoneRef，改用安全的延迟探针
      else if (atTopRef.current) {
        setTimeout(() => {
          if (atTopRef.current && fetchHasMore()) {
            handleLoadMore()
          }
        }, 50)
      }
    }
    wasLoadingRef.current = loading
  }, [loading, handleLoadMore, fetchHasMore])

  // 4. 会话切换清理杂项 Ref
  useEffect(() => {
    wasLoadingRef.current = false
    isPrependingRef.current = false
    atTopRef.current = false
    pendingRequestRef.current = false
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [SessionID])

  return {
    firstItemIndex,
    handleLoadMore,
    handleAtTopStateChange,
    isPrependingRef,
  }
}

export default useLoadHistory
