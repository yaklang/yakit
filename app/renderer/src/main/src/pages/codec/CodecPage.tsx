import React, {useEffect, useState} from "react";
import {Button, Divider, notification, PageHeader, Popover, Space, Spin} from "antd";
import {YakEditor} from "../../utils/editors";
import {failed, success} from "../../utils/notification";
import {CopyToClipboard} from 'react-copy-to-clipboard';
import {showModal} from "../../utils/showModal";
import {divider} from "@uiw/react-md-editor";

const {ipcRenderer} = window.require("electron");


export interface CodecType {
    key?: string
    verbose: string
    subTypes?: CodecType[]
}

export const execCodec = (typeStr: string, text?: string) => {
    if (text === "") {
        failed("空文本无法执行编码解码")
        return
    }

    ipcRenderer.invoke("Codec", {Text: text, Type: typeStr}).then((result: { Result: string }) => {
        showModal({
            title: "编码结果",
            width: "50%",
            content: <div style={{width: "100%"}}>
                <Space style={{width: "100%"}} direction={"vertical"}>
                    <div style={{height: 300}}>
                        <YakEditor
                            fontSize={20}
                            readOnly={true} value={result.Result}
                        />
                    </div>
                </Space>
            </div>
        })
    }).catch(e => {

    })
}

const CodecItems: CodecType[] = [
    {key: "fuzz", verbose: "模糊测试(标签同 Web Fuzzer)"},
    {key: "http-get-query", verbose: "解析 HTTP 参数"},
    {key: "md5", verbose: "计算 md5"},
    {key: "sha1", verbose: "计算 Sha1"},
    {key: "sha256", verbose: "计算 Sha256"},
    {key: "sha512", verbose: "计算 Sha512"},
    {
        verbose: "Base64 编码 / 解码", subTypes: [
            {key: "base64", verbose: "Base64 编码"},
            {key: "base64-decode", verbose: "Base64 解码"},
        ]
    },
    {
        verbose: "HTML 编码 / 解码", subTypes: [
            {key: "htmlencode", verbose: "HTML 实体编码（强制）"},
            {key: "htmlencode-hex", verbose: "HTML 实体编码（强制十六进制模式）"},
            {key: "htmlescape", verbose: "HTML 实体编码（只编码特殊字符）"},
            {key: "htmldecode", verbose: "HTML 解码"},
        ]
    },
    {
        verbose: "URL 编码 / 解码", subTypes: [
            {key: "urlencode", verbose: "URL 编码（强制）"},
            {key: "urlescape", verbose: "URL 编码（只编码特殊字符）"},
            {key: "urlescape-path", verbose: "URL 路径编码（只编码特殊字符）"},
            {key: "urlunescape", verbose: "URL 解码"},
            {key: "urlunescape-path", verbose: "URL 路径解码"},
            {key: "double-urlencode", verbose: "双重 URL 编码"},
            {key: "double-urldecode", verbose: "双重 URL 解码"},
        ]
    },
    {
        verbose: "双重 URL 编码 / 解码", subTypes: [
            {key: "double-urlencode", verbose: "双重 URL 编码"},
            {key: "double-urldecode", verbose: "双重 URL 解码"},
        ]
    },
    {
        verbose: "十六进制 编码 / 解码", subTypes: [
            {key: "hex-encode", verbose: "十六进制编码"},
            {key: "hex-decode", verbose: "十六进制解码"},
        ]
    },
    {
        verbose: "JSON 处理", subTypes: [
            {key: "json-formatter", verbose: "JSON 美化"},
            {key: "json-inline", verbose: "JSON 压缩成一行"},
        ]
    },
    {
        verbose: "Unicode 中文(\\u0000 格式)", subTypes: [
            {key: "json-unicode", verbose: "Unicode 中文编码"},
            {key: "json-unicode-decode", verbose: "Unicode 中文解码"},
        ]
    }
]

export interface CodecPageProp {

}


export const CodecPage: React.FC<CodecPageProp> = (props) => {
    const [codeType, setCodeType] = useState<string>();
    const [text, setText] = useState("");
    const [result, setResult] = useState("");
    const [loading, setLoading] = useState(true)

    const codec = (t: string) => {
        if (!t) {
            failed("BUG: 空的解码类型")
            return
        }
        ipcRenderer.invoke("codec", {Type: t, Text: text})
    }

    const onHandledResult = (e: any, data: string) => {
        setResult(data);
    };
    const onHandleError = (e: any, err: string) => {
        if (err) {
            failed(`CODEC 解码失败：${err}`)
        }
    }

    useEffect(() => {
        setLoading(true)
        setTimeout(() => {
            setLoading(false)
        }, 300)

        ipcRenderer.on("client-codec", onHandledResult)
        ipcRenderer.on("client-codec-error", onHandleError)

        return () => {
            ipcRenderer.removeListener("client-codec", onHandledResult)
            ipcRenderer.removeListener("client-codec-error", onHandleError)
        }
    }, [])

    return <Spin spinning={loading} style={{margin: 8}}>
        <PageHeader title={"Codec：编码与解码"}>

        </PageHeader>
        <div style={{width: "100%"}}>
            <Space style={{width: "100%"}} direction={"vertical"}>
                <div style={{height: 300}}>
                    <YakEditor value={text} setValue={setText}/>
                </div>
                <Space direction={"vertical"}>
                    {(() => {
                        let items: React.ReactNode[] = [];
                        let singleItems: React.ReactNode[] = [];

                        CodecItems.forEach(i => {
                            if ((i.subTypes || []).length > 0) {
                                items.push(<Popover
                                    trigger={"click"}
                                    title={i.verbose}
                                    content={<Space>
                                        {(i.subTypes || []).map(subType => {
                                            return <Button
                                                style={{marginRight: 8}}
                                                onClick={() => {
                                                    codec(subType.key || "")
                                                }}
                                            >{subType.verbose}</Button>
                                        })}
                                    </Space>}
                                >
                                    <Button style={{marginRight: 8, marginBottom: 4}}>{i.verbose}</Button>
                                </Popover>)
                                return
                            }
                            singleItems.push(<Button onClick={() => {
                                codec(i.key || "")
                            }} style={{marginRight: 8}}>{i.verbose}</Button>)
                        })

                        return <>
                            <div>
                                {singleItems}
                            </div>
                            <div>
                                {items}
                            </div>
                        </>
                    })()}
                </Space>
                <div style={{height: 300}}>
                    <YakEditor
                        value={result} setValue={setResult}
                        readOnly={true}
                    />
                </div>
                <CopyToClipboard text={result} onCopy={(text, ok) => {
                    if (ok) success("已复制到粘贴板")
                }}>
                    <Button type={"primary"}>复制编码后的结果</Button>
                </CopyToClipboard>
            </Space>
        </div>
    </Spin>
};