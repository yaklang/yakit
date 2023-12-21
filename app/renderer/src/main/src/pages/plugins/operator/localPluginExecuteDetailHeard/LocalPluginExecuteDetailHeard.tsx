import React, {useEffect, useMemo, useRef, useState} from "react"
import {
    ExecuteEnterNodeByPluginParamsProps,
    FormExtraSettingProps,
    OutputFormComponentsByTypeProps,
    PluginExecuteDetailHeardProps,
    PluginExecuteExtraFormValue,
    CustomPluginExecuteFormValue,
    PluginExecuteProgressProps,
    YakExtraParamProps,
    FormContentItemByTypeProps
} from "./LocalPluginExecuteDetailHeardType"
import {PluginDetailHeader} from "../../baseTemplate"
import styles from "./LocalPluginExecuteDetailHeard.module.scss"
import {useDebounceFn, useMemoizedFn} from "ahooks"
import {Divider, Form, Progress} from "antd"
import {YakParamProps} from "../../pluginsType"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {QuestionMarkCircleIcon} from "@/assets/newIcon"
import {YakitInputNumber} from "@/components/yakitUI/YakitInputNumber/YakitInputNumber"
import {YakitSwitch} from "@/components/yakitUI/YakitSwitch/YakitSwitch"
import {NewHTTPPacketEditor} from "@/utils/editors"
import {HTTPPacketYakitEditor} from "@/components/yakitUI/YakitEditor/extraYakitEditor"
import {YakitFormDragger} from "@/components/yakitUI/YakitForm/YakitForm"
import {failed, yakitNotify} from "@/utils/notification"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {Uint8ArrayToString} from "@/utils/str"
import classNames from "classnames"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import {YakitSelectProps} from "@/components/yakitUI/YakitSelect/YakitSelectType"
import {OutlineChevrondownIcon} from "@/assets/icon/outline"
import {YakExecutorParam} from "@/pages/invoker/YakExecutorParams"
import {PluginExecuteExtraParamsRefProps} from "./PluginExecuteExtraParams"
import {DebugPluginRequest, apiCancelDebugPlugin, apiDebugPlugin} from "../../utils"
import {YakitEditor} from "@/components/yakitUI/YakitEditor/YakitEditor"

const PluginExecuteExtraParams = React.lazy(() => import("./PluginExecuteExtraParams"))

/**
 * @description 根据组名将参数分组
 * @returns 返回处理好分组后的数据
 *  */
const ParamsToGroupByGroupName = (arr: YakParamProps[]): YakExtraParamProps[] => {
    let map = {}
    let paramsGroupList: YakExtraParamProps[] = []
    for (var i = 0; i < arr.length; i++) {
        var ai = arr[i]
        if (!map[ai.Group || "default"]) {
            paramsGroupList.push({
                group: ai.Group || "default",
                data: [ai]
            })
            map[ai.Group || "default"] = ai
        } else {
            for (var j = 0; j < paramsGroupList.length; j++) {
                var dj = paramsGroupList[j]
                if (dj.group === (ai.Group || "default")) {
                    dj.data.push(ai)
                    break
                }
            }
        }
    }
    return paramsGroupList || []
}

/**
 * @description 表单显示的值,根据类型返回对应的类型的值
 */
const getValueByType = (defaultValue, type: string): number | string | boolean | string[] => {
    let value
    switch (type) {
        case "uint":
            value = parseInt(defaultValue || "0")
            break
        case "float":
            value = parseFloat(defaultValue || "0.0")
            break
        case "boolean":
            value = defaultValue === "true"
            break
        case "http-packet":
        case "yak":
            value = Buffer.from((defaultValue || "") as string, "utf8")
            break
        case "select":
            const newVal = defaultValue ? defaultValue.split(",") : []
            value = newVal.length > 0 ? newVal : []
            break
        default:
            value = defaultValue ? defaultValue : ""
            break
    }
    return value
}

/**
 * @description 处理最后的执行参数
 * @param {{[string]:any}} object
 * @returns {YakExecutorParam[]}
 */
const getYakExecutorParam = (object) => {
    let newValue: YakExecutorParam[] = []
    Object.entries(object).forEach(([key, val]) => {
        if (val instanceof Buffer) {
            newValue = [
                ...newValue,
                {
                    Key: key,
                    Value: Uint8ArrayToString(val)
                }
            ]
            return
        }
        newValue = [
            ...newValue,
            {
                Key: key,
                Value: val
            }
        ]
    })
    return newValue
}

const defPluginExecuteFormValue: PluginExecuteExtraFormValue = {
    IsHttps: false,
    IsRawHTTPRequest: false,
    RawHTTPRequest: Buffer.from("", "utf-8"),
    Method: "GET",
    Path: [],
    GetParams: [],
    Headers: [],
    Cookie: [],
    Body: Buffer.from("", "utf-8"),
    PostParams: [],
    MultipartParams: [],
    MultipartFileParams: []
}

/**插件执行头部 */
export const LocalPluginExecuteDetailHeard: React.FC<PluginExecuteDetailHeardProps> = React.memo((props) => {
    const {
        token,
        plugin,
        extraNode,
        isExecuting,
        setIsExecuting,
        debugPluginStreamEvent,
        progressList,
        setRuntimeId,
        runtimeId
    } = props
    const [form] = Form.useForm()
    /** 当前插件是否点击过开始执行 */
    const [isClickExecute, setIsClickExecute] = useState<boolean>(false)

    /**是否展开/收起 */
    const [isExpend, setIsExpend] = useState<boolean>(false)
    /**额外参数弹出框 */
    const [extraParamsVisible, setExtraParamsVisible] = useState<boolean>(false)
    const [extraParamsValue, setExtraParamsValue] = useState<PluginExecuteExtraFormValue>({
        ...defPluginExecuteFormValue
    })

    const [customExtraParamsValue, setCustomExtraParamsValue] = useState<CustomPluginExecuteFormValue>({})

    const pluginExecuteExtraParamsRef = useRef<PluginExecuteExtraParamsRefProps>()

    useEffect(() => {
        setIsClickExecute(false)
    }, [plugin.ScriptName])

    /**必填的参数,作为页面上主要显示 */
    const requiredParams: YakParamProps[] = useMemo(() => {
        return plugin.Params?.filter((ele) => ele.Required) || []
    }, [plugin.Params])
    /**额外参数,根据参数组分类 */
    const extraParamsGroup: YakExtraParamProps[] = useMemo(() => {
        const paramsList = plugin.Params?.filter((ele) => !ele.Required) || []
        return ParamsToGroupByGroupName(paramsList)
    }, [plugin.Params])
    useEffect(() => {
        if (plugin.Type === "yak" || plugin.Type === "lua") {
            initFormValue()
        } else {
            form.resetFields()
        }
    }, [plugin.Params, plugin.ScriptName, plugin.Type])
    /**初始表单初始值 */
    const initFormValue = useMemoizedFn(() => {
        initRequiredFormValue()
        initExtraFormValue()
    })
    const initRequiredFormValue = useMemoizedFn(() => {
        // 必填参数
        let initRequiredFormValue: CustomPluginExecuteFormValue = {...defPluginExecuteFormValue}
        requiredParams.forEach((ele) => {
            const value = getValueByType(ele.DefaultValue, ele.TypeVerbose)
            initRequiredFormValue = {
                ...initRequiredFormValue,
                [ele.Field]: value
            }
        })
        form.setFieldsValue({...initRequiredFormValue})
    })
    const initExtraFormValue = useMemoizedFn(() => {
        // 额外参数
        let initExtraFormValue: CustomPluginExecuteFormValue = {}
        const extraParamsList = plugin.Params?.filter((ele) => !ele.Required) || []
        extraParamsList.forEach((ele) => {
            const value = getValueByType(ele.DefaultValue, ele.TypeVerbose)
            initExtraFormValue = {
                ...initExtraFormValue,
                [ele.Field]: value
            }
        })
        switch (plugin.Type) {
            case "yak":
            case "lua":
                setCustomExtraParamsValue({...initExtraFormValue})
                break
            default:
                break
        }
    })
    /**yak/lua 根据后端返的生成;codec/mitm/port-scan/nuclei前端固定*/
    const pluginParamsNodeByPluginType = (type: string) => {
        switch (type) {
            case "yak":
            case "lua":
                return (
                    <ExecuteEnterNodeByPluginParams
                        paramsList={requiredParams}
                        pluginType={plugin.Type}
                        isExecuting={isExecuting}
                    />
                )
            case "codec":
                const codecItem: YakParamProps = {
                    Field: "Input",
                    FieldVerbose: "Input",
                    Required: true,
                    TypeVerbose: "yak",
                    DefaultValue: "",
                    Help: "Input"
                }
                return (
                    <OutputFormComponentsByType
                        key='Input-Input'
                        item={codecItem}
                        pluginType={plugin.Type}
                        disabled={isExecuting}
                    />
                )
            case "mitm":
            case "port-scan":
            case "nuclei":
                const item: YakParamProps = {
                    Field: "Input",
                    FieldVerbose: "扫描目标",
                    Required: true,
                    TypeVerbose: "string",
                    DefaultValue: "",
                    Help: "Input"
                }
                return (
                    <OutputFormComponentsByType
                        key='Input-扫描目标'
                        item={item}
                        pluginType={plugin.Type}
                        disabled={isExecuting}
                    />
                )
            default:
                return <></>
        }
    }
    /**开始执行 */
    const onStartExecute = useMemoizedFn((value) => {
        if (!isClickExecute) setIsClickExecute(true)
        const yakExecutorParams: YakExecutorParam[] = getYakExecutorParam({...value, ...customExtraParamsValue})
        const input = value["Input"]
        let executeParams: DebugPluginRequest = {
            Code: plugin.Content,
            PluginType: plugin.Type,
            Input: input,
            HTTPRequestTemplate: extraParamsValue,
            ExecParams: yakExecutorParams
        }
        debugPluginStreamEvent.reset()
        apiDebugPlugin(executeParams, token).then(() => {
            setIsExecuting(true)
            setIsExpend(false)
            debugPluginStreamEvent.start()
        })
    })
    /**取消执行 */
    const onStopExecute = useMemoizedFn(() => {
        apiCancelDebugPlugin(token).then(() => {
            debugPluginStreamEvent.stop()
            setIsExecuting(false)
        })
    })
    /**保存额外参数 */
    const onSaveExtraParams = useMemoizedFn((v: PluginExecuteExtraFormValue | CustomPluginExecuteFormValue) => {
        switch (plugin.Type) {
            case "yak":
            case "lua":
                setCustomExtraParamsValue({...v} as CustomPluginExecuteFormValue)
                break
            case "mitm":
            case "port-scan":
            case "nuclei":
                setExtraParamsValue({...v} as PluginExecuteExtraFormValue)
                break
            default:
                break
        }
        setExtraParamsVisible(false)
    })
    /**打开额外参数抽屉 */
    const openExtraPropsDrawer = useMemoizedFn(() => {
        if (isExecuting) return
        setExtraParamsVisible(true)
    })
    const onClearExecuteResult = useMemoizedFn(() => {
        debugPluginStreamEvent.reset()
        setRuntimeId("")
        setIsExpend(true)
        yakitNotify("success", "执行结果清除成功")
    })
    const isShowExtraParamsButton = useMemo(() => {
        switch (plugin.Type) {
            case "codec":
                return false
            case "mitm":
            case "port-scan":
            case "nuclei":
                return true
            default:
                return extraParamsGroup.length > 0
        }
    }, [extraParamsGroup.length, plugin.Type])
    const executeExtraParams: PluginExecuteExtraFormValue | CustomPluginExecuteFormValue = useMemo(() => {
        switch (plugin.Type) {
            case "yak":
            case "lua":
                return customExtraParamsValue
            case "mitm":
            case "port-scan":
            case "nuclei":
                return extraParamsValue
            default:
                return {}
        }
    }, [plugin.Type, extraParamsValue, customExtraParamsValue])
    return (
        <>
            <PluginDetailHeader
                pluginName={plugin.ScriptName}
                help={plugin.Help}
                tagMinWidth={120}
                tags={plugin.Tags}
                extraNode={
                    <div className={styles["plugin-head-executing-wrapper"]}>
                        {isClickExecute ? (
                            <div className={styles["plugin-head-executing"]}>
                                {progressList.length === 1 && (
                                    <PluginExecuteProgress
                                        percent={progressList[0].progress}
                                        name={progressList[0].id}
                                    />
                                )}
                                {runtimeId && (
                                    <YakitButton type='text' onClick={onClearExecuteResult}>
                                        清除执行结果
                                    </YakitButton>
                                )}
                                {isExecuting ? (
                                    <>
                                        <YakitButton danger onClick={onStopExecute}>
                                            停止
                                        </YakitButton>
                                    </>
                                ) : (
                                    <>{extraNode}</>
                                )}

                                {isExpend ? (
                                    <YakitButton type='text2' onClick={() => setIsExpend(false)}>
                                        收起
                                        <OutlineChevrondownIcon />
                                    </YakitButton>
                                ) : (
                                    <YakitButton type='text2' onClick={() => setIsExpend(true)}>
                                        展开
                                        <OutlineChevrondownIcon />
                                    </YakitButton>
                                )}
                            </div>
                        ) : (
                            <>{extraNode}</>
                        )}
                    </div>
                }
                img={plugin.HeadImg || ""}
                user={plugin.Author}
                pluginId={plugin.UUID}
                updated_at={plugin.UpdatedAt || 0}
                prImgs={(plugin.CollaboratorInfo || []).map((ele) => ({
                    headImg: ele.HeadImg,
                    userName: ele.UserName
                }))}
                type={plugin.Type}
            />
            <Form
                form={form}
                onFinish={onStartExecute}
                className={classNames(styles["plugin-execute-form-wrapper"], {
                    [styles["plugin-execute-form-wrapper-hidden"]]: isClickExecute && !isExpend
                })}
                labelCol={{span: 6}}
                wrapperCol={{span: 12}} //这样设置是为了让输入框居中
                validateMessages={{
                    /* eslint-disable no-template-curly-in-string */
                    required: "${label} 是必填字段"
                }}
                labelWrap={true}
            >
                {pluginParamsNodeByPluginType(plugin.Type)}
                <Form.Item colon={false} label={" "} style={{marginBottom: 0}}>
                    <div className={styles["plugin-execute-form-operate"]}>
                        {isExecuting ? (
                            <YakitButton danger onClick={onStopExecute}>
                                停止
                            </YakitButton>
                        ) : (
                            <YakitButton className={styles["plugin-execute-form-operate-start"]} htmlType='submit'>
                                开始执行
                            </YakitButton>
                        )}
                        {isShowExtraParamsButton && (
                            <YakitButton type='text' onClick={openExtraPropsDrawer} disabled={isExecuting}>
                                额外参数
                            </YakitButton>
                        )}
                    </div>
                </Form.Item>
            </Form>
            {progressList.length > 1 && (
                <div className={styles["plugin-head-executing-progress"]}>
                    {progressList.map((ele, index) => (
                        <>
                            {index !== 0 && <Divider type='vertical' style={{margin: 0, top: 2}} />}
                            <PluginExecuteProgress percent={ele.progress} name={ele.id} />
                        </>
                    ))}
                </div>
            )}
            <React.Suspense fallback={<div>loading...</div>}>
                <PluginExecuteExtraParams
                    ref={pluginExecuteExtraParamsRef}
                    pluginType={plugin.Type}
                    extraParamsValue={executeExtraParams}
                    extraParamsGroup={extraParamsGroup}
                    visible={extraParamsVisible}
                    setVisible={setExtraParamsVisible}
                    onSave={onSaveExtraParams}
                />
            </React.Suspense>
        </>
    )
})

/**执行的入口通过插件参数生成组件 */
const ExecuteEnterNodeByPluginParams: React.FC<ExecuteEnterNodeByPluginParamsProps> = React.memo((props) => {
    const {paramsList, pluginType, isExecuting} = props

    return (
        <>
            {paramsList.map((item) => (
                <React.Fragment key={item.Field + item.FieldVerbose}>
                    <FormContentItemByType item={item} pluginType={pluginType} disabled={isExecuting} />
                </React.Fragment>
            ))}
        </>
    )
})
/**插件执行输入》输出form表单的组件item */
export const FormContentItemByType: React.FC<FormContentItemByTypeProps> = React.memo((props) => {
    const {item, disabled, pluginType} = props
    let extraSetting: FormExtraSettingProps | undefined = undefined
    try {
        extraSetting = JSON.parse(item.ExtraSetting || "{}") || {
            double: false,
            data: []
        }
    } catch (error) {
        failed("获取参数配置数据错误，请重新打开该页面")
    }
    switch (item.TypeVerbose) {
        case "upload-path":
            return (
                <YakitFormDragger
                    className={styles["plugin-execute-form-item"]}
                    formItemProps={{
                        name: item.Field,
                        label: item.FieldVerbose || item.Field,
                        rules: [{required: item.Required}]
                    }}
                    selectType='all'
                    disabled={disabled}
                />
            )

        default:
            return (
                <OutputFormComponentsByType
                    item={item}
                    extraSetting={extraSetting}
                    pluginType={pluginType}
                    disabled={disabled}
                />
            )
    }
})

/**执行表单单个项 */
export const OutputFormComponentsByType: React.FC<OutputFormComponentsByTypeProps> = (props) => {
    const {item, extraSetting, pluginType, disabled} = props
    const [validateStatus, setValidateStatus] = useState<"success" | "error">("success")
    const [code, setCode] = useState<Buffer>(Buffer.from(item.DefaultValue || "", "utf8"))
    const formProps = {
        rules: [{required: item.Required}],
        label: item.FieldVerbose || item.Field,
        name: item.Field,
        className: styles["plugin-execute-form-item"],
        tooltip: {
            icon: <QuestionMarkCircleIcon />,
            title: item.Help
        }
    }
    const onValidateStatus = useDebounceFn(
        (value: "success" | "error") => {
            setValidateStatus(value)
        },
        {wait: 200, leading: true}
    ).run
    switch (item.TypeVerbose) {
        case "string":
            return (
                <Form.Item {...formProps}>
                    <YakitInput placeholder='请输入' disabled={disabled} />
                </Form.Item>
            )
        case "text":
            return (
                <Form.Item {...formProps}>
                    <YakitInput.TextArea placeholder='请输入' disabled={disabled} />
                </Form.Item>
            )
        case "uint":
            return (
                <Form.Item {...formProps}>
                    <YakitInputNumber precision={0} min={0} disabled={disabled} />
                </Form.Item>
            )
        case "float":
            return (
                <Form.Item {...formProps}>
                    <YakitInputNumber step={0.1} disabled={disabled} />
                </Form.Item>
            )
        case "boolean":
            return (
                <Form.Item {...formProps} valuePropName='checked'>
                    <YakitSwitch size='large' disabled={disabled} />
                </Form.Item>
            )
        case "select":
            let selectProps: YakitSelectProps = {
                options: extraSetting?.data || []
            }
            if (extraSetting?.double) {
                selectProps = {
                    ...selectProps,
                    mode: "tags"
                }
            }
            return (
                <Form.Item {...formProps}>
                    <YakitSelect {...selectProps} disabled={disabled} />
                </Form.Item>
            )
        case "http-packet":
            return (
                <Form.Item
                    {...formProps}
                    rules={[
                        {required: item.Required},
                        {
                            validator: async (rule, value) => {
                                if (item.Required && value.length === 0) {
                                    onValidateStatus("error")
                                    return Promise.reject()
                                }
                                if (validateStatus === "error") onValidateStatus("success")
                                return Promise.resolve()
                            }
                        }
                    ]}
                    valuePropName='originValue'
                    className={classNames(formProps.className, styles["code-wrapper"], {
                        [styles["code-error-wrapper"]]: validateStatus === "error"
                    })}
                    initialValue={item.DefaultValue || ""}
                    trigger='setValue'
                    validateTrigger='setValue'
                    validateStatus={validateStatus}
                    help={validateStatus === "error" ? `${formProps.label} 是必填字段` : ""}
                >
                    <HTTPPacketYakitEditor originValue={code} value={item.DefaultValue || ""} readOnly={disabled} />
                </Form.Item>
            )
        case "yak":
            return (
                <Form.Item
                    {...formProps}
                    rules={[
                        {required: item.Required},
                        {
                            validator: async (rule, value) => {
                                if (item.Required && value.length === 0) {
                                    onValidateStatus("error")
                                    return Promise.reject()
                                }
                                if (validateStatus === "error") onValidateStatus("success")
                                return Promise.resolve()
                            }
                        }
                    ]}
                    valuePropName='originValue'
                    className={classNames(formProps.className, styles["code-wrapper"], {
                        [styles["code-error-wrapper"]]: validateStatus === "error"
                    })}
                    initialValue={item.DefaultValue || ""}
                    trigger='setValue'
                    validateTrigger='setValue'
                    validateStatus={validateStatus}
                    help={validateStatus === "error" ? `${formProps.label} 是必填字段` : ""}
                >
                    <YakitEditor type={pluginType} value={item.DefaultValue || ""} readOnly={disabled} />
                </Form.Item>
            )

        default:
            return <></>
    }
}

const PluginExecuteProgress: React.FC<PluginExecuteProgressProps> = React.memo((props) => {
    const {percent, name} = props
    return (
        <div className={styles["plugin-execute-progress-wrapper"]}>
            <div className={styles["plugin-execute-progress-name"]}>
                <span className='content-ellipsis'>{name}</span>
            </div>
            <Progress
                strokeColor='#F28B44'
                trailColor='#F0F2F5'
                percent={Math.ceil(percent)}
                format={(percent) => `${percent}%`}
            />
        </div>
    )
})
