import {useRef, useState, useCallback, type DependencyList} from "react"
import {useRafInterval, useUpdateEffect} from "ahooks"

export interface UseRafPollingOptions<T> {
    /**
     * 获取当前数据的函数。
     * 返回 null 表示本次不更新。
     */
    getData: () => T | null
    /**
     * 轮询间隔（毫秒），默认 200。
     */
    interval?: number
    /**
     * 停止条件：返回 true 时停止轮询。
     */
    shouldStop?: (data: T) => boolean
    /**
     * 是否需要更新数据，用于避免不必要的重渲染。
     * 返回 true 才会触发 setData。
     */
    shouldUpdate?: (prev: T | null, next: T) => boolean
    /**
     * 数据克隆策略。
     * 如果传入，会在 setData 前执行。
     * 解决数据引用 导致的组件不更新问题。
     */
    clone?: (data: T) => T
    /**
     * 重启依赖数组。
     * 当依赖变化时，重新启动轮询。
     */
    resetDeps?: DependencyList
}

/**
 * 基于 requestAnimationFrame 的轮询 Hook。
 */
export function useRafPolling<T>(options: UseRafPollingOptions<T>): T | null {
    const {getData, interval = 200, shouldStop, shouldUpdate, clone, resetDeps = []} = options

    const [data, setData] = useState<T | null>(() => getData())
    const [running, setRunning] = useState<boolean>(true)

    const runningRef = useRef<boolean>(true)
    runningRef.current = running

    const dataRef = useRef<T | null>(data)

    const getDataRef = useRef(getData)
    getDataRef.current = getData

    const shouldStopRef = useRef(shouldStop)
    shouldStopRef.current = shouldStop

    const shouldUpdateRef = useRef(shouldUpdate)
    shouldUpdateRef.current = shouldUpdate

    const cloneRef = useRef(clone)
    cloneRef.current = clone

    const tick = useCallback(() => {
        if (!runningRef.current) return

        const result = getDataRef.current()
        if (!result) return

        if (shouldStopRef.current?.(result)) {
            runningRef.current = false
            setRunning(false)
        }
        // 进行数据克隆，确保引用变化
        const clonedResult = cloneRef.current ? cloneRef.current(result) : result

        const needUpdate = shouldUpdateRef.current ? shouldUpdateRef.current(dataRef.current, clonedResult) : true

        // 存储 clone 后的数据，确保下次比较时引用不同
        dataRef.current = clonedResult

        if (needUpdate) {
            setData(clonedResult)
        }
    }, [])

    useUpdateEffect(() => {
        const initial = getDataRef.current()
        const cloned = initial && cloneRef.current ? cloneRef.current(initial) : initial

        dataRef.current = cloned ?? null
        setData(cloned ?? null)

        runningRef.current = true
        setRunning(true)
    }, resetDeps)

    useRafInterval(tick, running ? interval : undefined)

    return data
}
