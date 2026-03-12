import {AIAgentGrpcApi} from "@/pages/ai-re-act/hooks/grpcApi"
import {AIModelTypeEnum} from "../../defaultConstant"
import {AIEchartsDataKey, ContextPressureEchartsProps} from "../../chatTemplate/AIEcharts"
import {random} from "lodash"
import moment from "moment"

/**
 * 处理压力数据，获取echarts需要的数据格式
 * @param pressure 压力未处理前的数据
 * @param sliceLength 截取长度，默认不截取，获取全部数据
 * @returns
 */
export const getPressuresData = (
    pressure?: Record<AIModelTypeEnum, AIAgentGrpcApi.Pressure[]>,
    sliceLength?: number
) => {
    let data: Record<AIModelTypeEnum, AIEchartsDataKey[]> = {
        [AIModelTypeEnum.TierIntelligent]: [],
        [AIModelTypeEnum.TierLightweight]: [],
        [AIModelTypeEnum.TierVision]: []
    }
    let isPushXData = true
    let xData: number[] = []
    if (!pressure) return {data, xData}
    if (!!pressure?.intelligent?.length) {
        let intelligent: AIAgentGrpcApi.Pressure[] = pressure?.intelligent
        if (!!sliceLength) {
            intelligent = pressure?.intelligent.slice(-sliceLength)
        }

        intelligent.forEach((item) => {
            data.intelligent.push({
                modelName: item.model_name || "",
                value: item.current_cost_token_size
            })
            xData.push(item.timestamp || 0)
        })
        isPushXData = false
    }
    if (!!pressure?.lightweight?.length) {
        let lightweight: AIAgentGrpcApi.Pressure[] = pressure?.lightweight
        if (!!sliceLength) {
            lightweight = pressure?.lightweight.slice(-sliceLength)
        }
        pressure?.lightweight.slice(-100).forEach((item) => {
            data.lightweight.push({
                modelName: item.model_name || "",
                value: item.current_cost_token_size
            })
            isPushXData && xData.push(item.timestamp || 0)
        })
        isPushXData = false
    }
    if (!!pressure?.vision?.length) {
        let vision: AIAgentGrpcApi.Pressure[] = pressure?.vision
        if (!!sliceLength) {
            vision = pressure?.vision.slice(-sliceLength)
        }
        pressure?.vision.slice(-100).forEach((item) => {
            data.vision.push({
                modelName: item.model_name || "",
                value: item.current_cost_token_size
            })
            isPushXData && xData.push(item.timestamp || 0)
        })
    }
    return {data, xData}
}

/**
 * 处理响应速度数据，获取echarts需要的数据格式
 * @param cost 响应速度未处理前的数据
 * @param sliceLength 截取长度，默认不截取，获取全部数据
 * @returns
 */
export const getCostData = (cost?: Record<AIModelTypeEnum, AIAgentGrpcApi.AIFirstCostMS[]>, sliceLength?: number) => {
    let data: ContextPressureEchartsProps["dataEcharts"]["data"] = {
        [AIModelTypeEnum.TierIntelligent]: [],
        [AIModelTypeEnum.TierLightweight]: [],
        [AIModelTypeEnum.TierVision]: []
    }
    let xData: number[] = []
    let isPushXData = true
    if (!cost) return {data, xData}
    if (!!cost?.intelligent?.length) {
        let intelligent: AIAgentGrpcApi.AIFirstCostMS[] = cost?.intelligent
        if (!!sliceLength) {
            intelligent = cost?.intelligent.slice(-sliceLength)
        }
        intelligent.forEach((item) => {
            data.intelligent.push({
                modelName: item.model_name || "",
                value: item.ms
            })
            xData.push(item.timestamp || 0)
        })
        isPushXData = false
    }
    if (!!cost?.lightweight?.length) {
        let lightweight: AIAgentGrpcApi.AIFirstCostMS[] = cost?.lightweight
        if (!!sliceLength) {
            lightweight = cost?.lightweight.slice(-sliceLength)
        }
        lightweight.forEach((item) => {
            data.lightweight.push({
                modelName: item.model_name || "",
                value: item.ms
            })
            isPushXData && xData.push(item.timestamp || 0)
        })
        isPushXData = false
    }
    if (!!cost?.vision?.length) {
        let vision: AIAgentGrpcApi.AIFirstCostMS[] = cost?.vision
        if (!!sliceLength) {
            vision = cost?.vision.slice(-sliceLength)
        }
        vision.forEach((item) => {
            data.vision.push({
                modelName: item.model_name || "",
                value: item.ms
            })
            isPushXData && xData.push(item.ms || 0)
        })
    }
    return {data, xData}
}

/**
 * 处理压力数据,获取每个类型的阈值
 * @param pressure 压力未处理前的数据
 * @returns
 */
export const getThreshold = (pressure?: Record<AIModelTypeEnum, AIAgentGrpcApi.Pressure[]>) => {
    let threshold: Record<AIModelTypeEnum, number> = {
        [AIModelTypeEnum.TierIntelligent]: 0,
        [AIModelTypeEnum.TierLightweight]: 0,
        [AIModelTypeEnum.TierVision]: 0
    }
    if (!!pressure?.intelligent?.length) {
        const i = pressure.intelligent.length
        threshold.intelligent = pressure.intelligent[i - 1].pressure_token_size || 0
    }
    if (!!pressure?.lightweight?.length) {
        const l = pressure.lightweight.length
        threshold.lightweight = pressure.lightweight[l - 1].pressure_token_size || 0
    }
    if (!!pressure?.vision?.length) {
        const v = pressure.vision.length
        threshold.vision = pressure.vision[v - 1].pressure_token_size || 0
    }
    return threshold
}
