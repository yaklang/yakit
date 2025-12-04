import {useMemoizedFn} from "ahooks"
import {useCallback, useRef} from "react"
import type {ScrollIntoViewLocation, VirtuosoHandle} from "react-virtuoso"

interface ScrollIntoViewArgs {
    totalCount: number
    scrollingInProgress: boolean
}
const useVirtuosoAutoScroll = () => {
    const virtuosoRef = useRef<VirtuosoHandle>(null)
    const isAtBottomRef = useRef(true)

    const setIsAtBottomRef  = (v) => {
        isAtBottomRef.current = v
    }
    const followOutput = useMemoizedFn((): boolean => {
        return isAtBottomRef.current
    })

    const scrollToIndex = useCallback((index: "LAST" | number) => {
        requestIdleCallback(() => {
            virtuosoRef.current?.scrollToIndex({
                index,
                align: "end",
                behavior: "smooth"
            })
        })
    }, [])

    return {virtuosoRef, setIsAtBottomRef, scrollToIndex,followOutput}
}

export default useVirtuosoAutoScroll
