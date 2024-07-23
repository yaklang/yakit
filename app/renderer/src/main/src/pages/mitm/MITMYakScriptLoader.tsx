import React, {useEffect, useMemo, useState} from "react"
import {Card, Col, Form, Typography, Row, Statistic} from "antd"
import {YakExecutorParam} from "../invoker/YakExecutorParams"
import {StatusCardProps} from "../yakitStore/viewers/base"
import {YakScript} from "../invoker/schema"
import {failed, yakitNotify} from "../../utils/notification"
import {useMemoizedFn} from "ahooks"
import style from "./MITMYakScriptLoader.module.scss"
import {YakitCheckbox} from "@/components/yakitUI/YakitCheckbox/YakitCheckbox"
import {PluginLocalInfoIcon} from "../customizeMenu/CustomizeMenu"
import classNames from "classnames"
import {LightningBoltIcon} from "@/assets/newIcon"
import {YakitPopconfirm} from "@/components/yakitUI/YakitPopconfirm/YakitPopconfirm"
import {grpcFetchLocalPluginDetail} from "../pluginHub/utils/grpc"
import {YakParamProps} from "../plugins/pluginsType"
import {CustomPluginExecuteFormValue} from "../plugins/operator/localPluginExecuteDetailHeard/LocalPluginExecuteDetailHeardType"
import {ExecuteEnterNodeByPluginParams} from "../plugins/operator/localPluginExecuteDetailHeard/LocalPluginExecuteDetailHeard"
import {showYakitModal} from "@/components/yakitUI/YakitModal/YakitModalConfirm"
import {getValueByType} from "../plugins/editDetails/utils"
import YakitCollapse from "@/components/yakitUI/YakitCollapse/YakitCollapse"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {OutlinePencilaltIcon} from "@/assets/icon/outline"
const {YakitPanel} = YakitCollapse
const {Text} = Typography

const {ipcRenderer} = window.require("electron")

export const MITMYakScriptLoader = React.memo((p: MITMYakScriptLoaderProps) => {
    const {
        hooks,
        hooksID,
        script,
        onSubmitYakScriptId,
        onRemoveHook,
        defaultPlugins,
        setDefaultPlugins,
        status,
        isHasParams,
        showEditor
    } = p
    const [i, setI] = useState(script)
    useEffect(() => {
        setI(script)
    }, [script])

    /**
     * mitm处理带参
     */
    const handleMitmHasParams = (submitFlag = false) => {
        const requiredParams = i.Params.filter((item) => item.Required)
        const norequiredParams = i.Params.filter((item) => !item.Required)
        let requiredInitRequiredFormValue: CustomPluginExecuteFormValue = {}
        let norequiredInitRequiredFormValue: CustomPluginExecuteFormValue = {}
        requiredParams.forEach((ele) => {
            const value = getValueByType(ele.DefaultValue, ele.TypeVerbose)
            requiredInitRequiredFormValue = {
                ...requiredInitRequiredFormValue,
                [ele.Field]: value
            }
        })
        norequiredParams.forEach((ele) => {
            const value = getValueByType(ele.DefaultValue, ele.TypeVerbose)
            norequiredInitRequiredFormValue = {
                ...norequiredInitRequiredFormValue,
                [ele.Field]: value
            }
        })

        getRemoteValue("mitm_has_params_" + i.ScriptName).then((res) => {
            if (res) {
                try {
                    const arr: YakExecutorParam[] = JSON.parse(res) || []
                    arr.forEach((item) => {
                        if (requiredInitRequiredFormValue.hasOwnProperty(item.Key)) {
                            requiredInitRequiredFormValue[item.Key] =
                                item.Value || requiredInitRequiredFormValue[item.Key]
                        } else if (norequiredInitRequiredFormValue.hasOwnProperty(item.Key)) {
                            norequiredInitRequiredFormValue[item.Key] = item.Value
                        }
                    })
                } catch (error) {}
                mitmParamsModal(
                    requiredInitRequiredFormValue,
                    requiredParams,
                    norequiredInitRequiredFormValue,
                    norequiredParams,
                    submitFlag
                )
            } else {
                // 带参插件参数本地不存在 采用默认值为初始值
                mitmParamsModal(
                    requiredInitRequiredFormValue,
                    requiredParams,
                    norequiredInitRequiredFormValue,
                    norequiredParams,
                    submitFlag
                )
            }
        })
    }
    const mitmParamsModal = (
        requiredInitRequiredFormValue: CustomPluginExecuteFormValue,
        requiredParams: YakParamProps[],
        norequiredInitRequiredFormValue: CustomPluginExecuteFormValue,
        norequiredParams: YakParamProps[],
        submitFlag: boolean
    ) => {
        if (requiredParams.length || norequiredParams.length) {
            let saveRequiredParams: CustomPluginExecuteFormValue = requiredInitRequiredFormValue
            let saveNORequiredParams: CustomPluginExecuteFormValue = norequiredInitRequiredFormValue
            let m = showYakitModal({
                title: (
                    <div>
                        参数设置：
                        <Text
                            style={{maxWidth: 400}}
                            ellipsis={{
                                tooltip: true
                            }}
                        >
                            {`${i.ScriptName}`}
                        </Text>
                    </div>
                ),
                width: 600,
                closable: true,
                centered: true,
                maskClosable: false,
                content: (
                    <div
                        className={style["mitm-params-set"]}
                        style={{margin: !requiredParams.length ? "-1px 10px 15px" : "15px 10px"}}
                    >
                        <MitmRequiredParamsForm
                            onPerformanceParams={(params) => (saveRequiredParams = params)}
                            initRequiredFormValue={requiredInitRequiredFormValue}
                            requiredParams={requiredParams}
                        ></MitmRequiredParamsForm>
                        {!!norequiredParams.length && (
                            <YakitCollapse defaultActiveKey={!requiredParams.length ? ["额外参数"] : [""]}>
                                <YakitPanel header='额外参数' key='额外参数'>
                                    <MitmParamsForm
                                        onPerformanceParams={(params) => (saveNORequiredParams = params)}
                                        initRequiredFormValue={norequiredInitRequiredFormValue}
                                        params={norequiredParams}
                                    ></MitmParamsForm>
                                </YakitPanel>
                            </YakitCollapse>
                        )}
                    </div>
                ),
                onOkText: "确定",
                onOk: () => {
                    const saveParams: any = {...saveRequiredParams, ...saveNORequiredParams}
                    const saveParasmArr: YakExecutorParam[] = []
                    Object.keys(saveParams).forEach((key) => {
                        saveParasmArr.push({Key: key, Value: saveParams[key]})
                    })
                    setRemoteValue("mitm_has_params_" + i.ScriptName, JSON.stringify(saveParasmArr))
                    if (submitFlag) {
                        clearMITMPluginCache()
                        onSubmitYakScriptId(script.Id, saveParasmArr)
                    }
                    m.destroy()
                },
                onCancel: () => {
                    m.destroy()
                }
            })
        }
    }

    const onCheckboxClicked = useMemoizedFn(() => {
        if (status === "idle") {
            onSelectDefaultPlugins()
        } else {
            onLaunchPlugin()
        }
    })
    /**
     * @description 劫持未开启前,勾选默认插件
     */
    const onSelectDefaultPlugins = useMemoizedFn(() => {
        if (!defaultPlugins || !setDefaultPlugins) return
        const checked = !!defaultPlugins?.includes(i.ScriptName)
        if (checked) {
            const newPluginList = defaultPlugins.filter((ele) => ele !== i.ScriptName)
            setDefaultPlugins(newPluginList)
        } else {
            setDefaultPlugins([...defaultPlugins, i.ScriptName])
        }
    })
    /**
     * @description 劫持未开启后,勾选启动插件
     */
    const onLaunchPlugin = useMemoizedFn(() => {
        if (hackingCheck) {
            ipcRenderer.invoke("mitm-remove-hook", {
                HookName: [],
                RemoveHookID: [i.ScriptName]
            } as any)
            if (onRemoveHook) onRemoveHook(i.ScriptName, i.Id + "")
            return
        } else {
            if (isHasParams) {
                handleMitmHasParams(true)
            } else {
                clearMITMPluginCache()
                onSubmitYakScriptId(script.Id, [])
            }
        }
    })
    const getScriptInfo = useMemoizedFn((s: YakScript, isSendToPatch?: boolean) => {
        if (!s.ScriptName) return
        grpcFetchLocalPluginDetail({Name: s.ScriptName}, true)
            .then((res: YakScript) => {
                setI({
                    ...res,
                    HeadImg: "",
                    OnlineOfficial: false,
                    OnlineIsPrivate: false,
                    UUID: ""
                })
                if (isSendToPatch) {
                    p.onSendToPatch && p.onSendToPatch(res)
                }
            })
            .catch(() => {})
    })
    const hackingCheck = useMemo(() => {
        return !!hooks.get(i.ScriptName) || !!hooksID.get(i.Id + "")
    }, [hooks, hooksID])
    const checkedStatus = useMemo(() => {
        return status === "idle" ? !!defaultPlugins?.includes(i.ScriptName) : hackingCheck
    }, [status, defaultPlugins, hackingCheck])
    return (
        <div className={style["mitm-plugin-local-item"]}>
            <div className={style["mitm-plugin-local-left"]}>
                <YakitCheckbox checked={checkedStatus} onChange={() => onCheckboxClicked()} />
                <div className={style["mitm-plugin-local-info"]}>
                    <div className={style["mitm-plugin-local-info-left"]} onClick={() => onCheckboxClicked()}>
                        {i.HeadImg && (
                            <img alt='' src={i.HeadImg} className={classNames(style["plugin-local-headImg"])} />
                        )}
                        <span className={classNames(style["plugin-local-scriptName"])}>{i.ScriptName}</span>
                    </div>
                    <div className={style["mitm-plugin-local-info-right"]}>
                        <PluginLocalInfoIcon plugin={i} getScriptInfo={getScriptInfo} />
                    </div>
                </div>
            </div>
            {showEditor && (
                <OutlinePencilaltIcon
                    className={style["mitm-params-edit-icon"]}
                    onClick={() => {
                        handleMitmHasParams(hackingCheck)
                    }}
                />
            )}
            {status !== "idle" && (
                <YakitPopconfirm
                    disabled={!p.onSendToPatch}
                    title='发送到【热加载】中调试代码？'
                    onConfirm={() => {
                        if (!i.Content) {
                            getScriptInfo(i, true)
                            return
                        }
                        p.onSendToPatch && p.onSendToPatch(i)
                    }}
                >
                    <LightningBoltIcon className={style["lightning-bolt-icon"]} />
                </YakitPopconfirm>
            )}
        </div>
    )
})

export const StatusCardViewer = React.memo((p: {status: StatusCardProps[]}) => {
    return (
        <Row gutter={12}>
            {p.status.map((i) => {
                return (
                    <Col span={6} style={{marginBottom: 8}}>
                        <Card hoverable={true} bordered={true} size={"small"}>
                            <Statistic title={i.Id} value={i.Data} />
                        </Card>
                    </Col>
                )
            })}
        </Row>
    )
})

export interface MITMYakScriptLoaderProps {
    status?: "idle" | "hijacked" | "hijacking"
    script: YakScript
    hooks: Map<string, boolean>
    hooksID: Map<string, boolean>
    maxWidth?: number
    onSendToPatch?: (s: YakScript) => any
    onSubmitYakScriptId: (id: number, params: YakExecutorParam[]) => any
    onRemoveHook?: (name: string, id: string) => void
    /**
     * @param 是否劫持启动前/未开启劫持启动
     */
    isBeforeHijacking?: boolean
    /**
     * @param 是否劫持启动前 勾选默认插件
     */
    defaultPlugins?: string[]
    setDefaultPlugins?: (p: string[]) => void
    isHasParams: boolean
    showEditor: boolean
}

export function clearMITMPluginCache() {
    ipcRenderer.invoke("mitm-clear-plugin-cache").catch((e) => {
        failed(`清除插件缓存失败: ${e}`)
    })
}
interface MitmRequiredParamsFormProps {
    onPerformanceParams: (params: any) => void
    initRequiredFormValue: CustomPluginExecuteFormValue
    requiredParams: YakParamProps[]
}
// 必填参数
const MitmRequiredParamsForm = React.memo((props: MitmRequiredParamsFormProps) => {
    const {onPerformanceParams, initRequiredFormValue, requiredParams} = props
    const [form] = Form.useForm()
    return (
        <Form
            form={form}
            layout={"horizontal"}
            labelCol={{span: 8}}
            wrapperCol={{span: 15}}
            initialValues={initRequiredFormValue}
            onValuesChange={(changedValues, allValues) => {
                onPerformanceParams({...allValues})
            }}
        >
            <ExecuteEnterNodeByPluginParams paramsList={requiredParams} pluginType={"mitm"} isExecuting={false} />
        </Form>
    )
})
interface MitmParamsFormProps {
    onPerformanceParams: (params: any) => void
    initRequiredFormValue: CustomPluginExecuteFormValue
    params: YakParamProps[]
}
// 额外参数
const MitmParamsForm = React.memo((props: MitmParamsFormProps) => {
    const {onPerformanceParams, initRequiredFormValue, params} = props
    const [form] = Form.useForm()
    return (
        <Form
            form={form}
            layout={"horizontal"}
            labelCol={{span: 8}}
            wrapperCol={{span: 15}}
            style={{marginTop: 20}}
            initialValues={initRequiredFormValue}
            onValuesChange={(changedValues, allValues) => {
                onPerformanceParams({...allValues})
            }}
        >
            <ExecuteEnterNodeByPluginParams paramsList={params} pluginType={"mitm"} isExecuting={false} />
        </Form>
    )
})
