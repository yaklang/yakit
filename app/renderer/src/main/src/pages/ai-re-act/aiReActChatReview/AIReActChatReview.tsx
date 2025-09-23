import React, {ReactNode, useEffect, useRef, useState} from "react"
import {AIReActChatReviewProps} from "./AIReActChatReviewType"
import classNames from "classnames"
import styles from "./AIReActChatReview.module.scss"
import {OutlineArrowrightIcon, OutlineHandIcon, OutlineWarpIcon, OutlineXIcon} from "@/assets/icon/outline"
import {useCountDown, useCreation, useMemoizedFn} from "ahooks"
import {SolidAnnotationIcon, SolidVariableIcon} from "@/assets/icon/solid"
import {AIChatMessage} from "@/pages/ai-agent/type/aiChat"
import {Input} from "antd"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {yakitNotify} from "@/utils/notification"
import cloneDeep from "lodash/cloneDeep"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"
import AIPlanReviewTree from "@/pages/ai-agent/aiPlanReviewTree/AIPlanReviewTree"
import {handleFlatAITree} from "../hooks/utils"
import {reviewListToTrees} from "@/pages/ai-agent/utils"

export const AIReActChatReview: React.FC<AIReActChatReviewProps> = React.memo((props) => {
    const {type, review, onSendAI, planReviewTreeKeywordsMap, isEmbedded, renderFooterExtra, expand, className} = props

    const [reviewTreeOption, setReviewTreeOption] = useState<AIChatMessage.ReviewSelector>()
    const [reviewTrees, setReviewTrees] = useState<AIChatMessage.PlanTask[]>([])
    const [currentPlansId, setCurrentPlansId] = useState<string>("")
    const initReviewTreesRef = useRef<AIChatMessage.PlanTask[]>([])

    useEffect(() => {
        switch (type) {
            case "plan_review_require":
                const data = review as AIChatMessage.PlanReviewRequire
                const list: AIChatMessage.PlanTask[] = []
                handleFlatAITree(list, data.plans.root_task)
                initReviewTreesRef.current = [...list]
                setReviewTrees(list)
                setCurrentPlansId(data.plans_id)
                break
            case "require_user_interactive":
                const {options} = review as AIChatMessage.AIReviewRequire
                if (options && options.length > 0) {
                    const value = options[0].prompt || options[0].prompt_title
                    setRequireQS(value ? `${value}:` : "")
                    setAIOptionsSelect(value)
                }
                break
            default:
                break
        }
    }, [type, review])
    const reviewTitle = useCreation(() => {
        switch (type) {
            case "tool_use_review_require":
                return {title: "工具审阅", subTitle: "请审核是否要继续执行？"}
            case "require_user_interactive":
                return {title: "主动询问", subTitle: "请选择以下决策？"}
            case "plan_review_require":
                return {title: "计划审阅", subTitle: "请审核是否要按以下计划继续执行？"}
            case "task_review_require":
                return {title: "任务审阅", subTitle: "请审核是否要继续执行任务？"}
            default:
                return {title: "异常错误", subTitle: ""}
        }
    }, [type])
    const toolReview = useCreation(() => {
        if (type !== "tool_use_review_require") return null
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
        if (type === "require_user_interactive") {
            const data = review as AIChatMessage.AIReviewRequire
            const {prompt} = data
            return <div className={styles["ai-require-ask"]}>{prompt}</div>
        }
        return null
    }, [review])

    const taskReview = useCreation(() => {
        if (type === "task_review_require") {
            const data = review as AIChatMessage.TaskReviewRequire
            const {task, short_summary, long_summary} = data
            return (
                <div className={styles["review-task-tool-data"]}>
                    <div className={styles["task-tool-info"]}>
                        <div className={styles["info-title"]}>{task?.name || ""}</div>
                        <div className={styles["info-description"]}>{task?.goal || ""}</div>
                    </div>

                    <div className={styles["task-summary"]}>
                        <div className={styles["summary-header"]}>
                            <SolidAnnotationIcon /> Summary
                        </div>
                        <div className={styles["summary-content"]}>{short_summary}</div>
                        <div className={styles["summary-detail"]}>
                            <YakitPopover
                                overlayStyle={{paddingBottom: 4}}
                                overlayClassName={styles["task-review-summary-popover"]}
                                content={
                                    <div className={styles["task-long-summary"]}>
                                        <div className={styles["summary-header"]}>
                                            <SolidAnnotationIcon /> Summary
                                        </div>
                                        <div className={styles["summary-content"]}>{long_summary}</div>
                                    </div>
                                }
                            >
                                <div className={styles["detail-style"]}>详细信息</div>
                            </YakitPopover>
                        </div>
                    </div>
                </div>
            )
        }
        return null
    }, [review])
    const planReview = useCreation(() => {
        if (reviewTrees.length > 0) {
            const list = !!reviewTreeOption ? reviewTrees : initReviewTreesRef.current
            return (
                <AIPlanReviewTree
                    defaultList={initReviewTreesRef.current}
                    list={list}
                    setList={setReviewTrees}
                    editable={!!reviewTreeOption}
                    planReviewTreeKeywordsMap={planReviewTreeKeywordsMap || new Map()}
                    currentPlansId={currentPlansId}
                />
            )
        }
        return null
    }, [reviewTrees, reviewTreeOption, planReviewTreeKeywordsMap, currentPlansId])

    // #region 审阅选项-plan|task|tool相关逻辑
    const [editShow, setEditShow] = useState(false)
    const editInfo = useRef<AIChatMessage.ReviewSelector>()
    const [reviewQS, setReviewQS] = useState("")

    const handleCallbackEdit = useMemoizedFn((cb: boolean) => {
        if (cb && editInfo.current) {
            const {value, allow_extra_prompt} = editInfo.current
            const jsonInput: Record<string, string> = {suggestion: value}
            if (allow_extra_prompt && reviewQS) jsonInput.extra_prompt = reviewQS
            onSendAI(JSON.stringify(jsonInput), (review as AIChatMessage.ToolUseReviewRequire).id)
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
        onSendAI(JSON.stringify(jsonInput), (review as AIChatMessage.ToolUseReviewRequire).id)
    })

    const noAIOptions = useCreation(() => {
        if (!["tool_use_review_require", "plan_review_require", "task_review_require"].includes(type)) {
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
                setReviewTreeOption(info)
                break
            default:
                if (editShow) return
                if (!info.allow_extra_prompt) {
                    const jsonInput: Record<string, string> = {suggestion: info.value}
                    onSendAI(JSON.stringify(jsonInput), (review as AIChatMessage.ToolUseReviewRequire).id)
                    return
                }
                editInfo.current = cloneDeep(info)
                setEditShow(true)
                break
        }
    })
    // #endregion

    // #region 审阅选项-AI交互用户相关逻辑
    const [requireLoading, setRequireLoading] = useState(false)
    const [requireQS, setRequireQS] = useState("")
    const [aiOptionsSelect, setAIOptionsSelect] = useState<string>()

    const isRequireQS = useCreation(() => {
        return !!(requireQS && requireQS.trim())
    }, [requireQS])

    const handleAIRequireQSSend = useMemoizedFn(() => {
        if (!isRequireQS) {
            yakitNotify("error", "请输入一些细节信息")
            return
        }
        setRequireLoading(false)
        handleAIRequireOpSend(requireQS)
        setTimeout(() => {
            setRequireLoading(false)
            setRequireQS("")
        }, 300)
    })
    const handleAIRequireOpSend = useMemoizedFn((qs: string) => {
        const jsonInput: Record<string, string> = {suggestion: qs}
        onSendAIByType(JSON.stringify(jsonInput))
    })
    /**审阅模式提交树,type: plan_review_require */
    const handleSubmitReviewTree = useMemoizedFn(() => {
        if (!!reviewTreeOption) {
            const tree = reviewListToTrees(reviewTrees)
            const jsonInput = {
                suggestion: reviewTreeOption.value,
                "reviewed-task-tree": tree[0]
            }
            onSendAIByType(JSON.stringify(jsonInput))
        }
    })
    const aiOptionsLength = useCreation(() => {
        if (type !== "require_user_interactive") return 0

        try {
            const {options} = review as AIChatMessage.AIReviewRequire
            if (!options || options.length === 0) return 0
            return options.length
        } catch (error) {
            return 0
        }
    }, [review])
    const onSetAIOptionsSelect = useMemoizedFn((value?: string) => {
        setAIOptionsSelect(value)
        setRequireQS(value ? `${value}:` : "")
    })
    const aiOptions = useCreation(() => {
        if (type !== "require_user_interactive") {
            return null
        }
        const {options} = review as AIChatMessage.AIReviewRequire
        return (
            <>
                <div className={styles["ai-require-btns-wrapper"]}>
                    {(options || []).map((ele) => {
                        const isHover = aiOptionsSelect === (ele.prompt || ele.prompt_title)
                        return (
                            <YakitButton
                                key={ele.prompt || ele.prompt_title}
                                type='outline2'
                                onClick={() => onSetAIOptionsSelect(ele.prompt || ele.prompt_title)}
                                isHover={isHover}
                            >
                                {ele.prompt || ele.prompt_title}
                            </YakitButton>
                        )
                    })}
                </div>
                <div className={styles["ai-require-input"]}>
                    <Input.TextArea
                        bordered={false}
                        placeholder='请告诉我更多信息...'
                        autoSize={{minRows: 4, maxRows: 4}}
                        value={requireQS}
                        onChange={(e) => setRequireQS(e.target.value)}
                    />
                </div>
            </>
        )
    }, [review, requireQS, aiOptionsSelect])
    //#endregion
    // 是否显示继续执行按钮
    const isContinue = useCreation(() => {
        if (type === "require_user_interactive") return false

        if (!review) return
        const {selectors} = review as AIChatMessage.ToolUseReviewRequire
        if (!selectors || !Array.isArray(selectors) || selectors.length === 0) return false

        const findIndex = (review as AIChatMessage.ToolUseReviewRequire).selectors.findIndex(
            (item) => item.value === "continue"
        )
        return findIndex !== -1
    }, [review])
    const onSendAIByType = useMemoizedFn((value: string) => {
        switch (type) {
            case "tool_use_review_require":
                onSendAI(value, (review as AIChatMessage.ToolUseReviewRequire).id)
                break
            case "require_user_interactive":
                onSendAI(value, (review as AIChatMessage.AIReviewRequire).id)
                break
            case "plan_review_require":
                onSendAI(value, (review as AIChatMessage.PlanReviewRequire).id)
                break
            case "task_review_require":
                onSendAI(value, (review as AIChatMessage.TaskReviewRequire).id)
                break
            default:
                break
        }
    })

    const footerNode = useCreation(() => {
        return (
            <div className={styles["btn-group"]}>
                {isContinue && (
                    <>
                        {!!reviewTreeOption ? (
                            <>
                                <YakitButton type='outline2' onClick={() => setReviewTreeOption(undefined)}>
                                    取消
                                </YakitButton>
                                <YakitButton type='primary' onClick={handleSubmitReviewTree}>
                                    提交
                                </YakitButton>
                            </>
                        ) : (
                            <>
                                <YakitButton onClick={handleContinue}>
                                    继续执行
                                    <OutlineWarpIcon />
                                </YakitButton>
                            </>
                        )}
                    </>
                )}
                {type === "require_user_interactive" && (
                    <YakitButton disabled={!isRequireQS} loading={requireLoading} onClick={handleAIRequireQSSend}>
                        提交
                    </YakitButton>
                )}
            </div>
        )
    }, [isContinue, reviewTreeOption, type, aiOptionsLength, isRequireQS, requireLoading])
    //#region ai评分
    const [targetDate, setTargetDate] = useState<number>()
    const [countdown] = useCountDown({
        targetDate
    })
    useEffect(() => {
        const data = review as AIChatMessage.ToolUseReviewRequire
        if (!!data?.aiReview?.seconds) {
            setTargetDate(Date.now() + data.aiReview.seconds * 1000)
        }
    }, [review])
    //#endregion
    const reviewHeardExtra = useCreation(() => {
        let node: ReactNode = <></>
        switch (type) {
            case "tool_use_review_require":
                const toolReviewData = review as AIChatMessage.ToolUseReviewRequire
                if (!!toolReviewData.aiReview) {
                    const {interactive_id, score, level} = toolReviewData.aiReview
                    node = (
                        <>
                            {!!interactive_id && (!score || !countdown) && <div>AI正在评分中...</div>}
                            {!!score && (
                                <div>
                                    AI风险评分:
                                    <span
                                        className={classNames(styles["ai-countdown"], {
                                            [styles["ai-score-low"]]: level === "low",
                                            [styles["ai-score-middle"]]: level === "middle",
                                            [styles["ai-score-high"]]: level === "high"
                                        })}
                                    >
                                        {toolReviewData.aiReview.score || 0}
                                    </span>
                                </div>
                            )}

                            {!!countdown && (
                                <div>
                                    倒计时:
                                    <span className={styles["ai-countdown"]}>{Math.round(countdown / 1000)}s</span>
                                </div>
                            )}
                        </>
                    )
                }

                break

            default:
                break
        }
        return node
    }, [type, review, countdown])

    return (
        <>
            <div
                className={classNames(
                    styles["review-content"],
                    {
                        [styles["review-content-hidden"]]: !expand
                    },
                    className || ""
                )}
            >
                <div className={styles["review-header"]}>
                    <div className={styles["review-header-title"]}>
                        <OutlineHandIcon />
                        <div className={styles["title-style"]}>{reviewTitle.title || "异常错误"}</div>
                        <div className={styles["sub-title-style"]}>{reviewTitle.subTitle || ""}</div>
                    </div>
                    <div className={styles["review-header-extra"]}>{reviewHeardExtra}</div>
                </div>
                <div className={styles["review-container"]}>
                    <>
                        <div className={styles["review-data"]}>
                            {planReview}
                            {taskReview}
                            {toolReview}
                            {aiRequireReview}
                        </div>
                        {!reviewTreeOption && (
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
                        )}
                    </>
                </div>
                {isEmbedded && <div className={styles["review-footer"]}>{footerNode}</div>}
            </div>
            {renderFooterExtra && renderFooterExtra(footerNode)}
        </>
    )
})
