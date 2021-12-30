import React, {useEffect, useState} from "react";
import {Alert, Button, PageHeader, Row, Space} from "antd";
import {CopyableField} from "../../utils/inputUtil";
import {StartFacadeServerForm, StartFacadeServerParams} from "./StartFacadeServerForm";
import {randomString} from "../../utils/randomUtil";
import {failed, info} from "../../utils/notification";
import {ExecResultLog} from "../invoker/batch/ExecMessageViewer";
import {ExecResult} from "../invoker/schema";
import {ExtractExecResultMessage} from "../../components/yakitLogSchema";
import {useGetState, useLatest} from "ahooks";
import {ReverseNotificationTable} from "./ReverseNotificationTable";

export interface ReverseServerPageProp {

}

export interface ReverseNotification {
    uuid: string
    type: string,
    remote_addr: string
    raw?: Uint8Array
    token?: string
    timestamp?: number
}

const {ipcRenderer} = window.require("electron");

export const ReverseServerPage: React.FC<ReverseServerPageProp> = (props) => {
    const [bridge, setBridge] = useState(false);
    const [params, setParams] = useState<StartFacadeServerParams>({
        ConnectParam: {
            Addr: "", Secret: "",
        },
        DNSLogLocalPort: 53,
        DNSLogRemotePort: 0,
        EnableDNSLogServer: false,
        ExternalDomain: "",
        FacadeRemotePort: 0,
        LocalFacadeHost: "0.0.0.0",
        LocalFacadePort: 4434,
        Verify: false
    });
    const [token, _] = useState(randomString(40));
    const [loading, setLoading] = useState(false);
    const [logs, setLogs, getLogs] = useGetState<ReverseNotification[]>([]);
    const [reverseToken, setReverseToken] = useState(randomString(20));

    useEffect(() => {
        const messages: ReverseNotification[] = [];
        ipcRenderer.on(`${token}-data`, (_, data: ExecResult) => {
            if (!data.IsMessage) {
                return
            }
            try {
                const message = ExtractExecResultMessage(data) as ExecResultLog;
                const obj = JSON.parse(message.data) as ReverseNotification;
                obj.timestamp = message.timestamp;
                messages.unshift(obj)
                if (messages.length > 100) {
                    messages.pop()
                }
            } catch (e) {

            }

        })
        ipcRenderer.on(`${token}-error`, (data: any) => {
        })
        ipcRenderer.on(`${token}-end`, () => {
            setLoading(false)
        })

        const id = setInterval(() => {
            if (getLogs().length !== messages.length || getLogs().length === 0) {
                setLogs([...messages])
                return
            }

            if (messages.length <= 0) {
                return
            }

            if (messages.length > 0) {
                if (messages[0].uuid !== getLogs()[0].uuid) {
                    setLogs([...messages])
                }
            }
        }, 500)
        return () => {
            clearInterval(id)
            ipcRenderer.removeAllListeners(`${token}-end`);
            ipcRenderer.removeAllListeners(`${token}-error`);
            ipcRenderer.removeAllListeners(`${token}-data`);
        }
    }, [token])

    return <div>
        <PageHeader
            title={"反连服务器"}
            subTitle={"使用协议端口复用技术，同时在一个端口同时实现 HTTP / RMI / HTTPS 等协议的反连"}
            extra={<>
                <Space>
                    {loading && <Button
                        danger={true} type={"primary"}
                        onClick={() => {
                            ipcRenderer.invoke("cancel-StartFacades", token)
                        }}
                    >关闭反连</Button>}
                </Space>
            </>}
        >
            {loading && <Alert
                type={"info"}
                message={<Space direction={"vertical"}>
                    <Space>
                        本地 RMI 反连 <CopyableField
                        text={`rmi://127.0.0.1:${params.LocalFacadePort}/${reverseToken}`}/>
                    </Space>
                    <Space>
                        本地 HTTP 反连 <CopyableField
                        text={`http://127.0.0.1:${params.LocalFacadePort}/${reverseToken}`}/>
                    </Space>
                    <Space>
                        本地 HTTPS 反连 <CopyableField
                        text={`https://127.0.0.1:${params.LocalFacadePort}/${reverseToken}`}/>
                    </Space>
                </Space>}>
            </Alert>}
        </PageHeader>
        <Row>
            <div style={{width: "100%"}}>
                {loading ? <>
                    <ReverseNotificationTable loading={loading} logs={logs}/>
                </> : <StartFacadeServerForm params={params} setParams={setParams} onSubmit={() => {
                    ipcRenderer.invoke("StartFacades", params, token).then(() => {
                        info("开始启动反连服务器")
                        setLoading(true)
                    })
                }}/>}
            </div>
        </Row>
    </div>
};