import React, {memo, useEffect, useMemo, useRef, useState} from "react"
import {AIForgeFormProps, AIForgeInfoOptProps, AIToolFormProps} from "./type"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"
import {SolidToolIcon} from "@/assets/icon/solid"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {OutlineChevrondownIcon, OutlineXIcon} from "@/assets/icon/outline"
import {YakitTagColor} from "@/components/yakitUI/YakitTag/YakitTagType"
import {useMemoizedFn, useSize} from "ahooks"
import {Form} from "antd"
import {ExecuteEnterNodeByPluginParams} from "@/pages/plugins/operator/localPluginExecuteDetailHeard/LocalPluginExecuteDetailHeard"
import {YakParamProps} from "@/pages/plugins/pluginsType"
import {getValueByType, getYakExecutorParam} from "@/pages/plugins/editDetails/utils"
import {QSInputTextarea} from "../template/template"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {yakitNotify} from "@/utils/notification"
import {CustomPluginExecuteFormValue} from "@/pages/plugins/operator/localPluginExecuteDetailHeard/LocalPluginExecuteDetailHeardType"
import {AIStartParams} from "@/pages/ai-re-act/hooks/grpcApi"

import classNames from "classnames"
import styles from "./AITriageChatTemplate.module.scss"
import {AIModelSelect} from "../aiModelList/aiModelSelect/AIModelSelect"
import AIReviewRuleSelect from "@/pages/ai-re-act/aiReviewRuleSelect/AIReviewRuleSelect"

/** @name 可选择的 forge 模块选项 */
export const AIForgeInfoOpt: React.FC<AIForgeInfoOptProps> = memo((props) => {
    const {info, activeForge, onClick} = props

    const isActive = useMemo(() => {
        if (!activeForge) return false
        return activeForge.ForgeName === info.ForgeName && activeForge.Id === info.Id
    }, [info, activeForge])

    const tools = useMemo(() => {
        if (!info?.ToolNames) return []
        return info?.ToolNames.filter(Boolean)
    }, [info?.ToolNames])

    /** forge 里 tag 的随机颜色集合 */
    const forgeTagColors = useRef<YakitTagColor[]>([
        "blue",
        "bluePurple",
        "cyan",
        "green",
        "info",
        "purple",
        "success",
        "warning",
        "yellow"
    ])

    const tags = useMemo(() => {
        if (!info?.Tag) return []
        return info?.Tag.map((tag) => {
            return {
                value: tag,
                color: forgeTagColors.current[Math.floor(Math.random() * forgeTagColors.current.length)]
            }
        })
    }, [info?.Tag])

    const [toolsShow, setToolsShow] = useState(false)

    const handleClick = useMemoizedFn(() => {
        onClick && onClick(info)
        setToolsShow(false)
    })

    return (
        <div
            className={classNames(styles["forge-info-opt"], {[styles["forge-info-active-opt"]]: isActive})}
            onClick={handleClick}
        >
            <div
                className={classNames(styles["forge-name"], "yakit-content-single-ellipsis")}
                title={info.ForgeName || ""}
            >
                {info.ForgeName || ""}
            </div>

            <div className={styles["forge-info"]}>
                <div
                    className={classNames(styles["info-description"], "yakit-content-multiLine-ellipsis")}
                    title={info.Description || ""}
                >
                    {info.Description || ""}
                </div>

                <div className={styles["info-footer"]}>
                    {tools.length > 0 && (
                        <YakitPopover
                            placement='bottomLeft'
                            overlayClassName={styles["forge-info-opt-tools-popover"]}
                            content={
                                <div className={styles["tools-popover-content"]}>
                                    <div className={styles["tools-header"]}>模板关联工具</div>
                                    <div className={styles["tools-list"]}>
                                        {tools.map((item) => {
                                            return (
                                                <div key={item} className={styles["tools-list-opt"]}>
                                                    <SolidToolIcon />
                                                    <div
                                                        className={classNames(
                                                            styles["tool-name"],
                                                            "yakit-content-single-ellipsis"
                                                        )}
                                                    >
                                                        {item}
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            }
                            visible={toolsShow}
                            onVisibleChange={setToolsShow}
                        >
                            <YakitTag className={styles["footer-tag"]}>
                                <div className={styles["tag-body"]}>
                                    <SolidToolIcon className={styles["tool-header-icon"]} />
                                    {tools.length}
                                    <OutlineChevrondownIcon
                                        className={classNames(styles["tool-arrow"], {
                                            [styles["tool-expand-arrow"]]: toolsShow
                                        })}
                                    />
                                </div>
                            </YakitTag>
                        </YakitPopover>
                    )}

                    <div className={classNames(styles["tags-wrapper"], "yakit-content-single-ellipsis")}>
                        {tags.map((tag) => {
                            const {value, color} = tag
                            return (
                                <YakitTag key={value} className={styles["footer-tag"]} color={color}>
                                    {value}
                                </YakitTag>
                            )
                        })}
                    </div>
                </div>
            </div>
        </div>
    )
})

/**
 * @name 可选择的 forge 模块选项 */
export const AIForgeForm: React.FC<AIForgeFormProps> = memo((props) => {
    const {wrapperRef, info, onBack, onSubmit} = props

    // #region 控制该组件最大高度
    const wrapperSize = useSize(wrapperRef)
    // #endregion

    const isUIParams = useMemo(() => {
        return !!info?.ParamsUIConfig
    }, [info?.ParamsUIConfig])

    const handleFetchParams = useMemoizedFn((jsonValue: string) => {
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
    })

    const params = useMemo(() => {
        const {ParamsUIConfig} = info

        if (!ParamsUIConfig) return null
        try {
            const param: YakParamProps[] = handleFetchParams(ParamsUIConfig)
            return param
        } catch (error) {
            return null
        }
    }, [info])

    const [question, setQuestion] = useState("")
    const [form] = Form.useForm()

    useEffect(() => {
        setQuestion("")
    }, [info.Id])

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

    const [loading, setLoading] = useState(false)
    const handleParamsSubmit = useMemoizedFn(() => {
        if (!info || (!info.ForgeName && !info.ForgeVerboseName)) {
            yakitNotify("warning", " Forge 模板信息异常，请关闭重试")
            return
        }
        if (loading) return
        setLoading(true)

        const request: AIStartParams = {
            ForgeName: `${info.ForgeVerboseName}(${info.ForgeName})`,
            UserQuery: ""
        }

        if (isUIParams) {
            if (form) {
                form.validateFields()
                    .then(async (value: any) => {
                        const kvPair = getYakExecutorParam({...value})
                        onSubmit(
                            {
                                ...request,
                                ForgeParams: kvPair
                            },
                            value
                        )
                    })
                    .catch(() => {})
            }
        } else {
            onSubmit(
                {
                    ...request,
                    UserQuery: question.trim() || ""
                },
                {
                    UserQuery: question.trim() || ""
                }
            )
        }

        setTimeout(() => {
            setLoading(false)
        }, 150)
    })

    return (
        <div
            style={{maxHeight: wrapperSize ? (wrapperSize.height || 0) - 60 : 240}}
            className={styles["ai-forge-form"]}
        >
            <div className={styles["forge-form-header"]}>
                <div
                    className={classNames(styles["header-title"], "yakit-content-single-ellipsis")}
                    title={`${info.ForgeVerboseName}(${info.ForgeName})`}
                >
                    {info.ForgeVerboseName}({info.ForgeName})
                </div>

                <div className={styles["header-extra"]}>
                    <AIModelSelect />
                    <React.Suspense fallback={<div>loading...</div>}>
                        <AIReviewRuleSelect />
                    </React.Suspense>
                    <YakitButton loading={loading} onClick={handleParamsSubmit}>
                        开始执行
                    </YakitButton>
                    <YakitButton type='text2' icon={<OutlineXIcon />} onClick={onBack} />
                </div>
            </div>

            <div className={styles["forge-form-body"]}>
                {isUIParams && params && params.length !== 0 ? (
                    <Form
                        form={form}
                        onFinish={() => {}}
                        labelCol={{span: 8}}
                        wrapperCol={{span: 14}}
                        labelWrap={true}
                        validateMessages={{
                            /* eslint-disable no-template-curly-in-string */
                            required: "${label} 是必填字段"
                        }}
                    >
                        {params && (
                            <ExecuteEnterNodeByPluginParams
                                paramsList={params}
                                pluginType={"yak"}
                                isExecuting={false}
                            />
                        )}
                    </Form>
                ) : (
                    <div className={styles["forge-no-param-ui"]}>
                        <QSInputTextarea
                            className={styles["ui-textarea"]}
                            placeholder='请输入目标'
                            value={question}
                            onChange={(e) => setQuestion(e.target.value)}
                        />
                    </div>
                )}
            </div>
        </div>
    )
})

/**
 * @name 可选择的 tool 模块选项 */
export const AIToolForm: React.FC<AIToolFormProps> = memo((props) => {
    const {wrapperRef, info, onBack, onSubmit} = props

    // #region 控制该组件最大高度
    const wrapperSize = useSize(wrapperRef)
    // #endregion

    const [question, setQuestion] = useState<string>("")

    const [loading, setLoading] = useState(false)
    const handleParamsSubmit = useMemoizedFn(() => {
        if (!info || (!info.Name && !info.VerboseName)) {
            yakitNotify("warning", " Forge 模板信息异常，请关闭重试")
            return
        }
        if (loading) return
        setLoading(true)
        onSubmit(question)
        setTimeout(() => {
            setLoading(false)
        }, 150)
    })

    return (
        <div style={{maxHeight: wrapperSize ? (wrapperSize.height || 0) - 40 : 240}} className={styles["ai-tool-form"]}>
            <div className={styles["tool-form-header"]}>
                <div
                    className={classNames(styles["header-title"], "yakit-content-single-ellipsis")}
                    title={`${info.VerboseName}(${info.Name})`}
                >
                    {info.VerboseName}({info.Name})
                </div>

                <div className={styles["header-extra"]}>
                    <AIModelSelect />
                    <React.Suspense fallback={<div>loading...</div>}>
                        <AIReviewRuleSelect />
                    </React.Suspense>
                    <YakitButton loading={loading} onClick={handleParamsSubmit}>
                        开始执行
                    </YakitButton>
                    <YakitButton type='text2' icon={<OutlineXIcon />} onClick={onBack} />
                </div>
            </div>

            <div className={styles["tool-form-body"]}>
                <div className={styles["tool-no-param-ui"]}>
                    <QSInputTextarea
                        className={styles["ui-textarea"]}
                        placeholder='请输入目标'
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                    />
                </div>
            </div>
        </div>
    )
})
