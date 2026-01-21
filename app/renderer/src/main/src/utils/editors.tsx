import React, {ReactElement, useEffect, useLayoutEffect, useMemo, useRef, useState} from "react"
import MonacoEditor, {monaco} from "react-monaco-editor"
import * as monacoEditor from "monaco-editor/esm/vs/editor/editor.api"
import HexEditor from "react-hex-editor"
import oneDarkPro from "react-hex-editor/themes/oneDarkPro"
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
import useGetSetState from "@/pages/pluginHub/hooks/useGetSetState"
import {showYakitDrawer} from "@/components/yakitUI/YakitDrawer/YakitDrawer"
import {useCampare} from "@/hook/useCompare/useCompare"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"
import {Theme, useTheme} from "@/hook/useTheme"
import {applyYakitMonacoTheme} from "./monacoSpec/theme"
import {useI18nNamespaces} from "@/i18n/useI18nNamespaces"
import {fontSizeOptions, useEditorFontSize} from "@/store/editorFontSize"
import { YakitSelect } from "@/components/yakitUI/YakitSelect/YakitSelect"
import { newWebFuzzerTab } from "@/pages/fuzzer/HTTPFuzzerPage"
import { JSONParseLog } from "./tool"

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

    // 弹窗 / 抽屉类独立在 root 节点外的盒模型，需外部传入颜色主题
    propsTheme?: Theme
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

    const {theme: themeGlobal} = useTheme()
    const {fontSize: globalFontSize} = useEditorFontSize()

    useLayoutEffect(() => {
        applyYakitMonacoTheme(props?.propsTheme ?? themeGlobal)
    }, [themeGlobal, editor, props?.propsTheme])

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

    const AnalyzeSessionIDRef = useRef<string>(uuidv4())
    const yakStaticAnalyze = useDebounceFn(
        useMemoizedFn((editor: IMonacoEditor, model: ITextModel) => {
            const allContent = model.getValue()
            const type = props.type || ""
            if (language === "yak") {
                ipcRenderer
                    .invoke("StaticAnalyzeError", {Code: StringToUint8Array(allContent), PluginType: type,SessionID: AnalyzeSessionIDRef.current})
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
                                    fontSize: globalFontSize,
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
    onChange?: (i: string) => any
    disableFullscreen?: boolean
    defaultHeight?: number
    bordered?: boolean
    onEditor?: (editor: IMonacoEditor) => any
    extra?: React.ReactNode
    extraEnd?: React.ReactNode
    emptyOr?: React.ReactNode

    refreshTrigger?: boolean | any
    noHeader?: boolean
    loading?: boolean
    /** @description 当内容频繁更新（如 SSE/流式输出）时，避免每次更新都把光标/选择重置到开头导致闪烁 */
    keepSelectionOnValueChange?: boolean

    noPacketModifier?: boolean
    noOpenPacketNewWindow?: boolean
    noTitle?: boolean
    title?: React.ReactNode
    titleStyle?: React.CSSProperties

    // lang
    language?: "html" | "http" | "yak" | any

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
    /**@name 是否显示美化/hex/渲染TYPE(默认显示) 这里的美化渲染hex只试用与只读的编辑器，可编辑编辑器的美化按钮请外部用按钮自行实现 */
    isShowBeautifyRender?: boolean
    // 外部单独控制hex编辑器是否显示，如果是采用内部type控制是否显示，此字段不需要传
    noShowHex?: boolean
    // 外部单独控制渲染html是否显示，如果是采用内部type控制是否显示，此字段不需要传
    renderHtml?: React.ReactNode
    /**@name 是否显示显示Extra默认项 */
    showDefaultExtra?: boolean
    /**@name 是否显示配置编辑器（默认显示） */
    noSetIngEditor?: boolean
    /**@name 数据对比(默认无对比) */
    dataCompare?: DataCompareProps
    /**默认选中美化或渲染 */
    typeOptionVal?: RenderTypeOptionVal
    onTypeOptionVal?: (s?: RenderTypeOptionVal) => void
    /** 编码按钮 */
    AfterBeautifyRenderBtn?: ReactElement
    url?: string
    downbodyParams?: HTTPFlowBodyByIdRequest
    onlyBasicMenu?: boolean
    showDownBodyMenu?: boolean
    onClickUrlMenu?: () => void
    onClickOpenBrowserMenu?: () => void
    onClickOpenPacketNewWindowMenu?: () => void

    fixContentType?: string
    originalContentType?: string
    fixContentTypeHoverMessage?: string

    keepSearchName?: string
    noSendToComparer?: boolean
}

export type RenderTypeOptionVal = "beautify" | "render" | "hex"

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
        keepSearchName,
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
        downstreamProxyStr = "",
        noShowHex = true
    } = props
    const {t, i18n} = useI18nNamespaces(["history", "yakitUi"])
    const [strValue, setStrValue] = useState(originValue)
    const [hexValue, setHexValue] = useState<Uint8Array>(new Uint8Array()) // 只有切换到hex时才会用这个值，目前切换得时候会把最新得编辑器中得值赋值到该变量里面
    const [monacoEditor, setMonacoEditor] = useState<IMonacoEditor>()
    const {fontSize, setFontSize, initFontSize} = useEditorFontSize()
    const [showLineBreaks, setShowLineBreaks] = useState<boolean>(true)
    const [noWordwrap, setNoWordwrap] = useState(false)
    const [popoverVisible, setPopoverVisible] = useState<boolean>(false)

    const [type, setType] = useState<"beautify" | "hex" | "render">()
    const editorHighLightText = useMemo(() => {
        return type === undefined ? highLightText || [] : []
    }, [type, highLightText])
    const editorHighLightFind = useMemo(() => {
        return type === undefined ? highLightFind || [] : []
    }, [type, highLightFind])

    const [typeOptions, setTypeOptions] = useState<TypeOptionsProps[]>([])
    const [showValue, setShowValue] = useState<string>(originValue)
    // When streaming (e.g. SSE), keep the MonacoEditor `value` stable to avoid full model reset on every tick.
    // We then append deltas via editor APIs.
    const [stableEditorValue, setStableEditorValue] = useState<string>(originValue)
    const streamingAppendMode = !!props.readOnly && !!props.keepSelectionOnValueChange
    const prevOriginValueRef = useRef<string>(originValue)
    const [renderHtml, setRenderHTML] = useState<React.ReactNode>()
    // const [typeLoading, setTypeLoading] = useState<boolean>(false)
    const {theme} = useTheme()

    // 对比loading
    const [compareLoading, setCompareLoading] = useState<boolean>(false)

    // 编辑器Id 用于区分每个编辑器
    const [editorId, setEditorId] = useState<string>(uuidv4())


    useEffect(()=>{
        initFontSize()
    },[])

    // 读取上次选择的字体大小/换行符
    const onRefreshEditorOperationRecord = useMemoizedFn((v) => {
        try {
            const obj: RefreshEditorOperationRecordProps = JSONParseLog(v,{page: "editors", fun: "onRefreshEditorOperationRecord"})
            if (obj.editorId === editorId) {
                if (obj?.fontSize) {
                    setFontSize(obj.fontSize)
                } else {
                    setShowLineBreaks(obj.showBreak || false)
                }
            }
        } catch (error) {}
    })

    const targetHexTheme = useMemo(() => {
        return theme === "dark" ? {hexEditor: oneDarkPro} : undefined
    }, [theme])

    useEffect(() => {
        if (editorOperationRecord) {
            getRemoteValue(editorOperationRecord).then((data) => {
                try {
                    if (!data) return
                    let obj: OperationRecordRes = JSONParseLog(data,{page: "editors"})
                    if (typeof obj?.showBreak === "boolean") {
                        setShowLineBreaks(obj?.showBreak)
                    }
                    if (typeof obj?.noWordWrap === "boolean") {
                        setNoWordwrap(obj?.noWordWrap)
                    }
                } catch (error) {
                    fail(error + "")
                }
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
        getRemoteValue(HTTP_PACKET_EDITOR_Line_Breaks)
            .then((data) => {
                setShowLineBreaks(data === "true")
            })
            .catch(() => {
                setShowLineBreaks(true)
            })
    }, [])

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
    useEffect(() => {
        if (!noShowHex) {
            setHexValue(originalPackage ? originalPackage : StringToUint8Array(originValue))
        }
    }, [noShowHex, originValue, originalPackage])

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
        if (monacoEditor) {
            props.onEditor && props.onEditor(monacoEditor)
            if (!props.keepSelectionOnValueChange) {
                monacoEditor.setSelection({startColumn: 0, startLineNumber: 0, endLineNumber: 0, endColumn: 0})
            }
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
            if (monacoEditor) {
                if (!props.keepSelectionOnValueChange) {
                    monacoEditor.setSelection({startColumn: 0, startLineNumber: 0, endLineNumber: 0, endColumn: 0})
                }
            }
        }
    }, [
        showValue,
        props.readOnly
        // monacoEditor
    ])
    useEffect(() => {
        if (!props.readOnly) {
            setStrValue(originValue)
            if (monacoEditor) {
                if (!props.keepSelectionOnValueChange) {
                    monacoEditor.setSelection({startColumn: 0, startLineNumber: 0, endLineNumber: 0, endColumn: 0})
                }
            }
        }
    }, [props.refreshTrigger, props.readOnly])

    useEffect(() => {
        props.onChange && props.onChange(strValue)
    }, [strValue])

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

    const setTypeOptionFn = useMemoizedFn(() => {
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
                                    value: "hex",
                                    label: "HEX"
                                },
                                {
                                    value: "render",
                                    label: t("NewHTTPPacketEditor.render")
                                }
                            ])
                        } else {
                            setTypeOptions([
                                {
                                    value: "beautify",
                                    label: t("YakitButton.beautify")
                                },
                                {
                                    value: "hex",
                                    label: "HEX"
                                },
                                {
                                    value: "render",
                                    label: t("NewHTTPPacketEditor.render")
                                }
                            ])
                        }
                    } else {
                        if (mb > 0.5) {
                            setTypeOptions([
                                {
                                    value: "hex",
                                    label: "HEX"
                                }
                            ])
                        } else {
                            setTypeOptions([
                                {
                                    value: "beautify",
                                    label: t("YakitButton.beautify")
                                },
                                {
                                    value: "hex",
                                    label: "HEX"
                                }
                            ])
                        }
                    }
                })
            } else {
                if (mb > 0.5) {
                    setTypeOptions([
                        {
                            value: "hex",
                            label: "HEX"
                        }
                    ])
                } else {
                    setTypeOptions([
                        {
                            value: "beautify",
                            label: t("YakitButton.beautify")
                        },
                        {
                            value: "hex",
                            label: "HEX"
                        }
                    ])
                }
            }
        } else {
            setTypeOptions([])
        }
    })

    useEffect(() => {
        // Default (non-streaming) behavior: treat originValue as the source of truth.
        if (!streamingAppendMode) {
            prevOriginValueRef.current = originValue
            setRenderHTML(undefined)
            setShowValue(originValue)
            setStableEditorValue(originValue)
            setTypeOptionFn()
            return
        }

        const prev = prevOriginValueRef.current || ""
        const isAppendOnly = prev.length > 0 && originValue.startsWith(prev)

        // If editor is not ready yet, or originValue isn't append-only, fallback to full reset.
        if (!monacoEditor || !isAppendOnly) {
            prevOriginValueRef.current = originValue
            setRenderHTML(undefined)
            setShowValue(originValue)
            setStableEditorValue(originValue)
            setTypeOptionFn()
            return
        }

        const delta = originValue.slice(prev.length)
        if (!delta) {
            return
        }

        // Update menu/copy/curl sources; keep Monaco `value` stable to avoid full setValue resets.
        prevOriginValueRef.current = originValue
        setShowValue(originValue)

        try {
            const model = monacoEditor.getModel()
            if (!model) return
            const lastLine = model.getLineCount()
            const lastCol = model.getLineMaxColumn(lastLine)
            monacoEditor.executeEdits("stream-append", [
                {
                    range: new monaco.Range(lastLine, lastCol, lastLine, lastCol),
                    text: delta,
                    forceMoveMarkers: true
                }
            ])
        } catch (e) {
            // Fallback to full reset on any unexpected editor error.
            setStableEditorValue(originValue)
        }
    }, [originValue, setTypeOptionFn, streamingAppendMode, monacoEditor])

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
        } else if (typeOptionVal === "hex") {
            if (originValue) {
                setRenderHTML(undefined)
                setHexValue(originalPackage ? originalPackage : StringToUint8Array(originValue))
            }
        }
    }, [typeOptionVal, originValue])

    const beautifyCode = useDebounceFn(
        useMemoizedFn(async () => {
            if (!isShowBeautifyRenderRef.current || typeOptions.findIndex((i) => i.value === "beautify") === -1) return
            // setTypeLoading(true)
            setRenderHTML(undefined)
            if (originValue.length > 0) {
                let beautifyValue = await prettifyPacketCode(originValue)
                setShowValue(Uint8ArrayToString(beautifyValue as Uint8Array))
                // setTypeLoading(false)
            } else {
                setShowValue("")
                // setTypeLoading(false)
            }
        }),
        {
            wait: 300
        }
    ).run
    const renderCode = useDebounceFn(
        useMemoizedFn(async () => {
            if (!isShowBeautifyRenderRef.current || typeOptions.findIndex((i) => i.value === "render") === -1) return
            // setTypeLoading(true)
            let renderValue = await prettifyPacketRender(originalPackage || StringToUint8Array(originValue))
            setRenderHTML(
                <iframe
                    srcDoc={renderValue as string}
                    style={{width: "100%", height: "100%", border: "none"}}
                    sandbox=''
                />
            )
            // setTypeLoading(false)
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
        } else if (originValue && type === "hex") {
            setRenderHTML(undefined)
            setHexValue(originalPackage ? originalPackage : StringToUint8Array(originValue))
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
                loading={
                    props.loading
                    // || typeLoading
                }
                bordered={props.bordered}
                style={{height: "100%", width: "100%", backgroundColor: "var(--Colors-Use-Basic-Background)"}}
                title={
                    !props.noHeader && (
                        <div style={{display: "flex", gap: 2, ...(props.titleStyle || {})}}>
                            {!props.noTitle &&
                                (!!props.title ? (
                                    props.title
                                ) : (
                                    <span style={{fontSize: 12}}>{isResponse ? "Response" : "Request"}</span>
                                ))}
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
                                    {t("NewHTTPPacketEditor.compare")}
                                </YakitButton>
                            )}
                            {props.sendToWebFuzzer && (
                                <YakitButton
                                    size={"small"}
                                    type={"primary"}
                                    icon={<ThunderboltFilled />}
                                    onClick={() =>
                                        newWebFuzzerTab({
                                            isHttps: props.defaultHttps || false,
                                            request: props.defaultPacket ? props.defaultPacket : originValue,
                                            downstreamProxyStr,
                                            openFlag: true
                                        })
                                    }
                                >
                                    FUZZ
                                </YakitButton>
                            )}
                            {showDefaultExtra && (
                                <>
                                    <Tooltip title={t("NewHTTPPacketEditor.noWrap")}>
                                        <YakitButton
                                            size={"small"}
                                            type={noWordwrap ? "text" : "primary"}
                                            icon={<EnterOutlined />}
                                            onClick={() => {
                                                setNoWordwrap(!noWordwrap)
                                            }}
                                        />
                                    </Tooltip>
                                    {!props.noSetIngEditor && (
                                        <YakitPopover
                                            title={t("NewHTTPPacketEditor.configureEditor")}
                                            content={
                                                <>
                                                    <Form
                                                        onSubmitCapture={(e) => {
                                                            e.preventDefault()
                                                        }}
                                                        size={"small"}
                                                        layout={"horizontal"}
                                                        wrapperCol={{span: 16}}
                                                        labelCol={{span: 8}}
                                                    >
                                                        {(fontSize || 0) > 0 && (
                                                             <Form.Item label={t("NewHTTPPacketEditor.fontSize")}>
                                                                <div style={{display: "flex", width: 120, gap: 4}}>
                                                                    <YakitSelect
                                                                        options={fontSizeOptions.map((val) => ({
                                                                            label: val,
                                                                            value: val
                                                                        }))}
                                                                        value={fontSize}
                                                                        onChange={(size) => {
                                                                            setFontSize(size)
                                                                        }}
                                                                    />
                                                                    px
                                                                </div>
                                                            </Form.Item>
                                                        )}
                                                        <Form.Item
                                                            label={t("NewHTTPPacketEditor.fullScreen")}
                                                            style={{marginBottom: 4}}
                                                        >
                                                            <YakitButton
                                                                size={"small"}
                                                                type={"text"}
                                                                icon={<FullscreenOutlined />}
                                                                disabled={props.disableFullscreen}
                                                                onClick={() => {
                                                                    showYakitDrawer({
                                                                        title: t("NewHTTPPacketEditor.fullScreen"),
                                                                        width: "100%",
                                                                        content: (
                                                                            <div
                                                                                style={{
                                                                                    height: "100%",
                                                                                    width: "100%"
                                                                                }}
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
                                                    </Form>
                                                </>
                                            }
                                            onVisibleChange={(v) => {
                                                setPopoverVisible(v)
                                            }}
                                            overlayInnerStyle={{width: 350}}
                                            visible={popoverVisible}
                                        >
                                            <YakitButton icon={<SettingOutlined />} type={"text"} size={"small"} />
                                        </YakitPopover>
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
                    {props.renderHtml || renderHtml}
                    {type !== "hex" && noShowHex && !empty && !renderHtml && !props.renderHtml && (
                        <HTTPPacketYakitEditor
                            keepSearchName={keepSearchName}
                            theme={props.theme}
                            noLineNumber={props.noLineNumber}
                            lineNumbersMinChars={props.lineNumbersMinChars}
                            noMiniMap={props.noMinimap}
                            type={props.language || "http"}
                            originValue={showValue}
                            value={
                                props.readOnly && showValue.length > 0
                                    ? streamingAppendMode
                                        ? stableEditorValue
                                        : showValue
                                    : strValue
                            }
                            readOnly={props.readOnly}
                            disabled={props.disabled}
                            setValue={streamingAppendMode ? () => {} : setStrValue}
                            noWordWrap={noWordwrap}
                            fontSize={fontSize}
                            showLineBreaks={showLineBreaks}
                            contextMenu={props.contextMenu}
                            noPacketModifier={props.noPacketModifier}
                            noOpenPacketNewWindow={props.noOpenPacketNewWindow}
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
                            onlyBasicMenu={props.onlyBasicMenu}
                            showDownBodyMenu={props.showDownBodyMenu}
                            noSendToComparer={props.noSendToComparer}
                            onClickUrlMenu={props.onClickUrlMenu}
                            onClickOpenBrowserMenu={props.onClickOpenBrowserMenu}
                            onClickOpenPacketNewWindowMenu={props.onClickOpenPacketNewWindowMenu}
                            fixContentType={props.fixContentType}
                            originalContentType={props.originalContentType}
                            fixContentTypeHoverMessage={props.fixContentTypeHoverMessage}
                            {...props.extraEditorProps}
                        />
                    )}
                    {(type === "hex" || !noShowHex) && !empty && !renderHtml && !props.renderHtml && (
                        <HexEditor
                            style={{fontSize: (fontSize || 12) === 12 ? 16 : fontSize === 16 ? 18 : 20}}
                            readOnly={true}
                            asciiWidth={18}
                            data={hexValue}
                            overscanCount={0x03}
                            showAscii={true}
                            showColumnLabels={false}
                            showRowLabels={true}
                            highlightColumn={true}
                            theme={targetHexTheme}
                        />
                    )}
                </div>
            </Card>
        </div>
    )
})
