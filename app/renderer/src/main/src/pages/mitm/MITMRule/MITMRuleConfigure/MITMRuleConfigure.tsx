import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {YakitSwitch} from "@/components/yakitUI/YakitSwitch/YakitSwitch"
import {failed, info} from "@/utils/notification"
import {saveABSFileToOpen} from "@/utils/openWebsite"
import {Spin} from "antd"
import React, {useEffect, useState} from "react"
import {MITMRuleExportProps, MITMRuleImportProps} from "./MITMRuleConfigureType"
import styles from "./MITMRuleConfigure.module.scss"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {useMemoizedFn} from "ahooks"
import defaultConfig from "./yakitMitmReplacerRulesConfig.json"
import {YakitEditor} from "@/components/yakitUI/YakitEditor/YakitEditor"
import {useI18nNamespaces} from "@/i18n/useI18nNamespaces"
import { JSONParseLog } from "@/utils/tool"

const {ipcRenderer} = window.require("electron")

export const MITMRuleExport: React.FC<MITMRuleExportProps> = (props) => {
    const {visible, setVisible} = props
    const {t, i18n} = useI18nNamespaces(["yakitUi", "mitm"])
    const [value, setValue] = useState<Uint8Array>(new Uint8Array())
    const [loading, setLoading] = useState(true)
    useEffect(() => {
        ipcRenderer
            .invoke("ExportMITMReplacerRules", {})
            .then((r: {JsonRaw: Uint8Array}) => {
                setValue(r.JsonRaw)
            })
            .catch((e) => {
                failed(`${t("YakitNotification.exportFailed", {colon: true})}${e}`)
            })
            .finally(() => setTimeout(() => setLoading(false), 300))
    }, [visible])
    return (
        <YakitModal
            title={t("RuleExportAndImportButton.export_configuration_json")}
            visible={visible}
            onCancel={() => setVisible(false)}
            okText={t("YakitButton.save_as")}
            width={960}
            closable={true}
            onOk={() => {
                saveABSFileToOpen("yakit-mitm-replacer-rules-config.json", value)
            }}
            bodyStyle={{padding: 0}}
        >
            <Spin spinning={loading}>
                <div style={{height: 466}}>
                    <YakitEditor type={"json"} value={new Buffer(value).toString("utf8")} readOnly={true} />
                </div>
            </Spin>
        </YakitModal>
    )
}

export const MITMRuleImport: React.FC<MITMRuleImportProps> = (props) => {
    const {visible, setVisible, onOk, isUseDefRules} = props
    const {t, i18n} = useI18nNamespaces(["yakitUi", "mitm"])
    const [params, setParams] = useState<{JsonRaw: Uint8Array; ReplaceAll: boolean}>({
        JsonRaw: new Uint8Array(),
        ReplaceAll: false
    })
    useEffect(() => {
        if (isUseDefRules) onUseDefaultConfig()
    }, [isUseDefRules])
    const [loading, setLoading] = useState(false)
    const onImport = useMemoizedFn(() => {
        if (!new Buffer(params.JsonRaw).toString("utf8")) {
            failed(t("MITMRuleImport.please_enter_data"))
            return
        }
        try {
            let rules = JSONParseLog(new Buffer(params.JsonRaw).toString("utf8"),{page: "MITMRuleConfigure", fun: "onImport"}).map((item, index) => ({
                ...item,
                Index: index + 1
            }))
            ipcRenderer
                .invoke("ImportMITMReplacerRules", {...params, JsonRaw: Buffer.from(JSON.stringify(rules))})
                .then((e) => {
                    if (onOk) {
                        onOk()
                    } else {
                        setVisible(false)
                    }
                    info(t("YakitNotification.imported"))
                })
                .catch((e) => {
                    failed(t("YakitNotification.importFailed", {colon: true}) + e)
                })
        } catch (error) {
            failed(t("YakitNotification.importFailed", {colon: true}) + error)
        }
    })
    const onUseDefaultConfig = useMemoizedFn(() => {
        const value = Buffer.from(JSON.stringify(defaultConfig.map((item) => ({...item, NoReplace: true}))))
        setLoading(true)
        setParams({ReplaceAll: false, JsonRaw: value})
        setTimeout(() => setLoading(false), 300)
    })
    return (
        <YakitModal
            title={t("MITMRuleImport.import_from_json")}
            subTitle={
                <div className={styles["modal-subTitle"]}>
                    <span>{t("MITMRuleImport.copy_json_into_box_tip")}</span>
                    <YakitButton type='text' onClick={() => onUseDefaultConfig()}>
                        {t("MITMRuleImport.use_default_configuration")}
                    </YakitButton>
                </div>
            }
            visible={visible}
            onCancel={() => setVisible(false)}
            okText={t("YakitButton.import")}
            width={960}
            closable={true}
            onOk={() => onImport()}
            footerExtra={
                <div className={styles["modal-footer-extra"]}>
                    <span className={styles["modal-footer-extra-text"]}>{t("MITMRuleImport.overwrite_existing_rules")}</span>
                    <YakitSwitch
                        onChange={(ReplaceAll) => setParams({...params, ReplaceAll})}
                        checked={params.ReplaceAll}
                    />
                </div>
            }
            bodyStyle={{padding: 0}}
        >
            <Spin spinning={loading}>
                <div style={{height: 466}}>
                    <YakitEditor
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
