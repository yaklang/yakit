import React, {useEffect, useRef, useState} from "react";
import MonacoEditor, {monaco} from 'react-monaco-editor';
import * as monacoEditor from "monaco-editor/esm/vs/editor/editor.api";
import HexEditor from "react-hex-editor";
// yak register
import "./monacoSpec/theme"
import "./monacoSpec/fuzzHTTP";
import "./monacoSpec/yakEditor";
import "./monacoSpec/html"
import {Button, Card, Form, Input, Popover, Space, Spin, Tag} from "antd";
import {SelectOne} from "./inputUtil";
import {FullscreenOutlined, SettingOutlined, ThunderboltFilled} from "@ant-design/icons";
import {showDrawer} from "./showModal";
import {
    MonacoEditorActions,
    MonacoEditorCodecActions,
    MonacoEditorFullCodecActions,
    MonacoEditorMutateHTTPRequestActions
} from "./encodec";
import {HTTPPacketFuzzable} from "../components/HTTPHistory";
import ReactResizeDetector from "react-resize-detector";

import './editors.css'

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

    // 自动换行？ true 应该不换行，false 换行
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
        readOnly={true} value={new Buffer(props.value).toString("utf-8")}
    />
}

export const YakEditor: React.FC<EditorProps> = (props) => {
    const [editor, setEditor] = useState<IMonacoEditor>();
    const [reload, setReload] = useState(false);
    const [triggerId, setTrigger] = useState<any>();
    // 高度缓存
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
            // 注册右键菜单
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
                            if (props.editorDidMount) props.editorDidMount(editor);

                            if (props.full) {
                                handleEditorMount(editor, monaco)
                            }
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
    onChange?: (i: Uint8Array) => any
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
}

export const YakCodeEditor: React.FC<HTTPPacketEditorProp> = (props) => {
    return <HTTPPacketEditor noHeader={true} {...props} noPacketModifier={true} language={"yak"}/>
}

export const HTTPPacketEditor: React.FC<HTTPPacketEditorProp> = (props) => {
    const isResponse = (new Buffer(props.originValue.subarray(0, 5)).toString("utf8")).startsWith("HTTP/")
    const [mode, setMode] = useState("text");
    const [strValue, setStrValue] = useState(new Buffer(props.originValue).toString('utf8'));
    const [hexValue, setHexValue] = useState<Uint8Array>(new Buffer(props.originValue))
    const [searchValue, setSearchValue] = useState("");
    const [monacoEditor, setMonacoEditor] = useState<IMonacoEditor>();
    const [fontSize, setFontSize] = useState(12);

    const [highlightDecorations, setHighlightDecorations] = useState<any[]>([]);

    /*如何实现 monaco editor 高亮？*/
    // https://microsoft.github.io/monaco-editor/playground.html#interacting-with-the-editor-line-and-inline-decorations

    // hex editor
    const [nonce, setNonce] = useState(0);
    // The callback facilitates updates to the source data.
    const handleSetValue = React.useCallback((offset, value) => {
        hexValue[offset] = value;
        setNonce(v => (v + 1));
        setHexValue(new Buffer(hexValue))
    }, [hexValue]);

    useEffect(() => {
        if (!props.defaultHeight) {
            return
        }

        setStrValue(props.defaultStringValue || "")
        setHexValue(Buffer.from(props.defaultStringValue || ""))
    }, [props.defaultStringValue])

    useEffect(() => {
        if (monacoEditor) {
            setHighlightDecorations(monacoEditor.deltaDecorations(highlightDecorations, []))
            props.onEditor && props.onEditor(monacoEditor)
        }

        if (props.readOnly) {
            setStrValue(new Buffer(props.originValue).toString('utf8'))
            setHexValue(new Buffer(props.originValue))
        }
    }, [
        props.originValue,
        monacoEditor,
    ])

    useEffect(() => {
        if (props.readOnly) {
            return
        }
        setStrValue(new Buffer(props.originValue).toString('utf8'))
        setHexValue(new Buffer(props.originValue))
    }, [props.refreshTrigger])

    useEffect(() => {
        props.onChange && props.onChange(Buffer.from(strValue))
    }, [strValue])

    useEffect(() => {
        props.onChange && props.onChange(hexValue)
    }, [hexValue])

    const empty = !!props.emptyOr && props.originValue.length == 0

    return <div style={{width: "100%", height: "100%"}}>
        <Card
            className={"flex-card"}
            size={"small"} loading={props.loading}
            bordered={props.bordered}
            style={{height: "100%", width: "100%"}}
            title={!props.noHeader && <Space>
                {!props.noTitle && <span>{isResponse ? "Response" : "Request"}</span>}
                {!props.simpleMode ? (!props.noHex && <SelectOne
                    label={" "}
                    colon={false} value={mode}
                    setValue={e => {
                        if (mode === "text" && e === "hex") {
                            setHexValue(new Buffer(strValue))
                        }

                        if (mode === "hex" && e === "text") {
                            setStrValue(Buffer.from(hexValue).toString("utf8"))
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
                        if (!monacoEditor) {
                            return
                        }
                        // @ts-ignore
                        let range = monacoEditor?.getModel().findMatches(searchValue, false, false, false, null, false)
                        if (range && range.length > 0) {
                            const decs = monacoEditor.deltaDecorations(highlightDecorations, range.map(i => {
                                return {
                                    id: `highlight[${searchValue}]`,
                                    range: i.range,
                                    options: {
                                        isWholeLine: false,
                                        inlineClassName: 'monacoInlineHighlight'
                                    }
                                } as any
                            }))
                            setHighlightDecorations(decs)
                        }
                    }}
                />}
            </Space>}
            bodyStyle={{padding: 0, width: "100%", display: "flex", flexDirection: "column"}}
            extra={!props.noHeader && <>
                {props.extra}
                {props.sendToWebFuzzer && <Button
                    size={"small"}
                    type={"primary"}
                    icon={<ThunderboltFilled/>}
                    onClick={() => {
                        ipcRenderer.invoke("send-to-fuzzer", {isHttps: props.defaultHttps || false, request: strValue})
                    }}
                >FUZZ</Button>}
                {!props.disableFullscreen && !props.simpleMode && <Button
                    size={"small"}
                    type={"link"}
                    icon={<FullscreenOutlined/>}
                    onClick={() => {
                        showDrawer({
                            title: "全屏", width: "100%",
                            content: <div style={{height: "100%", width: "100%"}}>
                                <HTTPPacketEditor
                                    {...props} disableFullscreen={true}
                                    defaultHeight={670}

                                />
                            </div>
                        })
                    }}
                />}
                {!props.simpleMode && <Popover
                    title={"配置编辑器"}
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
                                label={"字号"}
                                data={[
                                    {text: "小", value: 12},
                                    {text: "中", value: 16},
                                    {text: "大", value: 20},
                                ]} value={fontSize} setValue={setFontSize}
                            />
                        </Form>
                    </>}
                >
                    <Button
                        icon={<SettingOutlined/>}
                        type={"link"} size={"small"}
                    />
                </Popover>}
            </>}
        >
            <div style={{flex: 1}}>
                {empty && props.emptyOr}
                {mode === "text" && !empty && <YakEditor
                    loading={props.loading}
                    type={props.language || (isResponse ? "html" : "http")}
                    value={strValue} readOnly={props.readOnly}
                    setValue={setStrValue}
                    fontSize={fontSize}
                    actions={[
                        ...(props.actions || []),
                        ...MonacoEditorCodecActions,
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
};
