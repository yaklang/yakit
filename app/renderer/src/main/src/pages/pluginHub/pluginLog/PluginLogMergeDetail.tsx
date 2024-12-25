import React, {forwardRef, memo, useEffect, useImperativeHandle, useMemo, useRef, useState} from "react"
import {useMemoizedFn, useSize, useUpdateEffect} from "ahooks"
import {OutlineIdentificationIcon, OutlinePuzzleIcon, OutlineTagIcon, OutlineXIcon} from "@/assets/icon/outline"
import {SolidBanIcon} from "@/assets/icon/solid"
import {
    PluginBaseInfoFormProps,
    PluginBaseInfoFormRefProps,
    PluginLogCodeDiffProps,
    PluginLogMergeDetailProps
} from "./PluginLogType"
import {API} from "@/services/swagger/resposeType"
import {Form} from "antd"
import {YakitDrawer} from "@/components/yakitUI/YakitDrawer/YakitDrawer"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitRadioButtons} from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtons"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {YakitTagColor} from "@/components/yakitUI/YakitTag/YakitTagType"
import {YakitDiffEditor} from "@/components/yakitUI/YakitDiffEditor/YakitDiffEditor"
import {yakitNotify} from "@/utils/notification"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {pluginConvertMergeToUIs} from "@/pages/pluginEditor/utils/convert"
import {httpFetchMergePluginDetail, httpMergePluginOperate} from "@/pages/pluginHub/utils/http"
import {YakitPluginBaseInfo} from "@/pages/pluginEditor/base"
import {CodeScoreModule} from "@/pages/plugins/funcTemplate"
import {GetPluginLanguage, pluginTypeToName} from "@/pages/plugins/builtInData"
import {PluginDataProps} from "@/pages/plugins/pluginsType"
import {convertRemoteToRemoteInfo, onCodeToInfo} from "@/pages/plugins/editDetails/utils"
import {PluginDebugBody} from "@/pages/plugins/pluginDebug/PluginDebug"
import {PluginTypeSelect} from "@/pages/pluginEditor/editorInfo/EditorInfo"
import {
    CodecTypePluginSwitchs,
    PluginEditorBuiltInTags,
    PluginSwitchTagToContent,
    YakTypePluginSwitchs
} from "@/pages/pluginEditor/defaultconstants"
import cloneDeep from "lodash/cloneDeep"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import {YakitSwitch} from "@/components/yakitUI/YakitSwitch/YakitSwitch"
import emiter from "@/utils/eventBus/eventBus"

import classNames from "classnames"
import styles from "./PluginLog.module.scss"

/** 日志-申请修改插件信息的详情组件 */
export const PluginLogMergeDetail: React.FC<PluginLogMergeDetailProps> = memo((props) => {
    const {getContainer, uuid, id, visible, callback} = props

    // 关闭
    const onCancel = useMemoizedFn(() => {
        callback(false)
    })

    /** ---------- 控制抽屉组件尺寸 Start ---------- */
    const getContainerSize = useSize(getContainer)
    // 抽屉展示高度
    const showHeight = useMemo(() => {
        return getContainerSize?.height || 800
    }, [getContainerSize])
    /** ---------- 控制抽屉组件尺寸 End ---------- */

    const [activeTab, setActiveTab] = useState<string>("diff")
    // 触发对比器刷新
    const [triggerDiff, setTriggerDiff] = useState<boolean>(true)
    useUpdateEffect(() => {
        setTriggerDiff((prev) => !prev)
    }, [activeTab])

    /** ----------  申请合并插件信息 Start ---------- */
    const [loading, setLoading] = useState<boolean>(false)
    // pr修改的数据
    const [prInfo, setPRInfo] = useState<API.PluginsAuditDetailResponse>()

    // 旧源码
    const oldCode = useRef<string>("")
    // 新源码
    const [newCode, setNewCode] = useState<string>("")

    // 旧基础信息
    const oldBase = useRef<YakitPluginBaseInfo>()
    // 新基础信息
    const newBase = useRef<YakitPluginBaseInfo>()
    const formRef = useRef<PluginBaseInfoFormRefProps>(null)

    // 插件类型
    const pluginType = useMemo(() => {
        if (prInfo) return prInfo.type || "yak"
        return "yak"
    }, [prInfo])
    // 插件类型名和tag颜色
    const pluginTypeTag = useMemo(() => {
        if (pluginType && pluginTypeToName[pluginType]) {
            return {
                color: pluginTypeToName[pluginType].color,
                name: pluginTypeToName[pluginType].name || pluginType
            }
        }
        return undefined
    }, [pluginType])
    // 插件语言
    const pluginLanguage = useMemo(() => {
        if (pluginType) {
            return GetPluginLanguage(pluginType)
        }
        return undefined
    }, [pluginType])

    // 插件调试数据
    const [plugin, setPlugin] = useState<PluginDataProps>()

    // 获取插件pr信息
    const fetchPluginInfo = useMemoizedFn(async () => {
        if (!uuid || !id) {
            yakitNotify("error", "未获取到信息，请关闭重试")
            return
        }
        if (loading) return

        setLoading(true)
        httpFetchMergePluginDetail({uuid: uuid, up_log_id: id})
            .then(async (res) => {
                if (res) {
                    setPRInfo(res)
                    // 旧源码
                    if (res.merge_before_plugins) oldCode.current = res.merge_before_plugins.content || ""
                    // 新源码
                    setNewCode(res.content)
                    const {oldInfo, newInfo} = await pluginConvertMergeToUIs(res)
                    if (!oldInfo) {
                        yakitNotify("error", "未获取到对比数据，请重试")
                        onCancel()
                        return
                    }
                    oldBase.current = oldInfo
                    newBase.current = newInfo

                    //获取参数信息(yak 和 mitm, codec插件类型独有)
                    const paramsList = ["yak", "mitm", "codec"].includes(res.type)
                        ? await onCodeToInfo({type: res.type, code: res.content})
                        : {CliParameter: []}
                    setPlugin({
                        ScriptName: res.script_name,
                        Type: res.type,
                        Params: paramsList?.CliParameter || [],
                        Content: res.content
                    })
                    setTriggerDiff((prev) => !prev)
                } else {
                    yakitNotify("error", `获取修改内容为空，请重试!`)
                    onCancel()
                }
            })
            .catch((err) => {
                onCancel()
            })
            .finally(() => {
                setTimeout(() => {
                    setLoading(false)
                }, 200)
            })
    })

    useEffect(() => {
        if (visible) {
            fetchPluginInfo()
        }
    }, [visible])
    /** ---------- 申请合并插件信息 End ---------- */

    const [modifyLoading, setModifyLoading] = useState<boolean>(false)
    // 合并|不合并修改
    const changePRInfo: (isPass: boolean, reason?: string) => Promise<API.PluginsLogsDetail> = useMemoizedFn(
        (isPass, reason) => {
            return new Promise(async (resolve, reject) => {
                if (prInfo) {
                    if (!formRef.current) {
                        yakitNotify("error", `未获取到插件基础信息，请关闭后重试`)
                        reject()
                        return
                    }
                    let base: YakitPluginBaseInfo | undefined = undefined
                    try {
                        base = await formRef.current?.onSubmit()
                        if (!base) {
                            yakitNotify("error", `未获取到插件基础信息，请关闭后重试`)
                            reject()
                            return
                        }
                    } catch (error) {
                        yakitNotify("error", `${error}`)
                        reject()
                        return
                    }

                    // 生成合并结果数据
                    const audit: API.PluginMerge = {
                        status: isPass ? "true" : "false",
                        uuid: prInfo.uuid,
                        logDescription: (reason || "").trim() || undefined,
                        upPluginLogId: prInfo.up_log_id || 0
                    }
                    // 生成插件数据
                    const data: PluginDataProps = {
                        ScriptName: base.ScriptName || prInfo.script_name,
                        Type: base.Type || prInfo.type,
                        Content: newCode,
                        Help: base.Help || prInfo.help,
                        Tags: (base.Tags || []).join(",") || undefined,
                        EnablePluginSelector: base.EnablePluginSelector,
                        PluginSelectorTypes: (base.PluginSelectorTypes || []).join(",") || undefined
                    }
                    const codeAnalysis =
                        GetPluginLanguage(data.Type) === "yak"
                            ? await onCodeToInfo({type: data.Type, code: data.Content})
                            : null
                    // 源码-获取 tag 信息
                    let newTags = (data.Tags || "").split(",") || []
                    if (codeAnalysis && codeAnalysis.Tags.length > 0) {
                        newTags = newTags.concat(codeAnalysis.Tags)
                        newTags = newTags.filter((item, index, self) => {
                            return self.indexOf(item) === index
                        })
                    }
                    data.Tags = newTags.length === 0 ? undefined : newTags.join(",")
                    // 源码-获取漏洞详情信息
                    if (GetPluginLanguage(data.Type) === "yak" && codeAnalysis) {
                        data.RiskDetail = codeAnalysis.RiskInfo.filter(
                            (item) => item.Level && item.CVE && item.TypeVerbose
                        )
                    }
                    // 源码-获取参数信息
                    if (["yak", "mitm", "codec"].includes(data.Type) && codeAnalysis) {
                        data.Params = codeAnalysis.CliParameter || []
                        data.PluginEnvKey = codeAnalysis.PluginEnvKey || []
                    }
                    const info = convertRemoteToRemoteInfo(prInfo, data)
                    httpMergePluginOperate({...info, ...audit})
                        .then((res) => {
                            // 合并操作成功后,通知所有插件详情页刷新数据(如果详情页插件和合并插件是同一个的情况下触发)
                            emiter.emit("logMergeModifyToPluginDetail", prInfo.uuid)
                            resolve(res)
                        })
                        .catch(() => {
                            reject()
                        })
                } else {
                    yakitNotify("error", `未获取到插件修改信息，请关闭后重试`)
                    reject()
                }
            })
        }
    )

    /** ---------- 不合并 Start ---------- */
    const [noPass, setNoPass] = useState<boolean>(false)
    const [noPassForm] = Form.useForm()
    const onOpenNoPass = useMemoizedFn(() => {
        if (modifyLoading) return
        if (noPass) return

        if (noPassForm) noPassForm.setFieldsValue({noPassReason: ""})
        setModifyLoading(true)
        setNoPass(true)
    })
    const [modifyReasonLoading, setModifyReasonLoading] = useState<boolean>(false)
    // 提交不合并的理由
    const submitNoPass = useMemoizedFn(() => {
        if (modifyReasonLoading) return
        if (noPassForm) {
            noPassForm
                .validateFields()
                .then((value: {noPassReason: string}) => {
                    setModifyReasonLoading(true)
                    changePRInfo(false, value.noPassReason)
                        .then((res) => {
                            callback(true, res)
                        })
                        .catch(() => {})
                        .finally(() => {
                            setTimeout(() => {
                                setModifyReasonLoading(false)
                                onCancelNoPass()
                            }, 200)
                        })
                })
                .catch(() => {})
        }
    })
    const onCancelNoPass = useMemoizedFn(() => {
        setNoPass(false)
        setModifyLoading(false)
    })
    /** ---------- 不合并 End ---------- */

    /** ---------- 合并代码 Start ---------- */
    const [pass, setPass] = useState<boolean>(false)
    const onOpenPass = useMemoizedFn(() => {
        if (modifyLoading) return

        if (prInfo?.is_private) {
            setModifyLoading(true)
            changePRInfo(true)
                .then((res) => {
                    callback(true, res)
                })
                .catch(() => {})
                .finally(() => {
                    setTimeout(() => {
                        setModifyLoading(false)
                    }, 300)
                })
        } else {
            if (pass) return
            setModifyLoading(true)
            setScore(0)
            setPass(true)
        }
    })
    /** @description 0-未检测;1-不合格;2-合格 */
    const [score, setScore] = useState<number>(0)
    // 评分检测回调
    const onCallbackScore = useMemoizedFn((pass: boolean) => {
        if (!pass) {
            setScore(1)
            setModifyLoading(false)
            return
        }
        setModifyLoading(true)
        changePRInfo(true)
            .then((res) => {
                callback(true, res)
            })
            .catch(() => {})
            .finally(() => {
                setTimeout(() => {
                    onCancelPass()
                }, 300)
            })
    })
    const onCancelPass = useMemoizedFn(() => {
        setPass(false)
        setModifyLoading(false)
    })
    /** ---------- 合并代码 End ---------- */

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
                className={styles["plugin-log-merge-detail-drawer"]}
                title={
                    <YakitRadioButtons
                        size='large'
                        buttonStyle='solid'
                        value={activeTab}
                        options={[
                            {value: "diff", label: "源码对比"},
                            {value: "baseInfo", label: "基础信息对比"},
                            {value: "debug", label: "插件调试"}
                        ]}
                        onChange={(e) => setActiveTab(e.target.value)}
                    />
                }
                extra={
                    <div className={styles["header-extra-wrapper"]}>
                        <YakitButton
                            type='outline1'
                            colors='danger'
                            loading={modifyLoading}
                            icon={<SolidBanIcon />}
                            onClick={onOpenNoPass}
                        >
                            不合并
                        </YakitButton>
                        <YakitButton
                            colors='success'
                            loading={modifyLoading}
                            icon={<OutlinePuzzleIcon />}
                            onClick={onOpenPass}
                        >
                            合并代码
                        </YakitButton>

                        <YakitButton type='text2' icon={<OutlineXIcon />} onClick={onCancel} />
                    </div>
                }
                onClose={onCancel}
            >
                <YakitSpin spinning={loading}>
                    <div className={styles["plugin-log-merge-detail-wrapper"]}>
                        <div
                            className={classNames(styles["diff-wrapper"], {
                                [styles["tab-pane-hidden"]]: activeTab !== "diff"
                            })}
                        >
                            <div className={styles["diff-header"]}>
                                <YakitTag color={pluginTypeTag?.color as YakitTagColor}>
                                    {pluginTypeTag?.name || ""}
                                </YakitTag>
                                <div className={styles["header-title"]}>{plugin?.ScriptName || ""}</div>
                            </div>

                            <div className={styles["diff-body"]}>
                                {pluginLanguage && (
                                    <YakitDiffEditor
                                        leftDefaultCode={oldCode.current}
                                        leftReadOnly={true}
                                        rightDefaultCode={newCode}
                                        setRightCode={setNewCode}
                                        triggerUpdate={triggerDiff}
                                        language={pluginLanguage}
                                    />
                                )}
                            </div>
                        </div>

                        <div
                            className={classNames(styles["baseinfo-wrapper"], {
                                [styles["tab-pane-hidden"]]: activeTab !== "baseInfo"
                            })}
                        >
                            <div
                                className={styles["baseinfo-body"]}
                                style={{background: "var(--yakit-card-background-color)"}}
                            >
                                <PluginBaseInfoForm data={oldBase.current} allDisabled={true} />
                            </div>
                            <div className={styles["baseinfo-divider-style"]}></div>
                            <div className={styles["baseinfo-body"]}>
                                <PluginBaseInfoForm ref={formRef} data={newBase.current} />
                            </div>
                        </div>

                        {activeTab === "debug" && (
                            <PluginDebugBody plugin={plugin} newCode={newCode} setNewCode={setNewCode} />
                        )}
                    </div>
                </YakitSpin>
            </YakitDrawer>

            <YakitModal
                title='不合并原因描述'
                type='white'
                width={448}
                centered={true}
                maskClosable={false}
                closable={true}
                visible={noPass}
                okButtonProps={{loading: modifyReasonLoading}}
                onCancel={onCancelNoPass}
                onOk={submitNoPass}
            >
                <Form form={noPassForm}>
                    <Form.Item label='' name='noPassReason' rules={[{required: true, message: "必须填写不合并的原因"}]}>
                        <YakitInput.TextArea
                            placeholder='请简单描述一下不合并原因，方便告知修改者...'
                            autoSize={{minRows: 3, maxRows: 3}}
                            showCount
                            maxLength={150}
                        />
                    </Form.Item>
                </Form>
            </YakitModal>

            <YakitModal
                title='修改源码评分'
                type='white'
                width={506}
                centered={true}
                maskClosable={false}
                closable={false}
                destroyOnClose={true}
                visible={pass}
                okButtonProps={{style: {display: "none"}}}
                footer={score === 1 ? undefined : null}
                onCancel={onCancelPass}
            >
                <CodeScoreModule
                    type={pluginType || "yak"}
                    code={newCode || ""}
                    isStart={pass}
                    successWait={10}
                    successHint='表现良好，检测通过，开始合并修改'
                    failedHint='检测不通过，请根据提示修改'
                    specialHint='(无法判断，是否需要继续合并)'
                    specialBtnText='继续合并'
                    specialExtraBtn={
                        <YakitButton type='outline2' onClick={onCancelPass}>
                            取消
                        </YakitButton>
                    }
                    callback={onCallbackScore}
                />
            </YakitModal>
        </>
    )
})

/** 插件基础信息表单组件 */
const PluginBaseInfoForm: React.FC<PluginBaseInfoFormProps> = memo(
    forwardRef((props, ref) => {
        const {data, allDisabled = false} = props

        useImperativeHandle(
            ref,
            () => ({
                onSubmit: handleFormSubmit
            }),
            []
        )

        const [form] = Form.useForm()
        useEffect(() => {
            if (data) {
                if (!form) return
                form.resetFields()
                const filterTag = YakTypePluginSwitchs.concat(CodecTypePluginSwitchs)
                const newTags = data.Tags.map((item) => {
                    if (filterTag.includes(item)) return {key: item, label: PluginSwitchTagToContent[item]}
                    return item
                })
                setEnablePluginSelector(!!data.EnablePluginSelector)
                form.setFieldsValue({...data, Tags: [...newTags]})
            } else {
                form.setFieldsValue({Type: "yak"})
            }
        }, [data])

        /** ---------- 表单相关方法 Start ---------- */
        // 判断值为 string 还是 {key, label}，专用于 tags
        const toTagKey = useMemoizedFn((tags: any[]) => {
            return tags.map((item) => {
                if (typeof item === "string") return item
                return item.key as string
            })
        })
        // 获取表单数据
        const handleGetData = useMemoizedFn(() => {
            if (!form) return undefined
            const data = form.getFieldsValue()
            const info: YakitPluginBaseInfo = {
                Type: data.Type || "",
                ScriptName: (data.ScriptName || "").trim(),
                Help: (data.Help || "").trim() || undefined,
                Tags: toTagKey(data.Tags || []),
                EnablePluginSelector: EnablePluginSelector,
                PluginSelectorTypes: data.PluginSelectorTypes || (EnablePluginSelector ? [] : undefined)
            }
            if (!info.Type || !info.ScriptName) return undefined

            return info
        })
        // 表单提交
        const handleFormSubmit: () => Promise<YakitPluginBaseInfo | undefined> = useMemoizedFn(() => {
            return new Promise((resolve) => {
                if (!form) return resolve(undefined)
                form.validateFields()
                    .then(() => {
                        resolve(handleGetData())
                    })
                    .catch(() => {
                        resolve(undefined)
                    })
            })
        })
        // 更新 form 里的数据
        const updateFormData = useMemoizedFn((value: Record<string, any>) => {
            if (form) {
                form.setFieldsValue({...form.getFieldsValue, ...cloneDeep(value)})
            }
        })
        /** ---------- 表单相关方法  End ---------- */

        const type = Form.useWatch("Type", form)

        /** ---------- 插件 tags 变化的数据更新 Start ---------- */
        const tags = Form.useWatch("Tags", form) || []
        // 过滤开关 tag 的方法(传入过滤项)
        const handleFilterTag = useMemoizedFn((tag, compareTag) => {
            if (typeof tag === "string") return tag === compareTag
            try {
                return tag.key === compareTag
            } catch (error) {
                return false
            }
        })
        /** ---------- 插件 tags 变化的数据更新 End ---------- */

        /** ----------  插件配置逻辑 Start ---------- */
        const [EnablePluginSelector, setEnablePluginSelector] = useState<boolean>(false)
        // 插件联动开关更新数据
        const handleEnablePluginSelector = useMemoizedFn((check) => {
            if (!check) {
                updateFormData({PluginSelectorTypes: []})
            }
            setEnablePluginSelector(check)
        })

        // 配置开关影响 tags 变化的数据更新
        const handleSwitchToTags = useMemoizedFn((check: boolean, value: string) => {
            try {
                if (check) {
                    updateFormData({Tags: [...tags, {key: value, label: PluginSwitchTagToContent[value] || value}]})
                } else {
                    updateFormData({
                        Tags: tags.filter((item) => {
                            return !handleFilterTag(item, value)
                        })
                    })
                }
            } catch (error) {}
        })
        /** ---------- 插件配置逻辑 End ---------- */

        return (
            <Form className={styles["plugin-base-info-form"]} form={form} layout='vertical'>
                <Form.Item
                    label={
                        <>
                            脚本类型<span className='form-item-required'>*</span>:
                        </>
                    }
                    name='Type'
                    rules={[{required: true, message: "脚本类型必填"}]}
                >
                    <PluginTypeSelect size='large' disabled={true} />
                </Form.Item>

                <Form.Item
                    label={
                        <>
                            插件名称<span className='form-item-required'>*</span>:
                        </>
                    }
                    name='ScriptName'
                    required={true}
                    rules={[
                        {
                            validator: async (_, value) => {
                                if (!value || !value.trim()) return Promise.reject(new Error("插件名称必填"))
                                if (value.trim().length > 100) return Promise.reject(new Error("名称最长100位"))
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
                        disabled={allDisabled}
                    />
                </Form.Item>

                <Form.Item label='描述 :' name='Help'>
                    <YakitInput.TextArea
                        rows={2}
                        placeholder='请输入...'
                        disabled={allDisabled}
                        onKeyDown={(e) => {
                            const keyCode = e.keyCode ? e.keyCode : e.key
                            if (keyCode === 13) {
                                e.stopPropagation()
                                e.preventDefault()
                            }
                        }}
                    />
                </Form.Item>

                <Form.Item
                    label={
                        <>
                            Tags<span className='form-item-required'>*</span>:
                        </>
                    }
                >
                    <Form.Item noStyle name='Tags' rules={[{required: true, message: "Tags必填"}]}>
                        <YakitSelect
                            wrapperClassName={styles["item-select"]}
                            mode='tags'
                            allowClear
                            size='large'
                            disabled={allDisabled}
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

                <div
                    className={classNames(styles["item-setting"], {
                        [styles["hidden"]]: !["yak", "codec"].includes(type)
                    })}
                >
                    <div className={styles["item-setting-header"]}>插件配置 :</div>

                    <div className={styles["item-switch-group"]}>
                        {/* yak 插件专用 ↓↓↓ */}
                        {type === "yak" && (
                            <>
                                <div className={styles["switch-wrapper"]}>
                                    <YakitSwitch
                                        disabled={allDisabled}
                                        checked={EnablePluginSelector}
                                        onChange={handleEnablePluginSelector}
                                    />
                                    启用插件联动 UI
                                </div>
                                {YakTypePluginSwitchs.map((item) => {
                                    const check = tags.findIndex((tag) => {
                                        return handleFilterTag(tag, item)
                                    })
                                    return (
                                        <div key={item} className={styles["switch-wrapper"]}>
                                            <YakitSwitch
                                                disabled={allDisabled}
                                                checked={check !== -1}
                                                onChange={(check) => {
                                                    handleSwitchToTags(check, item)
                                                }}
                                            />
                                            {PluginSwitchTagToContent[item] || "异常项"}
                                        </div>
                                    )
                                })}
                            </>
                        )}
                        {/* codec 插件专用 ↓↓↓ */}
                        {type === "codec" && (
                            <>
                                {CodecTypePluginSwitchs.map((item) => {
                                    const check = tags.findIndex((tag) => {
                                        return handleFilterTag(tag, item)
                                    })
                                    return (
                                        <div key={item} className={styles["switch-wrapper"]}>
                                            <YakitSwitch
                                                disabled={allDisabled}
                                                checked={check !== -1}
                                                onChange={(check) => {
                                                    handleSwitchToTags(check, item)
                                                }}
                                            />
                                            {PluginSwitchTagToContent[item] || "异常项"}
                                        </div>
                                    )
                                })}
                            </>
                        )}
                    </div>
                </div>

                {EnablePluginSelector && (
                    <Form.Item
                        name='PluginSelectorTypes'
                        label={
                            <>
                                联动插件类型<span className='form-item-required'>*</span>:
                            </>
                        }
                        required={true}
                        rules={[{required: true, message: "联动插件类型必填"}]}
                    >
                        <YakitSelect
                            wrapperClassName={styles["linkage-plugin-type-select"]}
                            mode='tags'
                            allowClear
                            size='large'
                            disabled={allDisabled}
                        >
                            <YakitSelect.Option value='mitm'>MITM</YakitSelect.Option>
                            <YakitSelect.Option value='port-scan'>端口扫描</YakitSelect.Option>
                        </YakitSelect>
                    </Form.Item>
                )}
            </Form>
        )
    })
)

/** 日志-code代码对比组件 */
export const PluginLogCodeDiff: React.FC<PluginLogCodeDiffProps> = memo((props) => {
    const {uuid, id, visible, setVisible} = props

    const [loading, setLoading] = useState<boolean>(false)
    const oldCode = useRef<string>("")
    const newCode = useRef<string>("")
    const language = useRef<string>("")

    const [update, setUpdate] = useState<boolean>(false)

    const onFetchDiffCode = useMemoizedFn(() => {
        if (!uuid || !id) {
            yakitNotify("error", "未获取到信息，请关闭重试")
            return
        }
        if (loading) return

        setLoading(true)
        httpFetchMergePluginDetail({uuid: uuid, up_log_id: id})
            .then(async (res) => {
                if (res) {
                    language.current = GetPluginLanguage(res.type)
                    // 获取对比器-修改源码
                    newCode.current = res.content
                    // 获取对比器-源码
                    if (res.merge_before_plugins) oldCode.current = res.merge_before_plugins.content || ""
                    setUpdate(!update)
                } else {
                    yakitNotify("error", `获取失败，返回数据为空!`)
                    onCancel()
                }
            })
            .catch(() => {
                onCancel()
            })
            .finally(() => {
                setTimeout(() => {
                    setLoading(false)
                }, 200)
            })
    })
    // 重置初始化
    const handleReset = useMemoizedFn(() => {
        oldCode.current = ""
        newCode.current = ""
        language.current = ""
        setLoading(false)
        setUpdate(!update)
    })

    useEffect(() => {
        if (visible) {
            onFetchDiffCode()
            return () => {
                handleReset()
            }
        }
    }, [visible])

    const onCancel = useMemoizedFn(() => {
        setVisible(false)
    })

    return (
        <YakitModal
            type='white'
            title='代码对比'
            centered={true}
            visible={visible}
            closable={true}
            maskClosable={false}
            keyboard={false}
            width='75%'
            cancelText='关闭'
            onCancel={onCancel}
            okButtonProps={{style: {display: "none"}}}
        >
            <div className={styles["plugin-log-diff-code"]}>
                <YakitSpin spinning={loading} tip='获取对比代码中...'>
                    <YakitDiffEditor
                        leftDefaultCode={oldCode.current}
                        leftReadOnly={true}
                        rightDefaultCode={newCode.current}
                        rightReadOnly={true}
                        triggerUpdate={update}
                        language={language.current}
                    />
                </YakitSpin>
            </div>
        </YakitModal>
    )
})
