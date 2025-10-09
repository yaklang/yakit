import {useRef, useState} from "react"
import {useMemoizedFn} from "ahooks"
import {Uint8ArrayToString} from "@/utils/str"
import {checkStreamValidity, convertCardInfo} from "@/hook/useHoldGRPCStream/useHoldGRPCStream"
import {StreamResult} from "@/hook/useHoldGRPCStream/useHoldGRPCStreamType"
import {UseYakExecResultEvents, UseYakExecResultParams, UseYakExecResultState} from "./type"
import {handleGrpcDataPushLog} from "./utils"
import {v4 as uuidv4} from "uuid"
import {AIAgentGrpcApi, AIOutputEvent} from "./grpcApi"
import {AIChatQSData} from "./aiRender"

// 属于该 hook 处理数据的类型
export const UseYakExecResultTypes = ["yak_exec_result"]

function useYakExecResult(params?: UseYakExecResultParams): [UseYakExecResultState, UseYakExecResultEvents]

function useYakExecResult(params?: UseYakExecResultParams) {
    const handlePushLog = useMemoizedFn((log: AIChatQSData) => {
        if (params?.pushLog) {
            params.pushLog(log)
        }
    })

    // card
    const cardKVPair = useRef<Map<string, AIAgentGrpcApi.AICacheCard>>(new Map<string, AIAgentGrpcApi.AICacheCard>())
    const cardTimeRef = useRef<NodeJS.Timeout | null>(null)
    const [card, setCard] = useState<AIAgentGrpcApi.AIInfoCard[]>([])
    const [yakExecResultLogs, setYakExecResultLogs] = useState<StreamResult.Log[]>([]) // log:目前只有file

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

    const handleSetData = useMemoizedFn((res: AIOutputEvent) => {
        try {
            let ipcContent = Uint8ArrayToString(res.Content) || ""

            if (res.Type === "yak_exec_result") {
                const data = JSON.parse(ipcContent) as AIAgentGrpcApi.AIPluginExecResult
                onHandleYakExecResult(data)
                return
            }
        } catch (error) {
            handleGrpcDataPushLog({type: "error", info: res, pushLog: handlePushLog})
        }
    })
    const onHandleYakExecResult = useMemoizedFn((value: AIAgentGrpcApi.AIPluginExecResult) => {
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
                    onHandleYakExecResultLogs(obj)
                    break
                default:
                    break
            }
        } catch (error) {}
    })
    /**
     * @description 该方法可以记录yak_exec_result中所有的日志，但是目前只对接level:file;后续根据可需求更改
     */
    const onHandleYakExecResultLogs = useMemoizedFn((obj: AIAgentGrpcApi.AICardMessage) => {
        const log = obj.content as StreamResult.Log
        setYakExecResultLogs((perLog) => [...perLog, {...log, id: uuidv4()}])
    })
    /** 重置所有数据 */
    const handleResetData = useMemoizedFn(() => {
        cardKVPair.current = new Map()
        cardTimeRef.current = null
        setCard([])
    })

    return [
        {card, yakExecResultLogs},
        {handleSetData, handleResetData}
    ] as const
}

export default useYakExecResult
