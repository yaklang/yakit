import React, {useEffect, useState} from "react";
import {showModal} from "./showModal";
import {Button, Form, Spin} from "antd";
import {InputItem} from "./inputUtil";

export interface ConfigSystemProxyProp {

}

const {ipcRenderer} = window.require("electron");

export const ConfigSystemProxy: React.FC<ConfigSystemProxyProp> = (props) => {
    const [proxy, setProxy] = useState();
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        ipcRenderer.invoke("GetSystemProxy", {}).then((req: { Proxy: string }) => {
            console.info(req)
        })
    }, [])

    if (loading) {
        return <Spin tip={"加载中"}/>
    }

    return <Form onSubmitCapture={e => {
        e.preventDefault()

        alert(1)
    }}>
        <InputItem label={"当前代理"}/>
        <Form.Item colon={false} label={" "}>
            <Button type="primary" htmlType="submit"> 配置代理 </Button>
        </Form.Item>
    </Form>
};

export const showConfigSystemProxyForm = () => {
    showModal({
        title: "配置系统代理",
        width: 800,
        content: (
            <>
                <ConfigSystemProxy/>
            </>
        )
    })
}