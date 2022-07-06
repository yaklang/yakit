import React, {useEffect, useState} from "react"
import {Modal} from "antd"
import {GithubOutlined, QqOutlined, WechatOutlined} from "@ant-design/icons"
import {AutoSpin} from "@/components/AutoSpin"
import {failed, warn} from "@/utils/notification"

import "./Login.scss"
import {NetWorkApi} from "@/services/fetch"
import {API} from "@/services/swagger/resposeType"

const {ipcRenderer} = window.require("electron")

export interface LoginProp {
    visible: boolean
    onCancel: () => any
}

interface LoginParamsProp {
    source: string
}

const Login: React.FC<LoginProp> = (props) => {
    const [loading, setLoading] = useState<boolean>(false)

    const fetchLogin = (type: string) => {
        setLoading(true)
        NetWorkApi<LoginParamsProp, string>({
            method: "get",
            url: "auth/from",
            params: {
                source: type
            }
        })
            .then((res) => {
                if (res) ipcRenderer.send("user-sign-in", {url: res, type: type})
            })
            .catch((err) => {
                warn("请求超时，请重新操作")
            })
            .finally(() => {
                setTimeout(() => setLoading(false), 200)
            })
    }

    // 全局监听登录状态
    useEffect(() => {
        ipcRenderer.on("fetch-signin-data", (e, res: any) => {
            const {ok, info} = res
            if (ok) props.onCancel()
            else failed(info || "请求异常，请重试！")
        })
        return () => ipcRenderer.removeAllListeners("fetch-signin-data")
    }, [])

    return (
        <Modal visible={props.visible} closable={false} footer={null} onCancel={() => props.onCancel()}>
            <AutoSpin spinning={loading}>
                <div className='login-type-body'>
                    <h2>登录</h2>
                    <div className='login-subtitle'>第三方帐号登录方式</div>
                    <div className='login-type-icon'>
                        <GithubOutlined className='type-icon' onClick={() => fetchLogin("github")} />
                        <WechatOutlined className='type-icon' onClick={() => fetchLogin("wechat")} />
                        {/* <QqOutlined className='type-icon' onClick={() => fetchLogin("qq")} /> */}
                    </div>
                </div>
            </AutoSpin>
        </Modal>
    )
}

export default Login
