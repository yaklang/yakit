import React, {useEffect, useRef, useState} from "react";
import MonacoEditor, {monaco} from 'react-monaco-editor';
import * as monacoEditor from "monaco-editor/esm/vs/editor/editor.api";
import HexEditor from "react-hex-editor";
// yak register
import "./monacoSpec/theme"
import "./monacoSpec/fuzzHTTP";
import "./monacoSpec/yakEditor";
import "./monacoSpec/html"
import {Button, Card, Form, Input, Modal, Popover, Space, Tag, Tooltip} from "antd";
import {SelectOne} from "./inputUtil";
import {EnterOutlined, FullscreenOutlined, SettingOutlined, ThunderboltFilled} from "@ant-design/icons";
import {showDrawer} from "./showModal";
import {
    execAutoDecode,
    MonacoEditorActions,
    MonacoEditorCodecActions,
    MonacoEditorFullCodecActions,
    MonacoEditorMutateHTTPRequestActions
} from "./encodec";
import {HTTPPacketFuzzable} from "../components/HTTPHistory";
import ReactResizeDetector from "react-resize-detector";

import './editors.css'
import {useDebounceFn, useMemoizedFn} from "ahooks";
import {Buffer} from "buffer";
import {failed, info} from "./notification";
import {StringToUint8Array, Uint8ArrayToString} from "./str";
import {newWebFuzzerTab} from "../pages/fuzzer/HTTPFuzzerPage";
import {getRemoteValue, setRemoteValue} from "@/utils/kv";
import {editor, IPosition, IRange, MarkerSeverity} from "monaco-editor";
import {generateCSRFPocByRequest} from "@/pages/invoker/fromPacketToYakCode";
import {callCopyToClipboard} from "@/utils/basic";
import {ConvertYakStaticAnalyzeErrorToMarker, YakStaticAnalyzeErrorResult} from "@/utils/editorMarkers";
import ITextModel = editor.ITextModel;

const {ipcRenderer} = window.require("electron")

export type IMonacoActionDescriptor = monaco.editor.IActionDescriptor;

export type IMonacoEditor = monacoEditor.editor.IStandaloneCodeEditor;
export type IMonacoCodeEditor = monacoEditor.editor.ICodeEditor;

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

    // ??????????????? true ??????????????????false ??????
    noWordWrap?: boolean

    noMiniMap?: boolean,
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
    return <YakEditor
        {...props.raw}
        type={props.isRequest ? "http" : (props.isResponse ? "html" : "http")}
        readOnly={true} value={new Buffer(props.value).toString("utf8")}
    />
}

export const YakEditor: React.FC<EditorProps> = (props) => {
    const [editor, setEditor] = useState<IMonacoEditor>();
    const [reload, setReload] = useState(false);
    const [triggerId, setTrigger] = useState<any>();
    // ????????????
    const [prevHeight, setPrevHeight] = useState(0);
    const [preWidth, setPreWidth] = useState(0);
    // const [editorHeight, setEditorHeight] = useState(0);
    const outterContainer = useRef(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (props.triggerId !== triggerId) {
            setTrigger(props.triggerId)
            setReload(true)
        }
    }, [props.triggerId])

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

        if (props.actions) {
            // ??????????????????
            props.actions.forEach(e => {
                editor.addAction(e)
            })
        }
    }, [editor])

    const handleEditorMount = (editor: IMonacoEditor, monaco: any) => {
        editor.onDidChangeModelDecorations(() => {
            updateEditorHeight(); // typing
            requestAnimationFrame(updateEditorHeight); // folding
        });

        const updateEditorHeight = () => {
            const editorElement = editor.getDomNode();

            if (!editorElement) {
                return;
            }

            const padding = 40;

            const lineHeight = editor.getOption(
                monaco.editor.EditorOption.lineHeight
            );
            const lineCount = editor.getModel()?.getLineCount() || 1;
            const height =
                editor.getTopForLineNumber(lineCount + 1) +
                lineHeight +
                padding;


            if (prevHeight !== height) {
                setPrevHeight(height);
                editorElement.style.height = `${height}px`;
                editor.layout();
            }
        };
    };

    const fixContextMenu = useMemoizedFn((editor: IMonacoEditor) => {
        editor.onContextMenu(e => {
            if (!outterContainer) {
                return
            }
            if (!outterContainer.current) {
                return
            }

            // ???????????????????????????
            const divElement = outterContainer.current as HTMLDivElement;
            const host = divElement.querySelector(".shadow-root-host")
            // adds the custom stylesheet once per editor
            if (host && host.shadowRoot && !host.shadowRoot.querySelector(".custom")) {
                const style = document.createElement("style");

                style.setAttribute("class", "custom");
                style.innerHTML = `
.context-view.monaco-menu-container > .monaco-scrollable-element {
    margin-left: 2px;
}
`;
                host.shadowRoot.prepend(style);
            }
        })
    });

    const yakSyntaxChecking = useDebounceFn(useMemoizedFn((editor: IMonacoEditor, model: ITextModel) => {
        const allContent = model.getValue()
        ipcRenderer.invoke("StaticAnalyzeError", {Code: StringToUint8Array(allContent)}).then((e: { Result: YakStaticAnalyzeErrorResult[] }) => {
            if (e && e.Result.length > 0) {
                const markers = e.Result.map(ConvertYakStaticAnalyzeErrorToMarker);
                // console.info(markers)
                // markers.push({
                //     endColumn: 14,
                //     endLineNumber: 4,
                //     message: "test",
                //     severity: MarkerSeverity.Error,
                //     startColumn: 12,
                //     startLineNumber: 5,
                // })
                monaco.editor.setModelMarkers(model, "owner", markers)
            } else {
                monaco.editor.setModelMarkers(model, "owner", [])
            }
        })
    }), {wait: 300})

    return <>
        {!reload && <div style={{height: "100%", width: "100%", overflow: "hidden"}} ref={outterContainer}>
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
                    setPrevHeight(height);
                    setPreWidth(width)
                }}
                handleWidth={true} handleHeight={true} refreshMode={"debounce"} refreshRate={30}
            >
                <div style={{height: "100%", width: "100%", overflow: "hidden"}}>
                    <MonacoEditor
                        theme={props.theme || "kurior"}
                        value={props.bytes ? new Buffer((props.valueBytes || []) as Uint8Array).toString() : props.value}
                        onChange={props.setValue}
                        language={props.type || "http"}
                        height={100}
                        editorDidMount={(editor: IMonacoEditor, monaco: any) => {
                            setEditor(editor)
                            editor.setSelection({startColumn: 0, startLineNumber: 0, endColumn: 0, endLineNumber: 0})

                            if (editor && props.type === "yak") {
                                const model = editor.getModel();
                                if (model) {
                                    yakSyntaxChecking.run(editor, model)
                                    model.onDidChangeContent(() => {
                                        yakSyntaxChecking.run(editor, model)
                                    })
                                }
                            }

                            fixContextMenu(editor)
                            if (props.full) {
                                handleEditorMount(editor, monaco)
                            }
                            if (props.editorDidMount) props.editorDidMount(editor);
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
                        }}
                    />
                </div>
            </ReactResizeDetector>
        </div>}
    </>
};

export interface HTTPPacketEditorProp extends HTTPPacketFuzzable {
    readOnly?: boolean
    originValue: Uint8Array
    defaultStringValue?: string
    onChange?: (i: Buffer) => any
    disableFullscreen?: boolean
    defaultHeight?: number
    bordered?: boolean
    onEditor?: (editor: IMonacoEditor) => any
    hideSearch?: boolean
    extra?: React.ReactNode
    emptyOr?: React.ReactNode
    actions?: MonacoEditorActions[]

    refreshTrigger?: boolean | any
    simpleMode?: boolean
    noHeader?: boolean
    loading?: boolean

    noPacketModifier?: boolean
    noTitle?: boolean
    noHex?: boolean

    extraEditorProps?: EditorProps | any

    // lang
    language?: "html" | "http" | "yak" | any

    system?: string
    isResponse?: boolean
    utf8?: boolean

    defaultSearchKeyword?: string
}

export const YakCodeEditor: React.FC<HTTPPacketEditorProp> = React.memo((props: HTTPPacketEditorProp) => {
    return <HTTPPacketEditor
        noHeader={true} {...props}
        noPacketModifier={true} language={"yak"}
        utf8={true}
        isResponse={true}
    />
})

export const HTTPPacketEditor: React.FC<HTTPPacketEditorProp> = React.memo((props: HTTPPacketEditorProp) => {
    const isResponse = props.isResponse;
    const getEncoding = (): "utf8" | "latin1" | "ascii" => {
        if (isResponse || props.readOnly || props.utf8) {
            return "utf8"
        }
        // return "latin1"
        return "utf8"; // ???????????? UTF8 ????????????????????????
    }
    const [mode, setMode] = useState("text");
    const [strValue, setStrValue] = useState(Uint8ArrayToString(props.originValue, getEncoding()));
    const [hexValue, setHexValue] = useState<Uint8Array>(new Uint8Array(props.originValue))
    const [searchValue, setSearchValue] = useState("");
    const [monacoEditor, setMonacoEditor] = useState<IMonacoEditor>();
    const [fontSize, setFontSize] = useState(12);
    const [highlightDecorations, setHighlightDecorations] = useState<any[]>([]);
    const [noWordwrap, setNoWordwrap] = useState(false);

    const highlightActive = useMemoizedFn((search: string, regexp?: boolean) => {
        if (!monacoEditor) {
            return
        }
    })

    /*???????????? monaco editor ?????????*/
    // https://microsoft.github.io/monaco-editor/playground.html#interacting-with-the-editor-line-and-inline-decorations

    // hex editor
    const [nonce, setNonce] = useState(0);
    // The callback facilitates updates to the source data.
    const handleSetValue = React.useCallback((offset, value) => {
        hexValue[offset] = value;
        setNonce(v => (v + 1));
        setHexValue(new Uint8Array(hexValue))
    }, [hexValue]);

    useEffect(() => {
        if (!props.defaultHeight) {
            return
        }

        setStrValue(props.defaultStringValue || "")
        setHexValue(StringToUint8Array(props.defaultStringValue || "", getEncoding()))
    }, [props.defaultStringValue])

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
        if (props.readOnly) {
            const value = Uint8ArrayToString(props.originValue, getEncoding())
            setStrValue(value);
            setHexValue(new Uint8Array(props.originValue))
        }
        if (props.readOnly && monacoEditor) {
            monacoEditor.setSelection({startColumn: 0, startLineNumber: 0, endLineNumber: 0, endColumn: 0})
        }
    }, [
        props.originValue,
        props.readOnly,
        // monacoEditor,
    ])

    useEffect(() => {
        if (props.readOnly) {
            return
        }
        setStrValue(Uint8ArrayToString(props.originValue, getEncoding()))
        setHexValue(new Uint8Array(props.originValue))
    }, [props.refreshTrigger])

    useEffect(() => {
        props.onChange && props.onChange(new Buffer(StringToUint8Array(strValue, getEncoding())))
    }, [strValue])

    useEffect(() => {
        props.onChange && props.onChange(new Buffer(hexValue))
    }, [hexValue])

    const empty = !!props.emptyOr && props.originValue.length == 0

    // ????????????????????????????????????????????????????????????
    useEffect(() => {
        if (!props.defaultSearchKeyword) {
            return
        }

        if (!monacoEditor) {
            return
        }

        try {
            const model = monacoEditor.getModel();
            // @ts-ignore
            const range: IRange = model.findNextMatch(
                props.defaultSearchKeyword,
                {lineNumber: 0, column: 0} as IPosition,
                false, false, null, false,
            ).range;
            monacoEditor.setSelection(range)
            monacoEditor.revealRangeNearTop(range);
            monacoEditor.trigger("", "actions.find", undefined)
        } catch (e) {
            console.info("?????????????????????????????????", props.defaultSearchKeyword)
        }
    }, [props.defaultSearchKeyword, monacoEditor])

    // ?????? fontSize
    useEffect(() => {
        if (fontSize <= 0) {
            return
        }
        setRemoteValue("MONACO_EDITOR_FONTSIZE", `${fontSize}`)
    }, [fontSize])
    // ????????????????????????????????? FONTSIZE
    useEffect(() => {
        getRemoteValue("MONACO_EDITOR_FONTSIZE").then(e => {
            const fontSizeFetched = parseInt(e);
            if (fontSize > 0) {
                setFontSize(fontSizeFetched)
            }
        })
    }, [])

    return <div style={{width: "100%", height: "100%"}}>
        <Card
            className={"flex-card"}
            size={"small"} loading={props.loading}
            bordered={props.bordered}
            style={{height: "100%", width: "100%"}}
            title={!props.noHeader && <Space>
                {!props.noTitle && <span>{isResponse ? "Response" : "Request"}</span>}
                {(!props.simpleMode) ? (!props.noHex && <SelectOne
                    label={" "}
                    colon={false} value={mode}
                    setValue={e => {
                        if (mode === "text" && e === "hex") {
                            console.info("????????? HEX ??????")
                            setHexValue(StringToUint8Array(strValue, getEncoding()))
                        }

                        if (mode === "hex" && e === "text") {
                            console.info("????????? TEXT ??????")
                            setStrValue(Uint8ArrayToString(hexValue, getEncoding()))
                        }
                        setMode(e)
                    }}
                    data={[
                        {text: "TEXT", value: "text"},
                        {text: "HEX", value: "hex"},
                    ]} size={"small"} formItemStyle={{marginBottom: 0}}
                />) : <Form.Item style={{marginBottom: 0}}>
                    <Tag color={"geekblue"}>{mode.toUpperCase()}</Tag>
                </Form.Item>}
                {mode === "text" && !props.hideSearch && !props.simpleMode && <Input.Search
                    size={"small"} value={searchValue}
                    onChange={e => {
                        setSearchValue(e.target.value)
                    }} enterButton={true}
                    onSearch={e => {
                        highlightActive(searchValue)
                    }}
                />}
            </Space>}
            bodyStyle={{padding: 0, width: "100%", display: "flex", flexDirection: "column"}}
            extra={!props.noHeader && <Space size={2}>
                {props.extra}
                {props.sendToWebFuzzer && props.readOnly && <Button
                    size={"small"}
                    type={"primary"}
                    icon={<ThunderboltFilled/>}
                    onClick={() => {
                        ipcRenderer.invoke("send-to-tab", {
                            type: "fuzzer",
                            // ???????????????????????????????????????
                            data: {
                                isHttps: props.defaultHttps || false,
                                request: Uint8ArrayToString(props.originValue, "utf8")
                            }
                        })
                    }}
                >FUZZ</Button>}
                <Tooltip title={"???????????????"}>
                    <Button
                        size={"small"}
                        type={noWordwrap ? "link" : "primary"}
                        icon={<EnterOutlined/>}
                        onClick={() => {
                            setNoWordwrap(!noWordwrap)
                        }}
                    />
                </Tooltip>
                {!props.simpleMode && <Popover
                    title={"???????????????"}
                    content={<>
                        <Form
                            onSubmitCapture={e => {
                                e.preventDefault()
                            }} size={"small"}
                            layout={"horizontal"}
                            wrapperCol={{span: 16}}
                            labelCol={{span: 8}}
                        >
                            <SelectOne
                                formItemStyle={{marginBottom: 4}}
                                label={"??????"}
                                data={[
                                    {text: "???", value: 12},
                                    {text: "???", value: 16},
                                    {text: "???", value: 20},
                                ]} value={fontSize} setValue={setFontSize}
                            />
                            <Form.Item label={"??????"}>
                                <Button
                                    size={"small"}
                                    type={"link"}
                                    icon={<FullscreenOutlined/>}
                                    onClick={() => {
                                        showDrawer({
                                            title: "??????", width: "100%",
                                            content: <div style={{height: "100%", width: "100%"}}>
                                                <HTTPPacketEditor
                                                    {...props} disableFullscreen={true}
                                                    defaultHeight={670}

                                                />
                                            </div>
                                        })
                                    }}
                                />
                            </Form.Item>
                        </Form>
                    </>}
                >
                    <Button
                        icon={<SettingOutlined/>}
                        type={"link"} size={"small"}
                    />
                </Popover>}
            </Space>}
        >
            <div style={{flex: 1}}>
                {empty && props.emptyOr}
                {mode === "text" && !empty && <YakEditor
                    loading={props.loading}
                    // type={"html"}
                    type={props.language || (isResponse ? "html" : "http")}
                    value={
                        props.readOnly && props.originValue.length > 0 ?
                            new Buffer(props.originValue).toString(getEncoding()) : strValue
                        // Uint8ArrayToString(props.originValue, getEncoding()) : strValue
                    }
                    readOnly={props.readOnly}
                    setValue={setStrValue} noWordWrap={noWordwrap}
                    fontSize={fontSize}
                    actions={[
                        ...(props.actions || []),
                        ...[
                            {
                                label: "?????? WebFuzzer", contextMenuGroupId: "auto-suggestion",
                                id: "new-web-fuzzer-tab", run: (e) => {
                                    try {
                                        // @ts-ignore
                                        const text = e.getModel()?.getValue() || "";
                                        if (!text) {
                                            info("???????????????")
                                            return
                                        }
                                        newWebFuzzerTab(false, text).finally(() => {
                                            Modal.info({
                                                title: "??????",
                                                content: (
                                                    <>???????????? WebFuzzer Tab ????????????????????????????????? HTTPS</>
                                                )
                                            })
                                        })
                                    } catch (e) {
                                        failed("editor exec codec failed")
                                    }
                                }
                            },
                            {
                                label: "?????????????????????Inspector???", contextMenuGroupId: "auto-suggestion",
                                id: "auto-decode", run: (e) => {
                                    try {
                                        // @ts-ignore
                                        const text = e.getModel()?.getValueInRange(e.getSelection() as any) || "";
                                        if (!text) {
                                            Modal.info({
                                                title: "??????????????????", content: (
                                                    <>{"?????????????????????????????????????????????"}</>
                                                )
                                            })
                                            return
                                        }
                                        execAutoDecode(text)
                                    } catch (e) {
                                        failed("editor exec codec failed")
                                    }
                                }
                            },
                            {
                                label: "????????? CSRF PoC", contextMenuGroupId: "auto-suggestion",
                                id: "csrfpoc", run: (e) => {
                                    try {
                                        // @ts-ignore
                                        const text = e.getModel()?.getValue() || "";
                                        if (!text) {
                                            info("???????????????")
                                            return
                                        }
                                        generateCSRFPocByRequest(StringToUint8Array(text, "utf8"), code => {
                                            callCopyToClipboard(code)
                                        })
                                    } catch (e) {
                                        failed("???????????? CSRF ??????")
                                    }
                                }
                            },
                            ...MonacoEditorCodecActions,
                        ],
                        ...(props.noPacketModifier ? [] : MonacoEditorMutateHTTPRequestActions),
                        ...(props.noPacketModifier ? [] : MonacoEditorFullCodecActions),
                    ]}
                    editorDidMount={editor => {
                        setMonacoEditor(editor)
                    }}

                    {...props.extraEditorProps}
                />}
                {mode === "hex" && !empty && <HexEditor
                    className={props.system === 'Windows_NT' ? 'hex-editor-style' : ''}
                    showAscii={true}
                    data={hexValue}
                    showRowLabels={true}
                    showColumnLabels={false}
                    nonce={nonce}
                    onSetValue={props.readOnly ? undefined : handleSetValue}
                />}
            </div>
        </Card>
    </div>
});