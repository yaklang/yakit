import { useRef, useEffect, useMemo } from "react"
import { useMemoizedFn, useThrottleEffect, useUpdateEffect } from "ahooks"
import { IMonacoEditor } from "@/utils/editors"
import { IDisposable } from "monaco-editor"
import {monaco} from "react-monaco-editor"
import { RandomChunkedResponse } from "../HTTPFuzzerPage"
import { Uint8ArrayToString } from "@/utils/str"

interface UseAutoScrollToBottomOptions {
    /** 需要流式加载的内容 */
    chunkedData: RandomChunkedResponse[]
    /** 可选的唯一标识符，用于重置滚动状态 */
    id?: string
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
 */
export const useAutoScrollToBottom = (options: UseAutoScrollToBottomOptions): UseAutoScrollToBottomReturn => {
    const { chunkedData, id, onEditorMount } = options
    // 编辑器引用
    const editorRef = useRef<IMonacoEditor>()
    // 用户是否手动滚动过
    const userHasScrolledRef = useRef<boolean>(false)
    // 滚动事件监听器的清理函数
    const scrollDisposableRef = useRef<IDisposable>()

    // 流是否加载中
    const isStreamLoad = useMemo(()=>{
        if(chunkedData.length ===0) return true
        const lastChunk = chunkedData[chunkedData.length -1]
        return !lastChunk.IsFinal
    },[chunkedData])

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
            scrollDisposableRef.current = undefined
        }
        // 未启用时不监听
        if (!isStreamLoad) return
        
        scrollDisposableRef.current = editor.onDidScrollChange((e) => {
            // 只有当滚动是由用户触发时才标记
            if (e.scrollTopChanged) {
                const scrollTop = editor.getScrollTop()
                const scrollHeight = editor.getScrollHeight()
                const clientHeight = editor.getLayoutInfo().height
                // 如果不在底部，说明用户向上滚动了
                const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10
                if (!isAtBottom) {
                    console.log("用户手动滚动，停止自动滚动");
                    
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

    // id 变化时，重置滚动状态
    useEffect(() => {
        if (!isStreamLoad) return
        resetScrollState()
    }, [id, isStreamLoad])

    // isStreamLoad 变化时，重新设置/清理监听器
    useEffect(() => {
        const editor = editorRef.current
        if (!editor) return
        if (isStreamLoad) {
            setupScrollListener(editor)
        } else {
            // 禁用时清理监听器
            if (scrollDisposableRef.current) {
                scrollDisposableRef.current.dispose()
                scrollDisposableRef.current = undefined
            }
        }
    }, [isStreamLoad])

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
    },[chunkedData],{
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
    },[isStreamLoad])

    // id 变化时，重新加载增量数据
    useUpdateEffect(()=>{
        addStreamIndexRef.current = chunkedData.length
        addStreamContentRef.current = chunkedData
        // 延迟执行，等待编辑器内容更新完成
        setTimeout(() => {
            scrollToBottom()
        }, 100)
    },[id])

    return {
        handleEditorMount,
        scrollToBottom,
        resetScrollState,
    }
}
