import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {YakEditor} from "@/utils/editors"
import {yakitFailed} from "@/utils/notification"
import {StringToUint8Array} from "@/utils/str"
import {Form} from "antd"
import React, {useEffect, useImperativeHandle, useRef, useState} from "react"
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
    const cerFormRef = useRef<any>()
    return (
        <YakitModal
            title='添加客户端 TLS'
            visible={visible}
            onCancel={() => setVisible(false)}
            onOk={() => {
                cerFormRef.current.validateFields().then((values) => {
                    const params: ClientCertificate = {
                        CerName: values.CerName,
                        CaCertificates:
                            values.CaCertificates && values.CaCertificates.length > 0
                                ? [StringToUint8Array(values.CaCertificates)]
                                : [],
                        CrtPem: StringToUint8Array(values.CrtPem),
                        KeyPem: StringToUint8Array(values.CrtPem)
                    }
                    if (certs.findIndex((ele) => ele.CerName === params.CerName) !== -1) {
                        yakitFailed("该名称已存在")
                        return
                    }
                    setCerts([...certs, params])
                    setVisible(false)
                    cerFormRef.current.resetFields()
                })
            }}
            zIndex={1001}
            width='50%'
        >
            <InputCertificateForm reset={visible} ref={cerFormRef} />
        </YakitModal>
    )
})

export default MITMAddTLS

interface InputCertificateFormProp {
    ref?: any
    reset: boolean
}

const InputCertificateForm: React.FC<InputCertificateFormProp> = React.forwardRef((props, ref) => {
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
        <Form className={styles["input-certificate-form"]} layout='vertical' form={form}>
            <Form.Item name='CerName' rules={[{required: true, message: "该项必填"}]}>
                <YakitInput placeholder='请为你的证书对取一个名字（必填）' />
            </Form.Item>
            <Form.Item label={"客户端证书(PEM)"} name='CrtPem' rules={[{required: true, message: "该项必填"}]}>
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
            <Form.Item label={"客户端私钥(PEM)"} name='KeyPem' rules={[{required: true, message: "该项必填"}]}>
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
            <Form.Item label={"CA 根证书"} name='CaCertificates' required={false}>
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
        </Form>
    )
})
