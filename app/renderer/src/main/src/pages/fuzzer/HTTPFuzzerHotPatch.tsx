import React, {useEffect, useState} from "react";
import {Button, Checkbox, Form, Popconfirm, Space, Tag, Tooltip} from "antd";
import {YakEditor} from "../../utils/editors";
import {callCopyToClipboard} from "../../utils/basic";
import {showDrawer, showModal} from "../../utils/showModal";
import {AutoCard} from "../../components/AutoCard";
import {getRemoteValue, setRemoteValue} from "@/utils/kv";
import {useGetState} from "ahooks";

export interface HTTPFuzzerHotPatchProp {
    onInsert?: (s: string) => any
    onSaveCode?: (code: string) => any
    onSaveHotPatchCodeWithParamGetterCode?: (code: string) => any
    initialHotPatchCode?: string
    initialHotPatchCodeWithParamGetter?: string
}

const HotPatchDefaultContent = `handle = func(param) {
    // 在这里可以直接返回一个字符串
    return codec.EncodeBase64("base64-prefix" + param) + sprintf("_origin(%v)", param)
}

handle1 = func(param) {
    // 这个特殊的 Hook 也支持返回数组
    return ["12312312", "abc", "def"]
}`

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

const {ipcRenderer} = window.require("electron");


const HTTPFuzzerHotPatch_DYNAMICPARAMS_FLAG = "HTTPFuzzerHotPatch_DYNAMICPARAMS_FLAG"
const HTTPFuzzerHotPatch_TEMPLATE_DEMO = "HTTPFuzzerHotPatch_TEMPLATE_DEMO"

export const HTTPFuzzerHotPatch: React.FC<HTTPFuzzerHotPatchProp> = (props) => {
    const [params, setParams, getParams] = useGetState({
        Template: `{{yak(handle|{{params(test)}})}}`,
        HotPatchCode: !!props.initialHotPatchCode ? props.initialHotPatchCode : HotPatchDefaultContent,
        HotPatchCodeWithParamGetter: !!props.initialHotPatchCodeWithParamGetter ? props.initialHotPatchCodeWithParamGetter : HotPatchParamsGetterDefault,
        TimeoutSeconds: 20,
        Limit: 300,
    });
    const [dynamicParam, setDynamicParam, getDynamicParam] = useGetState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        getRemoteValue(HTTPFuzzerHotPatch_DYNAMICPARAMS_FLAG).then(e => {
            if (e === "1") {
                setDynamicParam(true)
            } else {
                setDynamicParam(false)
            }
        })

        getRemoteValue(HTTPFuzzerHotPatch_TEMPLATE_DEMO).then(e => {
            if (!!e) {
                setParams({...params, Template: e})
            }
        })
        return () => {
            setRemoteValue(HTTPFuzzerHotPatch_TEMPLATE_DEMO, getParams().Template).then(() => {
            })
            setRemoteValue(HTTPFuzzerHotPatch_DYNAMICPARAMS_FLAG, getDynamicParam() ? "1" : "0").then(() => {
            })
        }
    }, [])

    return <Form
        onSubmitCapture={e => {
            e.preventDefault()

            if (props.onSaveCode) props.onSaveCode(params.HotPatchCode);
            if (props.onSaveHotPatchCodeWithParamGetterCode) props.onSaveHotPatchCodeWithParamGetterCode(params.HotPatchCodeWithParamGetter);

            setLoading(true)
            ipcRenderer.invoke("StringFuzzer", {...params}).then((response: { Results: Uint8Array[] }) => {
                const data: string[] = (response.Results || []).map(buf => new Buffer(buf).toString("utf8"))
                showDrawer({
                    title: "HotPatch Tag Result", content: (
                        <AutoCard size={"small"} bordered={false} title={"结果展示"} extra={<Space>
                            <a href={"#"} onClick={() => {
                                callCopyToClipboard(data.join("\n"))
                            }}>
                                复制 Fuzz 结果
                            </a>
                            <a href={"#"} onClick={() => {
                                callCopyToClipboard(params.Template)
                            }}>
                                复制 Fuzz 标签
                            </a>
                        </Space>}>
                            <YakEditor value={data.join("\r\n")} readOnly={true}/>
                        </AutoCard>
                    )
                })
            }).finally(() => setTimeout(() => setLoading(false), 300))
        }}
        layout={"vertical"}
        // labelCol={{span: 5}} wrapperCol={{span: 14}}
    >
        <Form.Item label={<Space>
            模版内容
            <Button size={"small"} type={"link"} onClick={() => {
                callCopyToClipboard(params.Template)
            }}>点击复制</Button>
            {props.onInsert && <Button size={"small"} type={"primary"} onClick={() => {
                if (props.onInsert) props.onInsert(params.Template);
                if (props.onSaveCode) props.onSaveCode(params.HotPatchCode);
            }}>
                插入编辑器位置
            </Button>}
            <Tooltip title={<>
                {`支持：{{params(...)}} 标签`}
            </>}>
                <Checkbox checked={dynamicParam} onChange={e => {
                    setDynamicParam(e.target.checked)
                }}>
                    预加载参数展开
                </Checkbox>
            </Tooltip>
        </Space>}>
            <div style={{height: 60}}>
                <YakEditor type={"http"} value={params.Template}
                           setValue={Template => setParams({...params, Template})}/>
            </div>
        </Form.Item>
        {dynamicParam && <Form.Item label={<Space>
            <div>{"预加载参数生成器"}</div>
            {props.onSaveHotPatchCodeWithParamGetterCode && <Button type={"primary"} size={"small"} onClick={() => {
                if (props.onSaveHotPatchCodeWithParamGetterCode) props.onSaveHotPatchCodeWithParamGetterCode(params.HotPatchCodeWithParamGetter);
            }}>保存</Button>}
        </Space>}>
            <div style={{height: 250}}>
                <YakEditor
                    type={"yak"} value={params.HotPatchCodeWithParamGetter}
                    setValue={code => setParams({...params, HotPatchCodeWithParamGetter: code})}
                />
            </div>
        </Form.Item>}
        <Form.Item label={<Space>
            热加载代码
            {props.onSaveCode && <Button type={"primary"} size={"small"} onClick={() => {
                if (props.onSaveCode) props.onSaveCode(params.HotPatchCode);
            }}>保存</Button>}
        </Space>}>
            <div style={{height: 250}}>
                <YakEditor
                    type={"yak"} value={params.HotPatchCode}
                    setValue={HotPatchCode => setParams({...params, HotPatchCode})}
                />
            </div>
        </Form.Item>
        <Form.Item help={"调试须知: 调试执行将会仅最多执行20秒 或 渲染 Payload 最多 1000 条"}>
            <Button
                loading={loading}
                type="primary" htmlType="submit"
            > 调试执行 </Button>
        </Form.Item>
    </Form>
};