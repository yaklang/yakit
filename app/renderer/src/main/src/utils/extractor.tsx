import React, {useEffect, useState} from "react";
import {FuzzerResponse} from "@/pages/fuzzer/HTTPFuzzerPage";
import {showModal} from "@/utils/showModal";
import {YakEditor} from "@/utils/editors";
import {StringToUint8Array, Uint8ArrayToString} from "@/utils/str";
import {useDebounceEffect, useGetState} from "ahooks";
import {editor} from "monaco-editor";
import {Alert, Button, Divider, Space, Tag, Typography} from "antd";
import {AutoCard} from "@/components/AutoCard";
import {failed, info} from "@/utils/notification";
import {randomString} from "@/utils/randomUtil";
import {ExecResult} from "@/pages/invoker/schema";

const {Text} = Typography;

export const showExtractFuzzerResponseOperator = (resp: FuzzerResponse[]) => {
    if (resp.length == 0) {
        showModal({title: "无 Web Fuzzer Response 以供提取信息"})
        return
    }

    const m = showModal({
        title: `提取响应数据包中内容`,
        width: "60%",
        maskClosable: false,
        content: (
            <WebFuzzerResponseExtractor responses={resp}/>
        )
    })
}

export interface WebFuzzerResponseExtractorProp {
    responses: FuzzerResponse[]
}

const {ipcRenderer} = window.require("electron");

export const WebFuzzerResponseExtractor: React.FC<WebFuzzerResponseExtractorProp> = (props) => {
    const {responses} = props;
    const sampleResponse = responses[0];
    const [editor, setEditor] = useGetState<editor.IStandaloneCodeEditor>();
    const [selected, setSelected] = useGetState<string>("");
    const [_responseStr, setResponseStr, getResponseStr] = useGetState<string>("");
    const [prefix, setPrefix] = useState("");
    const [suffix, setSuffix] = useState("");

    // stream token
    const [_token, setToken, getToken] = useGetState(randomString(40))

    useEffect(() => {
        if (!editor) {
            return
        }
        const model = editor.getModel()
        if (!model) {
            return
        }

        const setSelectedFunc = () => {
            const selection = editor.getSelection()
            if (!selection) {
                return
            }

            setResponseStr(model.getValue())
            // 这里能获取到选择到的内容
            setSelected(model.getValueInRange(selection))
        }
        setSelectedFunc()
        const id = setInterval(setSelectedFunc, 500)
        return () => {
            clearInterval(id)
        }
    }, [editor])

    useDebounceEffect(() => {
        if (!selected) {
            setPrefix("")
            setSuffix("")
            return
        }

        ipcRenderer.invoke("GenerateExtractRule", {
            Data: StringToUint8Array(getResponseStr()),
            Selected: StringToUint8Array(selected),
        }).then((e: {
            PrefixRegexp: string, SuffixRegexp: string,
        }) => {
            setPrefix(e.PrefixRegexp)
            setSuffix(e.SuffixRegexp)
        }).catch(e => {
            failed(`无法生成数据提取规则: ${e}`)
        })
    }, [selected], {wait: 500})

    useEffect(() => {
        const token = getToken();
        ipcRenderer.on(`${token}-data`, async (e, data: any) => {
            console.info(data)
        })
        ipcRenderer.on(`${token}-error`, (e, error) => {
            failed(`[ExtractData] error:  ${error}`)
        })
        ipcRenderer.on(`${token}-end`, (e, data) => {
            info("[ExtractData] finished")
        })
        return () => {
            ipcRenderer.invoke("cancel-ExtractData", token)
            ipcRenderer.removeAllListeners(`${token}-data`)
            ipcRenderer.removeAllListeners(`${token}-error`)
            ipcRenderer.removeAllListeners(`${token}-end`)
        }
    }, [])

    return <Space style={{width: "100%"}} direction={"vertical"}>
        <AutoCard
            size={"small"}
            title={"自动生成提取规则"}
            extra={(
                <Button type={"primary"} size={"small"} onClick={() => {
                    responses.forEach(i => {
                        ipcRenderer.invoke("ExtractData", {
                            Mode: `regexp-between`,
                            PrefixRegexp: prefix,
                            SuffixRegexp: suffix,
                            Data: i.ResponseRaw,
                            Token: i.UUID,
                        }, getToken()).then(() => {
                        })
                    })
                }}>
                    提取数据
                </Button>
            )}
        >
            <Space direction={"vertical"}>
                <Space>
                    <div>
                        前缀(正则)：
                    </div>
                    <Text
                        editable={{onChange: setPrefix}}
                        code={true}
                    >{prefix}</Text>
                </Space>

                <Space>
                    <div>后缀(正则)：</div>
                    <Text
                        editable={{onChange: setSuffix}}
                        code={true}
                    >{suffix}</Text>
                </Space>
                <Space>
                    {selected ? <Text code={true} copyable={true}>{selected}</Text> : <Tag>未选中提取规则</Tag>}
                </Space>
            </Space>
        </AutoCard>
        <div style={{height: 300}}>
            <YakEditor
                editorDidMount={e => {
                    setEditor(e)
                }}
                readOnly={true} noMiniMap={true}
                noLineNumber={true}
                type={"html"} value={Uint8ArrayToString(sampleResponse.ResponseRaw)}
            />
        </div>
    </Space>
};