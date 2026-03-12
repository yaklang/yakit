import {useCreation} from "ahooks"
import {
    ContextPressureEcharts,
    ContextPressureEchartsProps,
    ResponseSpeedEcharts,
    ResponseSpeedEchartsProps
} from "../../chatTemplate/AIEcharts"
import styles from "../AIChatContent.module.scss"
import {FC, memo, useCallback, useEffect} from "react"
import {aiChatDataStore} from "../../store/ChatDataStore"
import {formatNumberUnits} from "../../utils"
import {OutlineArrowdownIcon, OutlineArrowupIcon} from "@/assets/icon/outline"
import classNames from "classnames"
import {useRafPolling} from "@/hook/useRafPolling/useRafPolling"
import {isEmpty} from "lodash"
import {AIModelTypeEnum} from "../../defaultConstant"
import {getPressuresData, getCostData} from "./utils"

const AIContextToken: FC<{
    session?: string
    execute: boolean
}> = ({session, execute}) => {
    const getPerfData = useCallback(() => {
        const data = aiChatDataStore.get(session ?? "")?.aiPerfData ?? null
        return data
    }, [session])

    const aiPerfData = useRafPolling({
        getData: getPerfData,
        interval: 2000,
        shouldStop: () => !execute,
        resetDeps: [execute],
        // 优化：如果是一样的数据结构就不更新
        shouldUpdate: (prev, next) => {
            if (!prev) return !!next
            return (
                // 高质模型
                Object.keys(prev.consumption?.tier_consumption?.intelligent || {}).length !==
                    Object.keys(next.consumption?.tier_consumption?.intelligent || {}).length ||
                prev.pressure?.intelligent?.length !== next.pressure?.intelligent?.length ||
                prev.firstCost?.intelligent?.length !== next.firstCost?.intelligent?.length ||
                prev.totalCost?.intelligent?.length !== next.totalCost?.intelligent?.length ||
                // 轻量模型
                Object.keys(prev.consumption?.tier_consumption?.lightweight || {}).length !==
                    Object.keys(next.consumption?.tier_consumption?.lightweight || {}).length ||
                prev.pressure?.lightweight?.length !== next.pressure?.lightweight?.length ||
                prev.firstCost?.lightweight?.length !== next.firstCost?.lightweight?.length ||
                prev.totalCost?.lightweight?.length !== next.totalCost?.lightweight?.length ||
                // 视觉模型
                Object.keys(prev.consumption?.tier_consumption?.vision || {}).length !==
                    Object.keys(next.consumption?.tier_consumption?.vision || {}).length ||
                prev.pressure?.vision?.length !== next.pressure?.vision?.length ||
                prev.firstCost?.vision?.length !== next.firstCost?.vision?.length ||
                prev.totalCost?.vision?.length !== next.totalCost?.vision?.length
            )
        },
        // 进行数据克隆，确保引用变化
        clone: (data) => ({
            ...data,
            pressure: {
                intelligent: [...(data.pressure?.intelligent || [])],
                lightweight: [...(data.pressure?.lightweight || [])],
                vision: [...(data.pressure?.vision || [])]
            },
            firstCost: {
                intelligent: [...(data.firstCost?.intelligent || [])],
                lightweight: [...(data.firstCost?.lightweight || [])],
                vision: [...(data.firstCost?.vision || [])]
            },
            consumption: {
                ...data.consumption,
                tier_consumption: {
                    ...data.consumption?.tier_consumption
                }
            }
        })
    })
    // 上下文压力集合
    const currentPressuresEcharts: ContextPressureEchartsProps["dataEcharts"] = useCreation(() => {
        return {data: getPressuresData(aiPerfData?.pressure, 100)}
    }, [aiPerfData?.pressure])
    // 最新的上下文压力
    const lastPressure = useCreation(() => {
        let pressure: Record<AIModelTypeEnum, number> = {
            [AIModelTypeEnum.TierIntelligent]: 0,
            [AIModelTypeEnum.TierLightweight]: 0,
            [AIModelTypeEnum.TierVision]: 0
        }
        if (!!currentPressuresEcharts?.data?.intelligent?.length) {
            const i = currentPressuresEcharts.data.intelligent.length
            pressure.intelligent = currentPressuresEcharts?.data?.intelligent[i - 1].value || 0
        }
        if (!!currentPressuresEcharts?.data?.lightweight?.length) {
            const l = currentPressuresEcharts.data.lightweight.length
            pressure.lightweight = currentPressuresEcharts?.data?.lightweight[l - 1].value || 0
        }
        if (!!currentPressuresEcharts?.data?.vision?.length) {
            const v = currentPressuresEcharts.data.vision.length
            pressure.vision = currentPressuresEcharts?.data?.vision[v - 1].value || 0
        }
        return pressure
    }, [currentPressuresEcharts.data])

    // 上下文压力预设值
    const pressureThreshold = useCreation(() => {
        let threshold: Record<AIModelTypeEnum, number> = {
            [AIModelTypeEnum.TierIntelligent]: 0,
            [AIModelTypeEnum.TierLightweight]: 0,
            [AIModelTypeEnum.TierVision]: 0
        }
        if (!!aiPerfData?.pressure?.intelligent?.length) {
            const i = aiPerfData.pressure.intelligent.length
            threshold.intelligent = aiPerfData.pressure.intelligent[i - 1].pressure_token_size || 0
        }
        if (!!aiPerfData?.pressure?.lightweight?.length) {
            const l = aiPerfData.pressure.lightweight.length
            threshold.lightweight = aiPerfData.pressure.lightweight[l - 1].pressure_token_size || 0
        }
        if (!!aiPerfData?.pressure?.vision?.length) {
            const v = aiPerfData.pressure.vision.length
            threshold.vision = aiPerfData.pressure.vision[v - 1].pressure_token_size || 0
        }
        return threshold
    }, [aiPerfData?.pressure])

    // 首字符延迟集合
    const currentCostEcharts: ResponseSpeedEchartsProps["dataEcharts"] = useCreation(() => {
        return {data: getCostData(aiPerfData?.firstCost, 100)}
    }, [aiPerfData?.firstCost])
    // 最新的首字符延迟
    const lastFirstCost = useCreation(() => {
        let cost: Record<AIModelTypeEnum, number> = {
            [AIModelTypeEnum.TierIntelligent]: 0,
            [AIModelTypeEnum.TierLightweight]: 0,
            [AIModelTypeEnum.TierVision]: 0
        }
        if (!!currentCostEcharts?.data?.intelligent?.length) {
            const i = currentCostEcharts.data.intelligent.length
            cost.intelligent = currentCostEcharts?.data?.intelligent[i - 1].value || 0
        }
        if (!!currentCostEcharts?.data?.lightweight?.length) {
            const l = currentCostEcharts.data.lightweight.length
            cost.lightweight = currentCostEcharts?.data?.lightweight[l - 1].value || 0
        }
        if (!!currentCostEcharts?.data?.vision?.length) {
            const v = currentCostEcharts.data.vision.length
            cost.vision = currentCostEcharts?.data?.vision[v - 1].value || 0
        }
        return cost
    }, [currentCostEcharts])
    // AI的Token消耗
    const token = useCreation(() => {
        const {consumption} = aiPerfData || {}
        if (isEmpty(consumption)) return [0, 0]
        const input = consumption?.input_consumption || 0
        const output = consumption?.output_consumption || 0
        return [formatNumberUnits(input), formatNumberUnits(output)]
    }, [aiPerfData?.consumption])

    const isShowCost = useCreation(() => {
        return !!(
            currentCostEcharts?.data?.intelligent?.length > 0 ||
            currentCostEcharts?.data?.lightweight?.length > 0 ||
            currentCostEcharts?.data?.vision?.length > 0
        )
    }, [currentCostEcharts.data])
    const isShowPressure = useCreation(() => {
        return !!(
            currentPressuresEcharts?.data?.intelligent?.length > 0 ||
            currentPressuresEcharts?.data?.lightweight?.length > 0 ||
            currentPressuresEcharts?.data?.vision?.length > 0
        )
    }, [currentPressuresEcharts.data])

    const maxIntelligentPressure = useCreation(() => {
        if (!!currentPressuresEcharts.data?.intelligent?.length) {
            return Math.max(...currentPressuresEcharts.data.intelligent.map((item) => item.value))
        }
        return 0
    }, [currentPressuresEcharts.data?.intelligent])
    const maxLightweightPressure = useCreation(() => {
        if (!!currentPressuresEcharts.data?.lightweight?.length) {
            return Math.max(...currentPressuresEcharts.data.lightweight.map((item) => item.value))
        }
        return 0
    }, [currentPressuresEcharts.data?.lightweight])
    return (
        <>
            {isShowPressure && (
                <div className={styles["echarts-wrapper"]}>
                    <div className={styles["title"]}>
                        <span>上下文压力</span>
                        {lastPressure.intelligent > 0 && (
                            <span
                                className={classNames(styles["intelligent"], {
                                    [styles["intelligent-height"]]: lastPressure.intelligent > maxIntelligentPressure
                                })}
                            >
                                {formatNumberUnits(lastPressure.intelligent)}
                            </span>
                        )}
                        {lastPressure.lightweight > 0 && (
                            <span
                                className={classNames(styles["lightweight"], {
                                    [styles["lightweight-height"]]: lastPressure.lightweight > maxLightweightPressure
                                })}
                            >
                                {formatNumberUnits(lastPressure.lightweight)}
                            </span>
                        )}
                    </div>
                    <ContextPressureEcharts dataEcharts={currentPressuresEcharts} threshold={pressureThreshold} />
                </div>
            )}
            {isShowCost && (
                <div className={styles["echarts-wrapper"]}>
                    <div className={styles["title"]}>
                        <span>响应速度</span>
                        {lastFirstCost.intelligent > 0 && (
                            <span
                                className={classNames(styles["intelligent"])}
                            >{`${lastFirstCost.intelligent}ms`}</span>
                        )}
                        {lastFirstCost.lightweight > 0 && (
                            <span
                                className={classNames(styles["lightweight"])}
                            >{`${lastFirstCost.lightweight}ms`}</span>
                        )}
                    </div>
                    <ResponseSpeedEcharts dataEcharts={currentCostEcharts} />
                </div>
            )}
            <div className={styles["info-token"]}>
                <div className={styles["token"]}>Tokens:</div>
                <div className={classNames(styles["token-tag"], styles["upload-token"])}>
                    <OutlineArrowupIcon />
                    {token[0]}
                </div>
                <div className={classNames(styles["token-tag"], styles["download-token"])}>
                    <OutlineArrowdownIcon />
                    {token[1]}
                </div>
                <div className={styles["divider-style"]}></div>
            </div>
        </>
    )
}
export default memo(AIContextToken)
