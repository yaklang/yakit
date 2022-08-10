import React, {useEffect, useState} from "react";
import {Button, Form} from "antd";
import {InputInteger} from "@/utils/inputUtil";
import {info} from "@/utils/notification";

export interface PacketScanFormProp {
    token: string
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
    const {token} = props;

    useEffect(() => {

    }, [])

    return <Form onSubmitCapture={e => {
        e.preventDefault()

        ipcRenderer.invoke("ExecPacketScan", {}, token).then(()=>{
            info("开始扫描数据包")
        })
    }} labelCol={{span: 5}} wrapperCol={{span: 14}}>
        <InputInteger
            label={"设置请求超时时间"}
            setValue={Timeout => setParams({...params, Timeout})} value={params.Timeout}
        />
        <InputInteger
            label={"设置请求超时时间"}
            setValue={TotalTimeoutSeconds => setParams({...params, TotalTimeoutSeconds})}
            value={params.TotalTimeoutSeconds}
        />
        <Form.Item colon={false} label={" "}>
            <Button type="primary" htmlType="submit"> 提交数据包扫描任务 </Button>
        </Form.Item>
    </Form>
};