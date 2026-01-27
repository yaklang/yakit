import {useRef, useState} from "react"
import {useCreation, useMemoizedFn} from "ahooks"
import {Uint8ArrayToString} from "@/utils/str"
import {checkStreamValidity, convertCardInfo} from "@/hook/useHoldGRPCStream/useHoldGRPCStream"
import {StreamResult} from "@/hook/useHoldGRPCStream/useHoldGRPCStreamType"
import {AIChatLogData, UseYakExecResultEvents, UseYakExecResultParams, UseYakExecResultState} from "./type"
import {handleGrpcDataPushLog} from "./utils"
import {v4 as uuidv4} from "uuid"
import {AIAgentGrpcApi, AIOutputEvent} from "./grpcApi"
import {AIYakExecFileRecord} from "./aiRender"
import useThrottleState from "@/hook/useThrottleState"

// 属于该 hook 处理数据的类型
export const UseYakExecResultTypes = ["yak_exec_result"]

function useYakExecResult(params?: UseYakExecResultParams): [UseYakExecResultState, UseYakExecResultEvents]

function useYakExecResult(params?: UseYakExecResultParams) {
    const handlePushLog = useMemoizedFn((log: AIChatLogData) => {
        if (params?.pushLog) {
            params.pushLog(log)
        }
    })

    // card
    const cardKVPair = useRef<Map<string, AIAgentGrpcApi.AICacheCard>>(new Map<string, AIAgentGrpcApi.AICacheCard>())
    const cardTimeRef = useRef<NodeJS.Timeout | null>(null)
    const [card, setCard] = useState<AIAgentGrpcApi.AIInfoCard[]>([])
    const [yakExecResultLogs, setYakExecResultLogs] = useState<StreamResult.Log[]>([]) // log

    const execFileRecordOrder = useRef(1)
    /** 插件执行过程中的文件操作记录 */
    const [execFileRecord, setExecFileRecord] = useThrottleState<Map<string, AIYakExecFileRecord[]>>(new Map(), {
        wait: 2000
    })
    const updateExecFileRecord = useMemoizedFn((CallToolID: string, info: StreamResult.Log) => {
        try {
            setExecFileRecord((old) => {
                const newMap = new Map(old)
                const keyName = CallToolID || "system"
                const record = newMap.get(keyName) || []
                record.push({...info, id: uuidv4(), order: execFileRecordOrder.current++})
                newMap.set(keyName, [...record])
                return newMap
            })
        } catch (error) {}
    })

    const onHandleCard = useMemoizedFn((value: AIAgentGrpcApi.AICardMessage) => {
        const logData = value.content as StreamResult.Log
        const checkInfo: AIAgentGrpcApi.AICard = checkStreamValidity(value.content as StreamResult.Log)
        if (!checkInfo) return
        const {id, data, tags} = checkInfo
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
        onSetCard()
    })
    const onSetCard = useMemoizedFn(() => {
        if (cardTimeRef.current) return
        cardTimeRef.current = setTimeout(() => {
            const cacheCard: AIAgentGrpcApi.AIInfoCard[] = convertCardInfo(cardKVPair.current)
            setCard(() => [...cacheCard])
            cardTimeRef.current = null
        }, 500)
    })

    /**
     * @description 该方法可以记录yak_exec_result中所有的日志，根但是目前只对接level:file;后续据可需求更改
     */
    const onHandleYakExecResultLogs = useMemoizedFn((obj: AIAgentGrpcApi.AICardMessage) => {
        const log = obj.content as StreamResult.Log
        setYakExecResultLogs((perLog) => [...perLog, {...log, id: uuidv4()}])
    })

    const onHandleYakExecResult = useMemoizedFn((CallToolID: string, value: AIAgentGrpcApi.AIPluginExecResult) => {
        try {
            if (!value?.IsMessage) return
            const message = value?.Message || ""
            const obj: AIAgentGrpcApi.AICardMessage = JSON.parse(Buffer.from(message, "base64").toString("utf8"))

            if (obj.type !== "log") return
            const content = obj.content as StreamResult.Log
            switch (content.level) {
                case "feature-status-card-data":
                    onHandleCard(obj)
                    break
                case "file":
                    updateExecFileRecord(CallToolID, content)
                    break
                default:
                    break
            }
        } catch (error) {}
    })

    /** AI执行过程中的status状态卡片化处理 */
    const onAIStatusHandleCard = useMemoizedFn((info: {key: string; value: string; timestamp: number}) => {
        const {key, value, timestamp} = info
        const originData = cardKVPair.current.get(key)
        if (originData && originData.Timestamp > timestamp) {
            return
        }
        cardKVPair.current.set(key, {
            Id: key,
            Data: value,
            Timestamp: timestamp,
            Tags: []
        })
        onSetCard()
    })

    const handleSetData = useMemoizedFn((res: AIOutputEvent) => {
        try {
            let ipcContent = Uint8ArrayToString(res.Content) || ""

            if (res.Type === "yak_exec_result") {
                const data = JSON.parse(ipcContent) as AIAgentGrpcApi.AIPluginExecResult
                onHandleYakExecResult(res.CallToolID || "", data)
                return
            }
            if (res.Type === "structured" && res.NodeId === "status") {
                // 执行状态卡片处理
                const data = JSON.parse(ipcContent) as {key: string; value: string}
                if (data.key !== "re-act-loading-status-key") {
                    onAIStatusHandleCard({...data, timestamp: res.Timestamp})
                }
                return
            }
        } catch (error) {
            handleGrpcDataPushLog({info: res, pushLog: handlePushLog})
        }
    })

    /** 重置所有数据 */
    const handleResetData = useMemoizedFn(() => {
        cardKVPair.current = new Map()
        cardTimeRef.current = null
        setCard([])
        setYakExecResultLogs([])
        execFileRecordOrder.current = 1
        setExecFileRecord(new Map())
    })

    const state: UseYakExecResultState = useCreation(() => {
        return {card, execFileRecord, yakExecResultLogs}
    }, [card, execFileRecord, yakExecResultLogs])

    const events: UseYakExecResultEvents = useCreation(() => {
        return {handleSetData, handleResetData}
    }, [])

    return [state, events] as const
}

export default useYakExecResult
