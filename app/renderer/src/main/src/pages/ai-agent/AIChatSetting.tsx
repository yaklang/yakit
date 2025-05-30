import React, {memo, useEffect, useMemo} from "react"
import {AIChatSettingProps} from "./aiAgentType"
import useStore from "./useContext/useStore"
import useDispatcher from "./useContext/useDispatcher"
import {Form} from "antd"
import {YakitSwitch} from "@/components/yakitUI/YakitSwitch/YakitSwitch"
import {useMemoizedFn} from "ahooks"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"

// import classNames from "classnames"
import styles from "./AIAgent.module.scss"
import {YakitAutoComplete} from "@/components/yakitUI/YakitAutoComplete/YakitAutoComplete"
import {YakitRadioButtons} from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtons"

export const AIChatSetting: React.FC<AIChatSettingProps> = memo((props) => {
    const {} = props

    const [form] = Form.useForm()

    const {setting} = useStore()
    const {setSetting} = useDispatcher()

    useEffect(() => {
        form && form.setFieldsValue({...(setting || {})})
    }, [setting])

    const handleFormChange = useMemoizedFn((changedValues) => {
        setSetting && setSetting((old) => ({...old, ...changedValues}))
    })

    const forgeList = useMemo(() => {
        return [
            {label: "fragment_summarizer", value: "fragment_summarizer"},
            {label: "long_text_summarizer", value: "long_text_summarizer"},
            {label: "xss", value: "xss"},
            {label: "sqlinject", value: "sqlinject"},
            {label: "travelmaster", value: "travelmaster"},
            {label: "pimatrix", value: "pimatrix"},
            {label: "netscan", value: "netscan"},
            {label: "recon", value: "recon"}
        ]
    }, [])

    return (
        <div className={styles["ai-chat-setting"]}>
            <Form className={styles["setting-form"]} form={form} layout='vertical' onValuesChange={handleFormChange}>
                <Form.Item label='禁用人机交互 :' name='DisallowRequireForUserPrompt' valuePropName='checked'>
                    <YakitSwitch />
                </Form.Item>
                <Form.Item label='Review 规则 :' name='ReviewPolicy'>
                    <YakitRadioButtons
                        buttonStyle='solid'
                        size={"small"}
                        options={[
                            {
                                value: "manual",
                                label: "Manual"
                            },
                            {
                                value: "yolo",
                                label: "Yolo"
                            },
                            {
                                value: "ai",
                                label: "AI"
                            }
                        ]}
                    />
                </Form.Item>
                <Form.Item label='激活系统文件操作权限 :' name='EnableSystemFileSystemOperator' valuePropName='checked'>
                    <YakitSwitch />
                </Form.Item>
                <Form.Item label='使用默认系统配置AI :' name='UseDefaultAIConfig' valuePropName='checked'>
                    <YakitSwitch />
                </Form.Item>
                <Form.Item label='任务模板 :' name='ForgeName'>
                    <YakitAutoComplete
                        size={"small"}
                        showSearch
                        options={forgeList}
                        placeholder='请输入任务模板'
                        filterOption={true}
                    />
                </Form.Item>
            </Form>
        </div>
    )
})
