import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {YakitSwitch} from "@/components/yakitUI/YakitSwitch/YakitSwitch"
import {YakEditor} from "@/utils/editors"
import {failed, info} from "@/utils/notification"
import {saveABSFileToOpen} from "@/utils/openWebsite"
import {Spin} from "antd"
import React, {useEffect, useState} from "react"
import {MITMRuleExportProps, MITMRuleImportProps} from "./MITMRuleConfigureType"
import styles from "./MITMRuleConfigure.module.scss"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {useMemoizedFn} from "ahooks"

const {ipcRenderer} = window.require("electron")

const defaultConfig = `[
    {
        "Rule": "(?i)(jsonp_[a-z0-9]+)|((_?callback|_cb|_call|_?jsonp_?)=)",
        "NoReplace": true,
        "Color": "yellow",
        "EnableForRequest": true,
        "EnableForHeader": true,
        "Index": 1,
        "ExtraTag": [
            "疑似JSONP"
        ]
    },
    {
        "Rule": "(?i)((password)|(pass)|(secret)|(mima))['\\"]?\\\\s*[\\\\:\\\\=]",
        "NoReplace": true,
        "Color": "red",
        "EnableForRequest": true,
        "EnableForHeader": true,
        "EnableForBody": true,
        "Index": 2,
        "ExtraTag": [
            "登陆/密码传输"
        ]
    },
    {
        "Rule": "(?i)((access|admin|api|debug|auth|authorization|gpg|ops|ray|deploy|s3|certificate|aws|app|application|docker|es|elastic|elasticsearch|secret)[-_]{0,5}(key|token|secret|secretkey|pass|password|sid|debug))|(secret|password)([\\"']?\\\\s*:\\\\s*|\\\\s*=\\\\s*)",
        "NoReplace": true,
        "Color": "red",
        "EnableForRequest": true,
        "EnableForResponse": true,
        "EnableForHeader": true,
        "EnableForBody": true,
        "Index": 3,
        "ExtraTag": [
            "敏感信息"
        ]
    },
    {
        "Rule": "(BEGIN PUBLIC KEY).*?(END PUBLIC KEY)",
        "NoReplace": true,
        "Color": "purple",
        "EnableForRequest": true,
        "EnableForResponse": true,
        "EnableForHeader": true,
        "EnableForBody": true,
        "Index": 4,
        "ExtraTag": [
            "公钥传输"
        ]
    }
]`

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
    const onImport = useMemoizedFn(() => {
        if (!new Buffer(params.JsonRaw).toString("utf8")) {
            failed("请填入数据!")
            return
        }
        try {
            let rules = JSON.parse(new Buffer(params.JsonRaw).toString("utf8")).map((item, index) => ({
                ...item,
                Index: index + 1
            }))
            ipcRenderer
                .invoke("ImportMITMReplacerRules", {...params, JsonRaw: Buffer.from(JSON.stringify(rules))})
                .then((e) => {
                    setVisible(false)
                    info("导入成功")
                })
                .catch((e) => {
                    failed("导入失败:" + e)
                })
        } catch (error) {
            failed("导入失败:" + error)
        }
    })
    const onUseDefaultConfig = useMemoizedFn(() => {
        setParams({ReplaceAll: true, JsonRaw: Buffer.from(defaultConfig)})
        setLoading(true)
        setTimeout(() => setLoading(false), 300)
    })
    return (
        <YakitModal
            title='从 JSON 中导入'
            subTitle={
                <div className={styles["modal-subTitle"]}>
                    <span>可复制 JSON 代码到方框区域内</span>
                    <YakitButton type='text' onClick={() => onUseDefaultConfig()}>
                        使用默认配置
                    </YakitButton>
                </div>
            }
            visible={visible}
            onCancel={() => setVisible(false)}
            okText='导入'
            width={960}
            closable={true}
            onOk={() => onImport()}
            footerExtra={
                <div className={styles["modal-footer-extra"]}>
                    <span className={styles["modal-footer-extra-text"]}>全部替换</span>
                    <YakitSwitch
                        onChange={(ReplaceAll) => setParams({...params, ReplaceAll})}
                        checked={params.ReplaceAll}
                    />
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
