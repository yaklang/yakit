import {useEffect, useState} from "react"
import {throttle} from "lodash-es"
import {IMonacoEditor} from "@/utils/editors"

function getSelectionByteCount(editor: IMonacoEditor): number {
    const selection = editor.getSelection()
    if (!selection || selection.isEmpty()) return 0

    const model = editor.getModel()
    if (!model) return 0

    const selectedText = model.getValueInRange(selection)
    return new TextEncoder().encode(selectedText).length
}

function watchSelectionByteCount(editor: IMonacoEditor, callback: (byteCount: number) => void, wait = 100) {
    let prevCount = -1

    const handler = throttle(() => {
        const count = getSelectionByteCount(editor)
        if (count !== prevCount) {
            prevCount = count
            callback(count)
        }
    }, wait)

    const disposable = editor.onDidChangeCursorSelection(handler)

    return {
        dispose: () => {
            disposable.dispose()
            handler.cancel()
        }
    }
}

/**
 * 实时获取编辑器选中内容的字节数
 */
export function useSelectionByteCount(editor?: IMonacoEditor, wait = 100) {
    const [count, setCount] = useState(0)

    useEffect(() => {
        if (!editor) return
        const watcher = watchSelectionByteCount(editor, setCount, wait)
        return () => watcher.dispose()
    }, [editor, wait])

    return count
}
