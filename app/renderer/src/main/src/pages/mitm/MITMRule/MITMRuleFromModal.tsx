import {Col, Divider, Drawer, Form, Input, Row, Tag} from "antd"
import React, {useEffect, useState} from "react"
import styles from "./MITMRuleFromModal.module.scss"
import classNames from "classnames"
import {ExtractRegularProps, MITMRuleFromModalProps} from "./MITMRuleType"
import {useDebounceEffect, useMemoizedFn} from "ahooks"
import {AdjustmentsIcon, CheckIcon, PencilAltIcon} from "@/assets/newIcon"
import {WebFuzzerResponseExtractor} from "@/utils/extractor"
import {FuzzerResponse} from "@/pages/fuzzer/HTTPFuzzerPage"
import {YakEditor} from "@/utils/editors"
import {editor} from "monaco-editor"
import {StringToUint8Array} from "@/utils/str"
import {failed} from "@/utils/notification"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {YakitInputNumber} from "@/components/yakitUI/YakitInputNumber/YakitInputNumber"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {YakitRadioButtons} from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtons"

const {ipcRenderer} = window.require("electron")

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
            ...currentItem,
            ResultType:
                currentItem && (currentItem.ExtraHeaders.length > 0 || currentItem.ExtraCookies.length > 0) ? 2 : 1 //  1 文本  2 HTTP
        })
    }, [currentItem])
    const onOk = useMemoizedFn(() => {
        form.validateFields()
            .then((values) => {
                console.log("values", values)
            })
            .catch((errorInfo) => {})
    })
    const getRule = useMemoizedFn((val: string) => {
        console.log("val", val)

        form.setFieldsValue({
            Rule: val
        })
        setRuleVisible(false)
    })
    return (
        <>
            <YakitModal
                title={isEdit ? "修改规则" : "新增规则"}
                visible={modalVisible}
                // visible={true}
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
                        <YakitInput />
                    </Form.Item>
                    <Form.Item label='规则内容' name='Rule' rules={[{required: true, message: "该项为必填"}]}>
                        <YakitInput
                            placeholder='可用右侧辅助工具，自动生成正则'
                            addonAfter={
                                <AdjustmentsIcon
                                    className={styles["icon-adjustments"]}
                                    onClick={() => setRuleVisible(true)}
                                />
                            }
                        />
                    </Form.Item>
                    <Row>
                        <Col span={5}>&nbsp;</Col>
                        <Col span={16}>
                            <Divider dashed style={{marginTop: 0}} />
                        </Col>
                    </Row>

                    <Form.Item
                        label='替换结果'
                        help='HTTP Header 与 HTTP Cookie 优先级较高，会覆盖文本内容'
                        name='ResultType'
                    >
                        <YakitRadioButtons
                            size='large'
                            options={[
                                {label: "文本", value: 1},
                                {label: "HTTP Header/Cookie", value: 2}
                            ]}
                            buttonStyle='solid'
                        />
                    </Form.Item>
                    <Form.Item label='HTTP Header' name='ExtraHeaders'>
                        <YakitInput />
                    </Form.Item>
                    <Form.Item label='HTTP Cookie' name='ExtraCookies'>
                        <YakitInput />
                    </Form.Item>
                    <Form.Item label='命中颜色' name='Color'>
                        <YakitInput />
                    </Form.Item>
                    <Form.Item label='标记 Tag' name='ExtraTag'>
                        <YakitInput />
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
                <ExtractRegular onSave={getRule} />
            </YakitModal>
        </>
    )
}

const ExtractRegular: React.FC<ExtractRegularProps> = (props) => {
    const {onSave} = props
    const [editor, setEditor] = useState<editor.IStandaloneCodeEditor>()
    const [selected, setSelected] = useState<string>("")
    const [_responseStr, setResponseStr] = useState<string>("")
    const [isEdit, setIsEdit] = useState<boolean>(false)
    //用户选择的数据转换成的正则
    const [matchedRegexp, setMatchedRegexp] = useState<string>("")
    const [editMatchedRegexp, setEditMatchedRegexp] = useState<string>("")
    useEffect(() => {
        if (!editor) {
            return
        }
        const model = editor.getModel()
        if (!model) {
            return
        }
        const setSelectedFunc = () => {
            try {
                const selection = editor.getSelection()
                if (!selection) {
                    return
                }

                setResponseStr(model.getValue())
                // 这里能获取到选择到的内容
                setSelected(model.getValueInRange(selection))
            } catch (e) {
                failed("提取选择数据错误" + e)
            }
        }
        setSelectedFunc()
        const id = setInterval(setSelectedFunc, 500)
        return () => {
            clearInterval(id)
        }
    }, [editor])
    useDebounceEffect(
        () => {
            if (!selected) {
                return
            }

            ipcRenderer
                .invoke("GenerateExtractRule", {
                    Data: StringToUint8Array(_responseStr),
                    Selected: StringToUint8Array(selected)
                })
                .then((e: {PrefixRegexp: string; SuffixRegexp: string; SelectedRegexp: string}) => {
                    setMatchedRegexp(e.SelectedRegexp)
                })
                .catch((e) => {
                    failed(`无法生成数据提取规则: ${e}`)
                })
        },
        [selected],
        {wait: 500}
    )
    return (
        <div className={styles["yakit-extract-regular-editor"]}>
            <div className={styles["yakit-editor"]}>
                <YakEditor
                    editorDidMount={(e) => {
                        setEditor(e)
                    }}
                    type={"html"}
                />
            </div>
            <div className={styles["yakit-editor-regexp"]}>
                {!isEdit && matchedRegexp && (
                    <div className={styles["yakit-editor-regexp-tag"]}>
                        <div className={styles["yakit-editor-regexp-value"]} title={matchedRegexp}>
                            {matchedRegexp}
                        </div>
                        <div className={styles["yakit-editor-icon"]}>
                            <PencilAltIcon
                                onClick={() => {
                                    setIsEdit(true)
                                    setEditMatchedRegexp(matchedRegexp)
                                }}
                            />
                            <Divider type='vertical' />
                            <CheckIcon onClick={() => onSave(matchedRegexp)} />
                        </div>
                    </div>
                )}
                <div className={styles["yakit-editor-text-area"]} style={{display: isEdit ? "" : "none"}}>
                    <YakitInput.TextArea
                        value={editMatchedRegexp}
                        onChange={(e) => setEditMatchedRegexp(e.target.value)}
                        autoSize={{minRows: 1, maxRows: 3}}
                    />
                    <div className={styles["yakit-editor-btn"]}>
                        <div className={styles["cancel-btn"]} onClick={() => setIsEdit(false)}>
                            取消
                        </div>
                        <Divider type='vertical' style={{margin: "0 8px"}} />
                        <div
                            className={styles["save-btn"]}
                            onClick={() => {
                                setIsEdit(false)
                                setMatchedRegexp(editMatchedRegexp)
                            }}
                        >
                            确定
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
