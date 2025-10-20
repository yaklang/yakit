import React, {ReactNode, useEffect, useRef, useState} from "react"
import {AIReActChatReviewProps, ForgeReviewFormProps} from "./AIReActChatReviewType"
import {OutlineArrowrightIcon, OutlineHandIcon, OutlineWarpIcon, OutlineXIcon} from "@/assets/icon/outline"
import {useCountDown, useCreation, useMemoizedFn} from "ahooks"
import {SolidAnnotationIcon, SolidVariableIcon} from "@/assets/icon/solid"
import {Form, Input} from "antd"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {yakitNotify} from "@/utils/notification"
import cloneDeep from "lodash/cloneDeep"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"
import AIPlanReviewTree from "@/pages/ai-agent/aiPlanReviewTree/AIPlanReviewTree"
import {handleFlatAITree} from "../../../ai-re-act/hooks/utils"
import {reviewListToTrees} from "@/pages/ai-agent/utils"
import {grpcGetAIForge} from "@/pages/ai-agent/grpc"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {YakParamProps} from "@/pages/plugins/pluginsType"
import {ExecuteEnterNodeByPluginParams} from "@/pages/plugins/operator/localPluginExecuteDetailHeard/LocalPluginExecuteDetailHeard"
import {CustomPluginExecuteFormValue} from "@/pages/plugins/operator/localPluginExecuteDetailHeard/LocalPluginExecuteDetailHeardType"
import {getValueByType} from "@/pages/plugins/editDetails/utils"
import {AIAgentGrpcApi} from "../../../ai-re-act/hooks/grpcApi"

import classNames from "classnames"
import styles from "./AIReActChatReview.module.scss"
import {AIChatIPCSendParams} from "@/pages/ai-agent/useContext/ChatIPCContent/ChatIPCContent"
import {OutlineHandleColorsIcon, OutlineWarpColorsIcon} from "@/assets/icon/colors"
import useChatIPCStore from "@/pages/ai-agent/useContext/ChatIPCContent/useStore"
import {AIReviewType} from "../../../ai-re-act/hooks/aiRender"
import {AIForge} from "@/pages/ai-agent/type/forge"

export const AIReActChatReview: React.FC<AIReActChatReviewProps> = React.memo((props) => {
    const {
        info: {type, data: review},
        onSendAI,
        planReviewTreeKeywordsMap,
        isEmbedded,
        renderFooterExtra,
        expand,
        className
    } = props
    const {chatIPCData} = useChatIPCStore()
    const [reviewTreeOption, setReviewTreeOption] = useState<AIAgentGrpcApi.ReviewSelector>()
    const [reviewTrees, setReviewTrees] = useState<AIAgentGrpcApi.PlanTask[]>([])
    const [currentPlansId, setCurrentPlansId] = useState<string>("")
    const initReviewTreesRef = useRef<AIAgentGrpcApi.PlanTask[]>([])

    useEffect(() => {
        switch (type) {
            case "plan_review_require":
                const data = review as AIAgentGrpcApi.PlanReviewRequire
                const list: AIAgentGrpcApi.PlanTask[] = []
                handleFlatAITree(list, data.plans.root_task)
                initReviewTreesRef.current = [...list]
                setReviewTrees(list)
                setCurrentPlansId(data.plans_id)
                break
            case "require_user_interactive":
                const {options} = review as AIAgentGrpcApi.AIReviewRequire
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
    //#region ai评分
    const [targetDate, setTargetDate] = useState<number>()
    const [countdown] = useCountDown({
        targetDate
    })
    useEffect(() => {
        if (!chatIPCData.execute) return
        const data = review as AIAgentGrpcApi.ToolUseReviewRequire
        if (!!data?.aiReview?.seconds) {
            setTargetDate(Date.now() + data.aiReview.seconds * 1000)
        }
    }, [review, chatIPCData.execute])
    //#endregion
    const reviewTitle = useCreation(() => {
        const subTitle = !!countdown ? (
            <>
                <span className={styles["ai-countdown"]}>{Math.round(countdown / 1000)}s</span>
                <span>后将自动执行</span>
            </>
        ) : (
            <></>
        )
        let title = "异常错误"
        switch (type) {
            case "tool_use_review_require":
                title = "工具调用"
                break
            case "require_user_interactive":
                title = "主动询问"
                break
            case "plan_review_require":
                title = "计划审阅"
                break
            case "task_review_require":
                title = "任务审阅"
                break
            case "exec_aiforge_review_require":
                title = "启动智能应用"
                break
            default:
                break
        }
        return {title: <span>{title}</span>, subTitle}
    }, [type, countdown])
    const toolReview = useCreation(() => {
        if (type !== "tool_use_review_require") return null
        const {tool, tool_description, params} = review as AIAgentGrpcApi.ToolUseReviewRequire
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
    const forgeReview = useCreation(() => {
        if (type !== "exec_aiforge_review_require") return null
        const data = review as AIAgentGrpcApi.ExecForgeReview
        return <ForgeReviewForm {...data} />
    }, [review])
    const aiRequireReview = useCreation(() => {
        if (type === "require_user_interactive") {
            const data = review as AIAgentGrpcApi.AIReviewRequire
            const {prompt} = data
            return <div className={styles["ai-require-ask"]}>{prompt}</div>
        }
        return null
    }, [review])

    const taskReview = useCreation(() => {
        if (type === "task_review_require") {
            const data = review as AIAgentGrpcApi.TaskReviewRequire
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
    const editInfo = useRef<AIAgentGrpcApi.ReviewSelector>()
    const [reviewQS, setReviewQS] = useState("")

    const handleCallbackEdit = useMemoizedFn((cb: boolean) => {
        if (cb && editInfo.current) {
            const {value, allow_extra_prompt} = editInfo.current
            const jsonInput: Record<string, string> = {suggestion: value}
            if (allow_extra_prompt && reviewQS) jsonInput.extra_prompt = reviewQS
            onSendAIByValue(JSON.stringify(jsonInput), value)
        }
        editInfo.current = undefined
        setReviewQS("")
        setEditShow(false)
    })

    /** 继续执行 */
    const handleContinue = useMemoizedFn(() => {
        if (!isContinue) return
        const find = ((review as AIAgentGrpcApi.ToolUseReviewRequire)?.selectors || []).find(
            (item) => item.value === "continue"
        )
        if (!find) return
        const {value} = find
        const jsonInput: Record<string, string> = {suggestion: value}
        onSendAIByValue(JSON.stringify(jsonInput), value)
    })

    const noAIOptionsList = useCreation(() => {
        const {selectors} = review as AIAgentGrpcApi.ToolUseReviewRequire
        const allowShowInput: AIAgentGrpcApi.ReviewSelector[] = []
        const showButton: AIAgentGrpcApi.ReviewSelector[] = []
        if (
            [
                "tool_use_review_require",
                "plan_review_require",
                "task_review_require",
                "exec_aiforge_review_require"
            ].includes(type)
        ) {
            selectors
                ?.filter((item) => item.value !== "continue")
                ?.forEach((el) => {
                    if (el.allow_extra_prompt) {
                        allowShowInput.push(el)
                    } else {
                        showButton.push(el)
                    }
                })
        }
        return {allowShowInput, showButton}
    }, [review])

    const noAIOptionsAllowShowInput = useCreation(() => {
        return (
            !!noAIOptionsList.allowShowInput.length && (
                <div className={styles["review-selectors-wrapper"]}>
                    {noAIOptionsList.allowShowInput.map((el) => {
                        return (
                            <YakitButton
                                key={el.value}
                                type='outline2'
                                onClick={() => handleShowEdit(el)}
                                radius={true}
                            >
                                {el.prompt || el.value}
                            </YakitButton>
                        )
                    })}
                </div>
            )
        )
    }, [noAIOptionsList.allowShowInput])
    const handleShowEdit = useMemoizedFn((info: AIAgentGrpcApi.ReviewSelector) => {
        switch (info.value) {
            case "freedom-review":
                setReviewTreeOption(info)
                break
            default:
                if (editShow) return
                if (!info.allow_extra_prompt) {
                    const jsonInput: Record<string, string> = {suggestion: info.value}
                    onSendAIByValue(JSON.stringify(jsonInput), info.value)
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
        onSendAIByValue(JSON.stringify(jsonInput))
    })
    /**审阅模式提交树,type: plan_review_require */
    const handleSubmitReviewTree = useMemoizedFn(() => {
        if (!!reviewTreeOption) {
            const tree = reviewListToTrees(reviewTrees)
            const jsonInput = {
                suggestion: reviewTreeOption.value,
                "reviewed-task-tree": tree[0]
            }
            onSendAIByValue(JSON.stringify(jsonInput), reviewTreeOption.value)
        }
    })
    const aiOptionsLength = useCreation(() => {
        if (type !== "require_user_interactive") return 0

        try {
            const {options} = review as AIAgentGrpcApi.AIReviewRequire
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
        const {options} = review as AIAgentGrpcApi.AIReviewRequire
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
                                radius={true}
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
        const {selectors} = review as AIAgentGrpcApi.ToolUseReviewRequire
        if (!selectors || !Array.isArray(selectors) || selectors.length === 0) return false

        const findIndex = (review as AIAgentGrpcApi.ToolUseReviewRequire).selectors.findIndex(
            (item) => item.value === "continue"
        )
        return findIndex !== -1
    }, [review])
    const onSendAIByValue = useMemoizedFn((value: string, selectBtnValue?: string) => {
        const params: AIChatIPCSendParams = {
            value,
            id: (review as AIReviewType).id,
            selectBtnValue
        }
        onSendAI(params)
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
                                {!!noAIOptionsList.showButton.length && (
                                    <div className={styles["review-selectors-showButton-wrapper"]}>
                                        {noAIOptionsList.showButton.map((el) => {
                                            return (
                                                <YakitButton
                                                    key={el.value}
                                                    type='outline2'
                                                    onClick={() => handleShowEdit(el)}
                                                >
                                                    {el.prompt || el.value}
                                                </YakitButton>
                                            )
                                        })}
                                    </div>
                                )}
                                <button className={styles["continue-btn"]} onClick={handleContinue}>
                                    立即执行
                                    <OutlineWarpColorsIcon />
                                </button>
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
    }, [isContinue, reviewTreeOption, type, aiOptionsLength, isRequireQS, requireLoading, noAIOptionsList.showButton])

    const reviewHeardExtra = useCreation(() => {
        let node: ReactNode = <></>
        switch (type) {
            case "tool_use_review_require":
            case "exec_aiforge_review_require":
                /**NOTE 定义问题 */
                const toolReviewData = review as AIAgentGrpcApi.ToolUseReviewRequire
                if (!!toolReviewData.aiReview) {
                    const {interactive_id, score, level} = toolReviewData.aiReview
                    node = (
                        <>
                            {!!interactive_id && !score && !countdown && <div>评估中...</div>}
                            {!!score && (
                                <div>
                                    AI&nbsp;&nbsp;风险评分&nbsp;&nbsp;
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
                        <div className={styles["title-style"]}>
                            <OutlineHandleColorsIcon className={styles["hand-colors-icon"]} />
                            {reviewTitle.title}
                        </div>
                        <div className={styles["sub-title-style"]}>{reviewTitle.subTitle}</div>
                    </div>
                    <div className={styles["review-header-extra"]}>{reviewHeardExtra}</div>
                </div>
                <div className={styles["review-container"]}>
                    <>
                        <div className={styles["review-data"]}>
                            {planReview}
                            {taskReview}
                            {toolReview}
                            {forgeReview}
                            {aiRequireReview}
                        </div>
                        {!reviewTreeOption && (aiOptions || noAIOptionsAllowShowInput) ? (
                            <div className={styles["reivew-options"]}>
                                {aiOptions}
                                {!!noAIOptionsAllowShowInput &&
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
                                                        radius={true}
                                                    />
                                                    <YakitButton
                                                        className={styles["btn-style"]}
                                                        icon={<OutlineArrowrightIcon />}
                                                        onClick={() => handleCallbackEdit(true)}
                                                        radius={true}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        noAIOptionsAllowShowInput
                                    ))}
                            </div>
                        ) : null}
                    </>
                </div>
                {isEmbedded && <div className={styles["review-footer"]}>{footerNode}</div>}
            </div>
            {renderFooterExtra && renderFooterExtra(footerNode)}
        </>
    )
})

const handleFetchParams = (jsonValue: string) => {
    try {
        const parseValue = JSON.parse(jsonValue)
        if (Array.isArray(parseValue)) {
            return parseValue as YakParamProps[]
        } else {
            return handleFetchParams(parseValue as string)
        }
    } catch (error) {
        return []
    }
}
const ForgeReviewForm: React.FC<ForgeReviewFormProps> = React.memo((props) => {
    const {forge_name, forge_verbose_name, forge_desc, forge_params} = props
    const [loading, setLoading] = useState<boolean>(false)
    const [forge, setForge] = useState<AIForge>()
    const [form] = Form.useForm()

    useEffect(() => {
        getGrpcGetAIForge()
    }, [forge_name])
    const getGrpcGetAIForge = useMemoizedFn(() => {
        setLoading(true)
        grpcGetAIForge({ForgeName: forge_name})
            .then(setForge)
            .finally(() =>
                setTimeout(() => {
                    setLoading(false)
                }, 200)
            )
    })
    const params: YakParamProps[] = useCreation(() => {
        if (!forge) return []
        const {ParamsUIConfig} = forge

        if (!ParamsUIConfig) {
            return [
                {
                    Field: "query",
                    FieldVerbose: "query",
                    TypeVerbose: "text",
                    DefaultValue: forge_params["query"] || "",
                    Help: ""
                }
            ]
        }
        try {
            const param: YakParamProps[] = handleFetchParams(ParamsUIConfig)
            return param
        } catch (error) {
            return []
        }
    }, [forge, forge_params])
    useEffect(() => {
        if (!params) return
        initRequiredFormValue()
    }, [params])
    const initRequiredFormValue = useMemoizedFn(() => {
        if (!params) return
        // 必填参数
        let initRequiredFormValue: CustomPluginExecuteFormValue = {}
        params.forEach((ele) => {
            const value = getValueByType(ele.DefaultValue, ele.TypeVerbose)
            initRequiredFormValue = {
                ...initRequiredFormValue,
                [ele.Field]: value
            }
        })
        if (!form) return
        form.resetFields()
        form.setFieldsValue({...initRequiredFormValue})
    })
    return (
        <YakitSpin spinning={loading} tip='加载中...'>
            <div className={styles["forge-wrapper"]}>
                <div className={styles["forge-header"]}>
                    <div className={styles["name"]}>
                        {forge?.ForgeVerboseName || forge_verbose_name || forge?.ForgeName || forge_name}
                    </div>
                    <div className={styles["description"]}>描述:{forge?.Description || forge_desc}</div>
                </div>
                <div className={classNames(styles["forge-form-body"])}>
                    {params?.length > 1 && (
                        <div className={styles["forge-form-heard"]}>
                            <SolidVariableIcon />
                            参数组
                        </div>
                    )}
                    <div
                        className={classNames({
                            [styles["forge-form-more"]]: params?.length > 1
                        })}
                    >
                        <Form
                            form={form}
                            labelWrap={true}
                            validateMessages={{
                                /* eslint-disable no-template-curly-in-string */
                                required: "${label} 是必填字段"
                            }}
                            disabled={true}
                            layout='vertical'
                        >
                            {params && (
                                <ExecuteEnterNodeByPluginParams
                                    paramsList={params}
                                    pluginType={"yak"}
                                    isExecuting={false}
                                />
                            )}
                        </Form>
                    </div>
                </div>
            </div>
        </YakitSpin>
    )
})
