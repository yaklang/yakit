import React, {useEffect, useState} from "react"
import styles from "./AddAIModel.module.scss"
import {Form} from "antd"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {useCreation, useMemoizedFn} from "ahooks"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitFormDragger} from "@/components/yakitUI/YakitForm/YakitForm"
import {AddLocalModelRequest} from "../../type/aiModel"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import {YakitSelectProps} from "@/components/yakitUI/YakitSelect/YakitSelectType"
import {grpcAddLocalModel, grpcUpdateLocalModel} from "../utils"
import {AILocalModelTypeEnum} from "../../defaultConstant"
import {AddAIModelProps} from "./AddAIModelType"
import {useI18nNamespaces} from "@/i18n/useI18nNamespaces"
export const AddAIModel: React.FC<AddAIModelProps> = React.memo((props) => {
    const {onCancel, defaultValues} = props
    const {t} = useI18nNamespaces(["aiAgent"])
    const [loading, setLoading] = useState<boolean>(false)
    const [form] = Form.useForm<AddLocalModelRequest>()
    useEffect(() => {
        if (!!defaultValues) {
            form.setFieldsValue({
                Name: defaultValues.Name || "",
                ModelType: defaultValues.ModelType || AILocalModelTypeEnum.AIChat,
                Path: defaultValues.Path || "",
                Description: defaultValues.Description || ""
            })
        }
    }, [defaultValues])
    const modelTypeOptions: YakitSelectProps["options"] = useCreation(() => {
        return [
            {label: t("AddAIModel.aichat"), value: AILocalModelTypeEnum.AIChat},
            {label: t("AddAIModel.embedding"), value: AILocalModelTypeEnum.Embedding}
            // {label: "speech-to-text", value: AILocalModelTypeEnum.SpeechToText}
        ]
    }, [])
    const handleSubmit = useMemoizedFn(() => {
        form.validateFields().then((value: AddLocalModelRequest) => {
            setLoading(true)
            if (!!defaultValues?.Name) {
                // 更新
                grpcUpdateLocalModel(value)
                    .then(() => {
                        onCancel()
                    })
                    .finally(() => {
                        setTimeout(() => {
                            setLoading(false)
                        }, 200)
                    })
            } else {
                // 新增
                grpcAddLocalModel(value)
                    .then(() => {
                        onCancel()
                    })
                    .finally(() => {
                        setTimeout(() => {
                            setLoading(false)
                        }, 200)
                    })
            }
        })
    })
    return (
        <div>
            <Form form={form} labelCol={{span: 3}} wrapperCol={{span: 21}} className={styles["ai-start-model-form"]}>
                <Form.Item label={t("AddAIModel.modelName")} name='Name' rules={[{required: true, message: t("AddAIModel.enterModelName")}]}>
                    <YakitInput disabled={!!defaultValues?.Name} />
                </Form.Item>
                <Form.Item
                    label={t("AddAIModel.modelType")}
                    name='ModelType'
                    rules={[{required: true, message: t("AddAIModel.enterModelType")} ]}
                    initialValue={AILocalModelTypeEnum.AIChat}
                >
                    <YakitSelect options={modelTypeOptions} />
                </Form.Item>
                <YakitFormDragger
                    formItemProps={{
                        name: "Path",
                        label: t("AddAIModel.filePath"),
                        rules: [{required: true, message: t("AddAIModel.enterFilePath")}]
                    }}
                />

                <Form.Item label={t("AddAIModel.modelDescription")} name='Description'>
                    <YakitInput.TextArea rows={3} />
                </Form.Item>
            </Form>
            <div className={styles["button-group"]}>
                <YakitButton type='outline2' size='large' onClick={onCancel}>
                    {t("AddAIModel.cancel")}
                </YakitButton>
                <YakitButton type='primary' size='large' loading={loading} onClick={handleSubmit}>
                    {t("AddAIModel.confirm")}
                </YakitButton>
            </div>
        </div>
    )
})
