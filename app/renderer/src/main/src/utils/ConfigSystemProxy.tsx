import React, {useEffect, useState} from "react"
import {showModal} from "./showModal"
import {Alert, Button, Form, Input, Space, Spin, Tag} from "antd"
import {InputItem, SwitchItem} from "./inputUtil"
import {useMemoizedFn} from "ahooks"
import {info} from "@/utils/notification"
import {ReloadOutlined} from "@ant-design/icons"
import {IsWindows} from "@/utils/basic"
import {showYakitModal} from "@/components/yakitUI/YakitModal/YakitModalConfirm"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitSwitch} from "@/components/yakitUI/YakitSwitch/YakitSwitch"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"

export interface ConfigSystemProxyProp {
    defaultProxy?: string
}

const {ipcRenderer} = window.require("electron")

export const ConfigSystemProxy: React.FC<ConfigSystemProxyProp> = (props) => {
    const [proxy, setProxy] = useState(props.defaultProxy ? props.defaultProxy : "127.0.0.1:8083")
    const [enable, setEnable] = useState(!!props.defaultProxy)
    const [loading, setLoading] = useState(false)
    const [current, setCurrent] = useState<{
        Enable: boolean
        CurrentProxy: string
    }>({Enable: false, CurrentProxy: ""})

    const [isWindows, setIsWindows] = useState(false)

    const update = useMemoizedFn(() => {
        setLoading(true)
        ipcRenderer
            .invoke("GetSystemProxy", {})
            .then((req: {CurrentProxy: string; Enable: boolean}) => {
                setCurrent(req)
            })
            .finally(() => setTimeout(() => setLoading(false), 300))
    })
    useEffect(() => {
        update()
        IsWindows().then((e) => {
            setIsWindows(e)
        })
    }, [])

    if (loading) {
        return <Spin tip={"加载中"} />
    }

    return (
        <Form
            onSubmitCapture={(e) => {
                e.preventDefault()

                ipcRenderer
                    .invoke("SetSystemProxy", {
                        HttpProxy: proxy,
                        Enable: enable
                    })
                    .then((e) => {
                        info("设置系统代理成功")
                    })
                    .finally(() => update())
            }}
            labelCol={{span: 6}}
            wrapperCol={{span: 14}}
            style={{padding: 24}}
        >
            <Form.Item label={" "} colon={false}>
                <Alert
                    closable={false}
                    type={"info"}
                    message={
                        <>
                            <Space direction={"vertical"}>
                                <Space>
                                    <div>
                                        当前系统代理启用状态:&emsp;
                                        {current.Enable ? (
                                            <YakitTag color='success'>已启用</YakitTag>
                                        ) : (
                                            <YakitTag color='danger'>未启用</YakitTag>
                                        )}
                                    </div>
                                    <YakitButton type='text' icon={<ReloadOutlined />} onClick={update} />
                                </Space>

                                {current.Enable && (
                                    <div>
                                        <Space>
                                            <>系统代理：</>
                                            <YakitTag color='bluePurple'>{current.CurrentProxy}</YakitTag>
                                        </Space>
                                    </div>
                                )}
                            </Space>
                        </>
                    }
                />
            </Form.Item>
            <Form.Item label={" "} colon={false}>
                <Alert
                    closable={false}
                    type={"error"}
                    message={
                        <>
                            <Space direction={"vertical"}>
                                <div>由于操作系统与 Yak 内核限制，无法使用原生 MacOS OC/Swift 接口实现设置代理。</div>
                                <div>Yak 引擎将弹出 osascript 授权页以改动系统代理，MacOS 用户认证即可。</div>
                            </Space>
                        </>
                    }
                />
            </Form.Item>
            <Form.Item label='启用系统代理配置'>
                <YakitSwitch checked={enable} onChange={setEnable} size='large' />
            </Form.Item>
            <Form.Item label={"设置系统代理"} help={"系统代理能帮助用户自动代理系统所有请求全局抓包"}>
                <YakitInput
                    addonBefore={proxy.includes("://") ? undefined : "http(s)://"}
                    value={proxy}
                    onChange={(e) => {
                        setProxy(e.target.value)
                    }}
                    placeholder={"127.0.0.1:8083"}
                    disabled={!enable}
                    size='large'
                />
            </Form.Item>
            <Form.Item colon={false} label={" "}>
                <YakitButton type={!enable ? "danger" : "primary"} htmlType='submit' size='large'>
                    {enable ? "配置 HTTP/HTTPS 代理" : "清空系统配置"}{" "}
                </YakitButton>
            </Form.Item>
        </Form>
    )
}

export const showConfigSystemProxyForm = (addr?: string) => {
    showYakitModal({
        title: "配置系统代理",
        width: 800,
        footer: null,
        content: (
            <>
                <ConfigSystemProxy defaultProxy={addr} />
            </>
        )
    })
}
