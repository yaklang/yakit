import { useRef, useEffect } from "react"
import { useMemoizedFn } from "ahooks"
import { IMonacoEditor } from "@/utils/editors"
import { IDisposable } from "monaco-editor"

interface UseAutoScrollToBottomOptions {
    /** 是否启用自动滚动，默认 false */
    enabled?: boolean
    /** 内容变化时的依赖值 */
    content: string
    /** 重置滚动状态的依赖值（如切换到新数据时） */
    resetDep?: unknown
    /** 编辑器挂载后的额外回调 */
    onEditorMount?: (editor: IMonacoEditor) => void
}

interface UseAutoScrollToBottomReturn {
    /** 编辑器挂载回调，传给 onEditor */
    handleEditorMount: (editor: IMonacoEditor) => void
    /** 手动滚动到底部 */
    scrollToBottom: () => void
    /** 重置滚动状态（允许再次自动滚动） */
    resetScrollState: () => void
}

/**
 * 自动滚动到底部的 hook
 * - 内容变化时自动滚动到底部
 * - 用户手动向上滚动后，停止自动滚动
 * - resetDep 变化时，重置滚动状态
 */
export const useAutoScrollToBottom = (options: UseAutoScrollToBottomOptions): UseAutoScrollToBottomReturn => {
    const { enabled = false, content, resetDep, onEditorMount } = options

    // 编辑器引用
    const editorRef = useRef<IMonacoEditor>()
    // 用户是否手动滚动过
    const userHasScrolledRef = useRef<boolean>(false)
    // 滚动事件监听器的清理函数
    const scrollDisposableRef = useRef<IDisposable>()

    // 滚动到底部
    const scrollToBottom = useMemoizedFn(() => {
        const editor = editorRef.current
        if (!editor) return
        const model = editor.getModel()
        if (!model) return
        const lineCount = model.getLineCount()
        editor.revealLine(lineCount)
    })

    // 重置滚动状态
    const resetScrollState = useMemoizedFn(() => {
        userHasScrolledRef.current = false
    })

    // 监听编辑器滚动，判断用户是否手动滚动
    const setupScrollListener = useMemoizedFn((editor: IMonacoEditor) => {
        // 清理之前的监听器
        if (scrollDisposableRef.current) {
            scrollDisposableRef.current.dispose()
        }
        // 未启用时不监听
        if (!enabled) return
        
        scrollDisposableRef.current = editor.onDidScrollChange((e) => {
            // 只有当滚动是由用户触发时才标记
            if (e.scrollTopChanged) {
                const scrollTop = editor.getScrollTop()
                const scrollHeight = editor.getScrollHeight()
                const clientHeight = editor.getLayoutInfo().height
                // 如果不在底部，说明用户向上滚动了
                const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10
                if (!isAtBottom) {
                    userHasScrolledRef.current = true
                }
            }
        })
    })

    // 编辑器挂载回调
    const handleEditorMount = useMemoizedFn((editor: IMonacoEditor) => {
        editorRef.current = editor
        setupScrollListener(editor)
        onEditorMount?.(editor)
    })

    // content 变化时，如果用户没有手动滚动，则滚动到底部
    useEffect(() => {
        if (!enabled) return
        if (!editorRef.current || !content) return
        if (!userHasScrolledRef.current) {
            // 延迟执行，等待编辑器内容更新完成
            setTimeout(() => {
                scrollToBottom()
            }, 100)
        }
    }, [content, enabled])

    // resetDep 变化时，重置滚动状态
    useEffect(() => {
        if (!enabled) return
        resetScrollState()
    }, [resetDep, enabled])

    // enabled 变化时，重新设置/清理监听器
    useEffect(() => {
        const editor = editorRef.current
        if (!editor) return
        
        if (enabled) {
            setupScrollListener(editor)
        } else {
            // 禁用时清理监听器
            if (scrollDisposableRef.current) {
                scrollDisposableRef.current.dispose()
                scrollDisposableRef.current = undefined
            }
        }
    }, [enabled])

    // 组件卸载时清理监听器
    useEffect(() => {
        return () => {
            if (scrollDisposableRef.current) {
                scrollDisposableRef.current.dispose()
            }
        }
    }, [])

    return {
        handleEditorMount,
        scrollToBottom,
        resetScrollState
    }
}
