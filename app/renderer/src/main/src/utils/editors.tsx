import React, {useEffect, useState} from "react";
import MonacoEditor, {monaco} from 'react-monaco-editor';
import {Dropdown, Menu} from "antd";
import * as monacoEditor from "monaco-editor/esm/vs/editor/editor.api";
import {YakMonacoFuzzHTTPSpec, YakMonacoFuzzHTTPTheme} from "./monacoSpec/fuzzHTTP";

// yak register
import "./monacoSpec/theme"
import "./monacoSpec/fuzzHTTP";
import "./monacoSpec/yakEditor";

export type IMonacoActionDescriptor = monaco.editor.IActionDescriptor;

export type IMonacoEditor = monacoEditor.editor.IStandaloneCodeEditor;

export interface EditorProps {
    value?: string
    bytes?: boolean
    valueBytes?: Uint8Array
    setValue?: (e: string) => any
    readOnly?: boolean
    editorDidMount?: (editor: IMonacoEditor) => any
    type?: "fuzz-http" | "yak" | string
    theme?: string

    actions?: IMonacoActionDescriptor[]
    triggerId?: any
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
                theme={props.theme || "idleFingers"}
                value={props.bytes ? new Buffer((props.valueBytes || []) as Uint8Array).toString() : props.value}
                onChange={props.setValue}
                width={"100%"}
                language={props.type || YakMonacoFuzzHTTPSpec}
                editorDidMount={(editor: IMonacoEditor) => {
                    setEditor(editor)
                    if (props.editorDidMount) props.editorDidMount(editor);
                }}
                options={{
                    readOnly: props.readOnly, scrollBeyondLastLine: false,
                    fontWeight: "500", fontSize: 14, showFoldingControls: "always",
                    showUnused: true, wordWrap: "on", renderLineHighlight: "line",
                }}
            />
        </>}
    </>
};