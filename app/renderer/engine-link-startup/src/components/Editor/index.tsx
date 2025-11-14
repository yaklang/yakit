import React, {useEffect, useLayoutEffect, useState} from "react"
import * as monaco from "monaco-editor/esm/vs/editor/editor.api"
import MonacoEditor from "react-monaco-editor"
import ReactResizeDetector from "react-resize-detector"
import {Theme, useTheme} from "@/hooks/useTheme"
import {applyYakitMonacoTheme} from "@/utils/theme"

export interface EditorProp {
    value: string
    onSetValue?: (value: string) => void
    language?: "javascript" | "typescript" | "json" | any
    readOnly?: boolean
    wordWrap?: boolean
    propsTheme?: Theme
}

export const Editor: React.FC<EditorProp> = ({
    value,
    onSetValue,
    language = "javascript",
    readOnly = false,
    wordWrap = true,
    propsTheme
}) => {
    const [editor, setEditor] = useState<monaco.editor.IStandaloneCodeEditor>()
    const {theme: themeGlobal} = useTheme()

    useLayoutEffect(() => {
        applyYakitMonacoTheme(propsTheme ?? themeGlobal)
    }, [themeGlobal, propsTheme])

    const editorDidMount = (editorInstance: monaco.editor.IStandaloneCodeEditor) => {
        setEditor(editorInstance)
    }

    return (
        <div style={{height: "100%", width: "100%"}}>
            <ReactResizeDetector
                handleWidth
                handleHeight
                refreshMode='debounce'
                refreshRate={50}
                onResize={(width, height) => {
                    if (!width || !height || !editor) return
                    editor.layout({width, height})
                }}
            />
            <MonacoEditor
                language={language}
                theme='kurior'
                value={value}
                options={{
                    selectOnLineNumbers: false,
                    automaticLayout: true,
                    readOnly,
                    fontWeight: "500",
                    fontSize: 12,
                    showFoldingControls: "always",
                    showUnused: true,
                    wordWrap: wordWrap ? "on" : "off",
                    renderLineHighlight: "line",
                    lineNumbers: "on",
                    renderWhitespace: "all",
                    bracketPairColorization: {
                        enabled: true,
                        independentColorPoolPerBracketType: true
                    },
                    fixedOverflowWidgets: true,
                    contextmenu: true
                }}
                onChange={onSetValue}
                editorDidMount={editorDidMount}
            />
        </div>
    )
}
