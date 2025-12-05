import React, {forwardRef, useEffect, useImperativeHandle, useRef, useState} from "react"
import {AIToolEditorInfoFormProps, AIToolEditorProps, EditorAIToolTab} from "./AIToolEditorType"
import {useCreation, useDebounceFn, useMemoizedFn, useUpdateEffect} from "ahooks"
import emiter from "@/utils/eventBus/eventBus"
import {YakitRoute} from "@/enums/yakitRoute"
import {useSubscribeClose} from "@/store/tabSubscribe"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {
    OutlineChevrondownIcon,
    OutlineChevronrightIcon,
    OutlineExitIcon,
    OutlineIdentificationIcon,
    OutlineRefreshIcon,
    OutlineTagIcon
} from "@/assets/icon/outline"
import {SolidPlayIcon, SolidStoreIcon} from "@/assets/icon/solid"
import {DefaultToolYakToCode} from "../defaultConstant"
import {Divider, Form} from "antd"
import cloneDeep from "lodash/cloneDeep"
import {failed, yakitNotify} from "@/utils/notification"
import classNames from "classnames"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import {PluginEditorBuiltInTags} from "@/pages/pluginEditor/defaultconstants"
import {YakitRadioButtons} from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtons"
import {YakitEditor} from "@/components/yakitUI/YakitEditor/YakitEditor"
import {YakParamProps} from "@/pages/plugins/pluginsType"
import {
    getValueByType,
    getYakExecutorParam,
    onCodeToInfo,
    ParamsToGroupByGroupName
} from "@/pages/plugins/editDetails/utils"
import {CustomPluginExecuteFormValue} from "@/pages/plugins/operator/localPluginExecuteDetailHeard/LocalPluginExecuteDetailHeardType"
import {
    ExecuteEnterNodeByPluginParams,
    PluginExecuteProgress
} from "@/pages/plugins/operator/localPluginExecuteDetailHeard/LocalPluginExecuteDetailHeard"
import {ExtraParamsNodeByType} from "@/pages/plugins/operator/localPluginExecuteDetailHeard/PluginExecuteExtraParams"
import {apiCancelDebugPlugin, apiDebugPlugin, DebugPluginRequest} from "@/pages/plugins/utils"
import {randomString} from "@/utils/randomUtil"
import useHoldGRPCStream from "@/hook/useHoldGRPCStream/useHoldGRPCStream"
import {getJsonSchemaListResult} from "@/components/JsonFormWrapper/JsonFormWrapper"
import {HTTPRequestBuilderParams} from "@/models/HTTPRequestBuilder"
import {PluginExecuteResult} from "@/pages/plugins/operator/pluginExecuteResult/PluginExecuteResult"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import {CodeScoreModal} from "@/pages/plugins/funcTemplate"
import {
    AITool,
    AIToolGenerateMetadataRequest,
    SaveAIToolRequest,
    UpdateAIToolRequest
} from "@/pages/ai-agent/type/aiTool"
import {
    grpcAIToolGenerateDescription,
    grpcAIToolGenerateKeywords,
    grpcSaveAITool,
    grpcUpdateAITool,
    isAITool
} from "../utils"
import {PageNodeItemProps, usePageInfo} from "@/store/pageInfo"
import {shallow} from "zustand/shallow"
import {grpcGetAIToolById} from "@/pages/ai-agent/aiToolList/utils"
import {apiGetGlobalNetworkConfig} from "@/pages/spaceEngine/utils"
import {setAIModal} from "@/pages/ai-agent/aiModelList/AIModelList"
import styles from "./AIToolEditor.module.scss"
import {DbOperateMessage} from "@/pages/layout/mainOperatorContent/utils"

const AIToolEditor: React.FC<AIToolEditorProps> = React.memo((props) => {
    const {isModify} = props

    const [saveLoading, setSaveLoading] = useState<boolean>(false)
    const [fetchDataLoading, setFetchDataLoading] = useState<boolean>(false)

    const [activeTab, setActiveTab] = useState<EditorAIToolTab>("code")

    const [content, setContent] = useState<string>(DefaultToolYakToCode)

    const [form] = Form.useForm()

    const infoFormRef = useRef<any>(null)
    const toolIdRef = useRef<number>(0)

    const isShowCode = useCreation(() => {
        return activeTab === "code"
    }, [activeTab])
    const isShowExecResult = useCreation(() => {
        return activeTab === "execResult"
    }, [activeTab])

    // #region 判断新建还是编辑-编辑下读取编辑信息
    const {queryPagesDataById} = usePageInfo(
        (s) => ({
            queryPagesDataById: s.queryPagesDataById
        }),
        shallow
    )

    useEffect(() => {
        if (isModify) {
            handleModifyInit()
        }
    }, [isModify])

    const handleModifyInit = useMemoizedFn(() => {
        setFetchDataLoading(true)

        const currentItem: PageNodeItemProps | undefined = queryPagesDataById(
            YakitRoute.ModifyAITool,
            YakitRoute.ModifyAITool
        )
        if (currentItem && currentItem.pageParamsInfo.modifyAIToolPageInfo) {
            const id = currentItem.pageParamsInfo.modifyAIToolPageInfo?.id
            if (!id) {
                yakitNotify("error", `尝试编辑的工具异常(ID: ${id}), 请关闭页面重试`)
                return
            }

            grpcGetAIToolById(id, false)
                .then((res) => {
                    if (!res) {
                        yakitNotify("error", `未获取到待编辑工具的详情, 请关闭页面重试`)
                        setDelayCancelFetchDataLoading()
                        return
                    }
                    try {
                        if (infoFormRef.current) {
                            const formValue: SaveAIToolRequest = {
                                Name: res.Name ?? "",
                                Description: res.Description ?? "",
                                Keywords: res.Keywords ?? "",
                                Content: "",
                                ToolPath: ""
                            }
                            infoFormRef.current.setFormValues({
                                ...formValue
                            })
                        }
                        toolIdRef.current = res.ID || 0
                        setContent(res.Content || DefaultToolYakToCode)
                    } catch (error) {}
                })
                .catch(() => {
                    yakitNotify("error", `未获取到待编辑工具的详情, 请关闭页面重试`)
                })
                .finally(() => setDelayCancelFetchDataLoading())
        }
    })
    const setDelayCancelFetchDataLoading = useMemoizedFn(() => {
        setTimeout(() => {
            setFetchDataLoading(false)
        }, 200)
    })
    // #endregion
    const handleSave = useMemoizedFn(() => {
        return new Promise<void>(async (resolve, reject) => {
            if (!infoFormRef.current) {
                reject("表单不存在")
                return
            }
            try {
                const formData: SaveAIToolRequest | null = await infoFormRef.current.getFormValues()
                if (!formData) {
                    reject()
                    return
                }
                setSaveLoading(true)
                const params: UpdateAIToolRequest = {
                    ID: toolIdRef.current,
                    Name: formData.Name ?? "",
                    Description: formData.Description ?? "",
                    Content: content,
                    ToolPath: "",
                    Keywords: formData.Keywords ?? []
                }
                if (isModify && !params.ID) {
                    reject("数据错误,编辑状态下ID不能为空")
                    return
                }
                const func = !!toolIdRef.current ? grpcUpdateAITool : grpcSaveAITool
                func(params)
                    .then((res: AITool | DbOperateMessage) => {
                        if (isAITool(res)) {
                            toolIdRef.current = res.ID
                        }
                        yakitNotify("success", "保存成功")
                        resolve()
                    })
                    .catch(reject)
                    .finally(() => {
                        setTimeout(() => {
                            setSaveLoading(false)
                        }, 200)
                    })
            } catch (error) {
                setSaveLoading(false)
                reject(error)
            }
        })
    })

    // #region 注册关闭页面时的触发事件
    // 保存并退出
    const handleSaveAndExit = useMemoizedFn(() => {
        handleSave().then(() => {
            if (modalRef.current) modalRef.current.destroy()
            emiter.emit(
                "closePage",
                JSON.stringify({route: !!isModify ? YakitRoute.ModifyAITool : YakitRoute.AddAITool})
            )
        })
    })
    // 是否保存并打开触发编辑的工具信息
    const handleSaveAndOpen = useMemoizedFn(async (isSave?: boolean) => {
        try {
            if (isSave) await handleSave()
            if (modalRef.current) modalRef.current.destroy()
            handleModifyInit()
        } catch (error) {}
    })
    const {setSubscribeClose, removeSubscribeClose} = useSubscribeClose()
    // 二次提示框的实例
    const modalRef = useRef<{destroy: () => void}>({
        destroy: () => {}
    })
    useEffect(() => {
        if (isModify) {
            setSubscribeClose(YakitRoute.ModifyAITool, {
                close: async () => {
                    return {
                        title: "工具未保存",
                        content: "是否要将工具保存?",
                        confirmLoading: saveLoading,
                        maskClosable: false,
                        onOk: (m) => {
                            modalRef.current = m
                            handleSaveAndExit()
                        },
                        onCancel: () => {
                            emiter.emit("closePage", JSON.stringify({route: YakitRoute.ModifyAITool}))
                        }
                    }
                },
                reset: async () => {
                    return {
                        title: "工具未保存",
                        content: "是否要将当前工具保存，并编辑点击的工具?",
                        confirmLoading: saveLoading,
                        maskClosable: false,
                        onOk: (m) => {
                            modalRef.current = m
                            handleSaveAndOpen(true)
                        },
                        onCancel: () => {
                            handleSaveAndOpen()
                        }
                    }
                }
            })

            return () => {
                removeSubscribeClose(YakitRoute.ModifyAITool)
            }
        } else {
            setSubscribeClose(YakitRoute.AddAITool, {
                close: async () => {
                    return {
                        title: "工具未保存",
                        content: "是否要将工具保存?",
                        confirmLoading: saveLoading,
                        maskClosable: false,
                        onOk: (m) => {
                            modalRef.current = m
                            handleSaveAndExit()
                        },
                        onCancel: () => {
                            emiter.emit("closePage", JSON.stringify({route: YakitRoute.AddAITool}))
                        }
                    }
                }
            })
            return () => {
                removeSubscribeClose(YakitRoute.AddAITool)
            }
        }
    }, [isModify])
    // #endregion

    //#region  代码评分
    const [scoreHint, setScoreHint] = useState<boolean>(false)
    const handleOpenScoreHint = useMemoizedFn(() => {
        if (scoreHint) return
        setScoreHint(true)
    })
    const handleScoreHintCallback = useMemoizedFn((value: boolean) => {
        if (!value) setScoreHint(false)
    })
    //#endregion

    //#region 获取参数
    const [fetchParamsLoading, setFetchParamsLoading] = useState(false)
    const [params, setParams] = useState<YakParamProps[]>([])
    useUpdateEffect(() => {
        handleFetchParams(true)
    }, [content])
    const handleFetchParams = useDebounceFn(
        async (hiddenError?: boolean) => {
            if (fetchParamsLoading) return

            setFetchParamsLoading(true)
            try {
                const codeInfo = await onCodeToInfo({type: "yak", code: content || ""}, hiddenError)
                if (codeInfo) {
                    setParams([...codeInfo.CliParameter])
                    handleInitFormValue(codeInfo.CliParameter)
                }
            } catch (error) {
            } finally {
                setFetchParamsLoading(false)
            }
        },
        {wait: 300}
    ).run

    /** 填充表单默认值 */
    const handleInitFormValue = useMemoizedFn((codeInfo) => {
        if (!codeInfo || codeInfo.length === 0) {
            !!form && form.resetFields()
        } else {
            // 表单内数据
            let formData: CustomPluginExecuteFormValue = {}
            if (form) formData = (form.getFieldsValue() || {}) as CustomPluginExecuteFormValue

            let defaultValue: CustomPluginExecuteFormValue | undefined = {...formData}

            let newFormValue: CustomPluginExecuteFormValue = {}
            codeInfo.forEach((ele) => {
                let initValue = formData[ele.Field] || ele.Value || ele.DefaultValue
                const value = getValueByType(initValue, ele.TypeVerbose)
                newFormValue = {
                    ...newFormValue,
                    [ele.Field]: value
                }
            })
            form.setFieldsValue({...cloneDeep(defaultValue || {}), ...newFormValue})
        }
    })

    /** 必要参数 */
    const requiredParams = useCreation(() => {
        return params.filter((item) => !!item.Required) || []
    }, [params])
    /** 选填参数 */
    const groupParams = useCreation(() => {
        const arr = params.filter((item) => !item.Required) || []
        return ParamsToGroupByGroupName(arr)
    }, [params])
    // #endregion

    //#region 执行调试

    const [runtimeId, setRuntimeId] = useState<string>("")
    const [isExecuting, setIsExecuting] = useState<boolean>(false)
    const tokenRef = useRef<string>(randomString(40))
    const jsonSchemaListRef = useRef<{
        [key: string]: any
    }>({})
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
    const onStopExecute = useMemoizedFn(() => {
        apiCancelDebugPlugin(tokenRef.current).then(() => {
            debugPluginStreamEvent.stop()
            setIsExecuting(false)
        })
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

                    const requestParams: DebugPluginRequest = {
                        Code: content,
                        PluginType: "yak",
                        Input: value["Input"] || "",
                        HTTPRequestTemplate: {} as HTTPRequestBuilderParams,
                        ExecParams: [],
                        PluginName: ""
                    }

                    requestParams.ExecParams = getYakExecutorParam({...value})
                    debugPluginStreamEvent.reset()
                    setRuntimeId("")
                    setActiveTab("execResult")
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
    //#endregion

    return (
        <div className={styles["tool-editor"]}>
            <YakitSpin spinning={fetchDataLoading}>
                <div className={styles["tool-editor-wrapper"]}>
                    <div className={styles["tool-editor-header"]}>
                        <div className={styles["header-title"]}>{isModify ? "编辑工具" : "新建工具"}</div>

                        <div className={styles["header-btn-group"]}>
                            <YakitButton
                                loading={saveLoading}
                                type='outline1'
                                icon={<OutlineExitIcon />}
                                onClick={() => handleSaveAndExit()}
                            >
                                保存并退出
                            </YakitButton>
                            <YakitButton loading={saveLoading} icon={<SolidStoreIcon />} onClick={handleSave}>
                                保存
                            </YakitButton>
                        </div>
                    </div>

                    <div className={styles["tool-editor-body"]}>
                        <AIToolEditorInfoForm ref={infoFormRef} content={content} />

                        <div className={styles["tool-editor-right"]}>
                            <YakitRadioButtons
                                buttonStyle='solid'
                                value={activeTab}
                                options={[
                                    {value: "code", label: "源码"},
                                    {value: "execResult", label: "执行结果"}
                                ]}
                                onChange={(e) => setActiveTab(e.target.value)}
                            />
                            <div className={styles["tool-editor-content"]}>
                                <div className={styles["tool-tab-content"]}>
                                    <div
                                        tabIndex={isShowCode ? 1 : -1}
                                        className={classNames(styles["right-pane"], {
                                            [styles["right-pane-hidden"]]: !isShowCode
                                        })}
                                    >
                                        <div className={classNames(styles["ai-tool-editor-code-and-params"])}>
                                            <YakitEditor type={"yak"} value={content} setValue={setContent} />
                                        </div>
                                    </div>

                                    <div
                                        tabIndex={isShowExecResult ? 1 : -1}
                                        className={classNames(styles["right-pane"], {
                                            [styles["right-pane-hidden"]]: !isShowExecResult
                                        })}
                                    >
                                        <div className={styles["plugin-executing-wrapper"]}>
                                            {runtimeId ? (
                                                <>
                                                    {streamInfo.progressState.length > 1 && (
                                                        <div className={styles["plugin-executing-progress"]}>
                                                            {streamInfo.progressState.map((ele, index) => (
                                                                <React.Fragment key={ele.id}>
                                                                    {index !== 0 && (
                                                                        <Divider
                                                                            type='vertical'
                                                                            style={{margin: 0, top: 2}}
                                                                        />
                                                                    )}
                                                                    <PluginExecuteProgress
                                                                        percent={ele.progress}
                                                                        name={ele.id}
                                                                    />
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
                                                <YakitEmpty
                                                    style={{marginTop: 60}}
                                                    description={"点击【执行】以开始"}
                                                />
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className={styles["editor-params-preview-wrapper"]}>
                                    <div className={styles["params-preview-header"]}>
                                        <div className={styles["header-title"]}>参数预览</div>
                                        <div className={styles["header-extra"]}>
                                            <YakitButton type='text' onClick={handleOpenScoreHint}>
                                                自动检测
                                            </YakitButton>
                                            <div className={styles["divider-style"]} style={{marginRight: 0}}></div>
                                            <YakitButton
                                                type='text'
                                                loading={fetchParamsLoading}
                                                onClick={() => handleFetchParams()}
                                                icon={<OutlineRefreshIcon />}
                                            >
                                                获取参数
                                            </YakitButton>
                                            <div className={styles["divider-style"]}></div>
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

                                    <div className={styles["params-preview-container"]}>
                                        <Form
                                            form={form}
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
                                                <ExecuteEnterNodeByPluginParams
                                                    paramsList={requiredParams}
                                                    pluginType={"yak"}
                                                    isExecuting={false}
                                                />
                                            </div>

                                            {!!groupParams.length && (
                                                <div className={styles["additional-params-divider"]}>
                                                    <div className={styles["text-style"]}>额外参数 (非必填)</div>
                                                    <div className={styles["divider-horizontal-style"]}></div>
                                                </div>
                                            )}
                                            {groupParams.length > 0 && (
                                                <ExtraParamsNodeByType
                                                    extraParamsGroup={groupParams}
                                                    pluginType={"yak"}
                                                />
                                            )}
                                            {(!!requiredParams.length || !!groupParams.length) && (
                                                <div className={styles["to-end"]}>已经到底啦～</div>
                                            )}
                                        </Form>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                {/* 代码评分弹窗 */}
                <CodeScoreModal
                    title='工具基础检测'
                    type='yak'
                    code={content || ""}
                    successHint=' '
                    failedHint=' '
                    specialHint=' '
                    hiddenSpecialBtn={true}
                    visible={scoreHint}
                    onCancel={handleScoreHintCallback}
                />
            </YakitSpin>
        </div>
    )
})

export default AIToolEditor

const AIToolEditorInfoForm: React.FC<AIToolEditorInfoFormProps> = React.memo(
    forwardRef((props, ref) => {
        const {content} = props
        const [expand, setExpand] = useState(true)

        const [form] = Form.useForm<SaveAIToolRequest>()
        useImperativeHandle(
            ref,
            () => ({
                setFormValues: handleSetFormValues,
                getFormValues: handleGetFormValues
            }),
            []
        )
        //#region Form表单操作
        const handleSetFormValues = useMemoizedFn((values: SaveAIToolRequest) => {
            const data = cloneDeep(values)
            if (form) {
                form.setFieldsValue(data)
            }
        })
        const handleGetFormValues = useMemoizedFn(() => {
            return new Promise<SaveAIToolRequest | null>(async (resolve, reject) => {
                try {
                    if (!form) {
                        yakitNotify("error", "获取不到表单实例数据, 请关闭页面后重试")
                        resolve(null)
                    }

                    form.validateFields()
                        .then((formData) => {
                            const info: SaveAIToolRequest = {
                                Name: formData.Name ?? "",
                                Description: formData.Description ?? "",
                                ToolPath: formData.ToolPath ?? "",
                                Keywords: formData.Keywords ?? [],
                                Content: ""
                            }
                            if (!info.Name) {
                                yakitNotify("error", "名称不能为空")
                                resolve(null)
                                return
                            }
                            resolve(info)
                        })
                        .catch(() => {
                            reject("表单验证失败，请检查必填项是否填写完整")
                        })
                } catch (error) {
                    if (!expand) setExpand(true)
                    resolve(null)
                }
            })
        })
        //#endregion
        const handleChangeExpand = useMemoizedFn(() => {
            setExpand((old) => !old)
        })
        //#region AI生成相关数据
        const [keywordsLoading, setKeywordsLoading] = useState<boolean>(false)
        const [descriptionLoading, setDescriptionLoading] = useState<boolean>(false)
        const getGrpcAIToolGenerateParams = useMemoizedFn(() => {
            const formData = form.getFieldsValue()
            const params: AIToolGenerateMetadataRequest = {
                ToolName: formData.Name || "",
                Content: content
            }
            return params
        })
        const onGetDescriptionByAI = useMemoizedFn(() => {
            if (!content) {
                yakitNotify("error", "请编写代码以后再点击生成")
                return
            }
            const params: AIToolGenerateMetadataRequest = getGrpcAIToolGenerateParams()
            setDescriptionLoading(true)
            grpcAIToolGenerateDescription(params)
                .then((Description) => {
                    form.setFieldsValue({
                        Description
                    })
                })
                .finally(() => {
                    setTimeout(() => {
                        setDescriptionLoading(false)
                    }, 200)
                })
        })
        const onGetKeywordsByAI = useMemoizedFn(() => {
            if (!content) {
                yakitNotify("error", "请编写代码以后再点击生成")
                return
            }
            const params: AIToolGenerateMetadataRequest = getGrpcAIToolGenerateParams()
            setKeywordsLoading(true)
            grpcAIToolGenerateKeywords(params)
                .then((Keywords) => {
                    form.setFieldsValue({
                        Keywords
                    })
                })
                .finally(() => {
                    setTimeout(() => {
                        setKeywordsLoading(false)
                    }, 200)
                })
        })
        const onConfig = useMemoizedFn(() => {
            apiGetGlobalNetworkConfig().then((obj) => {
                setAIModal({
                    config: obj,
                    onSuccess: () => {}
                })
            })
        })
        const formExtraAI = useMemoizedFn((params: {generate: () => void; loading: boolean}) => {
            const {generate, loading} = params
            return (
                <div className={styles["form-help"]}>
                    配置AI后可用AI生成描述与tags
                    <YakitButton type='text' onClick={generate} loading={loading}>
                        点击生成
                    </YakitButton>
                    如未配置
                    <YakitButton type='text' onClick={onConfig}>
                        请点此配置
                    </YakitButton>
                </div>
            )
        })
        //#endregion
        return (
            <div
                className={classNames(styles["ai-tool-editor-info-form"], {
                    [styles["ai-tool-editor-info-hidden"]]: !expand
                })}
            >
                <div className={styles["editor-info-form"]}>
                    <div className={styles["editor-info-form-header"]} onClick={handleChangeExpand}>
                        <YakitButton
                            type='outline2'
                            size='small'
                            className={styles["expand-btn"]}
                            icon={<OutlineChevronrightIcon />}
                        />

                        <div className={styles["header-title"]}>基础信息</div>
                    </div>

                    <div className={styles["editor-info-form-body"]}>
                        <Form className={styles["form-container"]} form={form} layout='vertical'>
                            <Form.Item
                                label={
                                    <>
                                        工具名称<span className='form-item-required'>*</span>:
                                    </>
                                }
                                name='Name'
                                required={true}
                                rules={[
                                    {
                                        validator: async (_, value) => {
                                            if (!value || !value.trim())
                                                return Promise.reject(new Error("工具名称必填"))
                                            if (value.trim().length > 100)
                                                return Promise.reject(new Error("名称最长100位"))
                                        }
                                    }
                                ]}
                            >
                                <YakitInput
                                    wrapperClassName={styles["item-input"]}
                                    placeholder='请输入...'
                                    size='large'
                                    prefix={<OutlineIdentificationIcon />}
                                    maxLength={100}
                                />
                            </Form.Item>

                            <Form.Item
                                label={
                                    <>
                                        描述<span className='form-item-required'>*</span>:
                                    </>
                                }
                                name='Description'
                                required={true}
                                rules={[
                                    {
                                        validator: async (_, value) => {
                                            if (!value || !value.trim()) return Promise.reject(new Error("描述必填"))
                                        }
                                    }
                                ]}
                                extra={formExtraAI({
                                    generate: onGetDescriptionByAI,
                                    loading: descriptionLoading
                                })}
                            >
                                <YakitInput.TextArea rows={3} placeholder='请输入...' />
                            </Form.Item>

                            <Form.Item
                                label={
                                    <>
                                        Tag<span className='form-item-required'>*</span>:
                                    </>
                                }
                                extra={formExtraAI({
                                    generate: onGetKeywordsByAI,
                                    loading: keywordsLoading
                                })}
                            >
                                <Form.Item noStyle name='Keywords' rules={[{required: true, message: "Tag必填"}]}>
                                    <YakitSelect
                                        wrapperClassName={styles["item-select"]}
                                        mode='tags'
                                        allowClear
                                        size='large'
                                    >
                                        {PluginEditorBuiltInTags.map((item) => {
                                            return (
                                                <YakitSelect.Option key={item} value={item}>
                                                    {item}
                                                </YakitSelect.Option>
                                            )
                                        })}
                                    </YakitSelect>
                                </Form.Item>
                                <div className={styles["item-select-prefix-icon"]}>
                                    <OutlineTagIcon />
                                </div>
                            </Form.Item>
                        </Form>
                    </div>
                </div>

                <div className={styles["editor-side-bar"]}>
                    <div className={styles["editor-side-bar-header"]} onClick={handleChangeExpand}>
                        <YakitButton
                            type='outline2'
                            size='small'
                            className={styles["expand-btn"]}
                            icon={<OutlineChevrondownIcon />}
                        />
                        <div className={styles["header-title"]}>基础信息</div>
                    </div>
                </div>
            </div>
        )
    })
)
