import React, {useEffect, useState} from "react"
import {Modal} from "antd"
import {GithubOutlined, QqOutlined, RightOutlined, WechatOutlined} from "@ant-design/icons"
import {AutoSpin} from "@/components/AutoSpin"
import {failed, warn} from "@/utils/notification"

import "./Login.scss"
import {NetWorkApi} from "@/services/fetch"
import {API} from "@/services/swagger/resposeType"
import {randomString} from "@/utils/randomUtil"

const {ipcRenderer} = window.require("electron")

export interface LoginProp {
    visible: boolean
    onCancel: () => any
}

interface LoginParamsProp {
    source: string
}

interface DownloadOnlinePluginAllRequestProps {
    isAddToken: boolean
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
    const [taskToken, setTaskToken] = useState(randomString(40))
    // 全局监听登录状态
    useEffect(() => {
        ipcRenderer.on("fetch-signin-data", (e, res: any) => {
            const {ok, info} = res
            if (ok) {
                ipcRenderer
                    .invoke(
                        "DownloadOnlinePluginAll",
                        {isAddToken: true} as DownloadOnlinePluginAllRequestProps,
                        taskToken
                    )
                    .then(() => {
                        console.log("拉取全部插件")
                    })
                    .catch((e) => {
                        failed(`拉取全部插件失败:${e}`)
                    })
                setTimeout(() => setLoading(false), 200)
                props.onCancel()
            } else failed(info || "请求异常，请重试！")
        })
        return () => {
            ipcRenderer.removeAllListeners("fetch-signin-data")
        }
    }, [])

    return (
        <Modal
            visible={props.visible}
            closable={false}
            footer={null}
            onCancel={() => props.onCancel()}
            bodyStyle={{padding: 0}}
            width={409}
            style={{top: "25%"}}
        >
            <AutoSpin spinning={loading}>
                <div className='login-type-body'>
                    <h2 className='login-text'>登录</h2>
                    <div className='login-icon-body'>
                        <div className='login-icon' onClick={() => fetchLogin("github")}>
                            <div className='login-icon-text'>
                                <GithubOutlined className='type-icon' />
                                使用 GitHub 账号登录
                            </div>
                            <RightOutlined className='icon-right' />
                        </div>
                        <div className='login-icon' onClick={() => fetchLogin("wechat")}>
                            <div className='login-icon-text'>
                                <WechatOutlined className='type-icon icon-wx' />
                                使用微信账号登录
                            </div>
                            <RightOutlined className='icon-right' />
                        </div>
                    </div>
                </div>
            </AutoSpin>
        </Modal>
    )
}

export default Login
