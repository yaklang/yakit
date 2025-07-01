import React, {useEffect, useImperativeHandle, useRef, useState} from "react"
import styles from "./MITMServerStartForm.module.scss"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {YakEditor} from "@/utils/editors"
import {CaCertData} from "../MITMServerHijacking/MITMServerHijacking"
import {useMemoizedFn} from "ahooks"
import {saveABSFileToOpen} from "@/utils/openWebsite"

const {ipcRenderer} = window.require("electron")

interface MITMCertificateDownloadModalProps {
    visible: boolean
    setVisible: (b: boolean) => void
    isGM?: boolean // 是否为国密证书
}
export const MITMCertificateDownloadModal: React.FC<MITMCertificateDownloadModalProps> = React.memo((props) => {
    const {visible, setVisible, isGM = false} = props
    const [caCerts, setCaCerts] = useState<CaCertData>({
        CaCerts: new Uint8Array(),
        LocalFile: ""
    })
    useEffect(() => {
        const apiName = isGM ? "DownloadMITMGMCert" : "DownloadMITMCert"
        ipcRenderer.invoke(apiName, {}).then((data: CaCertData) => {
            setCaCerts(data)
        })
    }, [isGM])
    /**
     * @description 下载证书
     */
    const onDown = useMemoizedFn(() => {
        if (!caCerts.CaCerts) return
        const fileName = isGM ? "yakit国密证书.crt.pem" : "yakit证书.crt.pem"
        saveABSFileToOpen(fileName, caCerts.CaCerts)
    })
    return (
        <YakitModal
            visible={visible}
            onCancel={() => setVisible(false)}
            closable={true}
            title={isGM ? '下载国密 SSL/TLS 证书以劫持 HTTPS' : '下载 SSL/TLS 证书以劫持 HTTPS'}
            width={720}
            className={styles["mitm-certificate-download-modal"]}
            okText='下载到本地并打开'
            footerExtra={
                <div className={styles["certificate-download-modal-footer"]}>
                    在设置代理后访问：
                    <YakitTag enableCopy copyText='http://mitm' iconColor='var(--Colors-Use-Main-Primary)' />
                    可自动下载证书
                </div>
            }
            onOk={() => onDown()}
            bodyStyle={{padding: 0}}
        >
            <div className={styles["certificate-download-modal-body"]}>
                <YakEditor bytes={true} valueBytes={caCerts.CaCerts} />
            </div>
        </YakitModal>
    )
})

export default MITMCertificateDownloadModal
