import React, {ForwardedRef, useEffect, useImperativeHandle, useRef, useState} from "react"
import classNames from "classnames"
import styles from "./MITMServerStartForm.module.scss"
import {ClientCertificate} from "./MITMServerStartForm"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {MITMConsts} from "../MITMConsts"
import {useMemoizedFn} from "ahooks"
import {StringToUint8Array, Uint8ArrayToString} from "@/utils/str"
import {saveABSFileToOpen} from "@/utils/openWebsite"
import {yakitFailed} from "@/utils/notification"
import {YakitDrawer} from "@/components/yakitUI/YakitDrawer/YakitDrawer"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {Divider, Form, Modal, Space, Upload} from "antd"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {ExportIcon, OutlinePlusIcon, PlusCircleIcon, RemoveIcon, SaveIcon, TrashIcon} from "@/assets/newIcon"
import { YakitCheckbox } from "@/components/yakitUI/YakitCheckbox/YakitCheckbox"
import {ExclamationCircleOutlined} from "@ant-design/icons"
import {YakitSwitch} from "@/components/yakitUI/YakitSwitch/YakitSwitch"
import {YakitAutoComplete} from "@/components/yakitUI/YakitAutoComplete/YakitAutoComplete"
import {useWatch} from "antd/lib/form/Form"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {inputHTTPFuzzerHostConfigItem} from "@/pages/fuzzer/HTTPFuzzerHosts"
import {YakitRoute} from "@/enums/yakitRoute"
import {RemoteGV} from "@/yakitGV"
import {YakitInputNumber} from "@/components/yakitUI/YakitInputNumber/YakitInputNumber"
import {useI18nNamespaces} from "@/i18n/useI18nNamespaces"
import { JSONParseLog } from "@/utils/tool"
import {YakitRadioButtons} from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtons"
import {RemoteMitmGV} from "@/enums/mitm"
import {cloneDeep, isEqual} from "lodash"

const MITMAddTLS = React.lazy(() => import("./MITMAddTLS"))
const MITMFiltersModal = React.lazy(() => import("./MITMFiltersModal"))
const MITMCertificateDownloadModal = React.lazy(() => import("./MITMCertificateDownloadModal"))

const {ipcRenderer} = window.require("electron")

export interface MITMFormAdvancedConfigurationRef {
    getValue: () => AdvancedConfigurationFromValue
}

interface MITMFormAdvancedConfigurationProps {
    ref?: ForwardedRef<MITMFormAdvancedConfigurationRef>
    visible: boolean
    setVisible: (b: boolean) => void
    onSave: (v: AdvancedConfigurationFromValue) => void
    enableGMTLS: boolean
}
export interface AdvancedConfigurationFromValue {
    certs: ClientCertificate[]
    preferGMTLS: boolean
    onlyEnableGMTLS: boolean
    enableProxyAuth: boolean
    proxyUsername: string
    proxyPassword: string
    dnsServers: string[]
    etcHosts: any[]
    EnableHostsMappingBeforeDownstreamProxy: boolean
    filterWebsocket: boolean
    disableCACertPage: boolean
    DisableSystemProxy: boolean
    DisableWebsocketCompression: boolean
    PluginConcurrency: number
    OverwriteSNI: boolean
    SNI: string
    SNIMapping: {Key: string, Value: string}[]
}
const DefFieldsVal: AdvancedConfigurationFromValue = {
    certs: [],
    preferGMTLS: false,
    onlyEnableGMTLS: false,
    enableProxyAuth: false,
    proxyUsername: "",
    proxyPassword: "",
    dnsServers: ["8.8.8.8", "114.114.114.114"],
    etcHosts: [],
    EnableHostsMappingBeforeDownstreamProxy: false,
    filterWebsocket: false,
    disableCACertPage: false,
    DisableSystemProxy: false,
    DisableWebsocketCompression: false,
    PluginConcurrency: 20,
    OverwriteSNI: false,
    SNI: "",
    SNIMapping: [{Key: '', Value: ''}]
}
const MITMFormAdvancedConfiguration: React.FC<MITMFormAdvancedConfigurationProps> = React.memo(
    React.forwardRef((props, ref) => {
        const {visible, setVisible, onSave, enableGMTLS} = props
        const {t, i18n} = useI18nNamespaces(["webFuzzer","mitm", "yakitUi"])
        const [certs, setCerts] = useState<ClientCertificate[]>([])

        // 保存初始默认值
        const defFieldsRef = useRef<AdvancedConfigurationFromValue>(cloneDeep(DefFieldsVal))
        const [etcHosts, setEtcHosts] = useState<any[]>([])
        const [certificateFormVisible, setCertificateFormVisible] = useState<boolean>(false)
        const [filtersVisible, setFiltersVisible] = useState<boolean>(false)

        const [downloadVisible, setDownloadVisible] = useState<boolean>(false)
        const [form] = Form.useForm()
        const enableProxyAuth = useWatch<boolean>("enableProxyAuth", form)
        const overwriteSNI = useWatch("OverwriteSNI", form)
        const tableRef = useRef<HTMLDivElement>(null);
        

        const getValue = useMemoizedFn(() => {
            const v = form.getFieldsValue()
            if (Object.keys(v).length > 0) {
                return {...v, etcHosts}
            } else {
                return {
                    certs: defFieldsRef.current.certs,
                    etcHosts: defFieldsRef.current.etcHosts,
                    preferGMTLS: defFieldsRef.current.preferGMTLS,
                    onlyEnableGMTLS: defFieldsRef.current.onlyEnableGMTLS,
                    enableProxyAuth: defFieldsRef.current.enableProxyAuth,
                    dnsServers: defFieldsRef.current.dnsServers,
                    proxyUsername: defFieldsRef.current.enableProxyAuth ? defFieldsRef.current.proxyUsername : "",
                    proxyPassword: defFieldsRef.current.enableProxyAuth ? defFieldsRef.current.proxyPassword : "",
                    EnableHostsMappingBeforeDownstreamProxy:
                        defFieldsRef.current.EnableHostsMappingBeforeDownstreamProxy,
                    filterWebsocket: defFieldsRef.current.filterWebsocket,
                    disableCACertPage: defFieldsRef.current.disableCACertPage,
                    DisableSystemProxy: defFieldsRef.current.DisableSystemProxy,
                    DisableWebsocketCompression: defFieldsRef.current.DisableWebsocketCompression,
                    PluginConcurrency: defFieldsRef.current.PluginConcurrency,
                    OverwriteSNI: defFieldsRef.current.OverwriteSNI,
                    SNI: defFieldsRef.current.SNI,
                    SNIMapping: defFieldsRef.current.SNIMapping,
                }
            }
        })

        useImperativeHandle(
            ref,
            () => ({
                getValue
            }),
            [getValue]
        )

        useEffect(() => {
            defFieldsRef.current = cloneDeep(DefFieldsVal)
            // 证书
            getRemoteValue(MITMConsts.MITMDefaultClientCertificates).then((e) => {
                if (!!e) {
                    try {
                        const certsRaw = JSONParseLog(e, {page: "MITMFormAdvancedConfiguration", fun: "MITMDefaultClientCertificates"}) as ClientCertificate[]
                        defFieldsRef.current.certs = certsRaw
                    } catch (e) {
                        setCerts([])
                    }
                } else {
                    setCerts([])
                }
            })
            // 国密TLS优先
            getRemoteValue(MITMConsts.MITMDefaultPreferGMTLS).then((e) => {
                const v = e === "true" ? true : false
                defFieldsRef.current.preferGMTLS = v
                form.setFieldsValue({preferGMTLS: v})
            })
            // 仅国密 TLS
            getRemoteValue(MITMConsts.MITMDefaultOnlyEnableGMTLS).then((e) => {
                const v = e === "true" ? true : false
                defFieldsRef.current.onlyEnableGMTLS = v
                form.setFieldsValue({onlyEnableGMTLS: v})
            })
            // 代理认证
            getRemoteValue(MITMConsts.MITMDefaultEnableProxyAuth).then((e) => {
                const v = e === "true" ? true : false
                defFieldsRef.current.enableProxyAuth = v
                form.setFieldsValue({enableProxyAuth: v})
            })
            // 代理认证用户名
            getRemoteValue(MITMConsts.MITMDefaultProxyUsername).then((e) => {
                defFieldsRef.current.proxyUsername = e
                form.setFieldsValue({proxyUsername: e})
            })
            // 代理认证用户密码
            getRemoteValue(MITMConsts.MITMDefaultProxyPassword).then((e) => {
                defFieldsRef.current.proxyPassword = e
                form.setFieldsValue({proxyPassword: e})
            })
            // DNS服务器
            getRemoteValue(MITMConsts.MITMDefaultDnsServers).then((e) => {
                if (!!e) {
                    const dnsServers = JSON.parse(e)
                    defFieldsRef.current.dnsServers = dnsServers
                    form.setFieldsValue({dnsServers})
                }
            })
            // Host配置
            getRemoteValue(MITMConsts.MITMDefaultEtcHosts).then((e) => {
                if (!!e) {
                    const etcHosts = JSON.parse(e)
                    defFieldsRef.current.etcHosts = etcHosts
                    setEtcHosts(etcHosts)
                    form.setFieldsValue({etcHosts})
                }
            })
            // Hosts映射优先
            getRemoteValue(RemoteGV.MITMEnableHostsMappingBeforeDownstreamProxy).then((e) => {
                const v = e === "true" ? true : false
                defFieldsRef.current.EnableHostsMappingBeforeDownstreamProxy = v
                form.setFieldsValue({EnableHostsMappingBeforeDownstreamProxy: v})
            })
            // 过滤WebSocket
            getRemoteValue(MITMConsts.MITMDefaultFilterWebsocket).then((e) => {
                const v = e === "true" ? true : false
                defFieldsRef.current.filterWebsocket = v
                form.setFieldsValue({filterWebsocket: v})
            })
            // 禁用初始页
            getRemoteValue(RemoteGV.MITMDisableCACertPage).then((e) => {
                const v = e === "true" ? true : false
                defFieldsRef.current.disableCACertPage = v
                form.setFieldsValue({disableCACertPage: v})
            })
            // 禁用系统代理
            getRemoteValue(RemoteGV.MITMDisableSystemProxy).then((e) => {
                const v = e === "true" ? true : false
                defFieldsRef.current.DisableSystemProxy = v
                form.setFieldsValue({DisableSystemProxy: v})
            })
            // 启用webSocket压缩
            getRemoteValue(RemoteGV.MITMDisableWebsocketCompression).then((e) => {
                let v = true
                if (e) {
                    v = e === "true" ? true : false
                }
                defFieldsRef.current.DisableWebsocketCompression = v
                form.setFieldsValue({DisableWebsocketCompression: v})
            })
            // 插件并发进程
            getRemoteValue(RemoteGV.MITMPluginConcurrency).then((e) => {
                let v = 20
                if (e) {
                    v = Number(e)
                }
                defFieldsRef.current.PluginConcurrency = v
                form.setFieldsValue({PluginConcurrency: v})
            })
            // SNI
            getRemoteValue(RemoteMitmGV.MitmSNI).then((e) => {
                try {
                    const { OverwriteSNI = false, SNI = '', SNIMapping = [{Key:'', Value: ''}]  } = JSON.parse(e)
                    const overwriteSNIValue = typeof OverwriteSNI === 'boolean' ? OverwriteSNI : OverwriteSNI === 'true'
                    defFieldsRef.current.OverwriteSNI = overwriteSNIValue
                    defFieldsRef.current.SNI = SNI
                    defFieldsRef.current.SNIMapping = SNIMapping
                    form.setFieldsValue({
                        OverwriteSNI: overwriteSNIValue,
                        SNI,
                        SNIMapping
                    })
                } catch {
                }
            })
        }, [visible])
        /**
         * @description 单个导出证书
         */
        const onExportCerts = useMemoizedFn((item: ClientCertificate) => {
            const exportData = {
                ...item,
                CrtPem: Uint8ArrayToString(item.CrtPem),
                KeyPem: Uint8ArrayToString(item.KeyPem),
                CaCertificates:
                    item.CaCertificates && item.CaCertificates.length > 0
                        ? Uint8ArrayToString(item.CaCertificates[0])
                        : ""
            }
            saveABSFileToOpen(`${item.CerName}-证书.json`, JSON.stringify(exportData))
        })
        /**
         * @description 批量导出证书
         */
        const onBatchExportCerts = useMemoizedFn(() => {
            const newCerts = certs.map((item) => ({
                ...item,
                CrtPem: Uint8ArrayToString(item.CrtPem),
                KeyPem: Uint8ArrayToString(item.KeyPem),
                CaCertificates:
                    item.CaCertificates && item.CaCertificates.length > 0
                        ? Uint8ArrayToString(item.CaCertificates[0])
                        : ""
            }))
            saveABSFileToOpen(`TLS-证书.json`, JSON.stringify(newCerts))
        })
        const onImportCerts = useMemoizedFn((file: any) => {
            ipcRenderer.invoke("fetch-file-content", file.path).then((value) => {
                try {
                    const values = JSON.parse(value)
                    const certList: ClientCertificate[] = []
                    for (let index = 0; index < values.length; index++) {
                        const item = values[index]
                        if (!item.CrtPem) {
                            yakitFailed(t("MITMFormAdvancedConfiguration.clientCertPemError"))
                            break
                        }
                        if (!item.KeyPem) {
                            yakitFailed(t("MITMFormAdvancedConfiguration.clientKeyPemError"))
                            break
                        }
                        const newItem: ClientCertificate = {
                            CerName: item.CerName || t("MITMFormAdvancedConfiguration.certificateName", {index}),
                            CrtPem: StringToUint8Array(item.CrtPem as any) as unknown as Uint8Array,
                            KeyPem: StringToUint8Array(item.KeyPem as any) as unknown as Uint8Array,
                            CaCertificates:
                                item.CaCertificates && item.CaCertificates.length > 0
                                    ? [StringToUint8Array(item.CaCertificates[0] || "") as unknown as Uint8Array]
                                    : []
                        }
                        certList.push(newItem)
                    }

                    setCerts(certList)
                } catch (error) {
                    yakitFailed(t("MITMFormAdvancedConfiguration.dataFormatError"))
                }
            })
        })
        /**
         * @description 保存高级配置
         */
        const onSaveSetting = useMemoizedFn(() => {
            form.validateFields().then((formValue) => {
                const params: AdvancedConfigurationFromValue = {
                    ...formValue,
                    certs,
                    etcHosts,
                    SNIMapping: formValue.SNIMapping || defFieldsRef.current.SNIMapping
                }
                setRemoteValue(MITMConsts.MITMDefaultClientCertificates, JSON.stringify(certs))
                setRemoteValue(MITMConsts.MITMDefaultPreferGMTLS, `${params.preferGMTLS}`)
                setRemoteValue(MITMConsts.MITMDefaultOnlyEnableGMTLS, `${params.onlyEnableGMTLS}`)
                setRemoteValue(MITMConsts.MITMDefaultEnableProxyAuth, `${params.enableProxyAuth}`)
                setRemoteValue(MITMConsts.MITMDefaultProxyUsername, params.proxyUsername)
                setRemoteValue(MITMConsts.MITMDefaultProxyPassword, params.proxyPassword)
                setRemoteValue(MITMConsts.MITMDefaultDnsServers, JSON.stringify(params.dnsServers))
                setRemoteValue(MITMConsts.MITMDefaultEtcHosts, JSON.stringify(etcHosts))
                setRemoteValue(
                    RemoteGV.MITMEnableHostsMappingBeforeDownstreamProxy,
                    params.EnableHostsMappingBeforeDownstreamProxy ? "true" : ""
                )
                setRemoteValue(MITMConsts.MITMDefaultFilterWebsocket, `${params.filterWebsocket}`)
                setRemoteValue(RemoteGV.MITMDisableCACertPage, params.disableCACertPage ? "true" : "")
                setRemoteValue(RemoteGV.MITMDisableSystemProxy, params.DisableSystemProxy ? "true" : "")
                setRemoteValue(RemoteGV.MITMDisableWebsocketCompression, params.DisableWebsocketCompression + "")
                setRemoteValue(RemoteGV.MITMPluginConcurrency, params.PluginConcurrency + "")
                setRemoteValue(
                    RemoteMitmGV.MitmSNI,
                    JSON.stringify({OverwriteSNI: params.OverwriteSNI, SNI: params.SNI, SNIMapping: params.SNIMapping})
                )
                onSave(params)
            })
        })
        const onClose = useMemoizedFn((jumpPage?: boolean) => {
            const formValue = form.getFieldsValue()
            const oldValue: any = {
                certs: defFieldsRef.current.certs,
                dnsServers: defFieldsRef.current.dnsServers,
                etcHosts: defFieldsRef.current.etcHosts,
                EnableHostsMappingBeforeDownstreamProxy: defFieldsRef.current.EnableHostsMappingBeforeDownstreamProxy,
                enableProxyAuth: defFieldsRef.current.enableProxyAuth,
                filterWebsocket: defFieldsRef.current.filterWebsocket,
                disableCACertPage: defFieldsRef.current.disableCACertPage,
                DisableSystemProxy: defFieldsRef.current.DisableSystemProxy,
                DisableWebsocketCompression: defFieldsRef.current.DisableWebsocketCompression,
                PluginConcurrency: defFieldsRef.current.PluginConcurrency,
                proxyUsername: defFieldsRef.current.proxyUsername,
                proxyPassword: defFieldsRef.current.proxyPassword,
                OverwriteSNI: defFieldsRef.current.OverwriteSNI,
                SNI: defFieldsRef.current.SNI,
                SNIMapping: defFieldsRef.current.SNIMapping,
            }
            if (enableGMTLS) {
                oldValue.preferGMTLS = defFieldsRef.current.preferGMTLS
                oldValue.onlyEnableGMTLS = defFieldsRef.current.onlyEnableGMTLS
            }
            const newValue = {
                certs,
                ...formValue,
                proxyUsername: formValue.proxyUsername || "",
                proxyPassword: formValue.proxyPassword || "",
                etcHosts,
                SNI: formValue.OverwriteSNI ? formValue.SNI : ""
            }
            if (!isEqual(oldValue, newValue)) {
                Modal.confirm({
                    title: t("MITMFormAdvancedConfiguration.friendlyReminder"),
                    icon: <ExclamationCircleOutlined />,
                    content: t("MITMFormAdvancedConfiguration.saveAndCloseConfirm"),
                    okText: t("MITMFormAdvancedConfiguration.save"),
                    cancelText: t("MITMFormAdvancedConfiguration.dontSave"),
                    closable: true,
                    closeIcon: (
                        <div
                            onClick={(e) => {
                                e.stopPropagation()
                                Modal.destroyAll()
                            }}
                            className='modal-remove-icon'
                        >
                            <RemoveIcon />
                        </div>
                    ),
                    onOk: () => {
                        onSaveSetting()
                        jumpPage && ipcRenderer.invoke("open-route-page", {route: YakitRoute.Beta_ConfigNetwork})
                    },
                    onCancel: () => {
                        setVisible(false)
                        jumpPage && ipcRenderer.invoke("open-route-page", {route: YakitRoute.Beta_ConfigNetwork})
                    },
                    cancelButtonProps: {size: "small", className: "modal-cancel-button"},
                    okButtonProps: {size: "small", className: "modal-ok-button"}
                })
            } else {
                setVisible(false)
                jumpPage && ipcRenderer.invoke("open-route-page", {route: YakitRoute.Beta_ConfigNetwork})
            }
        })

        return (
            <YakitDrawer
                className={styles["advanced-configuration-drawer"]}
                visible={visible}
                onClose={() => onClose()}
                width='40%'
                title={
                    <div className={styles["advanced-configuration-drawer-title"]}>
                        <div className={styles["advanced-configuration-drawer-title-text"]}>{t("MITMFormAdvancedConfiguration.advancedConfig")}</div>
                        <div className={styles["advanced-configuration-drawer-title-btns"]}>
                            <YakitButton
                                type='outline2'
                                onClick={() => {
                                    setVisible(false)
                                }}
                            >
                                {t("MITMFormAdvancedConfiguration.cancel")}
                            </YakitButton>
                            <YakitButton type='primary' onClick={() => onSaveSetting()}>
                                {t("MITMFormAdvancedConfiguration.save")}
                            </YakitButton>
                        </div>
                    </div>
                }
                maskClosable={false}
            >
                <Form labelCol={{span: 6}} wrapperCol={{span: 18}} form={form}>
                    <Form.Item
                        label={t("MITMFormAdvancedConfiguration.dnsServer")}
                        name='dnsServers'
                        help={t("MITMFormAdvancedConfiguration.specifyDnsServer")}
                        initialValue={["8.8.8.8", "114.114.114.114"]}
                    >
                        <YakitSelect
                            options={["8.8.8.8", "8.8.4.4", "1.1.1.1", "1.0.0.1"].map((i) => {
                                return {value: i, label: i}
                            })}
                            allowClear
                            mode='tags'
                            placeholder={t("MITMFormAdvancedConfiguration.dnsExample")}
                        />
                    </Form.Item>
                    <Form.Item label={t("MITMFormAdvancedConfiguration.hostsConfig")} name='etcHosts'>
                        <div className={styles["etcHosts-btns"]}>
                            <YakitButton
                                onClick={() => {
                                    inputHTTPFuzzerHostConfigItem((obj) => {
                                        setEtcHosts([...etcHosts.filter((i) => i.Key !== obj.Key), obj])
                                    },
                                    // 批量添加
                                    (items) => {
                                        const newKeys = items.map(({Key})=>Key);
                                        let newEtcHosts = [
                                            ...etcHosts.filter(({ Key }) => !newKeys.includes(Key)),
                                            ...items
                                        ]
                                        setEtcHosts(newEtcHosts)
                                    })
                                }}
                            >
                                {t("MITMFormAdvancedConfiguration.addHostsMapping")}
                            </YakitButton>
                            {!!etcHosts.length && <YakitButton
                                type='text' 
                                danger
                                onClick={() => setEtcHosts([])}
                            >
                               {t("YakitButton.reset")}
                            </YakitButton>}
                        </div>
                        <div className={classNames({[styles["etcHosts-config"]]: !!etcHosts.length })}>
                            {etcHosts.map((i, n) => (
                                <YakitTag
                                    closable={true}
                                    onClose={() => {
                                        setEtcHosts(etcHosts.filter((j) => j.Key !== i.Key))
                                    }}
                                    key={`${i.Key}-${n}`}
                                >
                                    {`${i.Key} => ${i.Value}`}
                                </YakitTag>
                            ))}
                        </div>
                    </Form.Item>
                    <Form.Item
                        label={t("AdvancedConfiguration.hosts_mapping_priority")}
                        name='EnableHostsMappingBeforeDownstreamProxy'
                        valuePropName='checked'
                        help={t("AdvancedConfiguration.hosts_mapping_priority_help")}
                    >
                        <YakitSwitch size='large' />
                    </Form.Item>
                    <Form.Item
                        label={t("HttpQueryAdvancedConfig.disable_system_proxy")}
                        name='DisableSystemProxy'
                        valuePropName='checked'
                    >
                        <YakitSwitch size='large' />
                    </Form.Item>
                    {enableGMTLS && (
                        <>
                            <Form.Item
                                label={t("MITMFormAdvancedConfiguration.gmTLSFirst")}
                                name='preferGMTLS'
                                help={
                                    t("MITMFormAdvancedConfiguration.gmTLSFirstHelp")
                                }
                                valuePropName='checked'
                            >
                                <YakitSwitch size='large' />
                            </Form.Item>
                            <Form.Item
                                label={t("MITMFormAdvancedConfiguration.gmTLSOnly")}
                                name='onlyEnableGMTLS'
                                help={t("MITMFormAdvancedConfiguration.gmTLSOnlyHelp")}
                                valuePropName='checked'
                            >
                                <YakitSwitch size='large' />
                            </Form.Item>
                        </>
                    )}
                    <Form.Item
                        label={t("MITMFormAdvancedConfiguration.proxyAuth")}
                        name='enableProxyAuth'
                        help={t("MITMFormAdvancedConfiguration.proxyAuthHelp")}
                        valuePropName='checked'
                    >
                        <YakitSwitch size='large' />
                    </Form.Item>
                    {enableProxyAuth && (
                        <>
                            <Form.Item
                                label={t("MITMFormAdvancedConfiguration.proxyAuthUsername")}
                                rules={[{required: enableProxyAuth, message: t("MITMFormAdvancedConfiguration.requiredItem")}]}
                                name='proxyUsername'
                            >
                                <YakitAutoComplete options={[{label: "admin", value: "admin"}]} placeholder={t("MITMFormAdvancedConfiguration.pleaseEnter")} />
                            </Form.Item>
                            <Form.Item
                                label={t("MITMFormAdvancedConfiguration.proxyAuthPassword")}
                                rules={[{required: enableProxyAuth, message: t("MITMFormAdvancedConfiguration.requiredItem")}]}
                                name='proxyPassword'
                            >
                                <YakitInput placeholder={t("MITMFormAdvancedConfiguration.pleaseEnter")} />
                            </Form.Item>
                        </>
                    )}
                    <Form.Item label={t("MITMFormAdvancedConfiguration.filterWebsocket")} name='filterWebsocket' valuePropName='checked'>
                        <YakitSwitch size='large' />
                    </Form.Item>
                    <Form.Item
                        label={t("MITMFormAdvancedConfiguration.disableInitPage")}
                        name='disableCACertPage'
                        valuePropName='checked'
                        help={t("MITMFormAdvancedConfiguration.disableInitPageHelp")}
                    >
                        <YakitSwitch size='large' />
                    </Form.Item>
                    <Form.Item label={t("MITMFormAdvancedConfiguration.enableWebsocketCompression")} name='DisableWebsocketCompression' valuePropName='checked'>
                        <YakitSwitch size='large' />
                    </Form.Item>
                    <Form.Item label={t("MITMFormAdvancedConfiguration.pluginConcurrency")} name='PluginConcurrency' style={{marginBottom: 12}}>
                        <YakitInputNumber type='horizontal' size='small' min={1} defaultValue={20} />
                    </Form.Item>
                    <Form.Item label={t("AdvancedConfiguration.sni_config")} className={styles["sni-rules"]}>
                        <Form.List name='SNIMapping'>
                            {(fields, {add, remove}) => (
                                <>
                                    <div className={styles["sni-rules-header"]}>
                                        <YakitButton
                                            type='text'
                                            icon={<PlusCircleIcon />}
                                            style={{paddingLeft: 0}}
                                            onClick={() => {
                                                const snimapping = form.getFieldValue("SNIMapping") || [];
                                                if (snimapping.length > 0) {
                                                    const { Key, Value } = snimapping[snimapping.length - 1];
                                                    if (!Key && !Value) {
                                                        yakitFailed(t("MITMFormAdvancedConfiguration.setBeforeAdd"));
                                                        return;
                                                    }
                                                }
                                                add({Key: "", Value: ""})
                                                setTimeout(() => {
                                                    if (tableRef.current) {
                                                        tableRef.current.scrollTop = tableRef.current.scrollHeight;
                                                    }
                                                }, 100);
                                            }}
                                        >
                                            {t("YakitButton.add")}
                                        </YakitButton>
                                        <Divider type='vertical' style={{ margin: 0 }}/>
                                        <YakitButton
                                            type='text' 
                                            danger
                                            onClick={() => {
                                                form.setFieldsValue({SNIMapping: [{Key: "", Value: ""}]})
                                            }}
                                        >
                                            {t("YakitButton.reset")}
                                        </YakitButton>
                                    </div>
                                    <div ref={tableRef} className={styles["sni-rules-table"]}>
                                        <div className={styles["table-header"]}>
                                            <div className={styles["header-cell"]}>{t("AdvancedConfiguration.host_rules")}</div>
                                            <div className={styles["header-cell"]}>{t("AdvancedConfiguration.SNI_value")}</div>
                                        </div>
                                        {fields.map((field) => (
                                            <div key={field.key} className={styles["table-row"]}>
                                                <div className={styles["table-cell"]}>
                                                    <Form.Item
                                                        {...field}
                                                        name={[field.name, "Key"]}
                                                        style={{marginBottom: 0}}
                                                    >
                                                        <YakitInput
                                                            placeholder='*.example.com'
                                                            size='small'
                                                            style={{width: "100%"}}
                                                        />
                                                    </Form.Item>
                                                </div>
                                                <div className={styles["table-cell"]}>
                                                    <Form.Item
                                                        {...field}
                                                        name={[field.name, "Value"]}
                                                        style={{marginBottom: 0, flex: 1}}
                                                    >
                                                        <YakitInput
                                                            placeholder={`[${t("AdvancedConfiguration.SNI_extra")}]`}
                                                            size='small'
                                                            style={{width: "100%"}}
                                                        />
                                                    </Form.Item>
                                                    <YakitButton
                                                        type='text'
                                                        icon={<TrashIcon />}
                                                        onClick={() => remove(field.name)}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </Form.List>
                        <div className={styles["sni-force-row"]}>
                            <Form.Item name='OverwriteSNI' valuePropName='checked' style={{marginBottom: 0}}>
                                <YakitCheckbox>{t("AdvancedConfiguration.mandatory_SNI")}</YakitCheckbox>
                            </Form.Item>
                            {overwriteSNI && (
                                <Form.Item name='SNI' style={{marginBottom: 0}} extra={t("AdvancedConfiguration.SNI_extra")}>
                                    <YakitInput 
                                        size='small' 
                                        placeholder='[cdn.cloudflare.com]'
                                        className={styles["sni-input"]}
                                    />
                                </Form.Item>
                            )}
                        </div>
                    </Form.Item>
                     <Form.Item label={t("MITMFormAdvancedConfiguration.clientTlsImport")} className={styles["advanced-configuration-drawer-TLS"]}>
                        <div className={styles["drawer-TLS-item"]}>
                            <YakitButton
                                type='text'
                                icon={<PlusCircleIcon />}
                                onClick={() => {
                                    onClose(true)
                                    // setCertificateFormVisible(true)
                                }}
                                style={{paddingLeft: 0}}
                            >
                                {t("MITMFormAdvancedConfiguration.add")}
                            </YakitButton>
                            {/* <div className={styles["drawer-TLS-btns"]}>
                                <YakitButton
                                    type='text'
                                    colors={certs.length > 0 ? "danger" : undefined}
                                    disabled={certs.length === 0}
                                    onClick={() => setCerts([])}
                                >
                                    {t("MITMFormAdvancedConfiguration.clear")}
                                </YakitButton>
                                <Divider type='vertical' style={{margin: "0 4px"}} />
                                <Upload
                                    multiple={false}
                                    maxCount={1}
                                    showUploadList={false}
                                    beforeUpload={(f: any) => onImportCerts(f)}
                                >
                                    <YakitButton type='text' icon={<SaveIcon />}>
                                        {t("MITMFormAdvancedConfiguration.importConfig")}
                                    </YakitButton>
                                </Upload>

                                <Divider type='vertical' style={{margin: "0 4px"}} />
                                <YakitButton
                                    type='text'
                                    icon={<ExportIcon />}
                                    disabled={certs.length === 0}
                                    onClick={() => onBatchExportCerts()}
                                >
                                    {t("MITMFormAdvancedConfiguration.exportConfig")}
                                </YakitButton>
                            </div> */}
                        </div>
                        <div className={styles["drawer-TLS-help"]}>
                            {t("MITMFormAdvancedConfiguration.mtlsHelp")}
                        </div>
                        <div className={styles["drawer-TLS-certs"]}>
                            {certs.map((item) => (
                                <div className={styles["drawer-TLS-certs-item"]}>
                                    <div
                                        className={classNames(styles["drawer-TLS-certs-item-name"], "content-ellipsis")}
                                    >
                                        {item.CerName}
                                    </div>
                                    <div className={styles["drawer-TLS-certs-item-operate"]}>
                                        <TrashIcon
                                            className={styles["trash-icon"]}
                                            onClick={() => {
                                                setCerts(certs.filter((ele) => ele.CerName !== item.CerName))
                                            }}
                                        />
                                        <Divider type='vertical' style={{margin: "0 8px"}} />
                                        <ExportIcon
                                            className={styles["export-icon"]}
                                            onClick={() => onExportCerts(item)}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                        <Divider dashed style={{margin: "16px 0"}} />
                        <div>
                            <YakitButton type='text' style={{paddingLeft: 0}} onClick={() => setFiltersVisible(true)}>
                                {t("MITMFormAdvancedConfiguration.filters")}
                            </YakitButton>
                            <Divider type='vertical' style={{margin: "0 4px"}} />
                            <YakitButton type='text' onClick={() => setDownloadVisible(true)}>
                                {t("MITMFormAdvancedConfiguration.certificateDownload")}
                            </YakitButton>
                        </div>
                    </Form.Item>
                </Form>
                <React.Suspense fallback={<div>loading...</div>}>
                    <MITMAddTLS
                        visible={certificateFormVisible}
                        setVisible={setCertificateFormVisible}
                        certs={certs}
                        setCerts={setCerts}
                    />
                    <MITMFiltersModal
                        filterType='filter'
                        visible={filtersVisible}
                        setVisible={setFiltersVisible}
                        isStartMITM={false}
                    />
                    <MITMCertificateDownloadModal visible={downloadVisible} setVisible={setDownloadVisible} />
                </React.Suspense>
            </YakitDrawer>
        )
    })
)

export default MITMFormAdvancedConfiguration
