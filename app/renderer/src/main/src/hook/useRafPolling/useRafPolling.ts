import {useRef, useState, useCallback} from "react"
import {useRafInterval} from "ahooks"

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
}

/**
 * 基于 requestAnimationFrame 的轮询 Hook。
 * @param options 轮询配置
 * @returns 最新的数据（可能为 null）
 */
export function useRafPolling<T>(options: UseRafPollingOptions<T>): T | null {
    const {getData, interval = 200, shouldStop, shouldUpdate} = options

    const [data, setData] = useState<T | null>(() => getData())
    const [running, setRunning] = useState(true)

    const runningRef = useRef(true)
    runningRef.current = running

    const dataRef = useRef<T | null>(data)

    const getDataRef = useRef(getData)
    getDataRef.current = getData  

    const shouldStopRef = useRef(shouldStop)
    shouldStopRef.current = shouldStop

    const shouldUpdateRef = useRef(shouldUpdate)
    shouldUpdateRef.current = shouldUpdate

    const tick = useCallback(() => {
        if (!running) return
        const result = getDataRef.current()
        // console.log('1111111:', result,running);
        if (!result) return

        if (shouldStopRef.current?.(result)) {
            runningRef.current = false
            // console.log('111111:', 111111);
            setRunning(false)
        }

        const needUpdate = shouldUpdateRef.current
            ? shouldUpdateRef.current(dataRef.current, result)
            : true

        dataRef.current = result

        if (needUpdate) {
            setData(result)
        }
    }, [])

    useRafInterval(tick, running ? interval : undefined)

    return data
}
