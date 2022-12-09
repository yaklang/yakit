import React, {useEffect, useState} from "react"
import {AutoComplete, Button, Checkbox, Divider, Form, Input, InputNumber, Popconfirm, Space, Tag} from "antd"
import {SimplePluginList} from "@/components/SimplePluginList"
import {showDrawer, showModal} from "@/utils/showModal"
import {MITMContentReplacerViewer} from "@/pages/mitm/MITMContentReplacerViewer"
import {MITMContentReplacerExport, MITMContentReplacerImport} from "@/pages/mitm/MITMContentReplacerImport"
import {getRemoteValue, getValue, setRemoteValue} from "@/utils/kv"
import {CONST_DEFAULT_ENABLE_INITIAL_PLUGIN, MITMResponse} from "@/pages/mitm/MITMPage"
import {MITMConsts} from "@/pages/mitm/MITMConsts"
import {SwitchItem} from "@/utils/inputUtil"
import {PlusSquareOutlined} from "@ant-design/icons/lib"
import {YakEditor} from "@/utils/editors"
import {StringToUint8Array, Uint8ArrayToString} from "@/utils/str"
import {MITMRule} from "./MITMRule/MITMRule"
import {MITMContentReplacer, MITMContentReplacerRule} from "./MITMContentReplacer"
import {WEB_FUZZ_PROXY} from "@/pages/fuzzer/HTTPFuzzerPage"

const {ipcRenderer} = window.require("electron")
export interface MITMServerStartFormProp {
    onStartMITMServer: (
        host: string,
        port: number,
        downstreamProxy: string,
        enableInitialPlugin: boolean,
        defaultPlugins: string[],
        enableHttp2: boolean,
        clientCertificates: ClientCertificate[]
    ) => any
    setVisible: (b: boolean) => void
}

const {Item} = Form

export interface ClientCertificate {
    CrtPem: Uint8Array
    KeyPem: Uint8Array
    CaCertificates: Uint8Array[]
}

export const MITMServerStartForm: React.FC<MITMServerStartFormProp> = React.memo((props) => {
    const [host, setHost] = useState("127.0.0.1")
    const [hostHistoryList, setHostHistoryList] = useState<string[]>([])
    const [port, setPort] = useState(8083)
    const [enableHttp2, setEnableHttp2] = useState(false)
    const [downstreamProxy, setDownstreamProxy] = useState("")
    const [enableInitialPlugin, setEnableInitialPlugin] = useState(false)
    const [defaultPlugins, setDefaultPlugins] = useState<string[]>([])
    const [certs, setCerts] = useState<ClientCertificate[]>([])

    useEffect(() => {
        // 设置 MITM 初始启动插件选项
        getRemoteValue(CONST_DEFAULT_ENABLE_INITIAL_PLUGIN).then((a) => {
            setEnableInitialPlugin(!!a)
        })

        getRemoteValue(MITMConsts.MITMDefaultServer).then((e) => {
            if (!!e) {
                setHost(`${e}`)
            }
        })

        getRemoteValue(MITMConsts.MITMDefaultClientCertificates).then((e) => {
            if (!!e) {
                try {
                    const certsRaw = JSON.parse(e) as ClientCertificate[]
                    setCerts(certsRaw)
                } catch (e) {
                    setCerts([])
                }
            }
        })

        getRemoteValue(MITMConsts.MITMDefaultPort).then((e) => {
            if (!!e) {
                setPort(parseInt(`${e}`))
            }
        })

        getRemoteValue(MITMConsts.MITMDefaultDownstreamProxy).then((e) => {
            if (!!e) {
                setDownstreamProxy(`${e}`)
            }
        })

        getRemoteValue(MITMConsts.MITMDefaultHostHistoryList).then((e) => {
            if (!!e) {
                setHostHistoryList(JSON.parse(e))
            } else {
                getRemoteValue(MITMConsts.MITMDefaultServer).then((e) => {
                    if (!!host) {
                        setHostHistoryList([host])
                    }
                })
            }
        })
    }, [])
    // 内容替代模块
    const [replacers, setReplacers] = useState<MITMContentReplacerRule[]>([])
    useEffect(() => {
        ipcRenderer.on("client-mitm-content-replacer-update", (e, data: MITMResponse) => {
            console.log("client-mitm-content-replacer-update.replacers", data?.replacers)
            setReplacers(data?.replacers || [])
            return
        })
        return () => {
            ipcRenderer.removeAllListeners("client-mitm-content-replacer-update")
        }
    }, [])
    return (
        <div style={{height: "100%", width: "100%", position: "relative"}}>
            <Form
                style={{marginTop: 40}}
                onSubmitCapture={(e) => {
                    e.preventDefault()
                    props.onStartMITMServer(
                        host,
                        port,
                        downstreamProxy,
                        enableInitialPlugin,
                        defaultPlugins,
                        enableHttp2,
                        certs
                    )
                    const index = hostHistoryList.findIndex((ele) => ele === host)
                    if (index === -1) {
                        const newHostHistoryList = [host, ...hostHistoryList].filter((_, index) => index < 10)
                        setRemoteValue(MITMConsts.MITMDefaultHostHistoryList, JSON.stringify(newHostHistoryList))
                    }
                    saveValue(WEB_FUZZ_PROXY, downstreamProxy)
                    setRemoteValue(MITMConsts.MITMDefaultServer, host)
                    setRemoteValue(MITMConsts.MITMDefaultPort, `${port}`)
                    setRemoteValue(MITMConsts.MITMDefaultDownstreamProxy, downstreamProxy)
                    setRemoteValue(MITMConsts.MITMDefaultClientCertificates, JSON.stringify(certs))
                }}
                layout={"horizontal"}
                labelCol={{span: 7}}
                wrapperCol={{span: 13}}
            >
                <Item label={"劫持代理监听主机"} help={"远程模式可以修改为 0.0.0.0 以监听主机所有网卡"}>
                    <AutoComplete
                        options={hostHistoryList.map((item) => ({value: item}))}
                        placeholder='请输入'
                        value={host}
                        onChange={(value) => setHost(value)}
                    />
                </Item>
                <Item label={"劫持代理监听端口"}>
                    <InputNumber value={port} onChange={(e) => setPort(e as number)} />
                </Item>
                <SwitchItem
                    label={"HTTP/2.0 支持"}
                    value={enableHttp2}
                    setValue={setEnableHttp2}
                    help={
                        "开启该选项将支持 HTTP/2.0 劫持，关闭后自动降级为 HTTP/1.1，开启后 HTTP2 协商失败也会自动降级"
                    }
                />
                <Item label={"选择插件"} colon={true}>
                    <div style={{height: 200, maxWidth: 420}}>
                        <SimplePluginList
                            disabled={!enableInitialPlugin}
                            bordered={true}
                            initialSelected={defaultPlugins}
                            onSelected={(list: string[]) => {
                                setDefaultPlugins(list)
                            }}
                            pluginTypes={"mitm,port-scan"}
                            verbose={"插件"}
                        />
                    </div>
                </Item>
                <Item
                    label={"下游代理"}
                    help={
                        "为经过该 MITM 代理的请求再设置一个代理，通常用于访问中国大陆无法访问的网站或访问特殊网络/内网，也可用于接入被动扫描" +
                        "，例如 http://127.0.0.1:7890 或者 socks5://127.0.0.1:7890"
                    }
                >
                    <Input value={downstreamProxy} onChange={(e) => setDownstreamProxy(e.target.value)} />
                </Item>
                <Item label={"客户端TLS导入"} help={`用于 mTLS（Mutual TLS）开启客户端验证的 HTTPS 网站抓包`}>
                    <Space>
                        {certs.length > 0 ? (
                            <Tag color={"orange"}>包含[{certs.length}]个证书对</Tag>
                        ) : (
                            <Tag color={"green"}>无 TLS 客户端证书</Tag>
                        )}
                        <Button
                            icon={<PlusSquareOutlined />}
                            size={"small"}
                            type={"link"}
                            onClick={() => {
                                const m = showModal({
                                    title: "添加证书",
                                    width: "70%",
                                    content: (
                                        <InputCertificateForm
                                            onChange={(e) => {
                                                setCerts([...certs, e])
                                                m.destroy()
                                            }}
                                        />
                                    )
                                })
                            }}
                        >
                            添加
                        </Button>
                        <Popconfirm
                            title={"清除证书之后需要重新添加，请谨慎操作！"}
                            onConfirm={() => {
                                setCerts([])
                            }}
                        >
                            <Button danger={true} size={"small"} type={"link"}>
                                删除
                            </Button>
                        </Popconfirm>
                    </Space>
                </Item>
                <Item label={"内容规则"} help={"使用规则进行匹配、替换、标记、染色，同时配置生效位置"}>
                    <Space>
                        <Button
                            onClick={() => {
                                // let m = showDrawer({
                                //     placement: "top",
                                //     height: "50%",
                                //     content: <MITMContentReplacerViewer />,
                                //     maskClosable: false
                                // })
                                props.setVisible(true)
                            }}
                        >
                            已有规则
                        </Button>
                        <Button
                            type={"link"}
                            style={{padding: `4px 6px`}}
                            onClick={() => {
                                let m = showModal({
                                    width: "96%",
                                    content: (
                                        <div style={{marginTop: 20}}>
                                            <MITMContentReplacer
                                                rules={replacers}
                                                onSaved={(rules) => {
                                                    setReplacers(rules)
                                                    m.destroy()
                                                }}
                                            />
                                        </div>
                                    ),
                                    maskClosable: false
                                })
                            }}
                        >
                            标记 / 替换流量规则
                        </Button>
                        <Button
                            type={"link"}
                            onClick={() => {
                                const m = showModal({
                                    title: "从 JSON 中导入",
                                    width: "60%",
                                    content: (
                                        <>
                                            <MITMContentReplacerImport
                                                onClosed={() => {
                                                    m.destroy()
                                                }}
                                            />
                                        </>
                                    )
                                })
                            }}
                        >
                            从 JSON 导入
                        </Button>
                        <Button
                            type={"link"}
                            onClick={() => {
                                showModal({
                                    title: "导出配置 JSON",
                                    width: "50%",
                                    content: (
                                        <>
                                            <MITMContentReplacerExport />
                                        </>
                                    )
                                })
                            }}
                        >
                            导出为 JSON
                        </Button>
                    </Space>
                </Item>
                <Item label={" "} colon={false}>
                    <Space>
                        <Button type={"primary"} htmlType={"submit"}>
                            劫持启动
                        </Button>
                        <Divider type={"vertical"} />
                        <Checkbox
                            checked={enableInitialPlugin}
                            onChange={(node) => {
                                const e = node.target.checked
                                setEnableInitialPlugin(e)
                                if (e) {
                                    setRemoteValue(CONST_DEFAULT_ENABLE_INITIAL_PLUGIN, "true")
                                } else {
                                    setRemoteValue(CONST_DEFAULT_ENABLE_INITIAL_PLUGIN, "")
                                }
                            }}
                        >
                            插件自动加载
                        </Checkbox>
                    </Space>
                </Item>
            </Form>
        </div>
    )
})

interface InputCertificateFormProp {
    onChange: (c: ClientCertificate) => any
}

const InputCertificateForm: React.FC<InputCertificateFormProp> = (props) => {
    const [params, setParams] = useState<ClientCertificate>({
        CaCertificates: [],
        CrtPem: new Uint8Array(),
        KeyPem: new Uint8Array()
    })
    return (
        <Form
            onSubmitCapture={(e) => {
                e.preventDefault()

                props.onChange(params)
            }}
            labelCol={{span: 5}}
            wrapperCol={{span: 14}}
        >
            <Form.Item label={"客户端证书(PEM)"} required={true}>
                <YakEditor
                    type={"html"}
                    noMiniMap={true}
                    noWordWrap={true}
                    setValue={(CrtPem) => setParams({...params, CrtPem: StringToUint8Array(CrtPem)})}
                    value={Uint8ArrayToString(params.CrtPem)}
                />
            </Form.Item>
            <Form.Item label={"客户端私钥(PEM)"} required={true}>
                <YakEditor
                    type={"html"}
                    setValue={(KeyPem) => setParams({...params, KeyPem: StringToUint8Array(KeyPem)})}
                    value={Uint8ArrayToString(params.KeyPem)}
                    noMiniMap={true}
                    noWordWrap={true}
                />
            </Form.Item>
            <Form.Item label={"CA 根证书"}>
                <YakEditor
                    type={"html"}
                    setValue={(CaCertBytes) =>
                        setParams({...params, CaCertificates: [StringToUint8Array(CaCertBytes)]})
                    }
                    value={params.CaCertificates.length > 0 ? Uint8ArrayToString(params.CaCertificates[0]) : ""}
                    noMiniMap={true}
                    noWordWrap={true}
                />
            </Form.Item>
            <Form.Item colon={false} label={" "}>
                <Button type='primary' htmlType='submit'>
                    {" "}
                    添加 TLS 证书{" "}
                </Button>
            </Form.Item>
        </Form>
    )
}
