import React, {forwardRef, memo, useEffect, useImperativeHandle, useMemo, useRef, useState} from "react"
import {
    AITriageChatContentForgesProps,
    AITriageChatContentProps,
    AITriageChatContentsProps,
    AITriageChatData,
    AITriageChatDataInfo,
    AITriageChatProps
} from "./type"
import {AIChatTextarea} from "../template/template"
import {useMemoizedFn} from "ahooks"
import {AIForge, AIStartParams, QueryAIForgeRequest} from "../type/aiChat"
import {AIForgeForm, AIForgeInfoOpt} from "../aiTriageChatTemplate/AITriageChatTemplate"
import useChatTriage, {AITriageChatContentInfo} from "../useChatTriage"
import useAIAgentStore from "../useContext/useStore"
// import useAIAgentDispatcher from "../useContext/useDispatcher"
import {randomString} from "@/utils/randomUtil"
import {formatAIAgentSetting} from "../utils"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {OutlineChevrondownIcon, OutlineChevronupIcon} from "@/assets/icon/outline"
import cloneDeep from "lodash/cloneDeep"
import {grpcGetAIForge, grpcQueryAIForge} from "../grpc"
import {yakitNotify} from "@/utils/notification"
import {AIChatTextareaProps} from "../template/type"
import {YakitHint} from "@/components/yakitUI/YakitHint/YakitHint"

import classNames from "classnames"
import styles from "./AITriageChat.module.scss"

const AITriageChat: React.FC<AITriageChatProps> = memo(
    forwardRef((props, ref) => {
        const {onTaskSubmit, onClear} = props

        useImperativeHandle(
            ref,
            () => ({
                onStart: handleTriageStart,
                onTriggerExecForge: handleReplaceActiveForge
            }),
            []
        )

        const {setting} = useAIAgentStore()

        const wrapperRef = useRef<HTMLDivElement>(null)

        // #region 展示数据和数据的处理逻辑
        // 发送消息后接受消息的 loading 状态
        const [isExecuting, setIsExecuting] = useState(false)
        const [triageChat, setTriageChat] = useState<AITriageChatData>()

        // 验证对话集合是否可以操作数据，不能则返回null
        const handleValidateChat = useMemoizedFn((triages?: AITriageChatData) => {
            const newTriages = cloneDeep(triages)
            if (!newTriages || !newTriages.chats || newTriages.chats.length === 0) {
                return null
            }
            return newTriages
        })

        const handleFetchChatContent = useMemoizedFn((res: AITriageChatContentInfo) => {
            const {type, content} = res
            if (type === "answer") {
                setTriageChat((old) => {
                    if (!old) return old
                    else {
                        try {
                            const newChats = handleValidateChat(old)
                            if (!newChats) return old
                            const lastChat = newChats.chats[newChats.chats.length - 1]
                            if (!lastChat || lastChat.type !== "answer") return newChats
                            lastChat.loading = true
                            lastChat.content += `${content}\n`
                            return newChats
                        } catch (error) {
                            yakitNotify("error", `处理triage内容错误: ${error}`)
                            return old
                        }
                    }
                })
            }
            if (type === "forges") {
                try {
                    const {forge_list: names, keywords} = JSON.parse(content) as {
                        forge_list: string[]
                        keywords: string
                    }
                    if (!names || !Array.isArray(names) || names.length === 0) return
                    const request: QueryAIForgeRequest = {
                        Pagination: {
                            Page: 1,
                            Limit: 50,
                            Order: "desc",
                            OrderBy: "id"
                        },
                        Filter: {ForgeNames: names}
                    }
                    grpcQueryAIForge(request)
                        .then((res) => {
                            const arrs = res?.Data || []
                            if (arrs.length > 0) {
                                setTriageChat((old) => {
                                    if (!old) return old
                                    else {
                                        const newChats = handleValidateChat(old)
                                        if (!newChats) return old
                                        const lastChat = newChats.chats[newChats.chats.length - 1]
                                        if (lastChat && lastChat.type === "answer") {
                                            lastChat.loading = false
                                        }
                                        newChats.chats.push({
                                            id: randomString(8),
                                            type: "forges",
                                            loading: false,
                                            forgesKeyword: keywords,
                                            content: arrs
                                        })
                                        return newChats
                                    }
                                })
                            }
                        })
                        .catch(() => {})
                } catch (error) {}
            }
            if (type === "finish") {
                setIsExecuting(false)
            }
        })
        const [{execute}, events] = useChatTriage({onChatContent: handleFetchChatContent})
        // #endregion

        // #region 问题相关逻辑
        const textareaProps: AIChatTextareaProps["textareaProps"] = useMemo(() => {
            return {
                placeholder: "请告诉我，你想做什么...(shift + enter 换行)"
            }
        }, [])

        const [question, setQuestion] = useState("")

        /** 生成问题和答案内容的对象结构 */
        const handleGenerateChatContent = useMemoizedFn((qs: string) => {
            return [
                {id: randomString(8), type: "question", loading: false, content: qs},
                {
                    id: randomString(8),
                    type: "answer",
                    loading: true,
                    content: ""
                }
            ] as AITriageChatDataInfo[]
        })

        const startLoading = useRef(false)
        const handleTriageStart = useMemoizedFn((qs: string) => {
            if (startLoading.current) return
            startLoading.current = true

            const info: AITriageChatData = {
                id: randomString(10),
                name: qs,
                question: qs,
                time: Date.now(),
                chats: handleGenerateChatContent(qs)
            }
            setTriageChat(info)

            setIsExecuting(true)
            events.onStart(info.id, {
                IsStart: true,
                Params: {...formatAIAgentSetting(setting), UserQuery: qs || ""}
            })
            setTimeout(() => {
                startLoading.current = false
            }, 200)
        })

        const handleTriageSend = useMemoizedFn((qs: string) => {
            if (!execute) return
            if (!triageChat) return
            if (!triageChat?.id) return
            setTriageChat((old) => {
                if (!old) return old
                else {
                    try {
                        const newChats = handleValidateChat(old)
                        if (!newChats) return old
                        newChats.chats = newChats.chats.concat(handleGenerateChatContent(qs))
                        return newChats
                    } catch (error) {
                        yakitNotify("error", `处理triage内容错误: ${error}`)
                        return old
                    }
                }
            })
            setIsExecuting(true)
            events.onSend(triageChat?.id, qs)
            setQuestion("")
        })

        const handleTriageCancel = useMemoizedFn(() => {
            if (triageChat) {
                events.onClose(triageChat.id)
            }
            onClear()
            startLoading.current = false
            setTriageChat(undefined)
            setIsExecuting(false)
            setQuestion("")
            setActiveForge(undefined)
        })
        // #endregion

        // #region  使用 AI-Forge 模板
        const [activeForge, setActiveForge] = useState<AIForge>()

        const [replaceShow, setReplaceShow] = useState(false)
        const replaceForge = useRef<AIForge>()
        const handleReplaceOK = useMemoizedFn(() => {
            setActiveForge(replaceForge.current)
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
                            replaceForge.current = {...forgeInfo}
                            setReplaceShow(true)
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
            <div ref={wrapperRef} className={styles["ai-triage-chat"]}>
                <div className={styles["chat-container"]}>
                    <AITriageChatContents
                        chats={triageChat?.chats || []}
                        activeForge={activeForge}
                        onSelect={handleActiveForge}
                    />
                </div>

                <div className={styles["chat-footer"]}>
                    <div className={styles["footer-body"]}>
                        <div className={styles["footer-inputs"]}>
                            {!isExecuting && triageChat && triageChat.chats.length > 0 && (
                                <div className={styles["clear-context"]}>
                                    <YakitButton
                                        className={styles["clear-btn"]}
                                        type='outline2'
                                        onClick={handleTriageCancel}
                                    >
                                        清空上下文
                                    </YakitButton>
                                </div>
                            )}

                            <AIChatTextarea
                                loading={isExecuting}
                                question={question}
                                setQuestion={setQuestion}
                                textareaProps={textareaProps}
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

                <YakitHint
                    getContainer={wrapperRef.current || undefined}
                    visible={replaceShow}
                    title='警告'
                    content={"是否要替换当前使用的forge模板?"}
                    okButtonText='替换'
                    onOk={handleReplaceOK}
                    cancelButtonText='取消'
                    onCancel={handleReplaceCancel}
                />
            </div>
        )
    })
)

export default AITriageChat

const AITriageChatContents: React.FC<AITriageChatContentsProps> = memo((props) => {
    const {chats, activeForge, onSelect} = props

    const wrapperRef = useRef<HTMLDivElement>(null)
    useEffect(() => {
        if (wrapperRef.current) {
            const {scrollHeight} = wrapperRef.current
            const {height} = wrapperRef.current.getBoundingClientRect()
            if (height < scrollHeight) {
                wrapperRef.current.scrollTop = scrollHeight
            }
        }
    }, [chats])

    return (
        <div ref={wrapperRef} className={styles["ai-triage-chat-contents"]}>
            <div className={styles["contents-wrapper"]}>
                <div className={styles["triage-contents-list"]}>
                    {chats.map((item) => {
                        const {id, type, loading, forgesKeyword, content} = item

                        if (["question", "answer"].includes(type)) {
                            return (
                                <AITriageChatContent
                                    key={id}
                                    isAnswer={type === "answer"}
                                    loading={loading}
                                    content={content as string}
                                />
                            )
                        }

                        if (type === "forges") {
                            const forges = content as AIForge[]
                            if (forges.length === 0) return null
                            return (
                                <AITriageChatContentForges
                                    key={id}
                                    keyword={forgesKeyword || ""}
                                    forges={forges}
                                    activeForge={activeForge}
                                    onSelect={onSelect}
                                />
                            )
                        }

                        return null
                    })}
                </div>
            </div>
        </div>
    )
})

const AITriageChatContent: React.FC<AITriageChatContentProps> = memo((props) => {
    const {isAnswer, loading, content} = props

    return (
        <div
            className={classNames(styles["triage-chat-content"], {
                [styles["triage-chat-question"]]: !isAnswer,
                [styles["triage-chat-answer"]]: !!isAnswer
            })}
        >
            <div className={styles["content-wrapper"]}>
                {content}
                {loading && <YakitSpin wrapperClassName={styles["loading-wrapper"]} spinning={true} />}
            </div>
        </div>
    )
})

const AITriageChatContentForges: React.FC<AITriageChatContentForgesProps> = memo((props) => {
    const {keyword, forges, activeForge, onSelect} = props

    const [expanded, setExpanded] = useState(false)
    const handleChangeExpand = useMemoizedFn(() => {
        setExpanded((old) => !old)
    })

    const showExpandBtn = useMemo(() => {
        if (!forges || !Array.isArray(forges) || forges.length <= 3) {
            return false
        }
        return true
    }, [forges])

    return (
        <div className={styles["triage-chat-forges"]}>
            <div className={styles["forges-header"]}>
                <div className={styles["header-title"]}>{`${keyword} 相关模板推荐: `}</div>
                {showExpandBtn && (
                    <YakitButton type='text2' onClick={handleChangeExpand}>
                        {expanded ? "收起" : "展开更多"}
                        {expanded ? <OutlineChevronupIcon /> : <OutlineChevrondownIcon />}
                    </YakitButton>
                )}
            </div>

            <div className={classNames(styles["forges-body"], {[styles["forges-min-height"]]: !expanded})}>
                {forges.map((item) => {
                    return (
                        <div key={item.Id} className={styles["forge-wrapper"]}>
                            <AIForgeInfoOpt info={item} activeForge={activeForge} onClick={onSelect} />
                        </div>
                    )
                })}
            </div>
        </div>
    )
})
