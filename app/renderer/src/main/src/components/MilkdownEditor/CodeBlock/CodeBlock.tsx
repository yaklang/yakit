import { YakitEditor } from '@/components/yakitUI/YakitEditor/YakitEditor'
import type { IMonacoEditor } from '@/utils/editors'
import { useNodeViewContext } from '@prosemirror-adapter/react'
import { useCreation, useInViewport, useMemoizedFn } from 'ahooks'
import type React from 'react'
import { useState, useEffect, useRef } from 'react'
import { TextSelection } from '@milkdown/kit/prose/state'

interface CustomCodeComponentProps {
  // 是否控制编辑器类型
  isControlEditorType?: boolean
}

const CODE_BLOCK_MIN_HEIGHT = 200
const CODE_BLOCK_MAX_HEIGHT = 1000

export const CustomCodeComponent: React.FC<CustomCodeComponentProps> = ({ isControlEditorType = true }) => {
  const { node, view, getPos, contentRef } = useNodeViewContext()
  // 编辑器实例
  const [editor, setEditor] = useState<IMonacoEditor>()
  const [codeBlockHeight, setCodeBlockHeight] = useState<number>(CODE_BLOCK_MIN_HEIGHT)

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

  useEffect(() => {
    if (!editor) return

    let frameId: number | null = null

    const updateCodeBlockHeight = () => {
      if (frameId !== null) return

      frameId = requestAnimationFrame(() => {
        frameId = null
        const nextHeight = Math.min(CODE_BLOCK_MAX_HEIGHT, Math.max(CODE_BLOCK_MIN_HEIGHT, editor.getContentHeight()))
        setCodeBlockHeight((height) => (height === nextHeight ? height : nextHeight))
      })
    }

    updateCodeBlockHeight()
    const disposable = editor.onDidContentSizeChange(updateCodeBlockHeight)

    return () => {
      disposable.dispose()
      if (frameId !== null) {
        cancelAnimationFrame(frameId)
      }
    }
  }, [editor])

  const updateEditorContent = useMemoizedFn((newContent) => {
    try {
      if (!inViewport) return
      const { state, dispatch } = view
      const start = getPos() || 0
      const end = start + node.nodeSize
      if (newContent) {
        const updatedContent = state.schema.nodes.code_block.create(
          null, // 不带任何属性
          state.schema.text(newContent),
        )
        const tr = state.tr.replaceWith(start, end, updatedContent) // 用新内容替换节点内容
        dispatch(tr) // 提交事务更新内容
      } else {
        const updatedContent = state.schema.nodes.paragraph.create()
        const tr = state.tr.deleteRange(start, end).insert(start, updatedContent)
        const selection = TextSelection.near(tr.doc.resolve(start))
        tr.setSelection(selection)
        dispatch(tr)
        view.focus()
      }
    } catch (error) {}
  })
  return (
    <div className="milkdown-code" style={{ height: codeBlockHeight, marginBottom: 20 }} ref={codeRef}>
      {/* <div style={{display: "none"}} ref={contentRef}></div> */}
      <YakitEditor
        type={isControlEditorType ? 'yak' : undefined}
        readOnly={readonly}
        value={node.textContent}
        setValue={updateEditorContent}
        editorDidMount={setEditor}
      />
    </div>
  )
}
