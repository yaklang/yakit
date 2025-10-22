import React, {useEffect, useImperativeHandle, useRef, useState} from "react"
import styles from "./MITMServerStartForm.module.scss"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {CaCertData} from "../MITMServerHijacking/MITMServerHijacking"
import {useMemoizedFn} from "ahooks"
import {saveABSFileToOpen, openExternalWebsite} from "@/utils/openWebsite"
import {YakitCard} from "@/components/yakitUI/YakitCard/YakitCard"
import {YakitRadioButtons} from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtons"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {useI18nNamespaces} from "@/i18n/useI18nNamespaces"
import {OutlineQuestionmarkcircleIcon} from "@/assets/icon/outline"
import {YakitEditor} from "@/components/yakitUI/YakitEditor/YakitEditor"
import {Uint8ArrayToString} from "@/utils/str"

const {ipcRenderer} = window.require("electron")

interface MITMCertificateDownloadModalProps {
    visible: boolean
    setVisible: (b: boolean) => void
}
export const MITMCertificateDownloadModal: React.FC<MITMCertificateDownloadModalProps> = React.memo((props) => {
    const {visible, setVisible} = props
    const {t, i18n} = useI18nNamespaces(["mitm", "yakitRoute", "yakitUi"])
    const [isGMState, setIsGMState] = useState<boolean>(false) // 是否为国密证书
    const [caCerts, setCaCerts] = useState<CaCertData>({
        CaCerts: new Uint8Array(),
        LocalFile: ""
    })
    useEffect(() => {
        const apiName = isGMState ? "DownloadMITMGMCert" : "DownloadMITMCert"
        ipcRenderer.invoke(apiName, {}).then((data: CaCertData) => {
            setCaCerts(data)
        })
    }, [isGMState])
    /**
     * @description 下载证书
     */
    const onDown = useMemoizedFn(() => {
        if (!caCerts.CaCerts) return
        const fileName = isGMState
            ? t("MITMCertificateDownloadModal.yakitGMZSCertificate", {yakit: t("YakitRoute.Yakit")})
            : t("MITMCertificateDownloadModal.yakitCertificate", {yakit: t("YakitRoute.Yakit")})
        saveABSFileToOpen(fileName, caCerts.CaCerts)
    })
    return (
        <YakitModal
            visible={visible}
            onCancel={() => setVisible(false)}
            closable={true}
            title={t("MITMCertificateDownloadModal.downloadCertificateForHttpsHijack")}
            width={750}
            className={styles["mitm-certificate-download-modal"]}
            okText={t("MITMCertificateDownloadModal.downloadAndOpenLocally")}
            footerExtra={
                <div className={styles["certificate-download-modal-footer"]}>
                    {t("MITMCertificateDownloadModal.accessAfterSettingProxy")}
                    <YakitTag enableCopy copyText='http://mitm' iconColor='var(--Colors-Use-Main-Primary)' />
                    {t("MITMCertificateDownloadModal.autoDownloadCertificate")}
                </div>
            }
            onOk={() => onDown()}
            bodyStyle={{padding: 8}}
        >
            <YakitCard
                title={
                    <YakitRadioButtons
                        buttonStyle='solid'
                        options={[
                            {
                                value: false,
                                label: t("MITMCertificateDownloadModal.sslTlsCertificate")
                            },
                            {
                                value: true,
                                label: t("MITMCertificateDownloadModal.gmSslTlsCertificate")
                            }
                        ]}
                        value={isGMState}
                        onChange={(e) => {
                            setIsGMState(e.target.value)
                        }}
                    />
                }
                style={{borderRadius: 4}}
                headStyle={{height: 36}}
                bodyStyle={{padding: 0}}
                extra={
                    isGMState ? (
                        <YakitButton
                            type='text'
                            onClick={() => {
                                openExternalWebsite("https://mp.weixin.qq.com/s/smGfZar2H0arbkZx_4b-Iw")
                            }}
                            className={styles["certificate-download-modal-btn"]}
                        >
                            {t("YakitButton.ImportTutorial")}
                            <OutlineQuestionmarkcircleIcon className={styles["certificate-download-modal-icon"]} />
                        </YakitButton>
                    ) : null
                }
            >
                <div className={styles["certificate-download-modal-body"]}>
                    <YakitEditor readOnly value={Uint8ArrayToString(caCerts.CaCerts)} />
                </div>
            </YakitCard>
        </YakitModal>
    )
})

export default MITMCertificateDownloadModal
