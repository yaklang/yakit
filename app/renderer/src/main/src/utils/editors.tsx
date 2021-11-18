import React, {useEffect, useState} from "react";
import MonacoEditor, {monaco} from 'react-monaco-editor';
import * as monacoEditor from "monaco-editor/esm/vs/editor/editor.api";
import HexEditor from "react-hex-editor";
// yak register
import "./monacoSpec/theme"
import "./monacoSpec/fuzzHTTP";
import "./monacoSpec/yakEditor";
import "./monacoSpec/html"
import {Card, Col, Input, Row, Space} from "antd";
import {SelectOne} from "./inputUtil";
import oneDarkPro from 'react-hex-editor/themes/oneDarkPro';
import {editor} from "monaco-editor/esm/vs/editor/editor.api";
import {
    monacoEditorClear,
    monacoEditorHighlight,
    monacoEditorRemoveAllHighlight
} from "../pages/fuzzer/fuzzerTemplates";

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
                    fontWeight: "500", fontSize: 12, showFoldingControls: "always",
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
}

export const HTTPPacketEditor: React.FC<HTTPPacketEditorProp> = (props) => {
    const isResponse = (new Buffer(props.originValue.subarray(0, 5)).toString("utf8")).startsWith("HTTP/")
    const [mode, setMode] = useState("text");
    const [strValue, setStrValue] = useState("");
    const [hexValue, setHexValue] = useState<Uint8Array>(new Buffer([]))
    const [searchValue, setSearchValue] = useState("");
    const [monacoEditor, setMonacoEditor] = useState<IMonacoEditor>();

    const [highlightDecorations, setHighlightDecorations] = useState<any[]>([]);

    /*如何实现 monaco editor 高亮？*/
    // https://microsoft.github.io/monaco-editor/playground.html#interacting-with-the-editor-line-and-inline-decorations

    // hex editor
    const [nonce, setNonce] = useState(0);
    // The callback facilitates updates to the source data.
    const handleSetValue = React.useCallback((offset, value) => {
        hexValue[offset] = value;
        setNonce(v => (v + 1));
    }, [hexValue]);

    useEffect(() => {
        if (monacoEditor) {
            setHighlightDecorations(monacoEditor.deltaDecorations(highlightDecorations, []))
        }
        setStrValue(new Buffer(props.originValue).toString('utf8'))
        setHexValue(new Buffer(props.originValue))
    }, [props.originValue, monacoEditor])

    useEffect(() => {
        props.onChange && props.onChange(Buffer.from(strValue))
    }, [strValue])

    useEffect(() => {
        props.onChange && props.onChange(hexValue)
    }, [hexValue])

    return <Card
        size={"small"}
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
        bodyStyle={{padding: 0, height: 350}}
    >
        {mode === "text" && <YakEditor
            type={isResponse ? "html" : "http"}
            value={strValue} readOnly={props.readOnly}
            setValue={setStrValue}
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
    </Card>
};
