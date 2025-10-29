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
import {AITabs, AITabsEnum} from "@/pages/ai-agent/defaultConstant"
import {apiQueryRisksTotalByRuntimeId} from "@/pages/risks/YakitRiskTable/utils"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import {YakitTabsProps} from "@/components/yakitSideTab/YakitSideTabType"
import {YakitSideTab} from "@/components/yakitSideTab/YakitSideTab"
import classNames from "classnames"
import useChatIPCStore from "@/pages/ai-agent/useContext/ChatIPCContent/useStore"
import {ChevrondownButton, RoundedStopButton} from "../aiReActChat/AIReActComponent"
import {AIReActTaskChatReview} from "@/pages/ai-agent/aiAgentChat/AIAgentChat"
import {OutlineArrowdownIcon, OutlineArrowupIcon} from "@/assets/icon/outline"
import {formatNumberUnits} from "@/pages/ai-agent/utils"
import {AIFileSystemList} from "@/pages/ai-agent/components/aiFileSystemList/AIFileSystemList"
import useAIChatUIData from "../hooks/useAIChatUIData"
import emiter from "@/utils/eventBus/eventBus"

const AIReActTaskChat: React.FC<AIReActTaskChatProps> = React.memo((props) => {
    const {execute, onStop} = props
    const {aiPerfData} = useAIChatUIData()
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
    return (
        <div className={styles["ai-re-act-task-chat"]}>
            <AIReActTaskChatLeftSide />
            <div className={styles["chat-content-wrapper"]}>
                <div className={styles["header"]}>
                    <div className={styles["title"]}>
                        <ColorsBrainCircuitIcon />
                        深度规划
                    </div>
                    <div className={styles["extra"]}>
                        <div className={styles["info-token"]}>
                            Tokens:
                            <div className={classNames(styles["token-tag"], styles["upload-token"])}>
                                <OutlineArrowupIcon />
                                {token[0]}
                            </div>
                            <div className={classNames(styles["token-tag"], styles["download-token"])}>
                                <OutlineArrowdownIcon />
                                {token[1]}
                            </div>
                        </div>
                        <div className={styles["divider-style"]}></div>
                        {execute && <RoundedStopButton onClick={onStop} />}
                    </div>
                </div>
                <AIReActTaskChatContent />
            </div>
        </div>
    )
})

export default AIReActTaskChat
const AIReActTaskChatContent: React.FC<AIReActTaskChatContentProps> = React.memo((props) => {
    const {reviewInfo, planReviewTreeKeywordsMap} = useChatIPCStore()
    const {taskChat, yakExecResult} = useAIChatUIData()

    const {coordinatorId, streams} = taskChat

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
            console.log('allRes.Total in task chat', allRes.Total);
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
                return (
                    <>
                        <AIAgentChatStream streams={streams} />
                    </>
                )
            case AITabsEnum.File_System:
                return <AIFileSystemList execFileRecord={yakExecResult.execFileRecord} />
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


    useEffect(() => {
        emiter.on("switchAIActTab", setActiveKey)
        return () => {
            emiter.off("switchAIActTab", setActiveKey)
        }
    }, [])

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
                <AIReActTaskChatReview reviewInfo={reviewInfo} planReviewTreeKeywordsMap={planReviewTreeKeywordsMap} />
            )}
        </>
    )
})

const AIReActTaskChatLeftSide: React.FC<AIReActTaskChatLeftSideProps> = React.memo((props) => {
    const {aiPerfData, yakExecResult, taskChat} = useAIChatUIData()
    const [leftExpand, setLeftExpand] = useState(true)
    return (
        <div
            className={classNames(styles["content-left-side"], {
                [styles["content-left-side-hidden"]]: !leftExpand
            })}
        >
            <AIChatLeftSide
                expand={leftExpand}
                setExpand={setLeftExpand}
                tasks={taskChat.plan}
                pressure={aiPerfData.pressure}
                cost={aiPerfData.firstCost}
                card={yakExecResult.card}
            />
            <div className={styles["open-wrapper"]} onClick={() => setLeftExpand(true)}>
                <ChevrondownButton />
                <div className={styles["text"]}>任务列表</div>
            </div>
        </div>
    )
})
