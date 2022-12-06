import {Drawer, Form, Input} from "antd"
import React, {useEffect} from "react"
import styles from "./MITMRuleFromModal.module.scss"
import classNames from "classnames"
import {MITMRuleFromModalProps} from "./MITMRuleType"
import {YakitModal} from "@/components/yakit/YakitModal/YakitModal"
import {randomString} from "@/utils/randomUtil"
import {YakitInputNumber} from "@/components/yakit/YakitInputNumber/YakitInputNumber"

/**
 * @description:MITMRule 新增或修改
 */
export const MITMRuleFromModal: React.FC<MITMRuleFromModalProps> = (props) => {
    const {modalVisible, onClose, currentItem} = props
    const [form] = Form.useForm()
    useEffect(() => {
        form.setFieldsValue({
            ...currentItem,
            VerboseName: currentItem?.VerboseName ? currentItem.VerboseName : "RULE:" + randomString(10)
        })
    }, [currentItem])
    return (
        <YakitModal
            title={currentItem?.Index ? "修改规则" : "新增规则"}
            // visible={modalVisible}
            visible={true}
            onCancel={() => onClose()}
            closable
            okType='primary'
            okText={currentItem?.Index ? "修改" : "添加该规则"}
            width={720}
        >
            <Form form={form} labelCol={{span: 5}} wrapperCol={{span: 16}} className={styles["modal-from"]}>
                <Form.Item label='执行顺序' name='Index'>
                    <YakitInputNumber type='horizontal' />
                </Form.Item>
                <Form.Item label='执行顺序' name='66'>
                    <YakitInputNumber min={1} />
                </Form.Item>
                <Form.Item label='规则名称' name='VerboseName'>
                    <Input />
                </Form.Item>
                <Form.Item label='规则内容' name='Rule' rules={[{required: true, message: "该项为必填"}]}>
                    <Input />
                </Form.Item>
                <Form.Item label='替换结果' help='HTTP Header 与 HTTP Cookie 优先级较高，会覆盖文本内容' name='Result'>
                    <Input />
                </Form.Item>
                <Form.Item label='HTTP Header' name='ExtraHeaders'>
                    <Input />
                </Form.Item>
                <Form.Item label='HTTP Cookie' name='ExtraCookies'>
                    <Input />
                </Form.Item>
                <Form.Item label='命中颜色' name='Color'>
                    <Input />
                </Form.Item>
                <Form.Item label='标记 Tag' name='ExtraTag'>
                    <Input />
                </Form.Item>
            </Form>
        </YakitModal>
    )
}
