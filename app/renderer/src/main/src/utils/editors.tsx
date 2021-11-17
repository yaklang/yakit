import React, {useEffect, useState} from "react";
import MonacoEditor, {monaco} from 'react-monaco-editor';
import * as monacoEditor from "monaco-editor/esm/vs/editor/editor.api";
import HexEditor from "react-hex-editor";
// yak register
import "./monacoSpec/theme"
import "./monacoSpec/fuzzHTTP";
import "./monacoSpec/yakEditor";
import "./monacoSpec/html"
import {Col, Row} from "antd";

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
    return <Row>
        <Col span={12}>
            <div style={{height: 350}}>
                <YakEditor
                    {...props.raw}
                    type={props.isRequest ? "http" : (props.isResponse ? "html" : "http")}
                    readOnly={true} value={new Buffer(props.value).toString("utf-8")}
                />
            </div>
        </Col>
        <Col span={12}>
            <HexEditor
                showAscii={true}
                columns={0x10}
                data={props.value}
                // nonce={nonce}
                // onSetValue={handleSetValue}
                // theme={{hexEditor: oneDarkPro}}
            />
        </Col>
    </Row>
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

