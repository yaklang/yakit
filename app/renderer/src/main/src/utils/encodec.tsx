import React, {useEffect, useState} from "react"
import {showModal} from "./showModal"
import {Button, Space} from "antd"
import {IMonacoActionDescriptor, IMonacoCodeEditor, YakEditor} from "./editors"
import {monacoEditorClear, monacoEditorReplace, monacoEditorWrite} from "../pages/fuzzer/fuzzerTemplates"
import {failed} from "./notification"
import {AutoCard} from "../components/AutoCard"
import {Buffer} from "buffer"
import {useGetState, useMemoizedFn} from "ahooks"
import {StringToUint8Array, Uint8ArrayToString} from "@/utils/str"

export type CodecType =
    | "fuzz"
    | "md5"
    | "sha1"
    | "sha256"
    | "sha512"
    | "base64"
    | "base64-decode"
    | "htmlencode"
    | "htmldecode"
    | "htmlescape"
    | "urlencode"
    | "urlunescape"
    | "double-urlencode"
    | "double-urldecode"
    | "hex-encode"
    | "hex-decode"
    | "packet-to-curl"
    | any

const {ipcRenderer} = window.require("electron")

const editorCodecHandlerFactory = (typeStr: CodecType) => {
    return (e: IMonacoCodeEditor) => {
        try {
            // @ts-ignore
            const text = e.getModel()?.getValueInRange(e.getSelection()) || ""
            execCodec(typeStr, text, false, e)
        } catch (e) {
            failed("editor exec codec failed")
        }
    }
}

const editorFullCodecHandlerFactory = (typeStr: CodecType) => {
    return (e: IMonacoCodeEditor) => {
        try {
            // @ts-ignore
            const text = e.getModel()?.getValueInRange(e.getSelection()) || ""
            if (!!text) {
                execCodec(typeStr, text, false, e)
            } else {
                const model = e.getModel()
                const fullText = model?.getValue()
                execCodec(typeStr, fullText || "", false, e, true)
            }
        } catch (e) {
            failed("editor exec codec failed")
            console.error(e)
        }
    }
}

export interface MutateHTTPRequestParams {
    Request: Uint8Array
    FuzzMethods: string[]
    ChunkEncode: boolean
    UploadEncode: boolean
}

export interface MutateHTTPRequestResponse {
    Result: Uint8Array
    ExtraResults: Uint8Array[]
}

export const mutateRequest = (params: MutateHTTPRequestParams, editor?: IMonacoCodeEditor) => {
    ipcRenderer.invoke("HTTPRequestMutate", params).then((result: MutateHTTPRequestResponse) => {
        if (editor) {
            monacoEditorClear(editor)
            monacoEditorReplace(editor, new Buffer(result.Result).toString("utf8"))
            return
        }
    })
}

const editorMutateHTTPRequestHandlerFactory = (params: MutateHTTPRequestParams) => {
    return (e: IMonacoCodeEditor) => {
        try {
            const model = e.getModel()
            const fullText = model?.getValue()
            mutateRequest({...params, Request: new Buffer(fullText || "")}, e)
        } catch (e) {
            failed(`mutate request failed: ${e}`)
        }
    }
}

export interface MonacoEditorActions extends IMonacoActionDescriptor {
    id: CodecType | string
    label: string
    contextMenuGroupId: "codec" | string
    run: (editor: IMonacoCodeEditor) => any
    keybindings?: any[]
}

export const MonacoEditorCodecActions: MonacoEditorActions[] = [
    {id: "urlencode", label: "URL 编码"},
    {id: "urlescape", label: "URL 编码(只编码特殊字符)"},
    {id: "base64", label: "Base64 编码"},
    {id: "base64-decode", label: "Base64 解码"},
    {id: "htmlencode", label: "HTML 编码"},
    {id: "htmldecode", label: "HTML 解码"},
    {id: "urlunescape", label: "URL 解码"},
    {id: "double-urlencode", label: "双重 URL 编码"},
    {id: "unicode-decode", label: "Unicode 解码（\\uXXXX 解码）"},
    {id: "unicode-encode", label: "Unicode 编码（\\uXXXX 编码）"},
    {id: "base64-url-encode", label: "先 Base64 后 URL 编码"},
    {id: "url-base64-decode", label: "先 URL 后 Base64 解码"},
    {id: "hex-decode", label: "HEX 解码（十六进制解码）"},
    {id: "hex-encode", label: "HEX 编码（十六进制编码）"},
    {id: "jwt-parse-weak", label: "JWT 解析（同时测试弱 Key）"}
].map((i) => {
    return {id: i.id, label: i.label, contextMenuGroupId: "codec", run: editorCodecHandlerFactory(i.id as CodecType)}
})

export const MonacoEditorMutateHTTPRequestActions: {
    id: CodecType | string
    label: string
    contextMenuGroupId: "codec" | string
    run: (editor: IMonacoCodeEditor) => any
}[] = [
    {
        id: "mutate-http-method-get",
        label: "改变 HTTP 方法成 GET",
        params: {FuzzMethods: ["GET"]} as MutateHTTPRequestParams
    },
    {
        id: "mutate-http-method-post",
        label: "改变 HTTP 方法成 POST",
        params: {FuzzMethods: ["POST"]} as MutateHTTPRequestParams
    },
    {
        id: "mutate-http-method-head",
        label: "改变 HTTP 方法成 HEAD",
        params: {FuzzMethods: ["HEAD"]} as MutateHTTPRequestParams
    },
    {
        id: "mutate-chunked",
        label: "HTTP Chunk 编码",
        params: {ChunkEncode: true} as MutateHTTPRequestParams
    },
    {
        id: "mutate-upload",
        label: "修改为上传数据包",
        params: {UploadEncode: true} as MutateHTTPRequestParams
    }
].map((i) => {
    return {
        id: i.id,
        label: i.label,
        contextMenuGroupId: "mutate-http-request",
        run: editorMutateHTTPRequestHandlerFactory(i.params)
    }
})

export interface AutoDecodeResult {
    Type: string
    TypeVerbose: string
    Origin: Uint8Array
    Result: Uint8Array
    Modify: boolean
}
const AutoDecode: React.FC<{data: AutoDecodeResult[]}> = React.memo((prop: {data: AutoDecodeResult[]}) => {
    const {data} = prop
    const [result, setResult, getResult] = useGetState<AutoDecodeResult[]>(data)
    return (
        <Space style={{width: "100%"}} direction={"vertical"}>
            {result.map((i, index) => {
                return (
                    <AutoCard
                        title={`解码步骤[${index + 1}]: ${i.TypeVerbose}(${i.Type})`}
                        size={"small"}
                        extra={
                            <Button
                                size={"small"}
                                onClick={() => {
                                    showModal({
                                        title: "原文",
                                        width: "50%",
                                        content: (
                                            <div style={{height: 280}}>
                                                <YakEditor
                                                    type={"html"}
                                                    noMiniMap={true}
                                                    readOnly={true}
                                                    value={new Buffer(i.Origin).toString("utf8")}
                                                />
                                            </div>
                                        )
                                    })
                                }}
                            >
                                查看本次编码原文
                            </Button>
                        }
                    >
                        <div style={{height: 120}}>
                            <YakEditor
                                noMiniMap={true}
                                type={"html"}
                                value={new Buffer(i.Result).toString("utf8")}
                                setValue={(s) => {
                                    const req = getResult()
                                    req[index].Modify = true
                                    req[index].Result = StringToUint8Array(s)
                                    ipcRenderer
                                        .invoke("AutoDecode", {ModifyResult: req})
                                        .then((e: {Results: AutoDecodeResult[]}) => {
                                            setResult(e.Results)
                                        })
                                        .catch((e) => {
                                            failed(`自动解码失败：${e}`)
                                        })
                                }}
                            />
                        </div>
                    </AutoCard>
                )
            })}
        </Space>
    )
})
export const execAutoDecode = async (text: string) => {
    return ipcRenderer
        .invoke("AutoDecode", {Data: text})
        .then((e: {Results: AutoDecodeResult[]}) => {
            showModal({
                title: "自动解码（智能解码）",
                width: "60%",
                content: <AutoDecode data={e.Results}></AutoDecode>
            })
        })
        .catch((e) => {
            failed(`自动解码失败：${e}`)
        })
}

export const execCodec = async (
    typeStr: CodecType,
    text: string,
    noPrompt?: boolean,
    replaceEditor?: IMonacoCodeEditor,
    clear?: boolean,
    extraParams?: {
        Key: string
        Value: string
    }[]
) => {
    return ipcRenderer
        .invoke("Codec", {Text: text, Type: typeStr, Params: extraParams})
        .then((result: {Result: string}) => {
            if (replaceEditor) {
                let m = showModal({
                    width: "50%",
                    content: (
                        <AutoCard
                            title={"编码结果"}
                            bordered={false}
                            extra={
                                <Button
                                    type={"primary"}
                                    onClick={() => {
                                        if (clear) {
                                            monacoEditorClear(replaceEditor)
                                            replaceEditor.getModel()?.setValue(result.Result)
                                        } else {
                                            monacoEditorWrite(replaceEditor, result.Result)
                                        }
                                        m.destroy()
                                    }}
                                    size={"small"}
                                >
                                    替换内容
                                </Button>
                            }
                            size={"small"}
                        >
                            <div style={{width: "100%", height: 300}}>
                                <YakEditor type={"http"} readOnly={true} value={result.Result} />
                            </div>
                        </AutoCard>
                    )
                })
            }

            if (noPrompt) {
                showModal({
                    title: "编码结果",
                    width: "50%",
                    content: (
                        <div style={{width: "100%"}}>
                            <Space style={{width: "100%"}} direction={"vertical"}>
                                <div style={{height: 300}}>
                                    <YakEditor fontSize={20} type={"html"} readOnly={true} value={result.Result} />
                                </div>
                            </Space>
                        </div>
                    )
                })
            }
            return result?.Result || ""
        })
        .catch((e: any) => {
            failed(`CODEC[${typeStr}] 执行失败：${e}`)
        })
}
