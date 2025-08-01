import React, {useEffect, useState} from "react"
import {AddAIModelProps} from "./AddAIModelType"
import styles from "./AddAIModel.module.scss"
import {Form} from "antd"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {useMemoizedFn} from "ahooks"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitFormDragger} from "@/components/yakitUI/YakitForm/YakitForm"
export const AddAIModel: React.FC<AddAIModelProps> = React.memo((props) => {
    const {onCancel} = props
    const [loading, setLoading] = useState<boolean>(false)
    const [form] = Form.useForm()
    useEffect(() => {
        // form.setFieldsValue({
        //     ModelName: "",
        //     ModelFile: "",
        //     Description: ""
        // })
    }, [])
    const handleSubmit = useMemoizedFn((value) => {})
    return (
        <div className={styles["ai-start-model-form"]}>
            <Form labelCol={{span: 6}} wrapperCol={{span: 18}} onFinish={handleSubmit}>
                <Form.Item label='模型名称' name='ModelName' rules={[{required: true, message: "请输入模型名称"}]}>
                    <YakitInput />
                </Form.Item>

                <YakitFormDragger
                    formItemProps={{
                        name: "ModelFile",
                        label: "文件地址",
                        rules: [{required: true, message: "请输入文件地址"}]
                    }}
                />

                <Form.Item label='模型描述' name='Description'>
                    <YakitInput.TextArea rows={3} />
                </Form.Item>

                <Form.Item colon={false} label=' '>
                    <div className={styles["button-group"]}>
                        <YakitButton type='outline1' size='large' onClick={onCancel}>
                            取消
                        </YakitButton>
                        <YakitButton type='primary' htmlType='submit' size='large' loading={loading}>
                            确定
                        </YakitButton>
                    </div>
                </Form.Item>
            </Form>
        </div>
    )
})
