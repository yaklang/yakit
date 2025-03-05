import {YakitEditor} from "@/components/yakitUI/YakitEditor/YakitEditor"
import {IMonacoEditor} from "@/utils/editors"
import {useNodeViewContext} from "@prosemirror-adapter/react"
import {useCreation, useInViewport, useMemoizedFn} from "ahooks"
import React, {useState, useEffect, useRef, useCallback} from "react"
import {TextSelection} from "@milkdown/kit/prose/state"
import classNames from "classnames"
import styles from "./CodeBlock.module.scss"
import {YChangeProps} from "../YChange/YChangeType"
import {YChange} from "../YChange/YChange"
import {useInstance} from "@milkdown/react"
import {Ctx} from "@milkdown/kit/ctx"
import {ySyncPluginKey} from "y-prosemirror"
import * as Y from "yjs" // eslint-disable-line
/**
 * @description 计算差值变化
 * @param oldVal
 * @param newVal
 * @returns
 */
const computeChange = (oldVal: string, newVal: string): {from: number; to: number; text: string} | null => {
    if (oldVal === newVal) return null

    let start = 0
    let oldEnd = oldVal.length
    let newEnd = newVal.length

    while (start < oldEnd && oldVal.charCodeAt(start) === newVal.charCodeAt(start)) ++start

    while (oldEnd > start && newEnd > start && oldVal.charCodeAt(oldEnd - 1) === newVal.charCodeAt(newEnd - 1)) {
        oldEnd--
        newEnd--
    }

    return {from: start, to: oldEnd, text: newVal.slice(start, newEnd)}
}

interface CustomCodeComponent {}
export const CustomCodeComponent: React.FC<CustomCodeComponent> = () => {
    const {node, view, getPos, contentRef} = useNodeViewContext()
    const {attrs} = node
    // 编辑器实例
    const [editor, setEditor] = useState<IMonacoEditor>()

    const codeRef = useRef<HTMLDivElement>(null)
    const [inViewport = true] = useInViewport(codeRef)
    const isFocusRef = useRef<boolean>(false) // 是否已经初次聚焦

    const [loading, get] = useInstance()
    const action = useCallback(
        (fn: (ctx: Ctx) => void) => {
            if (loading) return
            get().action(fn)
        },
        [loading]
    )

    useEffect(() => {
        if (!editor) return
        if (!isFocusRef.current) {
            editor.focus()
            isFocusRef.current = true
        }

        // editor.onDidChangeModelContent((e) => {
        //     const changes = e.changes
        //     ydoc.transact(() => {
        //         changes.forEach((change) => {
        //             yCode.delete(change.rangeOffset, change.rangeLength)
        //             yCode.insert(change.rangeOffset, change.text)
        //         })
        //     }, "monaco-delta-update")
        // })
    }, [editor])

    useEffect(() => {
        console.log("CustomCodeComponent-node", node, contentRef)
    }, [node])

    const readonly = useCreation(() => {
        return !view.editable
    }, [view.editable])

    const updateEditorContent = useMemoizedFn((newContent) => {
        try {
            if (!inViewport) return
            const {state, dispatch} = view
            const start = getPos() || 0
            const end = start + node.nodeSize

            console.log("node.textContent,newContent", node.textContent, newContent, start, end)
            const change = computeChange(node.textContent, newContent)
            console.log("change", change, view)

            if (newContent) {
                // const ySync = ySyncPluginKey.getState(view.state)
                // const yContent = ySync.ydoc.getText("codeblock")
                // Y.transact(ySync.ydoc, () => {
                //     // yContent.delete(0, yContent.length)
                //     yContent.insert(start, change?.text)
                // })

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

    const ychange: YChangeProps = useCreation(() => attrs?.ychange || {}, [attrs])
    return (
        <div
            className={classNames(styles["code-block-custom-block"], {
                [styles["code-block-custom-diff-history-block"]]: ychange
            })}
            style={{color: ychange ? ychange.color?.dark : ""}}
            // ref={contentRef}
        >
            <div style={{height: 200, marginBottom: 20}} ref={codeRef}>
                <YakitEditor
                    type='yak'
                    readOnly={readonly}
                    value={node.textContent}
                    setValue={updateEditorContent}
                    editorDidMount={setEditor}
                />
            </div>
            <YChange {...ychange} />
        </div>
    )
}
