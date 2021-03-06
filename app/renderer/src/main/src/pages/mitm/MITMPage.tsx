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

export const CONST_DEFAULT_ENABLE_INITIAL_PLUGIN = "CONST_DEFAULT_ENABLE_INITIAL_PLUGIN";

export const MITMPage: React.FC<MITMPageProp> = (props) => {
    // ?????????????????????
    const [status, setStatus] = useState<"idle" | "hijacked" | "hijacking">("idle");

    const [loading, setLoading] = useState(false);

    // ???????????????????????????
    const [addr, setAddr] = useState("");
    const [host, setHost] = useState("127.0.0.1");
    const [port, setPort] = useState(8083);
    const [enableInitialMITMPlugin, setEnableInitialMITMPlugin] = useState(false);
    const [defaultPlugins, setDefaultPlugins] = useState<string[]>([]);

    // ????????????????????????
    useEffect(() => {
        // ???????????? MITM ??????????????????????????????????????????????????????????????????????????????????????? MITM ???????????????
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

    // ?????? gRPC ??????????????? MITM ??????
    const startMITMServer = useMemoizedFn((targetHost, targetPort, downstreamProxy) => {
        setLoading(true)
        return ipcRenderer.invoke("mitm-start-call", targetHost, targetPort, downstreamProxy).catch((e: any) => {
            notification["error"]({message: `??????????????????????????????${e}`})
        })
    })

    // ?????????????????????????????????
    const startMITMServerHandler = useMemoizedFn((host, port, downstreamProxy, enableInitialPlugin, plugins) => {
        setAddr(`https://${host}:${port}`)
        setHost(host)
        setPort(port)
        setLoading(true)
        setDefaultPlugins(plugins)
        setEnableInitialMITMPlugin(enableInitialPlugin)
        startMITMServer(host, port, downstreamProxy)
    })

    // ??????????????????
    // if (!initialed) {
    //     return <div style={{textAlign: "center", paddingTop: 120}}>
    //         <Spin spinning={true} tip={"??????????????? MITM"}/>
    //     </div>
    // }

    // ?????????????????????????????????????????????
    if (status === "idle") {
        return <MITMServerStartForm onStartMITMServer={startMITMServerHandler}/>
    }

    return <MITMServerHijacking
        port={port}
        addr={addr}
        host={host}
        status={status}
        setStatus={setStatus}
        defaultPlugins={defaultPlugins}
        enableInitialMITMPlugin={enableInitialMITMPlugin}
    />
};