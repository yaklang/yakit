import React, {useEffect, useState} from "react"
import {Button, Card, Checkbox, Col, Descriptions, Popconfirm, Row, Space, Statistic, Tooltip} from "antd"
import {showModal} from "../../utils/showModal"
import {YakScriptParamsSetter} from "../invoker/YakScriptParamsSetter"
import {YakExecutorParam} from "../invoker/YakExecutorParams"
import {QuestionCircleOutlined, ThunderboltFilled, UserOutlined} from "@ant-design/icons"
import {StatusCardProps} from "../yakitStore/viewers/base"
import {YakScript} from "../invoker/schema"
import {failed, warn} from "../../utils/notification"
import {OneLine} from "../../utils/inputUtil"
import {useMemoizedFn, useThrottle} from "ahooks"
import ReactResizeDetector from "react-resize-detector"
import {AutoSpin} from "@/components/AutoSpin"
import style from "./MITMYakScriptLoader.module.scss"
import {YakitCheckbox} from "@/components/yakitUI/YakitCheckbox/YakitCheckbox"
import {PluginLocalInfoIcon} from "../customizeMenu/CustomizeMenu"
import classNames from "classnames"

const {ipcRenderer} = window.require("electron")

export const MITMYakScriptLoader = React.memo((p: MITMYakScriptLoaderProps) => {
    const {hooks, script, onSubmitYakScriptId, onRemoveHook, isBeforeHijacking, defaultPlugins, setDefaultPlugins} = p
    const i = script
    const onCheckboxClicked = useMemoizedFn(() => {
        if (isBeforeHijacking) {
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
    return (
        <div className={style["mitm-plugin-local-item"]} onClick={() => onCheckboxClicked()}>
            <YakitCheckbox
                checked={isBeforeHijacking ? !!defaultPlugins?.includes(i.ScriptName) : !!hooks.get(i.ScriptName)}
            />
            <div className={style["mitm-plugin-local-info"]}>
                <div className={style["mitm-plugin-local-info-left"]}>
                    <img alt='' src={i.HeadImg} className={classNames(style["plugin-local-headImg"])} />
                    <span className={classNames(style["plugin-local-scriptName"])}>{i.ScriptName}</span>
                </div>
                <div className={style["mitm-plugin-local-info-right"]}>
                    <PluginLocalInfoIcon plugin={i} />
                </div>
            </div>
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
