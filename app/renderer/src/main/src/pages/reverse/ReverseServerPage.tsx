import React, {useEffect, useState} from "react";
import {Alert, PageHeader, Row, Space} from "antd";
import {CopyableField} from "../../utils/inputUtil";
import {StartFacadeServerForm, StartFacadeServerParams} from "./StartFacadeServerForm";
import {randomString} from "../../utils/randomUtil";
import {failed, info} from "../../utils/notification";

export interface ReverseServerPageProp {

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
        FacadeRemotePort: 4435,
        LocalFacadeHost: "0.0.0.0",
        LocalFacadePort: 4434,
        Verify: false
    });

    useEffect(() => {
        const token = randomString(40);
        ipcRenderer.invoke(`${token}-data`, (data: any) => {

        })
        ipcRenderer.invoke(`${token}-error`, (data: any) => {
            failed("error for start facade server")
        })
        ipcRenderer.invoke(`${token}-end`, (data: any) => {
            info("反连服务器已关闭")
        })
        return () => {
            ipcRenderer.removeAllListeners(`${token}-end`);
            ipcRenderer.removeAllListeners(`${token}-error`);
            ipcRenderer.removeAllListeners(`${token}-data`);
        }
    }, [])

    return <div>
        <PageHeader title={"反连服务器"} subTitle={"使用协议端口复用技术，同时在一个端口同时实现 HTTP/RMI/HTTPS 等协议的反连"}>
            <Alert type={"info"} message={<Space direction={"vertical"}>
                <CopyableField text={"rmi://${}"}/>
                <CopyableField text={"rmi://${}"}/>
                <CopyableField text={"rmi://${}"}/>
            </Space>}>

            </Alert>
        </PageHeader>
        <Row>
            <div style={{width: "100%"}}>
                <StartFacadeServerForm params={params} setParams={setParams} onSubmit={() => {

                }}/>
            </div>
        </Row>
    </div>
};