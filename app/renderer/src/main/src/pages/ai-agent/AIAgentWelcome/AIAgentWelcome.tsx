import React, {forwardRef, memo, useMemo, useRef, useState} from "react"
import {useMemoizedFn} from "ahooks"
import {AIAgentWelcomeProps} from "./type"
import {AIChatTextarea} from "../template/template"
import {AIChatTextareaProps} from "../template/type"
import {AIModelSelect} from "../aiModelList/aiModelSelect/AIModelSelect"

// import classNames from "classnames"
import AIAgentWelcomebg from "@/assets/aiAgent/ai-agent-welcome-bg.png"
import AIAgentWelcomePixel from "@/assets/aiAgent/ai-agent-welcome-pixel.png"
import styles from "./AIAgentWelcome.module.scss"

const AIReviewRuleSelect = React.lazy(() => import("../../ai-re-act/aiReviewRuleSelect/AIReviewRuleSelect"))
export const AIAgentWelcome: React.FC<AIAgentWelcomeProps> = memo(
    forwardRef((props, ref) => {
        const {onTriageSubmit} = props

        const wrapperRef = useRef<HTMLDivElement>(null)

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

        return (
            <div ref={wrapperRef} className={styles["ai-agent-welcome"]}>
                <div className={styles["welcome-container"]}>
                    <div className={styles["container-body"]}>
                        <div className={styles["welcome-suggestion"]}>
                            <div className={styles["suggestion-header"]}>
                                <div className={styles["title"]}>AI-Agent 安全助手</div>
                                <div className={styles["sub-title"]}>专注于安全编码与漏洞分析的智能助手</div>
                            </div>

                            {/* <div className={styles["sugge
                            stion-forges"]}>
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
                    </div>
                </div>

                <div className={styles["welcome-upper-body-bg"]}>
                    <img className={styles["img-wrapper"]} src={AIAgentWelcomebg} />
                </div>
                <div className={styles["welcome-upper-body-bg"]}>
                    <img className={styles["img-wrapper"]} src={AIAgentWelcomePixel} />
                </div>
            </div>
        )
    })
)
