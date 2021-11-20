import React, {useEffect, useRef, useState} from "react";
import MonacoEditor, {monaco} from 'react-monaco-editor';
import * as monacoEditor from "monaco-editor/esm/vs/editor/editor.api";
import HexEditor from "react-hex-editor";
// yak register
import "./monacoSpec/theme"
import "./monacoSpec/fuzzHTTP";
import "./monacoSpec/yakEditor";
import "./monacoSpec/html"
import {Button, Card, Form, Input, Popover, Space, Spin} from "antd";
import {InputItem, SelectOne, SwitchItem} from "./inputUtil";
import {ResizableBox} from "react-resizable";
import {execCodec} from "../pages/codec/CodecPage";
import {FullscreenOutlined, SettingOutlined} from "@ant-design/icons";
import {showDrawer} from "./showModal";

export type IMonacoActionDescriptor = monaco.editor.IActionDescriptor;

export type IMonacoEditor = monacoEditor.editor.IStandaloneCodeEditor;

export interface EditorProps {
    value?: string
    bytes?: boolean
    valueBytes?: Uint8Array
    setValue?: (e: string) => any
    readOnly?: boolean
    editorDidMount?: (editor: IMonacoEditor) => any
    type?: "html" | "http" | "yak" | string
    theme?: string
    fontSize?: number

    noMiniMap?: boolean,
    noLineNumber?: boolean

    actions?: IMonacoActionDescriptor[]
    triggerId?: any
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
    // return <Row>
    //     <Col span={12}>
    //         <div style={{height: 350}}>
    //
    //         </div>
    //     </Col>
    //     <Col span={12}>
    //         <HexEditor
    //             showAscii={true}
    //             columns={0x10}
    //             data={props.value}
    //             // nonce={nonce}
    //             // onSetValue={handleSetValue}
    //             // theme={{hexEditor: oneDarkPro}}
    //         />
    //     </Col>
    // </Row>
}

export const YakEditor: React.FC<EditorProps> = (props) => {
    const [editor, setEditor] = useState<IMonacoEditor>();
    const [reload, setReload] = useState(false);
    const [triggerId, setTrigger] = useState<any>();

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

        if (props.actions) {
            // 注册右键菜单
            props.actions.forEach(e => {
                editor.addAction(e)
            })
        }

        let id = setInterval(() => {
            editor.layout()
        }, 200)

        // 修复 editor 的 resize 问题
        let origin = window.onresize;
        window.onresize = (e) => {
            if (editor) editor.layout();
            // @ts-ignore
            if (origin) origin(e);
        };
        return () => {
            clearInterval(id)
            window.onresize = origin;
        }
    }, [editor])

    return <>
        {!reload && <>
            {/*@ts-ignore*/}
            <MonacoEditor
                theme={props.theme || "kurior"}
                value={props.bytes ? new Buffer((props.valueBytes || []) as Uint8Array).toString() : props.value}
                onChange={props.setValue}
                width={"100%"}
                language={props.type}
                editorDidMount={(editor: IMonacoEditor) => {
                    setEditor(editor)
                    if (props.editorDidMount) props.editorDidMount(editor);
                }}
                options={{
                    readOnly: props.readOnly, scrollBeyondLastLine: false,
                    fontWeight: "500", fontSize: props.fontSize || 12, showFoldingControls: "always",
                    showUnused: true, wordWrap: "on", renderLineHighlight: "line",
                    lineNumbers: props.noLineNumber ? "off" : "on",
                    minimap: props.noMiniMap ? {enabled: false} : undefined,
                    lineNumbersMinChars: 4,
                }}
            />
        </>}
    </>
};

export interface HTTPPacketEditorProp {
    readOnly?: boolean
    originValue: Uint8Array
    onChange?: (i: Uint8Array) => any
    disableFullscreen?: boolean
    defaultHeight?: number
    bordered?: boolean
    onEditor?: (editor: IMonacoEditor) => any
}

export const HTTPPacketEditor: React.FC<HTTPPacketEditorProp> = (props) => {
    const isResponse = (new Buffer(props.originValue.subarray(0, 5)).toString("utf8")).startsWith("HTTP/")
    const [mode, setMode] = useState("text");
    const [strValue, setStrValue] = useState(new Buffer(props.originValue).toString('utf8'));
    const [hexValue, setHexValue] = useState<Uint8Array>(new Buffer(props.originValue))
    const [searchValue, setSearchValue] = useState("");
    const [monacoEditor, setMonacoEditor] = useState<IMonacoEditor>();
    const [fontSize, setFontSize] = useState(12);
    const containerDiv = useRef(null);
    const [maxHeight, setMaxHeight] = useState(props.defaultHeight || 500);
    const [maxWidth, setMaxWidth] = useState(600);
    const [bodyHeight, setBodyHeight] = useState<number>(props.defaultHeight || 500);

    const [highlightDecorations, setHighlightDecorations] = useState<any[]>([]);

    /*如何实现 monaco editor 高亮？*/
    // https://microsoft.github.io/monaco-editor/playground.html#interacting-with-the-editor-line-and-inline-decorations

    // hex editor
    const [nonce, setNonce] = useState(0);
    // The callback facilitates updates to the source data.
    const handleSetValue = React.useCallback((offset, value) => {
        hexValue[offset] = value;
        setHexValue(new Buffer(hexValue))
        setNonce(v => (v + 1));
    }, [hexValue]);

    useEffect(() => {
        if (monacoEditor) {
            setHighlightDecorations(monacoEditor.deltaDecorations(highlightDecorations, []))
            props.onEditor && props.onEditor(monacoEditor)
        }
        // setStrValue(new Buffer(props.originValue).toString('utf8'))
        // setHexValue(new Buffer(props.originValue))
    }, [
        // props.originValue,
        monacoEditor,
    ])

    useEffect(() => {
        props.onChange && props.onChange(Buffer.from(strValue))
    }, [strValue])

    useEffect(() => {
        props.onChange && props.onChange(hexValue)
    }, [hexValue])

    useEffect(() => {
        const div = containerDiv.current;
        if (!div) {
            return
        }
        const divTag = div as HTMLDivElement;
        const setHeightAndWidth = () => {
            if (divTag.clientHeight > 0) setMaxHeight(divTag.clientHeight);
            if (divTag.clientWidth > 0) setMaxWidth(divTag.clientWidth);
        }

        setHeightAndWidth()
        let origin = window.onresize;
        window.onresize = (e) => {
            setHeightAndWidth();
            // @ts-ignore
            if (origin) origin(e);
        };

        const id = setInterval(() => setHeightAndWidth(), 500)
        return () => {
            clearInterval(id)
            window.onresize = origin;
        }
    }, [containerDiv])

    return <div style={{width: "100%"}} ref={containerDiv}>
        <ResizableBox
            width={maxWidth}
            height={maxHeight}
            onResize={(d, data) => {
                if (data.size.height - 44 >= 0) {
                    setBodyHeight(data.size.height - 44)
                }
            }} axis={"y"}
            minConstraints={[maxWidth, 300]}
        >
            <Card
                size={"small"} loading={maxWidth < 100}
                bordered={props.bordered}
                style={{height: "100%", width: "100%"}}
                title={<Space>
                    <span>{isResponse ? "HTTP Response" : "HTTP Request"}</span>
                    <SelectOne
                        label={" "} colon={false} value={mode} setValue={setMode}
                        data={[
                            {text: "TEXT", value: "text"},
                            {text: "HEX", value: "hex"},
                        ]} size={"small"} formItemStyle={{marginBottom: 0}}
                    />
                    {mode === "text" && <Input.Search
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
                bodyStyle={{padding: 0}}
                extra={[
                    !props.disableFullscreen && <Button
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
                    />,
                    <Popover
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
                    </Popover>
                ]}
            >
                <div style={{
                    height: bodyHeight || (
                        maxHeight - 44 > 0 ? maxHeight - 44 : 300
                    ), width: "100%"
                }}>
                    {mode === "text" && <YakEditor
                        type={isResponse ? "html" : "http"}
                        value={strValue} readOnly={props.readOnly}
                        setValue={setStrValue}
                        fontSize={fontSize}
                        actions={[
                            {
                                id: "http-chunk-encode",
                                label: "HTTP Chunk 编码",
                                run: function (editor, args) {
                                    const selection = editor.getSelection();
                                    if (!selection) {
                                        alert("CHUNKED")
                                    }
                                },
                                contextMenuGroupId: "encodeNdecode",
                            },
                            {
                                id: "base64-encode",
                                label: "Base64 编码",
                                run: function (editor, args) {
                                    if (!editor) {
                                        return
                                    }
                                    const selection = editor.getSelection();
                                    if (!selection) {
                                        return
                                    }

                                    try {
                                        const text = editor.getModel()?.getValueInRange(selection);
                                        execCodec("base64", text)
                                    } catch (e) {
                                        console.info(e)
                                    }

                                },
                                contextMenuGroupId: "encodeNdecode",
                            },
                            {
                                id: "base64-decode",
                                label: "Base64 解码",
                                run: function (editor, args) {
                                    const selection = editor.getSelection();
                                    if (selection) {
                                        const text = editor.getModel()?.getValueInRange(selection);
                                        execCodec("base64-decode", text || "")
                                    }
                                },
                                contextMenuGroupId: "encodeNdecode",
                            },
                            {
                                id: "url-decode",
                                label: "URL 解码",
                                run: function (editor, args) {
                                    const selection = editor.getSelection();
                                    if (!selection) {

                                    }
                                    alert("CHUNKED")
                                },
                                contextMenuGroupId: "encodeNdecode",
                            },
                        ]}
                        editorDidMount={editor => {
                            setMonacoEditor(editor)
                        }}
                    />}

                    {mode === "hex" && <HexEditor
                        showAscii={true}
                        columns={0x10}
                        data={hexValue}
                        showRowLabels={true}
                        showColumnLabels={true}
                        nonce={nonce}
                        onSetValue={props.readOnly ? undefined : handleSetValue}
                        // theme={{hexEditor: oneDarkPro}}
                    />}
                </div>
            </Card>
        </ResizableBox>
    </div>
};
