import React, {memo, useEffect, useMemo, useRef, useState} from "react"
import {PluginDebugBodyProps, PluginDebugProps} from "./PluginDebugType"
import {YakitDrawer} from "@/components/yakitUI/YakitDrawer/YakitDrawer"
import {useMemoizedFn, useSize, useUpdateEffect} from "ahooks"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {OutlinePuzzleIcon, OutlineRefreshIcon, OutlineSparklesIcon, OutlineXIcon} from "@/assets/icon/outline"
import {YakitCard} from "@/components/yakitUI/YakitCard/YakitCard"
import {YakitRadioButtons} from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtons"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {YakitEditor} from "@/components/yakitUI/YakitEditor/YakitEditor"
import {GetPluginLanguage, pluginTypeToName} from "../builtInData"
import {YakitTagColor} from "@/components/yakitUI/YakitTag/YakitTagType"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {YakitDiffEditor} from "@/components/yakitUI/YakitDiffEditor/YakitDiffEditor"
import {CodeScoreModule} from "../funcTemplate"
import {randomString} from "@/utils/randomUtil"
import useHoldGRPCStream from "@/hook/useHoldGRPCStream/useHoldGRPCStream"
import {failed, yakitNotify} from "@/utils/notification"
import {PluginExecuteResult} from "../operator/pluginExecuteResult/PluginExecuteResult"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import {SolidPlayIcon} from "@/assets/icon/solid"
import {Divider, Form} from "antd"
import {
    ExecuteEnterNodeByPluginParams,
    OutputFormComponentsByType,
    PluginExecuteProgress,
    PluginFixFormParams
} from "../operator/localPluginExecuteDetailHeard/LocalPluginExecuteDetailHeard"
import {YakParamProps} from "../pluginsType"
import {
    ExtraParamsNodeByType,
    FixExtraParamsNode
} from "../operator/localPluginExecuteDetailHeard/PluginExecuteExtraParams"
import {YakitBaseSelectRef} from "@/components/yakitUI/YakitSelect/YakitSelectType"
import {CustomPluginExecuteFormValue} from "../operator/localPluginExecuteDetailHeard/LocalPluginExecuteDetailHeardType"
import {ParamsToGroupByGroupName, getValueByType, getYakExecutorParam, onCodeToInfo} from "../editDetails/utils"
import {HTTPRequestBuilderParams} from "@/models/HTTPRequestBuilder"
import {DebugPluginRequest, apiCancelDebugPlugin, apiDebugPlugin} from "../utils"

import classNames from "classnames"
import styles from "./PluginDebug.module.scss"

export const PluginDebug: React.FC<PluginDebugProps> = memo((props) => {
    const {plugin, getContainer, visible, onClose, onMerge} = props

    const getContainerSize = useSize(getContainer)
    // 抽屉展示高度
    const showHeight = useMemo(() => {
        return getContainerSize?.height || 400
    }, [getContainerSize])

    /** 插件类型 */
    const pluginType = useMemo(() => {
        return plugin?.Type || "yak"
    }, [plugin])

    // 插件源码(修改后的)
    const [content, setContent] = useState<string>("")

    useEffect(() => {
        if (visible) {
            return () => {
                setContent("")
            }
        }
    }, [visible])

    // 关闭
    const onCancel = useMemoizedFn(() => {
        if (onClose) onClose()
    })

    /** --------------- 自动评分 Start --------------- */
    const [scoreShow, setScoreShow] = useState<boolean>(false)
    const onOpenScore = useMemoizedFn(() => {
        if (!scoreShow) {
            setIsPass(0)
            setTimeout(() => {
                setScoreShow(true)
            }, 10)
        }
    })
    /** @description 0-未检测;1-不合格;2-合格 */
    const [isPass, setIsPass] = useState<number>(0)
    // 评分是否合格
    const onCallbackScore = useMemoizedFn((v: boolean) => {
        setIsPass(v ? 2 : 1)
    })
    const onOkScore = useMemoizedFn(() => {
        onOpenDiff()
        onCancelScore()
    })
    const onCancelScore = useMemoizedFn(() => {
        if (scoreShow) setScoreShow(false)
    })
    /** --------------- 自动评分 End --------------- */

    /** --------------- 合并代码 Start --------------- */
    const [diffShow, setDiffShow] = useState<boolean>(false)
    // 强制更新对比器显示内容
    const triggerDiffUpdate = useRef<boolean>(false)
    // 编辑器语言
    const diffLanguage = useMemo(() => {
        return GetPluginLanguage(pluginType)
    }, [pluginType])

    const onOpenDiff = useMemoizedFn(() => {
        if (!plugin) {
            failed("未获取插件信息，请关闭调试窗后再次尝试")
            return
        }

        if (plugin.Content === content) {
            if (onClose) onClose()
            return
        } else {
            triggerDiffUpdate.current = !triggerDiffUpdate.current
            setDiffShow(true)
        }
    })
    const onOkDiff = useMemoizedFn(() => {
        if (onMerge) onMerge(content)
        onCancelDiff()
    })
    const onCancelDiff = useMemoizedFn(() => {
        if (diffShow) setDiffShow(false)
    })
    /** --------------- 合并代码 End --------------- */

    return (
        <>
            <YakitDrawer
                getContainer={getContainer}
                placement='bottom'
                mask={false}
                closable={false}
                keyboard={false}
                height={showHeight}
                visible={visible}
                className={classNames(styles["plugin-debug-drawer"])}
                title={<div className={styles["header-title"]}>插件调试</div>}
                extra={
                    <div className={styles["header-extra-wrapper"]}>
                        <YakitButton type='outline2' icon={<OutlineSparklesIcon />} onClick={onOpenScore}>
                            自动评分
                        </YakitButton>
                        <YakitButton icon={<OutlinePuzzleIcon />} onClick={onOpenDiff}>
                            合并代码
                        </YakitButton>

                        <YakitButton type='text2' icon={<OutlineXIcon />} onClick={onCancel} />
                    </div>
                }
                onClose={onCancel}
            >
                {visible && <PluginDebugBody plugin={plugin} newCode={content} setNewCode={setContent} />}
            </YakitDrawer>

            <YakitModal
                title='代码对比'
                type='white'
                width='80%'
                centered={true}
                maskClosable={false}
                closable={true}
                visible={diffShow}
                okText='合并'
                onCancel={onCancelDiff}
                onOk={onOkDiff}
            >
                <div className={styles["diff-code-modal"]}>
                    <YakitDiffEditor
                        leftDefaultCode={plugin?.Content || ""}
                        leftReadOnly={true}
                        rightDefaultCode={content}
                        setRightCode={setContent}
                        triggerUpdate={triggerDiffUpdate.current}
                        language={diffLanguage}
                    />
                </div>
            </YakitModal>

            <YakitModal
                title='插件评分'
                type='white'
                width={506}
                centered={true}
                maskClosable={false}
                closable={true}
                destroyOnClose={true}
                visible={scoreShow}
                okText='合并代码'
                okButtonProps={{
                    icon: <OutlinePuzzleIcon />,
                    style: isPass === 2 ? undefined : {display: "none"}
                }}
                cancelButtonProps={{style: isPass !== 0 ? undefined : {display: "none"}}}
                onOk={onOkScore}
                onCancel={onCancelScore}
            >
                <CodeScoreModule
                    type={pluginType}
                    code={content}
                    isStart={scoreShow}
                    successWait={10}
                    successHint='表现良好，检测通过'
                    failedHint='检测不通过，请根据提示修改'
                    callback={onCallbackScore}
                />
            </YakitModal>
        </>
    )
})

export const PluginDebugBody: React.FC<PluginDebugBodyProps> = memo((props) => {
    const {plugin, newCode, setNewCode} = props

    /** 插件类型 */
    const pluginType = useMemo(() => {
        return plugin?.Type || "yak"
    }, [plugin])
    // 插件类型的tag颜色
    const pluginTypeColor = useMemo(() => {
        try {
            return pluginTypeToName[pluginType].color || undefined
        } catch (error) {
            return undefined
        }
    }, [pluginType])

    // 插件参数
    const [params, setParams] = useState<YakParamProps[]>([])
    /** 必填参数 */
    const requiredParams = useMemo(() => {
        return params.filter((item) => !!item.Required) || []
    }, [params])
    /** 选填参数 */
    const groupParams = useMemo(() => {
        const arr = params.filter((item) => !item.Required) || []
        return ParamsToGroupByGroupName(arr)
    }, [params])

    const [fetchParamsLoading, setFetchParamsLoading] = useState<boolean>(false)
    // 获取参数
    const onFetchParams = useMemoizedFn(async () => {
        if (fetchParamsLoading) return
        if (!plugin) {
            failed("未获取插件信息，请关闭调试窗后再次尝试")
            return
        }

        setFetchParamsLoading(true)
        const codeInfo = await onCodeToInfo(plugin.Type, newCode || "")
        if (codeInfo) {
            setParams(codeInfo.CliParameter)
        }
        setTimeout(() => {
            setFetchParamsLoading(false)
        }, 200)
    })

    // init
    useEffect(() => {
        if (plugin) {
            if (plugin.Type === "yak") setParams(plugin.Params || [])
            // 非yak类型插件固定参数
            else setParams([])
            setNewCode(newCode || plugin.Content || "")
        } else {
            failed("未获取插件信息，请关闭调试窗后再次尝试")
        }

        return () => {
            setParams([])
        }
    }, [plugin])
    // 更新表单内容
    useUpdateEffect(() => {
        initFormValue()
    }, [params])

    /** --------------- 参数部分逻辑 Start --------------- */
    const [form] = Form.useForm()

    // 设置非(yak|lua)类型的插件参数初始值
    const onSettingDefault = useMemoizedFn(() => {
        let defaultValue: CustomPluginExecuteFormValue = {
            IsHttps: false,
            IsRawHTTPRequest: false,
            RawHTTPRequest: Buffer.from("", "utf-8"),
            Method: "GET",
            Path: [],
            GetParams: [],
            Headers: [],
            Cookie: []
        }
        form.setFieldsValue({...defaultValue})
    })

    const initFormValue = useMemoizedFn(() => {
        if (!["yak", "lua"].includes(pluginType)) {
            onSettingDefault()
            return
        }

        // 表单内数据
        let formData: CustomPluginExecuteFormValue = {}
        if (form) formData = (form.getFieldsValue() || {}) as CustomPluginExecuteFormValue

        let newFormValue: CustomPluginExecuteFormValue = {}
        params.forEach((ele) => {
            let initValue = formData[ele.Field] || ele.Value || ele.DefaultValue
            const value = getValueByType(initValue, ele.TypeVerbose)
            newFormValue = {
                ...newFormValue,
                [ele.Field]: value
            }
        })
        form.setFieldsValue({...newFormValue})
    })

    const pluginRequiredItem = (type: string) => {
        switch (type) {
            case "yak":
            case "lua":
                return (
                    <ExecuteEnterNodeByPluginParams
                        paramsList={requiredParams}
                        pluginType={pluginType}
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
                        codeType='plaintext'
                        disabled={isExecuting}
                    />
                )
            case "mitm":
            case "port-scan":
            case "nuclei":
                return <PluginFixFormParams form={form} disabled={isExecuting} />
            default:
                return null
        }
    }

    /** 请求类型-为原始请求则不展示额外参数 */
    const isRawHTTPRequest = Form.useWatch("IsRawHTTPRequest", form)

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
                return groupParams.length > 0 ? (
                    <>
                        <div className={styles["additional-params-divider"]}>
                            <div className={styles["text-style"]}>额外参数 (非必填)</div>
                            <div className={styles["divider-style"]}></div>
                        </div>
                        <ExtraParamsNodeByType extraParamsGroup={groupParams} pluginType={pluginType} />

                        <div className={styles["to-end"]}>已经到底啦～</div>
                    </>
                ) : null

            case "mitm":
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
    /** --------------- 参数部分逻辑 End --------------- */

    /** --------------- 执行部分逻辑 Start --------------- */
    const [activeTab, setActiveTab] = useState<string>("code")

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
                .then((value: any) => {
                    // console.log("插件执行时的表单值", value)
                    // 保存参数-请求路径的选项
                    if (pathRef && pathRef.current) {
                        pathRef.current.onSetRemoteValues(value?.Path || [])
                    }

                    const requestParams: DebugPluginRequest = {
                        Code: newCode,
                        PluginType: pluginType,
                        Input: value["Input"] || "",
                        HTTPRequestTemplate: {} as HTTPRequestBuilderParams,
                        ExecParams: [],
                        PluginName: ""
                    }

                    switch (pluginType) {
                        case "yak":
                        case "lua":
                            const request: Record<string, any> = {}
                            for (let el of params) request[el.Field] = value[el.Field] || undefined
                            requestParams.ExecParams = getYakExecutorParam({...value})
                            break
                        case "codec":
                            break
                        case "mitm":
                        case "port-scan":
                        case "nuclei":
                            requestParams.HTTPRequestTemplate = {
                                ...value,
                                IsRawHTTPRequest: value.requestType === "original",
                                RawHTTPRequest: value.RawHTTPRequest
                                    ? Buffer.from(value.RawHTTPRequest, "utf8")
                                    : Buffer.from("", "utf8")
                            }
                            break
                        default:
                            break
                    }

                    debugPluginStreamEvent.reset()
                    setRuntimeId("")
                    setActiveTab("execResult")
                    apiDebugPlugin(requestParams, tokenRef.current).then(() => {
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
    /** --------------- 执行部分逻辑 End --------------- */

    // 停靠模式-浮窗
    return (
        <div className={styles["plugin-debug-wrapper"]}>
            <div className={styles["left-wrapper"]}>
                <YakitCard
                    title='参数列表'
                    style={{borderTop: 0}}
                    headClassName={styles["left-header-wrapper"]}
                    extra={
                        <div className={styles["header-extra"]}>
                            {plugin?.Type === "yak" && (
                                <>
                                    <YakitButton type='text' loading={fetchParamsLoading} onClick={onFetchParams}>
                                        获取参数
                                        <OutlineRefreshIcon />
                                    </YakitButton>
                                    <div className={styles["divider-wrapper"]}></div>
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
                    }
                    bodyClassName={styles["left-body-wrapper"]}
                >
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
                            <div className={styles["custom-params-wrapper"]}>{pluginRequiredItem(pluginType)}</div>
                            {isRawHTTPRequest ? null : pluginOptionalItem(pluginType)}
                        </Form>
                    </div>
                </YakitCard>
            </div>
            <div className={styles["right-wrapper"]}>
                <div className={styles["right-header-wrapper"]}>
                    <YakitRadioButtons
                        buttonStyle='solid'
                        value={activeTab}
                        options={[
                            {value: "code", label: "源码"},
                            {value: "execResult", label: "执行结果"}
                        ]}
                        onChange={(e) => setActiveTab(e.target.value)}
                    />
                    <div className={styles["header-info"]}>
                        <YakitTag color={pluginTypeColor as YakitTagColor}>
                            {pluginTypeToName[pluginType].name || pluginType}
                        </YakitTag>
                        {
                            <div
                                className={classNames(styles["info-name"], "yakit-content-single-ellipsis")}
                                title={plugin?.ScriptName || ""}
                            >
                                {plugin?.ScriptName || ""}
                            </div>
                        }
                    </div>
                </div>

                <div className={styles["right-body-wrapper"]}>
                    <div
                        tabIndex={activeTab !== "code" ? -1 : 1}
                        className={classNames(styles["tab-show"], {
                            [styles["tab-hidden"]]: activeTab !== "code"
                        })}
                    >
                        <YakitEditor type={pluginType} value={newCode} setValue={setNewCode} />
                    </div>

                    <div
                        tabIndex={activeTab !== "execResult" ? -1 : 1}
                        className={classNames(styles["tab-show"], {
                            [styles["tab-hidden"]]: activeTab !== "execResult"
                        })}
                    >
                        {runtimeId ? (
                            <>
                                {streamInfo.progressState.length > 1 && (
                                    <div className={styles["plugin-executing-progress"]}>
                                        {streamInfo.progressState.map((ele, index) => (
                                            <React.Fragment key={ele.id}>
                                                {index !== 0 && <Divider type='vertical' style={{margin: 0, top: 2}} />}
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
            </div>
        </div>
    )
})
