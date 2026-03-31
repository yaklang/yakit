import {useCreation, useInViewport, useMemoizedFn} from "ahooks"
import {
    AICostDetailsEcharts,
    AICostDetailsEchartsProps,
    AIPressureDetailsEcharts,
    AIPressureDetailsEchartsProps,
    ContextPressureEcharts,
    ContextPressureEchartsProps,
    ResponseSpeedEcharts,
    ResponseSpeedEchartsProps
} from "../../chatTemplate/AIEcharts"
import styles from "../AIChatContent.module.scss"
import {FC, memo, useCallback, useEffect, useRef, useState} from "react"
import {aiChatDataStore} from "../../store/ChatDataStore"
import {formatNumberUnits} from "../../utils"
import {
    OutlineArrowdownIcon,
    OutlineArrowupIcon,
    OutlinePresentationchartlineIcon,
    OutlineXIcon
} from "@/assets/icon/outline"
import classNames from "classnames"
import {useRafPolling} from "@/hook/useRafPolling/useRafPolling"
import {cloneDeep, isEmpty} from "lodash"
import {AIModelTypeEnum} from "../../defaultConstant"
import {getPressuresData, getCostData, getThreshold} from "./utils"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"
import {AIModelConfig, grpcGetAIGlobalConfig} from "../../aiModelList/utils"
import {getIconByAI} from "../../aiModelList/aiModelSelect/AIModelSelect"
import {AIAgentGrpcApi} from "@/pages/ai-re-act/hooks/grpcApi"
import {AIChatData} from "../../type/aiChat"
import {AIDetailsDashIcon} from "../../aiChatWelcome/icon"
import {Tooltip} from "antd"
import {useI18nNamespaces} from "@/i18n/useI18nNamespaces"

const AIContextToken: FC<{
    session?: string
    execute: boolean
}> = ({session, execute}) => {
    const {t} = useI18nNamespaces(["aiAgent"])
    const [visible, setVisible] = useState<boolean>(false)
    const getPerfData = useCallback(() => {
        const data = aiChatDataStore.get(session ?? "")?.aiPerfData ?? null
        return data
    }, [session])

    const {renderNumber, aiDataRef} = useRafPolling({
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
        clone: (data) => cloneDeep(data)
    })
    // 上下文压力集合
    const currentPressuresEcharts: ContextPressureEchartsProps["dataEcharts"] = useCreation(() => {
        return getPressuresData(aiDataRef?.pressure, 100)
    }, [renderNumber, aiDataRef?.pressure])

    // 上下文压力预设值
    const pressureThreshold = useCreation(() => {
        return getThreshold(aiDataRef?.pressure)
    }, [renderNumber, aiDataRef?.pressure])

    // 首字符延迟集合
    const currentCostEcharts: ResponseSpeedEchartsProps["dataEcharts"] = useCreation(() => {
        return getCostData(aiDataRef?.firstCost, 100)
    }, [renderNumber, aiDataRef?.firstCost])
    // AI的Token消耗
    const token = useCreation(() => {
        const {consumption} = aiDataRef || {}
        if (isEmpty(consumption)) return [0, 0]
        const input = consumption?.input_consumption || 0
        const output = consumption?.output_consumption || 0
        return [formatNumberUnits(input), formatNumberUnits(output)]
    }, [renderNumber, aiDataRef?.consumption])

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
        return currentPressuresEcharts.maxValue.intelligent
    }, [currentPressuresEcharts.maxValue.intelligent])
    const maxLightweightPressure = useCreation(() => {
        return currentPressuresEcharts.maxValue.lightweight
    }, [currentPressuresEcharts.maxValue.lightweight])

    const maxIntelligentCost = useCreation(() => {
        return currentCostEcharts.maxValue.intelligent
    }, [currentCostEcharts.maxValue.intelligent])
    const maxLightweightCost = useCreation(() => {
        return currentCostEcharts.maxValue.lightweight
    }, [currentCostEcharts.maxValue.lightweight])
    return (
        <>
            {isShowPressure && (
                <div className={styles["echarts-wrapper"]}>
                    <div className={styles["title"]}>
                        <span className={styles["text"]}>
                            {t("AIContextToken.pressure")}
                            <span className={styles["tip"]}>({t("AIContextToken.peak")})</span>
                        </span>
                        {!!maxIntelligentPressure && (
                            <Tooltip title={t("AIContextToken.intelligentModel")}>
                                <span
                                    className={classNames(styles["intelligent"], {
                                        [styles["intelligent-height"]]: maxIntelligentPressure > pressureThreshold
                                    })}
                                >
                                    {formatNumberUnits(maxIntelligentPressure)}
                                </span>
                            </Tooltip>
                        )}
                        {!!maxLightweightPressure && (
                            <Tooltip title={t("AIContextToken.lightweightModel")}>
                                <span
                                    className={classNames(styles["lightweight"], {
                                        [styles["lightweight-height"]]: maxLightweightPressure > pressureThreshold
                                    })}
                                >
                                    {formatNumberUnits(maxLightweightPressure)}
                                </span>
                            </Tooltip>
                        )}
                    </div>
                    <ContextPressureEcharts dataEcharts={currentPressuresEcharts} threshold={pressureThreshold} />
                </div>
            )}
            {isShowCost && (
                <div className={styles["echarts-wrapper"]}>
                    <div className={styles["title"]}>
                        <span className={styles["text"]}>
                            {t("AIContextToken.speed")}
                            <span className={styles["tip"]}>({t("AIContextToken.peak")})</span>
                        </span>
                        <Tooltip title={t("AIContextToken.intelligentModel")}>
                            {!!maxIntelligentCost && (
                                <span className={classNames(styles["intelligent"])}>{`${maxIntelligentCost}ms`}</span>
                            )}
                        </Tooltip>
                        <Tooltip title={t("AIContextToken.lightweightModel")}>
                            {!!maxLightweightCost && (
                                <span className={classNames(styles["lightweight"])}>{`${maxLightweightCost}ms`}</span>
                            )}
                        </Tooltip>
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
            </div>
            <YakitPopover
                content={
                    <AIEchartsDetails
                        overallToken={[token[0], token[1]]}
                        tierConsumption={aiDataRef?.consumption?.tier_consumption}
                        pressure={aiDataRef?.pressure}
                        firstCost={aiDataRef?.firstCost}
                        onClose={() => setVisible(false)}
                        renderNumber={renderNumber}
                    />
                }
                destroyTooltipOnHide={true}
                trigger='click'
                overlayClassName={styles["echarts-details-popover"]}
                visible={visible}
                onVisibleChange={setVisible}
            >
                <Tooltip title={t("AIContextToken.viewDetails")}>
                    <YakitButton isHover={visible} icon={<OutlinePresentationchartlineIcon />} type='outline2' />
                </Tooltip>
            </YakitPopover>
            <div className={styles["divider-style"]}></div>
        </>
    )
}
export default memo(AIContextToken)

interface CurrentModel {
    /**高质模型 */
    intelligentModels?: AIModelConfig
    /**轻量模型 */
    lightweightModels?: AIModelConfig
}
interface AIEchartsDetailsProps {
    overallToken: [number | string, number | string]
    /** ref */
    tierConsumption?: AIAgentGrpcApi.Consumption["tier_consumption"]
    /** ref */
    pressure?: AIChatData["aiPerfData"]["pressure"]
    /** ref */
    firstCost?: AIChatData["aiPerfData"]["firstCost"]
    onClose: () => void
    renderNumber: number
}
const AIEchartsDetails: React.FC<AIEchartsDetailsProps> = memo((props) => {
    const {overallToken, tierConsumption, pressure, firstCost, onClose, renderNumber} = props
    const {t} = useI18nNamespaces(["aiAgent"])
    const [currentModel, setCurrentModel] = useState<CurrentModel>()
    const ref = useRef<HTMLDivElement>(null)
    const [inViewport = true] = useInViewport(ref)
    useEffect(() => {
        inViewport && getList()
    }, [inViewport])
    const getList = useMemoizedFn(() => {
        grpcGetAIGlobalConfig().then((res) => {
            let data: CurrentModel = {}
            if (!!res?.IntelligentModels?.length) {
                data.intelligentModels = res.IntelligentModels[0]
            }
            if (!!res?.LightweightModels?.length) {
                data.lightweightModels = res.LightweightModels[0]
            }
            setCurrentModel(data)
        })
    })
    const intelligentToken = useCreation(() => {
        if (!tierConsumption?.intelligent) return [0, 0]
        const input = tierConsumption.intelligent.input_consumption || 0
        const output = tierConsumption.intelligent.output_consumption || 0
        return [formatNumberUnits(input), formatNumberUnits(output)]
    }, [renderNumber, tierConsumption?.intelligent])

    const lightweightToken = useCreation(() => {
        if (!tierConsumption?.lightweight) return [0, 0]
        const input = tierConsumption.lightweight.input_consumption || 0
        const output = tierConsumption.lightweight.output_consumption || 0
        return [formatNumberUnits(input), formatNumberUnits(output)]
    }, [renderNumber, tierConsumption?.lightweight])

    // 上下文压力集合
    const pressuresEcharts: AIPressureDetailsEchartsProps["dataEcharts"] = useCreation(() => {
        return getPressuresData(pressure)
    }, [renderNumber, pressure?.intelligent, pressure?.lightweight])
    // 首字符延迟集合
    const costEcharts: AICostDetailsEchartsProps["dataEcharts"] = useCreation(() => {
        return getCostData(firstCost)
    }, [renderNumber, firstCost?.intelligent, firstCost?.lightweight])
    // 上下文压力预设值
    const threshold = useCreation(() => {
        return getThreshold(pressure)
    }, [renderNumber, pressure?.intelligent, pressure?.lightweight])
    const getEchartsHeard = useMemoizedFn((title: string) => {
        return (
            <div className={styles["echarts-heard"]}>
                    <div className={styles["echarts-heard-left"]}>
                    <div className={styles["title"]}>{title}</div>
                    {title === t("AIContextToken.pressure") && (
                        <div className={styles["threshold"]}>{t("AIContextToken.limit")}:{formatNumberUnits(threshold)}</div>
                    )}
                </div>
                <div className={styles["extra"]}>
                    <div className={styles["intelligent"]}>
                        <AIDetailsDashIcon className={styles["intelligent-icon"]} />
                        <span>{t("AIContextToken.intelligentModel")}</span>
                    </div>
                    <div className={styles["lightweight"]}>
                        <AIDetailsDashIcon className={styles["lightweight-icon"]} />
                        <span>{t("AIContextToken.lightweightModel")}</span>
                    </div>
                </div>
            </div>
        )
    })
    const isShowPressure = useCreation(() => {
        return !!(
            pressuresEcharts?.data?.intelligent?.length > 0 ||
            pressuresEcharts?.data?.lightweight?.length > 0 ||
            pressuresEcharts?.data?.vision?.length > 0
        )
    }, [pressuresEcharts.data])
    const isShowCost = useCreation(() => {
        return !!(
            costEcharts?.data?.intelligent?.length > 0 ||
            costEcharts?.data?.lightweight?.length > 0 ||
            costEcharts?.data?.vision?.length > 0
        )
    }, [costEcharts.data])
    return (
        <div className={styles["echarts-details-wrapper"]} ref={ref}>
            <div className={styles["echarts-details-heard"]}>
                <div className={styles["echarts-details-title"]}>
                    <OutlinePresentationchartlineIcon />
                    <span>{t("AIContextToken.dataDetails")}</span>
                </div>
                <YakitButton icon={<OutlineXIcon />} type='text2' onClick={onClose} />
            </div>
            <div className={styles["echarts-details-content"]}>
                <div className={styles["token-wrapper"]}>
                    <div className={styles["token-heard"]}>
                        <span>Tokens:</span>
                        <div className={styles["token-overall-wrapper"]}>
                            <div className={styles["token-overall"]}>
                                <span>{t("AIContextToken.totalInput")}</span>
                                <div className={classNames(styles["token-tag"], styles["upload-token"])}>
                                    <OutlineArrowupIcon />
                                    {overallToken[0]}
                                </div>
                            </div>
                            <div className={styles["token-overall"]}>
                                <span>{t("AIContextToken.totalOutput")}</span>
                                <div className={classNames(styles["token-tag"], styles["download-token"])}>
                                    <OutlineArrowdownIcon />
                                    {overallToken[1]}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className={styles["token-content"]}>
                        <AITokens
                            modelType={t("AIContextToken.intelligentModel")}
                            aiModel={currentModel?.intelligentModels}
                            token={[intelligentToken[0], intelligentToken[1]]}
                        />
                        <AITokens
                            modelType={t("AIContextToken.lightweightModel")}
                            aiModel={currentModel?.lightweightModels}
                            token={[lightweightToken[0], lightweightToken[1]]}
                        />
                    </div>
                </div>
                {isShowPressure && (
                    <div className={styles["pressure-wrapper"]}>
                        {getEchartsHeard(t("AIContextToken.pressure"))}
                        <AIPressureDetailsEcharts dataEcharts={pressuresEcharts} threshold={threshold} />
                    </div>
                )}
                {isShowCost && (
                    <div className={styles["cost-wrapper"]}>
                        {getEchartsHeard(t("AIContextToken.speed"))}
                        <AICostDetailsEcharts dataEcharts={costEcharts} />
                    </div>
                )}
            </div>
        </div>
    )
})

interface AITokensProps {
    modelType: string
    aiModel?: AIModelConfig
    token: [number | string, number | string]
}
const AITokens: React.FC<AITokensProps> = memo((props) => {
    const {modelType, aiModel, token} = props
    const {t} = useI18nNamespaces(["aiAgent"])
    const icon = useCreation(() => {
        if (!aiModel?.Provider?.Type) return <></>
        return getIconByAI(aiModel?.Provider?.Type)
    }, [aiModel?.Provider?.Type])
    const modelName = useCreation(() => {
        return aiModel?.ModelName || ""
    }, [aiModel?.ModelName])
    return (
        <div className={styles["ai-tokens"]}>
            <div className={styles["ai-tokens-heard"]}>
                <span className={styles["title"]}>{modelType}</span>
                <div className={styles["model"]}>
                    {icon}
                    <div className={styles["model-text"]} title={modelName}>
                        {modelName}
                    </div>
                </div>
            </div>
            <div className={styles["ai-tokens-content"]}>
                <div className={styles["ai-tokens-item"]}>
                    <div className={styles["token-item"]}>
                        {t("AIContextToken.input")}
                        <OutlineArrowupIcon />
                    </div>
                    <div className={classNames(styles["token-tag"], styles["upload-token"])}>{token[0]}</div>
                </div>
                <div className={styles["diver"]} />
                <div className={styles["ai-tokens-item"]}>
                    <div className={styles["token-item"]}>
                        {t("AIContextToken.output")}
                        <OutlineArrowdownIcon />
                    </div>
                    <div className={classNames(styles["token-tag"], styles["download-token"])}>{token[1]}</div>
                </div>
            </div>
        </div>
    )
})
