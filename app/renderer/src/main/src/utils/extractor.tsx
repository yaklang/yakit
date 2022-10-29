import React, {useEffect, useState} from "react";
import {FuzzerResponse} from "@/pages/fuzzer/HTTPFuzzerPage";
import {showModal} from "@/utils/showModal";
import {YakEditor} from "@/utils/editors";
import {StringToUint8Array, Uint8ArrayToString} from "@/utils/str";
import {useDebounceEffect, useGetState} from "ahooks";
import {editor} from "monaco-editor";
import {Alert, Button, Divider, Popconfirm, Space, Tag, Typography} from "antd";
import {AutoCard} from "@/components/AutoCard";
import {failed, info} from "@/utils/notification";
import {randomString} from "@/utils/randomUtil";
import {ExecResult} from "@/pages/invoker/schema";
import {ResizeBox} from "@/components/ResizeBox";
import {saveABSFileToOpen} from "@/utils/openWebsite";

const {Text} = Typography;

export const showExtractFuzzerResponseOperator = (resp: FuzzerResponse[]) => {
    if (resp.length == 0) {
        showModal({title: "无 Web Fuzzer Response 以供提取信息"})
        return
    }

    const m = showModal({
        title: `提取响应数据包中内容`,
        width: "80%",
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
    const [extracted, setExtracted] = useState<string[]>([]);

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
            try {
                const selection = editor.getSelection()
                if (!selection) {
                    return
                }

                setResponseStr(model.getValue())
                // 这里能获取到选择到的内容
                setSelected(model.getValueInRange(selection))
            } catch (e) {
                console.info("提取选择数据错误")
                console.info(e)
            }
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
        if (!_token) {
            return
        }
        const token = getToken();
        const extractedCache: string[] = [];
        let extractedCountLastUpdated = 0;
        ipcRenderer.on(`${token}-data`, async (e, data: { Extracted: Uint8Array, Token: string }) => {
            console.info(1)
            extractedCache.push(Uint8ArrayToString(data.Extracted))
        })
        ipcRenderer.on(`${token}-error`, (e, error) => {
            failed(`[ExtractData] error:  ${error}`)
        })
        ipcRenderer.on(`${token}-end`, (e, data) => {
            info("[ExtractData] finished")
        })

        const extractedDataCacheId = setInterval(() => {
            if (extractedCache.length <= 0) {
                return
            }

            if (extractedCache.length != extractedCountLastUpdated) {
                setExtracted([...extractedCache])
                extractedCountLastUpdated = extractedCache.length
            }
        }, 500)
        return () => {
            clearInterval(extractedDataCacheId);

            ipcRenderer.invoke("cancel-ExtractData", token)
            ipcRenderer.removeAllListeners(`${token}-data`)
            ipcRenderer.removeAllListeners(`${token}-error`)
            ipcRenderer.removeAllListeners(`${token}-end`)
        }
    }, [_token])

    return <Space style={{width: "100%"}} direction={"vertical"}>
        <AutoCard
            size={"small"}
            title={(
                <Space>
                    <div>
                        自动生成提取规则
                    </div>
                    <Tag>共{responses.length}个响应</Tag>
                </Space>
            )}
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
        <div style={{height: 400}}>
            <ResizeBox
                firstNode={(
                    <YakEditor
                        editorDidMount={e => {
                            setEditor(e)
                        }}
                        readOnly={true} noMiniMap={true}
                        noLineNumber={true}
                        type={"html"} value={Uint8ArrayToString(sampleResponse.ResponseRaw)}
                    />
                )}
                secondRatio={"30%"}
                secondNode={(
                    <AutoCard size={"small"} bordered={false} title={(
                        <Space>
                            <Tag>
                                已提/总量：
                                {extracted.length}/{responses.length}
                            </Tag>
                        </Space>
                    )} extra={(
                        <Space>
                            <Popconfirm
                                title={"确定要清除已提取数据？"}
                                onConfirm={() => {
                                    setToken(randomString(46))
                                    setExtracted([])
                                }}
                            >
                                <Button size={"small"}>清空</Button>
                            </Popconfirm>
                            <Button
                                size={"small"} type={"link"}
                                onClick={()=>{
                                    saveABSFileToOpen("webfuzzer-extract-data.txt", extracted.join("\n"))
                                }}
                            >下载文件</Button>
                        </Space>
                    )} bodyStyle={{margin: 0, padding: 0}}>
                        <YakEditor
                            readOnly={true} noMiniMap={true}
                            noLineNumber={true} triggerId={extracted}
                            type={"html"} value={extracted.join("\n")}
                        />
                    </AutoCard>
                )}
            />
        </div>
    </Space>
};