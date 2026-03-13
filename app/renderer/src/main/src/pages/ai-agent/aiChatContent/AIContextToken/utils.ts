import {AIAgentGrpcApi} from "@/pages/ai-re-act/hooks/grpcApi"
import {AIModelTypeEnum} from "../../defaultConstant"
import {AIEchartsDataKey, ContextPressureEchartsProps} from "../../chatTemplate/AIEcharts"

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
    let xData: number[] = []
    if (!pressure) return {data, xData}
    const intelligentLength = pressure?.intelligent?.length || 0
    const lightweightLength = pressure?.lightweight?.length || 0
    const visionLength = pressure?.vision?.length || 0
    const maxLength = Math.max(intelligentLength, lightweightLength, visionLength)
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
            if (maxLength === intelligentLength) xData.push(item.timestamp || 0)
        })
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
            if (maxLength === lightweightLength) xData.push(item.timestamp || 0)
        })
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
            if (maxLength === visionLength) xData.push(item.timestamp || 0)
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

    if (!cost) return {data, xData}
    const intelligentLength = cost?.intelligent?.length || 0
    const lightweightLength = cost?.lightweight?.length || 0
    const visionLength = cost?.vision?.length || 0
    const maxLength = Math.max(intelligentLength, lightweightLength, visionLength)
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
            if (maxLength === intelligentLength) xData.push(item.timestamp || 0)
        })
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
            if (maxLength === lightweightLength) xData.push(item.timestamp || 0)
        })
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
            if (maxLength === visionLength) xData.push(item.ms || 0)
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
    let threshold: number = 0
    const intelligentLength = pressure?.intelligent?.length || 0
    const lightweightLength = pressure?.lightweight?.length || 0
    const visionLength = pressure?.vision?.length || 0
    const maxLength = Math.max(intelligentLength, lightweightLength, visionLength)
    if (!!pressure?.intelligent?.length && maxLength === intelligentLength) {
        const i = pressure.intelligent.length
        threshold = pressure.intelligent[i - 1].pressure_token_size || 0
    }
    if (!!pressure?.lightweight?.length && maxLength === lightweightLength) {
        const l = pressure.lightweight.length
        threshold = pressure.lightweight[l - 1].pressure_token_size || 0
    }
    if (!!pressure?.vision?.length && maxLength === visionLength) {
        const v = pressure.vision.length
        threshold = pressure.vision[v - 1].pressure_token_size || 0
    }
    return threshold
}
