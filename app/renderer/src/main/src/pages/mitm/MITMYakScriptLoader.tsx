import React, {ForwardedRef, useEffect, useImperativeHandle, useMemo, useRef, useState} from "react"
import {Card, Col, Form, Row, Statistic, Tooltip, Space} from "antd"
import {YakExecutorParam} from "../invoker/YakExecutorParams"
import {StatusCardProps} from "../yakitStore/viewers/base"
import {YakScript} from "../invoker/schema"
import {failed} from "../../utils/notification"
import {useMemoizedFn, useThrottleEffect} from "ahooks"
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
import {getValueByType, ParamsToGroupByGroupName} from "../plugins/editDetails/utils"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {
    OutlileHistoryIcon,
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
import {getJsonSchemaListResult} from "@/components/JsonFormWrapper/JsonFormWrapper"
import {YakitDrawer} from "@/components/yakitUI/YakitDrawer/YakitDrawer"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {Resizable} from "re-resizable"

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
        curTabKey,
    } = p
    const [i, setI] = useState(script)
    useEffect(() => {
        setI(script)
    }, [script])

    /**
     * mitm处理带参
     */
    const [mitmParamsDrawer, setMitmParamsDrawer] = useState<boolean>(false)
    const mitmParamsInitFormValueRef = useRef<CustomPluginExecuteFormValue>({})
    const mitmParamsRequiredParamsRef = useRef<YakParamProps[]>([])
    const mitmParamsGroupParamsRef = useRef<YakExtraParamProps[]>([])
    const [drawerWidth, setDrawerWidth] = useState<number>(45) // 默认45vw
    const handleMitmHasParams = () => {
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
                mitmParamsModal(initFormValue, requiredParams, groupParams)
            } else {
                // 带参插件参数本地不存在 采用默认值为初始值
                mitmParamsModal(initFormValue, requiredParams, groupParams)
            }
        })
    }
    const mitmParamsModal = (
        initFormValue: CustomPluginExecuteFormValue,
        requiredParams: YakParamProps[],
        groupParams: YakExtraParamProps[]
    ) => {
        if (requiredParams.length || groupParams.length) {
            mitmParamsInitFormValueRef.current = initFormValue
            mitmParamsRequiredParamsRef.current = requiredParams
            mitmParamsGroupParamsRef.current = groupParams
            getRemoteValue("mitm_has_params_drawerWidth_" + i.ScriptName)
                .then((width) => {
                    if (width) {
                        setDrawerWidth(Number(width))
                    } else {
                        setDrawerWidth(45)
                    }
                })
                .catch(() => {
                    setDrawerWidth(45)
                })
                .finally(() => {
                    setMitmParamsDrawer(true)
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
                handleMitmHasParams()
            } else {
                clearMITMPluginCache()
                onSubmitYakScriptId(i.Id, [])
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
                        handleMitmHasParams()
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
            {mitmParamsDrawer && (
                <MitmHasParamsDrawer
                    visible={mitmParamsDrawer}
                    i={i}
                    drawerWidth={drawerWidth}
                    onSetDrawerWidth={setDrawerWidth}
                    initFormValue={mitmParamsInitFormValueRef.current}
                    requiredParams={mitmParamsRequiredParamsRef.current}
                    groupParams={mitmParamsGroupParamsRef.current}
                    onSubmitYakScriptId={onSubmitYakScriptId}
                    onSetTempShowPluginHistory={setTempShowPluginHistory}
                    onSetMitmParamsDrawer={setMitmParamsDrawer}
                ></MitmHasParamsDrawer>
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

interface MitmHasParamsDrawer {
    visible: boolean
    i: YakScript
    drawerWidth: number
    initFormValue: CustomPluginExecuteFormValue
    requiredParams: YakParamProps[]
    groupParams: YakExtraParamProps[]
    onSubmitYakScriptId: (id: number, params: YakExecutorParam[]) => void
    onSetTempShowPluginHistory?: (l: string) => void
    onSetDrawerWidth: (width: number) => void
    onSetMitmParamsDrawer: (visible: boolean) => void
}
const MitmHasParamsDrawer = React.memo((props: MitmHasParamsDrawer) => {
    const {
        visible,
        i,
        drawerWidth,
        initFormValue,
        requiredParams,
        groupParams,
        onSubmitYakScriptId,
        onSetTempShowPluginHistory,
        onSetDrawerWidth,
        onSetMitmParamsDrawer,
    } = props
    const mitmHasParamsPluginFormRef = useRef<MitmHasParamsFormPropsRefProps>()
    const [initWidth, setInitWidth] = useState<number>(drawerWidth)

    useEffect(() => {
        return () => {
            emiter.emit("setYakitHeaderDraggable", true)
        }
    }, [])

    const vwToPx = (vw: number) => {
        const viewportWidth = window.innerWidth
        return (vw * viewportWidth) / 100
    }

    const pxToVw = (px: number) => {
        const viewportWidth = window.innerWidth
        return (px / viewportWidth) * 100
    }

    const minWidth = useMemo(() => {
        return Math.min(40, initWidth)
    }, [initWidth])

    return (
        <YakitDrawer
            visible={visible}
            closable={false}
            width={drawerWidth + "vw"}
            placement='left'
            title={
                <div className={style["mitmParamsDrawer-title"]}>
                    <div
                        className='content-ellipsis'
                        style={{maxWidth: `calc(${vwToPx(Math.max(minWidth, drawerWidth))}px - 150px)`}}
                    >
                        参数设置：
                        <Tooltip title={i.ScriptName}>{`${i.ScriptName}`}</Tooltip>
                    </div>
                    <Space>
                        <YakitButton
                            type='outline2'
                            onClick={() => {
                                onSetMitmParamsDrawer(false)
                            }}
                        >
                            取消
                        </YakitButton>
                        <YakitButton
                            onClick={() => {
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
                                            setRemoteValue(
                                                "mitm_has_params_" + i.ScriptName,
                                                JSON.stringify(saveParasmArr)
                                            )
                                            setRemoteValue(
                                                "mitm_has_params_drawerWidth_" + i.ScriptName,
                                                drawerWidth + ""
                                            )
                                            clearMITMPluginCache()
                                            onSubmitYakScriptId(i.Id, saveParasmArr)
                                            onSetTempShowPluginHistory && onSetTempShowPluginHistory(i.ScriptName)
                                            onSetMitmParamsDrawer(false)
                                        }
                                    })
                                }
                            }}
                        >
                            确定
                        </YakitButton>
                    </Space>
                </div>
            }
            bodyStyle={{paddingLeft: 0, paddingRight: 0, overflowX: "clip"}}
            style={{position: "absolute"}}
        >
            <Resizable
                minWidth={minWidth + "vw"}
                maxWidth={"95vw"}
                minHeight={"100%"}
                onResizeStart={(e) => e.stopPropagation()}
                onResize={(e, direction, ref, d) => {
                    e.stopPropagation()
                    const newWidth = Math.min(ref.offsetWidth, window.innerWidth * 0.95)
                    onSetDrawerWidth(pxToVw(newWidth))
                }}
                enable={{
                    right: true
                }}
                handleStyles={{
                    right: {
                        width: 15,
                        cursor: "ew-resize",
                        right: 0
                    }
                }}
                size={{
                    width: drawerWidth + "vw",
                    height: "auto"
                }}
            >
                <div className={style["mitm-params-set"]}>
                    <MitmHasParamsForm
                        ref={mitmHasParamsPluginFormRef}
                        initFormValue={initFormValue}
                        requiredParams={requiredParams}
                        groupParams={groupParams}
                    />
                </div>
            </Resizable>
        </YakitDrawer>
    )
})
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
    const jsonSchemaListRef = useRef<{
        [key: string]: any
    }>({})

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
                    const result = getJsonSchemaListResult(jsonSchemaListRef.current)
                    if (result.jsonSchemaError.length > 0) {
                        failed(`jsonSchema校验失败`)
                        return
                    }
                    result.jsonSchemaSuccess.forEach((item) => {
                        values[item.key] = JSON.stringify(item.value)
                    })
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
            wrapperCol={{span: 16}}
            initialValues={initFormValue}
        >
            <ExecuteEnterNodeByPluginParams
                paramsList={requiredParams}
                pluginType={"mitm"}
                isExecuting={false}
                jsonSchemaListRef={jsonSchemaListRef}
                jsonSchemaInitial={initFormValue}
            />
            <ExtraParamsNodeByType extraParamsGroup={groupParams} pluginType={"mitm"} />
        </Form>
    )
})
