import {useState} from "react"
import {useMemoizedFn} from "ahooks"
import {Uint8ArrayToString} from "@/utils/str"
import cloneDeep from "lodash/cloneDeep"
import {AIChatMessage, AIOutputEvent, AIPerfData, AIPerfDataEvents} from "@/pages/ai-agent/type/aiChat"

// 属于该 hook 处理数据的类型
export const UseAIPerfDataTypes = ["consumption", "pressure", "ai_first_byte_cost_ms", "ai_total_cost_ms"]

const defaultConsumption: AIChatMessage.Consumption = {
    input_consumption: 0,
    output_consumption: 0,
    consumption_uuid: ""
}

interface useAIPerfDataParams {
    // 异常数据放入日志中
    pushErrorLog: (log: AIChatMessage.Log) => void
}

/** 提供 AI 硬件相关性能数据 */
function useAIPerfData(params?: useAIPerfDataParams) {
    // 因为可能存在多个 ai 并发输出，所以这里的 token 量是一个集合
    const [consumption, setConsumption] = useState<Record<string, AIChatMessage.Consumption>>({})
    const [pressure, setPressure] = useState<AIChatMessage.Pressure[]>([])
    const [firstCost, setFirstCost] = useState<AIChatMessage.AICostMS[]>([])
    const [totalCost, setTotalCost] = useState<AIChatMessage.AICostMS[]>([])

    const handleSetData = useMemoizedFn((res: AIOutputEvent) => {
        try {
            let ipcContent = Uint8ArrayToString(res.Content) || ""

            if (res.Type === "consumption") {
                // 消耗Token
                try {
                    if (!res.IsJson) return
                    const data = JSON.parse(ipcContent) as AIChatMessage.Consumption
                    const onlyId = data.consumption_uuid || "system"

                    setConsumption((old) => {
                        const newData = cloneDeep(old)
                        const info = newData[onlyId]
                        if (
                            info &&
                            info.input_consumption === data.input_consumption &&
                            info.output_consumption === data.output_consumption
                        ) {
                            return old
                        }
                        newData[onlyId] = data
                        return newData
                    })
                } catch (error) {}
                return
            }

            if (res.Type === "pressure") {
                // 上下文压力
                try {
                    if (!res.IsJson) return
                    const data = JSON.parse(ipcContent) as AIChatMessage.Pressure
                    setPressure((old) => old.concat([{...data, timestamp: Number(res.Timestamp) || 0}]))
                } catch (error) {}
                return
            }

            if (res.Type === "ai_first_byte_cost_ms") {
                // 首字符响应耗时
                try {
                    if (!res.IsJson) return
                    const data = JSON.parse(ipcContent) as AIChatMessage.AICostMS
                    setFirstCost((old) => old.concat([{...data, timestamp: Number(res.Timestamp) || 0}]))
                } catch (error) {}
                return
            }

            if (res.Type === "ai_total_cost_ms") {
                // 总对话耗时
                try {
                    if (!res.IsJson) return
                    const data = JSON.parse(ipcContent) as AIChatMessage.AICostMS
                    setTotalCost((old) => old.concat([{...data, timestamp: Number(res.Timestamp) || 0}]))
                } catch (error) {}
                return
            }
        } catch (error) {}
    })

    /** 重置所有数据 */
    const handleResetData = useMemoizedFn(() => {
        setConsumption({})
        setPressure([])
        setFirstCost([])
        setTotalCost([])
    })

    return [
        {consumption, pressure, firstCost, totalCost} as AIPerfData,
        {handleSetData, handleResetData} as AIPerfDataEvents
    ] as const
}

export default useAIPerfData
