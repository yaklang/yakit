import {OtherMenuListProps, YakitIMonacoEditor} from "./YakitEditorType"
import {EditorMenuItemType} from "./EditorMenu"
import {Space} from "antd"
import {showModal} from "@/utils/showModal"
import {AutoCard} from "../../AutoCard"
import {YakitEditor} from "./YakitEditor"
import {YakitButton} from "../YakitButton/YakitButton"
import {monacoEditorClear, monacoEditorWrite} from "@/pages/fuzzer/fuzzerTemplates"
import {failed} from "@/utils/notification"
import {fetchCursorContent, fetchSelectionRange} from "./editorUtils"
import emiter from "@/utils/eventBus/eventBus"
import {IconSolidAIIcon, IconSolidAIWhiteIcon} from "@/assets/icon/colors"
import {CodecResponseProps, CodecWorkProps} from "@/pages/codec/NewCodec"
import {getClipboardText, setClipboardText} from "@/utils/clipboard"
import {getGlobalShortcutKeyEvents, GlobalShortcutKey} from "@/utils/globalShortcutKey/events/global"
import {YakEditorOptionShortcutKey} from "@/utils/globalShortcutKey/events/page/yakEditor"

const {ipcRenderer} = window.require("electron")

/** @name 基础菜单组配置信息 */
export const baseMenuLists: (t: (text: string) => string) => OtherMenuListProps = (t) => {
    return {
        fontSize: {
            menu: [
                {
                    key: "font-size",
                    label: t("YakitEditor.fontSize"),
                    children: [
                        {key: "font-size-small", label: t("YakitEditor.small")},
                        {key: "font-size-middle", label: t("YakitEditor.medium")},
                        {key: "font-size-large", label: t("YakitEditor.large")}
                    ]
                }
            ],
            onRun: (editor: YakitIMonacoEditor, key: string) => {}
        },
        cut: {
            menu: [{key: "cut", label: t("YakitEditor.cut")}],
            onRun: (editor: YakitIMonacoEditor, key: string) => {
                if (editor?.executeEdits) {
                    /** 获取需要剪切的范围 */
                    const position = fetchSelectionRange(editor, true)
                    if (!position) return
                    /** 获取需要剪切的内容 */
                    const content = fetchCursorContent(editor, true)

                    const flag = editor.executeEdits("", [
                        {
                            range: position,
                            text: "",
                            forceMoveMarkers: true
                        }
                    ])
                    if (flag) {
                        setClipboardText(`${content}`)
                        editor.focus()
                    }
                }
                return
            }
        },
        copy: {
            menu: [{key: "copy", label: t("YakitEditor.copy")}],
            onRun: (editor: YakitIMonacoEditor, key: string) => {
                if (editor) setClipboardText(`${fetchCursorContent(editor, true)}`)
                return
            }
        },
        paste: {
            menu: [{key: "paste", label: t("YakitEditor.paste")}],
            onRun: (editor: YakitIMonacoEditor, key: string) => {
                if (!editor) return

                /** 获取需要粘贴的范围 */
                const position = fetchSelectionRange(editor, false)
                if (!position) return

                getClipboardText()
                    .then((str: string) => {
                        if (editor?.executeEdits) {
                            editor.executeEdits("", [
                                {
                                    range: position,
                                    text: str || "",
                                    forceMoveMarkers: true
                                }
                            ])
                            editor.focus()
                        }
                    })
                    .catch(() => {})

                return
            }
        }
    }
}

interface MutateHTTPRequestParams {
    Text: string
    WorkFlow: CodecWorkProps[]
}

/** @name 编码模块子菜单 */
const codeSubmenu: (t: (text: string) => string) => {key: string; label: string}[] = (t) => {
    return [
        {key: "double-urlencode", label: t("YakitEditor.doubleUrlEncode")},
        {key: "base64-url-encode", label: t("YakitEditor.base64ThenUrlEncode")},
        {key: "base64", label: t("YakitEditor.base64Encode")},
        {key: "hex-encode", label: t("YakitEditor.hexEncode")},
        {key: "htmlencode", label: t("YakitEditor.htmlEncode")},
        {key: "unicode-encode", label: t("YakitEditor.unicodeEncode")},
        {key: "urlencode", label: t("YakitEditor.urlEncode")},
        {key: "urlescape", label: t("YakitEditor.urlEncodeSpecialChars")}
    ]
}
/** @name 解码模块子菜单 */
const decodeSubmenu: (t: (text: string) => string) => {key: string; label: string}[] = (t) => {
    return [
        {key: "url-base64-decode", label: t("YakitEditor.urlThenBase64Decode")},
        {key: "base64-decode", label: t("YakitEditor.base64Decode")},
        {key: "hex-decode", label: t("YakitEditor.hexDecode")},
        {key: "htmldecode", label: t("YakitEditor.htmlDecode")},
        {key: "jwt-parse-weak", label: t("YakitEditor.jwtParseTestWeakKey")},
        {key: "unicode-decode", label: t("YakitEditor.unicodeDecode")},
        {key: "urlunescape", label: t("YakitEditor.urlDecode")}
    ]
}
/** @name HTTP数据包变形模块子菜单 */
const httpSubmenu: (t: (text: string) => string) => {
    key: string
    label: string
    params?: MutateHTTPRequestParams
    keybindings?: string
}[] = (t) => {
    return [
        {
            key: "mutate-http-method-get",
            label: t("YakitEditor.changeHttpMethodToGet"),
            params: {
                WorkFlow: [{CodecType: "HTTPRequestMutate", Params: [{Key: "transform", Value: "GET"}]}]
            } as MutateHTTPRequestParams,
            keybindings: YakEditorOptionShortcutKey.CommonMutateHttpMethodGet
        },
        {
            key: "mutate-http-method-post",
            label: t("YakitEditor.changeHttpMethodToPost"),
            params: {
                WorkFlow: [{CodecType: "HTTPRequestMutate", Params: [{Key: "transform", Value: "POST"}]}]
            } as MutateHTTPRequestParams
        },
        {
            key: "mutate-http-method-head",
            label: t("YakitEditor.changeHttpMethodToHead"),
            params: {
                WorkFlow: [{CodecType: "HTTPRequestMutate", Params: [{Key: "transform", Value: "HEAD"}]}]
            } as MutateHTTPRequestParams
        },
        {
            key: "mutate-chunked",
            label: t("YakitEditor.httpChunkEncode"),
            params: {
                WorkFlow: [{CodecType: "HTTPRequestMutate", Params: [{Key: "transform", Value: "Chunk 编码"}]}]
            } as MutateHTTPRequestParams
        },
        {
            key: "mutate-upload",
            label: t("YakitEditor.modifyToUploadPacket"),
            params: {
                WorkFlow: [{CodecType: "HTTPRequestMutate", Params: [{Key: "transform", Value: "上传数据包"}]}]
            } as MutateHTTPRequestParams
        },
        {
            key: "mutate-upload-Post",
            label: t("YakitEditor.modifyToUploadPacketPostOnly"),
            params: {
                WorkFlow: [
                    {CodecType: "HTTPRequestMutate", Params: [{Key: "transform", Value: "上传数据包(仅POST参数)"}]}
                ]
            } as MutateHTTPRequestParams
        }
    ]
}
/** @name 内置菜单组配置信息 */

export const extraMenuLists: (t: (text: string) => string) => OtherMenuListProps = (t) => {
    return {
        code: {
            menu: [
                {
                    key: "code",
                    label: t("YakitEditor.encoding"),
                    children: [...codeSubmenu(t)] as any as EditorMenuItemType[]
                }
            ],
            onRun: (editor: YakitIMonacoEditor, key: string) => {
                try {
                    // @ts-ignore
                    const text = editor.getModel()?.getValueInRange(editor.getSelection()) || ""
                    execCodec(key, text, t, false, editor)
                } catch (e) {
                    failed(`editor exec code failed ${e}`)
                }
            }
        },
        decode: {
            menu: [
                {
                    key: "decode",
                    label: t("YakitEditor.decode"),
                    children: [...decodeSubmenu(t)] as any as EditorMenuItemType[]
                }
            ],
            onRun: (editor: YakitIMonacoEditor, key: string) => {
                try {
                    // @ts-ignore
                    const text = editor.getModel()?.getValueInRange(editor.getSelection()) || ""
                    execCodec(key, text, t, false, editor)
                } catch (e) {
                    failed(`editor exec decode failed ${e}`)
                }
            }
        },
        http: {
            menu: [
                {
                    key: "http",
                    label: t("YakitEditor.httpPacketMorphing"),
                    children: [...httpSubmenu(t)] as any as EditorMenuItemType[]
                }
            ],
            onRun: (editor: YakitIMonacoEditor, key: string, pageId, isCustom) => {
                // 自定义HTTP数据包变形标记
                if (isCustom) {
                    customMutateRequest(key, editor.getModel()?.getValue(), editor)
                    return
                }

                const params =
                    httpSubmenu(t).filter((item) => item.key === key)[0]?.params || ({} as MutateHTTPRequestParams)

                try {
                    const model = editor.getModel()
                    const fullText = model?.getValue()
                    mutateRequest({...params, Text: fullText || ""}, editor)
                } catch (e) {
                    failed(`mutate request failed: ${e}`)
                }
            }
        },
        customcontextmenu: {
            menu: [
                {
                    key: "customcontextmenu",
                    label: t("YakitEditor.pluginExtension"),
                    children: []
                }
            ],
            onRun: (editor: YakitIMonacoEditor, key: string, pageId, isAiPlugin: any) => {
                try {
                    let scriptName = key
                    if (scriptName.startsWith("plugin-")) {
                        scriptName = scriptName.slice("plugin-".length)
                    }

                    const model = editor.getModel()
                    const selection = editor.getSelection()
                    let text = model?.getValue()
                    if (selection) {
                        let selectText = model?.getValueInRange(selection) || ""
                        if (selectText.length > 0) {
                            text = selectText
                        }
                    }
                    emiter.emit("onOpenFuzzerModal", JSON.stringify({text, scriptName, isAiPlugin}))
                } catch (e) {
                    failed(`custom context menu execute failed: ${e}`)
                }
            }
        },
        aiplugin: {
            menu: [
                {
                    key: "aiplugin",
                    label: (
                        <>
                            <IconSolidAIIcon className={"ai-plugin-menu-icon-default"} />
                            <IconSolidAIWhiteIcon className={"ai-plugin-menu-icon-hover"} />
                            {t("YakitEditor.aiPlugin")}
                        </>
                    ),
                    children: []
                }
            ],
            onRun: (editor: YakitIMonacoEditor, key: string, pageId, isAiPlugin: any) => {
                try {
                    let scriptName = key
                    if (scriptName.startsWith("aiplugin-")) {
                        scriptName = scriptName.slice("aiplugin-".length)
                    }

                    const model = editor.getModel()
                    const selection = editor.getSelection()
                    let text = model?.getValue()
                    if (selection) {
                        let selectText = model?.getValueInRange(selection) || ""
                        if (selectText.length > 0) {
                            text = selectText
                        }
                    }
                    emiter.emit("onOpenFuzzerModal", JSON.stringify({text, scriptName, isAiPlugin}))
                } catch (e) {
                    failed(`custom context menu execute failed: ${e}`)
                }
            }
        }
    }
}

/** @name codec模块和JSON美化模块处理函数 */
const execCodec = async (
    typeStr: string,
    text: string,
    t: (text: string, vars?: object) => string,
    noPrompt?: boolean,
    replaceEditor?: YakitIMonacoEditor,
    clear?: boolean,
    scriptName?: string,
    title?: string
) => {
    return ipcRenderer
        .invoke("Codec", {Text: text, Type: typeStr, ScriptName: scriptName})
        .then((result: {Result: string}) => {
            if (replaceEditor) {
                let m = showModal({
                    width: "50%",
                    content: (
                        <AutoCard
                            title={title || t("YakitEditor.encodeResult")}
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
                                >
                                    {t("YakitEditor.replaceContent")}
                                </YakitButton>
                            }
                            size={"small"}
                        >
                            <div style={{width: "100%", height: 300}}>
                                <YakitEditor type={"http"} readOnly={true} value={result.Result} />
                            </div>
                        </AutoCard>
                    )
                })
            }

            if (noPrompt) {
                showModal({
                    title: title || t("YakitEditor.encodeResult"),
                    width: "50%",
                    content: (
                        <div style={{width: "100%"}}>
                            <Space style={{width: "100%"}} direction={"vertical"}>
                                <div style={{height: 300}}>
                                    <YakitEditor fontSize={20} type={"html"} readOnly={true} value={result.Result} />
                                </div>
                            </Space>
                        </div>
                    )
                })
            }
        })
        .catch((e: any) => {
            failed(`CODEC[${typeStr}] ${t("YakitNotification.executeFailed", {colon: true})}${e}`)
        })
}

/** @name HTTP数据包变形模块处理函数 */
const mutateRequest = (params: MutateHTTPRequestParams, editor?: YakitIMonacoEditor) => {
    ipcRenderer.invoke("NewCodec", params).then((result: CodecResponseProps) => {
        if (editor) {
            // monacoEditorClear(editor)
            // monacoEditorReplace(editor, new Buffer(result.Result).toString("utf8"))
            monacoEditorWrite(
                editor,
                new Buffer(result.RawResult).toString("utf8"),
                editor.getModel()?.getFullModelRange()
            )
            return
        }
    })
}
/** @name 自定义HTTP数据包变形模块处理函数 */
const customMutateRequest = (key: string, text?: string, editor?: YakitIMonacoEditor) => {
    if (!editor) {
        return
    }
    ipcRenderer
        .invoke("Codec", {Type: key, Text: text, Params: [], ScriptName: key})
        .then((res) => {
            monacoEditorWrite(
                editor,
                new Buffer(res?.Result || "").toString("utf8"),
                editor.getModel()?.getFullModelRange()
            )
        })
        .catch((err) => {
            if (err) throw err
        })
}
