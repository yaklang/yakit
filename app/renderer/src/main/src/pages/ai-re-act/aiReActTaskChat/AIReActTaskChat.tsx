import React, {useEffect, useState} from "react"
import {AIReActTaskChatContentProps, AIReActTaskChatLeftSideProps, AIReActTaskChatProps} from "./AIReActTaskChatType"
import styles from "./AIReActTaskChat.module.scss"
import {ColorsBrainCircuitIcon} from "@/assets/icon/colors"
import {AIAgentChatStream, AIChatLeftSide} from "@/pages/ai-agent/chatTemplate/AIAgentChatTemplate"
import useAIAgentStore from "@/pages/ai-agent/useContext/useStore"
import {useCreation, useInterval, useMemoizedFn} from "ahooks"
import {
    PluginExecuteHttpFlow,
    VulnerabilitiesRisksTable
} from "@/pages/plugins/operator/pluginExecuteResult/PluginExecuteResult"
import {AITabsEnumType} from "@/pages/ai-agent/aiAgentType"
import {AITabs, AITabsEnum, defaultChatIPCData} from "@/pages/ai-agent/defaultConstant"
import {apiQueryRisksTotalByRuntimeId} from "@/pages/risks/YakitRiskTable/utils"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import {YakitTabsProps} from "@/components/yakitSideTab/YakitSideTabType"
import {YakitSideTab} from "@/components/yakitSideTab/YakitSideTab"
import classNames from "classnames"
import useChatIPCStore from "@/pages/ai-agent/useContext/ChatIPCContent/useStore"
import {ChevrondownButton, RoundedStopButton} from "../aiReActChat/AIReActComponent"
import {UseTaskChatState} from "../hooks/type"
import {AIReActTaskChatReview} from "@/pages/ai-agent/aiAgentChat/AIAgentChat"

const AIReActTaskChat: React.FC<AIReActTaskChatProps> = React.memo((props) => {
    const {execute, onStop} = props

    return (
        <div className={styles["ai-re-act-task-chat"]}>
            <AIReActTaskChatLeftSide />
            <div className={styles["chat-content-wrapper"]}>
                <div className={styles["header"]}>
                    <div className={styles["title"]}>
                        <ColorsBrainCircuitIcon />
                        深度规划
                    </div>
                    <div className={styles["extra"]}>{execute && <RoundedStopButton onClick={onStop} />}</div>
                </div>
                <AIReActTaskChatContent />
            </div>
        </div>
    )
})

export default AIReActTaskChat

const AIReActTaskChatContent: React.FC<AIReActTaskChatContentProps> = React.memo((props) => {
    const {chatIPCData, reviewInfo, planReviewTreeKeywordsMap} = useChatIPCStore()

    const taskChat: UseTaskChatState = useCreation(() => {
        return chatIPCData.taskChat || defaultChatIPCData.taskChat
    }, [chatIPCData.taskChat])

    const {coordinatorId, plan, streams} = taskChat

    //#region AI tab 相关逻辑
    const [activeKey, setActiveKey] = useState<AITabsEnumType>(AITabsEnum.Task_Content)
    const [allTotal, setAllTotal] = useState<number>(0)
    const [tempTotal, setTempTotal] = useState<number>(0) // 在risk表没有展示之前得临时显示在tab上得小红点计数
    const [interval, setInterval] = useState<number | undefined>(undefined)
    useEffect(() => {
        if (coordinatorId) {
            setInterval(1000)
        } else {
            setAllTotal(0)
            setTempTotal(0)
            setActiveKey(AITabsEnum.Task_Content)
        }
    }, [coordinatorId])
    useInterval(() => {
        getTotal()
    }, interval)
    const getTotal = useMemoizedFn(() => {
        if (!coordinatorId) return
        apiQueryRisksTotalByRuntimeId(coordinatorId).then((allRes) => {
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

    const renderTabContent = useMemoizedFn((key: AITabsEnumType) => {
        switch (key) {
            case AITabsEnum.Task_Content:
                console.log("renderTabContent-taskChat", taskChat)
                return (
                    <>
                        <AIAgentChatStream tasks={plan} streams={streams} />
                    </>
                )
            case AITabsEnum.Risk:
                return !!coordinatorId ? (
                    <VulnerabilitiesRisksTable
                        runtimeId={coordinatorId}
                        allTotal={allTotal}
                        setAllTotal={onSetRiskTotal}
                    />
                ) : (
                    <>
                        <YakitEmpty />
                    </>
                )
            case AITabsEnum.HTTP:
                return !!coordinatorId ? (
                    <PluginExecuteHttpFlow runtimeId={coordinatorId} website={false} />
                ) : (
                    <>
                        <YakitEmpty />
                    </>
                )
            default:
                return <></>
        }
    })
    const showRiskTotal = useCreation(() => {
        if (allTotal > 0) return allTotal
        return tempTotal
    }, [allTotal, tempTotal])
    const tabBarRender = useMemoizedFn((tab: YakitTabsProps, length: number) => {
        if (tab.value === AITabsEnum.Risk) {
            return (
                <>
                    {tab.label}
                    {showRiskTotal ? <span className={styles["ai-tabBar"]}>{length}</span> : ""}
                </>
            )
        }

        return tab.label
    })
    const yakitTabs = useCreation(() => {
        let tab = [...AITabs]
        if (!tempTotal) {
            tab = AITabs.filter((ele) => ele.value !== AITabsEnum.Risk)
        }
        return tab
    }, [tempTotal])
    //#endregion
    return (
        <>
            <YakitSideTab
                type='horizontal'
                yakitTabs={yakitTabs}
                activeKey={activeKey}
                onActiveKey={(v) => setActiveKey(v as AITabsEnumType)}
                onTabPaneRender={(ele) => tabBarRender(ele, showRiskTotal)}
                className={styles["tab-wrap"]}
            >
                <div className={styles["tab-content"]}>{renderTabContent(activeKey)}</div>
            </YakitSideTab>
            {!!reviewInfo && (
                <AIReActTaskChatReview
                    reviewInfo={reviewInfo}
                    // reviewExpand={reviewExpand}
                    // setReviewExpand={setReviewExpand}
                    planReviewTreeKeywordsMap={planReviewTreeKeywordsMap}
                    // chatBodyHeight={chatBodySize?.height || 0}
                />
            )}
        </>
    )
})

const AIReActTaskChatLeftSide: React.FC<AIReActTaskChatLeftSideProps> = React.memo((props) => {
    const {} = props

    const {chatIPCData} = useChatIPCStore()
    const {aiPerfData, yakExecResult, taskChat} = chatIPCData

    const {activeChat} = useAIAgentStore()

    const [leftExpand, setLeftExpand] = useState(true)

    // #region chat-UI实际展示数据
    const activeAIPerfData = useCreation(() => {
        return activeChat?.answer?.aiPerfData
    }, [activeChat?.id])
    const activeAITaskChat = useCreation(() => {
        return activeChat?.answer?.taskChat
    }, [activeChat?.id])
    // ui实际渲染数据-pressure
    const uiPressure = useCreation(() => {
        if (!!activeAIPerfData) return activeAIPerfData.pressure
        return aiPerfData.pressure
    }, [activeAIPerfData?.pressure, aiPerfData.pressure])
    // ui实际渲染数据-firstCost
    const uiFirstCost = useCreation(() => {
        if (!!activeAIPerfData) return activeAIPerfData.firstCost
        return aiPerfData.firstCost
    }, [activeAIPerfData?.firstCost, aiPerfData.firstCost])
    // ui实际渲染数据-consumption
    const uiConsumption = useCreation(() => {
        if (!!activeAIPerfData) return activeAIPerfData.consumption
        return aiPerfData.consumption
    }, [activeAIPerfData?.consumption, aiPerfData.consumption])
    const uiPlan = useCreation(() => {
        if (!!activeAITaskChat) return activeAITaskChat.plan
        return taskChat.plan
    }, [activeAITaskChat?.plan, taskChat.plan])
    // useEffect(() => {
    //     console.log("aiPerfData", aiPerfData)
    // }, [aiPerfData])
    // #endregion
    return (
        <div
            className={classNames(styles["content-left-side"], {
                [styles["content-left-side-hidden"]]: !leftExpand
            })}
        >
            <AIChatLeftSide
                expand={leftExpand}
                setExpand={setLeftExpand}
                tasks={uiPlan}
                pressure={uiPressure}
                cost={uiFirstCost}
                card={yakExecResult.card}
            />
            <div className={styles["open-wrapper"]} onClick={() => setLeftExpand(true)}>
                <ChevrondownButton />
                <div className={styles["text"]}>任务列表</div>
            </div>
        </div>
    )
})
