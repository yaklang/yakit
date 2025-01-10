import {YakitEditor} from "@/components/yakitUI/YakitEditor/YakitEditor"
import {IMonacoEditor} from "@/utils/editors"
import {useNodeViewContext} from "@prosemirror-adapter/react"
import {useCreation, useInViewport, useMemoizedFn} from "ahooks"
import React, {useState, useEffect, useRef} from "react"
import {TextSelection} from "@milkdown/kit/prose/state"

interface CustomCodeComponent {}
export const CustomCodeComponent: React.FC<CustomCodeComponent> = () => {
    const {node, view, getPos} = useNodeViewContext()
    // 编辑器实例
    const [editor, setEditor] = useState<IMonacoEditor>()

    const codeRef = useRef<HTMLDivElement>(null)
    const [inViewport = true] = useInViewport(codeRef)
    const isFocusRef = useRef<boolean>(false) // 是否已经初次聚焦

    useEffect(() => {
        if (!editor) return
        if (!isFocusRef.current) {
            editor.focus()
            isFocusRef.current = true
        }
    }, [editor])

    const readonly = useCreation(() => {
        return !view.editable
    }, [view.editable])

    const updateEditorContent = useMemoizedFn((newContent) => {
        try {
            if (!inViewport) return
            const {state, dispatch} = view
            const start = getPos() || 0
            const end = start + node.nodeSize
            if (newContent) {
                const updatedContent = state.schema.nodes.code_block.create(
                    null, // 不带任何属性
                    state.schema.text(newContent)
                )
                const tr = state.tr.replaceWith(start, end, updatedContent) // 用新内容替换节点内容
                dispatch(tr) // 提交事务更新内容
            } else {
                const updatedContent = state.schema.nodes.paragraph.create()
                let tr = state.tr.deleteRange(start, end).insert(start, updatedContent)
                const selection = TextSelection.near(tr.doc.resolve(start))
                tr.setSelection(selection)
                dispatch(tr)
                view.focus()
            }
        } catch (error) {}
    })
    return (
        <div style={{height: 200, marginBottom: 20}} ref={codeRef}>
            <YakitEditor
                type='yak'
                readOnly={readonly}
                value={node.textContent}
                setValue={updateEditorContent}
                editorDidMount={setEditor}
            />
        </div>
    )
}
