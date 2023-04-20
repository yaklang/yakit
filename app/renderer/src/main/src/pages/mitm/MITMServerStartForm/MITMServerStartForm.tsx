import React, {useEffect, useRef, useState} from "react"
import {Form, Space} from "antd"
import {getRemoteValue, setLocalValue, setRemoteValue} from "@/utils/kv"
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
import {useMemoizedFn, useUpdateEffect} from "ahooks"
import {AdvancedConfigurationFromValue} from "./MITMFormAdvancedConfiguration"
import {WEB_FUZZ_PROXY} from "@/pages/fuzzer/HTTPFuzzerPage"
import ReactResizeDetector from "react-resize-detector"
import {useWatch} from "antd/es/form/Form"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"

const MITMFormAdvancedConfiguration = React.lazy(() => import("./MITMFormAdvancedConfiguration"))
const ChromeLauncherButton = React.lazy(() => import("../MITMChromeLauncher"))

const {ipcRenderer} = window.require("electron")

export interface MITMServerStartFormProp {
    onStartMITMServer: (
        host: string,
        port: number,
        downstreamProxy: string,
        enableInitialPlugin: boolean,
        enableHttp2: boolean,
        clientCertificates: ClientCertificate[],
        extra?: object
    ) => any
    visible: boolean
    setVisible: (b: boolean) => void
    enableInitialPlugin: boolean
    setEnableInitialPlugin: (b: boolean) => void
    status: "idle" | "hijacked" | "hijacking"
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
    const [hostHistoryList, setHostHistoryList] = useState<string[]>([])

    const [rules, setRules] = useState<MITMContentReplacerRule[]>([])

    const [isUseDefRules, setIsUseDefRules] = useState<boolean>(false)
    const [advancedFormVisible, setAdvancedFormVisible] = useState<boolean>(false)

    // 高级配置 关闭后存的最新的form值
    const [advancedValue, setAdvancedValue] = useState<AdvancedConfigurationFromValue>()

    const ruleButtonRef = useRef<any>()
    const advancedFormRef = useRef<any>()

    const [form] = Form.useForm()
    const enableGMTLS = useWatch<boolean>("enableGMTLS", form)

    useEffect(() => {
        if (props.status !== "idle") return
        // 设置 MITM 初始启动插件选项
        getRemoteValue(CONST_DEFAULT_ENABLE_INITIAL_PLUGIN).then((a) => {
            form.setFieldsValue({enableInitialPlugin: !!a})
        })
        getRemoteValue(MITMConsts.MITMDefaultServer).then((e) => {
            if (!!e) {
                form.setFieldsValue({host: e || defHost})
            }
        })
        getRemoteValue(MITMConsts.MITMDefaultPort).then((e) => {
            if (!!e) {
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
        getRemoteValue(MITMConsts.MITMDefaultDownstreamProxy).then((e) => {
            form.setFieldsValue({downstreamProxy: e})
        })
    }, [props.status])
    useUpdateEffect(() => {
        form.setFieldsValue({enableInitialPlugin: props.enableInitialPlugin})
    }, [props.enableInitialPlugin])
    useEffect(() => {
        getRules()
    }, [props.visible])
    const getRules = useMemoizedFn(() => {
        ipcRenderer
            .invoke("GetCurrentRules", {})
            .then((rsp: {Rules: MITMContentReplacerRule[]}) => {
                const newRules = rsp.Rules.map((ele) => ({...ele, Id: ele.Index}))
                setRules(newRules)
            })
            .catch((e) => yakitFailed("获取规则列表失败:" + e))
    })
    const onSwitchPlugin = useMemoizedFn((checked) => {
        props.setEnableInitialPlugin(checked)
    })
    const onStartMITM = useMemoizedFn((values) => {
        // 获取高级配置的默认值
        const advancedFormValue = advancedFormRef.current?.getValue()

        let params = {
            ...values,
            ...advancedFormValue,
            ...advancedValue
        }
        props.onStartMITMServer(
            params.host,
            params.port,
            params.downstreamProxy,
            params.enableInitialPlugin,
            params.enableHttp2,
            params.certs,
            {
                enableGMTLS: params.enableGMTLS,
                onlyEnableGMTLS: params.onlyEnableGMTLS,
                preferGMTLS: params.preferGMTLS,
                enableProxyAuth: params.enableProxyAuth,
                proxyUsername: params.proxyUsername,
                proxyPassword: params.proxyPassword
            }
        )
        
        const index = hostHistoryList.findIndex((ele) => ele === params.host)
        if (index === -1) {
            const newHostHistoryList = [params.host, ...hostHistoryList].filter((_, index) => index < 10)
            setRemoteValue(MITMConsts.MITMDefaultHostHistoryList, JSON.stringify(newHostHistoryList))
        }
        setRemoteValue(
            MITMConsts.MITMDefaultDownstreamProxy,
            params.downstreamProxy ? params.downstreamProxy : undefined
        )
        setRemoteValue(MITMConsts.MITMDefaultServer, params.host)
        setRemoteValue(MITMConsts.MITMDefaultPort, `${params.port}`)
        setRemoteValue(CONST_DEFAULT_ENABLE_INITIAL_PLUGIN, params.enableInitialPlugin ? "true" : "")
    })
    const [width, setWidth] = useState<number>(0)
    return (
        <div className={styles["mitm-server-start-form"]}>
            <ReactResizeDetector
                onResize={(w) => {
                    if (!w) {
                        return
                    }
                    setWidth(w)
                }}
                handleWidth={true}
                handleHeight={true}
                refreshMode={"debounce"}
                refreshRate={50}
            />
            <Form
                form={form}
                onFinish={onStartMITM}
                labelCol={{span: width > 610 ? 5 : 9}}
                wrapperCol={{span: width > 610 ? 13 : 11}}
            >
                <Item
                    label={"劫持代理监听主机"}
                    help={"远程模式可以修改为 0.0.0.0 以监听主机所有网卡"}
                    rules={[{required: true, message: "该项为必填"}]}
                    name='host'
                >
                    <YakitAutoComplete
                        options={hostHistoryList.map((item) => ({value: item, label: item}))}
                        placeholder='请输入'
                    />
                </Item>
                <Item label={"劫持代理监听端口"} name='port' rules={[{required: true, message: "该项为必填"}]}>
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
                    valuePropName='checked'
                >
                    <YakitSwitch size='large' />
                </Item>
                <Item
                    label={"国密劫持"}
                    name='enableGMTLS'
                    initialValue={true}
                    help={"适配国密算法的 TLS (GM-tls) 劫持，对目标网站发起国密 TLS 的连接"}
                    valuePropName='checked'
                >
                    <YakitSwitch size='large' />
                </Item>

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
                            <div className={styles["form-rule-text"]}>现有规则 {rules.length} 条</div>
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
                            onOkImport={() => getRules()}
                        />
                    </div>
                </Item>
                <Item label='启用插件' name='enableInitialPlugin' valuePropName='checked'>
                    <YakitSwitch size='large' onChange={(checked) => onSwitchPlugin(checked)} />
                </Item>
                <Item label={" "} colon={false}>
                    <Space>
                        <YakitButton type='primary' size='large' htmlType='submit'>
                            劫持启动
                        </YakitButton>
                        <ChromeLauncherButton
                            host={form.getFieldValue("host")}
                            port={form.getFieldValue("port")}
                            onFished={(host, port) => {
                                const values = {
                                    ...form.getFieldsValue(),
                                    host,
                                    port
                                }
                                onStartMITM(values)
                            }}
                        />
                        <YakitButton type='text' size='large' onClick={() => setAdvancedFormVisible(true)}>
                            高级配置
                        </YakitButton>
                    </Space>
                </Item>
            </Form>
            <React.Suspense fallback={<div>loading...</div>}>
                <MITMFormAdvancedConfiguration
                    visible={advancedFormVisible}
                    setVisible={setAdvancedFormVisible}
                    onSave={(val) => {
                        setAdvancedValue(val)
                        setAdvancedFormVisible(false)
                    }}
                    enableGMTLS={enableGMTLS}
                    ref={advancedFormRef}
                />
            </React.Suspense>
        </div>
    )
})
