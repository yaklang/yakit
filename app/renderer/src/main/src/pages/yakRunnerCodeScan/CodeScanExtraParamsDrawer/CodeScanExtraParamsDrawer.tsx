import {YakitDrawer} from "@/components/yakitUI/YakitDrawer/YakitDrawer"
import {useMemoizedFn} from "ahooks"
import {Form} from "antd"
import React, {useEffect, useState} from "react"
import styles from "./CodeScanExtraParamsDrawer.module.scss"
import {YakitInputNumber} from "@/components/yakitUI/YakitInputNumber/YakitInputNumber"
import {YakitSwitch} from "@/components/yakitUI/YakitSwitch/YakitSwitch"
export interface CodeScanExtraParam {
    Concurrency: number
    Memory: boolean
}

interface CodeScanExtraParamsDrawerProps {
    extraParamsValue: CodeScanExtraParam
    visible: boolean
    onSave: (v: CodeScanExtraParam) => void
}

const CodeScanExtraParamsDrawer: React.FC<CodeScanExtraParamsDrawerProps> = React.memo((props) => {
    const {extraParamsValue, visible, onSave} = props
    const [form] = Form.useForm()
    useEffect(() => {
        if (visible) {
            form.setFieldsValue({...extraParamsValue})
        }
    }, [visible, extraParamsValue])

    const onClose = useMemoizedFn(() => {
        const formValue = form.getFieldsValue()
        form.validateFields().then(() => {
            onSave(formValue)
        })
    })

    return (
        <YakitDrawer
            className={styles["code-scan-execute-extra-params-drawer"]}
            visible={visible}
            onClose={onClose}
            width='40%'
            title='额外参数'
        >
            <Form labelWrap={true} labelCol={{span: 6}} wrapperCol={{span: 18}} form={form} style={{marginBottom: 8}}>
                <Form.Item label='并发' name='Concurrency' initialValue={5}>
                    <YakitInputNumber
                        type='horizontal'
                        min={1}
                    />
                </Form.Item>
                <Form.Item label='内存扫描' name='Memory' tooltip='内存扫描只会存储漏洞，不会存储过程数据'>
                    <YakitSwitch size='large' checkedChildren='开' unCheckedChildren='关' />
                </Form.Item>
            </Form>
            <div className={styles["to-end"]}>已经到底啦～</div>
        </YakitDrawer>
    )
})

export default CodeScanExtraParamsDrawer
