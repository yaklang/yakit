import React, {ReactNode, useEffect, useMemo, useState} from "react"
import {AIChatContentProps} from "./type"
import styles from "./AIChatContent.module.scss"
import {ExpandAndRetract} from "@/pages/plugins/operator/expandAndRetract/ExpandAndRetract"
import {useCreation, useInterval, useMemoizedFn} from "ahooks"
import {HorizontalScrollCard} from "@/pages/plugins/operator/horizontalScrollCard/HorizontalScrollCard"
import classNames from "classnames"
import {YakitSideTab} from "@/components/yakitSideTab/YakitSideTab"
import {AITabs, AITabsEnum} from "../defaultConstant"
import {AITabsEnumType} from "../aiAgentType"
import {YakitSideTabProps, YakitTabsProps} from "@/components/yakitSideTab/YakitSideTabType"
import {AIReActChat} from "@/pages/ai-re-act/aiReActChat/AIReActChat"
import {AIFileSystemList} from "../components/aiFileSystemList/AIFileSystemList"
import useAIChatUIData from "@/pages/ai-re-act/hooks/useAIChatUIData"
import {
    PluginExecuteHttpFlow,
    VulnerabilitiesRisksTable
} from "@/pages/plugins/operator/pluginExecuteResult/PluginExecuteResult"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import {apiQueryRisksTotalByRuntimeIds} from "@/pages/risks/YakitRiskTable/utils"
import AIReActTaskChat from "@/pages/ai-re-act/aiReActTaskChat/AIReActTaskChat"
import emiter from "@/utils/eventBus/eventBus"
import {ContextPressureEcharts, ContextPressureEchartsProps, ResponseSpeedEcharts} from "../chatTemplate/AIEcharts"
import {formatTime} from "@/utils/timeUtil"
import {formatNumberUnits} from "../utils"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {OutlineArrowdownIcon, OutlineArrowupIcon, OutlineNewspaperIcon} from "@/assets/icon/outline"
import {SolidChatalt2Icon} from "@/assets/icon/solid"
import useAiChatLog from "@/hook/useAiChatLog/useAiChatLog.ts"
import {YakitResizeBox, YakitResizeBoxProps} from "@/components/yakitUI/YakitResizeBox/YakitResizeBox"
import {grpcQueryHTTPFlows} from "../grpc"
import useChatIPCStore from "../useContext/ChatIPCContent/useStore"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"

interface AIAgentTabPayload {
    key: AITabsEnumType
    value?: string
}

export const AIChatContent: React.FC<AIChatContentProps> = React.memo((props) => {
    const {runTimeIDs: initRunTimeIDs, yakExecResult, aiPerfData, taskChat} = useAIChatUIData()
    const {chatIPCData} = useChatIPCStore()
    const [isExpand, setIsExpand] = useState<boolean>(true)
    const [activeKey, setActiveKey] = useState<AITabsEnumType>()

    const [tempRiskTotal, setTempRiskTotal] = useState<number>(0) // 在risk表没有展示之前得临时显示在tab上得小红点计数,现在不显示具体数量了
    const [tempHTTPTotal, setTempHTTPTotal] = useState<number>(0) // HTTP流量表tab是否显示，大于0就显示
    const [intervalRisk, setIntervalRisk] = useState<number | undefined>(undefined)
    const [intervalHTTP, setIntervalHTTP] = useState<number | undefined>(undefined)

    const [showFreeChat, setShowFreeChat] = useState<boolean>(true) //自由对话展开收起

    const [runTimeIDs, setRunTimeIDs] = useState<string[]>(initRunTimeIDs)

    const onSwitchAIAgentTab = useMemoizedFn((data) => {
        if (data === undefined) return setActiveKey(data)
        try {
            const {key, value} = JSON.parse(data) as AIAgentTabPayload
            if (key === AITabsEnum.HTTP && !tempHTTPTotal) return
            if (key === AITabsEnum.Risk && !tempRiskTotal) return
            setActiveKey(key)
            if (value) {
                setRunTimeIDs([value])
            } else {
                setRunTimeIDs(initRunTimeIDs)
            }
        } catch (error) {
            setActiveKey(undefined)
        }
    })

    useEffect(() => {
        emiter.on("switchAIActTab", onSwitchAIAgentTab)
        return () => {
            emiter.off("switchAIActTab", onSwitchAIAgentTab)
        }
    }, [onSwitchAIAgentTab])

    const filterTagDom = useMemo(() => {
        if (initRunTimeIDs === runTimeIDs) return null
        return (
            <YakitTag color='info' closable onClose={() => setRunTimeIDs(initRunTimeIDs)}>
                {runTimeIDs}
            </YakitTag>
        )
    }, [initRunTimeIDs, runTimeIDs])

    useEffect(() => {
        if (initRunTimeIDs.length > 0) {
            if (!tempRiskTotal) setIntervalRisk(1000)
            if (!tempHTTPTotal) setIntervalHTTP(1000)
        } else {
            setTempRiskTotal(0)
            setTempHTTPTotal(0)
        }
    }, [initRunTimeIDs])
    useInterval(() => {
        getRiskTotal()
    }, intervalRisk)
    useInterval(() => {
        getHTTPTotal()
    }, intervalHTTP)
    const getRiskTotal = useMemoizedFn(() => {
        if (!initRunTimeIDs.length) return
        apiQueryRisksTotalByRuntimeIds(initRunTimeIDs).then((allRes) => {
            if (+allRes.Total > 0) {
                setTempRiskTotal(+allRes.Total)
                if (intervalRisk) setIntervalRisk(undefined)
            }
            if (!chatIPCData.execute) {
                if (intervalRisk) setIntervalRisk(undefined)
            }
        })
    })
    const getHTTPTotal = useMemoizedFn(() => {
        if (!initRunTimeIDs.length) return
        grpcQueryHTTPFlows({RuntimeIDs: initRunTimeIDs}).then((allRes) => {
            if (+allRes.Total > 0) {
                setTempHTTPTotal(+allRes.Total)
                if (intervalHTTP) setIntervalHTTP(undefined)
            }
            if (!chatIPCData.execute) {
                if (intervalHTTP) setIntervalHTTP(undefined)
            }
        })
    })

    const onExpand = useMemoizedFn((e) => {
        e.stopPropagation()
        setIsExpand(!isExpand)
    })
    const yakitTabs = useCreation(() => {
        let tab: YakitSideTabProps["yakitTabs"] = [AITabs[AITabsEnum.File_System]]

        if (!!taskChat?.streams?.length) {
            tab.push(AITabs[AITabsEnum.Task_Content])
        }
        if (!!tempHTTPTotal) {
            tab.push(AITabs[AITabsEnum.HTTP])
        }
        if (!!tempRiskTotal) {
            tab.push(AITabs[AITabsEnum.Risk])
        }
        return tab
    }, [tempRiskTotal, tempHTTPTotal, taskChat?.streams?.length])

    const tabBarRender = useMemoizedFn((tab: YakitTabsProps, node: ReactNode[]) => {
        const [label] = node
        if (tab.value === AITabsEnum.Risk) {
            return <>{label || tab.label}</>
        }

        return label || tab.label
    })

    const renderTabContent = useMemoizedFn((key: AITabsEnumType) => {
        switch (key) {
            case AITabsEnum.Task_Content:
                return <AIReActTaskChat setShowFreeChat={setShowFreeChat} />
            case AITabsEnum.File_System:
                return <AIFileSystemList execFileRecord={yakExecResult.execFileRecord} />
            case AITabsEnum.Risk:
                return !!runTimeIDs.length ? (
                    <VulnerabilitiesRisksTable filterTagDom={filterTagDom} runTimeIDs={runTimeIDs} />
                ) : (
                    <>
                        <YakitEmpty style={{paddingTop: 48}} />
                    </>
                )
            case AITabsEnum.HTTP:
                return !!runTimeIDs.length ? (
                    <PluginExecuteHttpFlow
                        filterTagDom={filterTagDom}
                        runtimeId={runTimeIDs.join(",")}
                        website={true}
                    />
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
        const {consumption} = aiPerfData
        const keys = Object.keys(consumption || {})
        for (let name of keys) {
            input += consumption[name]?.input_consumption || 0
            output += consumption[name]?.output_consumption || 0
        }
        return [formatNumberUnits(input || 0), formatNumberUnits(output || 0)]
    }, [aiPerfData.consumption])

    const {onOpenLogWindow} = useAiChatLog()

    const onActiveKey = useMemoizedFn((key: AITabsEnumType) => {
        if (activeKey === key) {
            setShowFreeChat(true)
            setActiveKey(undefined)
        } else {
            setActiveKey(key)
        }
        setRunTimeIDs(initRunTimeIDs)
    })
    const onOpenLog = useMemoizedFn((e) => {
        e.stopPropagation()
        onOpenLogWindow()
    })

    const resizeBoxProps: Omit<YakitResizeBoxProps, "firstNode" | "secondNode"> = useCreation(() => {
        if (!activeKey) {
            return {
                firstNodeStyle: {display: "none"},
                secondRatio: "100%",
                lineStyle: {display: "none"},
                secondNodeStyle: {width: "100%", padding: 0}
            }
        }
        return {
            freeze: showFreeChat,
            firstMinSize: 500,
            secondMinSize: showFreeChat ? 400 : 30,
            secondRatio: showFreeChat ? "432px" : undefined,
            secondNodeStyle: {
                padding: 0,
                ...(!showFreeChat && {
                    minWidth: 30,
                    maxWidth: 30
                })
            },
            firstNodeStyle: {
                padding: 0,
                ...(!showFreeChat && {
                    width: "100%"
                })
            },
            lineDirection: "left",
            lineStyle: showFreeChat ? {backgroundColor: "var(--Colors-Use-Neutral-Bg)"} : undefined
        }
    }, [activeKey, showFreeChat])

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
                expandText='展开'
                retractText='收起'
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
                            {currentCostEcharts?.data?.length > 0 && (
                                <div className={styles["echarts-wrapper"]}>
                                    <div className={styles["title"]}>
                                        响应速度
                                        <span className={styles["cost"]}>{`${
                                            lastFirstCost < 0 ? "-" : lastFirstCost
                                        }ms`}</span>
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

                            <YakitButton type='secondary2' icon={<OutlineNewspaperIcon />} onClick={onOpenLog}>
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
                    <YakitResizeBox
                        firstNode={
                            activeKey && (
                                <div
                                    className={classNames(styles["tab-content"], {
                                        [styles["tab-content-right"]]: !showFreeChat
                                    })}
                                >
                                    {renderTabContent(activeKey)}
                                </div>
                            )
                        }
                        secondNode={
                            <AIReActChat
                                chatContainerHeaderClassName={classNames({
                                    [styles["re-act-chat-container-header"]]: !activeKey
                                })}
                                mode={!!activeKey ? "task" : "welcome"}
                                showFreeChat={showFreeChat}
                                setShowFreeChat={setShowFreeChat}
                            />
                        }
                        {...resizeBoxProps}
                    />
                </div>
                <YakitSideTab
                    type='vertical-right'
                    yakitTabs={yakitTabs}
                    activeKey={activeKey}
                    onActiveKey={(key) => onActiveKey(key as AITabsEnumType)}
                    onTabPaneRender={(ele, node) => tabBarRender(ele, node)}
                    className={styles["tab-wrap"]}
                    show={true}
                />
            </div>
        </div>
    )
})
