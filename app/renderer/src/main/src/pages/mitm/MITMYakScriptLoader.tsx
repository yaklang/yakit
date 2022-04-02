import React from "react";
import {Button, Card, Checkbox, Col, Popconfirm, Row, Statistic, Tooltip} from "antd";
import {showModal} from "../../utils/showModal";
import {YakScriptParamsSetter} from "../invoker/YakScriptParamsSetter";
import {YakExecutorParam} from "../invoker/YakExecutorParams";
import {QuestionCircleOutlined, ThunderboltFilled, UserOutlined} from "@ant-design/icons";
import {StatusCardProps} from "../yakitStore/viewers/base";
import {YakScript} from "../invoker/schema";
import {failed} from "../../utils/notification";

const {ipcRenderer} = window.require("electron");

export const MITMYakScriptLoader = React.memo((p: MITMYakScriptLoaderProps) => {
    const {hooks, script, onSubmitYakScriptId} = p;
    const i = script;

    return <Card
        size={"small"}
        bodyStyle={{paddingLeft: 12, paddingTop: 8, paddingBottom: 8, paddingRight: 12}}
        style={{
            width: "100%", marginBottom: 4,
            // backgroundColor: hooks.get(i.ScriptName) ? "#d6e4ff" : undefined
        }} hoverable={true}
    >
        <div style={{display: "flex", flexDirection: "row", width: "100%"}}>
            <Checkbox
                style={{marginRight: 6}}
                checked={!!hooks.get(i.ScriptName)}
                onClick={() => {
                    const checked = !!hooks.get(i.ScriptName);

                    if (checked) {
                        ipcRenderer.invoke("mitm-remove-hook", {
                            HookName: [],
                            RemoveHookID: [i.ScriptName],
                        } as any)
                        return
                    }

                    if (!p.onSubmitYakScriptId) {
                        return
                    }

                    if ((script.Params || []).length > 0) {
                        let m2 = showModal({
                            title: `设置 [${script.ScriptName}] 的参数`,
                            content: <>
                                <YakScriptParamsSetter
                                    {...script}
                                    onParamsConfirm={(p: YakExecutorParam[]) => {
                                        clearMITMPluginCache()
                                        onSubmitYakScriptId && onSubmitYakScriptId(script.Id, p)
                                        m2.destroy()
                                    }}
                                    submitVerbose={"设置 MITM 参数"}
                                />
                            </>, width: "50%",
                        })
                    } else {
                        clearMITMPluginCache()
                        p.onSubmitYakScriptId && p.onSubmitYakScriptId(script.Id, [])
                    }
                }}
            />
            <div style={{marginRight: 6, maxWidth: p.maxWidth || 260}}>
                {!!i.ScriptName ? i.ScriptName : `{hot-patched}`}
            </div>
            {script.Help && <Tooltip title={script.Help}>
                <Button size={"small"} type={"link"} icon={<QuestionCircleOutlined/>}/>
            </Tooltip>}

            <div style={{flex: 1, textAlign: "right"}}>
                {script.Author && <Tooltip title={script.Author}>
                    <Button size={"small"} type={"link"} icon={<UserOutlined/>}/>
                </Tooltip>}
                <Popconfirm
                    disabled={!p.onSendToPatch}
                    title={"发送到【热加载】中调试代码？"}
                    onConfirm={() => {
                        let _ = p.onSendToPatch && p.onSendToPatch(script.Content);
                    }}
                >
                    <Button
                        disabled={!p.onSendToPatch}
                        type={"link"}
                        size={"small"}
                        icon={<ThunderboltFilled/>}>
                    </Button>
                </Popconfirm>
            </div>
        </div>
    </Card>
})

export const StatusCardViewer = React.memo((p: { status: StatusCardProps[] }) => {
    return <Row gutter={12}>
        {p.status.map(i => {
            return <Col span={6} style={{marginBottom: 8}}>
                <Card hoverable={true} bordered={true} size={"small"}>
                    <Statistic title={i.Id} value={i.Data}/>
                </Card>
            </Col>
        })}
    </Row>
})

export interface MITMYakScriptLoaderProps {
    script: YakScript
    hooks: Map<string, boolean>
    maxWidth?: number
    onSendToPatch?: (code: string) => any
    onSubmitYakScriptId?: (id: number, params: YakExecutorParam[]) => any
}

export function clearMITMPluginCache() {
    ipcRenderer.invoke("mitm-clear-plugin-cache").catch(e => {
        failed(`清除插件缓存失败: ${e}`)
    })
}
