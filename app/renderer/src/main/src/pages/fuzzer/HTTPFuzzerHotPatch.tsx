import React, {useEffect, useState} from "react";
import {Button, Form, Space} from "antd";
import {YakEditor} from "../../utils/editors";
import {callCopyToClipboard} from "../../utils/basic";
import {showDrawer, showModal} from "../../utils/showModal";
import {AutoCard} from "../../components/AutoCard";

export interface HTTPFuzzerHotPatchProp {
    onInsert?: (s: string) => any
    onSaveCode?: (code: string) => any
    initialHotPatchCode?: string
}

const HotPatchDefaultContent = `handle = func(param) {
    // 在这里可以直接返回一个字符串
    return codec.EncodeBase64("base64-prefix" + param) + sprintf("_origin(%v)", param)
}

handle1 = func(param) {
    // 这个特殊的 Hook 也支持返回数组
    return ["12312312", "abc", "def"]
}`

const {ipcRenderer} = window.require("electron");

export const HTTPFuzzerHotPatch: React.FC<HTTPFuzzerHotPatchProp> = (props) => {
    const [params, setParams] = useState({
        Template: `{{yak(handle|your-param)}}`,
        HotPatchCode: !!props.initialHotPatchCode ? props.initialHotPatchCode : HotPatchDefaultContent,
    });

    return <Form
        onSubmitCapture={e => {
            e.preventDefault()

            if (props.onSaveCode) props.onSaveCode(params.HotPatchCode);
            ipcRenderer.invoke("StringFuzzer", {...params}).then((response: { Results: Uint8Array[] }) => {
                const data: string[] = (response.Results || []).map(buf => new Buffer(buf).toString("latin1"))
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
        </Space>}>
            <div style={{height: 60}}>
                <YakEditor type={"http"} value={params.Template}
                           setValue={Template => setParams({...params, Template})}/>
            </div>
        </Form.Item>
        <Form.Item label={<Space>
            热加载代码
            {props.onSaveCode && <Button type={"primary"} size={"small"} onClick={() => {
                if (props.onSaveCode) props.onSaveCode(params.HotPatchCode);
            }}>保存到本地</Button>}
        </Space>}>
            <div style={{height: 300}}>
                <YakEditor type={"yak"} value={params.HotPatchCode}
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