import React, {useEffect, useState} from "react";
import {Button, Form} from "antd";
import {InputInteger, InputItem, SwitchItem} from "../../utils/inputUtil";

export interface GetTunnelServerExternalIPParams {
    Addr: string
    Secret: string
}

export interface StartFacadeServerParams {
    LocalFacadeHost: string
    LocalFacadePort: number

    EnableDNSLogServer: boolean
    DNSLogLocalPort: number

    // bridge
    ConnectParam?: GetTunnelServerExternalIPParams
    Verify?: boolean

    // remote
    FacadeRemotePort: number
    DNSLogRemotePort: number
    ExternalDomain: string
}

export interface StartFacadeServerFormProp {
    params: StartFacadeServerParams
    setParams: (p: StartFacadeServerParams) => any
    onSubmit: () => any
}

export const StartFacadeServerForm: React.FC<StartFacadeServerFormProp> = (props) => {
    const [remoteMode, setRemoteMode] = useState(false);
    const {params, setParams} = props;

    return <div>
        <Form
            layout={"horizontal"} labelCol={{span: 4}} wrapperCol={{span: 18}}
            onSubmitCapture={e => {
                e.preventDefault()
                props.onSubmit();
            }}
        >
            <InputItem
                label={"反连服务器地址"}
                setValue={LocalFacadeHost => setParams({...params, LocalFacadeHost})}
                value={params.LocalFacadeHost}
                autoComplete={[
                    "0.0.0.0", "127.0.0.1",
                ]}
            />
            <InputInteger
                label={"反连服务器端口"}
                setValue={LocalFacadePort => setParams({...params, LocalFacadePort})} value={params.LocalFacadePort}
            />
            <SwitchItem label={"远程端口镜像"} setValue={setRemoteMode} value={remoteMode}/>
            {remoteMode && <>
                <InputItem label={"远程 Bridge 地址"}/>
                <InputItem label={"映射端口"}/>
            </>}
            <Form.Item colon={false} label={" "}>
                <Button type="primary" htmlType="submit"> 启动反连服务器 </Button>
            </Form.Item>
        </Form>
    </div>
};