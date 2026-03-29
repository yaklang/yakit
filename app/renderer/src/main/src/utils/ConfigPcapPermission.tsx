import React, {useEffect, useState} from "react"
import {Alert, Form, Tooltip} from "antd"
import {yakitNotify} from "@/utils/notification"
import {getReleaseEditionName} from "./envfile"
import {showYakitModal} from "@/components/yakitUI/YakitModal/YakitModalConfirm"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {QuestionMarkCircleIcon} from "@/assets/newIcon"
import i18n from "@/i18n/i18n"

const t = i18n.getFixedT(null, "utils")
const {ipcRenderer} = window.require("electron")

export interface ConfigPcapPermissionFormProp {
    onClose: () => any
}

export const ConfigPcapPermissionForm: React.FC<ConfigPcapPermissionFormProp> = (props) => {
    const [response, setResponse] = useState<{
        IsPrivileged: boolean
        Advice: string
        AdviceVerbose: string
    }>({Advice: "unknown", AdviceVerbose: t("ConfigPcapPermission.unavailable"), IsPrivileged: false})
    const [platform, setPlatform] = useState("")

    useEffect(() => {
        ipcRenderer
            .invoke("IsPrivilegedForNetRaw", {})
            .then(setResponse)
            .catch((e) => {
                yakitNotify("error", t("ConfigPcapPermission.fetchStatusFailed", {error: String(e)}))
            })
            .finally(() => {
                ipcRenderer
                    .invoke("fetch-system-and-arch")
                    .then((e: string) => setPlatform(e))
                    .catch((e) => {
                        yakitNotify("error", t("ConfigPcapPermission.fetchPlatformFailed", {name: getReleaseEditionName(), error: String(e)}))
                    })
            })
    }, [])

    const isWindows = platform.toLowerCase().startsWith("win")

    return (
        <Form
            style={{paddingTop: 20}}
            labelCol={{span: 5}}
            wrapperCol={{span: 14}}
            onSubmitCapture={(e) => {
                e.preventDefault()

                ipcRenderer
                    .invoke(`PromotePermissionForUserPcap`, {})
                    .then(() => {
                        if (props?.onClose) {
                            props.onClose()
                        }
                    })
                    .catch((e) => {
                        yakitNotify("error", t("ConfigPcapPermission.promoteFailed", {error: String(e)}))
                    })
            }}
        >
            <Form.Item
                label={" "}
                colon={false}
                help={
                    <>
                        <Tooltip
                            title={
                                t("ConfigPcapPermission.tooltip")
                            }
                        >
                            <YakitButton type={"text"} icon={<QuestionMarkCircleIcon />} />
                        </Tooltip>
                        {isWindows
                            ? t("ConfigPcapPermission.windowsHint", {name: getReleaseEditionName()})
                            : t("ConfigPcapPermission.unixHint")}
                    </>
                }
            >
                {response.IsPrivileged ? (
                    <Alert type={"success"} message={t("ConfigPcapPermission.privilegedHint")} />
                ) : (
                    <Alert type={"warning"} message={t("ConfigPcapPermission.notPrivilegedHint")} />
                )}
            </Form.Item>
            {response.IsPrivileged ? (
                <Form.Item label={" "} colon={false}>
                    {props?.onClose && (
                        <YakitButton
                            onClick={() => {
                                props.onClose()
                            }}
                        >
                            {t("ConfigPcapPermission.ok")}
                        </YakitButton>
                    )}
                </Form.Item>
            ) : (
                <Form.Item label={" "} colon={false}>
                    <YakitButton htmlType={"submit"} type={"primary"}>
                        {t("ConfigPcapPermission.enablePcap")}
                    </YakitButton>
                    <Tooltip title={`${response.AdviceVerbose}: ${response.Advice}`}>
                        <YakitButton type={"text"}>{t("ConfigPcapPermission.manualFix")}</YakitButton>
                    </Tooltip>
                </Form.Item>
            )}
        </Form>
    )
}

export const showPcapPermission = () => {
    const m = showYakitModal({
        type: "white",
        title: t("ConfigPcapPermission.modalTitle"),
        width: "50%",
        content: (
            <ConfigPcapPermissionForm
                onClose={() => {
                    m.destroy()
                }}
            />
        ),
        footer: null
    })
}
