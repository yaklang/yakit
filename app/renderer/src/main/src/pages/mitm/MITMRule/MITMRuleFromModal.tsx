import {Drawer, Form, Input} from "antd"
import React, {useEffect, useState} from "react"
import styles from "./MITMRuleFromModal.module.scss"
import classNames from "classnames"
import {ExtractRegularProps, MITMRuleFromModalProps} from "./MITMRuleType"
import {YakitModal} from "@/components/yakit/YakitModal/YakitModal"
import {randomString} from "@/utils/randomUtil"
import {YakitInputNumber} from "@/components/yakit/YakitInputNumber/YakitInputNumber"
import {useMemoizedFn} from "ahooks"
import {AdjustmentsIcon} from "@/assets/newIcon"
import {WebFuzzerResponseExtractor} from "@/utils/extractor"
import {FuzzerResponse} from "@/pages/fuzzer/HTTPFuzzerPage"
import {YakEditor} from "@/utils/editors"
import {editor} from "monaco-editor"
import {Uint8ArrayToString} from "@/utils/str"

const emptyFuzzer: FuzzerResponse = {
    Method: "",
    StatusCode: 200,
    Host: "",
    ContentType: "",
    Headers: [],
    ResponseRaw: new Uint8Array(),
    RequestRaw: new Uint8Array(),
    BodyLength: 0,
    UUID: "",
    Timestamp: 0,
    DurationMs: 0,
    Ok: true,
    Reason: ""
}

/**
 * @description:MITMRule 新增或修改
 * @param {boolean} modalVisible 是否显示
 * @param {boolean} isEdit 是否修改
 * @param {MITMContentReplacerRule} currentItem 当前数据
 * @param {Function} onClose 关闭回调
 */
export const MITMRuleFromModal: React.FC<MITMRuleFromModalProps> = (props) => {
    const {modalVisible, onClose, currentItem, isEdit} = props
    const [ruleVisible, setRuleVisible] = useState<boolean>()
    const [form] = Form.useForm()
    useEffect(() => {
        console.log("currentItem", currentItem)

        form.setFieldsValue({
            ...currentItem
        })
    }, [currentItem])
    const onOk = useMemoizedFn(() => {
        form.validateFields()
            .then((values) => {
                console.log("values", values)
            })
            .catch((errorInfo) => {})
    })
    return (
        <>
            <YakitModal
                title={isEdit ? "修改规则" : "新增规则"}
                // visible={modalVisible}
                visible={true}
                onCancel={() => onClose()}
                closable
                okType='primary'
                okText={isEdit ? "修改" : "添加该规则"}
                width={720}
                zIndex={1001}
                onOk={() => onOk()}
                centered={true}
            >
                <Form form={form} labelCol={{span: 5}} wrapperCol={{span: 16}} className={styles["modal-from"]}>
                    <Form.Item label='执行顺序' name='Index'>
                        <YakitInputNumber type='horizontal' min={1} />
                    </Form.Item>
                    <Form.Item label='规则名称' name='VerboseName'>
                        <Input />
                    </Form.Item>
                    <Form.Item label='规则内容' name='Rule' rules={[{required: true, message: "该项为必填"}]}>
                        <Input
                            placeholder='可用右侧辅助工具，自动生成正则'
                            addonAfter={
                                <AdjustmentsIcon
                                    className={styles["icon-adjustments"]}
                                    onClick={() => setRuleVisible(true)}
                                />
                            }
                        />
                    </Form.Item>
                    <Form.Item
                        label='替换结果'
                        help='HTTP Header 与 HTTP Cookie 优先级较高，会覆盖文本内容'
                        name='Result'
                    >
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
            <YakitModal
                title='自动提取正则'
                subTitle='在编译器中选中内容，即可自动生成正则'
                visible={ruleVisible}
                onCancel={() => setRuleVisible(false)}
                width={840}
                zIndex={1002}
                footer={null}
                closable={true}
                centered={true}
            >
                <ExtractRegular />
            </YakitModal>
        </>
    )
}

const ExtractRegular: React.FC<ExtractRegularProps> = (props) => {
    const [editor, setEditor] = useState<editor.IStandaloneCodeEditor>()
    return (
        <div className={styles["yakit-extract-regular-editor"]}>
            <YakEditor
                editorDidMount={(e) => {
                    setEditor(e)
                }}
                noMiniMap={true}
                noLineNumber={true}
                type={"html"}
                // value={Uint8ArrayToString(editor)}
            />
        </div>
    )
}
