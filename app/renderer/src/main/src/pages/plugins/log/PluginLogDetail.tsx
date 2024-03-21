import React, {memo, useEffect, useMemo, useRef, useState} from "react"
import {YakitDrawer} from "@/components/yakitUI/YakitDrawer/YakitDrawer"
import {useMemoizedFn, useSize, useUpdateEffect} from "ahooks"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {OutlinePuzzleIcon, OutlineXIcon} from "@/assets/icon/outline"
import {YakitRadioButtons} from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtons"
import {SolidBanIcon} from "@/assets/icon/solid"
import {PluginLogDetailProps} from "./PluginLogDetailType"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {PluginBaseParamProps, PluginDataProps, PluginSettingParamProps} from "../pluginsType"
import {pluginTypeToName} from "../builtInData"
import {YakitTagColor} from "@/components/yakitUI/YakitTag/YakitTagType"
import {YakitDiffEditor} from "@/components/yakitUI/YakitDiffEditor/YakitDiffEditor"
import {PluginDebugBody} from "../pluginDebug/PluginDebug"
import classNames from "classnames"
import {apiAuditPluginDetaiCheck, apiFetchPluginDetailCheck} from "../utils"
import {API} from "@/services/swagger/resposeType"
import {convertRemoteToLocalRisks, convertRemoteToRemoteInfo, onCodeToInfo} from "../editDetails/utils"
import {yakitNotify} from "@/utils/notification"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {Form} from "antd"
import {CodeScoreModule} from "../funcTemplate"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"

import styles from "./PluginLogDetail.module.scss"

export const PluginLogDetail: React.FC<PluginLogDetailProps> = memo((props) => {
    const {getContainer, uuid, info, visible, onClose, onChange} = props

    const getContainerSize = useSize(getContainer)
    // 抽屉展示高度
    const showHeight = useMemo(() => {
        return getContainerSize?.height || 400
    }, [getContainerSize])

    const [activeTab, setActiveTab] = useState<string>("diff")

    // 关闭
    const onCancel = useMemoizedFn(() => {
        onClose()
    })

    /** ---------- 获取插件日志信息 Start ---------- */
    const [fetchLoading, setFetchLoading] = useState<boolean>(false)

    // pr修改的数据
    const [prInfo, setPRInfo] = useState<API.PluginsAuditDetailResponse>()
    // 插件类型
    const pluginType = useMemo(() => {
        if (prInfo) return prInfo.type || undefined
        return "yak" || undefined
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
            return pluginTypeToName[pluginType]?.language || "yak"
        }
        return undefined
    }, [pluginType])
    // 修改人及修改原因
    // const [apply, setApply] = useState<{name: string; img: string; description: string}>()

    // 基础信息
    const baseInfo = useRef<PluginBaseParamProps>()
    // 配置信息
    const settingInfo = useRef<PluginSettingParamProps>()

    // 对比器-源码
    const oldCode = useRef<string>("")
    // 对比器-修改源码
    const [newCode, setNewCode] = useState<string>("")
    // 触发对比器刷新
    const triggerDiff = useRef<boolean>(false)
    useUpdateEffect(() => {
        triggerDiff.current = !triggerDiff.current
    }, [activeTab])

    // 插件调试数据
    const [plugin, setPlugin] = useState<PluginDataProps>()

    // 获取插件pr信息
    const fetchPluginInfo = useMemoizedFn(() => {
        if (fetchLoading) return

        setFetchLoading(true)
        apiFetchPluginDetailCheck({uuid: uuid, list_type: "log", up_log_id: info.id})
            .then(async (res) => {
                if (res) {
                    console.log(
                        `method:post|api:plugins/audit/detail`,
                        `\nrequest:${JSON.stringify({uuid: uuid, list_type: "log", up_log_id: info.id})}`,
                        `\nresponse"${JSON.stringify(res)}`
                    )
                    setPRInfo(res)
                    // 获取对比器-修改源码
                    setNewCode(res.content)
                    // 获取对比器-源码
                    if (res.merge_before_plugins) oldCode.current = res.merge_before_plugins.content || ""
                    // 获取修改人信息
                    // if (res.apply_user_name && res.apply_user_head_img) {
                    //     setApply({
                    //         name: res.apply_user_name || "",
                    //         img: res.apply_user_head_img || "",
                    //         description: res.logDescription || ""
                    //     })
                    // }
                    // 获取基础信息
                    let infoData: PluginBaseParamProps = {
                        ScriptName: res.script_name,
                        Help: res.help,
                        RiskDetail: convertRemoteToLocalRisks(res.riskInfo),
                        Tags: []
                    }
                    try {
                        infoData.Tags = (res.tags || "").split(",") || []
                    } catch (error) {}
                    baseInfo.current = {...infoData}
                    // 获取配置信息
                    let settingData: PluginSettingParamProps = {
                        EnablePluginSelector: !!res.enable_plugin_selector,
                        PluginSelectorTypes: res.plugin_selector_types,
                        Content: res.content || ""
                    }
                    settingInfo.current = {...settingData}
                    //获取参数信息
                    const paramsList =
                        res.type === "yak" ? await onCodeToInfo(res.type, res.content) : {CliParameter: []}
                    setPlugin({
                        ScriptName: res.script_name,
                        Type: res.type,
                        Params: paramsList?.CliParameter || [],
                        Content: res.content
                    })
                    triggerDiff.current = !triggerDiff.current
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
                    setFetchLoading(false)
                }, 200)
            })
    })

    useEffect(() => {
        if (visible) {
            if (uuid && info) fetchPluginInfo()
        }
    }, [visible])
    /** ---------- 获取插件日志信息 End ---------- */

    const [modifyLoading, setModifyLoading] = useState<boolean>(false)
    // 合并|不合并修改
    const changePRInfo: (isPass: boolean, reason?: string) => Promise<string> = useMemoizedFn((isPass, reason) => {
        return new Promise(async (resolve, reject) => {
            if (prInfo) {
                // 生成合并结果数据
                const audit: API.PluginsAudit = {
                    listType: "log",
                    status: isPass ? "true" : "false",
                    uuid: prInfo.uuid,
                    logDescription: (reason || "").trim() || undefined,
                    upPluginLogId: prInfo.up_log_id || 0
                }
                // 生成插件数据
                const data: PluginDataProps = {
                    ScriptName: prInfo.script_name,
                    Type: prInfo.type,
                    Content: newCode,
                    Help: baseInfo.current?.Help,
                    Tags: (baseInfo.current?.Tags || []).join(",") || undefined,
                    EnablePluginSelector: settingInfo.current?.EnablePluginSelector,
                    PluginSelectorTypes: settingInfo.current?.PluginSelectorTypes
                }
                // yak类型-进行源码分析出参数和风险
                if (data.Type === "yak") {
                    const codeInfo = await onCodeToInfo(data.Type, data.Content)
                    if (codeInfo) {
                        data.RiskDetail = codeInfo.RiskInfo.filter((item) => item.Level && item.CVE && item.TypeVerbose)
                        data.Params = codeInfo.CliParameter
                    }
                } else {
                    // 非yak类型-排除参数和风险
                    data.RiskDetail = []
                    data.Params = []
                }
                const info = convertRemoteToRemoteInfo(prInfo, data)

                apiAuditPluginDetaiCheck({...info, ...audit})
                    .then(() => {
                        resolve("success")
                    })
                    .catch(() => {
                        reject()
                    })
            } else {
                yakitNotify("error", `未获取到插件修改信息，请关闭后重试`)
                reject()
            }
        })
    })

    /** ---------- 不合并 Start ---------- */
    const [noPass, setNoPass] = useState<boolean>(false)
    const [form] = Form.useForm()
    const onOpenNoPass = useMemoizedFn(() => {
        if (modifyLoading) return

        if (noPass) return
        if (form) form.setFieldsValue({noPassReason: ""})
        setModifyLoading(true)
        setNoPass(true)
    })
    // 提交不合并的理由
    const submitNoPass = useMemoizedFn(() => {
        if (form) {
            form.validateFields()
                .then((value: {noPassReason: string}) => {
                    setModifyLoading(true)
                    changePRInfo(false, value.noPassReason)
                        .then(() => {
                            onChange(false, value.noPassReason)
                        })
                        .catch(() => {
                            onCancelNoPass()
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
                .then(() => {
                    onChange(true)
                })
                .catch(() => {
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
            return
        }
        setModifyLoading(true)
        changePRInfo(true)
            .then(() => {
                onChange(true)
            })
            .catch(() => {
                setTimeout(() => {
                    setModifyLoading(false)
                }, 300)
            })
    })
    const onCancelPass = useMemoizedFn(() => {
        setPass(false)
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
                className={classNames(styles["plugin-log-detail-drawer"])}
                title={
                    <YakitRadioButtons
                        size='large'
                        buttonStyle='solid'
                        value={activeTab}
                        options={[
                            {value: "diff", label: "源码对比"},
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
                <YakitSpin spinning={fetchLoading}>
                    <div className={styles["plugin-log-wrapper"]}>
                        {activeTab === "diff" && (
                            <div className={styles["diff-wrapper"]}>
                                {(true || !!pluginTypeTag) && (
                                    <div className={styles["diff-header"]}>
                                        <YakitTag color={pluginTypeTag?.color as YakitTagColor}>
                                            {pluginTypeTag?.name || ""}
                                        </YakitTag>
                                        <div className={styles["header-title"]}>{plugin?.ScriptName || ""}</div>
                                    </div>
                                )}
                                <div className={styles["diff-body"]}>
                                    {pluginLanguage && (
                                        <YakitDiffEditor
                                            leftDefaultCode={oldCode.current}
                                            leftReadOnly={true}
                                            rightDefaultCode={newCode}
                                            setRightCode={setNewCode}
                                            triggerUpdate={triggerDiff.current}
                                            language={pluginLanguage}
                                        />
                                    )}
                                </div>
                            </div>
                        )}
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
                onCancel={onCancelNoPass}
                onOk={submitNoPass}
            >
                <Form form={form}>
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
                    code={"yakit.AutoInitYakit()\n\n# Input your code!\n\n"}
                    isStart={pass}
                    successWait={10}
                    successHint='表现良好，检测通过，开始合并修改'
                    failedHint='检测不通过，请根据提示修改'
                    callback={onCallbackScore}
                />
            </YakitModal>
        </>
    )
})
