import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {YakEditor} from "@/utils/editors"
import {yakitFailed} from "@/utils/notification"
import {StringToUint8Array} from "@/utils/str"
import {Form} from "antd"
import React, {useEffect, useImperativeHandle, useRef, useState} from "react"
import {useI18nNamespaces} from "@/i18n/useI18nNamespaces"
import {ClientCertificate} from "./MITMServerStartForm"
import styles from "./MITMServerStartForm.module.scss"

interface AddTLSProps {
    visible: boolean
    setVisible: (b: boolean) => void
    certs: ClientCertificate[]
    setCerts: (c: ClientCertificate[]) => void
}
const MITMAddTLS: React.FC<AddTLSProps> = React.memo((props) => {
    const {visible, setVisible, certs, setCerts} = props
    const {t} = useI18nNamespaces(["mitm"])
    const cerFormRef = useRef<any>()
    return (
        <YakitModal
            title={t("MITMAddTLS.add_client_tls")}
            visible={visible}
            onCancel={() => setVisible(false)}
            closable={true}
            onOk={() => {
                cerFormRef.current.validateFields().then((values) => {
                    const params: ClientCertificate = {
                        CerName: values.CerName,
                        CaCertificates:
                            values.CaCertificates && values.CaCertificates.length > 0
                                ? [StringToUint8Array(values.CaCertificates)]
                                : [],
                        CrtPem: StringToUint8Array(values.CrtPem),
                        KeyPem: StringToUint8Array(values.KeyPem)
                    }
                    if (certs.findIndex((ele) => ele.CerName === params.CerName) !== -1) {
                        yakitFailed(t("MITMAddTLS.name_exists"))
                        return
                    }
                    setCerts([...certs, params])
                    setVisible(false)
                    cerFormRef.current.resetFields()
                })
            }}
            zIndex={1001}
            width='50%'
            bodyStyle={{padding: 0}}
        >
            <InputCertificateForm ref={cerFormRef} formProps={{layout: "vertical", style: {padding: "24px 16px"}}} />
        </YakitModal>
    )
})

export default MITMAddTLS

interface InputCertificateFormProp {
    isShowCerName?: boolean
    ref?: any
    formProps?: any
}

export const InputCertificateForm: React.FC<InputCertificateFormProp> = React.forwardRef((props, ref) => {
    const {isShowCerName = true, formProps} = props
    const {t} = useI18nNamespaces(["mitm"])
    const [form] = Form.useForm()
    useImperativeHandle(
        ref,
        () => ({
            validateFields: form.validateFields,
            resetFields: form.resetFields
        }),
        []
    )
    return (
        <Form className={styles["input-certificate-form"]} form={form} {...formProps}>
            {isShowCerName && (
                <Form.Item name='CerName' rules={[{required: true, message: t("MITMAddTLS.required_field")}]}>
                    <YakitInput placeholder={t("MITMAddTLS.name_placeholder")} />
                </Form.Item>
            )}
            <Form.Item
                label={t("MITMAddTLS.client_cert_pem")}
                name='CrtPem'
                rules={[{required: true, message: t("MITMAddTLS.required_field")}]} 
                className={styles["pem-code-wrapper"]}
            >
                <YakEditor
                    type={"html"}
                    noMiniMap={true}
                    noWordWrap={true}
                    setValue={(CrtPem) => {
                        // setParams({...params, CrtPem: StringToUint8Array(CrtPem)})
                        form.setFieldsValue({CrtPem: CrtPem})
                    }}
                    // value={Uint8ArrayToString(params.CrtPem)}
                />
            </Form.Item>
            <Form.Item
                label={t("MITMAddTLS.client_key_pem")}
                name='KeyPem'
                rules={[{required: true, message: t("MITMAddTLS.required_field")}]} 
                className={styles["pem-code-wrapper"]}
            >
                <YakEditor
                    type={"html"}
                    setValue={(KeyPem) => {
                        // setParams({...params, KeyPem: StringToUint8Array(KeyPem)})
                        form.setFieldsValue({KeyPem: KeyPem})
                    }}
                    // value={Uint8ArrayToString(params.KeyPem)}
                    noMiniMap={true}
                    noWordWrap={true}
                />
            </Form.Item>
            <Form.Item
                label={t("MITMAddTLS.ca_root_cert")}
                name='CaCertificates'
                required={false}
                className={styles["pem-code-wrapper"]}
            >
                <YakEditor
                    type={"html"}
                    setValue={(CaCertBytes) => {
                        // setParams({...params, CaCertificates: [StringToUint8Array(CaCertBytes)]})
                        form.setFieldsValue({CaCertificates: CaCertBytes})
                    }}
                    // value={params.CaCertificates.length > 0 ? Uint8ArrayToString(params.CaCertificates[0]) : ""}
                    noMiniMap={true}
                    noWordWrap={true}
                />
            </Form.Item>
            <Form.Item label={t("MITMAddTLS.specify_host_address")} name={"Host"}>
                <YakitInput placeholder={t("MITMAddTLS.host_placeholder")} />
            </Form.Item>
        </Form>
    )
})
