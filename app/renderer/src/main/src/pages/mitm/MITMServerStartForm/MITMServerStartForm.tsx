import React, {useEffect, useRef, useState} from "react"
import {Form, Space} from "antd"
import {getRemoteValue} from "@/utils/kv"
import {CONST_DEFAULT_ENABLE_INITIAL_PLUGIN, MITMResponse} from "@/pages/mitm/MITMPage"
import {MITMConsts} from "@/pages/mitm/MITMConsts"
import {YakitAutoComplete} from "@/components/yakitUI/YakitAutoComplete/YakitAutoComplete"
import {MITMContentReplacerRule} from "../MITMRule/MITMRuleType"
import styles from "./MITMServerStartForm.module.scss"
import {YakitInputNumber} from "@/components/yakitUI/YakitInputNumber/YakitInputNumber"
import {YakitSwitch} from "@/components/yakitUI/YakitSwitch/YakitSwitch"
import {yakitFailed} from "@/utils/notification"
import {CogIcon, RefreshIcon} from "@/assets/newIcon"
import {RuleExportAndImportButton} from "../MITMRule/MITMRule"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"

const MITMFormAdvancedConfiguration = React.lazy(() => import("./MITMFormAdvancedConfiguration"))

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
    CerName: string
    CrtPem: Uint8Array
    KeyPem: Uint8Array
    CaCertificates: Uint8Array[]
}
const defHost = "127.0.0.1"
export const MITMServerStartForm: React.FC<MITMServerStartFormProp> = React.memo((props) => {
    // const [host, setHost] = useState("127.0.0.1")
    const [hostHistoryList, setHostHistoryList] = useState<string[]>([])
    // const [port, setPort] = useState(8083)
    // const [enableHttp2, setEnableHttp2] = useState(false)
    // const [enableInitialPlugin, setEnableInitialPlugin] = useState(false)
    // const [defaultPlugins, setDefaultPlugins] = useState<string[]>([])

    const [rules, setRules] = useState<MITMContentReplacerRule[]>([])

    const [isUseDefRules, setIsUseDefRules] = useState<boolean>(false)
    const [advancedFormVisible, setAdvancedFormVisible] = useState<boolean>(false)

    const ruleButtonRef = useRef<any>()

    const [form] = Form.useForm()

    useEffect(() => {
        // 设置 MITM 初始启动插件选项
        getRemoteValue(CONST_DEFAULT_ENABLE_INITIAL_PLUGIN).then((a) => {
            // setEnableInitialPlugin(!!a)
            form.setFieldsValue({enableInitialPlugin: !!a})
        })

        getRemoteValue(MITMConsts.MITMDefaultServer).then((e) => {
            if (!!e) {
                // setHost(`${e}`)
                form.setFieldsValue({host: e || defHost})
            }
        })

        getRemoteValue(MITMConsts.MITMDefaultPort).then((e) => {
            if (!!e) {
                // setPort(parseInt(`${e}`))
                form.setFieldsValue({port: e})
            }
        })

        getRemoteValue(MITMConsts.MITMDefaultHostHistoryList).then((e) => {
            if (!!e) {
                setHostHistoryList(JSON.parse(e))
            } else {
                getRemoteValue(MITMConsts.MITMDefaultServer).then((h) => {
                    if (!!h) {
                        setHostHistoryList([h])
                    }
                })
            }
        })
    }, [])
    // 内容替代模块
    const [replacers, setReplacers] = useState<MITMContentReplacerRule[]>([])
    useEffect(() => {
        ipcRenderer.on("client-mitm-content-replacer-update", (e, data: MITMResponse) => {
            setReplacers(data?.replacers || [])
            return
        })
        return () => {
            ipcRenderer.removeAllListeners("client-mitm-content-replacer-update")
        }
    }, [])
    useEffect(() => {
        ipcRenderer
            .invoke("GetCurrentRules", {})
            .then((rsp: {Rules: MITMContentReplacerRule[]}) => {
                const newRules = rsp.Rules.map((ele) => ({...ele, Id: ele.Index}))
                setRules(newRules)
            })
            .catch((e) => yakitFailed("获取规则列表失败:" + e))
    }, [])
    useEffect(() => {
        ipcRenderer.on("client-mitm-content-replacer-update", (e, data: MITMResponse) => {
            const newRules = (data?.replacers || []).map((ele) => ({...ele, Id: ele.Index}))
            setRules(newRules)
            return
        })
        return () => {
            ipcRenderer.removeAllListeners("client-mitm-content-replacer-update")
        }
    }, [])

    return (
        <div className={styles["mitm-server-start-form"]}>
            <Form
                form={form}
                onFinish={(values) => {
                    console.log("values", values)
                    const params = {
                        ...values
                        // downstreamProxy
                        // defaultPlugins
                        // certs
                    }
                    // e.preventDefault()
                    // props.onStartMITMServer(
                    //     host,
                    //     port,
                    //     downstreamProxy,
                    //     enableInitialPlugin,
                    //     defaultPlugins,
                    //     enableHttp2,
                    //     certs
                    // )
                    // const index = hostHistoryList.findIndex((ele) => ele === host)
                    // if (index === -1) {
                    //     const newHostHistoryList = [host, ...hostHistoryList].filter((_, index) => index < 10)
                    //     setRemoteValue(MITMConsts.MITMDefaultHostHistoryList, JSON.stringify(newHostHistoryList))
                    // }
                    // setLocalValue(WEB_FUZZ_PROXY, downstreamProxy)
                    // setRemoteValue(MITMConsts.MITMDefaultServer, host)
                    // setRemoteValue(MITMConsts.MITMDefaultPort, `${port}`)
                    // setRemoteValue(MITMConsts.MITMDefaultDownstreamProxy, downstreamProxy)
                    // setRemoteValue(MITMConsts.MITMDefaultClientCertificates, JSON.stringify(certs))
                }}
                layout={"horizontal"}
                labelCol={{span: 5}}
                wrapperCol={{span: 13}}
            >
                <Item
                    label={"劫持代理监听主机"}
                    help={"远程模式可以修改为 0.0.0.0 以监听主机所有网卡"}
                    rules={[{required: true, message: "该项为必填"}]}
                    name='host'
                >
                    {/* <AutoComplete
                        options={hostHistoryList.map((item) => ({value: item}))}
                        placeholder='请输入'
                        value={host}
                        onChange={(value) => setHost(value)}
                    /> */}
                    <YakitAutoComplete
                        options={hostHistoryList.map((item) => ({value: item, label: item}))}
                        placeholder='请输入'
                    />
                </Item>
                <Item label={"劫持代理监听端口"} name='port' rules={[{required: true, message: "该项为必填"}]}>
                    {/* <InputNumber value={port} onChange={(e) => setPort(e as number)} /> */}
                    <YakitInputNumber
                        wrapperClassName={styles["form-input-number"]}
                        style={{width: "100%", maxWidth: "none"}}
                    />
                </Item>
                <Item
                    label={"HTTP/2.0 支持"}
                    name='enableHttp2'
                    help={
                        "开启该选项将支持 HTTP/2.0 劫持，关闭后自动降级为 HTTP/1.1，开启后 HTTP2 协商失败也会自动降级"
                    }
                >
                    {/* <SwitchItem
                    label={"HTTP/2.0 支持"}
                    value={enableHttp2}
                    setValue={setEnableHttp2}
                    help={
                        "开启该选项将支持 HTTP/2.0 劫持，关闭后自动降级为 HTTP/1.1，开启后 HTTP2 协商失败也会自动降级"
                    }
                /> */}
                    <YakitSwitch size='large' />
                </Item>

                {/* <Item label={"选择插件"} colon={true}>
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
                </Item> */}
                {/* <Item
                    label={"下游代理"}
                    help={
                        "为经过该 MITM 代理的请求再设置一个代理，通常用于访问中国大陆无法访问的网站或访问特殊网络/内网，也可用于接入被动扫描" +
                        "，例如 http://127.0.0.1:7890 或者 socks5://127.0.0.1:7890"
                    }
                >
                    <Input value={downstreamProxy} onChange={(e) => setDownstreamProxy(e.target.value)} />
                </Item> */}
                {/* <Item label={"客户端TLS导入"} help={`用于 mTLS（Mutual TLS）开启客户端验证的 HTTPS 网站抓包`}>
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
                </Item> */}
                <Item
                    label={"内容规则"}
                    help={
                        <span className={styles["form-rule-help"]}>
                            使用规则进行匹配、替换、标记、染色，同时配置生效位置
                            <span
                                className={styles["form-rule-help-setting"]}
                                onClick={() => {
                                    setIsUseDefRules(true)
                                    ruleButtonRef.current.onSetImportVisible(true)
                                }}
                            >
                                默认配置&nbsp;
                                <RefreshIcon />
                            </span>
                        </span>
                    }
                >
                    <div className={styles["form-rule-body"]}>
                        <div className={styles["form-rule"]} onClick={() => props.setVisible(true)}>
                            <div className={styles["form-rule-text"]}>现有规则共 {rules.length} 条</div>
                            <div className={styles["form-rule-icon"]}>
                                <CogIcon />
                            </div>
                        </div>
                    </div>
                    <div className={styles["form-rule-button"]}>
                        <RuleExportAndImportButton
                            ref={ruleButtonRef}
                            isUseDefRules={isUseDefRules}
                            setIsUseDefRules={setIsUseDefRules}
                        />
                    </div>
                </Item>
                <Item label='禁用插件' name='enableInitialPlugin'>
                    <YakitSwitch size='large' />
                </Item>
                <Item label={" "} colon={false}>
                    <Space>
                        <YakitButton type='primary' size='large' htmlType='submit'>
                            劫持启动
                        </YakitButton>
                        <YakitButton type='outline2' size='large'>
                            免配置启动
                        </YakitButton>
                        <YakitButton type='text' size='large' onClick={() => setAdvancedFormVisible(true)}>
                            高级配置
                        </YakitButton>
                        {/* <Checkbox
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
                        </Checkbox> */}
                    </Space>
                </Item>
            </Form>
            <React.Suspense fallback={<div>loading...</div>}>
                <MITMFormAdvancedConfiguration visible={advancedFormVisible} setVisible={setAdvancedFormVisible} />
            </React.Suspense>
        </div>
    )
})
