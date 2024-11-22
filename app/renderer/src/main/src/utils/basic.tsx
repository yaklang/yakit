import React, {useEffect, useImperativeHandle, useRef, useState} from "react"
import {Alert, Divider, Form, Space} from "antd"
import {InputItem, SwitchItem} from "./inputUtil"
import {useGetState, useMemoizedFn} from "ahooks"
import {getRemoteValue, setRemoteValue} from "./kv"
import {
    BRIDGE_ADDR,
    BRIDGE_SECRET,
    DNSLOG_ADDR,
    DNSLOG_INHERIT_BRIDGE,
    DNSLOG_SECRET
} from "../pages/reverse/ReverseServerPage"
import {failed, info} from "./notification"
import {YakExecutorParam} from "../pages/invoker/YakExecutorParams"
import useHoldingIPCRStream from "../hook/useHoldingIPCRStream"
import {randomString} from "./randomUtil"
import {PluginResultUI} from "../pages/yakitStore/viewers/base"
import {isCommunityEdition} from "./envfile"
import {NetInterface} from "@/models/Traffic"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {RefreshIcon} from "@/assets/newIcon"

const {ipcRenderer} = window.require("electron")

export const ConfigGlobalReverse = React.memo(() => {
    const [addr, setAddr, getAddr] = useGetState("")
    const [password, setPassword, getPassword] = useGetState("")
    const [localIP, setLocalIP, getLocalIP] = useGetState("")
    const [ifaces, setIfaces] = useState<NetInterface[]>([])
    const [ok, setOk] = useState(false)

    // dnslog 配置
    const [inheritBridge, setInheritBridge] = useState(false)
    const [dnslogAddr, setDNSLogAddr] = useState("ns1.cybertunnel.run:64333")
    const [dnslogPassword, setDNSLogPassword] = useState("")

    const getStatus = useMemoizedFn(() => {
        ipcRenderer.invoke("get-global-reverse-server-status").then((r) => {
            setOk(r)
            setRemoteValue(BRIDGE_ADDR, addr)
            setRemoteValue(BRIDGE_SECRET, password)
        })
    })

    useEffect(() => {
        getStatus()
        let id = setInterval(() => {
            getStatus()
        }, 1000)
        return () => {
            clearInterval(id)
        }
    }, [])

    useEffect(() => {
        if (!inheritBridge) {
            setDNSLogPassword("")
            setDNSLogAddr("ns1.cybertunnel.run:64333")
        }
    }, [inheritBridge])

    const cancel = useMemoizedFn(() => {
        ipcRenderer.invoke("cancel-global-reverse-server-status").finally(() => {
            getStatus()
        })
    })
    const login = useMemoizedFn(() => {
        ipcRenderer
            .invoke("ConfigGlobalReverse", {
                ConnectParams: {Addr: addr, Secret: password},
                LocalAddr: localIP
            })
            .then(() => {
                getStatus()
                if (inheritBridge) {
                    ipcRenderer
                        .invoke("SetYakBridgeLogServer", {
                            DNSLogAddr: addr,
                            DNSLogSecret: password
                        })
                        .then(() => {
                            info("配置全局 DNSLog 生效")
                        })
                        .catch((e) => {
                            failed(`配置全局 DNSLog 失败：${e}`)
                        })
                } else {
                    setRemoteValue(DNSLOG_ADDR, dnslogAddr)
                    setRemoteValue(DNSLOG_SECRET, dnslogPassword)
                    ipcRenderer
                        .invoke("SetYakBridgeLogServer", {
                            DNSLogAddr: dnslogAddr,
                            DNSLogSecret: dnslogPassword
                        })
                        .then(() => {
                            info("配置全局 DNSLog 生效")
                        })
                        .catch((e) => {
                            failed(`配置全局 DNSLog 失败：${e}`)
                        })
                }
            })
            .catch((e) => {
                failed(`Config Global Reverse Server failed: ${e}`)
            })
    })

    // 设置 Bridge
    useEffect(() => {
        getRemoteValue(BRIDGE_ADDR).then((data: string) => {
            if (!!data) {
                setAddr(`${data}`)
            }
        })

        getRemoteValue(BRIDGE_SECRET).then((data: string) => {
            if (!!data) {
                setPassword(`${data}`)
            }
        })

        getRemoteValue(DNSLOG_INHERIT_BRIDGE).then((data) => {
            switch (`${data}`) {
                case "true":
                    setInheritBridge(true)
                    return
                case "false":
                    setInheritBridge(false)
                    getRemoteValue(DNSLOG_ADDR).then((data: string) => {
                        if (!!data) {
                            setDNSLogAddr(`${data}`)
                        }
                    })
                    getRemoteValue(DNSLOG_SECRET).then((data: string) => {
                        if (!!data) {
                            setDNSLogPassword(`${data}`)
                        }
                    })
                    return
            }
        })

        return () => {
            // cancel()
        }
    }, [])

    // // 如果 addr 和 password 都存在，且没有连接，则马上连接一次
    // useEffect(() => {
    //     // 如果已经连上就退出
    //     if (ok) {
    //         return
    //     }
    //
    //     if (!!addr && !!password) {
    //         login()
    //         let id = setInterval(() => {
    //             login()
    //         }, 1000)
    //         return () => {
    //             clearInterval(id)
    //         }
    //     }
    // }, [addr, password, ok])

    const updateIface = useMemoizedFn(() => {
        ipcRenderer.invoke("AvailableLocalAddr", {}).then((data: {Interfaces: NetInterface[]}) => {
            const arr = (data.Interfaces || []).filter((i) => i.IP !== "127.0.0.1")
            setIfaces(arr)
        })
    })

    useEffect(() => {
        if (ifaces.length === 1) {
            setLocalIP(ifaces[0].IP)
        }
    }, [ifaces])

    useEffect(() => {
        ipcRenderer.on("global-reverse-error", (e, data) => {
            failed(`全局反连配置失败：${data}`)
        })
        return () => {
            ipcRenderer.removeAllListeners("global-reverse-error")
        }
    }, [])

    return (
        <div>
            <Form
                style={{marginTop: 20}}
                onSubmitCapture={(e) => {
                    e.preventDefault()

                    login()
                    setRemoteValue(DNSLOG_INHERIT_BRIDGE, `${inheritBridge}`)
                }}
                labelCol={{span: 5}}
                wrapperCol={{span: 16}}
            >
                <InputItem
                    label={"本地反连 IP"}
                    value={localIP}
                    disable={ok}
                    setValue={setLocalIP}
                    autoComplete={ifaces.filter((item) => !!item.IP).map((item) => item.IP)}
                    help={
                        <div>
                            <YakitButton
                                type={"text"}
                                size={"small"}
                                onClick={() => {
                                    updateIface()
                                }}
                                icon={<RefreshIcon />}
                            >
                                更新 yak 引擎本地 IP
                            </YakitButton>
                        </div>
                    }
                />
                <Divider orientation={"left"}>公网反连配置</Divider>
                <Form.Item label={" "} colon={false}>
                    <Alert
                        message={
                            <Space direction={"vertical"}>
                                <div>在公网服务器上运行</div>
                                <YakitTag
                                    enableCopy={true}
                                    color='blue'
                                    copyText={`yak bridge --secret [your-password]`}
                                ></YakitTag>
                                <div>或</div>
                                <YakitTag
                                    enableCopy={true}
                                    color='blue'
                                    copyText={`docker run -it --rm --net=host v1ll4n/yak-bridge yak bridge --secret
                        [your-password]`}
                                ></YakitTag>
                                <div>已配置</div>
                            </Space>
                        }
                    />
                </Form.Item>
                <InputItem
                    label={"Yak Bridge 地址"}
                    value={addr}
                    setValue={setAddr}
                    disable={ok}
                    help={"格式 host:port, 例如 cybertunnel.run:64333"}
                />
                <InputItem
                    label={"Yak Bridge 密码"}
                    setValue={setPassword}
                    value={password}
                    type={"password"}
                    disable={ok}
                    help={`yak bridge 命令的 --secret 参数值`}
                />
                <Divider orientation={"left"}>{isCommunityEdition() && "Yakit"} 全局 DNSLog 配置</Divider>
                <SwitchItem
                    label={"复用 Yak Bridge 配置"}
                    disabled={ok}
                    value={inheritBridge}
                    setValue={setInheritBridge}
                    oldTheme={false}
                />
                {!inheritBridge && (
                    <InputItem
                        label={"DNSLog 配置"}
                        disable={ok}
                        value={dnslogAddr}
                        help={"配置好 Yak Bridge 的 DNSLog 系统的地址：[ip]:[port]"}
                        setValue={setDNSLogAddr}
                    />
                )}
                {!inheritBridge && (
                    <InputItem label={"DNSLog 密码"} disable={ok} value={dnslogPassword} setValue={setDNSLogPassword} />
                )}
                <Form.Item colon={false} label={" "}>
                    <YakitButton type='primary' htmlType='submit' disabled={ok}>
                        {" "}
                        配置反连{" "}
                    </YakitButton>
                    {ok && (
                        <YakitButton
                            type='primary'
                            danger={true}
                            onClick={() => {
                                cancel()
                            }}
                            style={{marginLeft: 8}}
                        >
                            {" "}
                            停止{" "}
                        </YakitButton>
                    )}
                </Form.Item>
            </Form>
        </div>
    )
})

export interface YakScriptParam {
    Script: string
    Params: YakExecutorParam[]
}

interface StartExecYakCodeModalProps {
    visible: boolean
    onClose: () => void
    noErrorsLogCallBack?: () => void
    verbose: string
    params: YakScriptParam
    successInfo?: boolean
}
export const StartExecYakCodeModal: React.FC<StartExecYakCodeModalProps> = (props) => {
    const {visible, onClose, params, verbose, successInfo, noErrorsLogCallBack} = props

    const startToExecYakScriptViewerRef = useRef<any>()

    const onCancel = () => {
        ipcRenderer.invoke("cancel-ExecYakCode", startToExecYakScriptViewerRef.current.token)

        onClose()
    }

    const [refresh, setRefresh] = useState<number>(Math.random())
    useEffect(() => {
        setRefresh(Math.random())
    }, [visible])

    return (
        <YakitModal
            visible={visible}
            type='white'
            width='60%'
            maskClosable={false}
            destroyOnClose={true}
            title={`正在执行：${verbose}`}
            onCancel={onCancel}
            closable={true}
            footer={null}
        >
            <div style={{height: 400, overflowY: "auto"}}>
                <StartToExecYakScriptViewer
                    key={refresh}
                    ref={startToExecYakScriptViewerRef}
                    noErrorsLogCallBack={noErrorsLogCallBack}
                    script={params}
                    verbose={verbose}
                    successInfo={successInfo}
                    onCancel={onCancel}
                />
            </div>
        </YakitModal>
    )
}

const StartToExecYakScriptViewer = React.forwardRef(
    (
        props: {
            ref: any
            noErrorsLogCallBack?: () => void
            verbose: string
            script: YakScriptParam
            successInfo?: boolean
            onCancel: () => void
        },
        ref
    ) => {
        const {script, verbose, successInfo = true, onCancel, noErrorsLogCallBack} = props
        const [token, setToken] = useState(randomString(40))
        const [loading, setLoading] = useState(true)
        const [messageStateStr, setMessageStateStr] = useState<string>("")
        const checkErrorsFlagRef = useRef<boolean>(false)

        useImperativeHandle(ref, () => ({
            token
        }))

        const [infoState, {reset, setXtermRef}] = useHoldingIPCRStream(
            verbose,
            "ExecYakCode",
            token,
            () => setTimeout(() => setLoading(false), 300),
            () => {
                ipcRenderer
                    .invoke("ExecYakCode", script, token)
                    .then(() => {
                        successInfo && info(`执行 ${verbose} 成功`)
                    })
                    .catch((e) => {
                        failed(`执行 ${verbose} 遇到问题：${e}`)
                    })
            }
        )
        useEffect(() => {
            setMessageStateStr(JSON.stringify(infoState.messageState))
        }, [infoState.messageState])

        useEffect(() => {
            if (messageStateStr !== "") {
                const messageState = JSON.parse(messageStateStr)
                for (let i = 0; i < messageState.length; i++) {
                    const item = messageState[i]
                    if (item.level === "error") {
                        checkErrorsFlagRef.current = true
                        return
                    }
                }
                // 导入日志都没有错误
                if (!checkErrorsFlagRef.current && !loading && messageState.length) {
                    noErrorsLogCallBack && noErrorsLogCallBack()
                    onCancel()
                }
            }
        }, [messageStateStr, loading])

        return (
            <PluginResultUI
                loading={loading}
                defaultConsole={false}
                statusCards={infoState.statusState}
                risks={infoState.riskState}
                featureType={infoState.featureTypeState}
                feature={infoState.featureMessageState}
                progress={infoState.processState}
                results={infoState.messageState}
                onXtermRef={setXtermRef}
            />
        )
    }
)
