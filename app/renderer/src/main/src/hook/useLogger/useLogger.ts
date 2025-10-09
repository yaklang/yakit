import {useEffect, useRef, useCallback} from "react"
import {formatTimeYMD} from "@/utils/timeUtil"

const {ipcRenderer} = window.require("electron")

/**
 * 日志数据结构
 */
export interface LoggerData {
    name: string
    title: string
    content?: string
    status?: "start" | "end"
    time?: string
}

type LogFn = (msg: LoggerData) => void

/**
 * useLogger Hook 配置项
 */
interface UseLoggerOptions {
    /** 日志采集间隔（毫秒，默认 3000ms） */
    interval?: number
    /**
     * 是否在依赖变化时立即执行一次回调
     *
     * - `true`：依赖变化时立刻执行一次 cb
     * - `false`：第一次依赖变化时跳过，之后依赖变化才执行
     */
    immediate?: boolean
}

/**
 * useLogger 返回的控制方法
 */
interface LoggerControl {
    /** 启动定时日志采集 */
    start: () => void
    /** 停止定时日志采集 */
    stop: () => void
}

/**
 * React Hook: useLogger
 * 
 * 用于周期性或依赖变化时执行日志回调，并通过 Electron 的 `ipcRenderer` 将日志发送到主进程。
 *
 * @param cb    回调函数，提供 `log` 方法用于记录日志
 * @param deps  依赖数组，依赖变化时会触发一次回调（受 `immediate` 控制）
 * @param options 配置项
 * 
 * @returns `{ start, stop }` 控制日志定时采集的启动与停止
 *
 * @example
 * ```ts
 * const { start, stop } = useLogger(
 *   (log) => {
 *     log({ name: "fuzzer", title: "run", content: "xxx" })
 *   },
 *   [ref, state],
 *   { interval: 2000, immediate: true }
 * )
 * 
 * // 手动控制
 * start()
 * stop()
 * ```
 */
export function useLogger(
    cb: (log: LogFn) => void,
    deps: unknown[] = [],
    options: UseLoggerOptions = {}
): LoggerControl {
    const {interval = 3000} = options
    const timerRef = useRef<NodeJS.Timeout | null>(null)
    const immediate = useRef(options.immediate)

    // 封装 log 方法
    const log: LogFn = (msg) => {
        ipcRenderer.invoke("add-log", {
            time: formatTimeYMD(Date.now()),
            ...msg
        })
    }

    const start = useCallback(() => {
        if (timerRef.current) return

        timerRef.current = setInterval(() => {
            cb(log)
        }, interval)
    }, [cb, interval])

    const stop = useCallback(() => {
        if (timerRef.current) {
            clearInterval(timerRef.current)
            timerRef.current = null
        }
    }, [])

    useEffect(() => {
        return () => stop()
    }, [stop])

    // 依赖变化时，立即执行一次
    useEffect(() => {
        if (!immediate.current) {
            immediate.current = true
        } else {
            cb(log)
        }
    }, deps)

    return {start, stop}
}
