import React from "react";
import {showModal} from "./showModal";
import {Space} from "antd";
import {IMonacoCodeEditor, IMonacoEditor, YakEditor} from "./editors";
import {monacoEditorClear, monacoEditorWrite} from "../pages/fuzzer/fuzzerTemplates";
import {editor} from "monaco-editor";
import {failed} from "./notification";

export type CodecType = |
    "fuzz" | "md5" | "sha1" | "sha256" | "sha512"
    | "base64" | "base64-decode" | "htmlencode" | "htmldecode" | "htmlescape"
    | "urlencode" | "urldecode" | "double-urlencode" | "double-urldecode"
    | "hex-encode" | "hex-decode";

const {ipcRenderer} = window.require("electron");

const editorCodecHandlerFactory = (typeStr: CodecType) => {
    return (e: IMonacoCodeEditor) => {
        try {
            // @ts-ignore
            const text = e.getModel()?.getValueInRange(e.getSelection()) || "";
            execCodec(typeStr, text, false, e)
        } catch (e) {
            failed("editor")
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
            monacoEditorWrite(editor, new Buffer(result.Result).toString("utf8"))
            return
        }
    })
}

const editorMutateHTTPRequestHandlerFactory = (params: MutateHTTPRequestParams) => {
    return (e: IMonacoCodeEditor) => {
        try {
            const model = e.getModel();
            const fullText = model?.getValueInRange(model?.getFullModelRange())
            mutateRequest({...params, Request: new Buffer(fullText || "")}, e)
        } catch (e) {
            failed(`mutate request failed: ${e}`)
        }
    }
}

export interface MonacoEditorActions {
    id: CodecType | string, label: string,
    contextMenuGroupId: "codec" | string,
    run: (editor: IMonacoCodeEditor) => any
}

export const MonacoEditorCodecActions: MonacoEditorActions[] = [
    {id: "md5", label: "MD5"},
    {id: "sha1", label: "SHA1"},
    {id: "base64", label: "Base64 编码"},
    {id: "base64-decode", label: "Base64 解码"},
    {id: "htmlencode", label: "HTML 编码"},
    {id: "htmldecode", label: "HTML 解码"},
    {id: "urlencode", label: "URL 编码"},
    {id: "urldecode", label: "URL 解码"},
    {id: "double-urlencode", label: "双重 URL 编码"},
].map(i => {
    return {id: i.id, label: i.label, contextMenuGroupId: "codec", run: editorCodecHandlerFactory(i.id as CodecType)}
});

export const MonacoEditorMutateHTTPRequestActions: {
    id: CodecType | string, label: string,
    contextMenuGroupId: "codec" | string,
    run: (editor: IMonacoCodeEditor) => any
}[] = [
    {id: "mutate-http-method-get", label: "改变 HTTP 方法成 GET", params: {FuzzMethods: ["GET"]} as MutateHTTPRequestParams},
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
    },
].map(i => {
    return {
        id: i.id,
        label: i.label,
        contextMenuGroupId: "mutate-http-request",
        run: editorMutateHTTPRequestHandlerFactory(i.params)
    }
})

export const execCodec = (typeStr: CodecType, text: string, noPrompt?: boolean, replaceEditor?: IMonacoCodeEditor) => {
    ipcRenderer.invoke("Codec", {Text: text, Type: typeStr}).then((result: { Result: string }) => {
        if (replaceEditor) {
            monacoEditorWrite(replaceEditor, result.Result)
        }

        if (noPrompt) {
            showModal({
                title: "编码结果",
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
    }).catch(e => {

    })
}

