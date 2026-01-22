import { useRef, useEffect } from "react"
import { useMemoizedFn, useThrottleEffect } from "ahooks"
import { IMonacoEditor } from "@/utils/editors"
import { IDisposable } from "monaco-editor"
import {monaco} from "react-monaco-editor"
import { RandomChunkedResponse } from "../HTTPFuzzerPage"
import { Uint8ArrayToString } from "@/utils/str"

interface UseAutoScrollToBottomOptions {
    /** 是否还在加载中，默认 false */
    loading?: boolean
    /** 需要流式加载的内容 */
    chunkedData: RandomChunkedResponse[]
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
    /** 获取完整的流式加载内容（看后期是否扩展） */
    // getfullChunkContent: () => string
}

/**
 * 自动滚动到底部的 hook
 * - 内容变化时自动滚动到底部
 * - 用户手动向上滚动后，停止自动滚动
 * - resetDep 变化时，重置滚动状态
 */
export const useAutoScrollToBottom = (options: UseAutoScrollToBottomOptions): UseAutoScrollToBottomReturn => {
    const { loading = false, chunkedData, resetDep, onEditorMount } = options
    // 编辑器引用
    const editorRef = useRef<IMonacoEditor>()
    // 用户是否手动滚动过
    const userHasScrolledRef = useRef<boolean>(false)
    // 滚动事件监听器的清理函数
    const scrollDisposableRef = useRef<IDisposable>()
    // 完整Chunk编辑器数据
    const fullChunkContentRef = useRef<string>("")

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
        if (!loading) return
        
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

    // resetDep 变化时，重置滚动状态
    useEffect(() => {
        if (!loading) return
        resetScrollState()
    }, [resetDep, loading])

    // loading 变化时，重新设置/清理监听器
    useEffect(() => {
        const editor = editorRef.current
        if (!editor) return
        if (loading) {
            setupScrollListener(editor)
            // 重置完整内容
            fullChunkContentRef.current = ""
        } else {
            // 禁用时清理监听器
            if (scrollDisposableRef.current) {
                scrollDisposableRef.current.dispose()
                scrollDisposableRef.current = undefined
            }
        }
    }, [loading])

    // 组件卸载时清理监听器
    useEffect(() => {
        return () => {
            if (scrollDisposableRef.current) {
                scrollDisposableRef.current.dispose()
            }
        }
    }, [])

    // 记录上次追加内容的结束位置
    const addStreamIndexRef = useRef<number>()
    // Monaco流式加载内容
    const addStreamContentRef = useRef<RandomChunkedResponse[]>([])
    const timeRef = useRef<NodeJS.Timeout>()
    const appendText = useMemoizedFn(() => {
        const editor = editorRef.current
        if (!editor) return
        const model = editor?.getModel()
        if (!model) return
        if (addStreamContentRef.current.length === 0) return
        let text = ""
        addStreamContentRef.current.forEach((chunk) => {
            text += Uint8ArrayToString(chunk.Data)
        })
        const lastLine = model.getLineCount()
        const lastColumn = model.getLineMaxColumn(lastLine)
        model.applyEdits([
            {
                range: new monaco.Range(lastLine, lastColumn, lastLine, lastColumn),
                text
            }
        ])
        // 记录流式加载的总内容
        fullChunkContentRef.current += text
        // 清空待追加内容
        addStreamContentRef.current = []
        if (!userHasScrolledRef.current) {
            // 延迟执行，等待编辑器内容更新完成
            setTimeout(() => {
                scrollToBottom()
            }, 100)
        }
    })

    // chunkedData 变化时，追加内容
    useThrottleEffect(() => {
        if (!loading) return
        if (!editorRef.current || chunkedData.length === 0) return
        // 初次加载时，记录位置并加载内容
        if(!addStreamIndexRef.current){
            addStreamIndexRef.current = chunkedData.length
            addStreamContentRef.current = chunkedData
        }
        // 后续加载时，追加内容
        else{
            if(chunkedData.length <= addStreamIndexRef.current) return
            addStreamContentRef.current =[...addStreamContentRef.current,...chunkedData.slice(addStreamIndexRef.current)]
            addStreamIndexRef.current = chunkedData.length
        }
    },[chunkedData,loading],{
      wait: 500,
    })

    useEffect(()=>{
        timeRef.current = setInterval(()=>{
            if(addStreamContentRef.current){
                appendText()
            }
        },500)
        return ()=>{
            // 组件卸载时，如有剩余内容则追加
            if(addStreamContentRef.current){
                appendText()
            }
            if(timeRef.current){
                clearInterval(timeRef.current)
            }
            addStreamIndexRef.current = undefined
        }
    },[loading])

    return {
        handleEditorMount,
        scrollToBottom,
        resetScrollState,
        // getfullChunkContent: () => fullChunkContentRef.current
    }
}
