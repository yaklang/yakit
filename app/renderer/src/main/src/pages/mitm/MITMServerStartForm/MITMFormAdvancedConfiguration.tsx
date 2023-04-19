import React, {useEffect, useImperativeHandle, useRef, useState} from "react"
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
import {Divider, Form, Modal, Upload} from "antd"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {ExportIcon, PlusCircleIcon, RemoveIcon, SaveIcon, TrashIcon} from "@/assets/newIcon"
import {ExclamationCircleOutlined} from "@ant-design/icons"
import {YakitSwitch} from "@/components/yakitUI/YakitSwitch/YakitSwitch"

const MITMAddTLS = React.lazy(() => import("./MITMAddTLS"))
const MITMFiltersModal = React.lazy(() => import("./MITMFiltersModal"))
const MITMCertificateDownloadModal = React.lazy(() => import("./MITMCertificateDownloadModal"))

const {ipcRenderer} = window.require("electron")

interface MITMFormAdvancedConfigurationProps {
    visible: boolean
    setVisible: (b: boolean) => void
    onSave: (v: AdvancedConfigurationFromValue) => void
    enableGMTLS: boolean
}
export interface AdvancedConfigurationFromValue {
    certs: ClientCertificate[]
    preferGMTLS: boolean
    onlyEnableGMTLS: boolean
}
const MITMFormAdvancedConfiguration: React.FC<MITMFormAdvancedConfigurationProps> = React.memo((props) => {
    const {visible, setVisible, onSave, enableGMTLS} = props
    const [certs, setCerts] = useState<ClientCertificate[]>([])

    // 保存初始默认值
    const [certsDef, setCertsDef] = useState<ClientCertificate[]>([]) // 用来判断是否修改了 certs 这个值
    // const [downstreamProxyDef, setDownstreamProxyDef] = useState<string>("") // 用来判断是否修改了 downstreamProxy 这个值
    const [preferGMTLSDef, setPreferGMTLSDef] = useState<boolean>(false)
    const [onlyEnableGMTLS, setOnlyEnableGMTLS] = useState<boolean>(false)

    const [certificateFormVisible, setCertificateFormVisible] = useState<boolean>(false)
    const [filtersVisible, setFiltersVisible] = useState<boolean>(false)

    const [downloadVisible, setDownloadVisible] = useState<boolean>(false)

    const [form] = Form.useForm()

    useEffect(() => {
        getRemoteValue(MITMConsts.MITMDefaultClientCertificates).then((e) => {
            if (!!e) {
                try {
                    const certsRaw = JSON.parse(e) as ClientCertificate[]
                    setCertsDef(certsRaw)
                } catch (e) {
                    setCerts([])
                }
            } else {
                setCerts([])
            }
        })
        getRemoteValue(MITMConsts.MITMDefaultPreferGMTLS).then((e) => {
            const v = e === "true" ? true : false
            setPreferGMTLSDef(v)
            form.setFieldsValue({preferGMTLS: v})
        })
        getRemoteValue(MITMConsts.MITMDefaultOnlyEnableGMTLS).then((e) => {
            const v = e === "true" ? true : false
            setOnlyEnableGMTLS(v)
            form.setFieldsValue({onlyEnableGMTLS: v})
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
                item.CaCertificates && item.CaCertificates.length > 0 ? Uint8ArrayToString(item.CaCertificates[0]) : ""
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
                item.CaCertificates && item.CaCertificates.length > 0 ? Uint8ArrayToString(item.CaCertificates[0]) : ""
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
                        yakitFailed("客户端证书(PEM)异常")
                        break
                    }
                    if (!item.KeyPem) {
                        yakitFailed("客户端私钥(PEM)异常")
                        break
                    }
                    const newItem: ClientCertificate = {
                        CerName: item.CerName || `证书${index}`,
                        CrtPem: StringToUint8Array(item.CrtPem),
                        KeyPem: StringToUint8Array(item.KeyPem),
                        CaCertificates:
                            item.CaCertificates && item.CaCertificates.length > 0
                                ? [StringToUint8Array(item.CaCertificates)]
                                : []
                    }
                    certList.push(newItem)
                }

                setCerts(certList)
            } catch (error) {
                yakitFailed("数据格式异常")
            }
        })
    })
    /**
     * @description 保存高级配置
     */
    const onSaveSetting = useMemoizedFn(() => {
        const formValue = form.getFieldsValue()
        const params: AdvancedConfigurationFromValue = {
            ...formValue,
            certs
        }
        setRemoteValue(MITMConsts.MITMDefaultClientCertificates, JSON.stringify(certs))
        setRemoteValue(MITMConsts.MITMDefaultPreferGMTLS, `${params.preferGMTLS}`)
        setRemoteValue(MITMConsts.MITMDefaultOnlyEnableGMTLS, `${params.onlyEnableGMTLS}`)
        onSave(params)
    })
    const onClose = useMemoizedFn(() => {
        const formValue = form.getFieldsValue()
        const oldValue = {
            certs: certsDef,
            preferGMTLS: preferGMTLSDef,
            onlyEnableGMTLS: onlyEnableGMTLS
        }
        const newValue = {
            certs,
            ...formValue
        }
        if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
            Modal.confirm({
                title: "温馨提示",
                icon: <ExclamationCircleOutlined />,
                content: "请问是否要保存高级配置并关闭弹框？",
                okText: "保存",
                cancelText: "不保存",
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
                },
                onCancel: () => {
                    setVisible(false)
                },
                cancelButtonProps: {size: "small", className: "modal-cancel-button"},
                okButtonProps: {size: "small", className: "modal-ok-button"}
            })
        } else {
            setVisible(false)
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
                    <div className={styles["advanced-configuration-drawer-title-text"]}>高级配置</div>
                    <div className={styles["advanced-configuration-drawer-title-btns"]}>
                        <YakitButton
                            type='outline2'
                            onClick={() => {
                                setVisible(false)
                            }}
                        >
                            取消
                        </YakitButton>
                        <YakitButton type='primary' onClick={() => onSaveSetting()}>
                            保存
                        </YakitButton>
                    </div>
                </div>
            }
            maskClosable={false}
        >
            <Form labelCol={{span: 6}} wrapperCol={{span: 18}} form={form}>
                {enableGMTLS && (
                    <>
                        <Form.Item
                            label={"国密TLS优先"}
                            name='preferGMTLS'
                            help={"启用此选项将优先选择国密TLS，当连接失败后，自动降级为普通 TLS，关闭后优先普通 TLS"}
                            valuePropName='checked'
                        >
                            <YakitSwitch size='large' />
                        </Form.Item>
                        <Form.Item
                            label={"仅国密 TLS"}
                            name='onlyEnableGMTLS'
                            help={"此选项开启后，将不支持除国密算法的 TLS 外其安全传输层"}
                            valuePropName='checked'
                        >
                            <YakitSwitch size='large' />
                        </Form.Item>
                    </>
                )}
                <Form.Item label='客户端 TLS 导入' className={styles["advanced-configuration-drawer-TLS"]}>
                    <div className={styles["drawer-TLS-item"]}>
                        <YakitButton
                            type='text'
                            icon={<PlusCircleIcon />}
                            onClick={() => setCertificateFormVisible(true)}
                            style={{paddingLeft: 0}}
                        >
                            添加
                        </YakitButton>
                        <div className={styles["drawer-TLS-btns"]}>
                            <YakitButton
                                type='text'
                                disabled={certs.length === 0}
                                style={{color: certs.length > 0 ? "var(--yakit-danger-5)" : ""}}
                                onClick={() => setCerts([])}
                            >
                                清除
                            </YakitButton>
                            <Divider type='vertical' style={{margin: "0 4px"}} />
                            <Upload
                                multiple={false}
                                maxCount={1}
                                showUploadList={false}
                                beforeUpload={(f: any) => onImportCerts(f)}
                            >
                                <YakitButton type='text' icon={<SaveIcon />}>
                                    导入配置
                                </YakitButton>
                            </Upload>

                            <Divider type='vertical' style={{margin: "0 4px"}} />
                            <YakitButton
                                type='text'
                                icon={<ExportIcon />}
                                disabled={certs.length === 0}
                                onClick={() => onBatchExportCerts()}
                            >
                                导出配置
                            </YakitButton>
                        </div>
                    </div>
                    <div className={styles["drawer-TLS-help"]}>
                        用于 mTLS（Mutual TLS）开启客户端验证的 HTTPS 网站抓包
                    </div>
                    <div className={styles["drawer-TLS-certs"]}>
                        {certs.map((item) => (
                            <div className={styles["drawer-TLS-certs-item"]}>
                                <div className={classNames(styles["drawer-TLS-certs-item-name"], "content-ellipsis")}>
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
                                    <ExportIcon className={styles["export-icon"]} onClick={() => onExportCerts(item)} />
                                </div>
                            </div>
                        ))}
                    </div>
                    <Divider dashed style={{margin: "16px 0"}} />
                    <div>
                        <YakitButton type='text' style={{paddingLeft: 0}} onClick={() => setFiltersVisible(true)}>
                            过滤器
                        </YakitButton>
                        <Divider type='vertical' style={{margin: "0 4px"}} />
                        <YakitButton type='text' onClick={() => setDownloadVisible(true)}>
                            证书下载
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
                <MITMFiltersModal visible={filtersVisible} setVisible={setFiltersVisible} isStartMITM={false} />
                <MITMCertificateDownloadModal visible={downloadVisible} setVisible={setDownloadVisible} />
            </React.Suspense>
        </YakitDrawer>
    )
})

export default MITMFormAdvancedConfiguration
