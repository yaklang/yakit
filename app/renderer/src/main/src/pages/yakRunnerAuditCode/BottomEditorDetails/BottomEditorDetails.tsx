import React, {useEffect, useState} from "react"
import {useMemoizedFn} from "ahooks"
import styles from "./BottomEditorDetails.module.scss"
import classNames from "classnames"
import {BottomEditorDetailsProps, ShowItemType} from "./BottomEditorDetailsType"
import {OutlineXIcon} from "@/assets/icon/outline"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import useStore from "../hooks/useStore"
import emiter from "@/utils/eventBus/eventBus"
import {PaperAirplaneIcon} from "@/assets/newIcon"
import {RuleEditorBox} from "./RuleEditorBox/RuleEditorBox"
import useDispatcher from "../hooks/useDispatcher"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import useShortcutKeyTrigger from "@/utils/globalShortcutKey/events/useShortcutKeyTrigger"
import {HoleDispose} from "./HoleDispose/HoleDispose"
import {QuerySSARisksResponse, SSARisk} from "@/pages/yakRunnerAuditHole/YakitAuditHoleTable/YakitAuditHoleTableType"
import {RightBugAuditResult} from "@/pages/risks/YakitRiskTable/YakitRiskTable"
import { openSSARiskNewWindow } from "@/utils/openWebsite"
import {fetchVarFlowGraph, fetchValueDataFlowGraph} from "../RightAuditDetail/VarFlowGraphAPI"
import {VarFlowGraph} from "../RightAuditDetail/VarFlowGraphType"
import {VarFlowGraphViz} from "../RightAuditDetail/VarFlowGraphViz"
import {loadAuditFromYakURLRaw} from "../utils"
import {StringToUint8Array} from "@/utils/str"
import {clearMapGraphInfoDetail, setMapGraphInfoDetail} from "../RightAuditDetail/GraphInfoMap"
import {GraphInfoProps} from "../RightAuditDetail/RightAuditDetail"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {AnalysisStepsGraph} from "../RightAuditDetail/AnalysisStepsGraph"
import {YakitRadioButtons} from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtons"
const {ipcRenderer} = window.require("electron")

// 编辑器区域 展示详情（输出/语法检查/终端/帮助信息）
export const BottomEditorDetails: React.FC<BottomEditorDetailsProps> = (props) => {
    const {isShowEditorDetails, setEditorDetails, showItem, setShowItem, auditRightParams} = props
    const {projectName, auditExecuting} = useStore()
    const {setAuditRule} = useDispatcher()
    // 不再重新加载的元素
    const [showType, setShowType] = useState<ShowItemType[]>([])
    // monaco输入内容
    const [ruleEditor, setRuleEditor] = useState<string>("")
    // 展示所需的BugHash
    const [bugHash, setBugHash] = useState<string>("")
    const [info, setInfo] = useState<SSARisk>()

    // Analysis Steps State
    const [varFlowGraph, setVarFlowGraph] = useState<VarFlowGraph | null>(null)
    const [varFlowGraphLoading, setVarFlowGraphLoading] = useState(false)
    const [resultId, setResultId] = useState<string>()
    const [programId, setProgramId] = useState<string>()
    const [viewMode, setViewMode] = useState<"graph" | "steps">("graph")

    // For Value Click (Data Flow) - reusing similar logic if needed, or simple redirect
    // We might need states for data flow graph if we want to show it here contextually or open it elsewhere.
    // RightAuditDetail had complex logic for switching views. Here we primarily want "Analysis Steps".
    // If user clicks a value, we might want to just show a notification or handle it if we want to support drill down.
    // For now, let's support loading the main graph.

    // 数组去重
    const filterItem = (arr) => arr.filter((item, index) => arr.indexOf(item) === index)

    const onResetAuditRuleFun = useMemoizedFn((v: string) => {
        setRuleEditor(v)
    })

    useEffect(() => {
        emiter.on("onResetAuditRule", onResetAuditRuleFun)
        return () => {
            emiter.off("onResetAuditRule", onResetAuditRuleFun)
        }
    }, [])

    useEffect(() => {
        if (showItem && isShowEditorDetails) {
            if (showType.includes(showItem)) return
            setShowType((arr) => filterItem([...arr, showItem]))
        }
    }, [showItem, isShowEditorDetails])

    // Load Analysis Steps Data
    useEffect(() => {
        if (auditRightParams) {
            // Set Program ID immediately
            if (auditRightParams.Location) {
                setProgramId(auditRightParams.Location)
            } else if (auditRightParams.ProgramName) {
                setProgramId(auditRightParams.ProgramName)
            }

            const loadParams = async () => {
                try {
                    const {Body, ...auditYakUrl} = auditRightParams
                    const body = Body ? StringToUint8Array(Body) : undefined
                    const result = await loadAuditFromYakURLRaw(auditYakUrl, body)
                    
                    if (result && result.Resources.length > 0) {
                        // 1. Try to find result_id resource directly
                        const resultIdResource = result.Resources.find((r) => r.ResourceType === "result_id")
                        if (resultIdResource) {
                            setResultId(resultIdResource.ResourceName)
                        } else {
                            // 2. Try to find result_id in risk resource extras
                            const riskResource = result.Resources.find((r) => r.ResourceType === "risk")
                            if (riskResource) {
                                const extRid = riskResource.Extra.find((e) => e.Key === "result_id")?.Value
                                if (extRid) {
                                    setResultId(extRid)
                                }
                                // Also try to get program name from risk if not set
                                if (!programId) {
                                     const progName = riskResource.Extra.find((e) => e.Key === "program_name")?.Value
                                     if (progName) setProgramId(progName)
                                }
                            }
                        }

                        // 3. Fallback: Check for program resource if programId still missing

                        // 4. Fallback: Check Resources[0].Extra generically for result_id and program info
                        // This handles cases where result_id is embedded in the main resource (e.g. audit result)
                        if (result.Resources[0] && result.Resources[0].Extra) {
                            const extra = result.Resources[0].Extra
                            
                            // Check for result_id
                            const resIdItem = extra.find(e => e.Key === "result_id" || e.Key === "ResultId")
                            if (resIdItem && resIdItem.Value) {
                                setResultId(resIdItem.Value)
                            }

                            // Check for program info if missing
                            if (!programId) {
                                const progItem = extra.find(e => e.Key === "program" || e.Key === "program_name" || e.Key === "ProgramName")
                                if (progItem && progItem.Value) {
                                    setProgramId(progItem.Value)
                                }
                            }
                        }
                    }
                } catch (e) {}
            }
            loadParams()
        }
    }, [auditRightParams])

    const loadVarFlowGraph = useMemoizedFn(async () => {
        if (!programId || !resultId) return
        try {
            setVarFlowGraphLoading(true)
            const data = await fetchVarFlowGraph(programId, resultId)
            if (data) setVarFlowGraph(data)
            setVarFlowGraphLoading(false)
        } catch (error) {
            setVarFlowGraphLoading(false)
        }
    })

    useEffect(() => {
        if (showItem === "analysisSteps" && programId && resultId) {
            loadVarFlowGraph()
        }
    }, [showItem, programId, resultId])

    const handleValueClick = useMemoizedFn(async (variable: string, index: number) => {
        // Handle value click - for now maybe just log or allow future expansion
        // Currently RightAuditDetail switched to "dataflow" view.
        // We might need a way to show dataflow here too?
        // User request was "Analysis Steps Graph".
        // Let's implement fetchValueDataFlowGraph to at least support the interaction if possible, 
        // or just leave it as is if it opens in a new way.
        // RightAuditDetail logic for handleValueClick switched viewMode to 'dataflow' and setGraph.
        // If we want to support that in this tab, we might need nested tabs or a 'back' button.
        // For this task, locating the graph is the priority.
    })

    const onOpenBottomDetailFun = useMemoizedFn((v: string) => {
        try {
            const {type}: {type: ShowItemType} = JSON.parse(v)
            setEditorDetails(true)
            setShowItem(type)
        } catch (error) {}
    })

    const onCodeAuditOpenBugDetailFun = useMemoizedFn((hash: string) => {
        ipcRenderer
            .invoke("QuerySSARisks", {
                Filter: {
                    Hash: [hash]
                }
            })
            .then((res: QuerySSARisksResponse) => {
                const {Data} = res
                if (Data.length > 0) {
                    setInfo(Data[0])
                    setBugHash(hash)
                }
            })
            .catch((err) => {})
    })

    useEffect(() => {
        emiter.on("onCodeAuditOpenBottomDetail", onOpenBottomDetailFun)
        // 打开编译BUG详情
        emiter.on("onCodeAuditOpenBugDetail", onCodeAuditOpenBugDetailFun)
        return () => {
            emiter.off("onCodeAuditOpenBottomDetail", onOpenBottomDetailFun)
            emiter.off("onCodeAuditOpenBugDetail", onCodeAuditOpenBugDetailFun)
        }
    }, [])

    const onAuditRuleSubmit = useMemoizedFn(() => {
        if (!projectName || ruleEditor.length === 0) return
        setAuditRule && setAuditRule(ruleEditor)
        emiter.emit("onAuditRuleSubmit", ruleEditor)
    })

    const onStopAuditRule = useMemoizedFn(() => {
        emiter.emit("onStopAuditRule")
    })

    useShortcutKeyTrigger("submit*aduit", () => {
        if (isShowEditorDetails && showItem === "ruleEditor") {
            onAuditRuleSubmit()
        }
    })

    return (
        <div className={styles["bottom-editor-details"]}>
            <div className={styles["header"]}>
                <div className={styles["select-box"]}>
                    <div
                        className={classNames(styles["item"], {
                            [styles["active-item"]]: showItem === "ruleEditor",
                            [styles["no-active-item"]]: showItem !== "ruleEditor"
                        })}
                        onClick={() => setShowItem("ruleEditor")}
                    >
                        <div className={styles["title"]}>规则编写</div>
                    </div>
                    <div
                        className={classNames(styles["item"], {
                            [styles["active-item"]]: showItem === "holeDetail",
                            [styles["no-active-item"]]: showItem !== "holeDetail"
                        })}
                        onClick={() => setShowItem("holeDetail")}
                    >
                        <div className={styles["title"]}>漏洞详情</div>
                    </div>
                    <div
                        className={classNames(styles["item"], {
                            [styles["active-item"]]: showItem === "holeDispose",
                            [styles["no-active-item"]]: showItem !== "holeDispose"
                        })}
                        onClick={() => setShowItem("holeDispose")}
                    >
                        <div className={styles["title"]}>漏洞处置</div>
                    </div>
                     <div
                        className={classNames(styles["item"], {
                            [styles["active-item"]]: showItem === "analysisSteps",
                            [styles["no-active-item"]]: showItem !== "analysisSteps"
                        })}
                        onClick={() => setShowItem("analysisSteps")}
                    >
                        <div className={styles["title"]}>分析步骤</div>
                    </div>
                </div>
                <div className={styles["extra"]}>
                    {showItem === "ruleEditor" && (
                        <>
                            {auditExecuting ? (
                                <YakitButton danger icon={<PaperAirplaneIcon />} onClick={onStopAuditRule}>
                                    暂停执行
                                </YakitButton>
                            ) : (
                                <YakitButton
                                    icon={<PaperAirplaneIcon />}
                                    onClick={onAuditRuleSubmit}
                                    disabled={!projectName || ruleEditor.length === 0}
                                >
                                    开始审计
                                </YakitButton>
                            )}
                        </>
                    )}
                    <YakitButton
                        type='text2'
                        icon={<OutlineXIcon />}
                        onClick={() => {
                            setEditorDetails(false)
                        }}
                    />
                </div>
            </div>
            <div className={styles["content"]}>
                {showType.includes("ruleEditor") && (
                    <div
                        className={classNames(styles["render-hideen"], {
                            [styles["render-show"]]: showItem === "ruleEditor"
                        })}
                    >
                        <RuleEditorBox
                            ruleEditor={ruleEditor}
                            setRuleEditor={setRuleEditor}
                            disabled={auditExecuting}
                            onAuditRuleSubmit={onAuditRuleSubmit}
                        />
                    </div>
                )}
                {showType.includes("holeDetail") && (
                    <div
                        className={classNames(styles["render-hideen"], {
                            [styles["render-show"]]: showItem === "holeDetail"
                        })}
                    >
                        {bugHash ? (
                            <>{info && <RightBugAuditResult info={info} extra={
                                <YakitButton type="primary" onClick={()=>{
                                    openSSARiskNewWindow(info)
                                }}>新窗口打开</YakitButton>
                            }/>}</>
                        ) : (
                            <div className={styles["no-audit"]}>
                                <YakitEmpty title='暂无漏洞' />
                            </div>
                        )}
                    </div>
                )}
                {showType.includes("holeDispose") && (
                    <div
                        className={classNames(styles["render-hideen"], {
                            [styles["render-show"]]: showItem === "holeDispose"
                        })}
                    >
                        {bugHash ? (
                            <HoleDispose RiskHash={bugHash} info={info} />
                        ) : (
                            <div className={styles["no-audit"]}>
                                <YakitEmpty title='请选择漏洞进行处置' />
                            </div>
                        )}
                    </div>
                )}
                {showType.includes("analysisSteps") && (
                    <div
                        className={classNames(styles["render-hideen"], {
                            [styles["render-show"]]: showItem === "analysisSteps"
                        })}
                        style={{height: "100%", overflow: "hidden", position: "relative", display: "flex", flexDirection: "column"}} 
                    >
                         <div style={{padding: "8px 12px", borderBottom: "1px solid var(--Colors-Use-Neutral-Border-Secondary)", flexShrink: 0}}>
                            <YakitRadioButtons
                                value={viewMode}
                                onChange={(e) => setViewMode(e.target.value)}
                                options={[
                                    {value: "graph", label: "分析步骤图"},
                                    {value: "steps", label: "调试模式"}
                                ]}
                                size='small'
                            />
                        </div>
                        <div style={{flex: 1, overflow: "hidden", position: "relative"}}>
                            <YakitSpin spinning={varFlowGraphLoading}>
                                {programId && resultId ? (
                                    viewMode === "graph" ? (
                                        <div style={{height: "100%", width: "100%"}}>
                                            <VarFlowGraphViz 
                                                varFlowGraph={varFlowGraph}
                                                programId={programId}
                                                resultId={resultId}
                                                onValueClick={handleValueClick}
                                            />
                                        </div>
                                    ) : (
                                        <div style={{height: "100%", overflow: "auto"}}>
                                            <AnalysisStepsGraph varFlowGraph={varFlowGraph} />
                                        </div>
                                    )
                                ) : (
                                    <div className={styles["no-audit"]}>
                                        <YakitEmpty title='暂无分析步骤数据' />
                                    </div>
                                )}
                            </YakitSpin>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
