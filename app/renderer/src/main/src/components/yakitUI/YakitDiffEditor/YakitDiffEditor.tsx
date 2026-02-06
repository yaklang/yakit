import React, {memo, useEffect, useMemo, useRef} from "react"
import {YakitDiffEditorProps} from "./YakitDiffEditorType"
import * as monacoEditor from "monaco-editor/esm/vs/editor/editor.api"
import {yakitNotify} from "@/utils/notification"
import {useDebounceFn, useMemoizedFn, useUpdateEffect} from "ahooks"
import {showByRightContext} from "@/components/yakitUI/YakitMenu/showByRightContext"
import {YakitMenuItemType} from "@/components/yakitUI/YakitMenu/YakitMenu"
import {useEditorFontSize, fontSizeOptions} from "@/store/editorFontSize"
import {useI18nNamespaces} from "@/i18n/useI18nNamespaces"
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
        rightReadOnly = false
    } = props

    const {t, i18n} = useI18nNamespaces(["yakitUi"])
    const {fontSize, initFontSize, setFontSize} = useEditorFontSize()

    useEffect(() => {
        initFontSize()
    }, [])

    const diffDivRef = useRef<HTMLDivElement>(null)
    const monaco = monacoEditor.editor
    const diffEditorRef = useRef<monacoEditor.editor.IStandaloneDiffEditor>()
    const leftEditorRef = useRef<monacoEditor.editor.ITextModel>()
    const rightEditorRef = useRef<monacoEditor.editor.ITextModel>()

    // 构建右键菜单数据
    const rightContextMenu = useMemo<YakitMenuItemType[]>(
        () => [
            {
                key: "font-size",
                label: t("YakitEditor.fontSize"),
                children: fontSizeOptions.map((size) => ({
                    key: `font-size-${size}`,
                    label: `${size}${fontSize === size ? "\u00A0\u00A0\u00A0✓" : ""}`
                }))
            },
            {key: "copy", label: "Copy"},
            {type: "divider"},
            {key: "command-palette", label: "Command Palette", keyDesc: "F1"}
        ],
        [fontSize, i18n.language]
    )

    // 右键菜单点击处理
    const handleContextMenuClick = useMemoizedFn((key: string, editor: monacoEditor.editor.IStandaloneCodeEditor) => {
        if (key.startsWith("font-size-")) {
            const size = parseInt(key.replace("font-size-", ""))
            if (!isNaN(size) && fontSizeOptions.includes(size)) {
                setFontSize(size)
            }
            return
        }
        switch (key) {
            case "copy":
                editor.focus()
                document.execCommand("copy")
                break
            case "command-palette":
                editor.focus()
                editor.trigger("keyboard", "editor.action.quickCommand", null)
                break
        }
    })

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
            fontSize: fontSize,
            // 禁用默认右键菜单
            contextmenu: false
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

    // 注册自定义右键菜单
    useEffect(() => {
        if (!diffEditorRef.current) return

        const originalEditor = diffEditorRef.current.getOriginalEditor()
        const modifiedEditor = diffEditorRef.current.getModifiedEditor()

        const disposables: monacoEditor.IDisposable[] = []

        // 为每个编辑器绑定右键事件
        ;[originalEditor, modifiedEditor].forEach((editor: monacoEditor.editor.IStandaloneCodeEditor) => {
            const disposable = editor.onContextMenu((e) => {
                e.event.preventDefault()
                e.event.stopPropagation()

                showByRightContext(
                    {
                        data: rightContextMenu,
                        onClick: ({key}) => {
                            handleContextMenuClick(key, editor)
                        }
                    },
                    e.event.posx,
                    e.event.posy,
                    true
                )
            })
            disposables.push(disposable)
        })

        return () => {
            disposables.forEach((d) => d.dispose())
        }
    }, [rightContextMenu])

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
