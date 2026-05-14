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
  /** 正在向上加载历史中，用于外部抑制自动滚动到底部 */
  const isPrependingRef = useRef(false)
  /** 当前是否处于顶部，用于顶部连续加载 */
  const atTopRef = useRef(false)
  /** 同一次到顶过程中，最多自动续拉一次，避免卡在顶端时无限连拉 */
  const topAutoLoadDoneRef = useRef(false)

  // getDerivedStateFromProps 模式：在 render 阶段检测 dataLength 变化并同步更新
  // firstItemIndex，确保 data 和 firstItemIndex 在同一次 DOM commit 中变化，避免滚动抖动
  const [prevDataLength, setPrevDataLength] = useState(dataLength)
  if (dataLength !== prevDataLength) {
    const diff = dataLength - prevDataLength
    if (diff > 0 && isPrependingRef.current) {
      setFirstItemIndex((prev) => Math.max(0, prev - diff))
      isPrependingRef.current = false
    }
    setPrevDataLength(dataLength)
  }

  const handleLoadMore = useMemoizedFn(() => {
    console.log('handleLoadMore:', { loading, fetchHasMore: fetchHasMore(), SessionID })
    if (loading || !fetchHasMore() || !SessionID) return
    isPrependingRef.current = true
    console.log('加载历史')
    loadMore()
  })

  const handleAtTopStateChange = useMemoizedFn((atTop: boolean) => {
    atTopRef.current = atTop
    if (!atTop) {
      topAutoLoadDoneRef.current = false
      return
    }
    handleLoadMore()
  })

  useEffect(() => {
    // 仅在一次真实加载结束后，且仍在顶部时自动补拉一次，避免反复连拉
    if (wasLoadingRef.current && !loading && atTopRef.current && !topAutoLoadDoneRef.current) {
      topAutoLoadDoneRef.current = true
      handleLoadMore()
    }
  }, [loading, dataLength, handleLoadMore])

  // loading 结束但数据没变（无更多数据），释放锁
  const wasLoadingRef = useRef(false)
  useEffect(() => {
    if (wasLoadingRef.current && !loading) {
      isPrependingRef.current = false
    }
    wasLoadingRef.current = loading
  }, [loading])

  // 切换会话时重置，避免不同会话的索引互相干扰
  useEffect(() => {
    setFirstItemIndex(PREPEND_OFFSET)
    setPrevDataLength(dataLength)
    wasLoadingRef.current = false
    isPrependingRef.current = false
    atTopRef.current = false
    topAutoLoadDoneRef.current = false
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
