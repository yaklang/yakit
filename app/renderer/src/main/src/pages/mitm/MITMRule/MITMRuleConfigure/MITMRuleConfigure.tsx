import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {YakitSwitch} from "@/components/yakitUI/YakitSwitch/YakitSwitch"
import {YakEditor} from "@/utils/editors"
import {failed, info} from "@/utils/notification"
import {saveABSFileToOpen} from "@/utils/openWebsite"
import {Spin} from "antd"
import React, {useEffect, useState} from "react"
import {MITMRuleExportProps, MITMRuleImportProps} from "./MITMRuleConfigureType"
import styles from "./MITMRuleConfigure.module.scss"

const {ipcRenderer} = window.require("electron")

export const MITMRuleExport: React.FC<MITMRuleExportProps> = (props) => {
    const {visible, setVisible} = props
    const [value, setValue] = useState<Uint8Array>(new Uint8Array())
    const [loading, setLoading] = useState(true)
    useEffect(() => {
        ipcRenderer
            .invoke("ExportMITMReplacerRules", {})
            .then((r: {JsonRaw: Uint8Array}) => {
                setValue(r.JsonRaw)
            })
            .catch((e) => {
                failed(`导出失败：${e}`)
            })
            .finally(() => setTimeout(() => setLoading(false), 300))
    }, [visible])
    return (
        <YakitModal
            title='导出配置 JSON'
            visible={visible}
            onCancel={() => setVisible(false)}
            okText='另存为'
            width={960}
            closable={true}
            onOk={() => {
                saveABSFileToOpen("yakit-mitm-replacer-rules-config.json", value)
            }}
        >
            <Spin spinning={loading}>
                <div style={{height: 466}}>
                    <YakEditor type={"json"} value={new Buffer(value).toString("utf8")} readOnly={true} />
                </div>
            </Spin>
        </YakitModal>
    )
}

export const MITMRuleImport: React.FC<MITMRuleImportProps> = (props) => {
    const {visible, setVisible} = props
    const [params, setParams] = useState<{JsonRaw: Uint8Array; ReplaceAll: boolean}>({
        JsonRaw: new Uint8Array(),
        ReplaceAll: false
    })
    const [loading, setLoading] = useState(false)
    return (
        <YakitModal
            title='从 JSON 中导入'
            subTitle='可复制 JSON 代码到方框区域内'
            visible={visible}
            onCancel={() => setVisible(false)}
            okText='导入'
            width={960}
            closable={true}
            onOk={() => {
                ipcRenderer
                    .invoke("ImportMITMReplacerRules", {...params})
                    .then((e) => {
                        setVisible(false)
                        info("导入成功")
                    })
                    .catch((e) => {
                        failed("导入失败:" + e)
                    })
            }}
            footerExtra={
                <div className={styles["modal-footer-extra"]}>
                    <span className={styles['modal-footer-extra-text']}>全部替换</span><YakitSwitch />
                </div>
            }
        >
            <Spin spinning={loading}>
                <div style={{height: 466}}>
                    <YakEditor
                        triggerId={loading}
                        type={"json"}
                        value={new Buffer(params.JsonRaw).toString("utf8")}
                        setValue={(e) => {
                            setParams({...params, JsonRaw: Buffer.from(e)})
                        }}
                    />
                </div>
            </Spin>
        </YakitModal>
    )
}
