import {useEffect, useRef, useState} from "react"
import {useMemoizedFn} from "ahooks"
import {HoldGRPCStreamProps, StreamResult} from "@/hook/useHoldGRPCStream/useHoldGRPCStreamType"
import {CodeScanStreamInfo} from "../yakRunnerCodeScan/YakRunnerCodeScan"
import {yakitNotify} from "@/utils/notification"
import {
    SyntaxFlowScanExecuteState,
    SyntaxFlowScanRequest,
    SyntaxFlowScanResponse
} from "../yakRunnerCodeScan/YakRunnerCodeScanType"
import {v4 as uuidv4} from "uuid"
import {convertCardInfo} from "@/hook/useHoldGRPCStream/useHoldGRPCStream"
import cloneDeep from "lodash/cloneDeep"
import {apiCancelSyntaxFlowScan, apiSyntaxFlowScan} from "../yakRunnerCodeScan/utils"

const {ipcRenderer} = window.require("electron")

export default function useRuleDebug(params: {token: string; errorCallback?: () => void; endCallback?: () => void}) {
    const {token, errorCallback, endCallback} = params

    // 当前执行的状态
    const [executeStatus, setExecuteStatus] = useState<SyntaxFlowScanExecuteState>("default")

    const [progress, setProgress] = useState<number>(0)
    const [runtimeId, setRuntimeId] = useState<string>("")
    const [streamInfo, setStreamInfo] = useState<CodeScanStreamInfo>({
        cardState: [],
        logState: []
    })

    // logs
    let messages = useRef<StreamResult.Message[]>([])
    // card
    let cardKVPair = useRef<Map<string, HoldGRPCStreamProps.CacheCard>>(
        new Map<string, HoldGRPCStreamProps.CacheCard>()
    )

    /** 判断卡片数据是否为无效数据 */
    const checkStreamValidity = useMemoizedFn((stream: StreamResult.Log) => {
        try {
            const check = JSON.parse(stream.data)
            if (check === "null" || !check || check === "undefined") return false
            return check
        } catch (e) {
            return false
        }
    })
    /** 放入日志队列 */
    const pushLogs = useMemoizedFn((log: StreamResult.Message) => {
        messages.current.unshift({...log, content: {...log.content, id: uuidv4()}})
        // 只缓存 100 条结果（日志类型 + 数据类型）
        if (messages.current.length > 100) {
            messages.current.pop()
        }
    })

    const [isStart, setIsStart] = useState(false)
    useEffect(() => {
        setIsStart(["process", "paused"].includes(executeStatus))
    }, [executeStatus])

    useEffect(() => {
        if (isStart) {
            let id: any = setInterval(() => {
                const logs: StreamResult.Log[] = messages.current
                    .filter((i) => i.type === "log")
                    .map((i) => i.content as StreamResult.Log)
                    .filter((i) => i.data !== "null")
                setStreamInfo({
                    cardState: convertCardInfo(cardKVPair.current),
                    logState: logs
                })
            }, 200)

            return () => {
                clearInterval(id)
                id = null
                setTimeout(() => {
                    const logs: StreamResult.Log[] = messages.current
                        .filter((i) => i.type === "log")
                        .map((i) => i.content as StreamResult.Log)
                        .filter((i) => i.data !== "null")
                    setStreamInfo({
                        cardState: convertCardInfo(cardKVPair.current),
                        logState: logs
                    })
                }, 500)
            }
        }
    }, [isStart])

    useEffect(() => {
        ipcRenderer.on(`${token}-data`, async (e: any, res: SyntaxFlowScanResponse) => {
            if (res) {
                const data = res.ExecResult

                if (!!res.Status) {
                    switch (res.Status) {
                        case "done":
                            executeStatus !== "finished" && setExecuteStatus("finished")
                            break
                        case "error":
                            executeStatus !== "error" && setExecuteStatus("error")
                            break
                        case "executing":
                            executeStatus !== "process" && setExecuteStatus("process")
                            break
                        case "paused":
                            executeStatus !== "paused" && setExecuteStatus("paused")
                            break
                        default:
                            break
                    }
                }
                if (!!data?.RuntimeID && data?.RuntimeID !== runtimeId) {
                    setRuntimeId(data.RuntimeID)
                }
                if (data && data.IsMessage) {
                    try {
                        let obj: StreamResult.Message = JSON.parse(Buffer.from(data.Message).toString())

                        // 进度条
                        let progressObj = obj.content as StreamResult.Progress
                        if (obj.type === "progress") {
                            setProgress(+progressObj.progress || 0)
                            return
                        }

                        // feature-status-card-data 卡片展示
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

                        pushLogs(obj)
                    } catch (error) {}
                }
            }
        })
        ipcRenderer.on(`${token}-error`, (e: any, error: any) => {
            setTimeout(() => {
                setExecuteStatus("error")
            }, 200)
            yakitNotify("error", `[Mod] flow-scan error: ${error}`)
            errorCallback && errorCallback()
        })
        ipcRenderer.on(`${token}-end`, (e: any, data: any) => {
            yakitNotify("info", "[SyntaxFlowScan] finished")
            endCallback && endCallback()
        })
        return () => {
            ipcRenderer.removeAllListeners(`${token}-data`)
            ipcRenderer.removeAllListeners(`${token}-error`)
            ipcRenderer.removeAllListeners(`${token}-end`)
        }
    }, [token])

    /** 当前执行的参数数据 */
    const currentRequest = useRef<SyntaxFlowScanRequest>()

    /** 开始执行 */
    const handleStart = useMemoizedFn((request: SyntaxFlowScanRequest) => {
        return new Promise<undefined>((resolve, reject) => {
            handleReset()
            currentRequest.current = cloneDeep(request)
            apiSyntaxFlowScan(request, token)
                .then(() => {
                    setExecuteStatus("process")
                    resolve(undefined)
                })
                .catch((err) => {
                    reject(err)
                })
        })
    })

    /** 暂停执行 */
    const handlePause = useMemoizedFn(() => {
        return new Promise<undefined>((resolve, reject) => {
            if (!currentRequest.current) {
                yakitNotify("error", "暂停失败，请求参数为空!")
                reject("暂停失败，请求参数为空!")
                return
            }
            apiSyntaxFlowScan({...currentRequest.current, ControlMode: "pause", ResumeTaskId: runtimeId}, token)
                .then(() => {
                    resolve(undefined)
                })
                .catch((err) => {
                    reject(err)
                })
        })
    })

    /** 继续执行 */
    const handleContinue = useMemoizedFn(() => {
        return new Promise<undefined>((resolve, reject) => {
            if (!currentRequest.current) {
                yakitNotify("error", "继续失败，请求参数为空!")
                reject("继续失败，请求参数为空!")
                return
            }
            apiSyntaxFlowScan({...currentRequest.current, ControlMode: "resume", ResumeTaskId: runtimeId}, token)
                .then(() => {
                    // 清空暂停前的数据
                    messages.current = []
                    cardKVPair.current.clear()
                    resolve(undefined)
                })
                .catch((err) => {
                    reject(err)
                })
        })
    })

    /** 停止执行 */
    const handleStop = useMemoizedFn(() => {
        return new Promise<undefined>((resolve, reject) => {
            apiCancelSyntaxFlowScan(token)
                .then(() => {
                    resolve(undefined)
                })
                .catch(reject)
        })
    })

    /** 重置数据 */
    const handleReset = useMemoizedFn(() => {
        messages.current = []
        cardKVPair.current.clear()
        currentRequest.current = undefined
        setRuntimeId("")
        setProgress(0)
        setExecuteStatus("default")
        setStreamInfo({cardState: [], logState: []})
    })

    return [
        {executeStatus, progress, runtimeId, streamInfo},
        {
            /** 开始执行规则 */
            onStart: handleStart,
            /** 暂停规则执行，不需要传参，内部记录了参数 */
            onPause: handlePause,
            /** 继续执行规则,，不需要传参，内部记录了参数 */
            onContinue: handleContinue,
            /** 停止执行规则 */
            onStop: handleStop,
            /** 数据重置 */
            onReset: handleReset
        }
    ] as const
}
