import React from "react";
import {showModal} from "./showModal";
import {Button, Space} from "antd";
import {IMonacoActionDescriptor, IMonacoCodeEditor, YakEditor} from "./editors";
import {monacoEditorClear, monacoEditorReplace, monacoEditorWrite} from "../pages/fuzzer/fuzzerTemplates";
import {failed} from "./notification";
import {AutoCard} from "../components/AutoCard";
import {Buffer} from "buffer";

export type CodecType = |
    "fuzz" | "md5" | "sha1" | "sha256" | "sha512"
    | "base64" | "base64-decode" | "htmlencode" | "htmldecode" | "htmlescape"
    | "urlencode" | "urlunescape" | "double-urlencode" | "double-urldecode"
    | "hex-encode" | "hex-decode";

const {ipcRenderer} = window.require("electron");

const editorCodecHandlerFactory = (typeStr: CodecType) => {
    return (e: IMonacoCodeEditor) => {
        try {
            // @ts-ignore
            const text = e.getModel()?.getValueInRange(e.getSelection()) || "";
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
            const text = e.getModel()?.getValueInRange(e.getSelection()) || "";
            if (!!text) {
                execCodec(typeStr, text, false, e)
            } else {
                const model = e.getModel();
                const fullText = model?.getValue();
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
            monacoEditorReplace(editor, new Buffer(result.Result).toString("utf8"));
            return
        }
    })
}

const editorMutateHTTPRequestHandlerFactory = (params: MutateHTTPRequestParams) => {
    return (e: IMonacoCodeEditor) => {
        try {
            const model = e.getModel();
            const fullText = model?.getValue();
            mutateRequest({...params, Request: new Buffer(fullText || "")}, e)
        } catch (e) {
            failed(`mutate request failed: ${e}`)
        }
    }
}

export interface MonacoEditorActions extends IMonacoActionDescriptor {
    id: CodecType | string,
    label: string,
    contextMenuGroupId: "codec" | string,
    run: (editor: IMonacoCodeEditor) => any
    keybindings?: any[]
}

export const MonacoEditorCodecActions: MonacoEditorActions[] = [
    // {id: "md5", label: "MD5"},
    // {id: "sha1", label: "SHA1"},
    {id: "base64", label: "Base64 ??????"},
    {id: "base64-decode", label: "Base64 ??????"},
    {id: "htmlencode", label: "HTML ??????"},
    {id: "htmldecode", label: "HTML ??????"},
    {id: "urlencode", label: "URL ??????"},
    {id: "urlunescape", label: "URL ??????"},
    {id: "double-urlencode", label: "?????? URL ??????"},
].map(i => {
    return {id: i.id, label: i.label, contextMenuGroupId: "codec", run: editorCodecHandlerFactory(i.id as CodecType)}
});

export const MonacoEditorFullCodecActions: MonacoEditorActions[] = [
    {id: "pretty-packet", label: "???????????????(JSON)"},
].map(i => {
    return {
        id: i.id,
        label: i.label,
        contextMenuGroupId: "pretty",
        run: editorFullCodecHandlerFactory(i.id as CodecType)
    }
})

export const MonacoEditorMutateHTTPRequestActions: {
    id: CodecType | string, label: string,
    contextMenuGroupId: "codec" | string,
    run: (editor: IMonacoCodeEditor) => any
}[] = [
    {id: "mutate-http-method-get", label: "?????? HTTP ????????? GET", params: {FuzzMethods: ["GET"]} as MutateHTTPRequestParams},
    {
        id: "mutate-http-method-post",
        label: "?????? HTTP ????????? POST",
        params: {FuzzMethods: ["POST"]} as MutateHTTPRequestParams
    },
    {
        id: "mutate-http-method-head",
        label: "?????? HTTP ????????? HEAD",
        params: {FuzzMethods: ["HEAD"]} as MutateHTTPRequestParams
    },
    {
        id: "mutate-chunked",
        label: "HTTP Chunk ??????",
        params: {ChunkEncode: true} as MutateHTTPRequestParams
    },
    {
        id: "mutate-upload",
        label: "????????????????????????",
        params: {UploadEncode: true} as MutateHTTPRequestParams
    },
].map(i => {
    return {
        id: i.id,
        label: i.label,
        contextMenuGroupId: "mutate-http-request",
        run: editorMutateHTTPRequestHandlerFactory(i.params)
    }
})

interface AutoDecodeResult {
    Type: string
    TypeVerbose: string
    Origin: Uint8Array
    Result: Uint8Array
}

export const execAutoDecode = async (text: string) => {
    return ipcRenderer.invoke("AutoDecode", {Data: text}).then((e: { Results: AutoDecodeResult[] }) => {
        showModal({
            title: "??????????????????????????????",
            width: "60%",
            content: (
                <Space style={{width: "100%"}} direction={"vertical"}>
                    {e.Results.map((i, index) => {
                        return <AutoCard
                            title={`????????????[${index + 1}]: ${i.TypeVerbose}(${i.Type})`} size={"small"}
                            extra={<Button
                                size={"small"}
                                onClick={() => {
                                    showModal({
                                        title: "??????", width: "50%", content: (
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
                            >????????????????????????</Button>}
                        >
                            <div style={{height: 120}}>
                                <YakEditor
                                    noMiniMap={true}
                                    type={"html"} readOnly={true} value={new Buffer(i.Result).toString("utf8")}
                                />
                            </div>
                        </AutoCard>
                    })}
                </Space>
            )
        })
    }).catch(e => {
        failed(`?????????????????????${e}`)
    })
}

export const execCodec = async (typeStr: CodecType, text: string, noPrompt?: boolean, replaceEditor?: IMonacoCodeEditor, clear?: boolean) => {
    return ipcRenderer.invoke("Codec", {Text: text, Type: typeStr}).then((result: { Result: string }) => {
        if (replaceEditor) {
            let m = showModal({
                width: "50%",
                content: (
                    <AutoCard title={"????????????"} bordered={false} extra={<Button type={"primary"} onClick={() => {
                        if (clear) {
                            monacoEditorClear(replaceEditor)
                            replaceEditor.getModel()?.setValue(result.Result)
                        } else {
                            monacoEditorWrite(replaceEditor, result.Result)
                        }
                        m.destroy()
                    }} size={"small"}>
                        ????????????
                    </Button>} size={"small"}>
                        <div style={{width: "100%", height: 300}}>
                            <YakEditor
                                type={"http"}
                                readOnly={true} value={result.Result}
                            />
                        </div>
                    </AutoCard>
                )
            })

        }

        if (noPrompt) {
            showModal({
                title: "????????????",
                width: "50%",
                content: <div style={{width: "100%"}}>
                    <Space style={{width: "100%"}} direction={"vertical"}>
                        <div style={{height: 300}}>
                            <YakEditor
                                fontSize={20} type={"html"}
                                readOnly={true} value={result.Result}
                            />
                        </div>
                    </Space>
                </div>
            })
        }
    }).catch((e: any) => {

    })
}

