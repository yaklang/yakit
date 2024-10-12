import React, {ForwardedRef, useEffect, useImperativeHandle, useMemo, useRef, useState} from "react"
import {Card, Col, Form, Typography, Row, Statistic, Tooltip} from "antd"
import {YakExecutorParam} from "../invoker/YakExecutorParams"
import {StatusCardProps} from "../yakitStore/viewers/base"
import {YakScript} from "../invoker/schema"
import {failed} from "../../utils/notification"
import {useMemoizedFn} from "ahooks"
import style from "./MITMYakScriptLoader.module.scss"
import {YakitCheckbox} from "@/components/yakitUI/YakitCheckbox/YakitCheckbox"
import {PluginLocalInfoIcon} from "../customizeMenu/CustomizeMenu"
import classNames from "classnames"
import {YakitPopconfirm} from "@/components/yakitUI/YakitPopconfirm/YakitPopconfirm"
import {grpcFetchLocalPluginDetail} from "../pluginHub/utils/grpc"
import {YakParamProps} from "../plugins/pluginsType"
import {
    CustomPluginExecuteFormValue,
    YakExtraParamProps
} from "../plugins/operator/localPluginExecuteDetailHeard/LocalPluginExecuteDetailHeardType"
import {ExecuteEnterNodeByPluginParams} from "../plugins/operator/localPluginExecuteDetailHeard/LocalPluginExecuteDetailHeard"
import {showYakitModal} from "@/components/yakitUI/YakitModal/YakitModalConfirm"
import {getValueByType, ParamsToGroupByGroupName} from "../plugins/editDetails/utils"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {
    OutlileHistoryIcon,
    OutlineLightningboltIcon,
    OutlinePencilaltIcon,
    OutlineQuestionmarkcircleIcon,
    OutlineTerminalIcon
} from "@/assets/icon/outline"
import {ExtraParamsNodeByType} from "../plugins/operator/localPluginExecuteDetailHeard/PluginExecuteExtraParams"
import emiter from "@/utils/eventBus/eventBus"
import {YakitDropdownMenu} from "@/components/yakitUI/YakitDropdownMenu/YakitDropdownMenu"
import {SolidDotsverticalIcon, SolidLightningboltIcon} from "@/assets/icon/solid"
import {YakitMenuItemProps} from "@/components/yakitUI/YakitMenu/YakitMenu"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"
import {YakEditor} from "@/utils/editors"
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
        showEditor,
        showPluginHistoryList = [],
        setShowPluginHistoryList = () => {},
        setTempShowPluginHistory,
        hasParamsCheckList,
        curTabKey
    } = p
    const [i, setI] = useState(script)
    useEffect(() => {
        setI(script)
    }, [script])

    /**
     * mitm处理带参
     */
    const mitmHasParamsPluginFormRef = useRef<MitmHasParamsFormPropsRefProps>()
    const handleMitmHasParams = (submitFlag = false) => {
        const requiredParams = i.Params.filter((item) => item.Required)
        const norequiredParams = i.Params.filter((item) => !item.Required)
        const groupParams: YakExtraParamProps[] = ParamsToGroupByGroupName(norequiredParams)
        let initFormValue: CustomPluginExecuteFormValue = {}
        i.Params.forEach((ele) => {
            const value = getValueByType(ele.DefaultValue, ele.TypeVerbose)
            initFormValue = {
                ...initFormValue,
                [ele.Field]: value
            }
        })
        getRemoteValue("mitm_has_params_" + i.ScriptName).then((res) => {
            if (res) {
                try {
                    const arr: YakExecutorParam[] = JSON.parse(res) || []
                    arr.forEach((item) => {
                        if (initFormValue.hasOwnProperty(item.Key)) {
                            initFormValue[item.Key] = item.Value
                        }
                    })
                } catch (error) {}
                mitmParamsModal(initFormValue, requiredParams, groupParams, submitFlag)
            } else {
                // 带参插件参数本地不存在 采用默认值为初始值
                mitmParamsModal(initFormValue, requiredParams, groupParams, submitFlag)
            }
        })
    }
    const mitmParamsModal = (
        initFormValue: CustomPluginExecuteFormValue,
        requiredParams: YakParamProps[],
        groupParams: YakExtraParamProps[],
        submitFlag: boolean
    ) => {
        if (requiredParams.length || groupParams.length) {
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
                    <div className={style["mitm-params-set"]}>
                        <MitmHasParamsForm
                            ref={mitmHasParamsPluginFormRef}
                            initFormValue={initFormValue}
                            requiredParams={requiredParams}
                            groupParams={groupParams}
                        ></MitmHasParamsForm>
                    </div>
                ),
                onOkText: "确定",
                onOk: () => {
                    if (mitmHasParamsPluginFormRef.current) {
                        mitmHasParamsPluginFormRef.current.onSubmit().then((values) => {
                            if (values) {
                                const saveParams: CustomPluginExecuteFormValue = {...values}
                                const saveParasmArr: YakExecutorParam[] = []
                                Object.keys(saveParams).forEach((key) => {
                                    if (saveParams[key] !== false) {
                                        saveParasmArr.push({Key: key, Value: saveParams[key]})
                                    }
                                })
                                setRemoteValue("mitm_has_params_" + i.ScriptName, JSON.stringify(saveParasmArr))
                                if (submitFlag) {
                                    clearMITMPluginCache()
                                    onSubmitYakScriptId(script.Id, saveParasmArr)
                                    setTempShowPluginHistory && setTempShowPluginHistory(i.ScriptName)
                                }
                                m.destroy()
                            }
                        })
                    }
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
    }, [hooks, hooksID, i])
    const checkedStatus = useMemo(() => {
        return status === "idle" ? !!defaultPlugins?.includes(i.ScriptName) : hackingCheck
    }, [status, defaultPlugins, hackingCheck, i])

    const showPluginHistoryListRef = useRef<string[]>(showPluginHistoryList)
    useEffect(() => {
        showPluginHistoryListRef.current = showPluginHistoryList
    }, [showPluginHistoryList])
    const historyIcon = useMemo(() => {
        return (
            <Tooltip title={showPluginHistoryList.includes(i.ScriptName) ? "取消查看该插件流量" : "查看该插件流量"}>
                <OutlileHistoryIcon
                    style={{marginLeft: curTabKey === "loaded" ? 4 : 12, marginRight: curTabKey === "loaded" ? 12 : 0}}
                    className={classNames(style["history-icon"], {
                        [style["history-icon-def"]]: !showPluginHistoryList.includes(i.ScriptName),
                        [style["history-icon-light"]]: showPluginHistoryList.includes(i.ScriptName)
                    })}
                    onClick={() => {
                        // 单个
                        let arr = [...showPluginHistoryList]
                        if (arr.includes(i.ScriptName)) {
                            arr = arr.filter((item) => item !== i.ScriptName)
                        } else {
                            arr = [i.ScriptName]
                        }

                        setTempShowPluginHistory && setTempShowPluginHistory("")

                        setShowPluginHistoryList(arr)
                        emiter.emit("onHasParamsJumpHistory", arr.join(","))
                    }}
                />
            </Tooltip>
        )
    }, [i, showPluginHistoryList])

    const onHistoryTagToMitm = (tags: string) => {
        const newSelectTags = tags.split(",")
        const arr = showPluginHistoryListRef.current.filter((item) => newSelectTags.includes(item))
        setShowPluginHistoryList(arr)
    }

    useEffect(() => {
        emiter.on("onHistoryTagToMitm", onHistoryTagToMitm)
        return () => {
            emiter.off("onHistoryTagToMitm", onHistoryTagToMitm)
        }
    }, [])

    const hotIcon = useMemo(() => {
        return (
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
                <SolidLightningboltIcon
                    className={style["lightning-bolt-icon"]}
                    style={{marginLeft: curTabKey === "loaded" ? 4 : 0, marginRight: curTabKey === "loaded" ? 12 : 0}}
                />
            </YakitPopconfirm>
        )
    }, [i, p])

    return (
        <div className={style["mitm-plugin-local-item"]}>
            <div className={style["mitm-plugin-local-left"]}>
                <YakitCheckbox checked={checkedStatus} onChange={() => onCheckboxClicked()} />
                <div className={style["mitm-plugin-local-info"]}>
                    <div
                        className={style["mitm-plugin-local-info-left"]}
                        onClick={() => onCheckboxClicked()}
                        style={{
                            width:
                                status === "idle"
                                    ? "calc(100% - 75px)"
                                    : curTabKey === "loaded"
                                    ? "calc(100% - 49px)"
                                    : isHasParams
                                    ? "calc(100% - 2px)"
                                    : "calc(100% - 12px)"
                        }}
                    >
                        {i.HeadImg && (
                            <img alt='' src={i.HeadImg} className={classNames(style["plugin-local-headImg"])} />
                        )}
                        <span className={classNames(style["plugin-local-scriptName"])}>{i.ScriptName}</span>
                    </div>
                    <div className={style["mitm-plugin-local-info-right"]}>
                        {status === "idle" || curTabKey === "loaded" ? (
                            <PluginLocalInfoIcon plugin={i} getScriptInfo={getScriptInfo} />
                        ) : (
                            <></>
                        )}
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
            {status !== "idle" ? (
                <>
                    {curTabKey === "loaded" ? (
                        <>{hasParamsCheckList.includes(i.ScriptName) ? historyIcon : hotIcon}</>
                    ) : (
                        <>{isHasParams ? historyIcon : hotIcon}</>
                    )}
                </>
            ) : null}
            {status !== "idle" && curTabKey !== "loaded" && (
                <YakitDropdownMenu
                    menu={{
                        data: [
                            {
                                key: "source-code",
                                label: (
                                    <YakitPopover
                                        placement='right'
                                        overlayClassName={style["terminal-popover"]}
                                        content={<YakEditor type={i.Type} value={i.Content} readOnly={true} />}
                                        onVisibleChange={(v) => {
                                            if (v && !i.Content) {
                                                getScriptInfo(i)
                                            }
                                        }}
                                        zIndex={9999}
                                    >
                                        <div className={style["extra-menu"]}>
                                            <OutlineTerminalIcon className={style["plugin-local-icon"]} />
                                            <div className={style["menu-name"]}>源码</div>
                                        </div>
                                    </YakitPopover>
                                )
                            },
                            {
                                key: "help-info",
                                label: (
                                    <Tooltip
                                        title={i.Help || "No Description about it."}
                                        placement='right'
                                        overlayClassName={style["question-tooltip"]}
                                        onVisibleChange={(v) => {
                                            if (v && !i.Help) {
                                                getScriptInfo(i)
                                            }
                                        }}
                                    >
                                        <div className={style["extra-menu"]}>
                                            <OutlineQuestionmarkcircleIcon className={style["plugin-local-icon"]} />
                                            <div className={style["menu-name"]}>帮助信息</div>
                                        </div>
                                    </Tooltip>
                                )
                            }
                        ] as YakitMenuItemProps[],
                        onClick: ({key}) => {
                            switch (key) {
                                case "source-code":
                                    break
                                case "help-info":
                                    break
                            }
                        }
                    }}
                    dropdown={{
                        trigger: ["click"],
                        placement: "bottomLeft"
                    }}
                >
                    <SolidDotsverticalIcon className={style["extra-btns-icon"]} />
                </YakitDropdownMenu>
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
    showPluginHistoryList?: string[]
    setShowPluginHistoryList?: (l: string[]) => void
    setTempShowPluginHistory?: (l: string) => void
    hasParamsCheckList: string[]
    curTabKey: string
}

export function clearMITMPluginCache() {
    ipcRenderer.invoke("mitm-clear-plugin-cache").catch((e) => {
        failed(`清除插件缓存失败: ${e}`)
    })
}
interface MitmHasParamsFormPropsRefProps {
    onSubmit: () => Promise<CustomPluginExecuteFormValue | undefined>
}
interface MitmHasParamsFormProps {
    ref?: ForwardedRef<MitmHasParamsFormPropsRefProps>
    initFormValue: CustomPluginExecuteFormValue
    requiredParams: YakParamProps[]
    groupParams: YakExtraParamProps[]
}
const MitmHasParamsForm = React.forwardRef((props: MitmHasParamsFormProps, ref) => {
    const {initFormValue, requiredParams, groupParams} = props
    const [form] = Form.useForm()

    useImperativeHandle(
        ref,
        () => ({
            onSubmit: handleFormSubmit
        }),
        [form]
    )

    const handleFormSubmit: () => Promise<CustomPluginExecuteFormValue | undefined> = useMemoizedFn(() => {
        return new Promise((resolve, reject) => {
            if (!form) return resolve(undefined)
            form.validateFields()
                .then((values) => {
                    resolve(values)
                })
                .catch(() => {
                    resolve(undefined)
                })
        })
    })

    return (
        <Form
            form={form}
            layout={"horizontal"}
            labelCol={{span: 8}}
            wrapperCol={{span: 15}}
            initialValues={initFormValue}
        >
            <ExecuteEnterNodeByPluginParams paramsList={requiredParams} pluginType={"mitm"} isExecuting={false} />
            <ExtraParamsNodeByType extraParamsGroup={groupParams} pluginType={"mitm"} />
        </Form>
    )
})
