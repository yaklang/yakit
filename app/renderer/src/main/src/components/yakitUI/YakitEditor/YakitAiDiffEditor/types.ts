import type {editor as newEditor} from "monaco-editor"
import type {DebouncedFunc} from "lodash"

import type {YakitEditorProps} from "../YakitEditorType"

type TGenerateEditor = Pick<
    YakitEditorProps,
    | "theme"
    | "value"
    | "onChange"
    | "readOnly"
    | "noWordWrap"
    | "noLineNumber"
    | "noMiniMap"
    | "lineNumbersMinChars"
    | "renderValidationDecorations"
    | "editorDidMount"
>
interface TYakitDiffEditorProps extends TGenerateEditor {
    language?: string
    yakStaticAnalyze: {
        run: DebouncedFunc<(editor: newEditor.IStandaloneCodeEditor, model: newEditor.ITextModel) => void>
        cancel: () => void
        flush: () => void | undefined
    }
    nowFontsize: number
    editor?: newEditor.IStandaloneCodeEditor
}

export type {TYakitDiffEditorProps}
