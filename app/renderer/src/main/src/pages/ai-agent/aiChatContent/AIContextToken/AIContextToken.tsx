import {useCreation} from "ahooks"
import {ContextPressureEcharts, ContextPressureEchartsProps, ResponseSpeedEcharts} from "../../chatTemplate/AIEcharts"
import styles from "../AIChatContent.module.scss"
import {formatTime} from "@/utils/timeUtil"
import {FC, memo, useCallback} from "react"
import {aiChatDataStore} from "../../store/ChatDataStore"
import {formatNumberUnits} from "../../utils"
import {OutlineArrowupIcon} from "@/assets/icon/outline"
import classNames from "classnames"
import {useRafPolling} from "@/hook/useRafPolling/useRafPolling"

const AIContextToken: FC<{
    session?: string
    execute: boolean
}> = ({session, execute}) => {
    const getPerfData = useCallback(() => {
        return aiChatDataStore.get(session ?? "")?.aiPerfData ?? null
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
                prev.pressure?.length !== next.pressure?.length ||
                prev.firstCost?.length !== next.firstCost?.length ||
                Object.keys(prev.consumption || {}).length !== Object.keys(next.consumption || {}).length
            )
        },
        // 进行数据克隆，确保引用变化
        clone: (data) => ({
            ...data,
            pressure: [...data.pressure],
            firstCost: [...data.firstCost],
            consumption: {...data.consumption}
        })
    })
    // 上下文压力集合
    const currentPressuresEcharts: ContextPressureEchartsProps["dataEcharts"] = useCreation(() => {
        const data: number[] = []
        const xAxis: string[] = []
        aiPerfData?.pressure.forEach((item) => {
            data.push(item.current_cost_token_size)
            xAxis.push(item.timestamp ? formatTime(item.timestamp) : "-")
        })
        return {data, xAxis}
    }, [aiPerfData?.pressure])
    // 最新的上下文压力
    const lastPressure = useCreation(() => {
        const length = currentPressuresEcharts.data.length
        if (length === 0) return 0
        return currentPressuresEcharts.data[length - 1] || 0
    }, [currentPressuresEcharts.data])

    // 上下文压力预设值
    const pressureThreshold = useCreation(() => {
        const length = aiPerfData?.pressure.length || 0
        if (length === 0) return 0
        return aiPerfData?.pressure[length - 1].pressure_token_size || 0
    }, [aiPerfData?.pressure])

    // 首字符延迟集合
    const currentCostEcharts = useCreation(() => {
        const data: number[] = []
        const xAxis: string[] = []
        aiPerfData?.firstCost.forEach((item) => {
            data.push(item.ms)
            xAxis.push(item.timestamp ? formatTime(item.timestamp) : "-")
        })
        return {data, xAxis}
    }, [aiPerfData?.firstCost])
    // 最新的首字符延迟
    const lastFirstCost = useCreation(() => {
        const length = currentCostEcharts.data.length
        if (length === 0) return 0
        return currentCostEcharts.data[length - 1] || 0
    }, [currentCostEcharts])
    // AI的Token消耗
    const token = useCreation(() => {
        let input = 0
        let output = 0
        const {consumption} = aiPerfData || {}
        const keys = Object.keys(consumption || {})
        for (let name of keys) {
            input += consumption[name]?.input_consumption || 0
            output += consumption[name]?.output_consumption || 0
        }
        return [formatNumberUnits(input || 0), formatNumberUnits(output || 0)]
    }, [aiPerfData?.consumption])

    return (
        <>
            {currentPressuresEcharts?.data?.length > 0 && (
                <div className={styles["echarts-wrapper"]}>
                    <div className={styles["title"]}>
                        上下文压力：
                        <span className={styles["pressure"]}>{formatNumberUnits(lastPressure)}</span>
                    </div>
                    <ContextPressureEcharts dataEcharts={currentPressuresEcharts} threshold={pressureThreshold} />
                </div>
            )}
            {currentCostEcharts?.data?.length > 0 && (
                <div className={styles["echarts-wrapper"]}>
                    <div className={styles["title"]}>
                        响应速度
                        <span className={styles["cost"]}>{`${lastFirstCost < 0 ? "-" : lastFirstCost}ms`}</span>
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
                    <OutlineArrowupIcon />
                    {token[1]}
                </div>
                <div className={styles["divider-style"]}></div>
            </div>
        </>
    )
}
export default memo(AIContextToken)
