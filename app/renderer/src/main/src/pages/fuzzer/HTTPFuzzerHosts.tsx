import React, {useMemo, useState} from "react"
import {Form, Space} from "antd"
import {YakitDragger} from "@/components/yakitUI/YakitForm/YakitForm"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {yakitFailed, yakitNotify} from "@/utils/notification"
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
    onBatchAdd?: (items: {Key: string; Value: string}[]) => void
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
    const supportedHostsFileExtList = ["txt", "hosts"]
    const [fileName, setFileName] = useState<string>("")

    const typeOptions = useMemo(()=>[
        {label: t("HTTPFuzzerHosts.inputConfig"), value: "input"},
        {label: t("HTTPFuzzerHosts.uploadFile"), value: "upload"}
    ],[i18n.language])

    const onDownloadExampleTemplate = () => {
        saveABSFileToOpen("hosts_example.txt", hostsExampleTemplate)
    }

    const isSupportedHostsFile = (path: string) => {
        const normalizedPath = path.trim().toLowerCase()
        if (!normalizedPath) return false

        const file = normalizedPath.split(/[\\/]/).pop() || ""
        return file === "hosts" || supportedHostsFileExtList.some((ext) => file.endsWith(`.${ext}`))
    }

    const parseHostsContent = (content: string): {Key: string; Value: string}[] => {
        const parsedHosts: {Key: string; Value: string}[] = []

        content.split(/\r?\n/).forEach((line) => {
            const trimmedLine = line.trim()
            if (!trimmedLine || trimmedLine.startsWith("#")) return

            const contentWithoutComment = trimmedLine.split("#")[0]?.trim()
            if (!contentWithoutComment) return

            const parts = contentWithoutComment.split(/\s+/).filter(Boolean)
            if (parts.length < 2) return

            const ip = parts[0]
            const domains = parts.slice(1)
            if (!domains.length) return

            domains.forEach((domain) => {
                parsedHosts.push({Key: domain, Value: ip})
            })
        })

        return parsedHosts
    }

    const handleSubmit = async () => {
        if (configType === "input") {
            if (!params.Key || !params.Value) {
                yakitFailed(t("HTTPFuzzerHostInput.domainRequired"))
                return
            }
            props.onAdd(params)
        } else {
            if (!fileName.trim()) {
                yakitFailed(t("HTTPFuzzerHosts.fileRequired"))
                return
            }
            if (!isSupportedHostsFile(fileName)) {
                yakitFailed(t("HTTPFuzzerHosts.unsupportedFileType", {accept: supportedHostsFileExtList.join('/')}))
                return
            }
            let currentHostsContent = ""
            try {
                currentHostsContent = await ipcRenderer.invoke("fetch-file-content", fileName)
            } catch (error) {
                yakitFailed(t("HTTPFuzzerHosts.fileReadFailed", {error: String(error)}))
                return
            }
            if (!currentHostsContent.trim()) {
                yakitFailed(t("HTTPFuzzerHosts.emptyOrUnreadableFile"))
                return
            }
            const parsedHosts = parseHostsContent(currentHostsContent)
            if (!parsedHosts.length) {
                yakitFailed(t("HTTPFuzzerHosts.parseFailed"))
                return
            }
            if (props.onBatchAdd) {
                props.onBatchAdd(parsedHosts)
            } else {
                parsedHosts.forEach((item) => props.onAdd(item))
            }
            yakitNotify("success", t("HTTPFuzzerHosts.parseSuccess", {count: parsedHosts.length}))
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
                <YakitDragger
                    isShowPathNumber={false}
                    selectType='file'
                    renderType='input'
                    inputProps={{
                        placeholder: t("HTTPFuzzerHosts.uploadPlaceholder")
                    }}
                    multiple={false}
                    value={fileName}
                    onChange={setFileName}
                    help={t("YakitDraggerContent.drag_file_tip")}
                    showExtraHelp={
                        <YakitButton
                            style={{ marginLeft: 70 }}
                            type="text"
                            onClick={onDownloadExampleTemplate}
                        >
                            {t("HTTPFuzzerHosts.example")}
                        </YakitButton>
                    }
                    helpClassName={styles["dragger_help"]}
                />
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
