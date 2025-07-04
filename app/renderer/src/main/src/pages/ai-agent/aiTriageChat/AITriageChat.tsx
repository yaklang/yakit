import React, {forwardRef, memo, useImperativeHandle, useRef, useState} from "react"
import {AITriageChatData, AITriageChatProps} from "./type"
import {AIChatTextarea} from "../template/template"
import {useMemoizedFn} from "ahooks"
import {AIForge, AIStartParams} from "../type/aiChat"
import {AIForgeForm} from "../aiTriageChatTemplate/AITriageChatTemplate"
import useChatTriage from "../useChatTriage"

import classNames from "classnames"
import styles from "./AITriageChat.module.scss"
import useStore from "../useContext/useStore"
import useDispatcher from "../useContext/useDispatcher"
import {randomString} from "@/utils/randomUtil"
import {formatAIAgentSetting} from "../utils"

export const AITriageChat: React.FC<AITriageChatProps> = memo(
    forwardRef((props, ref) => {
        const {} = props

        useImperativeHandle(
            ref,
            () => ({
                onStart: handleTriageStart,
                fetchData: () => {}
            }),
            []
        )

        const {setting, activeTriage} = useStore()
        const {setTriages, setActiveTriage} = useDispatcher()

        const wrapperRef = useRef<HTMLDivElement>(null)

        // #region 数据流 Hooks
        const [{execute}, events] = useChatTriage()
        // #endregion

        // #region 问题相关逻辑
        const [question, setQuestion] = useState("")

        const startLoading = useRef(false)
        const handleTriageStart = useMemoizedFn((qs: string) => {
            if (startLoading.current) return
            startLoading.current = true

            const info: AITriageChatData = {
                id: randomString(10),
                name: qs,
                question: qs,
                time: Date.now(),
                chats: [{type: "question", content: qs}]
            }

            setTriages && setTriages((old) => old.concat([info]))
            setActiveTriage && setActiveTriage(info)

            events.onStart(info.id, {
                IsStart: true,
                Params: {...formatAIAgentSetting(setting), UserQuery: qs || ""}
            })
            setTimeout(() => {
                startLoading.current = false
            }, 200)
        })

        const handleTriageSend = useMemoizedFn((qs: string) => {
            if (!activeTriage?.id) return
            events.onSend(activeTriage?.id, qs)
        })
        // #endregion

        // #region  使用 AI-Forge 模板
        const [activeForge, setActiveForge] = useState<AIForge>()
        const handleActiveForge = useMemoizedFn((forge: AIForge) => {
            if (activeForge) return
            setActiveForge(forge)
        })
        const handleClearActiveForge = useMemoizedFn(() => {
            setActiveForge(undefined)
        })

        const handleTaskSubmit = useMemoizedFn((request: AIStartParams) => {})
        // #endregion

        return (
            <div ref={wrapperRef} className={styles["ai-triage-chat"]}>
                <div className={styles["chat-container"]}>
                    <div className={styles["container-body"]}></div>
                </div>

                <div className={styles["chat-footer"]}>
                    <div className={styles["footer-body"]}>
                        <div className={styles["footer-inputs"]}>
                            <AIChatTextarea
                                question={question}
                                setQuestion={setQuestion}
                                textareaProps={{
                                    placeholder: "请告诉我，你想做什么...(shift + enter 换行)"
                                }}
                                onSubmit={handleTriageSend}
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
            </div>
        )
    })
)
