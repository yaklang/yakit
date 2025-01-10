import React, {ForwardedRef, forwardRef, memo, useEffect, useImperativeHandle, useMemo, useRef, useState} from "react"
import {useDebounceFn, useMemoizedFn, useUpdateEffect} from "ahooks"
import {OutlineOpenIcon} from "@/assets/icon/outline"
import {SolidPlayIcon} from "@/assets/icon/solid"
import {YakitRadioButtons} from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtons"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {YakitTagColor} from "@/components/yakitUI/YakitTag/YakitTagType"
import {YakitEditor} from "@/components/yakitUI/YakitEditor/YakitEditor"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {pluginTypeToName} from "@/pages/plugins/builtInData"
import {Divider, Form, Tooltip} from "antd"
import {CustomPluginExecuteFormValue} from "@/pages/plugins/operator/localPluginExecuteDetailHeard/LocalPluginExecuteDetailHeardType"
import {
    ParamsToGroupByGroupName,
    getValueByType,
    getYakExecutorParam,
    onCodeToInfo
} from "@/pages/plugins/editDetails/utils"
import {
    ExecuteEnterNodeByPluginParams,
    OutputFormComponentsByType,
    PluginExecuteProgress,
    PluginFixFormParams
} from "@/pages/plugins/operator/localPluginExecuteDetailHeard/LocalPluginExecuteDetailHeard"
import {YakParamProps} from "@/pages/plugins/pluginsType"
import {YakitBaseSelectRef} from "@/components/yakitUI/YakitSelect/YakitSelectType"
import {
    ExtraParamsNodeByType,
    FixExtraParamsNode
} from "@/pages/plugins/operator/localPluginExecuteDetailHeard/PluginExecuteExtraParams"
import useHoldGRPCStream from "@/hook/useHoldGRPCStream/useHoldGRPCStream"
import {randomString} from "@/utils/randomUtil"
import {failed, warn, yakitNotify} from "@/utils/notification"
import {DebugPluginRequest, apiCancelDebugPlugin, apiDebugPlugin} from "@/pages/plugins/utils"
import {HTTPRequestBuilderParams} from "@/models/HTTPRequestBuilder"
import emiter from "@/utils/eventBus/eventBus"
import useGetSetState from "@/pages/pluginHub/hooks/useGetSetState"
import {PluginExecuteResult} from "@/pages/plugins/operator/pluginExecuteResult/PluginExecuteResult"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import {defPluginExecuteFormValue} from "@/pages/plugins/operator/localPluginExecuteDetailHeard/constants"
import cloneDeep from "lodash/cloneDeep"
import {CodeScoreModal} from "@/pages/plugins/funcTemplate"

import classNames from "classnames"
import "../../plugins/plugins.scss"
import styles from "./EditorCode.module.scss"
import {getJsonSchemaListResult, JsonFormValidateProps} from "@/components/JsonFormWrapper/JsonFormWrapper"

export interface EditorCodeRefProps {
    onSubmit: () => string
}
interface EditorCodeProps {
    ref?: ForwardedRef<EditorCodeRefProps>
    expand: boolean
    onExpand: (val: boolean) => void
    isEdit?: boolean
    type: string
    name: string
    /** 初始化默认源码 */
    code: string
    handleParsingYaml: (content: string) => void
}

export const EditorCode: React.FC<EditorCodeProps> = memo(
    forwardRef((props, ref) => {
        const {expand, onExpand, isEdit = false, type, name, code, handleParsingYaml} = props

        const [visible, setVisible] = useState<boolean>(false)
        const handleExpand = useMemoizedFn((e) => {
            e.stopPropagation()
            if (expand) return
            setVisible(false)
            onExpand(true)
        })

        const [activeTab, setActiveTab] = useState<string>("code")

        /** ---------- 代码和参数数据的更新 Start ---------- */
        const [content, setContent, getContent] = useGetSetState<string>("")
        const [params, setParams] = useState<YakParamProps[]>([])

        useImperativeHandle(
            ref,
            () => ({
                onSubmit: () => getContent()
            }),
            []
        )

        useEffect(() => {
            setContent(code)
        }, [code])

        const getType = useMemoizedFn(() => {
            return type
        })
        useUpdateEffect(() => {
            // yak、lua、mitm、codec类型都可以自定义参数
            if (["yak", "lua", "mitm", "codec"].includes(getType())) {
                handleFetchParams(true)
            } else {
                setParams([])
                if (['nuclei'].includes(getType())) {
                    handleParsingYaml(content)
                }
            }
        }, [content])

        // 必要参数
        const requiredParams = useMemo(() => {
            return params.filter((item) => !!item.Required) || []
        }, [params])
        /** 选填参数 */
        const groupParams = useMemo(() => {
            const arr = params.filter((item) => !item.Required) || []
            return ParamsToGroupByGroupName(arr)
        }, [params])

        const [fetchParamsLoading, setFetchParamsLoading, getFetchParamsLoading] = useGetSetState<boolean>(false)
        // 获取参数
        const handleFetchParams = useDebounceFn(
            useMemoizedFn(async (hiddenError?: boolean) => {
                if (getFetchParamsLoading()) return

                setFetchParamsLoading(true)
                const codeInfo = await onCodeToInfo({type: type, code: getContent() || ""}, hiddenError)
                if (codeInfo) {
                    setParams([...codeInfo.CliParameter])
                }
                setTimeout(() => {
                    setFetchParamsLoading(false)
                }, 200)
            }),
            {wait: 300}
        ).run
        /** ---------- 代码和参数数据的更新 End ---------- */

        /** ---------- 代码评分 Start ---------- */
        const [scoreHint, setScoreHint] = useState<boolean>(false)
        const handleOpenScoreHint = useMemoizedFn(() => {
            if (scoreHint) return
            setScoreHint(true)
        })
        const handleScoreHintCallback = useMemoizedFn((value: boolean) => {
            if (!value) setScoreHint(false)
        })
        /** ---------- 代码评分 End ---------- */

        /** ---------- 参数获取和展示逻辑 Start ---------- */
        const [form] = Form.useForm()
        const jsonSchemaListRef = useRef<{
            [key: string]: any
        }>({})

        // 设置非(yak|lua)类型的插件参数初始值
        const onSettingDefault = useMemoizedFn(() => {
            let defaultValue: CustomPluginExecuteFormValue = {...defPluginExecuteFormValue, requestType: "input"}
            form.setFieldsValue({...cloneDeep(defaultValue)})
        })

        // 更新表单内容
        useUpdateEffect(() => {
            initFormValue()
        }, [params])
        const initFormValue = useMemoizedFn(() => {
            // 其他类型只有默认参数
            if (!["yak", "lua", "mitm", "codec"].includes(type)) {
                onSettingDefault()
                return
            }

            // 表单内数据
            let formData: CustomPluginExecuteFormValue = {}
            if (form) formData = (form.getFieldsValue() || {}) as CustomPluginExecuteFormValue

            let defaultValue: CustomPluginExecuteFormValue | undefined = undefined
            // mitm 有默认参数和 cli 自定义参数
            if (type === "mitm") {
                defaultValue = {...defPluginExecuteFormValue, ...formData}
            } else {
                defaultValue = {...formData}
            }
            
            let newFormValue: CustomPluginExecuteFormValue = {}
            params.forEach((ele) => {
                let initValue = formData[ele.Field] || ele.Value || ele.DefaultValue
                const value = getValueByType(initValue, ele.TypeVerbose)
                newFormValue = {
                    ...newFormValue,
                    [ele.Field]: value
                }
            })
            form.setFieldsValue({...cloneDeep(defaultValue || {}), ...newFormValue})
        })

        const pluginRequiredItem = useMemoizedFn((type: string) => {
            switch (type) {
                case "yak":
                case "lua":
                    return (
                        <ExecuteEnterNodeByPluginParams
                            paramsList={requiredParams}
                            pluginType={type}
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
                            {params.length > 0 && requiredParams.length > 0 ? (
                                <ExecuteEnterNodeByPluginParams
                                    paramsList={requiredParams}
                                    pluginType={type}
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
                            {params.length > 0 && requiredParams.length > 0 ? (
                                <ExecuteEnterNodeByPluginParams
                                    paramsList={requiredParams}
                                    pluginType={type}
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
                    return null
            }
        })

        /** 请求类型-为原始请求则不展示额外参数 */
        const requestType = Form.useWatch("requestType", form)
        /** 是否隐藏默认选填参数 */
        const isHiddenDefaultParams = useMemo(() => {
            if (["yak", "lua"].includes(type)) return true
            if (requestType === "input") return false
            return true
        }, [type, requestType])
        /** 是否隐藏自定义选填参数 */
        const isHiddenCustomParams = useMemo(() => {
            return groupParams.length === 0
        }, [groupParams.length])

        const pathRef = useRef<YakitBaseSelectRef>({
            onGetRemoteValues: () => {},
            onSetRemoteValues: (s: string[]) => {}
        })
        /** 重置固定的额外参数中的表单值 */
        const onSettingExtraParams = useMemoizedFn((restValue) => {
            form.setFieldsValue({...restValue})
        })

        const pluginOptionalItem = (type: string) => {
            switch (type) {
                case "yak":
                case "lua":
                    return isHiddenCustomParams ? null : (
                        <>
                            <div className={styles["additional-params-divider"]}>
                                <div className={styles["text-style"]}>额外参数 (非必填)</div>
                                <div className={styles["divider-style"]}></div>
                            </div>
                            <ExtraParamsNodeByType
                                extraParamsGroup={groupParams}
                                pluginType={type}
                                jsonSchemaListRef={jsonSchemaListRef}
                            />

                            <div className={styles["to-end"]}>已经到底啦～</div>
                        </>
                    )
                case "codec":
                    return isHiddenCustomParams ? null : (
                        <>
                            <div className={styles["additional-params-divider"]}>
                                <div className={styles["text-style"]}>自定义参数 (非必填)</div>
                                <div className={styles["divider-style"]}></div>
                            </div>
                            <ExtraParamsNodeByType
                                extraParamsGroup={groupParams}
                                pluginType={type}
                                jsonSchemaListRef={jsonSchemaListRef}
                            />
                            <div className={styles["to-end"]}>已经到底啦～</div>
                        </>
                    )
                case "mitm":
                    return isHiddenDefaultParams && isHiddenCustomParams ? null : (
                        <>
                            {!isHiddenCustomParams ? (
                                <>
                                    <div className={styles["additional-params-divider"]}>
                                        <div className={styles["text-style"]}>自定义参数 (非必填)</div>
                                        <div className={styles["divider-style"]}></div>
                                    </div>
                                    <ExtraParamsNodeByType
                                        extraParamsGroup={groupParams}
                                        pluginType={type}
                                        jsonSchemaListRef={jsonSchemaListRef}
                                    />
                                </>
                            ) : null}
                            {!isHiddenDefaultParams && (
                                <>
                                    <div className={styles["additional-params-divider"]}>
                                        <div className={styles["text-style"]}>固定参数 (非必填)</div>
                                        <div className={styles["divider-style"]}></div>
                                    </div>
                                    <FixExtraParamsNode
                                        form={form}
                                        pathRef={pathRef}
                                        onReset={onSettingExtraParams}
                                        bordered={true}
                                        httpPathWrapper={styles["optional-params-wrapper"]}
                                    />
                                </>
                            )}
                            <div className={styles["to-end"]}>已经到底啦～</div>
                        </>
                    )
                case "port-scan":
                case "nuclei":
                    return (
                        <>
                            <div className={styles["additional-params-divider"]}>
                                <div className={styles["text-style"]}>额外参数 (非必填)</div>
                                <div className={styles["divider-style"]}></div>
                            </div>
                            <FixExtraParamsNode
                                form={form}
                                pathRef={pathRef}
                                onReset={onSettingExtraParams}
                                bordered={true}
                                httpPathWrapper={styles["optional-params-wrapper"]}
                            />
                        </>
                    )

                default:
                    return null
            }
        }
        /** ---------- 参数获取和展示逻辑 End ---------- */

        /** ---------- 插件执行逻辑 Start ---------- */
        /** 是否在执行中 */
        const [isExecuting, setIsExecuting] = useState<boolean>(false)
        const [runtimeId, setRuntimeId] = useState<string>("")
        const tokenRef = useRef<string>(randomString(40))
        const [streamInfo, debugPluginStreamEvent] = useHoldGRPCStream({
            taskName: "debug-plugin",
            apiKey: "DebugPlugin",
            token: tokenRef.current,
            onEnd: () => {
                debugPluginStreamEvent.stop()
                setTimeout(() => setIsExecuting(false), 300)
            },
            setRuntimeId: (rId) => {
                yakitNotify("info", `调试任务启动成功，运行时 ID: ${rId}`)
                setRuntimeId(rId)
            }
        })

        const onStartExecute = useMemoizedFn(() => {
            if (form) {
                form.validateFields()
                    .then(async (value: any) => {
                        const result = getJsonSchemaListResult(jsonSchemaListRef.current)
                        if (result.jsonSchemaError.length > 0) {
                            failed(`jsonSchema校验失败`)
                            return
                        }
                        result.jsonSchemaSuccess.forEach((item) => {
                            value[item.key] = JSON.stringify(item.value)
                        })

                        // 保存参数-请求路径的选项
                        if (pathRef && pathRef.current) {
                            pathRef.current.onSetRemoteValues(value?.Path || [])
                        }

                        const requestParams: DebugPluginRequest = {
                            Code: content,
                            PluginType: type,
                            Input: value["Input"] || "",
                            HTTPRequestTemplate: {} as HTTPRequestBuilderParams,
                            ExecParams: [],
                            PluginName: ""
                        }

                        switch (type) {
                            case "yak":
                            case "lua":
                                requestParams.ExecParams = getYakExecutorParam({...value})
                                break
                            case "codec":
                            case "mitm":
                                if (params.length > 0) {
                                    requestParams.ExecParams = getYakExecutorParam({...value})
                                }
                                requestParams.HTTPRequestTemplate = {
                                    ...value,
                                    IsRawHTTPRequest: value.requestType === "original",
                                    RawHTTPRequest: value.rawHTTPRequest
                                        ? Buffer.from(value.rawHTTPRequest, "utf8")
                                        : Buffer.from("", "utf8")
                                }
                                break
                            case "port-scan":
                            case "nuclei":
                                requestParams.HTTPRequestTemplate = {
                                    ...value,
                                    IsRawHTTPRequest: value.requestType === "original",
                                    RawHTTPRequest: value.rawHTTPRequest
                                        ? Buffer.from(value.rawHTTPRequest, "utf8")
                                        : Buffer.from("", "utf8")
                                }
                                break
                            default:
                                break
                        }

                        debugPluginStreamEvent.reset()
                        setRuntimeId("")
                        setActiveTab("execResult")
                        if (type === "codec") {
                            const codecInfo = await onCodeToInfo({type: type, code: getContent() || ""})
                            if ((codecInfo?.Tags || []).includes("AI工具")) {
                                emiter.emit(
                                    "onOpenFuzzerModal",
                                    JSON.stringify({text: value["Input"] || "", code: "newCode", isAiPlugin: true})
                                )
                            }
                        }
                        apiDebugPlugin({
                            params: requestParams,
                            token: tokenRef.current,
                            pluginCustomParams: params
                        }).then(() => {
                            setIsExecuting(true)
                            debugPluginStreamEvent.start()
                        })
                    })
                    .catch(() => {})
            }
        })

        /**取消执行 */
        const onStopExecute = useMemoizedFn(() => {
            apiCancelDebugPlugin(tokenRef.current).then(() => {
                debugPluginStreamEvent.stop()
                setIsExecuting(false)
            })
        })
        /** ---------- 插件执行逻辑 End ---------- */

        return (
            <div className={styles["editor-code"]}>
                <div className={styles["editor-code-header"]}>
                    <div className={styles["header-tab-bar"]}>
                        {!expand && (
                            <Tooltip
                                placement='topLeft'
                                title='展开基础信息'
                                overlayClassName='plugins-tooltip'
                                visible={visible}
                                onVisibleChange={(show) => setVisible(show)}
                            >
                                <div className={styles["expand-btn"]} onClick={handleExpand}>
                                    <OutlineOpenIcon />
                                </div>
                            </Tooltip>
                        )}
                        <YakitRadioButtons
                            buttonStyle='solid'
                            value={activeTab}
                            options={[
                                {value: "code", label: "源码"},
                                {value: "execResult", label: "执行结果"}
                            ]}
                            onChange={(e) => setActiveTab(e.target.value)}
                        />
                    </div>

                    <div className={styles["header-title"]}>
                        {!!type && (
                            <YakitTag color={(pluginTypeToName[type]?.color || undefined) as YakitTagColor | undefined}>
                                {pluginTypeToName[type]?.name || type}
                            </YakitTag>
                        )}
                        <div
                            className={classNames(styles["title-style"], "yakit-content-single-ellipsis")}
                            title={name || ""}
                        >
                            {name || ""}
                        </div>
                    </div>
                </div>

                <div className={styles["editor-code-container"]}>
                    <div className={styles["editor-code-tab-body"]}>
                        <div className={styles["editor-operation-and-execution"]}>
                            <div
                                tabIndex={activeTab !== "code" ? -1 : 1}
                                className={classNames(styles["editor-code-pane-show"], {
                                    [styles["editor-code-pane-hidden"]]: activeTab !== "code"
                                })}
                            >
                                <YakitEditor type={type} value={content} setValue={setContent} />
                            </div>

                            <div
                                tabIndex={activeTab !== "execResult" ? -1 : 1}
                                className={classNames(
                                    styles["editor-code-pane-show"],
                                    styles["editor-code-tab-execute"],
                                    {
                                        [styles["editor-code-pane-hidden"]]: activeTab !== "execResult"
                                    }
                                )}
                            >
                                {runtimeId ? (
                                    <>
                                        {streamInfo.progressState.length > 1 && (
                                            <div className={styles["plugin-executing-progress"]}>
                                                {streamInfo.progressState.map((ele, index) => (
                                                    <React.Fragment key={ele.id}>
                                                        {index !== 0 && (
                                                            <Divider type='vertical' style={{margin: 0, top: 2}} />
                                                        )}
                                                        <PluginExecuteProgress percent={ele.progress} name={ele.id} />
                                                    </React.Fragment>
                                                ))}
                                            </div>
                                        )}
                                        <div className={styles["result-body"]}>
                                            <PluginExecuteResult
                                                streamInfo={streamInfo}
                                                runtimeId={runtimeId}
                                                loading={isExecuting}
                                            />
                                        </div>
                                    </>
                                ) : (
                                    <YakitEmpty style={{marginTop: 60}} description={"点击【执行】以开始"} />
                                )}
                            </div>
                        </div>

                        <div className={styles["editor-params"]}>
                            <div className={styles["header"]}>
                                参数预览
                                <div className={styles["header-extra"]}>
                                    <YakitButton type='text' onClick={handleOpenScoreHint}>
                                        自动检测
                                    </YakitButton>
                                    <div
                                        className={styles["divider-style"]}
                                        style={["yak", "mitm", "codec"].includes(type) ? {marginRight: 0} : undefined}
                                    ></div>
                                    {["yak", "mitm", "codec"].includes(type) && (
                                        <>
                                            <YakitButton
                                                type='text'
                                                loading={fetchParamsLoading}
                                                onClick={() => handleFetchParams()}
                                            >
                                                获取参数
                                            </YakitButton>
                                            <div className={styles["divider-style"]}></div>
                                        </>
                                    )}
                                    {isExecuting ? (
                                        <YakitButton danger onClick={onStopExecute}>
                                            停止
                                        </YakitButton>
                                    ) : (
                                        <YakitButton icon={<SolidPlayIcon />} onClick={onStartExecute}>
                                            执行
                                        </YakitButton>
                                    )}
                                </div>
                            </div>

                            <div className={styles["container"]}>
                                <div className={styles["form-wrapper"]}>
                                    <Form
                                        form={form}
                                        onFinish={() => {}}
                                        size='small'
                                        labelCol={{span: 8}}
                                        wrapperCol={{span: 16}}
                                        labelWrap={true}
                                        validateMessages={{
                                            /* eslint-disable no-template-curly-in-string */
                                            required: "${label} 是必填字段"
                                        }}
                                    >
                                        <div className={styles["custom-params-wrapper"]}>
                                            {pluginRequiredItem(type)}
                                        </div>
                                        {isHiddenDefaultParams && isHiddenCustomParams
                                            ? null
                                            : pluginOptionalItem(type)}
                                    </Form>
                                </div>
                            </div>
                        </div>

                        {/* 代码评分弹窗 */}
                        <CodeScoreModal
                            type={type}
                            code={content || ""}
                            successHint=' '
                            failedHint=' '
                            specialHint=' '
                            hiddenSpecialBtn={true}
                            visible={scoreHint}
                            onCancel={handleScoreHintCallback}
                        />
                    </div>
                </div>
            </div>
        )
    })
)
