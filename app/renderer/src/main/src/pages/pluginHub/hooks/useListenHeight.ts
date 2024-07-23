import {MutableRefObject, useEffect, useRef, useState} from "react"
import {useCreation, useDebounceFn, useMemoizedFn} from "ahooks"

type TargetValue<T> = T | undefined | null
type TargetType = HTMLElement | Element | Window | Document
type BasicTarget<T extends TargetType = Element> = string | TargetValue<T> | MutableRefObject<TargetValue<T>>

function useListenHeight(target: BasicTarget): number {
    const [height, setHeight] = useState<number>(0)
    const oldHeight = useRef<number>(0)

    const onSetWrapperHeight = useDebounceFn(
        useMemoizedFn((height: number) => {
            if (height === 0) return
            if (oldHeight.current === height) return
            oldHeight.current = height
            setHeight(height)
        }),
        {wait: 100}
    ).run

    const resizeObserver = useCreation(() => {
        return new ResizeObserver((entries: ResizeObserverEntry[]) => {
            for (let entry of entries) {
                const {clientHeight} = entry.target
                onSetWrapperHeight(clientHeight)
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

    return height
}

export default useListenHeight
