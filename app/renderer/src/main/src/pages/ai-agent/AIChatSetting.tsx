import React, {memo, useEffect} from "react"
import {AIChatSettingProps} from "./aiAgentType"
import useStore from "./useContext/useStore"
import useDispatcher from "./useContext/useDispatcher"
import {Form} from "antd"
import {YakitSwitch} from "@/components/yakitUI/YakitSwitch/YakitSwitch"
import {useMemoizedFn} from "ahooks"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"

// import classNames from "classnames"
import styles from "./AIAgent.module.scss"

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

    return (
        <div className={styles["ai-chat-setting"]}>
            <Form className={styles["setting-form"]} form={form} layout='vertical' onValuesChange={handleFormChange}>
                <Form.Item label='自动执行AI任务 :' name='AutoExecute' valuePropName='checked'>
                    <YakitSwitch />
                </Form.Item>
                <Form.Item label='激活系统文件操作权限 :' name='EnableSystemFileSystemOperator' valuePropName='checked'>
                    <YakitSwitch />
                </Form.Item>
                <Form.Item label='使用默认系统配置AI :' name='UseDefaultAIConfig' valuePropName='checked'>
                    <YakitSwitch />
                </Form.Item>
                <Form.Item label='任务模板 :' name='ForgeName'>
                    <YakitInput placeholder='请输入任务模板' />
                </Form.Item>
            </Form>
        </div>
    )
})
