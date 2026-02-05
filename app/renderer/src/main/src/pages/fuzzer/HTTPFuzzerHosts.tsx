import React, {useMemo, useState} from "react"
import {Form, Space, Upload} from "antd"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {failed, yakitFailed} from "@/utils/notification"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {showYakitModal} from "@/components/yakitUI/YakitModal/YakitModalConfirm"
import i18n from "@/i18n/i18n"
import {useI18nNamespaces} from "@/i18n/useI18nNamespaces"
import {YakitRadioButtons} from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtons"
import {saveABSFileToOpen} from "@/utils/openWebsite"
import {hostsExampleTemplate} from "@/defaultConstants/HTTPFuzzerHosts"
import styles from "./HTTPFuzzerHistory.module.scss"
const {ipcRenderer} = window.require("electron")

interface HTTPFuzzerHostInputProp {
    onAdd: (obj: {Key: string; Value: string}) => any
    onBatchAdd?: (items: {Key: string; Value: string}[]) => any
    onClose: () => any
}

export const inputHTTPFuzzerHostConfigItem = (
    handler: (obj: {Key: string; Value: string}) => any,
    batchHandler?: (items: {Key: string; Value: string}[]) => void
) => {
    const m = showYakitModal({
        title: i18n.language === "zh" ? "输入 DNS Hosts 配置" : "Enter DNS Hosts Configuration",
        width: "500px",
        footer: null,
        content: (
            <div style={{padding: 24}}>
                <HTTPFuzzerHostInput
                    onAdd={handler}
                    onBatchAdd={batchHandler} 
                    onClose={() => {
                        m.destroy()
                    }}
                />
            </div>
        )
    })
}

const HTTPFuzzerHostInput: React.FC<HTTPFuzzerHostInputProp> = (props) => {
    const {t, i18n} = useI18nNamespaces(["yakitUi", "webFuzzer"])
    const [params, setParams] = useState<{Key: string; Value: string}>({Key: "", Value: ""})
    const [configType, setConfigType] = useState<"input" | "upload">("input")
    const [hostsContent, setHostsContent] = useState<string>("")
    const [fileName, setFileName] = useState<string>("")

    const typeOptions = useMemo(()=>[
        {label: t("HTTPFuzzerHosts.inputConfig"), value: "input"},
        {label: t("HTTPFuzzerHosts.uploadFile"), value: "upload"}
    ],[i18n.language])

    const onDownloadExampleTemplate = () => {
        saveABSFileToOpen("hosts_example.txt", hostsExampleTemplate)
    }

    const parseHostsContent = (content: string): {Key: string; Value: string}[] => {
        return content
            .split(/\r?\n/)
            .filter((line) => line.trim() && !line.trim().startsWith("#"))
            .flatMap((line) => {
                const parts = line.trim().split(/\s+/)
                if (parts.length < 2) return []
                const ip = parts[0]
                return parts.slice(1).filter((d) => d && !d.startsWith("#")).map((domain) => ({Key: domain, Value: ip}))
            })
    }

    const handleSubmit = () => {
        if (configType === "input") {
            if (!params.Key || !params.Value) {
                yakitFailed(t("HTTPFuzzerHostInput.domainRequired"))
                return
            }
            props.onAdd(params)
        } else {
            if(hostsContent.trim()){
                const parsedHosts = parseHostsContent(hostsContent)
                parsedHosts.length && props.onBatchAdd?.(parsedHosts)
            }
        }
        props.onClose()
    }

    return (
        <Form
            labelCol={{span: 5}}
            wrapperCol={{span: 16}}
            size={"small"}
            onSubmitCapture={(e) => {
                e.preventDefault()
                handleSubmit()
            }}
        >
            <YakitRadioButtons 
                buttonStyle="solid" 
                value={configType} 
                onChange={(e) => setConfigType(e.target.value)} 
                options={typeOptions}
                className={styles["host_upload_radio"]}
            />
            {configType === "input" ? (<>
            <Form.Item label={t("HTTPFuzzerHostInput.domain")} required={true}>
                <YakitInput
                    size={"small"}
                    placeholder={t("HTTPFuzzerHostInput.domainExample")}
                    value={params.Key}
                    onChange={(e) => {
                        setParams({...params, Key: e.target.value})
                    }}
                />
            </Form.Item>
            <Form.Item label={"IP"} required={true}>
                <YakitInput
                    size={"small"}
                    placeholder={t("HTTPFuzzerHostInput.ipExample")}
                    value={params.Value}
                    onChange={(e) => {
                        setParams({...params, Value: e.target.value})
                    }}
                />
            </Form.Item>
            </> ) : (
            <Form.Item label={t("HTTPFuzzerHosts.hostsConfig")}>
                <YakitInput value={fileName} readOnly />
                <div style={{ display: 'flex', justifyContent:'space-between'}}>
                <Upload
                    multiple={false}
                    maxCount={1}
                    showUploadList={false}
                    beforeUpload={(f) => {
                        setFileName(f.name)
                        ipcRenderer.invoke("fetch-file-content", (f as any).path)
                        .then((res: string) => setHostsContent(res))
                        return false
                    }}
                >
                    <div className={styles["host_upload_tips"]}>
                        {t("HTTPFuzzerHosts.dragOrUpload")} <YakitButton type="text">{t("HTTPFuzzerHosts.uploadFile")}</YakitButton>
                    </div>
                </Upload>
                <YakitButton type="text" onClick={onDownloadExampleTemplate}>{t("HTTPFuzzerHosts.example")}</YakitButton>
                </div>
            </Form.Item>
            )}
            <Form.Item label={" "} colon={false}>
                <Space>
                    <YakitButton htmlType={"submit"}>{t("YakitButton.add")}</YakitButton>
                    <YakitButton
                        type='primary'
                        colors='danger'
                        onClick={() => {
                            props.onClose()
                        }}
                    >
                        {t("YakitButton.cancel")}
                    </YakitButton>
                </Space>
            </Form.Item>
        </Form>
    )
}
