import React, {forwardRef, memo, useImperativeHandle, useMemo, useRef, useState} from "react"
import {useMemoizedFn} from "ahooks"
import {AIAgentWelcomeProps} from "./type"
import {AIStartParams} from "../type/aiChat"
import {grpcGetAIForge} from "../grpc"
import {AIForgeForm} from "../aiTriageChatTemplate/AITriageChatTemplate"
import {AIChatTextarea} from "../template/template"
import {AIChatTextareaProps} from "../template/type"
import {yakitNotify} from "@/utils/notification"
import cloneDeep from "lodash/cloneDeep"
import {YakitHint} from "@/components/yakitUI/YakitHint/YakitHint"
import {YakitCheckbox} from "@/components/yakitUI/YakitCheckbox/YakitCheckbox"
import {AIModelSelect} from "../aiModelList/aiModelSelect/AIModelSelect"
import {AIForge} from "../AIForge/type"

// import classNames from "classnames"
import AIAgentWelcomebg from "@/assets/aiAgent/ai-agent-welcome-bg.png"
import AIAgentWelcomePixel from "@/assets/aiAgent/ai-agent-welcome-pixel.png"
import styles from "./AIAgentWelcome.module.scss"

const AIReviewRuleSelect = React.lazy(() => import("../../ai-re-act/aiReviewRuleSelect/AIReviewRuleSelect"))
export const AIAgentWelcome: React.FC<AIAgentWelcomeProps> = memo(
    forwardRef((props, ref) => {
        const {
            replaceForgeNoPrompt,
            setReplaceForgeNoPrompt,
            setCacheReplaceForgeNoPrompt,
            onTriageSubmit,
            onTaskSubmit
        } = props

        useImperativeHandle(
            ref,
            () => ({
                onTriggerExecForge: handleReplaceActiveForge
            }),
            []
        )

        const wrapperRef = useRef<HTMLDivElement>(null)

        // #region  AI-Forge 模板相关逻辑
        // const [forges, setForges] = useState<AIForge[]>([])
        // const fetchForges = useMemoizedFn(() => {
        //     const request: QueryAIForgeRequest = {
        //         Pagination: {
        //             Page: 1,
        //             Limit: 3,
        //             Order: "desc",
        //             OrderBy: "id"
        //         }
        //     }
        //     grpcQueryAIForge(request)
        //         .then((res) => {
        //             setForges(res?.Data || [])
        //         })
        //         .catch(() => {})
        // })
        // useEffect(() => {
        //     fetchForges()
        // }, [])
        // #endregion

        // #region 问题相关逻辑
        const textareaProps: AIChatTextareaProps["textareaProps"] = useMemo(() => {
            return {
                placeholder: "请告诉我，你想做什么...(shift + enter 换行)"
            }
        }, [])

        const [question, setQuestion] = useState("")

        const handleTriageSubmit = useMemoizedFn((qs: string) => {
            onTriageSubmit(qs)
            setQuestion("")
        })
        // #endregion

        // #region  使用 AI-Forge 模板
        const [activeForge, setActiveForge] = useState<AIForge>()

        const [replaceShow, setReplaceShow] = useState(false)
        const replaceForge = useRef<AIForge>()
        const handleReplaceOK = useMemoizedFn(() => {
            setActiveForge(cloneDeep(replaceForge.current))
            setCacheReplaceForgeNoPrompt()
            handleReplaceCancel()
        })
        const handleReplaceCancel = useMemoizedFn(() => {
            replaceForge.current = undefined
            setReplaceShow(false)
        })

        const handleReplaceActiveForge = useMemoizedFn((id: number) => {
            const forgeID = Number(id) || 0
            if (!forgeID) {
                yakitNotify("error", `准备使用的模板异常: id('${id}'), 操作失败`)
                return
            }

            grpcGetAIForge(forgeID)
                .then((res) => {
                    const forgeInfo = cloneDeep(res)
                    if (!activeForge) setActiveForge(forgeInfo)
                    else {
                        if (forgeInfo.Id === activeForge.Id) {
                            // 同一个forge模板, 检查名字和参数是否一至
                            let isReplace = false
                            isReplace = forgeInfo.ForgeName !== activeForge.ForgeName
                            isReplace = forgeInfo.ParamsUIConfig !== activeForge.ParamsUIConfig
                            if (isReplace) setActiveForge(forgeInfo)
                        } else {
                            // 不同forge模板，弹出提示框是否替换
                            if (replaceForgeNoPrompt) {
                                setActiveForge({...forgeInfo})
                            } else {
                                replaceForge.current = {...forgeInfo}
                                setReplaceShow(true)
                            }
                        }
                    }
                })
                .catch(() => {})
        })

        const handleActiveForge = useMemoizedFn((forge: AIForge) => {
            handleReplaceActiveForge(forge.Id)
        })
        const handleClearActiveForge = useMemoizedFn(() => {
            setActiveForge(undefined)
        })

        const handleTaskSubmit = useMemoizedFn((request: AIStartParams) => {
            onTaskSubmit(request)
            setActiveForge(undefined)
        })
        // #endregion

        return (
            <div ref={wrapperRef} className={styles["ai-agent-welcome"]}>
                <div className={styles["welcome-container"]}>
                    <div className={styles["container-body"]}>
                        <div className={styles["welcome-suggestion"]}>
                            <div className={styles["suggestion-header"]}>
                                <div className={styles["title"]}>AI-Agent 安全助手</div>
                                <div className={styles["sub-title"]}>专注于安全编码与漏洞分析的智能助手</div>
                            </div>

                            {/* <div className={styles["suggestion-forges"]}>
                                {forges.map((item) => {
                                    return (
                                        <div key={item.Id} className={styles["suggestion-forge"]}>
                                            <AIForgeInfoOpt
                                                info={item}
                                                activeForge={activeForge}
                                                onClick={handleActiveForge}
                                            />
                                        </div>
                                    )
                                })}
                            </div> */}
                        </div>
                    </div>
                </div>

                <div className={styles["welcome-footer"]}>
                    <div className={styles["footer-body"]}>
                        <div className={styles["footer-inputs"]}>
                            <AIChatTextarea
                                question={question}
                                setQuestion={setQuestion}
                                textareaProps={textareaProps}
                                onSubmit={handleTriageSubmit}
                                extraFooterLeft={
                                    <>
                                        <AIModelSelect />
                                        <React.Suspense fallback={<div>loading...</div>}>
                                            <AIReviewRuleSelect />
                                        </React.Suspense>
                                    </>
                                }
                            />
                        </div>

                        <div className={styles["footer-forge-form"]}>
                            {activeForge && (
                                <AIForgeForm
                                    wrapperRef={wrapperRef}
                                    info={activeForge}
                                    onBack={handleClearActiveForge}
                                    onSubmit={handleTaskSubmit}
                                />
                            )}
                        </div>
                    </div>
                </div>

                <div className={styles["welcome-upper-body-bg"]}>
                    <img className={styles["img-wrapper"]} src={AIAgentWelcomebg} />
                </div>
                <div className={styles["welcome-upper-body-bg"]}>
                    <img className={styles["img-wrapper"]} src={AIAgentWelcomePixel} />
                </div>

                <YakitHint
                    getContainer={wrapperRef.current || undefined}
                    visible={replaceShow}
                    title='警告'
                    content={"是否要替换当前使用的forge模板?"}
                    footerExtra={
                        <YakitCheckbox
                            checked={replaceForgeNoPrompt}
                            onChange={(e) => setReplaceForgeNoPrompt(e.target.checked)}
                        >
                            不再提醒
                        </YakitCheckbox>
                    }
                    okButtonText='替换'
                    onOk={handleReplaceOK}
                    cancelButtonText='取消'
                    onCancel={handleReplaceCancel}
                />
            </div>
        )
    })
)
