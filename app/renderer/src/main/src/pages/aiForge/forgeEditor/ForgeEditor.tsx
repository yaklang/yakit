import React, {memo, useEffect, useMemo, useRef, useState} from "react"
import {AIForgeEditorPreviewParamsProps, ConfigTypeForgePromptAction, EditorAIForge, ForgeEditorProps} from "./type"
import {useDebounceFn, useMemoizedFn} from "ahooks"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {
    OutlineCloseIcon,
    OutlineExitIcon,
    OutlineIdentificationIcon,
    OutlineInformationcircleIcon,
    OutlineOpenIcon,
    OutlineTagIcon
} from "@/assets/icon/outline"
import {SolidStopIcon} from "@/assets/icon/solid"
import {Form, Tooltip} from "antd"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import {AIForgeBuiltInTag, DefaultForgeTypeList} from "../defaultConstant"
import {AIForge, GetAIToolListRequest, QueryAIForgeRequest} from "@/pages/ai-agent/type/aiChat"
import {YakitRadioButtons} from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtons"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {YakitTagColor} from "@/components/yakitUI/YakitTag/YakitTagType"
import {YakitEditor} from "@/components/yakitUI/YakitEditor/YakitEditor"
import {ExecuteEnterNodeByPluginParams} from "@/pages/plugins/operator/localPluginExecuteDetailHeard/LocalPluginExecuteDetailHeard"
import {ExtraParamsNodeByType} from "@/pages/plugins/operator/localPluginExecuteDetailHeard/PluginExecuteExtraParams"
import {YakParamProps} from "@/pages/plugins/pluginsType"
import {getValueByType, onCodeToInfo, ParamsToGroupByGroupName} from "@/pages/plugins/editDetails/utils"
import cloneDeep from "lodash/cloneDeep"
import {CustomPluginExecuteFormValue} from "@/pages/plugins/operator/localPluginExecuteDetailHeard/LocalPluginExecuteDetailHeardType"
import {PageNodeItemProps, usePageInfo} from "@/store/pageInfo"
import {shallow} from "zustand/shallow"
import {YakitRoute} from "@/enums/yakitRoute"
import {yakitNotify} from "@/utils/notification"
import {grpcCreateAIForge, grpcQueryAIForge, grpcUpdateAIForge} from "@/pages/ai-agent/grpc"
import emiter from "@/utils/eventBus/eventBus"
import {useSubscribeClose} from "@/store/tabSubscribe"
import {AIForgeListDefaultPagination} from "@/pages/ai-agent/defaultConstant"
import {grpcGetAIToolList} from "@/pages/ai-agent/aiToolList/utils"

import classNames from "classnames"
import styles from "./ForgeEditor.module.scss"

const ForgeEditor: React.FC<ForgeEditorProps> = memo((props) => {
    const {isModify} = props

    // #region 判断新建还是编辑-编辑下读取编辑信息
    const {queryPagesDataById, updatePagesDataCacheById} = usePageInfo(
        (s) => ({
            queryPagesDataById: s.queryPagesDataById,
            updatePagesDataCacheById: s.updatePagesDataCacheById
        }),
        shallow
    )

    useEffect(() => {
        if (isModify) {
            handleFetchCacheID()
        }
    }, [isModify])
    // #endregion

    // #region forge-基础信息编辑框 展开/收起
    const [expand, setExpand] = useState(true)
    const [hiddenVisible, setHiddenVisible] = useState(false)
    const handleHidden = useMemoizedFn(() => {
        setExpand(false)
        setHiddenVisible(false)
    })
    const [expandVisible, setExpandVisible] = useState(false)
    const handleExpand = useMemoizedFn(() => {
        setExpand(true)
        setExpandVisible(false)
    })
    // #endregion

    // #region forge模板全局数据和全局功能
    /** 当前展示的 forge 数据(新建下已保存|编辑和编辑下已保存后的 forge 数据) */
    const forgeData = useRef<AIForge>()

    // 获取缓存中的编辑模板的ID
    const handleFetchCacheID = useMemoizedFn(() => {
        const currentItem: PageNodeItemProps | undefined = queryPagesDataById(
            YakitRoute.ModifyAIForge,
            YakitRoute.ModifyAIForge
        )
        if (currentItem && currentItem.pageParamsInfo.modifyAIForgePageInfo) {
            const id = currentItem.pageParamsInfo.modifyAIForgePageInfo?.id
            const newCurrentItem: PageNodeItemProps = {
                ...currentItem,
                pageParamsInfo: {
                    ...currentItem.pageParamsInfo,
                    modifyAIForgePageInfo: undefined
                }
            }
            updatePagesDataCacheById(YakitRoute.ModifyAIForge, {...newCurrentItem})
            if (!id) {
                yakitNotify("error", `编辑的模板数据异常: id('${id}'), 请关闭页面重试`)
                return
            }
            console.log("handleFetchCacheID", id)

            handleFetchInfo(id)
        }
    })

    const [fetchLoading, setFetchLoading] = useState(false)
    const setDelayCancelFetchLoading = useMemoizedFn(() => {
        setTimeout(() => {
            setFetchLoading(false)
        }, 200)
    })

    const handleFetchInfo = useMemoizedFn((id: number) => {
        if (fetchLoading) return
        setFetchLoading(true)

        const request: QueryAIForgeRequest = {
            Pagination: {...AIForgeListDefaultPagination},
            Filter: {Id: id}
        }

        grpcQueryAIForge(request)
            .then((res) => {
                const {Data} = res
                console.log("forgeEditor-res", res)

                if (!Data || !Data[0]) {
                    setDelayCancelFetchLoading()
                    yakitNotify("error", `未获取到模板数据, 请关闭页面重试`)
                    return
                }
                forgeData.current = cloneDeep(Data[0])
                // 成功的话, loading 状态应该由 setShow 方法改变
                handleSetShowData()
            })
            .catch(() => {
                setDelayCancelFetchLoading()
            })
    })

    // 设置编辑展示的数据内容
    const handleSetShowData = useMemoizedFn(() => {
        if (!forgeData.current) {
            setDelayCancelFetchLoading()
            yakitNotify("error", `未获取到模板数据, 请关闭页面重试`)
            return
        }

        if (form) {
            form.resetFields()
            form.setFieldsValue({
                ForgeType: forgeData.current.ForgeType || "yak",
                ForgeName: forgeData.current.ForgeName || "",
                Description: forgeData.current.Description || "",
                Tag: forgeData.current.Tag || [],
                ToolNames: forgeData.current.ToolNames || [],
                ToolKeywords: forgeData.current.ToolKeywords || []
            })
            setPromptAction({
                Action: forgeData.current.Action || "",
                InitPrompt: forgeData.current.InitPrompt || "",
                PersistentPrompt: forgeData.current.PersistentPrompt || "",
                PlanPrompt: forgeData.current.PlanPrompt || "",
                ResultPrompt: forgeData.current.ResultPrompt || ""
            })
            setContent(
                forgeData.current.ForgeType === "yak"
                    ? forgeData.current.ForgeContent || ""
                    : forgeData.current.Params || ""
            )
            setTriggerParseContent((old) => !old)
        }
        setDelayCancelFetchLoading()
    })

    const [saveLoading, setSaveLoading] = useState(false)

    /** 保存功能 */
    const handleSave = useMemoizedFn(() => {
        return new Promise<void>(async (resolve, reject) => {
            if (saveLoading) return
            setSaveLoading(true)

            try {
                const formData: EditorAIForge = await handleFetchFormData()
                if (formData.ForgeType === "config") {
                    formData.Params = content || ""

                    formData.InitPrompt = promptAction.InitPrompt ?? ""
                    formData.PersistentPrompt = promptAction.PersistentPrompt ?? ""
                    formData.PlanPrompt = promptAction.PlanPrompt ?? ""
                    formData.ResultPrompt = promptAction.ResultPrompt ?? ""
                    formData.Action = promptAction.Action ?? ""
                }
                if (formData.ForgeType === "yak") {
                    formData.ForgeContent = content || ""
                    formData.ToolNames = undefined
                    formData.ToolKeywords = undefined
                }

                // 解析参数UI数据
                if (content) {
                    const codeInfo = await onCodeToInfo({type: "yak", code: content || ""}, true)
                    if (codeInfo) {
                        formData.ParamsUIConfig = JSON.stringify(codeInfo?.CliParameter ?? [])
                    }
                } else {
                    formData.ParamsUIConfig = ""
                }

                // 生成最终需要保存的数据
                const requestData: AIForge = {...(forgeData.current || {}), ...formData} as AIForge
                if (requestData.ForgeType === "yak") requestData.Params = undefined
                if (requestData.ForgeType === "config") requestData.ForgeContent = undefined

                const apiFunc = requestData.Id ? grpcUpdateAIForge : grpcCreateAIForge
                console.log("apiFunc", requestData, "\n", requestData.Id ? "grpcUpdateAIForge" : "grpcCreateAIForge")
                apiFunc(requestData)
                    .then(async () => {
                        try {
                            let resInfo: AIForge = cloneDeep(requestData)
                            if (!resInfo.Id) {
                                const info = await grpcQueryAIForge({
                                    Pagination: {...AIForgeListDefaultPagination},
                                    Filter: {ForgeName: requestData.ForgeName}
                                })
                                if (info && info.Data && info.Data[0]) {
                                    resInfo = cloneDeep(info.Data[0])
                                } else {
                                    yakitNotify("error", "模板创建成功, 但获取数据异常，请关闭页面后重试")
                                    reject()
                                    return
                                }
                            }
                            forgeData.current = cloneDeep(resInfo)
                            emiter.emit("onTriggerRefreshForgeList", `${resInfo.Id}`)
                            yakitNotify("success", "保存成功")
                            resolve()
                        } catch (error) {
                            yakitNotify("error", "模板创建成功, 但获取数据异常，请关闭页面后重试")
                            reject()
                        }
                    })
                    .catch(() => {
                        reject()
                    })
                    .finally(() => {
                        setTimeout(() => {
                            setSaveLoading(false)
                        }, 300)
                    })
                resolve()
            } catch (error) {
                reject()
                setTimeout(() => {
                    setSaveLoading(false)
                }, 200)
            }
        })
    })

    /** 保存并执行功能 */
    const handleSaveAndRun = useMemoizedFn(() => {
        handleSave()
            .then(() => {
                if (!forgeData.current) {
                    yakitNotify("warning", "保存成功但未获取到执行的模板数据")
                    return
                }
                emiter.emit("menuOpenPage", JSON.stringify({route: YakitRoute.AI_Agent}))
                setTimeout(() => {
                    emiter.emit(
                        "onServerChatEvent",
                        JSON.stringify({
                            type: "open-forge-form",
                            params: {value: forgeData.current}
                        })
                    )
                }, 100)
            })
            .catch(() => {})
    })
    // #endregion

    // #region forge 基础信息相关逻辑
    const [form] = Form.useForm()

    /** forge-类型 */
    const type = Form.useWatch("ForgeType", form)
    /** 是否是简易模板类型 */
    const isTypeToConfig = useMemo(() => {
        return type === "config"
    }, [type])

    // 获取表单数据
    const handleFetchFormData: () => Promise<EditorAIForge> = useMemoizedFn(() => {
        return new Promise((resolve, reject) => {
            if (!form) {
                yakitNotify("error", "获取表单数据异常，请关闭后重试")
                reject()
                return
            }
            form.validateFields()
                .then(() => {
                    const data = form.getFieldsValue()
                    const info: EditorAIForge = {
                        ForgeType: data.ForgeType ?? "yak",
                        ForgeName: data.ForgeName ?? "",
                        Description: data.Description ?? undefined,
                        Tag: data.Tag ?? [],
                        ToolNames: data.ToolNames ?? [],
                        ToolKeywords: data.ToolKeywords ?? []
                    }
                    if (!info.ForgeType || !info.ForgeName) {
                        yakitNotify("error", "模板类型和模板名称不能为空")
                        reject()
                        return
                    }
                    resolve(info)
                })
                .catch(() => {
                    if (!expand) setExpand(true)
                    reject()
                })
        })
    })

    const [tools, setTools] = useState<{label: string; value: string}[]>([])
    const [fetchToolLoading, setFetchToolLoading] = useState(false)
    const handleFetchTools = useMemoizedFn(async (search?: string) => {
        setFetchToolLoading(true)
        const request: GetAIToolListRequest = {
            Pagination: {
                ...AIForgeListDefaultPagination,
                OrderBy: "created_at",
                Limit: 50
            },
            Query: search || "",
            ToolName: "",
            OnlyFavorites: false
        }
        try {
            const res = await grpcGetAIToolList(request)
            if (res?.Tools) {
                setTools(res.Tools.map((item) => ({label: item.Name, value: item.Name})))
            }
        } catch (error) {
        } finally {
            setTimeout(() => {
                setFetchToolLoading(false)
            }, 300)
        }
    })
    const handleSearchTool = useDebounceFn(
        (search?: string) => {
            handleFetchTools(search)
        },
        {wait: 300}
    ).run

    useEffect(() => {
        handleFetchTools()
    }, [])

    // #endregion

    // #region forge prompt和源码信息相关逻辑
    const [configTypeActiveTab, setConfigTypeActiveTab] = useState<"prompt" | "params">("prompt")
    // 是否展示编辑器元素
    const isShowCode = useMemo(() => {
        if (!isTypeToConfig) return true
        return configTypeActiveTab === "params"
    }, [isTypeToConfig, configTypeActiveTab])

    /** 当前模板类行的展示 tagUI */
    const forgeTypeTag = useMemo(() => {
        const find = DefaultForgeTypeList.find((item) => item.key === type)
        if (!find) return null

        if (find.key === "yak") {
            return <YakitTag color={find.color as YakitTagColor}>{find.name}</YakitTag>
        }
        if (find.key === "config") {
            return <YakitTag color={find.color as YakitTagColor}>{find.name}</YakitTag>
        }
        return null
    }, [type])

    // 简易模板下的 promopt 信息和 action 信息
    const [promptAction, setPromptAction] = useState<ConfigTypeForgePromptAction>({})
    const handleChangePromptAction = useMemoizedFn((key: keyof ConfigTypeForgePromptAction, value: string) => {
        setPromptAction((old) => ({...old, [key]: value}))
    })

    // yak 模板下的源码或者简易模板下的参数代码
    const [content, setContent] = useState("")
    const [triggerParseContent, setTriggerParseContent] = useState(false)
    // #endregion

    // #region 注册关闭页面时的触发事件
    // 保存并退出
    const handleSaveAndExit = useMemoizedFn((isModify?: boolean) => {
        handleSave()
            .then(() => {
                if (modalRef.current) modalRef.current.destroy()
                emiter.emit(
                    "closePage",
                    JSON.stringify({route: !!isModify ? YakitRoute.ModifyAIForge : YakitRoute.AddAIForge})
                )
            })
            .catch(() => {})
    })
    // 是否保存并打开触发编辑的模板信息
    const handleSaveAndOpen = useMemoizedFn(async (isSave?: boolean) => {
        try {
            if (isSave) {
                await handleSave()
            }
            if (modalRef.current) modalRef.current.destroy()
            handleFetchCacheID()
        } catch (error) {}
    })
    const {setSubscribeClose, removeSubscribeClose} = useSubscribeClose()
    // 二次提示框的实例
    const modalRef = useRef<any>(null)
    // 二次提示框的操作类型
    const modalTypeRef = useRef<string>("close")
    useEffect(() => {
        if (isModify) {
            setSubscribeClose(YakitRoute.ModifyAIForge, {
                close: async () => {
                    return {
                        title: "模板未保存",
                        content: "是否要将模板保存?",
                        confirmLoading: saveLoading,
                        maskClosable: false,
                        onOk: (m) => {
                            modalRef.current = m
                            modalTypeRef.current = "close"
                            handleSaveAndExit(true)
                        },
                        onCancel: () => {
                            emiter.emit("closePage", JSON.stringify({route: YakitRoute.ModifyAIForge}))
                        }
                    }
                },
                reset: async () => {
                    return {
                        title: "模板未保存",
                        content: "是否要将当前模板保存，并编辑点击的模板?",
                        confirmLoading: saveLoading,
                        maskClosable: false,
                        onOk: (m) => {
                            modalRef.current = m
                            modalTypeRef.current = "reset"
                            handleSaveAndOpen(true)
                        },
                        onCancel: () => {
                            handleSaveAndOpen()
                        }
                    }
                }
            })

            return () => {
                removeSubscribeClose(YakitRoute.ModifyAIForge)
            }
        } else {
            setSubscribeClose(YakitRoute.AddAIForge, {
                close: async () => {
                    return {
                        title: "模板未保存",
                        content: "是否要将模板保存?",
                        confirmLoading: saveLoading,
                        maskClosable: false,
                        onOk: (m) => {
                            modalRef.current = m
                            modalTypeRef.current = "close"
                            handleSaveAndExit()
                        },
                        onCancel: () => {
                            emiter.emit("closePage", JSON.stringify({route: YakitRoute.AddAIForge}))
                        }
                    }
                }
            })
            return () => {
                removeSubscribeClose(YakitRoute.AddAIForge)
            }
        }
    }, [isModify])
    // #endregion

    return (
        <div className={styles["forge-editor"]}>
            <YakitSpin spinning={fetchLoading}>
                <div className={styles["forge-editor-wrapper"]}>
                    <div className={styles["forge-editor-header"]}>
                        <div className={styles["header-title"]}>{isModify ? "编辑模板" : "新建模板"}</div>

                        <div className={styles["header-btn-group"]}>
                            <YakitButton
                                loading={saveLoading}
                                type='outline1'
                                icon={<OutlineExitIcon />}
                                onClick={handleSaveAndRun}
                            >
                                保存并执行
                            </YakitButton>
                            <YakitButton loading={saveLoading} icon={<SolidStopIcon />} onClick={handleSave}>
                                保存
                            </YakitButton>
                        </div>
                    </div>

                    <div className={styles["forge-editor-body"]}>
                        <div
                            className={classNames(styles["forge-editor-info"], {
                                [styles["forge-editor-info-show"]]: expand,
                                [styles["forge-editor-info-hidden"]]: !expand
                            })}
                        >
                            <div className={styles["editor-info-header"]}>
                                <div className={styles["info-header-title"]}>基础信息</div>

                                <Tooltip
                                    title='收起基础信息'
                                    visible={hiddenVisible}
                                    onVisibleChange={setHiddenVisible}
                                >
                                    <YakitButton type='text2' icon={<OutlineCloseIcon />} onClick={handleHidden} />
                                </Tooltip>
                            </div>

                            <div className={styles["editor-info-form-wrapper"]}>
                                <Form
                                    className={styles["editor-info-form"]}
                                    form={form}
                                    layout='vertical'
                                    initialValues={{ForgeType: "yak"}}
                                >
                                    <Form.Item
                                        label={
                                            <>
                                                模板类型<span className='form-item-required'>*</span>:
                                            </>
                                        }
                                        name='ForgeType'
                                        rules={[{required: true, message: "模板类型必填"}]}
                                    >
                                        <YakitSelect
                                            wrapperClassName={styles["forge-type-select"]}
                                            dropdownClassName={styles["forge-type-select-dropdown"]}
                                        >
                                            {DefaultForgeTypeList.map((item, index) => {
                                                return (
                                                    <YakitSelect.Option key={item.key}>
                                                        <div
                                                            key={item.key}
                                                            className={styles["forge-type-select-option"]}
                                                        >
                                                            <div className={styles["header-icon"]}>{item.icon}</div>
                                                            <div className={styles["type-content"]}>{item.name}</div>
                                                        </div>
                                                    </YakitSelect.Option>
                                                )
                                            })}
                                        </YakitSelect>
                                    </Form.Item>

                                    <Form.Item
                                        label={
                                            <>
                                                模板名称<span className='form-item-required'>*</span>:
                                            </>
                                        }
                                        name='ForgeName'
                                        required={true}
                                        rules={[
                                            {
                                                validator: async (_, value) => {
                                                    if (!value || !value.trim())
                                                        return Promise.reject(new Error("模板名称必填"))
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
                                                    if (!value || !value.trim())
                                                        return Promise.reject(new Error("描述必填"))
                                                    if (value.trim().length > 100)
                                                        return Promise.reject(new Error("描述最长100位"))
                                                }
                                            }
                                        ]}
                                    >
                                        <YakitInput.TextArea rows={2} placeholder='请输入...' />
                                    </Form.Item>

                                    <Form.Item
                                        label='Tag'
                                        // label={
                                        //     <>
                                        //         Tag<span className='form-item-required'>*</span>:
                                        //     </>
                                        // }
                                    >
                                        <Form.Item noStyle name='Tag'>
                                            <YakitSelect
                                                wrapperClassName={styles["item-select"]}
                                                mode='tags'
                                                allowClear
                                                size='large'
                                            >
                                                {AIForgeBuiltInTag.map((item) => {
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

                                    {isTypeToConfig && (
                                        <>
                                            <Form.Item name='ToolNames' label='工具名称'>
                                                <YakitSelect
                                                    mode='multiple'
                                                    allowClear
                                                    size='large'
                                                    showSearch={true}
                                                    filterOption={false}
                                                    options={tools}
                                                    notFoundContent={fetchToolLoading ? "搜索中..." : "无匹配结果"}
                                                    onSearch={handleSearchTool}
                                                ></YakitSelect>
                                            </Form.Item>

                                            <Form.Item name='ToolKeywords' label='工具关键词'>
                                                <YakitSelect mode='tags' allowClear size='large'></YakitSelect>
                                            </Form.Item>
                                        </>
                                    )}
                                </Form>
                            </div>
                        </div>

                        <div className={styles["forge-editor-code"]}>
                            <div className={styles["editor-code-header"]}>
                                {!expand && (
                                    <Tooltip
                                        placement='topLeft'
                                        title='展开基础信息'
                                        visible={expandVisible}
                                        onVisibleChange={setExpandVisible}
                                    >
                                        <YakitButton type='text2' icon={<OutlineOpenIcon />} onClick={handleExpand} />
                                    </Tooltip>
                                )}

                                {isTypeToConfig ? (
                                    <YakitRadioButtons
                                        buttonStyle='solid'
                                        value={configTypeActiveTab}
                                        options={[
                                            {value: "prompt", label: "Prompt"},
                                            {value: "params", label: " 执行参数"}
                                        ]}
                                        onChange={(e) => setConfigTypeActiveTab(e.target.value)}
                                    />
                                ) : (
                                    <div className={styles["code-header-radio"]}>源码</div>
                                )}

                                {forgeTypeTag}
                            </div>

                            <div className={styles["editor-code-container"]}>
                                <div className={styles["editor-code-tab-panel"]}>
                                    <div className={styles["code-tab-panel-left"]}>
                                        <div
                                            tabIndex={!isShowCode ? -1 : 1}
                                            className={classNames(
                                                styles["panel-left-prompt-action"],
                                                styles["code-tab-panel-show"],
                                                {
                                                    [styles["code-tab-panel-hidden"]]: isShowCode
                                                }
                                            )}
                                        >
                                            <div className={styles["prompt-action-item"]}>
                                                <div className={styles["item-header"]}>初始 Prompt</div>
                                                <YakitInput.TextArea
                                                    rows={3}
                                                    placeholder='请输入...'
                                                    value={promptAction.InitPrompt}
                                                    onChange={(e) =>
                                                        handleChangePromptAction("InitPrompt", e.target.value)
                                                    }
                                                />
                                            </div>

                                            <div className={styles["prompt-action-item"]}>
                                                <div className={styles["item-header"]}>计划 Prompt</div>
                                                <YakitInput.TextArea
                                                    rows={3}
                                                    placeholder='请输入...'
                                                    value={promptAction.PlanPrompt}
                                                    onChange={(e) =>
                                                        handleChangePromptAction("PlanPrompt", e.target.value)
                                                    }
                                                />
                                            </div>

                                            <div className={styles["prompt-action-item"]}>
                                                <div className={styles["item-header"]}>持久记忆 Prompt</div>
                                                <YakitInput.TextArea
                                                    rows={3}
                                                    placeholder='请输入...'
                                                    value={promptAction.PersistentPrompt}
                                                    onChange={(e) =>
                                                        handleChangePromptAction("PersistentPrompt", e.target.value)
                                                    }
                                                />
                                            </div>

                                            <div className={styles["prompt-action-item"]}>
                                                <div className={styles["item-header"]}>结果 Prompt</div>
                                                <YakitInput.TextArea
                                                    rows={3}
                                                    placeholder='请输入...'
                                                    value={promptAction.ResultPrompt}
                                                    onChange={(e) =>
                                                        handleChangePromptAction("ResultPrompt", e.target.value)
                                                    }
                                                />
                                            </div>

                                            <div className={styles["prompt-action-item"]}>
                                                <div className={styles["item-header"]}>
                                                    结果提取
                                                    <Tooltip
                                                        overlayClassName={styles["form-info-icon-tooltip"]}
                                                        title={`用于指定需提取的 action 名称，应与“结果 Prompt”中定义的 action 保持一致。系统会根据此配置\n从 AI 的输出结果中自动提取对应的结构化数据，作为生成总结报告、\n构建数据结构或驱动后续任务的依据。支持多个 action，多个 action之间通过英文逗号分隔。`}
                                                    >
                                                        <OutlineInformationcircleIcon
                                                            className={styles["prompt-icon"]}
                                                        />
                                                    </Tooltip>
                                                </div>
                                                <YakitInput.TextArea
                                                    rows={3}
                                                    placeholder='请输入...'
                                                    value={promptAction.Action}
                                                    onChange={(e) => handleChangePromptAction("Action", e.target.value)}
                                                />
                                            </div>
                                        </div>

                                        <div
                                            tabIndex={isShowCode ? -1 : 1}
                                            className={classNames(styles["code-tab-panel-show"], {
                                                [styles["code-tab-panel-hidden"]]: !isShowCode
                                            })}
                                        >
                                            <YakitEditor type={"yak"} value={content} setValue={setContent} />
                                        </div>
                                    </div>

                                    <div className={styles["code-tab-panel-right"]}>
                                        <AIForgeEditorPreviewParams
                                            content={content}
                                            triggerParse={triggerParseContent}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </YakitSpin>
        </div>
    )
})

export default ForgeEditor

const AIForgeEditorPreviewParams: React.FC<AIForgeEditorPreviewParamsProps> = memo((props) => {
    const {content, triggerParse} = props

    useEffect(() => {
        handleFetchParams()
    }, [triggerParse])

    const [form] = Form.useForm()

    // #region 获取参数
    const [fetchParamsLoading, setFetchParamsLoading] = useState(false)
    const [params, setParams] = useState<YakParamProps[]>([])

    const handleFetchParams = useDebounceFn(
        async () => {
            if (fetchParamsLoading) return

            setFetchParamsLoading(true)
            try {
                const codeInfo = await onCodeToInfo({type: "yak", code: content || ""}, true)
                if (codeInfo) {
                    setParams([...codeInfo.CliParameter])
                }
            } catch (error) {
            } finally {
                setFetchParamsLoading(false)
            }
        },
        {wait: 300}
    ).run

    const handleInitFormValue = useMemoizedFn(() => {
        if (!params || params.length === 0) {
            !!form && form.resetFields()
        } else {
            // 表单内数据
            let formData: CustomPluginExecuteFormValue = {}
            if (form) formData = (form.getFieldsValue() || {}) as CustomPluginExecuteFormValue

            let defaultValue: CustomPluginExecuteFormValue | undefined = {...formData}

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
        }
    })

    useEffect(() => {
        // 填充表单默认值
        handleInitFormValue()
    }, [params])

    /** 必要参数 */
    const requiredParams = useMemo(() => {
        return params.filter((item) => !!item.Required) || []
    }, [params])
    /** 选填参数 */
    const groupParams = useMemo(() => {
        const arr = params.filter((item) => !item.Required) || []
        return ParamsToGroupByGroupName(arr)
    }, [params])
    // #endregion

    return (
        <div className={styles["ai-forge-editor-preview-params"]}>
            <div className={styles["preview-params-header"]}>
                参数预览
                <div className={styles["header-extra"]}>
                    <YakitButton type='text' loading={fetchParamsLoading} onClick={() => handleFetchParams()}>
                        获取参数
                    </YakitButton>
                    <div className={styles["divider-style"]}></div>
                </div>
            </div>

            <div className={styles["preview-params-container"]}>
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
                        <ExecuteEnterNodeByPluginParams
                            paramsList={requiredParams}
                            pluginType={"yak"}
                            isExecuting={false}
                        />
                    </div>

                    {groupParams.length !== 0 && (
                        <div className={styles["additional-params-divider"]}>
                            <div className={styles["text-style"]}>额外参数 (非必填)</div>
                            <div className={styles["divider-style"]}></div>
                        </div>
                    )}
                    <ExtraParamsNodeByType extraParamsGroup={groupParams} pluginType={"yak"} />

                    <div className={styles["to-end"]}>已经到底啦～</div>
                </Form>
            </div>
        </div>
    )
})
