import {MutableRefObject, useEffect, useRef, useState} from "react"
import {useCreation, useDebounceFn, useMemoizedFn} from "ahooks"

type TargetValue<T> = T | undefined | null
type TargetType = HTMLElement | Element | Window | Document
type BasicTarget<T extends TargetType = Element> = string | TargetValue<T> | MutableRefObject<TargetValue<T>>

function useListenWidth(target: BasicTarget): number {
    const [width, setWidth] = useState<number>(0)
    const oldWidth = useRef<number>(0)

    const onSetWrapperWidth = useDebounceFn(
        useMemoizedFn((width: number) => {
            if (width === 0) return
            if (oldWidth.current === width) return
            oldWidth.current = width
            setWidth(width)
        }),
        {wait: 100}
    ).run

    const resizeObserver = useCreation(() => {
        return new ResizeObserver((entries: ResizeObserverEntry[]) => {
            for (let entry of entries) {
                const {clientWidth, clientHeight} = entry.target
                onSetWrapperWidth(clientWidth)
            }
        })
    }, [])

    useEffect(() => {
        if (!target) return

        if (typeof target === "string") {
            const dom = document.getElementById(target)
            if (!!dom) resizeObserver.observe(dom)
        } else if ("current" in target) {
            if (!!target.current) resizeObserver.observe(target.current)
        } else {
            resizeObserver.observe(target)
        }

        return () => {
            resizeObserver.disconnect()
        }
    }, [])

    return width
}

export default useListenWidth
