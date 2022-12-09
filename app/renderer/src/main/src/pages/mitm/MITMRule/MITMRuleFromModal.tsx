import {Col, Divider, Form, Row} from "antd"
import React, {useEffect, useState} from "react"
import styles from "./MITMRuleFromModal.module.scss"
import classNames from "classnames"
import {
    ExtractRegularProps,
    ExtraHTTPSelectProps,
    InputHTTPHeaderFormProps,
    MITMRuleFromModalProps
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
import {TagsFilter, TagsList} from "@/components/baseTemplate/BaseTags"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {YakitSwitch} from "@/components/yakitUI/YakitSwitch/YakitSwitch"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import {colorSelectNode, HitColor} from "./MITMRule"

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
    const resultType = Form.useWatch("ResultType", form)
    const headers: HTTPHeader[] = Form.useWatch("ExtraHeaders", form) || []
    const cookies: HTTPCookieSetting[] = Form.useWatch("ExtraCookies", form) || []
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
    const getExtraHeaders = useMemoizedFn((val) => {
        console.log("getExtraHeaders", val)
        form.setFieldsValue({
            ExtraHeaders: [...headers, val]
        })
    })
    const getExtraCookies = useMemoizedFn((val) => {
        console.log("getExtraCookies", val)
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
                    <Form.Item label='命中颜色' name='Color'>
                        <YakitSelect size='middle' wrapperStyle={{width: "100%"}}>
                            {colorSelectNode}
                        </YakitSelect>
                    </Form.Item>
                    <Form.Item label='标记 Tag' name='ExtraTag'>
                        {/* <TagsFilter data={[]} style={{width: "100%"}} submitValue={() => {}} /> */}
                        <YakitSelect size='middle' mode='tags' wrapperStyle={{width: "100%"}} />
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

const ExtraHTTPSelect: React.FC<ExtraHTTPSelectProps> = (props) => {
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
}

const InputHTTPHeaderForm: React.FC<InputHTTPHeaderFormProps> = (props) => {
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
}

const InputHTTPCookieForm: React.FC<InputHTTPHeaderFormProps> = (props) => {
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
                        <Form.Item label='SameSite 策略' name='SameSiteMode'>
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
                            <YakitSwitch />
                        </Form.Item>
                        <Form.Item label='MaxAge' name='MaxAge'>
                            <YakitSwitch />
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
}
