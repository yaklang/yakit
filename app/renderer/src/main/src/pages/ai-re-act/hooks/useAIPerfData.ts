import {useState} from "react"
import {useMemoizedFn} from "ahooks"
import {Uint8ArrayToString} from "@/utils/str"
import cloneDeep from "lodash/cloneDeep"
import {AIChatLogData, UseAIPerfDataEvents, UseAIPerfDataParams, UseAIPerfDataState} from "./type"
import {handleGrpcDataPushLog} from "./utils"
import {AITokenConsumption} from "./aiRender"
import {AIAgentGrpcApi, AIOutputEvent} from "./grpcApi"

// 属于该 hook 处理数据的类型
export const UseAIPerfDataTypes = ["consumption", "pressure", "ai_first_byte_cost_ms", "ai_total_cost_ms"]

function useAIPerfData(params?: UseAIPerfDataParams): [UseAIPerfDataState, UseAIPerfDataEvents]

/** 提供 AI 硬件相关性能数据 */
function useAIPerfData(params?: UseAIPerfDataParams) {
    const handlePushLog = useMemoizedFn((log: AIChatLogData) => {
        if (!!params?.pushLog) {
            params.pushLog(log)
        }
    })

    // 因为可能存在多个 ai 并发输出，所以这里的 token 量是一个集合
    const [consumption, setConsumption] = useState<AITokenConsumption>({})
    const [pressure, setPressure] = useState<AIAgentGrpcApi.Pressure[]>([])
    const [firstCost, setFirstCost] = useState<AIAgentGrpcApi.AICostMS[]>([])
    const [totalCost, setTotalCost] = useState<AIAgentGrpcApi.AICostMS[]>([])

    const handleSetData = useMemoizedFn((res: AIOutputEvent) => {
        try {
            let ipcContent = Uint8ArrayToString(res.Content) || ""

            if (res.Type === "consumption") {
                // 消耗Token
                const data = JSON.parse(ipcContent) as AIAgentGrpcApi.Consumption
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
                return
            }

            if (res.Type === "pressure") {
                // 上下文压力
                const data = JSON.parse(ipcContent) as AIAgentGrpcApi.Pressure
                setPressure((old) => old.concat([{...data, timestamp: Number(res.Timestamp) || 0}]))
                return
            }

            if (res.Type === "ai_first_byte_cost_ms") {
                // 首字符响应耗时
                const data = JSON.parse(ipcContent) as AIAgentGrpcApi.AICostMS
                setFirstCost((old) => old.concat([{...data, timestamp: Number(res.Timestamp) || 0}]))
                return
            }

            if (res.Type === "ai_total_cost_ms") {
                // 总对话耗时
                const data = JSON.parse(ipcContent) as AIAgentGrpcApi.AICostMS
                setTotalCost((old) => old.concat([{...data, timestamp: Number(res.Timestamp) || 0}]))
                return
            }
        } catch (error) {
            handleGrpcDataPushLog({info: res, pushLog: handlePushLog})
        }
    })

    /** 重置所有数据 */
    const handleResetData = useMemoizedFn(() => {
        setConsumption({})
        setPressure([])
        setFirstCost([])
        setTotalCost([])
    })

    return [
        {consumption, pressure, firstCost, totalCost},
        {handleSetData, handleResetData}
    ] as const
}

export default useAIPerfData
