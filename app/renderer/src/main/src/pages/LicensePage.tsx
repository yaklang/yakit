import React, {ReactNode, useEffect, useRef, useState} from "react"
import {failed, info, success, yakitNotify} from "@/utils/notification"
import {Button, Col, Divider, Form, Modal, notification, Row, Spin} from "antd"
import {InputItem} from "@/utils/inputUtil"
import CopyToClipboard from "react-copy-to-clipboard"
import "./LicensePage.scss"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import { useI18nNamespaces } from "@/i18n/useI18nNamespaces"
const {ipcRenderer} = window.require("electron")
const {Item} = Form

export interface LicensePageProps {
    judgeLicense: (v: string) => void
    licensePageLoading: boolean
    setLicensePageLoading: (v: boolean) => void
}

interface LicensePostProps {
    licenseActivation: string
}
const LicensePage: React.FC<LicensePageProps> = (props) => {
    const { t } = useI18nNamespaces(["core"])
    const {judgeLicense, licensePageLoading, setLicensePageLoading} = props
    const [licenseRequest, setLicenseRequest] = useState("")
    const [paramsObj, setParamsObj] = useState<LicensePostProps>({licenseActivation: ""})

    useEffect(() => {
        setLicensePageLoading(true)
        ipcRenderer
            .invoke("GetLicense", {})
            .then((e) => {
                setLicenseRequest(e.License)
            })
            .catch((e) => {
                failed(t("License.getLicenseFailed", { ns: "core", error: e }))
            })
            .finally(() => {
                setLicensePageLoading(false)
            })
    }, [])

    if (!licenseRequest) {
        return <Spin className='license-spin-box' tip={t("License.loadingLicense", { ns: "core" })} />
    }

    const UploadLicense = () => {
        setLicensePageLoading(true)
        judgeLicense(paramsObj.licenseActivation)
    }

    return (
        <div style={{height:"100%",overflow:"auto"}}>
            <Spin spinning={licensePageLoading}>
                <Row style={{paddingTop: 50}}>
                    <Col span={4} />
                    <Col span={16}>
                        <Form
                            layout={"horizontal"}
                            labelCol={{span: 4}}
                            wrapperCol={{span: 18}}
                            onSubmitCapture={(e) => {
                                e.preventDefault()

                                if (!paramsObj.licenseActivation) {
                                    Modal.error({title: t("License.emptyLicense", { ns: "core" })})
                                    return
                                }

                                UploadLicense()
                            }}
                        >
                            <Item label={" "} colon={false}>
                                <h1>{t("License.registerProduct", { ns: "core" })}</h1>
                            </Item>
                            <InputItem
                                label={t("License.licenseRequestCode", { ns: "core" })}
                                textarea={true}
                                textareaRow={10}
                                disable={true}
                                extraFormItemProps={{
                                    style: {
                                        marginBottom: 4
                                    }
                                }}
                                value={licenseRequest}
                            />
                            <Item
                                label={" "}
                                colon={false}
                                style={{textAlign: "left"}}
                                help={t("License.requestCodeHelp", { ns: "core" })}
                            >
                                <CopyToClipboard
                                    text={licenseRequest}
                                    onCopy={(t_, ok) => {
                                        if (ok) {
                                            yakitNotify("success", t("License.copySuccess", { ns: "core" }))
                                        }
                                    }}
                                >
                                    <YakitButton type={"text"} size={"small"}>
                                        {t("License.copyRequestCode", { ns: "core" })}
                                    </YakitButton>
                                </CopyToClipboard>
                            </Item>
                            <Divider />
                            <InputItem
                                label={t("License.yourLicense", { ns: "core" })}
                                textarea={true}
                                textareaRow={13}
                                setValue={(licenseActivation) => setParamsObj({...paramsObj, licenseActivation})}
                                value={paramsObj.licenseActivation}
                            />
                            <Item label={" "} colon={false}>
                                <YakitButton type={"primary"} htmlType={"submit"} style={{width: "100%", height: 60}}>
                                    {t("License.activateProduct", { ns: "core" })}
                                </YakitButton>
                            </Item>
                        </Form>
                    </Col>
                    <Col span={4} />
                </Row>
            </Spin>
        </div>
    )
}

export default LicensePage
