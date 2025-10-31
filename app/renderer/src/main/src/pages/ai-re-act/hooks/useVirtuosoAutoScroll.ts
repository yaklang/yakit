import { useMount, useThrottleEffect } from "ahooks"
import { useCallback, useRef, useState } from "react"
import { VirtuosoHandle } from "react-virtuoso"

const useVirtuosoAutoScroll = (streams) => {
    const virtuosoRef = useRef<VirtuosoHandle>(null)
    const scrollerRef = useRef<HTMLDivElement>(null)
    const [isNearBottom, setIsNearBottom] = useState(true)

    const handleScroll = useCallback(() => {
        if (!scrollerRef.current) return

        const el = scrollerRef.current
        const scrollBottom = el.scrollHeight - el.scrollTop - el.clientHeight

        // 距离底部小于等于阈值
        const nearBottom = scrollBottom <= 100
        setIsNearBottom(nearBottom)
    }, [])

    useMount(() => {
        const el = scrollerRef.current
        if (!el) return

        el.addEventListener("scroll", handleScroll)
        return () => el.removeEventListener("scroll", handleScroll)
    })
    useThrottleEffect(
        () => {
            if (!virtuosoRef.current || !isNearBottom) return
            requestIdleCallback(() => {
                virtuosoRef.current?.scrollToIndex({
                    index: "LAST",
                    align: "end",
                    behavior: "smooth"
                })
            })
        },
        [streams],
        {
            wait: 100,
            trailing: false
        }
    )

    return { virtuosoRef, scrollerRef }
}

export default useVirtuosoAutoScroll