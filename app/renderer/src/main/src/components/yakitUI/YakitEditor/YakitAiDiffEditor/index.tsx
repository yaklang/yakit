import {FC} from "react"

import {MonacoDiffEditor} from "react-monaco-editor"
import {TYakitDiffEditorProps} from "./types"
import {YakitDiffEditor} from "../../YakitDiffEditor/YakitDiffEditor"
import {
    isYakEditorDefaultShortcut,
    isYakEditorShortcut,
    isPageOrGlobalShortcut
} from "@/utils/globalShortcutKey/events/page/yakEditor"
import {convertKeyEventToKeyCombination, sortKeysCombination} from "@/utils/globalShortcutKey/utils"
const originalValue = "aaa"

const YakitAiDiffEditor: FC<TYakitDiffEditorProps> = ({
    theme,
    value,
    onChange,
    language,
    editor,
    yakStaticAnalyze,
    readOnly,
    nowFontsize,
    noLineNumber,
    noMiniMap,
    noWordWrap,
    lineNumbersMinChars,
    renderValidationDecorations,
    editorDidMount
}) => {
    console.log(JSON.stringify(value))
    return (
        <MonacoDiffEditor
            // height={100}
            theme={theme || "kurior"}
            original={value} // 原文本
            value={originalValue} // 修改后的文本
            onChange={onChange}
            language={language}
            options={{
                readOnly: readOnly,
                scrollBeyondLastLine: false,
                fontWeight: "500",
                fontSize: nowFontsize || 12,
                showFoldingControls: "always",
                showUnused: true,
                wordWrap: noWordWrap ? "off" : "on",
                renderLineHighlight: "line",
                lineNumbers: noLineNumber ? "off" : "on",
                minimap: noMiniMap ? {enabled: false} : undefined,
                lineNumbersMinChars: lineNumbersMinChars || 5,
                contextmenu: false,
                renderWhitespace: "all",
                bracketPairColorization: {
                    enabled: true,
                    independentColorPoolPerBracketType: true
                },
                fixedOverflowWidgets: true,
                renderValidationDecorations: renderValidationDecorations
            }}
        />
    )
}

export {YakitAiDiffEditor}
