import {AIAgentGrpcApi} from "@/pages/ai-re-act/hooks/grpcApi"
import {AIModelTypeEnum} from "../../defaultConstant"
import {ContextPressureEchartsProps} from "../../chatTemplate/AIEcharts"

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
    let data: ContextPressureEchartsProps["dataEcharts"]["data"] = {
        [AIModelTypeEnum.TierIntelligent]: [],
        [AIModelTypeEnum.TierLightweight]: [],
        [AIModelTypeEnum.TierVision]: []
    }
    if (!pressure) return data
    if (!!pressure?.intelligent?.length) {
        let intelligent: AIAgentGrpcApi.Pressure[] = pressure?.intelligent
        if (!!sliceLength) {
            intelligent = pressure?.intelligent.slice(-sliceLength)
        }
        intelligent.forEach((item) => {
            data.intelligent.push({
                modelName: "",
                value: item.current_cost_token_size
            })
        })
    }
    if (!!pressure?.lightweight?.length) {
        let lightweight: AIAgentGrpcApi.Pressure[] = pressure?.lightweight
        if (!!sliceLength) {
            lightweight = pressure?.lightweight.slice(-sliceLength)
        }
        pressure?.lightweight.slice(-100).forEach((item) => {
            data.lightweight.push({
                modelName: "",
                value: item.current_cost_token_size
            })
        })
    }
    if (!!pressure?.vision?.length) {
        let vision: AIAgentGrpcApi.Pressure[] = pressure?.vision
        if (!!sliceLength) {
            vision = pressure?.vision.slice(-sliceLength)
        }
        pressure?.vision.slice(-100).forEach((item) => {
            data.vision.push({
                modelName: "",
                value: item.current_cost_token_size
            })
        })
    }
    return data
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
    if (!cost) return data
    if (!!cost?.intelligent?.length) {
        let intelligent: AIAgentGrpcApi.AIFirstCostMS[] = cost?.intelligent
        if (!!sliceLength) {
            intelligent = cost?.intelligent.slice(-sliceLength)
        }
        intelligent.forEach((item) => {
            data.intelligent.push({
                modelName: "",
                value: item.ms
            })
        })
    }
    if (!!cost?.lightweight?.length) {
        let lightweight: AIAgentGrpcApi.AIFirstCostMS[] = cost?.lightweight
        if (!!sliceLength) {
            lightweight = cost?.lightweight.slice(-sliceLength)
        }
        lightweight.forEach((item) => {
            data.lightweight.push({
                modelName: "",
                value: item.ms
            })
        })
    }
    if (!!cost?.vision?.length) {
        let vision: AIAgentGrpcApi.AIFirstCostMS[] = cost?.vision
        if (!!sliceLength) {
            vision = cost?.vision.slice(-sliceLength)
        }
        vision.forEach((item) => {
            data.vision.push({
                modelName: "",
                value: item.ms
            })
        })
    }
    return data
}
