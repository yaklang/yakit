import React, {useEffect, useImperativeHandle, useRef, useState} from "react"
import styles from "./MITMServerStartForm.module.scss"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {YakEditor} from "@/utils/editors"
import {CaCertData} from "../MITMServerHijacking"
import {useMemoizedFn} from "ahooks"
import {saveABSFileToOpen} from "@/utils/openWebsite"

const {ipcRenderer} = window.require("electron")

interface MITMCertificateDownloadModalProps {
    visible: boolean
    setVisible: (b: boolean) => void
}
const MITMCertificateDownloadModal: React.FC<MITMCertificateDownloadModalProps> = React.memo((props) => {
    const {visible, setVisible} = props
    const [caCerts, setCaCerts] = useState<CaCertData>({
        CaCerts: new Buffer(""),
        LocalFile: ""
    })
    useEffect(() => {
        ipcRenderer.invoke("DownloadMITMCert", {}).then((data: CaCertData) => {
            setCaCerts(data)
        })
    }, [])
    /**
     * @description 下载证书
     */
    const onDown = useMemoizedFn(() => {
        if (!caCerts.CaCerts) return
        saveABSFileToOpen("yakit证书.crt.pem", caCerts.CaCerts)
    })
    return (
        <YakitModal
            visible={visible}
            onCancel={() => setVisible(false)}
            closable={true}
            title='下载 SSL/TLS 证书以劫持 HTTPS'
            width={720}
            className={styles["mitm-certificate-download-modal"]}
            okText='下载到本地并打开'
            footerExtra={
                <div className={styles["certificate-download-modal-footer"]}>
                    在设置代理后访问：
                    <YakitTag
                        enableCopy
                        copyText='http://download-mitm-cert.yaklang.io'
                        iconColor='var(--yakit-primary-5)'
                    />
                    可自动下载证书
                </div>
            }
            onOk={() => onDown()}
        >
            <div className={styles["certificate-download-modal-body"]}>
                <YakEditor bytes={true} valueBytes={caCerts.CaCerts} />
            </div>
        </YakitModal>
    )
})

export default MITMCertificateDownloadModal
