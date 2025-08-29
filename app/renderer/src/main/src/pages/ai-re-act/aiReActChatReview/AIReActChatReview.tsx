import React, {useRef, useState} from "react"
import {AIReActChatReviewProps} from "./AIReActChatReviewType"
import classNames from "classnames"
import styles from "./AIReActChatReview.module.scss"
import {OutlineArrowrightIcon, OutlineHandIcon, OutlineWarpIcon, OutlineXIcon} from "@/assets/icon/outline"
import {useCreation, useMemoizedFn} from "ahooks"
import {SolidVariableIcon} from "@/assets/icon/solid"
import {AIChatMessage} from "@/pages/ai-agent/type/aiChat"
import {Input} from "antd"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {QSInputTextarea} from "@/pages/ai-agent/template/template"
import {yakitNotify} from "@/utils/notification"
import cloneDeep from "lodash/cloneDeep"

export const AIReActChatReview: React.FC<AIReActChatReviewProps> = React.memo((props) => {
    const {type, review, onSendAIRequire} = props

    const reviewTitle = useCreation(() => {
        switch (type) {
            case "toolReview":
                return {title: "工具审阅", subTitle: "请审核是否要继续执行？"}
            case "requireUser":
                return {title: "主动询问", subTitle: "请选择以下决策？"}
            default:
                return {title: "异常错误", subTitle: ""}
        }
    }, [type])
    const toolReview = useCreation(() => {
        if (type !== "toolReview") return null
        const {tool, tool_description, params} = review as AIChatMessage.ToolUseReviewRequire

        let paramsValue = "-"
        try {
            paramsValue = !!params ? JSON.stringify(params, null, 2) : "-"
        } catch (error) {}

        return (
            <div className={styles["review-task-tool-data"]}>
                <div className={styles["task-tool-info"]}>
                    <div className={styles["info-title"]}>{tool || "-"}</div>
                    <div className={styles["info-description"]}>{tool_description || "-"}</div>
                </div>

                <div className={styles["tool-params"]}>
                    <div className={styles["params-title"]}>
                        <SolidVariableIcon /> 参数
                    </div>
                    <div className={styles["params-content"]}>{paramsValue}</div>
                </div>
            </div>
        )
    }, [review])
    const aiRequireReview = useCreation(() => {
        if (type === "requireUser") {
            const data = review as AIChatMessage.AIReviewRequire
            const {prompt} = data
            return <div className={styles["ai-require-ask"]}>{prompt}</div>
        }
        return null
    }, [review])
    // #region 审阅选项-plan|task|tool相关逻辑
    const [editShow, setEditShow] = useState(false)
    const editInfo = useRef<AIChatMessage.ReviewSelector>()
    const [reviewQS, setReviewQS] = useState("")

    const handleCallbackEdit = useMemoizedFn((cb: boolean) => {
        if (cb && editInfo.current) {
            const {value, allow_extra_prompt} = editInfo.current
            const jsonInput: Record<string, string> = {suggestion: value}
            if (allow_extra_prompt && reviewQS) jsonInput.extra_prompt = reviewQS
            onSendAIRequire(JSON.stringify(jsonInput), (review as AIChatMessage.ToolUseReviewRequire).id)
        }
        editInfo.current = undefined
        setReviewQS("")
        setEditShow(false)
    })

    /** 继续执行 */
    const handleContinue = useMemoizedFn(() => {
        if (!isContinue) return
        const find = ((review as AIChatMessage.ToolUseReviewRequire)?.selectors || []).find(
            (item) => item.value === "continue"
        )
        if (!find) return
        const {value} = find
        const jsonInput: Record<string, string> = {suggestion: value}
        onSendAIRequire(JSON.stringify(jsonInput), (review as AIChatMessage.ToolUseReviewRequire).id)
    })

    const noAIOptions = useCreation(() => {
        if (!["toolReview"].includes(type)) {
            return null
        }
        const {selectors} = review as AIChatMessage.ToolUseReviewRequire
        const showList = (selectors || []).filter((item) => item.value !== "continue")

        return (
            <div className={styles["review-selectors-wrapper"]}>
                {showList.map((el) => {
                    return (
                        <YakitButton key={el.value} type='outline2' onClick={() => handleShowEdit(el)}>
                            {el.prompt || el.value}
                        </YakitButton>
                    )
                })}
            </div>
        )
    }, [review])
    const handleShowEdit = useMemoizedFn((info: AIChatMessage.ReviewSelector) => {
        switch (info.value) {
            case "freedom-review":
                break
            default:
                if (editShow) return
                if (!info.allow_extra_prompt) {
                    const jsonInput: Record<string, string> = {suggestion: info.value}
                    onSendAIRequire(JSON.stringify(jsonInput), (review as AIChatMessage.ToolUseReviewRequire).id)
                    return
                }
                editInfo.current = cloneDeep(info)
                setEditShow(true)
                break
        }
    })
    // #endregion

    // const aiRequireReview = useCreation(() => {
    //     const data = data as AIChatMessage.AIReviewRequire
    //     const {prompt} = data
    //     return <div className={styles["ai-require-ask"]}>{prompt}</div>
    // }, [review])
    // #region 审阅选项-AI交互用户相关逻辑
    const [requireLoading, setRequireLoading] = useState(false)
    const [requireQS, setRequireQS] = useState("")
    const isRequireQS = useCreation(() => {
        return !!(requireQS && requireQS.trim())
    }, [requireQS])

    const handleSubmit = useMemoizedFn(() => {})
    const handleAIRequireQSSend = useMemoizedFn(() => {
        console.log("handleAIRequireQSSend-review", review)
        if (!isRequireQS) {
            yakitNotify("error", "请输入一些细节信息")
            return
        }
        setRequireLoading(false)
        onSendAI(requireQS)
        setTimeout(() => {
            setRequireLoading(false)
            setRequireQS("")
        }, 300)
    })
    const handleAIRequireOpSend = useMemoizedFn((info: AIChatMessage.AIRequireOption) => {
        const jsonInput: Record<string, string> = {suggestion: info.prompt || info.prompt_title}
        onSendAI(JSON.stringify(jsonInput))
    })
    const aiOptionsLength = useCreation(() => {
        if (type !== "requireUser") return 0

        try {
            const {options} = review as AIChatMessage.AIReviewRequire
            if (!options || options.length === 0) return 0
            return options.length
        } catch (error) {
            return 0
        }
    }, [review])
    const aiOptions = useCreation(() => {
        if (type !== "requireUser") {
            return null
        }
        const {options} = review as AIChatMessage.AIReviewRequire

        if (!options || options.length === 0)
            return (
                <div className={styles["ai-require-input"]}>
                    <QSInputTextarea
                        className={styles["textarea-style"]}
                        placeholder='请告诉我更多信息...'
                        value={requireQS}
                        onChange={(e) => setRequireQS(e.target.value)}
                    />
                </div>
            )

        return (
            <>
                {(options || []).map((el) => {
                    if (!el.prompt && !el.prompt_title) return null
                    return (
                        <YakitButton key={el.prompt} type='outline2' onClick={() => handleAIRequireOpSend(el)}>
                            {el.prompt || el.prompt_title}
                        </YakitButton>
                    )
                })}
            </>
        )
    }, [review, requireQS])

    //#endregion
    // 是否显示继续执行按钮
    const isContinue = useCreation(() => {
        if (type === "requireUser") return false

        if (!review) return
        const {selectors} = review as AIChatMessage.ToolUseReviewRequire
        if (!selectors || !Array.isArray(selectors) || selectors.length === 0) return false

        const findIndex = (review as AIChatMessage.ToolUseReviewRequire).selectors.findIndex(
            (item) => item.value === "continue"
        )
        return findIndex !== -1
    }, [review])
    const onSendAI = useMemoizedFn((value: string) => {
        switch (type) {
            case "toolReview":
                onSendAIRequire(value, (review as AIChatMessage.ToolUseReviewRequire).id)
                break
            case "requireUser":
                onSendAIRequire(value, (review as AIChatMessage.AIReviewRequire).id)
                break

            default:
                break
        }
    })
    return (
        <div className={classNames(styles["review-content"])}>
            <div className={styles["review-header"]}>
                <OutlineHandIcon />
                <div className={styles["title-style"]}>{reviewTitle.title || "异常错误"}</div>
                <div className={styles["sub-title-style"]}>{reviewTitle.subTitle || ""}</div>
            </div>

            <div className={styles["review-container"]}>
                <>
                    <div className={styles["review-data"]}>
                        {toolReview}
                        {aiRequireReview}
                    </div>
                    <div className={styles["reivew-options"]}>
                        {aiOptions}
                        {!!noAIOptions &&
                            (editShow ? (
                                <div className={styles["review-input"]}>
                                    <Input.TextArea
                                        bordered={false}
                                        placeholder={editInfo.current?.prompt || "请输入..."}
                                        value={reviewQS}
                                        autoSize={{minRows: 4, maxRows: 4}}
                                        onChange={(e) => setReviewQS(e.target.value)}
                                    />

                                    <div className={styles["question-footer"]}>
                                        <div className={styles["extra-btns"]}>
                                            <YakitButton
                                                className={styles["btn-style"]}
                                                type='outline2'
                                                icon={<OutlineXIcon />}
                                                onClick={() => handleCallbackEdit(false)}
                                            />
                                            <YakitButton
                                                className={styles["btn-style"]}
                                                icon={<OutlineArrowrightIcon />}
                                                onClick={() => handleCallbackEdit(true)}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                noAIOptions
                            ))}
                    </div>
                </>
            </div>

            <div className={styles["review-footer"]}>
                <div className={styles["btn-group"]}>
                    {isContinue && (
                        <>
                            <YakitButton onClick={handleContinue}>
                                继续执行
                                <OutlineWarpIcon />
                            </YakitButton>
                        </>
                    )}
                    {type === "requireUser" && !aiOptionsLength && (
                        <YakitButton disabled={!isRequireQS} loading={requireLoading} onClick={handleAIRequireQSSend}>
                            提交
                        </YakitButton>
                    )}
                </div>
            </div>
        </div>
    )
})
