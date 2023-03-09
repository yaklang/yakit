import React, {useEffect, useState} from "react"
import {Card, Col, Popconfirm, Row, Statistic} from "antd"
import {YakExecutorParam} from "../invoker/YakExecutorParams"
import {StatusCardProps} from "../yakitStore/viewers/base"
import {YakScript} from "../invoker/schema"
import {failed, warn} from "../../utils/notification"
import {useMemoizedFn} from "ahooks"
import style from "./MITMYakScriptLoader.module.scss"
import {YakitCheckbox} from "@/components/yakitUI/YakitCheckbox/YakitCheckbox"
import {PluginLocalInfoIcon} from "../customizeMenu/CustomizeMenu"
import classNames from "classnames"
import {LightningBoltIcon} from "@/assets/newIcon"
import {YakitPopconfirm} from "@/components/yakitUI/YakitPopconfirm/YakitPopconfirm"

const {ipcRenderer} = window.require("electron")

export const MITMYakScriptLoader = React.memo((p: MITMYakScriptLoaderProps) => {
    const {hooks, script, onSubmitYakScriptId, onRemoveHook, defaultPlugins, setDefaultPlugins, status} = p
    const [i, setI] = useState(script)
    useEffect(() => {
        setI(script)
    }, [script])
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
        const checked = !!hooks.get(i.ScriptName)
        if (checked) {
            ipcRenderer.invoke("mitm-remove-hook", {
                HookName: [],
                RemoveHookID: [i.ScriptName]
            } as any)
            if (onRemoveHook) onRemoveHook(i.ScriptName)
            return
        }

        if (!p.onSubmitYakScriptId) {
            return
        }

        clearMITMPluginCache()
        p.onSubmitYakScriptId && p.onSubmitYakScriptId(script.Id, [])
    })
    const getScriptInfo = useMemoizedFn((s: YakScript, isSendToPatch?: boolean) => {
        if (!s.ScriptName) return
        ipcRenderer.invoke("GetYakScriptByName", {Name: s.ScriptName}).then((res: YakScript) => {
            setI({
                ...res,
                HeadImg: "",
                OnlineOfficial: false,
                OnlineIsPrivate: false,
                UUID: ""
            })
            if (isSendToPatch) {
                p.onSendToPatch && p.onSendToPatch(res.Content)
            }
        })
    })
    return (
        <div className={style["mitm-plugin-local-item"]}>
            <div className={style["mitm-plugin-local-left"]}>
                <YakitCheckbox
                    checked={status === "idle" ? !!defaultPlugins?.includes(i.ScriptName) : !!hooks.get(i.ScriptName)}
                    onChange={() => onCheckboxClicked()}
                />
                <div className={style["mitm-plugin-local-info"]}>
                    <div className={style["mitm-plugin-local-info-left"]}>
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
            {status !== "idle" && (
                <YakitPopconfirm
                    disabled={!p.onSendToPatch}
                    title='发送到【热加载】中调试代码？'
                    onConfirm={() => {
                        if (!i.Content) {
                            getScriptInfo(i, true)
                            return
                        }
                        p.onSendToPatch && p.onSendToPatch(i.Content)
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
    maxWidth?: number
    onSendToPatch?: (code: string) => any
    onSubmitYakScriptId?: (id: number, params: YakExecutorParam[]) => any
    onRemoveHook?: (name: string) => void
    /**
     * @param 是否劫持启动前/未开启劫持启动
     */
    isBeforeHijacking?: boolean
    /**
     * @param 是否劫持启动前 勾选默认插件
     */
    defaultPlugins?: string[]
    setDefaultPlugins?: (p: string[]) => void
}

export function clearMITMPluginCache() {
    ipcRenderer.invoke("mitm-clear-plugin-cache").catch((e) => {
        failed(`清除插件缓存失败: ${e}`)
    })
}
