import React, {useEffect, useState, useLayoutEffect} from "react"
import {Modal} from "antd"
import {ExclamationCircleOutlined, GithubOutlined, RightOutlined, WechatOutlined} from "@ant-design/icons"
import {AutoSpin} from "@/components/AutoSpin"
import {failed} from "@/utils/notification"
import "./Login.scss"
import {NetWorkApi} from "@/services/fetch"
import {ConfigPrivateDomain} from "@/components/ConfigPrivateDomain/ConfigPrivateDomain"
import {showModal} from "../utils/showModal"
import {isEnterpriseEdition} from "@/utils/envfile"
import {apiDownloadPluginMine} from "./plugins/utils"
import { YakitModalConfirm } from "@/components/yakitUI/YakitModal/YakitModalConfirm"
import { YakitSpin } from "@/components/yakitUI/YakitSpin/YakitSpin"
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
    // 打开企业登录面板
    const openEnterpriseModal = () => {
        props.onCancel()
        const m = showModal({
            title: "",
            centered: true,
            content: <ConfigPrivateDomain onClose={() => m.destroy()} enterpriseLogin={true} />
        })
        return m
    }
    {
        /* 屏蔽企业登录选择 将登录直接替换为企业登录 */
    }
    useLayoutEffect(() => {
        if (isEnterpriseEdition()) {
            openEnterpriseModal()
        }
    }, [])
    const fetchLogin = (type: string) => {
        setLoading(true)
        if (type === "login") {
            openEnterpriseModal()
        } else {
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
                    failed("登录错误:" + err)
                })
                .finally(() => {
                    setTimeout(() => setLoading(false), 200)
                })
        }
    }
    // 全局监听登录状态
    useEffect(() => {
        ipcRenderer.on("fetch-signin-data", (e, res: any) => {
            const {ok, info} = res
            if (ok) {
                const m = YakitModalConfirm({
                    type: "white",
                    title: "数据同步",
                    icon: <ExclamationCircleOutlined />,
                    content: "是否选择将远端的数据同步本地",
                    onOk() {
                        apiDownloadPluginMine()
                        setTimeout(() => setLoading(false), 200)
                        props.onCancel()
                        m.destroy()
                    },
                    onCancel() {
                        setTimeout(() => setLoading(false), 200)
                        props.onCancel()
                        m.destroy()
                    }
                })
            } else {
                failed(info)
                setTimeout(() => setLoading(false), 200)
                props.onCancel()
            }
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
            <YakitSpin spinning={loading}>
                <div className='login-type-body'>
                    <h2 className='login-text'>登录</h2>
                    <div className='login-icon-body'>
                        {/*<div className='login-icon' onClick={() => githubAuth()}>*/}
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
                        {/* <div className='login-icon' onClick={() => fetchLogin("login")}>
                            <div className='login-icon-text'>
                                <img src={yakitImg} className="type-icon type-icon-img"/>
                                企业登录
                            </div>
                            <RightOutlined className='icon-right' />
                        </div> */}
                    </div>
                </div>
            </YakitSpin>
        </Modal>
    )
}

export default Login
