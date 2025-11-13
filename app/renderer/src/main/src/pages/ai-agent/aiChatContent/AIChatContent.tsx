import React, {ReactNode, useEffect, useState} from "react"
import {AIChatContentProps} from "./type"
import styles from "./AIChatContent.module.scss"
import {ExpandAndRetract} from "@/pages/plugins/operator/expandAndRetract/ExpandAndRetract"
import {useCreation, useInterval, useMemoizedFn} from "ahooks"
import {HorizontalScrollCard} from "@/pages/plugins/operator/horizontalScrollCard/HorizontalScrollCard"
import classNames from "classnames"
import {YakitSideTab} from "@/components/yakitSideTab/YakitSideTab"
import {AITabs, AITabsEnum} from "../defaultConstant"
import {AITabsEnumType} from "../aiAgentType"
import {YakitTabsProps} from "@/components/yakitSideTab/YakitSideTabType"
import PluginTabs from "@/components/businessUI/PluginTabs/PluginTabs"
import {AIReActChat} from "@/pages/ai-re-act/aiReActChat/AIReActChat"
import {AIFileSystemList} from "../components/aiFileSystemList/AIFileSystemList"
import useAIChatUIData from "@/pages/ai-re-act/hooks/useAIChatUIData"
import {
    PluginExecuteHttpFlow,
    VulnerabilitiesRisksTable
} from "@/pages/plugins/operator/pluginExecuteResult/PluginExecuteResult"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import {apiQueryRisksTotalByRuntimeId} from "@/pages/risks/YakitRiskTable/utils"
import AIReActTaskChat from "@/pages/ai-re-act/aiReActTaskChat/AIReActTaskChat"
import emiter from "@/utils/eventBus/eventBus"
import {ContextPressureEcharts, ContextPressureEchartsProps, ResponseSpeedEcharts} from "../chatTemplate/AIEcharts"
import {formatTime} from "@/utils/timeUtil"
import {formatNumberUnits} from "../utils"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {OutlineArrowdownIcon, OutlineArrowupIcon, OutlineNewspaperIcon} from "@/assets/icon/outline"
import {SolidChatalt2Icon} from "@/assets/icon/solid"
import useAiChatLog from "@/hook/useAiChatLog/useAiChatLog.ts"
const {TabPane} = PluginTabs

const getCardData = () => {
    const data = Array.from({length: 20}).map((_, index) => ({
        tag: `标签${index + 1}`,
        info: [
            {
                Id: `${index + 1}`,
                Data: `数据内容${index + 1}`,
                Timestamp: Date.now() + index * 1000,
                Tag: `标签${index + 1}`
            }
        ]
    }))
    return data
}
export const AIChatContent: React.FC<AIChatContentProps> = React.memo((props) => {
    const {runTimeIDs, yakExecResult, aiPerfData} = useAIChatUIData()

    const [isExpand, setIsExpand] = useState<boolean>(true)
    const [activeKey, setActiveKey] = useState<AITabsEnumType>()

    const [allTotal, setAllTotal] = useState<number>(0)
    const [tempTotal, setTempTotal] = useState<number>(0) // 在risk表没有展示之前得临时显示在tab上得小红点计数
    const [interval, setInterval] = useState<number | undefined>(undefined)

    useEffect(() => {
        emiter.on("switchAIActTab", setActiveKey)
        return () => {
            emiter.off("switchAIActTab", setActiveKey)
        }
    }, [])

    useEffect(() => {
        if (runTimeIDs.length > 0) {
            setInterval(1000)
        } else {
            setAllTotal(0)
            setTempTotal(0)
        }
    }, [runTimeIDs])
    useInterval(() => {
        getTotal()
    }, interval)
    const getTotal = useMemoizedFn(() => {
        if (!runTimeIDs.length) return
        // todo 需要改成数组传参
        apiQueryRisksTotalByRuntimeId(runTimeIDs.join(",")).then((allRes) => {
            if (+allRes.Total > 0) {
                setTempTotal(+allRes.Total)
            }
        })
    })
    const onSetRiskTotal = useMemoizedFn((total) => {
        if (total > 0) {
            setAllTotal(total)
            if (interval) setInterval(undefined)
        }
    })

    const onExpand = useMemoizedFn((e) => {
        e.stopPropagation()
        setIsExpand(!isExpand)
    })
    const yakitTabs = useCreation(() => {
        let tab = [...AITabs]
        if (!tempTotal) {
            tab = AITabs.filter((ele) => ele.value !== AITabsEnum.Risk)
        }
        return tab
    }, [tempTotal])
    const showRiskTotal = useCreation(() => {
        if (allTotal > 0) return allTotal
        return tempTotal
    }, [])
    const tabBarRender = useMemoizedFn((tab: YakitTabsProps, node: ReactNode[], length: number) => {
        const [label] = node
        if (tab.value === AITabsEnum.Risk) {
            return <>{label || tab.label}</>
        }

        return label || tab.label
    })

    const renderTabContent = useMemoizedFn((key: AITabsEnumType) => {
        switch (key) {
            case AITabsEnum.Task_Content:
                return <AIReActTaskChat />
            case AITabsEnum.File_System:
                return <AIFileSystemList execFileRecord={yakExecResult.execFileRecord} />
            case AITabsEnum.Risk:
                return !!runTimeIDs.length ? (
                    <VulnerabilitiesRisksTable
                        // todo 需要改成数组传参
                        runtimeId={runTimeIDs.join(",")}
                        allTotal={allTotal}
                        setAllTotal={onSetRiskTotal}
                    />
                ) : (
                    <>
                        <YakitEmpty style={{paddingTop: 48}} />
                    </>
                )
            case AITabsEnum.HTTP:
                return !!runTimeIDs.length ? (
                    // todo 需要改成数组传参
                    <PluginExecuteHttpFlow runtimeId={runTimeIDs.join(",")} website={false} />
                ) : (
                    <>
                        <YakitEmpty style={{paddingTop: 48}} />
                    </>
                )
            default:
                return <></>
        }
    })
    // 上下文压力集合
    const currentPressuresEcharts: ContextPressureEchartsProps["dataEcharts"] = useCreation(() => {
        const data: number[] = []
        const xAxis: string[] = []
        aiPerfData.pressure.forEach((item) => {
            data.push(item.current_cost_token_size)
            xAxis.push(item.timestamp ? formatTime(item.timestamp) : "-")
        })
        return {data, xAxis}
    }, [aiPerfData.pressure])
    // 最新的上下文压力
    const lastPressure = useCreation(() => {
        const length = currentPressuresEcharts.data.length
        if (length === 0) return 0
        return currentPressuresEcharts.data[length - 1] || 0
    }, [currentPressuresEcharts.data])
    // 上下文压力预设值
    const pressureThreshold = useCreation(() => {
        const length = aiPerfData.pressure.length
        if (length === 0) return 0
        return aiPerfData.pressure[length - 1].pressure_token_size || 0
    }, [aiPerfData.pressure])
    // 首字符延迟集合
    const currentCostEcharts = useCreation(() => {
        const data: number[] = []
        const xAxis: string[] = []
        aiPerfData.firstCost.forEach((item) => {
            data.push(item.ms)
            xAxis.push(item.timestamp ? formatTime(item.timestamp) : "-")
        })
        return {data, xAxis}
    }, [aiPerfData.firstCost])
    // AI的Token消耗
    const token = useCreation(() => {
        let input = 0
        let output = 0
        const {consumption} = aiPerfData
        const keys = Object.keys(consumption || {})
        for (let name of keys) {
            input += consumption[name]?.input_consumption || 0
            output += consumption[name]?.output_consumption || 0
        }
        return [formatNumberUnits(input || 0), formatNumberUnits(output || 0)]
    }, [aiPerfData.consumption])

    const {onOpenLogWindow} = useAiChatLog()

    return (
        <div className={styles["ai-chat-content-wrapper"]}>
            <ExpandAndRetract
                isExpand={isExpand}
                onExpand={onExpand}
                className={classNames(styles["expand-retract-wrapper"], {
                    [styles["expand-retract-wrapper-collapsed"]]: !yakExecResult.card.length
                })}
                animationWrapperClassName={classNames(styles["expand-retract-animation-wrapper"], {
                    [styles["expand-retract-animation-wrapper-hidden"]]: !yakExecResult.card.length
                })}
            >
                <div className={styles["expand-retract-content"]}>
                    <div className={styles["header"]}>
                        <div className={styles["title"]}>
                            <SolidChatalt2Icon />
                            新会话
                        </div>
                        <div className={styles["extra"]}>
                            {currentPressuresEcharts?.data?.length > 0 && (
                                <div className={styles["echarts-wrapper"]}>
                                    <div className={styles["title"]}>
                                        上下文压力：
                                        <span className={styles["pressure"]}> {formatNumberUnits(lastPressure)}</span>
                                    </div>
                                    <ContextPressureEcharts
                                        dataEcharts={currentPressuresEcharts}
                                        threshold={pressureThreshold}
                                    />
                                </div>
                            )}
                            {currentPressuresEcharts?.data?.length > 0 && (
                                <div className={styles["echarts-wrapper"]}>
                                    <div className={styles["title"]}>
                                        响应速度
                                        <span className={styles["cost"]}> {formatNumberUnits(lastPressure)}</span>
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

                            <YakitButton type='secondary2' icon={<OutlineNewspaperIcon />} onClick={onOpenLogWindow}>
                                日志
                            </YakitButton>
                        </div>
                    </div>
                    {yakExecResult.card.length > 0 ? (
                        <HorizontalScrollCard
                            hiddenHeard={true}
                            data={yakExecResult.card}
                            className={classNames(styles["card-list-wrapper"], {
                                [styles["card-list-wrapper-hidden"]]: !isExpand
                            })}
                            itemProps={{size: "small"}}
                        />
                    ) : null}
                </div>
            </ExpandAndRetract>
            <div className={styles["ai-chat-tab-wrapper"]}>
                <div className={styles["ai-chat-content"]}>
                    {activeKey && <div className={styles["tab-content"]}>{renderTabContent(activeKey)}</div>}
                    <AIReActChat mode={!!activeKey ? "task" : "welcome"} />
                </div>
                <YakitSideTab
                    type='vertical-right'
                    yakitTabs={yakitTabs}
                    activeKey={activeKey}
                    onActiveKey={(v) => setActiveKey(v as AITabsEnumType)}
                    onTabPaneRender={(ele, node) => tabBarRender(ele, node, showRiskTotal)}
                    className={styles["tab-wrap"]}
                    show={true}
                />
            </div>
        </div>
    )
})
