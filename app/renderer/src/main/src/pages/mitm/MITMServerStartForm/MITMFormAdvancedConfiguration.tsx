import React, {useEffect, useImperativeHandle, useRef, useState} from "react"
import classNames from "classnames"
import styles from "./MITMServerStartForm.module.scss"
import {ClientCertificate} from "./MITMServerStartForm"
import {getRemoteValue} from "@/utils/kv"
import {MITMConsts} from "../MITMConsts"
import {useMemoizedFn} from "ahooks"
import {StringToUint8Array, Uint8ArrayToString} from "@/utils/str"
import {saveABSFileToOpen} from "@/utils/openWebsite"
import {yakitFailed} from "@/utils/notification"
import {YakitDrawer} from "@/components/yakitUI/YakitDrawer/YakitDrawer"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {Divider, Form, Upload} from "antd"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {ExportIcon, PlusCircleIcon, SaveIcon, TrashIcon} from "@/assets/newIcon"

const MITMAddTLS = React.lazy(() => import("./MITMAddTLS"))
const MITMFiltersModal = React.lazy(() => import("./MITMFiltersModal"))
const MITMCertificateDownloadModal = React.lazy(() => import("./MITMCertificateDownloadModal"))

const {ipcRenderer} = window.require("electron")

interface MITMFormAdvancedConfigurationProps {
    visible: boolean
    setVisible: (b: boolean) => void
    onSave: (v: AdvancedConfigurationFromValue) => void
}
export interface AdvancedConfigurationFromValue {
    downstreamProxy: string
    certs: ClientCertificate[]
}
const MITMFormAdvancedConfiguration: React.FC<MITMFormAdvancedConfigurationProps> = React.memo((props) => {
    const {visible, setVisible, onSave} = props
    const [certs, setCerts] = useState<ClientCertificate[]>([])
    const [downstreamProxy, setDownstreamProxy] = useState<string>("")
    const [certificateFormVisible, setCertificateFormVisible] = useState<boolean>(false)
    const [filtersVisible, setFiltersVisible] = useState<boolean>(false)

    const [downloadVisible, setDownloadVisible] = useState<boolean>(false)

    useEffect(() => {
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
        getRemoteValue(MITMConsts.MITMDefaultDownstreamProxy).then((e) => {
            if (!!e) {
                setDownstreamProxy(`${e}`)
            }
        })
    }, [])
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
        const params: AdvancedConfigurationFromValue = {
            downstreamProxy,
            certs
        }
        onSave(params)
    })
    return (
        <YakitDrawer
            className={styles["advanced-configuration-drawer"]}
            visible={visible}
            onClose={() => setVisible(false)}
            width='40%'
            title={
                <div className={styles["advanced-configuration-drawer-title"]}>
                    <div className={styles["advanced-configuration-drawer-title-text"]}>高级配置</div>
                    <div className={styles["advanced-configuration-drawer-title-btns"]}>
                        <YakitButton type='outline2' onClick={() => setVisible(false)}>
                            取消
                        </YakitButton>
                        <YakitButton type='primary' onClick={() => onSaveSetting()}>
                            保存
                        </YakitButton>
                    </div>
                </div>
            }
        >
            <Form>
                <Form.Item
                    label='下游代理'
                    name='downstreamProxy'
                    help={
                        "为经过该 MITM 代理的请求再设置一个代理，通常用于访问中国大陆无法访问的网站或访问特殊网络/内网，也可用于接入被动扫描"
                    }
                >
                    <YakitInput
                        placeholder='例如 http://127.0.0.1:7890 或者 socks5://127.0.0.1:7890'
                        value={downstreamProxy}
                        onChange={(e) => setDownstreamProxy(e.target.value)}
                    />
                </Form.Item>
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
