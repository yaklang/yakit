import {OtherMenuListProps, YakitEditorKeyCode, YakitIMonacoEditor} from "./YakitEditorType"
import {EditorMenuItemType} from "./EditorMenu"
import {Space} from "antd"
import {showModal} from "@/utils/showModal"
import {AutoCard} from "../../AutoCard"
import {YakitEditor} from "./YakitEditor"
import {YakitButton} from "../YakitButton/YakitButton"
import {monacoEditorClear, monacoEditorReplace, monacoEditorWrite} from "@/pages/fuzzer/fuzzerTemplates"
import {failed} from "@/utils/notification"

const {ipcRenderer} = window.require("electron")

interface MutateHTTPRequestParams {
    Request: Uint8Array
    FuzzMethods: string[]
    ChunkEncode: boolean
    UploadEncode: boolean
}

/** @name codec模块子菜单 */
const codecSubmenu: {key: string; label: string}[] = [
    {key: "double-urlencode", label: "双重 URL 编码"},
    {key: "base64-url-encode", label: "先 Base64 后 URL 编码"},
    {key: "url-base64-decode", label: "先 URL 后 Base64 解码"},
    {key: "base64", label: "Base64 编码"},
    {key: "base64-decode", label: "Base64 解码"},
    {key: "hex-encode", label: "HEX 编码（十六进制编码）"},
    {key: "hex-decode", label: "HEX 解码（十六进制解码）"},
    {key: "htmlencode", label: "HTML 编码"},
    {key: "htmldecode", label: "HTML 解码"},
    {key: "jwt-parse-weak", label: "JWT 解析（同时测试弱 Key）"},
    {key: "unicode-encode", label: "Unicode 编码（\\uXXXX 编码）"},
    {key: "unicode-decode", label: "Unicode 解码（\\uXXXX 解码）"},
    {key: "urlencode", label: "URL 编码"},
    {key: "urlescape", label: "URL 编码(只编码特殊字符)"},
    {key: "urlunescape", label: "URL 解码"}
]
/** @name 美化数据包(JSON)菜单 */
const prettySubmenu: {key: string; label: string}[] = [{key: "pretty-packet", label: "美化数据包(JSON)"}]
/** @name http模块子菜单 */
const httpSubmenu: {
    key: string
    label: string
    params?: MutateHTTPRequestParams
    keybindings?: YakitEditorKeyCode[]
}[] = [
    {
        key: "mutate-http-method-get",
        label: "改变 HTTP 方法成 GET",
        params: {FuzzMethods: ["GET"]} as MutateHTTPRequestParams,
        keybindings:[YakitEditorKeyCode.Meta,YakitEditorKeyCode.Shift,YakitEditorKeyCode.KEY_H]
    },
    {
        key: "mutate-http-method-post",
        label: "改变 HTTP 方法成 POST",
        params: {FuzzMethods: ["POST"]} as MutateHTTPRequestParams
    },
    {
        key: "mutate-http-method-head",
        label: "改变 HTTP 方法成 HEAD",
        params: {FuzzMethods: ["HEAD"]} as MutateHTTPRequestParams
    },
    {key: "mutate-chunked", label: "HTTP Chunk 编码", params: {ChunkEncode: true} as MutateHTTPRequestParams},
    {key: "mutate-upload", label: "修改为上传数据包", params: {UploadEncode: true} as MutateHTTPRequestParams}
]

export const extraMenuLists: OtherMenuListProps = {
    codec: {
        menu: [
            {
                key: "codec",
                label: "codec 模块",
                children: [...codecSubmenu] as any as EditorMenuItemType[]
            }
        ],
        onRun: (editor: YakitIMonacoEditor, key: string) => {
            try {
                // @ts-ignore
                const text = editor.getModel()?.getValueInRange(editor.getSelection()) || ""
                execCodec(key, text, false, editor)
            } catch (e) {
                failed("editor exec codec failed")
            }
        }
    },
    pretty: {
        menu: [...prettySubmenu] as any as EditorMenuItemType[],
        onRun: (editor: YakitIMonacoEditor, key: string) => {
            try {
                // @ts-ignore
                const text = editor.getModel()?.getValueInRange(editor.getSelection()) || ""
                if (!!text) {
                    execCodec(key, text, false, editor)
                } else {
                    const model = editor.getModel()
                    const fullText = model?.getValue()
                    execCodec(key, fullText || "", false, editor, true)
                }
            } catch (e) {
                failed("editor exec codec failed")
                console.error(e)
            }
        }
    },
    http: {
        menu: [
            {
                key: "http",
                label: "HTTP 模块",
                children: [...httpSubmenu] as any as EditorMenuItemType[]
            }
        ],
        onRun: (editor: YakitIMonacoEditor, key: string) => {
            const params = httpSubmenu.filter((item) => item.key === key)[0]?.params || ({} as MutateHTTPRequestParams)

            try {
                const model = editor.getModel()
                const fullText = model?.getValue()
                mutateRequest({...params, Request: new Buffer(fullText || "")}, editor)
            } catch (e) {
                failed(`mutate request failed: ${e}`)
            }
        }
    }
}

/** @name codec模块和JSON美化模块处理函数 */
const execCodec = async (
    typeStr: string,
    text: string,
    noPrompt?: boolean,
    replaceEditor?: YakitIMonacoEditor,
    clear?: boolean
) => {
    return ipcRenderer
        .invoke("Codec", {Text: text, Type: typeStr})
        .then((result: {Result: string}) => {
            if (replaceEditor) {
                let m = showModal({
                    width: "50%",
                    content: (
                        <AutoCard
                            title={"编码结果"}
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
                                    替换内容
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
                    title: "编码结果",
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
        .catch((e: any) => {})
}

interface MutateHTTPRequestResponse {
    Result: Uint8Array
    ExtraResults: Uint8Array[]
}
const mutateRequest = (params: MutateHTTPRequestParams, editor?: YakitIMonacoEditor) => {
    ipcRenderer.invoke("HTTPRequestMutate", params).then((result: MutateHTTPRequestResponse) => {
        if (editor) {
            monacoEditorClear(editor)
            monacoEditorReplace(editor, new Buffer(result.Result).toString("utf8"))
            return
        }
    })
}
