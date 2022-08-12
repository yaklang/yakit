import React, {useEffect, useState} from "react";
import {Button, Form} from "antd";
import {InputInteger} from "@/utils/inputUtil";
import {failed, info} from "@/utils/notification";
import {ExecResult} from "@/pages/invoker/schema";

export interface PacketScanFormProp {
    token: string
    httpFlowIds?: number[]
    plugins: string[]
    https?: boolean
    httpRequest?: Uint8Array
}

export interface ExecPacketScanRequest {
    HTTPFlow: number[]
    HTTPRequest?: Uint8Array
    HTTPS: boolean
    AllowFuzzTag?: boolean
    TotalTimeoutSeconds?: number
    Timeout?: number
    PluginConcurrent?: number
    PacketConcurrent?: number
    PluginList: string[]
    Proxy?: string
}

function defaultPacketScanRequestParams(): ExecPacketScanRequest {
    return {
        HTTPFlow: [],
        HTTPRequest: new Uint8Array(),
        HTTPS: false,
        AllowFuzzTag: false,
        TotalTimeoutSeconds: 300,
        Timeout: 10,
        PacketConcurrent: 10,
        PluginConcurrent: 10,
        PluginList: [] as string[],
        Proxy: ""
    }
}

const {ipcRenderer} = window.require("electron");

export const PacketScanForm: React.FC<PacketScanFormProp> = (props) => {
    const [params, setParams] = useState(defaultPacketScanRequestParams());
    const [loading, setLoading] = useState(false);

    const {token, httpFlowIds, plugins, https, httpRequest} = props;

    useEffect(() => {
        if (!token) {
            return
        }
        ipcRenderer.on(`${token}-end`, (e, data) => {
            info("[ExecPacketScan] finished")
            setLoading(false)
        })
        return () => {
            ipcRenderer.invoke("cancel-ExecPacketScan", token)
            ipcRenderer.removeAllListeners(`${token}-end`)
        }
    }, [token])

    return <Form onSubmitCapture={e => {
        e.preventDefault()

        if (plugins.length < 0) {
            info("未选择插件无法进行扫描")
            return
        }

        setLoading(true)
        ipcRenderer.invoke("ExecPacketScan", {
            ...params,
            HTTPFlow: httpFlowIds,
            HTTPS: https,
            HTTPRequest: httpRequest,
            PluginList: plugins
        } as ExecPacketScanRequest, token).then(() => {
            info("开始扫描数据包")
        })
    }} layout={"horizontal"}>
        <Form.Item style={{marginBottom: 4}}>
            {loading && <Button type={"primary"} danger={true} onClick={() => {
                ipcRenderer.invoke("cancel-ExecPacketScan", token)
            }}>停止任务</Button>}
            {!loading && <Button type="primary" htmlType="submit"> 提交数据包扫描任务 </Button>}
        </Form.Item>

        <InputInteger
            label={"设置请求超时时间"}
            setValue={Timeout => setParams({...params, Timeout})} value={params.Timeout}
        />
        <InputInteger
            label={"设置请求超时时间"}
            setValue={TotalTimeoutSeconds => setParams({...params, TotalTimeoutSeconds})}
            value={params.TotalTimeoutSeconds}
        />

    </Form>
};