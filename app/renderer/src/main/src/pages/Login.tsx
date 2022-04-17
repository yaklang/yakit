import React, {ReactNode, useEffect, useRef, useState} from "react"
import {Button, Modal, Space} from "antd"
import {GithubOutlined, QqOutlined, WechatOutlined} from "@ant-design/icons"

import "./Login.css"

const {ipcRenderer} = window.require("electron")

export interface LoginProp {
    visible: boolean
    onCancel: () => any
}

const Login: React.FC<LoginProp> = (props) => {
    const [loading, setLoading] = useState<boolean>(false)
    const [loginShow, setLoginShow] = useState<boolean>(false)

    const divrefs = useRef(null)

    const fetchLogin = (type: string) => {
        ipcRenderer.invoke("is-dev", {source: type}).then((flag) => {
            setLoginShow(true)
            const url = "https://www.baidu.com"
            const webview: any = document.createElement("webview")
            webview.src = url
            webview.style.height = "100%"
            if (!divrefs || !divrefs.current) return
            const body = divrefs.current as unknown as HTMLDivElement
            body.innerHTML = ""
            body.appendChild(webview)
        })
    }

    useEffect(() => {
        if (!loginShow) {
            if (!divrefs || !divrefs.current) return
            const body = divrefs.current as unknown as HTMLDivElement
            body.innerHTML = ""
        }
    }, [loginShow])

    return (
        <Modal
            title={"登录"}
            visible={props.visible}
            maskClosable={false}
            footer={null}
            onCancel={() => {
                setLoginShow(false)
                props.onCancel()
            }}
        >
            {loginShow ? (
                <div className='login-wrap' ref={divrefs}></div>
            ) : (
                <div>
                    <span>第三方帐号登录方式</span>
                    <div
                        style={{
                            width: "100%",
                            fontSize: 60,
                            margin: "20px 0",
                            display: "flex",
                            justifyContent: "space-around"
                        }}
                    >
                        <GithubOutlined className='login-icon' onClick={() => fetchLogin("github")} />
                        <WechatOutlined className='login-icon' onClick={() => fetchLogin("wechat")} />
                        <QqOutlined className='login-icon' onClick={() => fetchLogin("qq")} />
                    </div>
                </div>
            )}
        </Modal>
    )
}

export default Login
