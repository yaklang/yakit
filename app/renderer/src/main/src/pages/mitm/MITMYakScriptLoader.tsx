import React, {useState} from "react";
import {Button, Card, Checkbox, Col, Descriptions, Popconfirm, Row, Space, Statistic, Tooltip} from "antd";
import {showModal} from "../../utils/showModal";
import {YakScriptParamsSetter} from "../invoker/YakScriptParamsSetter";
import {YakExecutorParam} from "../invoker/YakExecutorParams";
import {QuestionCircleOutlined, ThunderboltFilled, UserOutlined} from "@ant-design/icons";
import {StatusCardProps} from "../yakitStore/viewers/base";
import {YakScript} from "../invoker/schema";
import {failed, warn} from "../../utils/notification";
import {OneLine} from "../../utils/inputUtil";
import {useMemoizedFn, useThrottle} from "ahooks";
import ReactResizeDetector from "react-resize-detector";
import {AutoSpin} from "@/components/AutoSpin";

const {ipcRenderer} = window.require("electron");

export const MITMYakScriptLoader = React.memo((p: MITMYakScriptLoaderProps) => {
    const {hooks, script, onSubmitYakScriptId} = p;
    const i = script;
    const onCheckboxClicked = useMemoizedFn(() => {
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

        clearMITMPluginCache()
        p.onSubmitYakScriptId && p.onSubmitYakScriptId(script.Id, [])
        // if ((script.Params || []).length > 0 && script.Type !== "port-scan") {
        //     let m2 = showModal({
        //         title: `设置 [${script.ScriptName}] 的参数`,
        //         content: <>
        //             <YakScriptParamsSetter
        //                 {...script}
        //                 onParamsConfirm={(p: YakExecutorParam[]) => {
        //                     clearMITMPluginCache()
        //                     onSubmitYakScriptId && onSubmitYakScriptId(script.Id, p)
        //                     m2.destroy()
        //                 }}
        //                 submitVerbose={"设置 MITM 参数"}
        //             />
        //         </>, width: "50%",
        //     })
        // } else {
        //
        // }
    })

    return <Card
        size={"small"}
        bodyStyle={{paddingLeft: 12, paddingTop: 8, paddingBottom: 8, paddingRight: 12}}
        style={{
            width: "100%", marginBottom: 4,
            // backgroundColor: hooks.get(i.ScriptName) ? "#d6e4ff" : undefined
        }}
    >
        <div
            style={{
                display: "flex", flexDirection: "row", width: "100%",
                justifyContent: "flex-end",
            }}
        >
            <div
                style={{
                    flex: 1, display: "flex", flexDirection: "row",
                    overflow: "hidden",
                }}
                onClick={onCheckboxClicked}
            >
                <Checkbox
                    style={{marginRight: 6}}
                    checked={!!hooks.get(i.ScriptName)}
                >
                </Checkbox>
                <div style={{
                    // width: cardWidth - 50 - 24,
                    flex: `1 1 auto`,
                    overflow: "hidden",
                    textOverflow: "ellipsis", whiteSpace: "nowrap"
                }}>
                    {!!i.ScriptName ? i.ScriptName : `{hot-patched}`}
                </div>
            </div>


            <div style={{width: '50px', textAlign: "right"}}>
                <OneLine>
                    <a href={"#"} onClick={() => {
                        showModal({
                            title: "详情",
                            width: "50%",
                            content: (<Descriptions size={"small"} column={2}>
                                <Descriptions.Item label={"作者"} span={2}>{i.Author}</Descriptions.Item>
                                <Descriptions.Item label={"帮助"} span={2}>{i.Help}</Descriptions.Item>
                            </Descriptions>)
                        })
                    }}><QuestionCircleOutlined/></a>
                    {/*{script.Author && <div title={script.Author}>*/}
                    {/*    <a href={"#"}>*/}
                    {/*        <UserOutlined/>*/}
                    {/*    </a>*/}
                    {/*</div>}*/}
                    <Popconfirm
                        disabled={!p.onSendToPatch}
                        title={"发送到【热加载】中调试代码？"}
                        onConfirm={() => {
                            if (!script.Content) {
                                warn("暂无数据")
                                return
                            }
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
                </OneLine>
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
