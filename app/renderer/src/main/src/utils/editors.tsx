import React, {ReactElement, useEffect, useMemo, useRef, useState} from "react"
import MonacoEditor, {monaco} from "react-monaco-editor"
import * as monacoEditor from "monaco-editor/esm/vs/editor/editor.api"
import HexEditor from "react-hex-editor"
// yak register
import "./monacoSpec/theme"
import "./monacoSpec/fuzzHTTPMonacoSpec"
import "./monacoSpec/yakEditor"
import "./monacoSpec/html"
import {Card, Form, Input, Popover, Tag, Tooltip, Row, Col} from "antd"
import {SelectOne} from "./inputUtil"
import {EnterOutlined, FullscreenOutlined, SettingOutlined, ThunderboltFilled} from "@ant-design/icons"
import {showDrawer} from "./showModal"
import {HTTPFlowBodyByIdRequest, HTTPPacketFuzzable} from "../components/HTTPHistory"
import ReactResizeDetector from "react-resize-detector"

import {useDebounceEffect, useDebounceFn, useMemoizedFn, useUpdateEffect} from "ahooks"
import {Buffer} from "buffer"
import {StringToUint8Array, Uint8ArrayToString} from "./str"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {editor, IPosition, IRange} from "monaco-editor"
import {ConvertYakStaticAnalyzeErrorToMarker, YakStaticAnalyzeErrorResult} from "@/utils/editorMarkers"
import ITextModel = editor.ITextModel
import {YAK_FORMATTER_COMMAND_ID, setEditorContext} from "@/utils/monacoSpec/yakEditor"
import IModelDecoration = editor.IModelDecoration
import {
    HighLightText,
    OperationRecordRes,
    OtherMenuListProps,
    YakitEditorProps,
    YakitIMonacoEditor
} from "@/components/yakitUI/YakitEditor/YakitEditorType"
import {HTTPPacketYakitEditor} from "@/components/yakitUI/YakitEditor/extraYakitEditor"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {formatPacketRender, prettifyPacketCode, prettifyPacketRender} from "./prettifyPacket"
import {YakitSwitch} from "@/components/yakitUI/YakitSwitch/YakitSwitch"
import styles from "./editors.module.scss"
import classNames from "classnames"
import {YakitCheckableTag} from "@/components/yakitUI/YakitTag/YakitCheckableTag"
import {showYakitModal} from "@/components/yakitUI/YakitModal/YakitModalConfirm"
import {DataCompareModal} from "@/pages/compare/DataCompare"
import emiter from "./eventBus/eventBus"
import {v4 as uuidv4} from "uuid"
import {GetPluginLanguage} from "@/pages/plugins/builtInData"
import {Selection} from "@/pages/yakRunner/RunnerTabs/RunnerTabsType"

const {ipcRenderer} = window.require("electron")

export type IMonacoActionDescriptor = monaco.editor.IActionDescriptor

export type IMonacoEditor = monacoEditor.editor.IStandaloneCodeEditor
export type IMonacoCodeEditor = monacoEditor.editor.ICodeEditor

export interface EditorProps {
    loading?: boolean
    value?: string
    bytes?: boolean
    valueBytes?: Uint8Array
    setValue?: (e: string) => any
    readOnly?: boolean
    editorDidMount?: (editor: IMonacoEditor) => any
    type?: "html" | "http" | "yak" | string
    theme?: string
    fontSize?: number

    // 自动换行？ true 应该不换行，false 换行
    noWordWrap?: boolean
    /**@name 是否显示换行符 */
    showLineBreaks?: boolean

    noMiniMap?: boolean
    noLineNumber?: boolean
    lineNumbersMinChars?: number

    actions?: IMonacoActionDescriptor[]
    triggerId?: any

    full?: boolean
}

export interface YakHTTPPacketViewer {
    value: Uint8Array
    isRequest?: boolean
    isResponse?: boolean
    raw?: EditorProps
}

export const YakHTTPPacketViewer: React.FC<YakHTTPPacketViewer> = (props) => {
    return (
        <YakEditor
            {...props.raw}
            type={props.isRequest ? "http" : props.isResponse ? "html" : "http"}
            readOnly={true}
            value={new Buffer(props.value).toString("utf8")}
        />
    )
}

export interface YakInteractiveEditorProp {
    yakEditorProp: EditorProps
}

export const YakEditor: React.FC<EditorProps> = (props) => {
    const [editor, setEditor] = useState<IMonacoEditor>()
    const [reload, setReload] = useState(false)
    const [triggerId, setTrigger] = useState<any>()
    // 高度缓存
    const [prevHeight, setPrevHeight] = useState(0)
    const [preWidth, setPreWidth] = useState(0)
    // const [editorHeight, setEditorHeight] = useState(0);
    const outterContainer = useRef(null)
    const [loading, setLoading] = useState(true)

    /** 编辑器语言 */
    const language = useMemo(() => {
        return GetPluginLanguage(props.type || "http")
    }, [props.type])

    useMemo(() => {
        if (editor) {
            setEditorContext(editor, "plugin", props.type || "")
        }
    }, [props.type, editor])

    useEffect(() => {
        if (props.triggerId !== triggerId) {
            setTrigger(props.triggerId)
            setReload(true)
        }
    }, [props.triggerId])

    const triggerReload = useMemoizedFn(() => {
        setReload(true)
    })

    useEffect(() => {
        if (!reload) {
            return
        }
        setTimeout(() => setReload(false), 100)
    }, [reload])

    useEffect(() => {
        if (!editor) {
            return
        }

        setTimeout(() => {
            setLoading(false)
        }, 200)

        const model = editor.getModel()
        if (!model) {
            return
        }

        if (props.type === "http") {
            if (!model) {
                return
            }
            let current: string[] = []

            const applyContentLength = () => {
                const text = model.getValue()
                const match = /\nContent-Length:\s*?\d+/.exec(text)
                if (!match) {
                    return
                }
                const start = model.getPositionAt(match.index)
                const end = model.getPositionAt(match.index + match[0].indexOf(":"))
                current = model.deltaDecorations(current, [
                    {
                        id: "keyword" + match.index,
                        ownerId: 0,
                        range: new monaco.Range(start.lineNumber, start.column, end.lineNumber, end.column),
                        options: {afterContentClassName: "content-length"}
                    } as IModelDecoration
                ])
            }
            const applyUnicodeDecode = () => {
                const text = model.getValue()
                let match
                const regex = /(\\u[\dabcdef]{4})+/gi

                while ((match = regex.exec(text)) !== null) {
                    const start = model.getPositionAt(match.index)
                    const end = model.getPositionAt(match.index + match[0].length)
                    const decoded = match[0]
                        .split("\\u")
                        .filter(Boolean)
                        .map((hex) => String.fromCharCode(parseInt(hex, 16)))
                        .join("")
                    current = model.deltaDecorations(current, [
                        {
                            id: "decode" + match.index,
                            ownerId: 0,
                            range: new monaco.Range(start.lineNumber, start.column, end.lineNumber, end.column),
                            options: {
                                className: "unicode-decode",
                                hoverMessage: {value: decoded},
                                afterContentClassName: "unicode-decode",
                                after: {content: decoded, inlineClassName: "unicode-decode-after"}
                            }
                        } as IModelDecoration
                    ])
                }
            }
            const applyKeywordDecoration = () => {
                const text = model.getValue()
                const keywordRegExp = /\r?\n/g
                const decorations: IModelDecoration[] = []
                let match

                while ((match = keywordRegExp.exec(text)) !== null) {
                    const start = model.getPositionAt(match.index)
                    const className: "crlf" | "lf" = match[0] === "\r\n" ? "crlf" : "lf"
                    const end = model.getPositionAt(match.index + match[0].length)
                    decorations.push({
                        id: "keyword" + match.index,
                        ownerId: 2,
                        range: new monaco.Range(start.lineNumber, start.column, end.lineNumber, end.column),
                        options: {beforeContentClassName: className}
                    } as IModelDecoration)
                }
                // 使用 deltaDecorations 应用装饰
                current = model.deltaDecorations(current, decorations)
            }
            model.onDidChangeContent((e) => {
                applyContentLength()
                applyUnicodeDecode()
                applyKeywordDecoration()
            })
            applyContentLength()
            applyUnicodeDecode()
            applyKeywordDecoration()
        }

        if (language === "yak") {
            editor.addAction({
                contextMenuGroupId: "yaklang",
                id: YAK_FORMATTER_COMMAND_ID,
                label: "Yak 代码格式化",
                run: () => {
                    yakCompileAndFormat.run(editor, model)
                    return undefined
                }
            })
        }

        if (props.actions) {
            // 注册右键菜单
            props.actions.forEach((e) => {
                editor.addAction(e)
            })
        }
    }, [editor])

    const handleEditorMount = (editor: IMonacoEditor, monaco: any) => {
        editor.onDidChangeModelDecorations(() => {
            updateEditorHeight() // typing
            requestAnimationFrame(updateEditorHeight) // folding
        })

        const updateEditorHeight = () => {
            const editorElement = editor.getDomNode()

            if (!editorElement) {
                return
            }

            const padding = 40

            const lineHeight = editor.getOption(monaco.editor.EditorOption.lineHeight)
            const lineCount = editor.getModel()?.getLineCount() || 1
            const height = editor.getTopForLineNumber(lineCount + 1) + lineHeight + padding

            if (prevHeight !== height) {
                setPrevHeight(height)
                editorElement.style.height = `${height}px`
                editor.layout()
            }
        }
    }

    const fixContextMenu = useMemoizedFn((editor: IMonacoEditor) => {
        editor.onContextMenu((e) => {
            if (!outterContainer) {
                return
            }
            if (!outterContainer.current) {
                return
            }

            // 注入右键菜单的样式
            const divElement = outterContainer.current as HTMLDivElement
            const host = divElement.querySelector(".shadow-root-host")
            // adds the custom stylesheet once per editor
            if (host && host.shadowRoot && !host.shadowRoot.querySelector(".custom")) {
                const style = document.createElement("style")

                style.setAttribute("class", "custom")
                style.innerHTML = `
.context-view.monaco-menu-container > .monaco-scrollable-element {
    margin-left: 2px;
}
`
                host.shadowRoot.prepend(style)
            }
        })
    })

    const yakCompileAndFormat = useDebounceFn(
        useMemoizedFn((editor: IMonacoEditor, model: ITextModel) => {
            const allContent = model.getValue()
            ipcRenderer
                .invoke("YaklangCompileAndFormat", {Code: allContent})
                .then((e: {Errors: YakStaticAnalyzeErrorResult[]; Code: string}) => {
                    console.info(e)
                    if (e.Code !== "") {
                        model.setValue(e.Code)
                        triggerReload()
                    }

                    if (e && e.Errors.length > 0) {
                        const markers = e.Errors.map(ConvertYakStaticAnalyzeErrorToMarker)
                        monaco.editor.setModelMarkers(model, "owner", markers)
                    } else {
                        monaco.editor.setModelMarkers(model, "owner", [])
                    }
                })
                .catch((e) => {
                    console.info(e)
                })
        }),
        {wait: 500}
    )

    const yakStaticAnalyze = useDebounceFn(
        useMemoizedFn((editor: IMonacoEditor, model: ITextModel) => {
            const allContent = model.getValue()
            const type = props.type || ""
            if (language === "yak") {
                ipcRenderer
                    .invoke("StaticAnalyzeError", {Code: StringToUint8Array(allContent), PluginType: type})
                    .then((e: {Result: YakStaticAnalyzeErrorResult[]}) => {
                        if (e && e.Result.length > 0) {
                            const markers = e.Result.map(ConvertYakStaticAnalyzeErrorToMarker)
                            monaco.editor.setModelMarkers(model, "owner", markers)
                        } else {
                            monaco.editor.setModelMarkers(model, "owner", [])
                        }
                    })
            }
        }),
        {wait: 300}
    )

    return (
        <>
            {!reload && (
                <div style={{height: "100%", width: "100%", overflow: "hidden"}} ref={outterContainer}>
                    <ReactResizeDetector
                        onResize={(width, height) => {
                            if (props.full) {
                                return
                            }
                            if (!width || !height) {
                                return
                            }

                            if (editor) {
                                editor.layout({height, width})
                            }
                            setPrevHeight(height)
                            setPreWidth(width)
                        }}
                        handleWidth={true}
                        handleHeight={true}
                        refreshMode={"debounce"}
                        refreshRate={30}
                    >
                        <div
                            className={classNames({
                                [styles["monaco-editor-style"]]: !props.showLineBreaks
                            })}
                            style={{height: "100%", width: "100%", overflow: "hidden"}}
                        >
                            <MonacoEditor
                                theme={props.theme || "kurior"}
                                value={
                                    props.bytes
                                        ? new Buffer((props.valueBytes || []) as Uint8Array).toString()
                                        : props.value
                                }
                                onChange={props.setValue}
                                language={language || "http"}
                                height={100}
                                editorDidMount={(editor: IMonacoEditor, monaco: any) => {
                                    setEditor(editor)
                                    editor.setSelection({
                                        startColumn: 0,
                                        startLineNumber: 0,
                                        endColumn: 0,
                                        endLineNumber: 0
                                    })

                                    if (editor) {
                                        const model = editor.getModel()
                                        if (model) {
                                            yakStaticAnalyze.run(editor, model)
                                            model.onDidChangeContent(() => {
                                                yakStaticAnalyze.run(editor, model)
                                            })
                                        }
                                    }

                                    fixContextMenu(editor)
                                    if (props.full) {
                                        handleEditorMount(editor, monaco)
                                    }
                                    if (props.editorDidMount) props.editorDidMount(editor)
                                }}
                                options={{
                                    readOnly: props.readOnly,
                                    scrollBeyondLastLine: false,
                                    fontWeight: "500",
                                    fontSize: props.fontSize || 12,
                                    showFoldingControls: "always",
                                    showUnused: true,
                                    wordWrap: props.noWordWrap ? "off" : "on",
                                    renderLineHighlight: "line",
                                    lineNumbers: props.noLineNumber ? "off" : "on",
                                    minimap: props.noMiniMap ? {enabled: false} : undefined,
                                    lineNumbersMinChars: props.lineNumbersMinChars || 5,
                                    renderWhitespace: "all",
                                    bracketPairColorization: {
                                        enabled: true,
                                        independentColorPoolPerBracketType: true
                                    },
                                    fixedOverflowWidgets: true
                                }}
                            />
                        </div>
                    </ReactResizeDetector>
                </div>
            )}
        </>
    )
}

export const YakInteractiveEditor: React.FC<YakInteractiveEditorProp> = React.memo(
    (props: YakInteractiveEditorProp) => {
        return (
            <>
                <Row style={{height: "100%"}}>
                    <Col span={16}>
                        <YakEditor {...{...props.yakEditorProp, noMiniMap: true}} />
                    </Col>
                    <Col span={8}>
                        <div style={{flex: 1}}>变量预览</div>
                    </Col>
                </Row>
            </>
        )
    }
)
/**@name 字体大小 */
export const HTTP_PACKET_EDITOR_FONT_SIZE = "HTTP_PACKET_EDITOR_FONT_SIZE"
/**@name 获取换行符是否显示 */
export const HTTP_PACKET_EDITOR_Line_Breaks = "HTTP_PACKET_EDITOR_Line_Breaks"
/**@name 是否显示响应信息 */
export const HTTP_PACKET_EDITOR_Response_Info = "HTTP_PACKET_EDITOR_Response_Info"

interface DataCompareProps {
    rightCode: string
    /** 当存在leftCode时则使用leftCode，否则使用编辑器showValue */
    leftCode?: string
    leftTitle?: string
    rightTitle?: string
}

export interface NewHTTPPacketEditorProp extends HTTPPacketFuzzable {
    /** yakit-editor组件基础属性 */
    disabled?: boolean
    readOnly?: boolean
    contextMenu?: OtherMenuListProps
    noLineNumber?: boolean
    lineNumbersMinChars?: number
    noMinimap?: boolean
    onAddOverlayWidget?: (editor: IMonacoEditor, isShow?: boolean) => any
    extraEditorProps?: YakitEditorProps | any

    highLightText?: HighLightText[] | Selection[]
    highLightFind?: HighLightText[] | Selection[]
    highLightFindClass?: string
    // 是否定位高亮光标位置
    isPositionHighLightCursor?: boolean

    /** 扩展属性 */
    originValue: string
    // 接口返回原始包
    originalPackage?: Uint8Array
    defaultStringValue?: string
    onChange?: (i: string) => any
    disableFullscreen?: boolean
    defaultHeight?: number
    bordered?: boolean
    onEditor?: (editor: IMonacoEditor) => any
    hideSearch?: boolean
    extra?: React.ReactNode
    extraEnd?: React.ReactNode
    emptyOr?: React.ReactNode

    refreshTrigger?: boolean | any
    simpleMode?: boolean
    noHeader?: boolean
    loading?: boolean
    noModeTag?: boolean

    noPacketModifier?: boolean
    noTitle?: boolean
    title?: React.ReactNode
    noHex?: boolean

    // lang
    language?: "html" | "http" | "yak" | any

    system?: string
    isResponse?: boolean
    utf8?: boolean
    theme?: string

    defaultSearchKeyword?: string

    isWebSocket?: boolean
    webSocketValue?: string
    webSocketToServer?: string

    /**@name 外部控制换行状态 */
    noWordWrapState?: boolean
    /**@name 外部控制字体大小 */
    fontSizeState?: number
    /**@name 是否显示换行符 */
    showLineBreaksState?: boolean
    /**@name 是否增加OverlayWidget */
    isAddOverlayWidget?: boolean
    /**@name 外部控制是否记录操作(拥有此项可记录字体大小及换行符) */
    editorOperationRecord?: string
    /**@name 外部控制WebFuzzer数据 */
    webFuzzerValue?: string
    /**@name 打开WebFuzzer的回调 */
    webFuzzerCallBack?: () => void
    /**@name 是否显示美化/渲染TYPE(默认显示) */
    isShowBeautifyRender?: boolean
    /**@name 是否显示显示Extra默认项 */
    showDefaultExtra?: boolean
    /**@name 数据对比(默认无对比) */
    dataCompare?: DataCompareProps
    /**默认选中美化或渲染 */
    typeOptionVal?: RenderTypeOptionVal
    onTypeOptionVal?: (s?: RenderTypeOptionVal) => void
    /** 编码按钮 */
    AfterBeautifyRenderBtn?: ReactElement
    url?: string
    pageId?: string
    downbodyParams?: HTTPFlowBodyByIdRequest
    showDownBodyMenu?: boolean
    onClickUrlMenu?: () => void
    onClickOpenBrowserMenu?: () => void
}

export type RenderTypeOptionVal = "beautify" | "render"

interface TypeOptionsProps {
    value: RenderTypeOptionVal
    label: string
}

interface RefreshEditorOperationRecordProps extends OperationRecordRes {
    editorId: string
}

export const NewHTTPPacketEditor: React.FC<NewHTTPPacketEditorProp> = React.memo((props: NewHTTPPacketEditorProp) => {
    const isResponse = props.isResponse
    const {
        originValue,
        originalPackage,
        isShowBeautifyRender = true,
        showDefaultExtra = true,
        dataCompare,
        editorOperationRecord,
        typeOptionVal,
        onTypeOptionVal,
        highLightText,
        highLightFind,
        highLightFindClass,
        isPositionHighLightCursor,
        downstreamProxyStr = ""
    } = props
    const [mode, setMode] = useState("text")
    const [strValue, setStrValue] = useState(originValue)
    const [hexValue, setHexValue] = useState<Uint8Array>(new Uint8Array()) // 只有切换到hex时才会用这个值，目前切换得时候会把最新得编辑器中得值赋值到该变量里面
    const [searchValue, setSearchValue] = useState("")
    const [monacoEditor, setMonacoEditor] = useState<IMonacoEditor>()
    const [fontSize, setFontSize] = useState<undefined | number>(12)
    const [showLineBreaks, setShowLineBreaks] = useState<boolean>(true)
    const [highlightDecorations, setHighlightDecorations] = useState<any[]>([])
    const [noWordwrap, setNoWordwrap] = useState(false)
    const [popoverVisible, setPopoverVisible] = useState<boolean>(false)

    const [type, setType] = useState<"beautify" | "render">()
    const editorHighLightText = useMemo(() => {
        return type === undefined ? highLightText || [] : []
    }, [type, highLightText])
    const editorHighLightFind = useMemo(() => {
        return type === undefined ? highLightFind || [] : []
    }, [type, highLightFind])

    const [typeOptions, setTypeOptions] = useState<TypeOptionsProps[]>([])
    const [showValue, setShowValue] = useState<string>(originValue)
    const [renderHtml, setRenderHTML] = useState<React.ReactNode>()
    const [typeLoading, setTypeLoading] = useState<boolean>(false)

    // 对比loading
    const [compareLoading, setCompareLoading] = useState<boolean>(false)

    // 操作系统类型
    const [system, setSystem] = useState<string>()

    // 编辑器Id 用于区分每个编辑器
    const [editorId, setEditorId] = useState<string>(uuidv4())

    // 读取上次选择的字体大小/换行符
    const onRefreshEditorOperationRecord = useMemoizedFn((v) => {
        try {
            const obj: RefreshEditorOperationRecordProps = JSON.parse(v)
            if (obj.editorId === editorId) {
                if (obj?.fontSize) {
                    setFontSize(obj.fontSize)
                } else {
                    setShowLineBreaks(obj.showBreak || false)
                }
            }
        } catch (error) {}
    })

    useEffect(() => {
        if (editorOperationRecord) {
            getRemoteValue(editorOperationRecord).then((data) => {
                try {
                    if (!data) return
                    let obj: OperationRecordRes = JSON.parse(data)
                    if (obj?.fontSize) {
                        setFontSize(obj?.fontSize)
                    }
                    if (typeof obj?.showBreak === "boolean") {
                        setShowLineBreaks(obj?.showBreak)
                    }
                } catch (error) {}
            })
        }
    }, [])

    useEffect(() => {
        emiter.on("refreshEditorOperationRecord", onRefreshEditorOperationRecord)
        return () => {
            emiter.off("refreshEditorOperationRecord", onRefreshEditorOperationRecord)
        }
    }, [])

    useUpdateEffect(() => {
        setNoWordwrap(props.noWordWrapState || false)
    }, [props.noWordWrapState])
    useUpdateEffect(() => {
        if (!props.fontSizeState) return
        setFontSize(props.fontSizeState)
    }, [props.fontSizeState])
    useUpdateEffect(() => {
        setShowLineBreaks(props.showLineBreaksState || false)
    }, [props.showLineBreaksState])

    useEffect(() => {
        ipcRenderer.invoke("fetch-system-name").then((res) => setSystem(res))
        getRemoteValue(HTTP_PACKET_EDITOR_Line_Breaks)
            .then((data) => {
                setShowLineBreaks(data === "true")
            })
            .catch(() => {
                setShowLineBreaks(true)
            })
    }, [])

    const highlightActive = useMemoizedFn((search: string, regexp?: boolean) => {
        if (!monacoEditor) {
            return
        }
    })

    /*如何实现 monaco editor 高亮？*/
    // https://microsoft.github.io/monaco-editor/playground.html#interacting-with-the-editor-line-and-inline-decorations

    // hex editor
    const [nonce, setNonce] = useState(0)
    // The callback facilitates updates to the source data.
    const handleSetValue = React.useCallback(
        (offset, value) => {
            hexValue[offset] = value
            setNonce((v) => v + 1)
            setHexValue(value)
        },
        [hexValue]
    )

    const openCompareModal = useMemoizedFn((dataCompare: DataCompareProps) => {
        setCompareLoading(true)
        setTimeout(() => {
            const m = showYakitModal({
                title: null,
                content: (
                    <DataCompareModal
                        onClose={() => m.destroy()}
                        rightTitle={dataCompare.rightTitle}
                        leftTitle={dataCompare.leftTitle}
                        leftCode={dataCompare.leftCode ? dataCompare.leftCode : showValue}
                        rightCode={dataCompare.rightCode}
                        loadCallBack={() => setCompareLoading(false)}
                    />
                ),
                onCancel: () => {
                    m.destroy()
                },
                width: 1200,
                footer: null,
                closable: false,
                hiddenHeader: true
            })
        }, 500)
    })

    useEffect(() => {
        if (!props.defaultHeight) {
            return
        }

        setStrValue(props.defaultStringValue || "")
        if (mode === "hex") setHexValue(StringToUint8Array(props.defaultStringValue || ""))
    }, [props.defaultStringValue, mode])

    useEffect(() => {
        if (monacoEditor) {
            props.onEditor && props.onEditor(monacoEditor)
            monacoEditor.setSelection({startColumn: 0, startLineNumber: 0, endLineNumber: 0, endColumn: 0})
        }
        if (!props.simpleMode && !props.hideSearch && monacoEditor) {
            setHighlightDecorations(monacoEditor.deltaDecorations(highlightDecorations, []))
        }
    }, [monacoEditor])
    useEffect(() => {
        if (monacoEditor) {
            props.onAddOverlayWidget && props.onAddOverlayWidget(monacoEditor, props.isAddOverlayWidget)
        }
    }, [monacoEditor, props.isAddOverlayWidget])
    useEffect(() => {
        if (props.readOnly) {
            setStrValue(showValue)
            if (mode === "hex") setHexValue(StringToUint8Array(showValue))
        }
        if (props.readOnly && monacoEditor) {
            monacoEditor.setSelection({startColumn: 0, startLineNumber: 0, endLineNumber: 0, endColumn: 0})
        }
    }, [
        showValue,
        props.readOnly,
        mode
        // monacoEditor,
    ])

    useEffect(() => {
        if (props.readOnly) {
            return
        }
        setStrValue(originValue)
        if (mode === "hex") setHexValue(StringToUint8Array(originValue))
    }, [props.refreshTrigger, mode, props.readOnly])

    useEffect(() => {
        props.onChange && props.onChange(strValue)
    }, [strValue])

    // hexValue 暂时没有用，后续添加hexValue，请不要使用onChange方法，单独用一个事件去处理
    // useEffect(() => {
    //     props.onChange && props.onChange(Uint8ArrayToString(hexValue))
    // }, [hexValue])

    const empty = !!props.emptyOr && originValue.length == 0

    // 如果这个不为空的话，默认直接打开搜索功能
    useEffect(() => {
        if (!props.defaultSearchKeyword) {
            return
        }

        if (!monacoEditor) {
            return
        }

        try {
            const model = monacoEditor.getModel()
            // @ts-ignore
            const range: IRange = model.findNextMatch(
                props.defaultSearchKeyword,
                {lineNumber: 0, column: 0} as IPosition,
                false,
                false,
                null,
                false
            ).range
            monacoEditor.setSelection(range)
            monacoEditor.revealRangeNearTop(range)
            monacoEditor.trigger("", "actions.find", undefined)
        } catch (e) {
            console.info("加载默认搜索字符串失败", props.defaultSearchKeyword)
        }
    }, [props.defaultSearchKeyword, monacoEditor])

    useEffect(() => {
        setRenderHTML(undefined)
        setTypeOptions([])
        setShowValue(originValue)
        if (originValue.length > 0) {
            // 默认展示 originValue
            const encoder = new TextEncoder()
            const bytes = encoder.encode(originValue)
            const mb = bytes.length / 1024 / 1024
            // 0.5mb 及以下内容才可美化
            if (isResponse) {
                formatPacketRender(originalPackage || StringToUint8Array(originValue), (packet) => {
                    if (packet) {
                        if (mb > 0.5) {
                            setTypeOptions([
                                {
                                    value: "render",
                                    label: "渲染"
                                }
                            ])
                            return
                        }
                        setTypeOptions([
                            {
                                value: "beautify",
                                label: "美化"
                            },
                            {
                                value: "render",
                                label: "渲染"
                            }
                        ])
                    } else {
                        if (mb > 0.5) return
                        setTypeOptions([
                            {
                                value: "beautify",
                                label: "美化"
                            }
                        ])
                    }
                })
            } else {
                if (mb > 0.5) return
                setTypeOptions([
                    {
                        value: "beautify",
                        label: "美化"
                    }
                ])
            }
        } else {
            setTypeOptions([])
        }
    }, [originValue, originalPackage])

    const isShowBeautifyRenderRef = useRef<boolean>()
    useEffect(() => {
        isShowBeautifyRenderRef.current = isShowBeautifyRender
    }, [isShowBeautifyRender])

    useUpdateEffect(() => {
        setType(typeOptionVal)
        if (typeOptionVal === "beautify") {
            if (originValue) {
                beautifyCode()
            }
        } else if (typeOptionVal === "render") {
            if (originValue) {
                renderCode()
            }
        }
    }, [typeOptionVal, originValue])

    const beautifyCode = useDebounceFn(
        useMemoizedFn(async () => {
            if (!isShowBeautifyRenderRef.current || typeOptions.findIndex((i) => i.value === "beautify") === -1) return
            setTypeLoading(true)
            setRenderHTML(undefined)
            if (originValue.length > 0) {
                let beautifyValue = await prettifyPacketCode(originValue)
                setShowValue(Uint8ArrayToString(beautifyValue as Uint8Array))
                setTypeLoading(false)
            } else {
                setShowValue("")
                setTypeLoading(false)
            }
        }),
        {
            wait: 300
        }
    ).run
    const renderCode = useDebounceFn(
        useMemoizedFn(async () => {
            if (!isShowBeautifyRenderRef.current || typeOptions.findIndex((i) => i.value === "render") === -1) return
            setTypeLoading(true)
            let renderValue = await prettifyPacketRender(originalPackage || StringToUint8Array(originValue))
            setRenderHTML(
                <iframe srcDoc={renderValue as string} style={{width: "100%", height: "100%", border: "none"}} />
            )
            setTypeLoading(false)
        }),
        {wait: 300}
    ).run

    useUpdateEffect(() => {
        onTypeOptionVal && onTypeOptionVal(type)
        if (originValue && type === undefined) {
            setRenderHTML(undefined)
            setShowValue(originValue)
        } else if (originValue && type === "beautify") {
            beautifyCode()
        } else if (originValue && type === "render") {
            renderCode()
        }
    }, [type])

    const handleEditorMount = useMemoizedFn((editor: YakitIMonacoEditor) => {
        setMonacoEditor(editor)
    })

    return (
        <div className={styles["new-http-packet-editor"]}>
            <Card
                className={"flex-card"}
                size={"small"}
                loading={props.loading || typeLoading}
                bordered={props.bordered}
                style={{height: "100%", width: "100%", backgroundColor: "#f0f2f5"}}
                title={
                    !props.noHeader && (
                        <div style={{display: "flex", gap: 2}}>
                            {!props.noTitle &&
                                (!!props.title ? (
                                    props.title
                                ) : (
                                    <span style={{fontSize: 12}}>{isResponse ? "Response" : "Request"}</span>
                                ))}
                            {!props.simpleMode
                                ? !props.noHex && (
                                      <SelectOne
                                          label={" "}
                                          colon={false}
                                          value={mode}
                                          setValue={(e) => {
                                              if (mode === "text" && e === "hex") {
                                                  console.info("切换到 HEX 模式")
                                                  setHexValue(StringToUint8Array(strValue))
                                              }

                                              if (mode === "hex" && e === "text") {
                                                  console.info("切换到 TEXT 模式")
                                                  setStrValue(Uint8ArrayToString(hexValue))
                                              }
                                              setMode(e)
                                          }}
                                          data={[
                                              {text: "TEXT", value: "text"},
                                              {text: "HEX", value: "hex"}
                                          ]}
                                          size={"small"}
                                          formItemStyle={{marginBottom: 0}}
                                      />
                                  )
                                : !props.noModeTag && (
                                      <Form.Item style={{marginBottom: 0}}>
                                          <Tag color={"geekblue"}>{mode.toUpperCase()}</Tag>
                                      </Form.Item>
                                  )}
                            {mode === "text" && !props.hideSearch && !props.simpleMode && (
                                <Input.Search
                                    size={"small"}
                                    value={searchValue}
                                    onChange={(e) => {
                                        setSearchValue(e.target.value)
                                    }}
                                    enterButton={true}
                                    onSearch={(e) => {
                                        highlightActive(searchValue)
                                    }}
                                />
                            )}
                        </div>
                    )
                }
                bodyStyle={{padding: 0, width: "100%", display: "flex", flexDirection: "column", overflow: "hidden"}}
                extra={
                    !props.noHeader && (
                        <div style={{display: "flex", gap: 2, alignItems: "center"}}>
                            {props.extra}
                            {isShowBeautifyRender && (
                                <div className={classNames(styles["type-options-checkable-tag"])}>
                                    {typeOptions.map((item) => (
                                        <YakitCheckableTag
                                            key={item.value}
                                            checked={type === item.value}
                                            onChange={(checked) => {
                                                if (checked) {
                                                    setType(item.value)
                                                } else {
                                                    setType(undefined)
                                                }
                                            }}
                                        >
                                            {item.label}
                                        </YakitCheckableTag>
                                    ))}
                                </div>
                            )}
                            {props.AfterBeautifyRenderBtn}
                            {dataCompare && dataCompare.rightCode.length > 0 && (
                                <YakitButton
                                    size={"small"}
                                    type={"primary"}
                                    loading={compareLoading}
                                    onClick={() => {
                                        openCompareModal(dataCompare)
                                    }}
                                >
                                    对比
                                </YakitButton>
                            )}
                            {props.sendToWebFuzzer && props.readOnly && (
                                <YakitButton
                                    size={"small"}
                                    type={"primary"}
                                    icon={<ThunderboltFilled />}
                                    onClick={() => {
                                        ipcRenderer.invoke("send-to-tab", {
                                            type: "fuzzer",
                                            // 这儿的编码为了保证不要乱动
                                            data: {
                                                isHttps: props.defaultHttps || false,
                                                request: props.defaultPacket ? props.defaultPacket : originValue,
                                                downstreamProxyStr: downstreamProxyStr
                                            }
                                        })
                                    }}
                                >
                                    FUZZ
                                </YakitButton>
                            )}
                            {showDefaultExtra && (
                                <>
                                    <Tooltip title={"不自动换行"}>
                                        <YakitButton
                                            size={"small"}
                                            type={noWordwrap ? "text" : "primary"}
                                            icon={<EnterOutlined />}
                                            onClick={() => {
                                                setNoWordwrap(!noWordwrap)
                                            }}
                                        />
                                    </Tooltip>
                                    {!props.simpleMode && (
                                        <Popover
                                            title={"配置编辑器"}
                                            content={
                                                <>
                                                    <Form
                                                        onSubmitCapture={(e) => {
                                                            e.preventDefault()
                                                        }}
                                                        size={"small"}
                                                        layout={"horizontal"}
                                                        wrapperCol={{span: 14}}
                                                        labelCol={{span: 10}}
                                                    >
                                                        {(fontSize || 0) > 0 && (
                                                            <SelectOne
                                                                formItemStyle={{marginBottom: 4}}
                                                                label={"字号"}
                                                                data={[
                                                                    {text: "小", value: 12},
                                                                    {text: "中", value: 16},
                                                                    {text: "大", value: 20}
                                                                ]}
                                                                oldTheme={false}
                                                                value={fontSize}
                                                                setValue={(size) => {
                                                                    setFontSize(size)
                                                                }}
                                                            />
                                                        )}
                                                        <Form.Item label={"全屏"} style={{marginBottom: 4}}>
                                                            <YakitButton
                                                                size={"small"}
                                                                type={"text"}
                                                                icon={<FullscreenOutlined />}
                                                                onClick={() => {
                                                                    showDrawer({
                                                                        title: "全屏",
                                                                        width: "100%",
                                                                        content: (
                                                                            <div
                                                                                style={{height: "100%", width: "100%"}}
                                                                            >
                                                                                <NewHTTPPacketEditor
                                                                                    {...props}
                                                                                    disableFullscreen={true}
                                                                                    defaultHeight={670}
                                                                                />
                                                                            </div>
                                                                        )
                                                                    })
                                                                    setPopoverVisible(false)
                                                                }}
                                                            />
                                                        </Form.Item>
                                                        {(props.language === "http" || !isResponse) && (
                                                            <Form.Item
                                                                label='是否显示换行符'
                                                                style={{marginBottom: 4, lineHeight: "16px"}}
                                                            >
                                                                <YakitSwitch
                                                                    checked={showLineBreaks}
                                                                    onChange={(checked) => {
                                                                        setRemoteValue(
                                                                            HTTP_PACKET_EDITOR_Line_Breaks,
                                                                            `${checked}`
                                                                        )
                                                                        setShowLineBreaks(checked)
                                                                    }}
                                                                />
                                                            </Form.Item>
                                                        )}
                                                    </Form>
                                                </>
                                            }
                                            onVisibleChange={(v) => {
                                                setPopoverVisible(v)
                                            }}
                                            overlayInnerStyle={{width: 300}}
                                            visible={popoverVisible}
                                        >
                                            <YakitButton icon={<SettingOutlined />} type={"text"} size={"small"} />
                                        </Popover>
                                    )}
                                </>
                            )}
                            {props.extraEnd}
                        </div>
                    )
                }
            >
                <div style={{flex: 1, overflow: "hidden"}}>
                    {empty && props.emptyOr}
                    {renderHtml}
                    {mode === "text" && !empty && !renderHtml && (
                        <HTTPPacketYakitEditor
                            theme={props.theme}
                            noLineNumber={props.noLineNumber}
                            lineNumbersMinChars={props.lineNumbersMinChars}
                            noMiniMap={props.noMinimap}
                            type={props.language || (isResponse ? "html" : "http")}
                            originValue={showValue}
                            value={props.readOnly && showValue.length > 0 ? showValue : strValue}
                            readOnly={props.readOnly}
                            disabled={props.disabled}
                            setValue={setStrValue}
                            noWordWrap={noWordwrap}
                            fontSize={fontSize}
                            showLineBreaks={showLineBreaks}
                            contextMenu={props.contextMenu}
                            noPacketModifier={props.noPacketModifier}
                            editorDidMount={handleEditorMount}
                            editorOperationRecord={editorOperationRecord}
                            defaultHttps={props.defaultHttps}
                            isWebSocket={props.isWebSocket}
                            webSocketValue={props.webSocketValue}
                            webSocketToServer={props.webSocketToServer}
                            webFuzzerValue={props.webFuzzerValue}
                            webFuzzerCallBack={props.webFuzzerCallBack}
                            editorId={editorId}
                            highLightText={editorHighLightText}
                            highLightFind={editorHighLightFind}
                            isPositionHighLightCursor={isPositionHighLightCursor}
                            highLightFindClass={highLightFindClass}
                            downstreamProxyStr={downstreamProxyStr}
                            url={props.url}
                            downbodyParams={props.downbodyParams}
                            showDownBodyMenu={props.showDownBodyMenu}
                            onClickUrlMenu={props.onClickUrlMenu}
                            onClickOpenBrowserMenu={props.onClickOpenBrowserMenu}
                            {...props.extraEditorProps}
                        />
                    )}
                    {mode === "hex" && !empty && !renderHtml && (
                        <HexEditor
                            className={classNames({[styles["hex-editor-style"]]: props.system === "Windows_NT"})}
                            showAscii={true}
                            data={hexValue}
                            showRowLabels={true}
                            showColumnLabels={false}
                            nonce={nonce}
                            onSetValue={props.readOnly ? undefined : handleSetValue}
                        />
                    )}
                </div>
            </Card>
        </div>
    )
})
