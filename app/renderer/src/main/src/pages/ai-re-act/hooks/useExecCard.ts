import {useRef, useState} from "react"
import {useMemoizedFn} from "ahooks"
import {Uint8ArrayToString} from "@/utils/str"
import {checkStreamValidity, convertCardInfo} from "@/hook/useHoldGRPCStream/useHoldGRPCStream"
import {StreamResult} from "@/hook/useHoldGRPCStream/useHoldGRPCStreamType"
import {AIChatMessage, AIExecCardEvents, AIOutputEvent} from "@/pages/ai-agent/type/aiChat"

// 属于该 hook 处理数据的类型
export const UseExecCardTypes = ["yak_exec_result"]

export interface useExecCardParams {}

function useExecCard(params?: useExecCardParams) {
    const {} = params || {}

    // card
    const cardKVPair = useRef<Map<string, AIChatMessage.AICacheCard>>(new Map<string, AIChatMessage.AICacheCard>())
    const cardTimeRef = useRef<NodeJS.Timeout | null>(null)
    const [card, setCard] = useState<AIChatMessage.AIInfoCard[]>([])

    const onHandleCard = useMemoizedFn((value: AIChatMessage.AIPluginExecResult) => {
        try {
            if (!value?.IsMessage) return
            const message = value?.Message || ""
            const obj: AIChatMessage.AICardMessage = JSON.parse(Buffer.from(message, "base64").toString("utf8"))
            const logData = obj.content as StreamResult.Log
            if (!(obj.type === "log" && logData.level === "feature-status-card-data")) return
            const checkInfo: AIChatMessage.AICard = checkStreamValidity(obj.content as StreamResult.Log)
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
        } catch (error) {}
    })
    const onSetCard = useMemoizedFn(() => {
        if (cardTimeRef.current) return
        cardTimeRef.current = setTimeout(() => {
            const cacheCard: AIChatMessage.AIInfoCard[] = convertCardInfo(cardKVPair.current)
            setCard(() => [...cacheCard])
            cardTimeRef.current = null
        }, 500)
    })

    const handleSetData = useMemoizedFn((res: AIOutputEvent) => {
        try {
            let ipcContent = Uint8ArrayToString(res.Content) || ""

            if (res.Type === "yak_exec_result") {
                try {
                    if (!res.IsJson) return
                    const data = JSON.parse(ipcContent) as AIChatMessage.AIPluginExecResult
                    onHandleCard(data)
                } catch (error) {}
                return
            }
        } catch (error) {}
    })
    /** 重置所有数据 */
    const handleResetData = useMemoizedFn(() => {
        cardKVPair.current = new Map()
        cardTimeRef.current = null
        setCard([])
    })

    return [card, {handleSetData, handleResetData} as AIExecCardEvents] as const
}

export default useExecCard
