import React, {useEffect, useRef, useState} from "react"
import {Modal} from "antd"
import {GithubOutlined, QqOutlined, WechatOutlined} from "@ant-design/icons"
import {AutoSpin} from "@/components/AutoSpin"

import "./Login.scss"

const {ipcRenderer} = window.require("electron")

export interface LoginProp {
    visible: boolean
    onCancel: () => any
}

const Login: React.FC<LoginProp> = (props) => {
    const [loading, setLoading] = useState<boolean>(false)
    const [loginShow, setLoginShow] = useState<boolean>(false)

    const divrefs = useRef(null)

    const createView = (url: string) => {
        const webview: any = document.createElement("webview")
        webview.src = url
        webview.style.height = "100%"
        if (!divrefs || !divrefs.current) return
        const body = divrefs.current as unknown as HTMLDivElement
        body.innerHTML = ""
        body.appendChild(webview)
    }

    const fetchLogin = (type: string) => {
        setLoading(true)
        ipcRenderer
            .invoke("fetch-login-url", {source: type})
            .then((res) => {
                setLoginShow(true)
                createView("https://www.baidu.com")
            })
            .catch((err) => {})
            .finally(() => setTimeout(() => setLoading(false), 300))
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
            visible={props.visible}
            closable={false}
            footer={null}
            onCancel={() => {
                setLoginShow(false)
                props.onCancel()
            }}
        >
            <AutoSpin spinning={loading}>
                {loginShow ? (
                    <div className='login-wrap' ref={divrefs}></div>
                ) : (
                    <div className='login-type-body'>
                        <h2>登录</h2>
                        <div className='login-subtitle'>第三方帐号登录方式</div>
                        <div className='login-type-icon'>
                            <GithubOutlined className='type-icon' onClick={() => fetchLogin("github")} />
                            <WechatOutlined className='type-icon' onClick={() => fetchLogin("wechat")} />
                            <QqOutlined className='type-icon' onClick={() => fetchLogin("qq")} />
                        </div>
                    </div>
                )}
            </AutoSpin>
        </Modal>
    )
}

export default Login
