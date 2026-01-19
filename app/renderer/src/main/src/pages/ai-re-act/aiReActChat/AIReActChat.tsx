import React, {useEffect, useRef} from "react"

import styles from "./AIReActChat.module.scss"
import {AIReActChatProps} from "./AIReActChatType"
import {AIChatTextarea} from "@/pages/ai-agent/template/template"
import {AIReActChatContents} from "../aiReActChatContents/AIReActChatContents"
import {AIChatTextareaRefProps, AIChatTextareaSubmit} from "@/pages/ai-agent/template/type"
import {useControllableValue, useCreation, useMemoizedFn} from "ahooks"
import {yakitNotify} from "@/utils/notification"
import {ColorsChatIcon} from "@/assets/icon/colors"
import useAIAgentStore from "@/pages/ai-agent/useContext/useStore"
import {AIModelSelect} from "@/pages/ai-agent/aiModelList/aiModelSelect/AIModelSelect"
import classNames from "classnames"
import useChatIPCStore from "@/pages/ai-agent/useContext/ChatIPCContent/useStore"
import useChatIPCDispatcher from "@/pages/ai-agent/useContext/ChatIPCContent/useDispatcher"
import {ChevrondownButton, ChevronleftButton, RoundedStopButton, UploadFileButton} from "./AIReActComponent"
import {AIInputEvent} from "../hooks/grpcApi"
import useAIChatUIData from "../hooks/useAIChatUIData"
import {AITaskQuery} from "@/pages/ai-agent/components/aiTaskQuery/AITaskQuery"
import {PageNodeItemProps} from "@/store/pageInfo"
import emiter from "@/utils/eventBus/eventBus"
import OpenFileDropdown from "@/pages/ai-agent/aiChatWelcome/OpenFileDropdown/OpenFileDropdown"
import {HandleStartParams} from "@/pages/ai-agent/aiAgentChat/type"
import {getAIReActRequestParams} from "@/pages/ai-agent/utils"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"

const AIReviewRuleSelect = React.lazy(() => import("../aiReviewRuleSelect/AIReviewRuleSelect"))

export const AIReActChat: React.FC<AIReActChatProps> = React.memo((props) => {
    const {
        mode,
        chatContainerClassName,
        chatContainerHeaderClassName,
        title = "自由对话",
        aiChatTextareaRef,
        handleSendAfter
    } = props
    const {casualChat} = useAIChatUIData()
    const {chatIPCData} = useChatIPCStore()
    const {chatIPCEvents, handleStart, handleStop, handleSendSyncMessage} = useChatIPCDispatcher()
    const execute = useCreation(() => chatIPCData.execute, [chatIPCData.execute])
    const focusMode = useCreation(() => chatIPCData.focusMode, [chatIPCData.focusMode])

    const wrapperRef = useRef<HTMLDivElement>(null)

    const [showFreeChat, setShowFreeChat] = useControllableValue<boolean>(props, {
        defaultValue: true,
        valuePropName: "showFreeChat",
        trigger: "setShowFreeChat"
    })

    const {activeChat, setting} = useAIAgentStore()

    const questionQueue = useCreation(() => chatIPCData.questionQueue, [chatIPCData.questionQueue])
    // // #region 问题相关逻辑
    // const aiChatTextareaRef = useRef<AIChatTextareaRefProps>(null)
    // #endregion

    // #region 问题相关逻辑
    // 初始化 AI ReAct
    const handleSubmit = useMemoizedFn((value: AIChatTextareaSubmit) => {
        if (!setting) {
            yakitNotify("error", "请先配置 AI ReAct 参数")
            return
        }
        if (execute) {
            handleSend(value)
        } else {
            handleStart(value)
        }
        onSetQuestion("")
    })

    /**自由对话 */
    const handleSend = useMemoizedFn((data: HandleStartParams) => {
        if (!activeChat?.id) return
        try {
            const {extra, attachedResourceInfo} = getAIReActRequestParams(data)
            const chatMessage: AIInputEvent = {
                IsFreeInput: true,
                FreeInput: data.qs,
                AttachedResourceInfo: attachedResourceInfo,
                FocusModeLoop: data.focusMode
            }
            // 发送到服务端
            chatIPCEvents.onSend({
                token: activeChat.id,
                type: "casual",
                params: chatMessage,
                extraValue: extra
            })

            Promise.resolve().then(() => {
                handleSendAfter?.()
            })
        } catch (error) {}
    })

    useEffect(() => {
        const konwledgeInputStringFn = (params: string) => {
            try {
                const data: PageNodeItemProps["pageParamsInfo"]["AIRepository"] = JSON.parse(params)
                onSetQuestion(data?.inputString ?? "")
            } catch (error) {}
        }
        emiter.on("konwledgeInputString", konwledgeInputStringFn)
        return () => {
            emiter.off("konwledgeInputString", konwledgeInputStringFn)
        }
    }, [])

    // #endregion

    const isShowRetract = useCreation(() => {
        return mode === "task" && showFreeChat
    }, [mode, showFreeChat])
    const isShowExpand = useCreation(() => {
        return mode === "task" && !showFreeChat
    }, [mode, showFreeChat])
    const handleSwitchShowFreeChat = useMemoizedFn((v) => {
        setShowFreeChat(v)
    })

    const onSetQuestion = useMemoizedFn((value: string) => {
        aiChatTextareaRef.current?.setValue(value ?? "")
    })
    return (
        <>
            <div
                className={classNames(styles["ai-re-act"], {
                    [styles["content-re-act-side"]]: isShowRetract,
                    [styles["content-re-act-side-hidden"]]: isShowExpand
                })}
            >
                <div
                    ref={wrapperRef}
                    className={classNames(styles["ai-re-act-chat"], {
                        [styles["ai-re-act-chat-hidden"]]: !showFreeChat
                    })}
                >
                    <div className={classNames(styles["chat-container"], chatContainerClassName)}>
                        <div className={classNames(styles["chat-header"], chatContainerHeaderClassName)}>
                            <div className={styles["chat-header-title"]}>
                                <ColorsChatIcon />
                                {title}
                                {focusMode && <YakitTag fullRadius={true}>专注模式:{focusMode}</YakitTag>}
                            </div>
                            <div className={styles["chat-header-extra"]}>
                                {isShowRetract && <ChevronleftButton onClick={() => handleSwitchShowFreeChat(false)} />}
                            </div>
                        </div>
                        <AIReActChatContents chats={casualChat} />
                    </div>
                    <div className={classNames(styles["chat-footer"])}>
                        <div className={styles["footer-body"]}>
                            <div className={styles["footer-inputs"]}>
                                {execute && questionQueue?.total > 0 && <AITaskQuery />}
                                <div className={classNames(styles["footer-inputs-file-list"])}>
                                    <AIChatTextarea
                                        ref={aiChatTextareaRef}
                                        loading={false}
                                        onSubmit={handleSubmit}
                                        extraFooterRight={
                                            <div className={styles["extra-footer-right"]}>
                                                <OpenFileDropdown
                                                    cb={(data) => {
                                                        aiChatTextareaRef.current?.setMention({
                                                            mentionId: data.path,
                                                            mentionType: data.isFolder ? "folder" : "file",
                                                            mentionName: data.path
                                                        })
                                                    }}
                                                >
                                                    <UploadFileButton title='打开文件夹' />
                                                </OpenFileDropdown>

                                                <div className={styles["extra-footer-right-divider"]} />
                                                {execute && (
                                                    <RoundedStopButton
                                                        onClick={handleStop}
                                                        style={{width: 24, height: 24}}
                                                    />
                                                )}
                                            </div>
                                        }
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className={styles["open-wrapper"]} onClick={() => handleSwitchShowFreeChat(true)}>
                    <ChevrondownButton />
                    <div className={styles["text"]}>自由对话</div>
                </div>
            </div>
        </>
    )
})
