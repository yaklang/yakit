import React, {useState} from "react"
import {Form, Space} from "antd"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {failed, yakitFailed} from "@/utils/notification"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {showYakitModal} from "@/components/yakitUI/YakitModal/YakitModalConfirm"
import i18n from "@/i18n/i18n"
import {useI18nNamespaces} from "@/i18n/useI18nNamespaces"

interface HTTPFuzzerHostInputProp {
    onAdd: (obj: {Key: string; Value: string}) => any
    onClose: () => any
}

export const inputHTTPFuzzerHostConfigItem = (handler: (obj: {Key: string; Value: string}) => any) => {
    const m = showYakitModal({
        title: i18n.language === "zh" ? "输入 DNS Hosts 配置" : "Enter DNS Hosts Configuration",
        width: "500px",
        footer: null,
        content: (
            <div style={{padding: 24}}>
                <HTTPFuzzerHostInput
                    onAdd={handler}
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

    return (
        <Form
            labelCol={{span: 5}}
            wrapperCol={{span: 14}}
            size={"small"}
            onSubmitCapture={(e) => {
                e.preventDefault()

                if (params.Key === "" || params.Value === "") {
                    yakitFailed(t("HTTPFuzzerHostInput.domainRequired"))
                    return
                }

                props.onAdd(params)
                props.onClose()
            }}
        >
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
