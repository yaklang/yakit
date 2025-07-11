import React, {memo, useEffect, useMemo, useRef, useState} from "react"
import {useMemoizedFn} from "ahooks"
import {AIAgentWelcomeProps} from "./type"
import {AIForge, AIStartParams, QueryAIForgeRequest} from "../type/aiChat"
import {grpcQueryAIForge} from "../grpc"
import {AIForgeForm, AIForgeInfoOpt} from "../aiTriageChatTemplate/AITriageChatTemplate"
import {AIChatTextarea} from "../template/template"
import {AIChatTextareaProps} from "../template/type"
import {AIAgentTriggerEventInfo} from "../aiAgentType"
import emiter from "@/utils/eventBus/eventBus"

// import classNames from "classnames"
import AIAgentWelcomebg from "@/assets/aiAgent/ai-agent-welcome-bg.png"
import AIAgentWelcomePixel from "@/assets/aiAgent/ai-agent-welcome-pixel.png"
import styles from "./AIAgentWelcome.module.scss"

export const AIAgentWelcome: React.FC<AIAgentWelcomeProps> = memo((props) => {
    const {onTriageSubmit, onTaskSubmit} = props

    const wrapperRef = useRef<HTMLDivElement>(null)

    // #region  AI-Forge 模板相关逻辑
    const [forges, setForges] = useState<AIForge[]>([])
    const fetchForges = useMemoizedFn(() => {
        const request: QueryAIForgeRequest = {
            Pagination: {
                Page: 1,
                Limit: 3,
                Order: "desc",
                OrderBy: "id"
            }
        }
        grpcQueryAIForge(request)
            .then((res) => {
                console.log("AIAgentWelcome: grpcQueryAIForge-api", request, res)
                setForges(res?.Data || [])
            })
            .catch(() => {})
    })
    useEffect(() => {
        fetchForges()
    }, [])
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
    useEffect(() => {
        // ai-agent 页面左侧侧边栏向 chatUI 发送的事件
        const onEvents = (res: string) => {
            try {
                const data = JSON.parse(res) as AIAgentTriggerEventInfo
                if (!data.type) return

                if (data.type === "open-forge-form") {
                    const {value} = data.params || {}
                    if (value && value?.Id && value?.ForgeName) {
                        handleActiveForge(value)
                    }
                }
            } catch (error) {}
        }
        emiter.on("onServerChatEvent", onEvents)
        return () => {
            emiter.off("onServerChatEvent", onEvents)
        }
    }, [])

    const [activeForge, setActiveForge] = useState<AIForge>()
    const handleActiveForge = useMemoizedFn((forge: AIForge) => {
        if (activeForge) return
        setActiveForge(forge)
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

                        <div className={styles["suggestion-forges"]}>
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
                        </div>
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
        </div>
    )
})
