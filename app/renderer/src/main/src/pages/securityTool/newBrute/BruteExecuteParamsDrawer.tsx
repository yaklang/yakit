import {YakitDrawer} from "@/components/yakitUI/YakitDrawer/YakitDrawer"
import React, {useEffect} from "react"
import styles from "./BruteExecuteParamsDrawer.module.scss"
import {BruteExecuteExtraFormValue} from "./NewBruteType"
import {Form} from "antd"
import {useMemoizedFn} from "ahooks"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"

interface BruteExecuteParamsDrawerProps {
    extraParamsValue: BruteExecuteExtraFormValue
    visible: boolean
    onSave: (value: BruteExecuteExtraFormValue) => void
}
const BruteExecuteParamsDrawer: React.FC<BruteExecuteParamsDrawerProps> = React.memo((props) => {
    const {extraParamsValue, visible, onSave} = props
    const [form] = Form.useForm()
    useEffect(() => {
        if (visible) {
            form.setFieldsValue({...extraParamsValue})
        }
    }, [visible, extraParamsValue])
    const onClose = useMemoizedFn(() => {
        onSaveSetting()
    })
    const onSaveSetting = useMemoizedFn(() => {
        form.validateFields().then((formValue) => {
            onSave(formValue)
        })
    })
    return (
        <YakitDrawer
            className={styles["brute-execute-extra-params-drawer"]}
            visible={visible}
            onClose={onClose}
            width='65%'
            title='额外参数'
        >
            <Form size='small' labelCol={{span: 6}} wrapperCol={{span: 18}} form={form}>
                <Form.Item label='爆破用户字典' name='Mode'>
                    <YakitSelect />
                </Form.Item>
                <div className={styles["to-end"]}>已经到底啦～</div>
            </Form>
        </YakitDrawer>
    )
})
export default BruteExecuteParamsDrawer
