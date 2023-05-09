import {Col, Divider, Form, Row} from "antd"
import React, {useEffect, useImperativeHandle, useRef, useState} from "react"
import styles from "./MITMRuleFromModal.module.scss"
import classNames from "classnames"
import {
    ExtractRegularProps,
    ExtraHTTPSelectProps,
    InputHTTPHeaderFormProps,
    MITMContentReplacerRule,
    MITMRuleFromModalProps,
    RuleContentProps
} from "./MITMRuleType"
import {useDebounceEffect, useMemoizedFn} from "ahooks"
import {AdjustmentsIcon, CheckIcon, PencilAltIcon, PlusCircleIcon} from "@/assets/newIcon"
import {FuzzerResponse} from "@/pages/fuzzer/HTTPFuzzerPage"
import {YakEditor} from "@/utils/editors"
import {editor} from "monaco-editor"
import {StringToUint8Array} from "@/utils/str"
import {failed} from "@/utils/notification"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {YakitInputNumber} from "@/components/yakitUI/YakitInputNumber/YakitInputNumber"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {YakitRadioButtons} from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtons"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitAutoComplete} from "@/components/yakitUI/YakitAutoComplete/YakitAutoComplete"
import {HTTPCookieSetting, HTTPHeader} from "../MITMContentReplacerHeaderOperator"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {YakitSwitch} from "@/components/yakitUI/YakitSwitch/YakitSwitch"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import {colorSelectNode} from "./MITMRule"
import {ValidateStatus} from "antd/lib/form/FormItem"
import {InternalTextAreaProps} from "@/components/yakitUI/YakitInput/YakitInputType"
import {YakitSizeType} from "@/components/yakitUI/YakitInputNumber/YakitInputNumberType"
import {SizeType} from "antd/lib/config-provider/SizeContext"

const {ipcRenderer} = window.require("electron")

/**
 * @description:MITMRule 新增或修改
 * @param {boolean} modalVisible 是否显示
 * @param {boolean} isEdit 是否修改
 * @param {MITMContentReplacerRule} currentItem 当前数据
 * @param {Function} onClose 关闭回调
 */
export const MITMRuleFromModal: React.FC<MITMRuleFromModalProps> = (props) => {
    const {modalVisible, onClose, currentItem, isEdit, rules, onSave} = props

    const ruleContentRef = useRef<any>()
    const [form] = Form.useForm()

    const resultType = Form.useWatch("ResultType", form)
    const headers: HTTPHeader[] = Form.useWatch("ExtraHeaders", form) || []
    const cookies: HTTPCookieSetting[] = Form.useWatch("ExtraCookies", form) || []

    useEffect(() => {
        form.setFieldsValue({
            ...currentItem,
            ResultType:
                currentItem && (currentItem?.ExtraHeaders?.length > 0 || currentItem?.ExtraCookies?.length > 0) ? 2 : 1 //  1 文本  2 HTTP
        })
        ruleContentRef?.current?.onSetValue(currentItem?.Rule)
    }, [currentItem])
    const onOk = useMemoizedFn(() => {
        form.validateFields()
            .then((values: MITMContentReplacerRule) => {
                const newValues = {...currentItem, ...values}
                if (newValues.ExtraCookies.length > 0 || newValues.ExtraHeaders.length > 0 || !!newValues.Result) {
                    newValues.NoReplace = false
                } else {
                    newValues.NoReplace = true
                }
                onSave(newValues)
            })
            .catch((errorInfo) => {})
    })
    const getRule = useMemoizedFn((val: string) => {
        form.setFieldsValue({
            Rule: val
        })
    })
    const getExtraHeaders = useMemoizedFn((val) => {
        form.setFieldsValue({
            ExtraHeaders: [...headers, val]
        })
    })
    const getExtraCookies = useMemoizedFn((val) => {
        form.setFieldsValue({
            ExtraCookies: [...cookies, val]
        })
    })
    const onRemoveExtraHeaders = useMemoizedFn((index: number) => {
        form.setFieldsValue({
            ExtraHeaders: headers.filter((_, i) => i !== index)
        })
    })
    const onRemoveExtraCookies = useMemoizedFn((index: number) => {
        form.setFieldsValue({
            ExtraCookies: cookies.filter((_, i) => i !== index)
        })
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
            >
                <Form form={form} labelCol={{span: 5}} wrapperCol={{span: 16}} className={styles["modal-from"]}>
                    {/* <Form.Item
                        label='执行顺序'
                        name='Index'
                        rules={[
                            {
                                validator: async (_, value) => {
                                    if (!value) {
                                        return Promise.reject("请输入大于0的数字")
                                    }
                                    if (value <= 0) {
                                        return Promise.reject("需要输入大于0的数字")
                                    }
                                    if (
                                        rules.filter((i) => i.Index === value).length > 0 &&
                                        !(isEdit && value === currentItem?.Index)
                                    ) {
                                        return Promise.reject("执行顺序冲突（Index 冲突），重新设置执行顺序")
                                    }
                                }
                            }
                        ]}
                    >
                        <YakitInputNumber type='horizontal' min={1} />
                    </Form.Item> */}
                    <Form.Item label='规则名称' name='VerboseName'>
                        <YakitInput />
                    </Form.Item>
                    <Form.Item label='规则内容' name='Rule' rules={[{required: true, message: "该项为必填"}]}>
                        <RuleContent getRule={getRule} ref={ruleContentRef}/>
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
                    {(resultType === 1 && (
                        <Form.Item label='文本' name='Result'>
                            <YakitInput placeholder='输入想要替换的内容，可以为空～' />
                        </Form.Item>
                    )) || (
                        <>
                            <Form.Item label='HTTP Header' name='ExtraHeaders'>
                                <ExtraHTTPSelect
                                    tip='Header'
                                    onSave={getExtraHeaders}
                                    list={headers}
                                    onRemove={onRemoveExtraHeaders}
                                />
                            </Form.Item>
                            <Form.Item label='HTTP Cookie' name='ExtraCookies'>
                                <ExtraHTTPSelect
                                    tip='Cookie'
                                    onSave={getExtraCookies}
                                    list={cookies.map((item) => ({Header: item.Key, Value: item.Value}))}
                                    onRemove={onRemoveExtraCookies}
                                />
                            </Form.Item>
                        </>
                    )}
                    <Row>
                        <Col span={5}>&nbsp;</Col>
                        <Col span={16}>
                            <Divider dashed style={{marginTop: 0}} />
                        </Col>
                    </Row>
                    <Form.Item label='命中颜色' name='Color'>
                        <YakitSelect size='middle' wrapperStyle={{width: "100%"}}>
                            {colorSelectNode}
                        </YakitSelect>
                    </Form.Item>
                    <Form.Item label='标记 Tag' name='ExtraTag'>
                        <YakitSelect size='middle' mode='tags' wrapperStyle={{width: "100%"}} />
                    </Form.Item>
                </Form>
            </YakitModal>
        </>
    )
}

const ExtractRegular: React.FC<ExtractRegularProps> = React.memo((props) => {
    const {onSave} = props
    const [editor, setEditor] = useState<editor.IStandaloneCodeEditor>()
    const [selected, setSelected] = useState<string>("")
    const [_responseStr, setResponseStr] = useState<string>("")

    //用户选择的数据转换成的正则
    const [matchedRegexp, setMatchedRegexp] = useState<string>("")

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
            <RegexpInput regexp={matchedRegexp} tagSize="large" showCheck={true} onSave={onSave} onSure={setMatchedRegexp} />
        </div>
    )
})
interface RegexpInputProps {
    regexp: string
    inputSize?: SizeType
    onSave: (s: string) => void
    onSure: (s: string) => void
    showCheck?: boolean
    /**@name 初始是否显示 编辑icon/初始文字tag */
    initialTagShow?: boolean
    textAreaProps?: InternalTextAreaProps
    tagSize?: YakitSizeType
}

export const RegexpInput: React.FC<RegexpInputProps> = React.memo((props) => {
    const {regexp, inputSize, tagSize = "middle", onSave, onSure, showCheck, initialTagShow} = props
    const [isEdit, setIsEdit] = useState<boolean>(false)
    const [tagShow, setTagShow] = useState<boolean>(initialTagShow || false)
    const [editMatchedRegexp, setEditMatchedRegexp] = useState<string>("")
    useEffect(() => {
        if (regexp) setTagShow(true)
    }, [regexp])
    return (
        <div className={styles["yakit-editor-regexp"]}>
            {!isEdit && tagShow && (
                <YakitTag size={tagSize} className={styles["yakit-editor-regexp-tag"]}>
                    <div className={styles["yakit-editor-regexp-value"]} title={regexp}>
                        {regexp}
                    </div>
                    <div className={styles["yakit-editor-icon"]}>
                        <PencilAltIcon
                            onClick={() => {
                                setIsEdit(true)
                                setTagShow(true)
                                setEditMatchedRegexp(regexp)
                            }}
                        />
                        {showCheck && (
                            <>
                                <Divider type='vertical' style={{top: 1}} />
                                <CheckIcon
                                    onClick={() => {
                                        onSave(regexp)
                                    }}
                                />
                            </>
                        )}
                    </div>
                </YakitTag>
            )}
            <div className={styles["yakit-editor-text-area"]} style={{display: isEdit ? "" : "none"}}>
                <YakitInput.TextArea
                    value={editMatchedRegexp}
                    onChange={(e) => setEditMatchedRegexp(e.target.value)}
                    autoSize={{minRows: 1, maxRows: 3}}
                    size={inputSize}
                />
                <div className={styles["yakit-editor-btn"]}>
                    <div className={styles["cancel-btn"]} onClick={() => setIsEdit(false)}>
                        取消
                    </div>
                    <Divider type='vertical' style={{margin: "0 8px", top: 1}} />
                    <div
                        className={styles["save-btn"]}
                        onClick={() => {
                            setIsEdit(false)
                            onSure(editMatchedRegexp)
                        }}
                    >
                        确定
                    </div>
                </div>
            </div>
        </div>
    )
})

const ExtraHTTPSelect: React.FC<ExtraHTTPSelectProps> = React.memo((props) => {
    const {tip, onSave, list, onRemove} = props
    const [visibleHTTPHeader, setVisibleHTTPHeader] = useState<boolean>(false)
    return (
        <div className={styles["yakit-extra-http-select"]}>
            <div className={styles["yakit-extra-http-select-heard"]}>
                <YakitButton type='text' icon={<PlusCircleIcon />} onClick={() => setVisibleHTTPHeader(true)}>
                    添加
                </YakitButton>
                <div className={styles["extra-tip"]}>
                    已设置 <span className={styles["number"]}>{list.length}</span> 个额外 {tip}
                </div>
            </div>
            {(tip === "Header" && (
                <InputHTTPHeaderForm visible={visibleHTTPHeader} setVisible={setVisibleHTTPHeader} onSave={onSave} />
            )) || <InputHTTPCookieForm visible={visibleHTTPHeader} setVisible={setVisibleHTTPHeader} onSave={onSave} />}

            {list && list.length > 0 && (
                <div className={styles["http-tags"]}>
                    {list.map((item, index) => (
                        <YakitTag
                            key={`${item.Header}-${index}`}
                            closable
                            onClose={() => onRemove(index)}
                            className={styles["tag-item"]}
                        >
                            {item.Header}
                        </YakitTag>
                    ))}
                </div>
            )}
        </div>
    )
})

const InputHTTPHeaderForm: React.FC<InputHTTPHeaderFormProps> = React.memo((props) => {
    const {visible, setVisible, onSave} = props
    const [form] = Form.useForm()
    return (
        <YakitModal
            title='输入新的 HTTP Header'
            visible={visible}
            onCancel={() => setVisible(false)}
            zIndex={1002}
            footer={null}
            closable={true}
        >
            <Form
                labelCol={{span: 5}}
                wrapperCol={{span: 14}}
                onFinish={(val: HTTPHeader) => {
                    onSave(val)
                    setVisible(false)
                    form.resetFields()
                }}
                form={form}
                className={styles["http-heard-form"]}
            >
                <Form.Item label='HTTP Header' name='Header' rules={[{required: true, message: "该项为必填"}]}>
                    <YakitAutoComplete
                        options={[
                            "Authorization",
                            "Accept",
                            "Accept-Charset",
                            "Accept-Encoding",
                            "Accept-Language",
                            "Accept-Ranges",
                            "Cache-Control",
                            "Cc",
                            "Connection",
                            "Content-Id",
                            "Content-Language",
                            "Content-Length",
                            "Content-Transfer-Encoding",
                            "Content-Type",
                            "Cookie",
                            "Date",
                            "Dkim-Signature",
                            "Etag",
                            "Expires",
                            "From",
                            "Host",
                            "If-Modified-Since",
                            "If-None-Match",
                            "In-Reply-To",
                            "Last-Modified",
                            "Location",
                            "Message-Id",
                            "Mime-Version",
                            "Pragma",
                            "Received",
                            "Return-Path",
                            "Server",
                            "Set-Cookie",
                            "Subject",
                            "To",
                            "User-Agent",
                            "X-Forwarded-For",
                            "Via",
                            "X-Imforwards",
                            "X-Powered-By"
                        ].map((ele) => ({value: ele, label: ele}))}
                        filterOption={(inputValue, option) => {
                            if (option?.value && typeof option?.value === "string") {
                                return option?.value?.toUpperCase().indexOf(inputValue.toUpperCase()) !== -1
                            }
                            return false
                        }}
                        size='middle'
                    />
                </Form.Item>

                <Form.Item label='HTTP Value' name='Value'>
                    <YakitInput />
                </Form.Item>
                <Form.Item colon={false} label={" "}>
                    <YakitButton type='primary' htmlType='submit'>
                        设置该 Header
                    </YakitButton>
                </Form.Item>
            </Form>
        </YakitModal>
    )
})

const InputHTTPCookieForm: React.FC<InputHTTPHeaderFormProps> = React.memo((props) => {
    const {visible, setVisible, onSave} = props
    const [form] = Form.useForm()
    const [advanced, setAdvanced] = useState(false)
    return (
        <YakitModal
            title='输入新的 Cookie 值'
            visible={visible}
            onCancel={() => setVisible(false)}
            zIndex={1002}
            footer={null}
            closable={true}
            width={600}
        >
            <Form
                labelCol={{span: 5}}
                wrapperCol={{span: 14}}
                onFinish={(val: HTTPHeader) => {
                    onSave(val)
                    setVisible(false)
                    form.resetFields()
                }}
                form={form}
                className={styles["http-heard-form"]}
            >
                <Form.Item label='Cookie Key' name='Key' rules={[{required: true, message: "该项为必填"}]}>
                    <YakitAutoComplete
                        options={["JSESSION", "PHPSESSION", "SESSION", "admin", "test", "debug"].map((ele) => ({
                            value: ele,
                            label: ele
                        }))}
                        filterOption={(inputValue, option) => {
                            if (option?.value && typeof option?.value === "string") {
                                return option?.value?.toUpperCase().indexOf(inputValue.toUpperCase()) !== -1
                            }
                            return false
                        }}
                        size='middle'
                    />
                </Form.Item>
                <Form.Item label='Cookie Value' name='Value' rules={[{required: true, message: "该项为必填"}]}>
                    <YakitInput />
                </Form.Item>
                <Divider orientation={"left"}>
                    高级配置&emsp;
                    <YakitSwitch checked={advanced} onChange={(c) => setAdvanced(c)} />
                </Divider>
                {advanced && (
                    <>
                        <Form.Item label='Path' name='Path'>
                            <YakitInput />
                        </Form.Item>
                        <Form.Item label='Domain' name='Domain'>
                            <YakitInput />
                        </Form.Item>
                        <Form.Item label='HttpOnly' name='HttpOnly'>
                            <YakitSwitch />
                        </Form.Item>
                        <Form.Item label='Secure' name='Secure' help='仅允许 Cookie 在 HTTPS 生效'>
                            <YakitSwitch />
                        </Form.Item>
                        <Form.Item label='SameSite 策略' name='SameSiteMode' initialValue='default'>
                            <YakitRadioButtons
                                size='large'
                                options={[
                                    {label: "默认策略", value: "default"},
                                    {label: "Lax 策略", value: "lax"},
                                    {label: "Strict 策略", value: "strict"},
                                    {label: "不设置", value: "none"}
                                ]}
                                buttonStyle='solid'
                            />
                        </Form.Item>
                        <Form.Item label='Expires 时间戳' name='Expires'>
                            <YakitInputNumber type='horizontal' />
                        </Form.Item>
                        <Form.Item label='MaxAge' name='MaxAge'>
                            <YakitInputNumber type='horizontal' />
                        </Form.Item>
                    </>
                )}
                <Form.Item colon={false} label={" "}>
                    <YakitButton type='primary' htmlType='submit'>
                        添加该 Cookie
                    </YakitButton>
                </Form.Item>
            </Form>
        </YakitModal>
    )
})

export const RuleContent: React.FC<RuleContentProps> = React.forwardRef((props, ref) => {
    useImperativeHandle(ref, () => ({
        onSetValue: (v) => {
            setRule(v)
        }
    }))
    const {getRule, inputProps} = props
    const [rule, setRule] = useState<string>("")
    const [ruleVisible, setRuleVisible] = useState<boolean>()
    const onGetRule = useMemoizedFn((val: string) => {
        setRule(val)
        getRule(val)
        setRuleVisible(false)
    })

    return (
        <>
            <YakitInput
                {...inputProps}
                value={rule}
                placeholder='可用右侧辅助工具，自动生成正则'
                addonAfter={
                    <AdjustmentsIcon className={styles["icon-adjustments"]} onClick={() => setRuleVisible(true)} />
                }
                onChange={(e) => {
                    const {value} = e.target
                    setRule(value)
                    getRule(value)
                }}
            />
            <YakitModal
                title='自动提取正则'
                subTitle='在编译器中选中内容，即可自动生成正则'
                visible={ruleVisible}
                onCancel={() => setRuleVisible(false)}
                width={840}
                zIndex={1002}
                footer={null}
                closable={true}
            >
                <ExtractRegular onSave={(v)=>onGetRule(v)} />
            </YakitModal>
        </>
    )
})
