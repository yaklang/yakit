import React, {useEffect, useState} from "react"
import {showModal} from "./showModal"
import {Space} from "antd"
import {IMonacoActionDescriptor, IMonacoCodeEditor, YakEditor} from "./editors"
import {monacoEditorClear, monacoEditorReplace, monacoEditorWrite} from "../pages/fuzzer/fuzzerTemplates"
import {failed} from "./notification"
import {AutoCard} from "../components/AutoCard"
import {Buffer} from "buffer"
import {useGetState, useUpdateEffect} from "ahooks"
import {StringToUint8Array} from "@/utils/str"
import styles from "./encodec.module.scss"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {showYakitModal} from "@/components/yakitUI/YakitModal/YakitModalConfirm"
import classNames from "classnames"
import i18n from "@/i18n/i18n"

const t = i18n.getFixedT(null, "utils")

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
            failed(t("basic.Encodec.editorExecCodecFailed"))
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
            failed(t("basic.Encodec.editorExecCodecFailed"))
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
            failed(t("basic.Encodec.mutateRequestFailed", {error: String(e)}))
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
    {id: "urlencode", label: t("basic.Encodec.urlencode")},
    {id: "urlescape", label: t("basic.Encodec.urlescape")},
    {id: "base64", label: t("basic.Encodec.base64")},
    {id: "base64-decode", label: t("basic.Encodec.base64Decode")},
    {id: "htmlencode", label: t("basic.Encodec.htmlencode")},
    {id: "htmldecode", label: t("basic.Encodec.htmldecode")},
    {id: "urlunescape", label: t("basic.Encodec.urlDecode")},
    {id: "double-urlencode", label: t("basic.Encodec.doubleUrlEncode")},
    {id: "unicode-decode", label: t("basic.Encodec.unicodeDecode")},
    {id: "unicode-encode", label: t("basic.Encodec.unicodeEncode")},
    {id: "base64-url-encode", label: t("basic.Encodec.base64UrlEncode")},
    {id: "url-base64-decode", label: t("basic.Encodec.urlBase64Decode")},
    {id: "hex-decode", label: t("basic.Encodec.hexDecode")},
    {id: "hex-encode", label: t("basic.Encodec.hexEncode")},
    {id: "jwt-parse-weak", label: t("basic.Encodec.jwtParseWeak")}
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
        label: t("basic.Encodec.changeHttpMethodGet"),
        params: {FuzzMethods: ["GET"]} as MutateHTTPRequestParams
    },
    {
        id: "mutate-http-method-post",
        label: t("basic.Encodec.changeHttpMethodPost"),
        params: {FuzzMethods: ["POST"]} as MutateHTTPRequestParams
    },
    {
        id: "mutate-http-method-head",
        label: t("basic.Encodec.changeHttpMethodHead"),
        params: {FuzzMethods: ["HEAD"]} as MutateHTTPRequestParams
    },
    {
        id: "mutate-chunked",
        label: t("basic.Encodec.httpChunkEncode"),
        params: {ChunkEncode: true} as MutateHTTPRequestParams
    },
    {
        id: "mutate-upload",
        label: t("basic.Encodec.modifyToUploadPacket"),
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

interface AutoDecodeProps {
    data: AutoDecodeResult[]
    source?: string
    isShowSource?: boolean
}
const AutoDecode: React.FC<AutoDecodeProps> = React.memo((prop: AutoDecodeProps) => {
    const {data, source, isShowSource = false} = prop
    const [result, setResult, getResult] = useGetState<AutoDecodeResult[]>(data)
    useUpdateEffect(() => {
        setResult(data)
    }, [data])
    return (
        <Space style={{width: "100%"}} direction={"vertical"}>
            {isShowSource && (
                <AutoCard title={t("basic.Encodec.selectContent")} size={"small"}>
                    <div style={{height: 120}}>
                        <YakEditor noMiniMap={true} type={"html"} value={source} readOnly={true} />
                    </div>
                </AutoCard>
            )}

            {result.map((i, index) => {
                return (
                    <AutoCard
                        title={
                            <div
                                className={classNames(styles["decode-step-title"], "yakit-single-line-ellipsis")}
                            >{t("basic.Encodec.decodeStep", {index: index + 1, verbose: i.TypeVerbose, type: i.Type})}</div>
                        }
                        size={"small"}
                        extra={
                            <YakitButton
                                size={"small"}
                                onClick={() => {
                                    showYakitModal({
                                        title: t("basic.Encodec.originText"),
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
                                        ),
                                        footer: null,
                                        centered: true
                                    })
                                }}
                            >
                                {t("basic.Encodec.viewOriginalText")}
                            </YakitButton>
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
                                                failed(t("basic.Encodec.autoDecodeFailed", {error: String(e)}))
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
                title: t("basic.Encodec.autoDecodeSmart"),
                width: "60%",
                content: <AutoDecode data={e.Results}></AutoDecode>
            })
        })
        .catch((e) => {
            failed(t("basic.Encodec.autoDecodeFailed", {error: String(e)}))
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
                            title={t("basic.Encodec.codeResult")}
                            bordered={false}
                            extra={
                                <YakitButton
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
                                    {t("basic.Encodec.replaceContent")}
                                </YakitButton>
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
                    title: t("basic.Encodec.codeResult"),
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
            failed(t("basic.Encodec.codecExecutionFailed", {type: typeStr, error: String(e)}))
        })
}

interface HTTPFlowCodecProps {
    data: string
}

export const HTTPFlowCodec: React.FC<HTTPFlowCodecProps> = React.memo((props) => {
    const {data} = props
    const [codec, setCodec] = useState<AutoDecodeResult[]>([])

    useEffect(() => {
        ipcRenderer
            .invoke("AutoDecode", {Data: data})
            .then((e: {Results: AutoDecodeResult[]}) => {
                setCodec(e.Results)
            })
            .catch((e) => {
                failed(t("basic.Encodec.autoDecodeFailed", {error: String(e)}))
            })
            .finally(() => {})
    }, [data])

    return (
        <div className={styles["http-flow-codec"]}>
            <AutoDecode data={codec} source={data} isShowSource={true} />
        </div>
    )
})
