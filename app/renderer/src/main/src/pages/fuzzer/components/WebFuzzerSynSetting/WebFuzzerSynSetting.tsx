import {WebFuzzerSynSettingProps} from "./WebFuzzerSynSettingType"
import styles from "./WebFuzzerSynSetting.module.scss"
import React, {useState} from "react"
import {Checkbox, Form} from "antd"
import {YakitCheckbox} from "@/components/yakitUI/YakitCheckbox/YakitCheckbox"
import {YakitRadioButtons} from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtons"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {on} from "events"
import {useMemoizedFn} from "ahooks"

const rangeList = [
    {
        value: "all",
        label: "所有页面"
    },
    {
        value: "batch",
        label: "自定义页面"
    }
]
const types = [
    {
        value: "config",
        label: "配置"
    },
    {
        value: "rule",
        label: "规则"
    }
]
const WebFuzzerSynSetting: React.FC<WebFuzzerSynSettingProps> = React.memo((props) => {
    const {pageId, onClose} = props
    const [loading, setLoading] = useState<boolean>(false)
    const [form] = Form.useForm()
    const range = Form.useWatch("range", form)
    const onCancel = useMemoizedFn(() => {
        onClose()
    })
    const onSyn = useMemoizedFn(() => {
        
        form.validateFields().then((value) => {
            setLoading(true)
            setTimeout(() => {
                setLoading(false)
                // onClose()
            }, 200)
        })
    })
    return (
        <div className={styles["wf-syn-setting"]}>
            <Form
                form={form}
                labelCol={{span: 4}}
                wrapperCol={{span: 20}}
                initialValues={{
                    type: ["config", "rule"],
                    range: "all",
                    ids: []
                }}
            >
                <Form.Item
                    label='同步内容'
                    name='type'
                    rules={[{required: true, message: `请选中同步的内容`}]}
                    className={styles["setting-type-form-item"]}
                >
                    <Checkbox.Group>
                        <div style={{display: "flex"}}>
                            {types.map((ele) => (
                                <YakitCheckbox key={ele.value} value={ele.value}>
                                    {ele.label}
                                </YakitCheckbox>
                            ))}
                        </div>
                    </Checkbox.Group>
                </Form.Item>
                <Form.Item
                    label='同步范围'
                    name='range'
                    extra={
                        range === "batch" && (
                            <Form.Item name='ids' style={{marginTop: 8}}>
                                <YakitSelect mode='tags' />
                            </Form.Item>
                        )
                    }
                >
                    <YakitRadioButtons buttonStyle='solid' options={rangeList} />
                </Form.Item>
            </Form>
            <div className={styles["setting-footer"]}>
                <YakitButton type='outline1' onClick={onCancel}>
                    取消
                </YakitButton>
                <YakitButton type='primary' onClick={onSyn} loading={loading}>
                    同步
                </YakitButton>
            </div>
        </div>
    )
})

export default WebFuzzerSynSetting
