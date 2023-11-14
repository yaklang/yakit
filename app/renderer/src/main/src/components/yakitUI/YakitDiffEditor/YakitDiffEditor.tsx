import React, {memo, useEffect, useRef} from "react"
import {YakitDiffEditorProps} from "./YakitDiffEditorType"
import * as monacoEditor from "monaco-editor/esm/vs/editor/editor.api"
import {yakitNotify} from "@/utils/notification"
import {useDebounceFn, useMemoizedFn, useUpdateEffect} from "ahooks"

import styles from "./YakitDiffEditor.module.scss"

/** @name monaco-editor对比器 */
export const YakitDiffEditor: React.FC<YakitDiffEditorProps> = memo((props) => {
    const {
        leftDefaultCode,
        setLeftCode,
        rightDefaultCode,
        setRightCode,
        triggerUpdate,
        language = "text/plain",
        noWrap,
        leftReadOnly = false,
        rightReadOnly = false,
        fontSize = 12
    } = props

    const diffDivRef = useRef<HTMLDivElement>(null)
    const monaco = monacoEditor.editor
    const diffEditorRef = useRef<monacoEditor.editor.IStandaloneDiffEditor>()
    const leftEditorRef = useRef<monacoEditor.editor.ITextModel>()
    const rightEditorRef = useRef<monacoEditor.editor.ITextModel>()

    // 左侧编辑器更新事件
    const {run: onLeftChange} = useDebounceFn(
        useMemoizedFn((e: monacoEditor.editor.IModelContentChangedEvent) => {
            if (leftEditorRef.current) {
                if (setLeftCode) setLeftCode(leftEditorRef.current.getValue())
            }
        }),
        {wait: 500}
    )
    // 右侧编辑器更新事件
    const {run: onRightChange} = useDebounceFn(
        useMemoizedFn((e: monacoEditor.editor.IModelContentChangedEvent) => {
            if (rightEditorRef.current) {
                if (setRightCode) setRightCode(rightEditorRef.current.getValue())
            }
        }),
        {wait: 500}
    )

    useEffect(() => {
        // 判断对比器实例存在则先进行销毁
        if (diffEditorRef.current) {
            diffEditorRef.current.dispose()
            diffEditorRef.current = undefined
        }
        // 判断左侧编辑器实例存在则先进行销毁
        if (leftEditorRef.current) {
            leftEditorRef.current.dispose()
            leftEditorRef.current = undefined
        }
        // 判断右侧编辑器实例存在则先进行销毁
        if (rightEditorRef.current) {
            rightEditorRef.current.dispose()
            rightEditorRef.current = undefined
        }

        // 获取不到对比器元素节点
        if (!diffDivRef || !diffDivRef.current) {
            yakitNotify("error", "对比器初始化失败，请关闭重试!")
            return
        }

        diffEditorRef.current = monaco.createDiffEditor(diffDivRef.current, {
            enableSplitViewResizing: false,
            originalEditable: !leftReadOnly,
            readOnly: rightReadOnly,
            automaticLayout: true,
            wordWrap: !!noWrap ? "off" : "on",
            fontSize: fontSize
        })

        leftEditorRef.current = monaco.createModel(leftDefaultCode, language)
        rightEditorRef.current = monaco.createModel(rightDefaultCode, language)
        diffEditorRef.current.setModel({
            original: leftEditorRef.current,
            modified: rightEditorRef.current
        })
        // 监听左侧编辑器内容的变化
        leftEditorRef.current.onDidChangeContent(onLeftChange)
        // 监听右侧编辑器内容的变化
        rightEditorRef.current.onDidChangeContent(onRightChange)

        return () => {
            if (diffEditorRef.current) diffEditorRef.current.dispose()
            if (leftEditorRef.current) leftEditorRef.current.dispose()
            if (rightEditorRef.current) rightEditorRef.current.dispose()
        }
    }, [])

    // 更新对比器配置信息
    useUpdateEffect(() => {
        if (diffEditorRef.current) {
            diffEditorRef.current.updateOptions({
                originalEditable: !leftReadOnly,
                readOnly: rightReadOnly,
                wordWrap: !!noWrap ? "off" : "on",
                fontSize: fontSize
            })
        }
    }, [noWrap, leftReadOnly, rightReadOnly, fontSize])

    // 强制更新默认值
    useUpdateEffect(() => {
        if (leftEditorRef.current) leftEditorRef.current.setValue(leftDefaultCode)
        if (rightEditorRef.current) rightEditorRef.current.setValue(rightDefaultCode)
    }, [triggerUpdate])

    return <div ref={diffDivRef} className={styles["yakit-diff-editor-wrapper"]}></div>
})
