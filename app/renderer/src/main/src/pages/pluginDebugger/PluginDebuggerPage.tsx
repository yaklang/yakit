import React, {useState} from "react";
import {AutoCard} from "@/components/AutoCard";
import {YakitResizeBox} from "@/components/yakitUI/YakitResizeBox/YakitResizeBox";
import {Space, Tag} from "antd";
import {YakEditor} from "@/utils/editors";
import {
    getDefaultHTTPRequestBuilderParams,
    HTTPRequestBuilder,
    HTTPRequestBuilderParams
} from "@/pages/httpRequestBuilder/HTTPRequestBuilder";
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton";
import {debugYakitModal, showYakitModal} from "@/components/yakitUI/YakitModal/YakitModalConfirm";
import {showYakitDrawer} from "@/components/yakitUI/YakitDrawer/YakitDrawer";
import {YakFilterModuleList} from "@/pages/yakitStore/YakitStorePage";
import {PluginList} from "@/components/PluginList";
import {SimplePluginList} from "@/components/SimplePluginList";
import {YakScript} from "@/pages/invoker/schema";
import {failed, info} from "@/utils/notification";
import {YakitPopconfirm} from "@/components/yakitUI/YakitPopconfirm/YakitPopconfirm";
import {PluginDebuggerExec} from "@/pages/pluginDebugger/PluginDebuggerExec";
import {execSmokingEvaluateCode} from "@/pages/pluginDebugger/SmokingEvaluate";

export interface PluginDebuggerPageProp {

}

const {ipcRenderer} = window.require("electron");

export const PluginDebuggerPage: React.FC<PluginDebuggerPageProp> = (props) => {
    const [builder, setBuilder] = useState<HTTPRequestBuilderParams>(getDefaultHTTPRequestBuilderParams())
    const [targets, setTargets] = useState("");
    const [code, setCode] = useState("");
    const [originCode, setOriginCode] = useState("");
    const [pluginType, setPluginType] = useState<"port-scan" | "mitm" | "nuclei">("port-scan");
    const [currentPluginName, setCurrentPluginName] = useState("");

    const [operator, setOperator] = useState<{start: ()=>any, cancel: ()=>any}>();
    const [pluginExecuting, setPluginExecuting] = useState(false);

    return <div style={{width: "100%", height: "100%"}}>
        <AutoCard
            size={"small"} bordered={true}
            bodyStyle={{padding: 0, overflow: "hidden"}}
        >
            <YakitResizeBox
                firstNode={<AutoCard
                    size={"small"} bordered={false} bodyStyle={{padding: 0}}
                    title={"配置调试请求"}
                    extra={<Space>
                        <YakitButton onClick={() => {
                            ipcRenderer.invoke("HTTPRequestBuilder", builder).then((rsp) => {
                                debugYakitModal(rsp)
                            })
                        }} type={"outline1"}>查看发送请求</YakitButton>
                        {!pluginExecuting && <YakitButton onClick={() => {
                            if (operator?.start) {
                                operator.start()
                            }else{
                                failed("初始化调试失败")
                            }
                        }}>执行插件</YakitButton>}
                        {pluginExecuting && <YakitButton onClick={() => {
                            if (operator?.cancel) {
                                operator.cancel()
                            }
                        }} danger={true} type={"danger"}>停止执行</YakitButton>}
                    </Space>}
                >
                    <Space direction={"vertical"} style={{width: "100%"}}>
                        <YakEditor
                            noLineNumber={true} noMiniMap={true} type={"html"}
                            value={targets} setValue={setTargets}
                        />
                        <div>
                            <HTTPRequestBuilder
                                value={builder}
                                setValue={setBuilder}
                            />
                        </div>
                    </Space>
                </AutoCard>}
                firstMinSize={300}
                firstRatio={"450px"}
                secondNode={<AutoCard
                    size={"small"} bordered={true} title={<Space>
                    <div>插件代码配置</div>
                    {code !== "" && <Tag color={"purple"}>{pluginType.toUpperCase()}</Tag>}
                    {code !== "" && <Tag color={"orange"}>{currentPluginName}</Tag>}
                </Space>}
                    bodyStyle={{overflow: "hidden", padding: 0}}
                    extra={[
                        <Space>
                            <YakitPopconfirm
                                title={"执行自动打分评估？"}
                                onConfirm={()=>{
                                    execSmokingEvaluateCode(pluginType, code)
                                }}
                            >
                                <YakitButton type={"outline2"}>自动打分评估</YakitButton>
                            </YakitPopconfirm>
                            <YakitPopconfirm title={"对比合并到本地插件？"}>
                                <YakitButton>对比合并到插件</YakitButton>
                            </YakitPopconfirm>
                            <YakitButton
                                type={"outline1"}
                                onClick={() => {
                                    showYakitDrawer({
                                        title: "选择要调试的插件",
                                        width: "30%",
                                        content: (
                                            <div style={{height: "100%"}}>
                                                <SimplePluginList
                                                    autoSelectAll={false}
                                                    pluginTypes={"port-scan,mitm,nuclei"}
                                                    singleSelectMode={true}
                                                    onPluginClick={(script: YakScript)=>{
                                                        switch (script.Type) {
                                                            case "mitm":
                                                            case "nuclei":
                                                            // @ts-ignore
                                                            case "port-scan":
                                                                setPluginType(script.Type as any)
                                                                setCode(script.Content)
                                                                setOriginCode(script.Content)
                                                                setCurrentPluginName(script.ScriptName)
                                                                return
                                                            default:
                                                                failed("暂不支持的插件类型")
                                                        }
                                                    }}
                                                />
                                            </div>
                                        )
                                    })
                                }}
                            >设置调试插件</YakitButton>
                        </Space>
                    ]}
                >
                    <YakitResizeBox
                        isVer={true}
                        firstNode={<div style={{height: "100%"}}>
                            <YakEditor
                                noMiniMap={true} type={pluginType === "nuclei" ? "yaml" : "yak"}
                                value={code} setValue={setCode}
                            />
                        </div>}
                        secondNode={<PluginDebuggerExec
                            pluginType={pluginType}
                            builder={builder} code={code} targets={targets}
                            onOperator={(obj) => {
                                info("初始化插件调试成功")
                                setOperator(obj)
                            }}
                            onExecuting={result => {
                                setPluginExecuting(result)
                            }}
                        />}
                    />
                </AutoCard>}
            />
        </AutoCard>
    </div>
};