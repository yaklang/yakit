import React, {Ref, useEffect, useState} from "react";
import {
    Alert,
    Button,
    Checkbox,
    Col,
    Form,
    Modal,
    notification,
    PageHeader,
    Row,
    Space,
    Spin,
    Tag,
    Tooltip,
    Typography
} from "antd";
import {failed, info, success} from "../../utils/notification";
import {CheckOutlined, CopyOutlined, PoweroffOutlined, ReloadOutlined} from "@ant-design/icons";
import {HTTPPacketEditor, YakEditor} from "../../utils/editors";
import {MITMFilters, MITMFilterSchema} from "./MITMFilters";
import {showDrawer, showModal} from "../../utils/showModal";
import {MITMHTTPFlowMiniTableCard} from "./MITMHTTPFlowMiniTableCard";
import {ExecResult} from "../invoker/schema";
import {ExecResultLog} from "../invoker/batch/ExecMessageViewer";
import {ExtractExecResultMessage} from "../../components/yakitLogSchema";
import {YakExecutorParam} from "../invoker/YakExecutorParams";
import "./MITMPage.css";
import {CopyableField, SelectOne} from "../../utils/inputUtil";
import {useGetState, useLatest, useMemoizedFn} from "ahooks";
import {StatusCardProps} from "../yakitStore/viewers/base";
import {useHotkeys} from "react-hotkeys-hook";
import * as monaco from 'monaco-editor';
import CopyToClipboard from "react-copy-to-clipboard";
import {AutoCard} from "../../components/AutoCard";
import {ResizeBox} from "../../components/ResizeBox";
import {MITMPluginLogViewer} from "./MITMPluginLogViewer";
import {MITMPluginList} from "./MITMPluginList";
import {saveABSFileToOpen} from "../../utils/openWebsite";
import {MITMContentReplacer, MITMContentReplacerRule} from "./MITMContentReplacer";
import {ChromeLauncherButton} from "./MITMChromeLauncher";
import {MITMServerStartForm} from "@/pages/mitm/MITMServerStartForm";
import {MITMServerHijacking} from "@/pages/mitm/MITMServerHijacking";

const {Text} = Typography;
const {Item} = Form;
const {ipcRenderer} = window.require("electron");

export interface MITMPageProp {
}

export interface MITMResponse extends MITMFilterSchema {
    isHttps: boolean,
    request: Uint8Array,
    url: string,
    id: number

    forResponse?: boolean
    response?: Uint8Array
    responseId?: number

    justContentReplacer?: boolean
    replacers?: MITMContentReplacerRule[]
}

export const enableMITMPluginMode = (initPluginNames?: string[]) => {
    return ipcRenderer.invoke("mitm-enable-plugin-mode", initPluginNames)
}

export const CONST_DEFAULT_ENABLE_INITIAL_PLUGIN = "CONST_DEFAULT_ENABLE_INITIAL_PLUGIN";

export const MITMPage: React.FC<MITMPageProp> = (props) => {
    // 整体的劫持状态
    const [status, setStatus] = useState<"idle" | "hijacked" | "hijacking">("idle");

    const [loading, setLoading] = useState(false);

    // 通过启动表单的内容
    const [addr, setAddr] = useState("")
    const [host, setHost] = useState("127.0.0.1");
    const [port, setPort] = useState(8083);

    // 检测当前劫持状态
    useEffect(() => {
        // 用于启动 MITM 开始之后，接受开始成功之后的第一个消息，如果收到，则认为说 MITM 启动成功了
        ipcRenderer.on("client-mitm-start-success", () => {
            setStatus("hijacking")
            setTimeout(() => {
                setLoading(false)
            }, 300)
        })
        return () => {
            ipcRenderer.removeAllListeners("client-mitm-start-success")
        }
    }, [])

    // 通过 gRPC 调用，启动 MITM 劫持
    const startMITMServer = useMemoizedFn((targetHost, targetPort, downstreamProxy) => {
        setLoading(true)
        return ipcRenderer.invoke("mitm-start-call", targetHost, targetPort, downstreamProxy).catch((e: any) => {
            notification["error"]({message: `启动中间人劫持失败：${e}`})
        })
    })

    // 设置开始服务器处理函数
    const startMITMServerHandler = useMemoizedFn((host, port, downstreamProxy, enableInitialPlugin, plugins) => {
        setAddr(`https://${host}:${port}`)
        setHost(host)
        setPort(port)
        setLoading(true)
        startMITMServer(host, port, downstreamProxy)
    })

    // 开始渲染组件
    // if (!initialed) {
    //     return <div style={{textAlign: "center", paddingTop: 120}}>
    //         <Spin spinning={true} tip={"正在初始化 MITM"}/>
    //     </div>
    // }

    // 在没有开始的时候，渲染任务表单
    if (status === "idle") {
        return <MITMServerStartForm onStartMITMServer={startMITMServerHandler}/>
    }

    return <MITMServerHijacking
        port={port}
        addr={addr}
        host={host}
        status={status}
        setStatus={setStatus}
    />

    // return <div style={{height: "100%", width: "100%"}}>
    //     {(() => {
    //         switch (status) {
    //             case "idle":
    //                 return <Spin spinning={loading}>
    //                     <Form
    //                         style={{marginTop: 40}}
    //                         onSubmitCapture={e => {
    //                             e.preventDefault()
    //                             start()
    //                             handleAutoForward("log");
    //
    //                             if (enableInitialPlugin) {
    //                                 enableMITMPluginMode(defaultPlugins).then(() => {
    //                                     info("被动扫描插件模式已启动")
    //                                 })
    //                             }
    //                         }}
    //                         layout={"horizontal"} labelCol={{span: 7}}
    //                         wrapperCol={{span: 13}}
    //                     >
    //                         <Item label={"劫持代理监听主机"}>
    //                             <Input value={host} onChange={e => setHost(e.target.value)}/>
    //                         </Item>
    //                         <Item label={"劫持代理监听端口"}>
    //                             <InputNumber value={port} onChange={e => setPort(e)}/>
    //                         </Item>
    //                         <Item label={"选择插件"} colon={true}>
    //                             <div style={{height: 200, maxWidth: 420}}>
    //                                 <SimplePluginList
    //                                     disabled={!enableInitialPlugin}
    //                                     bordered={true}
    //                                     initialSelected={defaultPlugins}
    //                                     onSelected={(list: string[]) => {
    //                                         setDefaultPlugins(list)
    //                                     }} pluginTypes={"mitm,port-scan"}
    //                                     verbose={<div>MITM 与 端口扫描插件</div>}/>
    //                             </div>
    //                         </Item>
    //                         <Item label={"下游代理"} help={"为经过该 MITM 代理的请求再设置一个代理，通常用于访问中国大陆无法访问的网站或访问特殊网络/内网，也可用于接入被动扫描"}>
    //                             <Input value={downstreamProxy} onChange={e => setDownstreamProxy(e.target.value)}/>
    //                         </Item>
    //                         <Item label={"内容规则"} help={"使用规则进行匹配、替换、标记、染色，同时配置生效位置"}>
    //                             <Space>
    //                                 <Button
    //                                     onClick={() => {
    //                                         let m = showDrawer({
    //                                             placement: "top", height: "50%",
    //                                             content: (
    //                                                 <MITMContentReplacerViewer/>
    //                                             ),
    //                                             maskClosable: false,
    //                                         })
    //                                     }}
    //                                 >已有规则</Button>
    //                                 <Button type={"link"} onClick={() => {
    //                                     const m = showModal({
    //                                         title: "从 JSON 中导入",
    //                                         width: "60%",
    //                                         content: (
    //                                             <>
    //                                                 <MITMContentReplacerImport onClosed={() => {
    //                                                     m.destroy()
    //                                                 }}/>
    //                                             </>
    //                                         )
    //                                     })
    //                                 }}>从 JSON 导入</Button>
    //                                 <Button type={"link"} onClick={() => {
    //                                     showModal({
    //                                         title: "导出配置 JSON",
    //                                         width: "50%",
    //                                         content: (
    //                                             <>
    //                                                 <MITMContentReplacerExport/>
    //                                             </>
    //                                         )
    //                                     })
    //                                 }}>导出为 JSON</Button>
    //                             </Space>
    //                         </Item>
    //                         <Item label={" "} colon={false}>
    //                             <Space>
    //                                 <Button type={"primary"} htmlType={"submit"}>
    //                                     劫持启动
    //                                 </Button>
    //                                 <Divider type={"vertical"}/>
    //                                 <Checkbox
    //                                     checked={enableInitialPlugin}
    //                                     onChange={node => {
    //                                         const e = node.target.checked;
    //                                         setEnableInitialPlugin(e)
    //                                         if (e) {
    //                                             saveValue(CONST_DEFAULT_ENABLE_INITIAL_PLUGIN, "true")
    //                                         } else {
    //                                             saveValue(CONST_DEFAULT_ENABLE_INITIAL_PLUGIN, "")
    //                                         }
    //                                     }}
    //                                 >
    //                                     插件自动加载
    //                                 </Checkbox>
    //                             </Space>
    //                         </Item>
    //                     </Form>
    //                 </Spin>
    //             case "hijacking":
    //             case "hijacked":
    //                 return
    //             default:
    //                 return <div/>
    //         }
    //     })()}
    // </div>
};