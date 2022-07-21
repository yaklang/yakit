import React, {useEffect, useState} from "react";
import {Button, Checkbox, Form, Space, Tag, Tooltip} from "antd";
import {YakEditor} from "../../utils/editors";
import {callCopyToClipboard} from "../../utils/basic";
import {showDrawer, showModal} from "../../utils/showModal";
import {AutoCard} from "../../components/AutoCard";
import {getRemoteValue, setRemoteValue} from "@/utils/kv";

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

export const HTTPFuzzerHotPatch: React.FC<HTTPFuzzerHotPatchProp> = (props) => {
    const [params, setParams] = useState({
        Template: `{{yak(handle|{{params(test)}})}}`,
        HotPatchCode: !!props.initialHotPatchCode ? props.initialHotPatchCode : HotPatchDefaultContent,
        HotPatchCodeWithParamGetter: !!props.initialHotPatchCodeWithParamGetter ? props.initialHotPatchCodeWithParamGetter : HotPatchParamsGetterDefault,
    });
    const [dynamicParam, setDynamicParam] = useState(false);

    useEffect(() => {
        setRemoteValue(HTTPFuzzerHotPatch_DYNAMICPARAMS_FLAG, dynamicParam ? "1" : "0").then(() => {
        })
    }, [dynamicParam])
    useEffect(() => {
        getRemoteValue(HTTPFuzzerHotPatch_DYNAMICPARAMS_FLAG).then(e => {
            if (e === "1") {
                setDynamicParam(true)
            } else {
                setDynamicParam(false)
            }
        })
    }, [])

    return <Form
        onSubmitCapture={e => {
            e.preventDefault()

            if (props.onSaveCode) props.onSaveCode(params.HotPatchCode);
            if (props.onSaveHotPatchCodeWithParamGetterCode) props.onSaveHotPatchCodeWithParamGetterCode(params.HotPatchCodeWithParamGetter);

            console.info(params)
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
            })
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
        {dynamicParam && <Form.Item label={"预加载参数生成器"}>
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
            }}>保存到本地</Button>}
        </Space>}>
            <div style={{height: 250}}>
                <YakEditor
                    type={"yak"} value={params.HotPatchCode}
                    setValue={HotPatchCode => setParams({...params, HotPatchCode})}
                />
            </div>
        </Form.Item>
        <Form.Item>
            <Button
                type="primary" htmlType="submit"> 执行 </Button>
        </Form.Item>
    </Form>
};