import {useEffect, useRef, useState} from "react"
import {PluginExecutionTrace, PluginTraceParams, PluginTraceStats} from "./type"
import useGetSetState from "@/pages/pluginHub/hooks/useGetSetState"
import {yakitNotify} from "@/utils/notification"
import {Uint8ArrayToString} from "@/utils/str"
import {useCreation, useMemoizedFn} from "ahooks"
import {grpcPluginTraceIDCancel, grpcStartPluginTrace, grpcStopPluginTrace} from "./utils"
const {ipcRenderer} = window.require("electron")

function usePluginTrace(params: PluginTraceParams) {
    const {pluginTraceRefFun, onStart, onError, onEnd} = params
    const [isInitTrace, setIsInitTrace] = useState<boolean>(true) // 是否显示初始追踪界面
    const [startLoading, setStartLoading] = useState<boolean>(false) // 开始按钮loading
    const [tracing, setTracing, getTracing] = useGetSetState<boolean>(false) // 是否正在追踪
    const [stopLoading, setStopLoading] = useState<boolean>(false) // 停止按钮loading
    const pluginTraceStatsRef = useRef<PluginTraceStats>({
        TotalTraces: 0,
        RunningTraces: 0,
        FailedTraces: 0,
        CompletedTraces: 0,
        CancelledTraces: 0
    })
    const tracesRef = useRef<PluginExecutionTrace[]>([])
    const cancelTracesIdRef = useRef<string[]>([])

    useEffect(() => {
        ipcRenderer.on("mitm-plugin-trace-start-success", () => {
            onStart()
            setStartLoading(false)
            setIsInitTrace(false)
            setTracing(true)
            pluginTraceStatsRef.current = {
                TotalTraces: 0,
                RunningTraces: 0,
                FailedTraces: 0,
                CompletedTraces: 0,
                CancelledTraces: 0
            }
            tracesRef.current = []
            cancelTracesIdRef.current = []
            pluginTraceRefFun().noDetailFun()
            pluginTraceRefFun().refreshAndScrollNow()
            yakitNotify("info", "插件追踪已开始")
        })

        ipcRenderer.on("start-mitm-plugin-trace-error", (event, err) => {
            onError()
            setStartLoading(false)
            setTracing(false)
            setStopLoading(false)
            pluginTraceRefFun().cancelTracesToState()
            pluginTraceRefFun().refreshFlush()
            yakitNotify("error", `${err}`)
        })

        ipcRenderer.on("mitm-plugin-stats-update", (event, data) => {
            if (data.Stats) {
                pluginTraceStatsRef.current = {
                    TotalTraces: data.Stats.TotalTraces,
                    RunningTraces: data.Stats.RunningTraces,
                    FailedTraces: data.Stats.FailedTraces,
                    CompletedTraces: data.Stats.CompletedTraces,
                    CancelledTraces: data.Stats.CancelledTraces
                }
            }
        })

        ipcRenderer.on("mitm-plugin-trace-update", (event, data) => {
            if (data.Traces.length > 0) {
                let newTraces = tracesRef.current.slice()
                data.Traces.forEach((trace: PluginExecutionTrace) => {
                    const index = newTraces.findIndex((t) => t.TraceID === trace.TraceID)

                    if (trace.Status === "completed") {
                        // completed状态的trace从列表中移除
                        if (index >= 0) {
                            newTraces.splice(index, 1)
                        }
                    } else {
                        // running, failed, cancelled状态的trace更新或添加
                        if (index >= 0) {
                            newTraces[index] = {
                                ...trace,
                                ExecutionArgsStr: Uint8ArrayToString(trace.ExecutionArgs || new Uint8Array()),
                                ExecutionArgs: new Uint8Array()
                            }
                            if (trace.Status === "cancelled" && cancelTracesIdRef.current.includes(trace.TraceID)) {
                                const arr = cancelTracesIdRef.current.slice()
                                cancelTracesIdRef.current = arr.filter((traceID) => traceID !== trace.TraceID)
                                pluginTraceRefFun().refreshFlush()
                            }
                        } else {
                            newTraces.unshift({
                                ...trace,
                                ExecutionArgsStr: Uint8ArrayToString(trace.ExecutionArgs || new Uint8Array()),
                                ExecutionArgs: new Uint8Array()
                            }) // 新trace添加到开头
                        }
                    }
                })

                // 排序：running状态优先显示
                const sortedTraces = newTraces.sort((a, b) => {
                    if (a.Status === "running" && b.Status !== "running") return -1
                    if (a.Status !== "running" && b.Status === "running") return 1
                    return b.StartTime - a.StartTime // 其他情况按时间倒序
                })

                tracesRef.current = sortedTraces
            } else {
                tracesRef.current = []
            }
            pluginTraceRefFun().syncTracesToState()
        })

        ipcRenderer.on("mitm-plugin-trace-end", () => {
            onEnd()
            setStartLoading(false)
            setTracing(false)
            setStopLoading(false)
            pluginTraceRefFun().cancelTracesToState()
            pluginTraceRefFun().refreshFlush()
            yakitNotify("info", "插件追踪已停止")
        })

        return () => {
            if (getTracing()) {
                stopPluginTrace()
            }
            ipcRenderer.removeAllListeners("mitm-plugin-trace-start-success")
            ipcRenderer.removeAllListeners("start-mitm-plugin-trace-error")
            ipcRenderer.removeAllListeners("mitm-plugin-stats-update")
            ipcRenderer.removeAllListeners("mitm-plugin-trace-update")
            ipcRenderer.removeAllListeners("mitm-plugin-trace-end")
        }
    }, [])

    const startPluginTrace = useMemoizedFn(() => {
        if (tracing) return
        setStartLoading(true)
        grpcStartPluginTrace({
            ControlMode: "start_stream",
            EnableTracing: true
        }).catch(() => {})
    })

    const stopPluginTrace = useMemoizedFn(() => {
        setStopLoading(true)
        grpcStopPluginTrace().catch(() => {})
    })

    const cancelPluginTraceById = useMemoizedFn((traceID) => {
        cancelTracesIdRef.current.push(traceID)
        grpcPluginTraceIDCancel(traceID).catch(() => {})
    })

    const pluginTraceStats = useMemoizedFn(() => {
        return pluginTraceStatsRef.current
    })

    const pluginTraceList = useMemoizedFn(() => {
        return tracesRef.current
    })

    const state = useCreation(
        () => ({
            isInitTrace,
            startLoading,
            tracing,
            stopLoading
        }),
        [isInitTrace, startLoading, tracing, stopLoading]
    )

    const actions = useCreation(
        () => ({
            startPluginTrace,
            stopPluginTrace,
            cancelPluginTraceById,
            pluginTraceStats,
            pluginTraceList
        }),
        [startPluginTrace, stopPluginTrace, cancelPluginTraceById, pluginTraceStats, pluginTraceList]
    )

    return [state, actions] as const
}

export default usePluginTrace
