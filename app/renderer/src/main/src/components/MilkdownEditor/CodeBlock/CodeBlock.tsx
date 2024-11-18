import {YakitEditor} from "@/components/yakitUI/YakitEditor/YakitEditor"
import {IMonacoEditor} from "@/utils/editors"
import {useNodeViewContext} from "@prosemirror-adapter/react"
import {useInViewport, useMemoizedFn} from "ahooks"
import React, {useState, useEffect, useRef} from "react"

export const CustomCodeComponent: React.FC = () => {
    const {node, view, getPos} = useNodeViewContext()
    // 编辑器实例
    const [editor, setEditor] = useState<IMonacoEditor>()

    const codeRef = useRef<HTMLDivElement>(null)
    const [inViewport = true] = useInViewport(codeRef)

    useEffect(() => {
        if (!editor) return
        if (!inViewport) return
        editor.focus()
    }, [editor, inViewport])

    const updateEditorContent = useMemoizedFn((newContent) => {
        if (!inViewport) return
        const {state, dispatch} = view
        if (newContent) {
            const updatedContent = state.schema.nodes.code_block.create(
                null, // 不带任何属性
                state.schema.text(newContent)
            )
            const tr = state.tr.replaceWith(getPos() || 0, (getPos() || 0) + node.nodeSize, updatedContent) // 用新内容替换节点内容
            dispatch(tr) // 提交事务更新内容
        } else {
            const updatedContent = state.schema.nodes.paragraph.create(
                null, // 不带任何属性
                state.schema.text(" ")
            )
            const tr = state.tr.replaceWith(getPos() || 0, (getPos() || 0) + node.nodeSize, updatedContent) // 用新内容替换节点内容
            dispatch(tr) // 提交事务更新内容
        }
    })
    return (
        <div style={{height: 200, marginBottom: 20}} ref={codeRef}>
            <YakitEditor
                type='yak'
                value={node.textContent}
                setValue={updateEditorContent}
                editorDidMount={setEditor}
            />
        </div>
    )
}
