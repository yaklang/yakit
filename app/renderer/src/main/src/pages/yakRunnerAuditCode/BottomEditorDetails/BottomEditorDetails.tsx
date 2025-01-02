import React, {useEffect, useMemo, useRef, useState} from "react"
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
import {HoleBugDetail} from "@/pages/yakRunnerCodeScan/AuditCodeDetailDrawer/AuditCodeDetailDrawer"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"

// 编辑器区域 展示详情（输出/语法检查/终端/帮助信息）

export const BottomEditorDetails: React.FC<BottomEditorDetailsProps> = (props) => {
    const {isShowEditorDetails, setEditorDetails, showItem, setShowItem} = props
    const {projectName, auditExecuting} = useStore()
    const {setAuditRule} = useDispatcher()
    // 不再重新加载的元素
    const [showType, setShowType] = useState<ShowItemType[]>([])
    // monaco输入内容
    const [ruleEditor, setRuleEditor] = useState<string>("")
    // 展示所需的BugHash
    const [bugHash, setBugHash] = useState<string>("")

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

    const onOpenBottomDetailFun = useMemoizedFn((v: string) => {
        try {
            const {type}: {type: ShowItemType} = JSON.parse(v)
            setEditorDetails(true)
            setShowItem(type)
        } catch (error) {}
    })

    const onCodeAuditOpenBugDetailFun = useMemoizedFn((hash: string) => {
        setBugHash(hash)
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
        setAuditRule && setAuditRule(ruleEditor)
        emiter.emit("onAuditRuleSubmit", ruleEditor)
    })

    const onStopAuditRule = useMemoizedFn(() => {
        emiter.emit("onStopAuditRule")
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
                            <HoleBugDetail bugHash={bugHash} />
                        ) : (
                            <div className={styles["no-audit"]}>
                                <YakitEmpty title='暂无漏洞' />
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
