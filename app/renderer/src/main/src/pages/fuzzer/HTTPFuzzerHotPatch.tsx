import React, {useEffect, useState} from "react"
import {Button, Checkbox, Form, Popconfirm, Popover, Space, Tag, Tooltip} from "antd"
import {YakEditor} from "../../utils/editors"
import {callCopyToClipboard} from "../../utils/basic"
import {showDrawer, showModal} from "../../utils/showModal"
import {AutoCard} from "../../components/AutoCard"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {useGetState} from "ahooks"
import {RefreshIcon} from "@/assets/newIcon"
import {FullscreenOutlined} from "@ant-design/icons/lib"
import {SelectOne} from "@/utils/inputUtil"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitCheckbox} from "@/components/yakitUI/YakitCheckbox/YakitCheckbox"
import {YakitRadioButtons} from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtons"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"
import {YakitPopconfirm} from "@/components/yakitUI/YakitPopconfirm/YakitPopconfirm"
import styles from "./HTTPFuzzerHotPatch.module.scss"
import {showYakitDrawer} from "@/components/yakitUI/YakitDrawer/YakitDrawer"

export interface HTTPFuzzerHotPatchProp {
    onInsert?: (s: string) => any
    onSaveCode?: (code: string) => any
    onSaveHotPatchCodeWithParamGetterCode?: (code: string) => any
    initialHotPatchCode?: string
    initialHotPatchCodeWithParamGetter?: string
}

const HotPatchDefaultContent = `// 使用标签 {{yak(handle|param)}} 可触发热加载调用
handle = func(param) {
    // 在这里可以直接返回一个字符串
    return codec.EncodeBase64("base64-prefix" + param) + sprintf("_origin(%v)", param)
}

// 使用标签 {{yak(handle1|...)}} 可触发热加载调用
handle1 = func(param) {
    // 这个特殊的 Hook 也支持返回数组
    return ["12312312", "abc", "def"]
}

// beforeRequest 允许发送数据包前再做一次处理，定义为 func(origin []byte) []byte
beforeRequest = func(req) {
    /*
        // 我们可以提供一些基础用法，比如说单纯就是替换一个时间戳～
        req = str.ReplaceAll(req, "TIMESTAMP_INT64", sprint(time.Now().Unix()))
    */ 
    return []byte(req)
}
`

const HotPatchParamsGetterDefault = `__getParams__ = func() {
    /*
        __getParams__ 是一个用户可控生成复杂数据初始数据的参数：
        可以在这个函数中同时处理所有数据：
        
        1. CSRF Bypass
        2. 获取额外信息，进行强关联的信息变形
    */
    return {
        // "array-params": [1, 2, 3, 512312],  # 可用 {{params(array-params)}}
        // "foo-params": "asdfasdfassss",      # 可用 {{params(foo-params)}}
    }
}`

const {ipcRenderer} = window.require("electron")

const HTTPFuzzerHotPatch_DYNAMICPARAMS_FLAG = "HTTPFuzzerHotPatch_DYNAMICPARAMS_FLAG"
const HTTPFuzzerHotPatch_TEMPLATE_DEMO = "HTTPFuzzerHotPatch_TEMPLATE_DEMO"

export const HTTPFuzzerHotPatch: React.FC<HTTPFuzzerHotPatchProp> = (props) => {
    const [params, setParams, getParams] = useGetState({
        Template: `{{yak(handle|{{params(test)}})}}`,
        HotPatchCode: !!props.initialHotPatchCode ? props.initialHotPatchCode : HotPatchDefaultContent,
        HotPatchCodeWithParamGetter: !!props.initialHotPatchCodeWithParamGetter
            ? props.initialHotPatchCodeWithParamGetter
            : HotPatchParamsGetterDefault,
        TimeoutSeconds: 20,
        Limit: 300
    })
    const [dynamicParam, setDynamicParam, getDynamicParam] = useGetState(false)
    const [loading, setLoading] = useState(false)
    const [hotPatchEditorHeight, setHotPatchEditorHeight] = useState(400)
    const [paramEditorHeight, setParamEditorHeight] = useState(250)

    useEffect(() => {
        getRemoteValue(HTTPFuzzerHotPatch_DYNAMICPARAMS_FLAG).then((e) => {
            if (e === "1") {
                setDynamicParam(true)
            } else {
                setDynamicParam(false)
            }
        })

        getRemoteValue(HTTPFuzzerHotPatch_TEMPLATE_DEMO).then((e) => {
            if (!!e) {
                setParams({...params, Template: e})
            }
        })
        return () => {
            setRemoteValue(HTTPFuzzerHotPatch_TEMPLATE_DEMO, getParams().Template).then(() => {})
            setRemoteValue(HTTPFuzzerHotPatch_DYNAMICPARAMS_FLAG, getDynamicParam() ? "1" : "0").then(() => {})
        }
    }, [])

    return (
        <Form
            onSubmitCapture={(e) => {
                e.preventDefault()

                if (props.onSaveCode) props.onSaveCode(params.HotPatchCode)
                if (props.onSaveHotPatchCodeWithParamGetterCode)
                    props.onSaveHotPatchCodeWithParamGetterCode(params.HotPatchCodeWithParamGetter)

                setLoading(true)
                ipcRenderer
                    .invoke("StringFuzzer", {...params})
                    .then((response: {Results: Uint8Array[]}) => {
                        const data: string[] = (response.Results || []).map((buf) => new Buffer(buf).toString("utf8"))
                        showYakitDrawer({
                            title: "HotPatch Tag Result",
                            width: "45%",
                            content: (
                                <AutoCard
                                    size={"small"}
                                    bordered={false}
                                    title={<span style={{color: "var(--yakit-header-color)"}}>结果展示</span>}
                                    extra={
                                        <Space>
                                            <YakitButton
                                                type='text'
                                                onClick={() => {
                                                    callCopyToClipboard(data.join("\n"))
                                                }}
                                            >
                                                复制 Fuzz 结果
                                            </YakitButton>
                                            <YakitButton
                                                type='text'
                                                onClick={() => {
                                                    callCopyToClipboard(params.Template)
                                                }}
                                            >
                                                {" "}
                                                复制 Fuzz 标签
                                            </YakitButton>
                                        </Space>
                                    }
                                >
                                    <YakEditor value={data.join("\r\n")} readOnly={true} />
                                </AutoCard>
                            )
                        })
                    })
                    .finally(() => setTimeout(() => setLoading(false), 300))
            }}
            layout={"vertical"}
            // labelCol={{span: 5}} wrapperCol={{span: 14}}
        >
            <Form.Item
                label={
                    <Space>
                        模版内容
                        <YakitButton
                            type='text'
                            onClick={() => {
                                callCopyToClipboard(params.Template)
                            }}
                        >
                            点击复制
                        </YakitButton>
                        {props.onInsert && (
                            <YakitButton
                                type={"primary"}
                                onClick={() => {
                                    if (props.onInsert) props.onInsert(params.Template)
                                    if (props.onSaveCode) props.onSaveCode(params.HotPatchCode)
                                }}
                            >
                                插入编辑器位置
                            </YakitButton>
                        )}
                        <Tooltip title={<>{`支持：{{params(...)}} 标签`}</>}>
                            <YakitCheckbox
                                checked={dynamicParam}
                                onChange={(e) => {
                                    setDynamicParam(e.target.checked)
                                }}
                            >
                                预加载参数展开
                            </YakitCheckbox>
                        </Tooltip>
                    </Space>
                }
            >
                <div style={{height: 60}}>
                    <YakEditor
                        type={"http"}
                        value={params.Template}
                        setValue={(Template) => setParams({...params, Template})}
                    />
                </div>
            </Form.Item>
            {dynamicParam && (
                <Form.Item
                    label={
                        <Space style={{lineHeight: "16px"}}>
                            <div>{"预加载参数生成器"}</div>
                            {props.onSaveHotPatchCodeWithParamGetterCode && (
                                <YakitButton
                                    type={"primary"}
                                    onClick={() => {
                                        if (props.onSaveHotPatchCodeWithParamGetterCode)
                                            props.onSaveHotPatchCodeWithParamGetterCode(
                                                params.HotPatchCodeWithParamGetter
                                            )
                                    }}
                                >
                                    保存
                                </YakitButton>
                            )}
                            <div>
                                <YakitPopconfirm
                                    title={"点击该按钮将会重置热加载代码，代码可能会丢失，请谨慎操作"}
                                    onConfirm={() => {
                                        if (props.onSaveHotPatchCodeWithParamGetterCode) {
                                            props.onSaveHotPatchCodeWithParamGetterCode(
                                                params.HotPatchCodeWithParamGetter
                                            )
                                        }

                                        setParams({...params, HotPatchCodeWithParamGetter: HotPatchParamsGetterDefault})
                                    }}
                                >
                                    <YakitButton icon={<RefreshIcon />} type='text' />
                                </YakitPopconfirm>
                                <YakitPopover
                                    title={"扩大编辑器"}
                                    content={
                                        <>
                                            <YakitRadioButtons
                                                value={paramEditorHeight}
                                                onChange={(e) => {
                                                    setParamEditorHeight(e.target.value)
                                                }}
                                                buttonStyle='solid'
                                                options={[
                                                    {
                                                        value: 250,
                                                        label: "小"
                                                    },
                                                    {
                                                        value: 400,
                                                        label: "中"
                                                    },
                                                    {
                                                        value: 600,
                                                        label: "大"
                                                    }
                                                ]}
                                            />
                                        </>
                                    }
                                >
                                    <YakitButton
                                        icon={<FullscreenOutlined />}
                                        type='text'
                                    />
                                </YakitPopover>
                            </div>
                        </Space>
                    }
                >
                    <div style={{height: paramEditorHeight}}>
                        <YakEditor
                            type={"yak"}
                            value={params.HotPatchCodeWithParamGetter}
                            setValue={(code) => setParams({...params, HotPatchCodeWithParamGetter: code})}
                        />
                    </div>
                </Form.Item>
            )}
            <Form.Item
                label={
                    <Space style={{lineHeight: "16px"}}>
                        热加载代码
                        {props.onSaveCode && (
                            <YakitButton
                                type={"primary"}
                                onClick={() => {
                                    if (props.onSaveCode) props.onSaveCode(params.HotPatchCode)
                                }}
                            >
                                保存
                            </YakitButton>
                        )}
                        <div>
                            <YakitPopconfirm
                                title={"点击该按钮将会重置热加载代码，代码可能会丢失，请谨慎操作"}
                                onConfirm={() => {
                                    if (props.onSaveCode) props.onSaveCode(params.HotPatchCode)

                                    setParams({...params, HotPatchCode: HotPatchDefaultContent})
                                }}
                            >
                                <YakitButton icon={<RefreshIcon />} type='text' />
                            </YakitPopconfirm>
                            <YakitPopover
                                title={"扩大编辑器"}
                                content={
                                    <>
                                        <YakitRadioButtons
                                            value={hotPatchEditorHeight}
                                            onChange={(e) => {
                                                setHotPatchEditorHeight(e.target.value)
                                            }}
                                            buttonStyle='solid'
                                            options={[
                                                {
                                                    value: 250,
                                                    label: "小"
                                                },
                                                {
                                                    value: 400,
                                                    label: "中"
                                                },
                                                {
                                                    value: 600,
                                                    label: "大"
                                                }
                                            ]}
                                        />
                                    </>
                                }
                            >
                                <YakitButton icon={<FullscreenOutlined />} type='text' />
                            </YakitPopover>
                        </div>
                    </Space>
                }
            >
                <div style={{height: hotPatchEditorHeight}}>
                    <YakEditor
                        type={"yak"}
                        value={params.HotPatchCode}
                        setValue={(HotPatchCode) => setParams({...params, HotPatchCode})}
                    />
                </div>
            </Form.Item>
            <Form.Item help={"调试须知: 调试执行将会仅最多执行20秒 或 渲染 Payload 最多 300 条"}>
                <YakitButton loading={loading} type='primary' htmlType='submit'>
                    调试执行
                </YakitButton>
            </Form.Item>
        </Form>
    )
}
