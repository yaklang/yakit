import React, {ChangeEvent, useEffect, useMemo, useRef, useState} from "react"
import {
    ExecuteEnterNodeByPluginParamsProps,
    FormExtraSettingProps,
    OutputFormComponentsByTypeProps,
    PluginExecuteDetailHeardProps,
    PluginExecuteExtraFormValue,
    CustomPluginExecuteFormValue,
    PluginExecuteProgressProps,
    YakExtraParamProps,
    FormContentItemByTypeProps,
    PluginFixFormParamsProps,
    RequestType
} from "./LocalPluginExecuteDetailHeardType"
import {PluginDetailHeader} from "../../baseTemplate"
import styles from "./LocalPluginExecuteDetailHeard.module.scss"
import {useCreation, useDebounceFn, useInViewport, useMemoizedFn, useNetwork} from "ahooks"
import {Divider, Form, Input, Progress} from "antd"
import {PluginParamDataEditorProps, YakParamProps} from "../../pluginsType"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {YakitInputNumber} from "@/components/yakitUI/YakitInputNumber/YakitInputNumber"
import {YakitSwitch} from "@/components/yakitUI/YakitSwitch/YakitSwitch"
import {HTTPPacketYakitEditor} from "@/components/yakitUI/YakitEditor/extraYakitEditor"
import {
    YakitFormDragger,
    YakitFormDraggerContent,
    YakitFormDraggerContentPath
} from "@/components/yakitUI/YakitForm/YakitForm"
import {failed, warn} from "@/utils/notification"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import classNames from "classnames"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import {YakitSelectProps} from "@/components/yakitUI/YakitSelect/YakitSelectType"
import {OutlineInformationcircleIcon} from "@/assets/icon/outline"
import {YakExecutorParam} from "@/pages/invoker/YakExecutorParams"
import {PluginExecuteExtraParamsRefProps} from "./PluginExecuteExtraParams"
import {DebugPluginRequest, apiCancelDebugPlugin, apiDebugPlugin, apiFetchOnlinePluginInfo} from "../../utils"
import {YakitEditor} from "@/components/yakitUI/YakitEditor/YakitEditor"
import {YakitRadioButtons} from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtons"
import {GetPluginLanguage} from "../../builtInData"
import {ParamsToGroupByGroupName, getValueByType, getYakExecutorParam} from "../../editDetails/utils"
import {ExpandAndRetract} from "../expandAndRetract/ExpandAndRetract"
import {defPluginExecuteFormValue} from "./constants"
import {YakitAutoComplete} from "@/components/yakitUI/YakitAutoComplete/YakitAutoComplete"
import {grpcFetchExpressionToResult} from "@/pages/pluginHub/utils/grpc"
import {getJsonSchemaListResult, JsonFormWrapper} from "@/components/JsonFormWrapper/JsonFormWrapper"

const PluginExecuteExtraParams = React.lazy(() => import("./PluginExecuteExtraParams"))

/**插件执行头部 */
export const LocalPluginExecuteDetailHeard: React.FC<PluginExecuteDetailHeardProps> = React.memo((props) => {
    const {
        token,
        plugin,
        extraNode,
        debugPluginStreamEvent,
        progressList,
        setRuntimeId,
        runtimeId,
        executeStatus,
        setExecuteStatus,
        linkPluginConfig,
        onDownPlugin,
        isHiddenUUID,
        infoExtra,
        hiddenUpdateBtn
    } = props

    const [form] = Form.useForm()
    const requestType = Form.useWatch("requestType", form)

    /**是否显示更新按钮 */
    const [isShowUpdate, setIsShowUpdate] = useState<boolean>(false)

    const [isExpand, setIsExpand] = useState<boolean>(true)
    /**额外参数弹出框 */
    const [extraParamsVisible, setExtraParamsVisible] = useState<boolean>(false)
    const [extraParamsValue, setExtraParamsValue] = useState<PluginExecuteExtraFormValue>({
        ...defPluginExecuteFormValue
    })

    const [customExtraParamsValue, setCustomExtraParamsValue] = useState<CustomPluginExecuteFormValue>({})

    const pluginExecuteExtraParamsRef = useRef<PluginExecuteExtraParamsRefProps>()
    const localPluginExecuteDetailHeardRef = useRef<HTMLDivElement>(null)

    const jsonSchemaListRef = useRef<{
        [key: string]: any
    }>({})

    const [inViewport = true] = useInViewport(localPluginExecuteDetailHeardRef)
    const networkState = useNetwork()

    /**必填的参数,作为页面上主要显示 */
    const requiredParams: YakParamProps[] = useMemo(() => {
        return plugin.Params?.filter((ele) => ele.Required) || []
    }, [plugin.Params])
    /** 选填参数数据 */
    const customParams: YakParamProps[] = useMemo(() => {
        return plugin.Params?.filter((ele) => !ele.Required) || []
    }, [plugin.Params])
    /**额外参数,根据参数组分类 */
    const extraParamsGroup: YakExtraParamProps[] = useMemo(() => {
        const paramsList = plugin.Params?.filter((ele) => !ele.Required) || []
        return ParamsToGroupByGroupName(paramsList)
    }, [plugin.Params])
    useEffect(() => {
        if (["yak", "lua", "mitm", "codec"].includes(plugin.Type)) {
            initFormValue()
        } else {
            form.resetFields()
        }
    }, [plugin.Params, plugin.ScriptName, plugin.Type])
    useEffect(() => {
        if (inViewport && networkState.online) {
            getOnlinePlugin()
        }
    }, [inViewport, networkState.online])
    const isExecuting = useCreation(() => {
        if (executeStatus === "process") return true
        return false
    }, [executeStatus])
    /**本地插件和内置插件不做更新相关逻辑 */
    const getOnlinePlugin = useMemoizedFn(() => {
        if (!!plugin.isLocalPlugin) return
        if (!!plugin.IsCorePlugin) return
        apiFetchOnlinePluginInfo({uuid: plugin.UUID}, true).then((info) => {
            if (Number(info.updated_at || 0) > Number(plugin.UpdatedAt || 0)) {
                setIsShowUpdate(true)
            }
        })
    })
    /**初始表单初始值 */
    const initFormValue = useMemoizedFn(() => {
        initRequiredFormValue()
        initExtraFormValue()
    })
    const initRequiredFormValue = useMemoizedFn(() => {
        // 必填参数
        let initRequiredFormValue: CustomPluginExecuteFormValue = {...defPluginExecuteFormValue, requestType: "input"}
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
            case "mitm":
            case "codec":
                setCustomExtraParamsValue({...initExtraFormValue})
                break

            default:
                break
        }
    })
    /**yak/lua 根据后端返的生成;codec/mitm/port-scan/nuclei前端固定*/
    const pluginParamsNodeByPluginType = useMemoizedFn((type: string) => {
        switch (type) {
            case "yak":
            case "lua":
                return (
                    <ExecuteEnterNodeByPluginParams
                        paramsList={requiredParams}
                        pluginType={plugin.Type}
                        isExecuting={isExecuting}
                        jsonSchemaListRef={jsonSchemaListRef}
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
                    <>
                        {plugin.Params.length > 0 && requiredParams.length > 0 ? (
                            <ExecuteEnterNodeByPluginParams
                                paramsList={requiredParams}
                                pluginType={plugin.Type}
                                isExecuting={isExecuting}
                                jsonSchemaListRef={jsonSchemaListRef}
                            />
                        ) : null}
                        <OutputFormComponentsByType
                            key='Input-Input'
                            item={codecItem}
                            codeType='plaintext'
                            disabled={isExecuting}
                        />
                    </>
                )
            case "mitm":
                return (
                    <>
                        {plugin.Params.length > 0 && requiredParams.length > 0 ? (
                            <ExecuteEnterNodeByPluginParams
                                paramsList={requiredParams}
                                pluginType={plugin.Type}
                                isExecuting={isExecuting}
                                jsonSchemaListRef={jsonSchemaListRef}
                            />
                        ) : null}
                        <PluginFixFormParams form={form} disabled={isExecuting} />
                    </>
                )
            case "port-scan":
            case "nuclei":
                return <PluginFixFormParams form={form} disabled={isExecuting} />
            default:
                return <></>
        }
    })
    /**开始执行 */
    const onStartExecute = useMemoizedFn((value) => {
        let yakExecutorParams: YakExecutorParam[] = []
        yakExecutorParams = getYakExecutorParam({...value, ...customExtraParamsValue})
        const input = value["Input"]
        const result = getJsonSchemaListResult(jsonSchemaListRef.current)

        if (result.jsonSchemaError.length > 0) {
            failed(`jsonSchema校验失败`)
            return
        }
        result.jsonSchemaSuccess.forEach((item) => {
            yakExecutorParams.push({
                Key: item.key,
                Value: JSON.stringify(item.value)
            })
        })

        let executeParams: DebugPluginRequest = {
            Code: "",
            PluginType: plugin.Type,
            Input: input,
            HTTPRequestTemplate: {
                ...extraParamsValue,
                IsHttps: !!value.IsHttps,
                IsRawHTTPRequest: value.requestType === "original",
                IsHttpFlowId: false,
                HTTPFlowId: [],
                RawHTTPRequest: value.rawHTTPRequest
                    ? Buffer.from(value.rawHTTPRequest, "utf8")
                    : Buffer.from("", "utf8")
            },
            ExecParams: yakExecutorParams,
            LinkPluginConfig: linkPluginConfig,
            PluginName: plugin.ScriptName
        }
        debugPluginStreamEvent.reset()
        setRuntimeId("")

        apiDebugPlugin({
            params: executeParams,
            token: token,
            pluginCustomParams: plugin.Params
        }).then(() => {
            setExecuteStatus("process")
            setIsExpand(false)
            debugPluginStreamEvent.start()
        })
    })
    /**取消执行 */
    const onStopExecute = useMemoizedFn((e) => {
        e.stopPropagation()
        apiCancelDebugPlugin(token).then(() => {
            debugPluginStreamEvent.stop()
            setExecuteStatus("finished")
        })
    })
    /**在顶部的执行按钮 */
    const onExecuteInTop = useMemoizedFn((e) => {
        e.stopPropagation()
        form.validateFields()
            .then(onStartExecute)
            .catch(() => {
                setIsExpand(true)
            })
    })
    /**保存额外参数 */
    const onSaveExtraParams = useMemoizedFn(
        (v: {customValue: CustomPluginExecuteFormValue; fixedValue: PluginExecuteExtraFormValue}) => {
            switch (plugin.Type) {
                case "yak":
                case "lua":
                    setCustomExtraParamsValue({...v.customValue})
                    break
                case "codec":
                case "mitm":
                    setCustomExtraParamsValue({...v.customValue})
                    setExtraParamsValue({...v.fixedValue})
                    break
                case "port-scan":
                case "nuclei":
                    setExtraParamsValue({...v.fixedValue})
                    break
                default:
                    break
            }
            setExtraParamsVisible(false)
        }
    )
    /**打开额外参数抽屉 */
    const openExtraPropsDrawer = useMemoizedFn(() => {
        if (isExecuting) return
        setExtraParamsVisible(true)
    })
    const isShowExtraParamsButton = useMemo(() => {
        switch (plugin.Type) {
            case "codec":
                if (extraParamsGroup.length > 0) return true
                return false
            case "mitm":
                if (extraParamsGroup.length > 0) return true
                return requestType === "input"
            case "port-scan":
            case "nuclei":
                if (requestType !== "input") return false
                return true
            default:
                return extraParamsGroup.length > 0
        }
    }, [extraParamsGroup.length, plugin.Type, requestType])
    const executeExtraParams: PluginExecuteExtraFormValue | CustomPluginExecuteFormValue = useMemo(() => {
        switch (plugin.Type) {
            case "yak":
            case "lua":
                return customExtraParamsValue
            case "codec":
            case "mitm":
                return {...customExtraParamsValue, ...extraParamsValue}
            case "port-scan":
            case "nuclei":
                return extraParamsValue
            default:
                return {}
        }
    }, [plugin.Type, extraParamsValue, customExtraParamsValue])
    const onExpand = useMemoizedFn((e) => {
        e.stopPropagation()
        setIsExpand(!isExpand)
    })
    const onDown = useMemoizedFn((e) => {
        e.stopPropagation()
        onDownPlugin()
    })

    return (
        <>
            <ExpandAndRetract
                isExpand={isExpand}
                onExpand={onExpand}
                className={styles["expand-retract"]}
                animationWrapperClassName={styles["expand-retract-animation-wrapper"]}
                status={executeStatus}
            >
                <PluginDetailHeader
                    pluginName={plugin.ScriptName}
                    help={plugin.Help}
                    tagMinWidth={120}
                    tags={plugin.Tags}
                    extraNode={
                        <div className={styles["plugin-head-executing-wrapper"]} ref={localPluginExecuteDetailHeardRef}>
                            <div className={styles["plugin-head-executing"]}>
                                {progressList.length === 1 && (
                                    <PluginExecuteProgress
                                        percent={progressList[0].progress}
                                        name={progressList[0].id}
                                    />
                                )}
                                {isExecuting ? (
                                    !isExpand && (
                                        <>
                                            <YakitButton danger onClick={onStopExecute}>
                                                停止
                                            </YakitButton>
                                        </>
                                    )
                                ) : (
                                    <>
                                        {!isExpand && <YakitButton onClick={onExecuteInTop}>执行</YakitButton>}
                                        {extraNode}
                                        {!hiddenUpdateBtn && isShowUpdate && (
                                            <>
                                                <div className='divider-style' />
                                                <YakitButton type='primary' onClick={onDown}>
                                                    更新
                                                </YakitButton>
                                            </>
                                        )}
                                    </>
                                )}
                            </div>
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
                    isHiddenUUID={isHiddenUUID}
                    infoExtra={infoExtra}
                />
            </ExpandAndRetract>
            <div
                className={classNames(styles["plugin-execute-form-wrapper"], {
                    [styles["plugin-execute-form-wrapper-hidden"]]: !isExpand
                })}
            >
                <Form
                    form={form}
                    onFinish={onStartExecute}
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
                                <YakitButton danger onClick={onStopExecute} size='large'>
                                    停止
                                </YakitButton>
                            ) : (
                                <YakitButton
                                    className={styles["plugin-execute-form-operate-start"]}
                                    htmlType='submit'
                                    size='large'
                                >
                                    开始执行
                                </YakitButton>
                            )}
                            {isShowExtraParamsButton && (
                                <YakitButton
                                    type='text'
                                    onClick={openExtraPropsDrawer}
                                    disabled={isExecuting}
                                    size='large'
                                >
                                    额外参数
                                </YakitButton>
                            )}
                        </div>
                    </Form.Item>
                </Form>
            </div>
            {progressList.length > 1 && (
                <div className={styles["plugin-head-executing-progress"]}>
                    {progressList.map((ele, index) => (
                        <React.Fragment key={ele.id}>
                            {index !== 0 && <Divider type='vertical' style={{margin: 0, top: 2}} />}
                            <PluginExecuteProgress percent={ele.progress} name={ele.id} />
                        </React.Fragment>
                    ))}
                </div>
            )}
            <React.Suspense fallback={<div>loading...</div>}>
                <PluginExecuteExtraParams
                    ref={pluginExecuteExtraParamsRef}
                    pluginType={plugin.Type}
                    customPluginParams={customParams}
                    hiddenFixedParams={requestType !== "input"}
                    extraParamsValue={executeExtraParams}
                    extraParamsGroup={extraParamsGroup}
                    visible={extraParamsVisible}
                    setVisible={setExtraParamsVisible}
                    onSave={onSaveExtraParams}
                    jsonSchemaListRef={jsonSchemaListRef}
                />
            </React.Suspense>
        </>
    )
})

/**执行的入口通过插件参数生成组件 */
export const ExecuteEnterNodeByPluginParams: React.FC<ExecuteEnterNodeByPluginParamsProps> = React.memo((props) => {
    const {paramsList, pluginType, isExecuting,jsonSchemaListRef,jsonSchemaInitial} = props

    return (
        <>
            {paramsList.map((item) => (
                <React.Fragment key={item.Field + item.FieldVerbose}>
                    <FormContentItemByType item={item} pluginType={pluginType} disabled={isExecuting} jsonSchemaListRef={jsonSchemaListRef} jsonSchemaInitial={jsonSchemaInitial}/>
                </React.Fragment>
            ))}
        </>
    )
})
/**插件执行输入》输出form表单的组件item */
export const FormContentItemByType: React.FC<FormContentItemByTypeProps> = React.memo((props) => {
    const {item, disabled, pluginType,jsonSchemaListRef,jsonSchemaInitial} = props
    let extraSetting: FormExtraSettingProps | undefined = undefined
    try {
        extraSetting = JSON.parse(item.ExtraSetting || "{}") || {
            double: false,
            data: []
        }
        if (extraSetting && extraSetting.data) {
            extraSetting.data = extraSetting.data.map((item) => {
                return {
                    key: item?.key,
                    label: item?.label || item?.key || item?.value,
                    value: item?.value
                }
            })
        }
    } catch (error) {
        failed("获取参数配置数据错误，请重新打开该页面")
    }
    switch (item.TypeVerbose) {
        // 单选并获取文件内容
        case "upload-file-content":
            return (
                <YakitFormDraggerContent
                    className={styles["plugin-execute-form-item"]}
                    formItemProps={{
                        name: item.Field,
                        label: item.FieldVerbose || item.Field,
                        rules: [{required: item.Required}]
                    }}
                    accept='.txt,.xlsx,.xls,.csv'
                    textareaProps={{
                        placeholder: "请输入内容，多条内容用“英文逗号”分隔",
                        rows: 3
                    }}
                    help='可将TXT、Excel文件拖入框内或'
                    disabled={disabled}
                />
            )
        // 单选文件-路径
        case "upload-path":
            return (
                <YakitFormDragger
                    className={styles["plugin-execute-form-item"]}
                    formItemProps={{
                        name: item.Field,
                        label: item.FieldVerbose || item.Field,
                        rules: [{required: item.Required}]
                    }}
                    isShowPathNumber={false}
                    selectType='file'
                    multiple={false}
                    disabled={disabled}
                />
            )
        // 批量文件-路径
        case "multiple-file-path":
            return (
                <YakitFormDragger
                    className={styles["plugin-execute-form-item"]}
                    formItemProps={{
                        name: item.Field,
                        label: item.FieldVerbose || item.Field,
                        rules: [{required: item.Required}]
                    }}
                    renderType='textarea'
                    selectType='file'
                    disabled={disabled}
                />
            )
        // 单选文件夹-路径
        case "upload-folder-path":
            return (
                <YakitFormDragger
                    className={styles["plugin-execute-form-item"]}
                    formItemProps={{
                        name: item.Field,
                        label: item.FieldVerbose || item.Field,
                        rules: [{required: item.Required}]
                    }}
                    isShowPathNumber={false}
                    selectType='folder'
                    multiple={false}
                    help='可将文件夹拖入框内或点击此处'
                    disabled={disabled}
                    autoCompleteProps={{
                        ref: item.cacheRef,
                        cacheHistoryDataKey: item.cacheHistoryDataKey
                    }}
                    renderType={item.cacheHistoryDataKey ? "autoComplete" : undefined}
                />
            )
        // 其他基础类型
        default:
            return (
                <OutputFormComponentsByType
                    item={item}
                    extraSetting={extraSetting}
                    codeType={pluginType}
                    disabled={disabled}
                    jsonSchemaListRef={jsonSchemaListRef}
                    jsonSchemaInitial={jsonSchemaInitial}
                />
            )
    }
})

/**执行表单单个项 */
export const OutputFormComponentsByType: React.FC<OutputFormComponentsByTypeProps> = (props) => {
    const {item, extraSetting, codeType, disabled, pluginType,jsonSchemaListRef,jsonSchemaInitial} = props
    const [validateStatus, setValidateStatus] = useState<"success" | "error">("success")

    const formProps = {
        rules: [{required: item.Required}],
        label: item.FieldVerbose || item.Field,
        name: item.Field,
        className: styles["plugin-execute-form-item"],
        tooltip: item.Help
            ? {
                  icon: <OutlineInformationcircleIcon />,
                  title: item.Help
              }
            : null
    }
    const onValidateStatus = useDebounceFn(
        (value: "success" | "error") => {
            setValidateStatus(value)
        },
        {wait: 200, leading: true}
    ).run

    const [additionalConfig, setAdditionalConfig] = useState<{inputOption: {label: string; value: any}[]}>()
    useEffect(() => {
        const {TypeVerbose, SuggestionDataExpression} = item
        setAdditionalConfig(undefined)
        if (TypeVerbose === "string") {
            if (SuggestionDataExpression) {
                // 输入框提供可选择选项
                grpcFetchExpressionToResult({
                    Expression: item.SuggestionDataExpression || "",
                    ImportYaklangLibs: true
                })
                    .then((res) => {
                        const {BoolResult, Result} = res
                        if (BoolResult && Result) {
                            try {
                                let arr: string[] = JSON.parse(Result)
                                !Array.isArray(arr) && (arr = [])
                                setAdditionalConfig({
                                    inputOption: arr.map((item) => ({
                                        label: item,
                                        value: item
                                    }))
                                })
                            } catch (error) {}
                        }
                    })
                    .catch(() => {})
            }
        }
    }, [item])

    switch (item.TypeVerbose) {
        case "string":
            return (
                <Form.Item {...formProps}>
                    <YakitAutoComplete options={additionalConfig?.inputOption || []} disabled={disabled}>
                        <YakitInput placeholder='请输入' />
                    </YakitAutoComplete>
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
                <Form.Item
                    {...formProps}
                    normalize={(value) => {
                        return String(value).replace(/\D/g, "")
                    }}
                >
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
            const defaultValue = item.DefaultValue || ""
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
                    className={classNames(formProps.className, styles["code-wrapper"], {
                        [styles["code-error-wrapper"]]: validateStatus === "error"
                    })}
                    initialValue={defaultValue}
                    trigger='setValue'
                    validateTrigger='setValue'
                    validateStatus={validateStatus}
                    help={validateStatus === "error" ? `${formProps.label} 是必填字段` : ""}
                >
                    <HTTPPacketYakitEditor originValue={defaultValue} readOnly={disabled} />
                </Form.Item>
            )
        case "yak":
            let language: string = pluginType || ""
            try {
                const info = JSON.parse(item.ExtraSetting || "") as PluginParamDataEditorProps
                language = info?.language || pluginType || ""
            } catch (error) {}
            language = GetPluginLanguage(language || codeType || "yak")

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
                    className={classNames(formProps.className, styles["code-wrapper"], {
                        [styles["code-error-wrapper"]]: validateStatus === "error"
                    })}
                    initialValue={item.DefaultValue || ""}
                    trigger='setValue'
                    validateTrigger='setValue'
                    validateStatus={validateStatus}
                    help={validateStatus === "error" ? `${formProps.label} 是必填字段` : ""}
                >
                    <YakitEditor type={language} readOnly={disabled} />
                </Form.Item>
            )
        case "json":
            if (typeof jsonSchemaListRef?.current !== "object") return <></>
            let schema: any = {}
            let uiSchema: any = {}
            let value: any = undefined
            try {
                schema = JSON.parse(item.JsonSchema || "{}")
                uiSchema = JSON.parse(item.UISchema || "{}")
                if(jsonSchemaInitial&&jsonSchemaInitial[item.Field]){
                    value = JSON.parse(jsonSchemaInitial[item.Field])
                }
            } catch (error) {
                console.error("Parse JsonSchema failed:", error)
            }
            return <JsonFormWrapper field={item.Field} schema={schema} uiSchema={uiSchema}
            jsonSchemaListRef={jsonSchemaListRef} disabled={disabled}
            value={value}
            />
        default:
            return <></>
    }
}

export const PluginExecuteProgress: React.FC<PluginExecuteProgressProps> = React.memo((props) => {
    const {percent, name} = props
    return (
        <div className={styles["plugin-execute-progress-wrapper"]}>
            <div className={styles["plugin-execute-progress-name"]}>
                <span className='content-ellipsis'>{name}</span>
            </div>
            <Progress
                strokeColor='#F28B44'
                trailColor='#F0F2F5'
                percent={Math.trunc(percent * 100)}
                format={(percent) => `${percent}%`}
            />
        </div>
    )
})
/**固定的插件类型 mitm/port-scan/nuclei 显示的UI */
export const PluginFixFormParams: React.FC<PluginFixFormParamsProps> = React.memo((props) => {
    const {form, disabled, type = "single", rawHTTPRequest = "", inputType, setInputType} = props

    const requestType: RequestType = Form.useWatch("requestType", form)
    const rawItem = useMemo(() => {
        const codeItem: YakParamProps = {
            Field: "rawHTTPRequest",
            FieldVerbose: "数据包",
            Required: true,
            TypeVerbose: "http-packet",
            DefaultValue: rawHTTPRequest,
            Help: ""
        }
        return codeItem
    }, [rawHTTPRequest])
    const requestTypeOptions = useCreation(() => {
        if (type === "single") {
            return [
                {
                    value: "original",
                    label: "原始请求"
                },
                {
                    value: "input",
                    label: "请求配置"
                }
            ]
        }
        return [
            {
                value: "original",
                label: "原始请求"
            },
            {
                value: "input",
                label: "请求配置"
            },
            {
                value: "httpFlowId",
                label: "请求ID"
            }
        ]
    }, [type])
    return (
        <>
            <Form.Item label='HTTPS' name='IsHttps' valuePropName='checked' initialValue={false}>
                <YakitSwitch size='large' disabled={disabled} />
            </Form.Item>
            <Form.Item label='请求类型' name='requestType' initialValue='input'>
                <YakitRadioButtons buttonStyle='solid' options={requestTypeOptions} disabled={disabled} />
            </Form.Item>
            {requestType === "original" && <OutputFormComponentsByType item={rawItem} />}
            {requestType === "input" && (
                <>
                    {inputType && setInputType ? (
                        <YakitFormDraggerContentPath
                            className={styles["plugin-execute-form-item"]}
                            formItemProps={{
                                name: "Input",
                                label: "扫描目标",
                                rules: [{required: true}]
                            }}
                            accept='.txt,.xlsx,.xls,.csv'
                            textareaProps={{
                                placeholder: "请输入扫描目标，多个目标用“英文逗号”或换行分隔",
                                rows: 3
                            }}
                            help='可将TXT、Excel文件拖入框内或'
                            disabled={disabled}
                            valueSeparator={"\r\n"}
                            onTextAreaType={setInputType}
                            textAreaType={inputType}
                        />
                    ) : (
                        <YakitFormDraggerContent
                            className={styles["plugin-execute-form-item"]}
                            formItemProps={{
                                name: "Input",
                                label: "扫描目标",
                                rules: [{required: true}]
                            }}
                            accept='.txt,.xlsx,.xls,.csv'
                            textareaProps={{
                                placeholder: "请输入扫描目标，多个目标用“英文逗号”或换行分隔",
                                rows: 3
                            }}
                            help='可将TXT、Excel文件拖入框内或'
                            disabled={disabled}
                            valueSeparator={"\r\n"}
                        />
                    )}
                </>
            )}
            {requestType === "httpFlowId" && (
                <Form.Item label='请求ID' name='httpFlowId' rules={[{ required: true }]}>
                    <YakitInput.TextArea placeholder='请输入请求ID,多个请求Id用“英文逗号”分隔' disabled={disabled} />
                </Form.Item>
            )}
        </>
    )
})
