import {useMemoizedFn, useThrottleFn} from "ahooks"
import {useEffect, useRef} from "react"
import type {VirtuosoHandle} from "react-virtuoso"

interface UseVirtuosoAutoScrollOptions<T> {
    atBottomThreshold?: number
    total?: number
}

const useVirtuosoAutoScroll = <T>(options: UseVirtuosoAutoScrollOptions<T>) => {
    const {atBottomThreshold = 80, total} = options
    const virtuosoRef = useRef<VirtuosoHandle>(null)
    const isAtBottomRef = useRef(true)
    const scrollerRef = useRef<HTMLElement | Window | null>(null)
    const isUserDraggingRef = useRef(false) // 用户是否正在拖动滚动条

    // 检查是否接近底部
    const checkIsAtBottom = useMemoizedFn(() => {
        const scroller = scrollerRef.current
        if (scroller instanceof HTMLElement) {
            const distanceToBottom = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight
            return distanceToBottom <= atBottomThreshold
        }
        return true
    })

    // wheel 事件处理
    const onWheel = useMemoizedFn((e: WheelEvent) => {
        if (e.deltaY < 0) {
            // 往上滑动，停止自动滚动
            isAtBottomRef.current = false
        } else if (e.deltaY > 0) {
            // 往下滑动，检查是否接近底部
            const target = e.currentTarget as HTMLElement
            const distanceToBottom = target.scrollHeight - target.scrollTop - target.clientHeight
            if (distanceToBottom <= atBottomThreshold) {
                isAtBottomRef.current = true
            }
        }
    })

    // scroll 事件处理（只在用户拖动滚动条时更新状态）
    const {run: onScroll} = useThrottleFn(
        () => {
            if (isUserDraggingRef.current) {
                isAtBottomRef.current = checkIsAtBottom()
            }
        },
        {wait: 50}
    )

    // 鼠标按下（检测是否点击在滚动条区域）
    const onMouseDown = useMemoizedFn((e: MouseEvent) => {
        const target = e.currentTarget as HTMLElement
        const scrollbarWidth = target.offsetWidth - target.clientWidth
        // 点击位置在滚动条区域
        if (scrollbarWidth > 0 && e.offsetX >= target.clientWidth) {
            isUserDraggingRef.current = true
        }
    })

    const onMouseUp = useMemoizedFn(() => {
        if (isUserDraggingRef.current) {
            isUserDraggingRef.current = false
            isAtBottomRef.current = checkIsAtBottom()
        }
    })

    // 键盘事件处理
    const onKeyDown = useMemoizedFn((e: KeyboardEvent) => {
        if (e.key === "PageDown" || e.key === "End" || e.key === "ArrowDown") {
            // 延迟检查，等滚动完成
            setTimeout(() => {
                isAtBottomRef.current = checkIsAtBottom()
            }, 50)
        } else if (e.key === "PageUp" || e.key === "Home" || e.key === "ArrowUp") {
            isAtBottomRef.current = false
        }
    })

    // 触摸事件处理
    const touchStartY = useRef<number>(0)
    const onTouchStart = useMemoizedFn((e: TouchEvent) => {
        touchStartY.current = e.touches[0].clientY
    })

    const onTouchMove = useMemoizedFn((e: TouchEvent) => {
        const deltaY = touchStartY.current - e.touches[0].clientY
        if (deltaY < 0) {
            isAtBottomRef.current = false
        } else if (deltaY > 0) {
            isAtBottomRef.current = checkIsAtBottom()
        }
        touchStartY.current = e.touches[0].clientY
    })

    const setScrollerRef = useMemoizedFn((ref: HTMLElement | Window | null) => {
        // 解绑旧的事件
        if (scrollerRef.current && scrollerRef.current instanceof HTMLElement) {
            scrollerRef.current.removeEventListener("wheel", onWheel as EventListener)
            scrollerRef.current.removeEventListener("scroll", onScroll)
            scrollerRef.current.removeEventListener("mousedown", onMouseDown)
            scrollerRef.current.removeEventListener("keydown", onKeyDown)
            scrollerRef.current.removeEventListener("touchstart", onTouchStart)
            scrollerRef.current.removeEventListener("touchmove", onTouchMove)
            document.removeEventListener("mouseup", onMouseUp)
        }
        scrollerRef.current = ref
        // 绑定新的事件
        if (ref && ref instanceof HTMLElement) {
            ref.addEventListener("wheel", onWheel as EventListener, {passive: true})
            ref.addEventListener("scroll", onScroll, {passive: true})
            ref.addEventListener("mousedown", onMouseDown)
            ref.addEventListener("keydown", onKeyDown)
            ref.addEventListener("touchstart", onTouchStart, {passive: true})
            ref.addEventListener("touchmove", onTouchMove, {passive: true})
            document.addEventListener("mouseup", onMouseUp)
        }
    })

    // 组件卸载时清理事件
    useEffect(() => {
        return () => {
            if (scrollerRef.current && scrollerRef.current instanceof HTMLElement) {
                scrollerRef.current.removeEventListener("wheel", onWheel as EventListener)
                scrollerRef.current.removeEventListener("scroll", onScroll)
                scrollerRef.current.removeEventListener("mousedown", onMouseDown)
                scrollerRef.current.removeEventListener("keydown", onKeyDown)
                scrollerRef.current.removeEventListener("touchstart", onTouchStart)
                scrollerRef.current.removeEventListener("touchmove", onTouchMove)
            }
            document.removeEventListener("mouseup", onMouseUp)
        }
    }, [])

    const scrollToIndex = useMemoizedFn((index: "LAST" | number, behavior?: "auto" | "smooth") => {
        if (index === "LAST" || index === total! - 1) {
            isAtBottomRef.current = true
        }
        requestIdleCallback(() => {
            virtuosoRef.current?.scrollToIndex({
                index,
                align: "end",
                behavior: behavior || "smooth"
            })
        })
    })

    const smartScrollToBottom = () => {
        requestAnimationFrame(() => {
            const scroller = scrollerRef.current
            if (scroller instanceof HTMLElement) {
                scroller.scrollTop = scroller.scrollHeight
            }
        })
    }

    const {run: handleTotalListHeightChanged} = useThrottleFn(
        () => {
            if (isAtBottomRef.current && total && total > 0) {
                smartScrollToBottom()
            }
        },
        {wait: 150}
    )

    return {virtuosoRef, setScrollerRef, scrollToIndex, handleTotalListHeightChanged}
}

export default useVirtuosoAutoScroll
