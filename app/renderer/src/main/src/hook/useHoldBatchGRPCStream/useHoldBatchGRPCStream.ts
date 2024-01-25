import {useState, useRef, useEffect} from "react"
import {failed, info} from "../../utils/notification"
import {useMemoizedFn} from "ahooks"
import {HoldGRPCStreamParams, convertCardInfo} from "../useHoldGRPCStream/useHoldGRPCStream"
import {DefaultTabs} from "../useHoldGRPCStream/constant"
import {HoldGRPCStreamInfo, HoldGRPCStreamProps, StreamResult} from "../useHoldGRPCStream/useHoldGRPCStreamType"
import {
    HoldBatchGRPCStreamParams,
    PluginBatchExecutorResult
} from "./useHoldBatchGRPCStreamType"
import isEqual from "lodash/isEqual"

const {ipcRenderer} = window.require("electron")

export default function useHoldBatchGRPCStream(params: HoldBatchGRPCStreamParams) {
    const {
        tabs: defaultTabs = DefaultTabs,
        taskName,
        apiKey,
        token,
        waitTime = 500,
        onEnd,
        onError,
        dataFilter,
        setRuntimeId,
        onGetInputValue
    } = params

    const [streamInfo, setStreamInfo] = useState<HoldGRPCStreamInfo>({
        progressState: [],
        cardState: [],
        tabsState: [],
        tabsInfoState: {},
        riskState: [],
        logState: []
    })

    // 启动数据流处理定时器
    const timeRef = useRef<any>(null)

    // runtime-id
    const runTimeId = useRef<{cache: string; sent: string}>({cache: "", sent: ""})
    /** 输入模块值 */
    const inputValueRef = useRef<{cache: string; sent: string}>({
        cache: '',
        sent: ''
    })
    // progress
    let progressKVPair = useRef<Map<string, number>>(new Map<string, number>())
    // card
    let cardKVPair = useRef<Map<string, HoldGRPCStreamProps.CacheCard>>(
        new Map<string, HoldGRPCStreamProps.CacheCard>()
    )
    // tabInfo-table
    const tabTable = useRef<Map<string, HoldGRPCStreamProps.CacheTable>>(
        new Map<string, HoldGRPCStreamProps.CacheTable>()
    )
    // tabInfo-text
    const tabsText = useRef<Map<string, string>>(new Map<string, string>())
    // risks
    let riskMessages = useRef<StreamResult.Risk[]>([])
    // logs
    let messages = useRef<StreamResult.Message[]>([])

    /** 放入日志队列 */
    const pushLogs = useMemoizedFn((log: StreamResult.Message) => {
        messages.current.unshift(log)
        // 只缓存 100 条结果（日志类型 + 数据类型）
        if (messages.current.length > 100) {
            messages.current.pop()
        }
    })

    /** 判断是否为无效数据 */
    const checkStreamValidity = useMemoizedFn((stream: StreamResult.Log) => {
        try {
            const check = JSON.parse(stream.data)
            if (check === "null" || !check || check === "undefined") return false
            return check
        } catch (e) {
            return false
        }
    })

    useEffect(() => {
        const processDataId = "main"
        ipcRenderer.on(`${token}-data`, async (e: any, res: PluginBatchExecutorResult) => {
            if (res.ScanConfig) {
                inputValueRef.current.cache = res.ScanConfig
            }
            const data = res.ExecResult
            const {TotalTasks, FinishedTasks} = res
            const progress = Number(TotalTasks) ? Number(FinishedTasks) / Number(TotalTasks) : 0

            progressKVPair.current.set(
                processDataId,
                Math.max(progressKVPair.current.get(processDataId) || 0, progress)
            )

            if (!data) return
            // run-time-id
            if (!!data?.RuntimeID) {
                runTimeId.current.cache = data.RuntimeID
            }
            if (data.IsMessage) {
                try {
                    let obj: StreamResult.Message = JSON.parse(Buffer.from(data.Message).toString())
                    const logData = obj.content as StreamResult.Log
                    // feature-status-card-data 卡片展示
                    if (obj.type === "log" && logData.level === "feature-status-card-data") {
                        try {
                            const checkInfo = checkStreamValidity(logData)
                            if (!checkInfo) return

                            const obj: StreamResult.Card = checkInfo
                            const {id, data, tags} = obj
                            const {timestamp} = logData
                            const originData = cardKVPair.current.get(id)
                            if (originData && originData.Timestamp > timestamp) {
                                return
                            }
                            cardKVPair.current.set(id, {
                                Id: id,
                                Data: data,
                                Timestamp: timestamp,
                                Tags: Array.isArray(tags) ? tags : []
                            })
                        } catch (e) {}
                        return
                    }

                    // risk 风险信息列表
                    if (obj.type === "log" && logData.level === "json-risk") {
                        try {
                            const checkInfo = checkStreamValidity(logData)
                            if (!checkInfo) return
                            const risk: StreamResult.Risk = checkInfo
                            riskMessages.current.unshift(risk)
                        } catch (e) {}
                        return
                    }

                    // 外界传入的筛选方法
                    if (dataFilter && dataFilter(obj, logData)) return
                    // 日志信息
                    pushLogs(obj)
                } catch (e) {}
            }
        })
        // token-error
        ipcRenderer.on(`${token}-error`, (e: any, error: any) => {
            if (onError) {
                onError(error)
            } else {
                failed(`[Mod] ${taskName} error: ${error}`)
            }
        })
        // token-end
        ipcRenderer.on(`${token}-end`, (e: any, data: any) => {
            info(`[Mod] ${taskName} finished`)
            handleResults()
            if (onEnd) {
                onEnd()
            }
        })

        return () => {
            stop()
            cancel()
            ipcRenderer.removeAllListeners(`${token}-data`)
            ipcRenderer.removeAllListeners(`${token}-error`)
            ipcRenderer.removeAllListeners(`${token}-end`)
        }
    }, [token])

    /** @name 数据流处理逻辑 */
    const handleResults = useMemoizedFn(() => {
        // runtime-id
        if (runTimeId.current.sent !== runTimeId.current.cache && setRuntimeId) {
            setRuntimeId(runTimeId.current.cache)
            runTimeId.current.sent = runTimeId.current.cache
        }
        // 输入模块值
        if (inputValueRef.current.sent !== inputValueRef.current.cache && onGetInputValue) {
            onGetInputValue(inputValueRef.current.cache)
            inputValueRef.current.sent = inputValueRef.current.cache
        }
        // progress
        const cacheProgress: StreamResult.Progress[] = []
        progressKVPair.current.forEach((value, id) => {
            cacheProgress.push({id: id, progress: value})
        })
        // card
        const cacheCard: HoldGRPCStreamProps.InfoCards[] = convertCardInfo(cardKVPair.current)
        // tabs
        const tabs: HoldGRPCStreamProps.InfoTab[] = defaultTabs
        // tabsInfo
        const tabsInfo: HoldGRPCStreamInfo["tabsInfoState"] = {}

        if (tabTable.current.size > 0) {
            tabTable.current.forEach((value, key) => {
                const arr: HoldGRPCStreamProps.InfoTable["data"] = []
                value.data.forEach((item) => arr.push(item))

                tabsInfo[key] = {
                    name: value.name,
                    columns: value.columns,
                    data: arr
                } as HoldGRPCStreamProps.InfoTable
            })
        }
        if (tabsText.current.size > 0) {
            tabsText.current.forEach((value, key) => {
                tabsInfo[key] = {
                    content: value
                } as HoldGRPCStreamProps.InfoText
            })
        }
        // risk
        const risks: StreamResult.Risk[] = [...riskMessages.current]
        // logs
        const logs: StreamResult.Log[] = messages.current
            .filter((i) => i.type === "log")
            .map((i) => i.content as StreamResult.Log)
            .filter((i) => i.data !== "null")
        const info = {
            progressState: cacheProgress,
            cardState: cacheCard,
            tabsState: tabs,
            tabsInfoState: tabsInfo,
            riskState: risks,
            logState: logs
        }
        setStreamInfo(info)
    })

    useEffect(() => {
        if (waitTime > 0 && !!timeRef.current) {
            clearInterval(timeRef.current)
            timeRef.current = null
            timeRef.current = setInterval(() => handleResults(), waitTime)
        }
    }, [waitTime])

    /** @name 开始处理数据流 */
    const start = useMemoizedFn(() => {
        if (timeRef.current) {
            clearInterval(timeRef.current)
            timeRef.current = null
        }
        timeRef.current = setInterval(() => handleResults(), waitTime)
    })
    /** @name 停止处理数据流 */
    const stop = useMemoizedFn(() => {
        if (timeRef.current) {
            clearInterval(timeRef.current)
            timeRef.current = null
        }
    })
    /** @name 关闭处理数据流 */
    const cancel = useMemoizedFn(() => {
        ipcRenderer.invoke(`cancel-${apiKey}`, token)
    })
    /** @name 重置数据流 */
    const reset = useMemoizedFn(() => {
        setStreamInfo({
            progressState: [],
            cardState: [],
            tabsState: [],
            tabsInfoState: {},
            riskState: [],
            logState: []
        })

        runTimeId.current = {cache: "", sent: ""}
        progressKVPair.current = new Map<string, number>()
        cardKVPair.current = new Map<string, HoldGRPCStreamProps.CacheCard>()
        tabTable.current = new Map<string, HoldGRPCStreamProps.CacheTable>()
        tabsText.current = new Map<string, string>()
        riskMessages.current = []
        messages.current = []
    })

    return [streamInfo, {start, stop, cancel, reset}] as const
}
