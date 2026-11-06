import { useRef, useEffect, useMemo } from 'react'
import { useMemoizedFn, useThrottleEffect, useUpdateEffect } from 'ahooks'
import type { IMonacoEditor } from '@/utils/editors'
import type { IDisposable } from 'monaco-editor'
import { monaco } from 'react-monaco-editor'
import type { RandomChunkedResponse } from '../HTTPFuzzerPage'
import { isResponseChunkedData } from '../HTTPFuzzerPage'
import { Uint8ArrayToString } from '@/utils/str'

interface UseChunkAutoScrollToBottomOptions {
  /** 需要流式加载的内容 */
  chunkedData: RandomChunkedResponse[]
  /** 可选的唯一标识符，用于重置滚动状态 */
  id?: string
  /** 编辑器挂载后的额外回调 */
  onEditorMount?: (editor: IMonacoEditor) => void
  /**
   * 编辑器基座文本。变化说明已追加的正文被覆盖，需要把收到的 chunk 重放一遍。
   * 流式结束时传 undefined，避免把 chunk 再追加到已经拼好的全文上。
   */
  resetKey?: string
}

interface UseChunkAutoScrollToBottomReturn {
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
 * - 流式加载
 * - 内容变化时自动滚动到底部
 * - 用户手动向上滚动后，停止自动滚动
 */
export const useChunkAutoScrollToBottom = (
  options: UseChunkAutoScrollToBottomOptions,
): UseChunkAutoScrollToBottomReturn => {
  const { chunkedData, id, onEditorMount, resetKey } = options
  // 仅保留响应方向的 chunk（SSE 等响应增量）。请求分块（Direction=REQUEST，
  // 随机分块传输发送的请求 body）不应被追加到响应编辑器，否则会出现
  // 「开启分块传输后响应回显请求 body」的 bug。缺省 Direction 按响应处理（兼容旧后端）。
  const responseChunks = useMemo(() => (chunkedData || []).filter(isResponseChunkedData), [chunkedData])
  // 编辑器引用
  const editorRef = useRef<IMonacoEditor>()
  // 用户是否手动滚动过
  const userHasScrolledRef = useRef<boolean>(false)
  // 滚动事件监听器的清理函数
  const scrollDisposableRef = useRef<IDisposable>()

  // 流是否加载中
  const isStreamLoad = useMemo(() => {
    if (responseChunks.length === 0) return true
    const lastChunk = responseChunks[responseChunks.length - 1]
    return !lastChunk.IsFinal
  }, [responseChunks])
  // 最后一块已到：编辑器基座就是完整正文，不能再把 chunk 追加上去
  const streamFinished = responseChunks.length > 0 && !isStreamLoad
  const streamFinishedRef = useRef(streamFinished)
  streamFinishedRef.current = streamFinished

  const dropFinishedQueue = useMemoizedFn(() => {
    addStreamIndexRef.current = responseChunks.length
    addStreamContentRef.current = []
  })

  // 滚动到底部
  const scrollToBottom = useMemoizedFn(() => {
    const editor = editorRef.current
    if (!editor) return
    const model = editor.getModel()
    if (!model) return
    if (responseChunks.length === 0) return
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
    // 页签切走再回来，编辑器按响应头重建，已追加的正文没了。流式期间重新挂上时，把 chunk 再追加一遍。
    if (resetKey !== undefined && addStreamIndexRef.current && responseChunks.length) {
      addStreamIndexRef.current = responseChunks.length
      addStreamContentRef.current = responseChunks.slice()
    }
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
    let text = ''
    addStreamContentRef.current.forEach((chunk) => {
      text += Uint8ArrayToString(chunk.Data)
    })
    const lastLine = model.getLineCount()
    const lastColumn = model.getLineMaxColumn(lastLine)
    model.applyEdits([
      {
        range: new monaco.Range(lastLine, lastColumn, lastLine, lastColumn),
        text,
      },
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

  // chunkedData 变化时，追加内容。流已经结束就只记住位置，不再入队。
  useThrottleEffect(
    () => {
      if (!editorRef.current || responseChunks.length === 0) return
      if (streamFinished) {
        dropFinishedQueue()
        return
      }
      // 初次加载时，记录位置并加载内容
      if (!addStreamIndexRef.current) {
        addStreamIndexRef.current = responseChunks.length
        addStreamContentRef.current = responseChunks
      }
      // 后续加载时，追加内容
      else {
        if (responseChunks.length <= addStreamIndexRef.current) return
        addStreamContentRef.current = [
          ...addStreamContentRef.current,
          ...responseChunks.slice(addStreamIndexRef.current),
        ]
        addStreamIndexRef.current = responseChunks.length
      }
    },
    [responseChunks],
    {
      wait: 500,
    },
  )

  useEffect(() => {
    timeRef.current = setInterval(() => {
      // 完成态的正文已经在编辑器基座里，丢掉还没写出的 chunk
      if (streamFinishedRef.current) {
        addStreamContentRef.current = []
        return
      }
      if (addStreamContentRef.current) {
        appendText()
      }
    }, 500)
    return () => {
      // 流结束或换到一条已完成的响应时，基座已是全文，不再追加。
      // 仍在流式时才把剩余内容写完。下标不能在这里清掉，否则同一批 chunk 会被当成第一次加载。
      if (streamFinishedRef.current) {
        addStreamContentRef.current = []
      } else if (addStreamContentRef.current) {
        appendText()
      }
      if (timeRef.current) {
        clearInterval(timeRef.current)
      }
    }
  }, [isStreamLoad])

  // id 变化时，重新加载增量数据。已完成的响应不再整段追加。
  useUpdateEffect(() => {
    if (streamFinished) {
      dropFinishedQueue()
      return
    }
    addStreamIndexRef.current = responseChunks.length
    addStreamContentRef.current = responseChunks
    // 延迟执行，等待编辑器内容更新完成
    setTimeout(() => {
      scrollToBottom()
    }, 100)
  }, [id])

  // 基座被换掉（例如响应头刚读回来）时，编辑器里已追加的正文没了，从头重放。
  useUpdateEffect(() => {
    if (resetKey === undefined) return
    addStreamIndexRef.current = responseChunks.length
    addStreamContentRef.current = responseChunks.slice()
    setTimeout(() => {
      scrollToBottom()
    }, 100)
  }, [resetKey])

  return {
    handleEditorMount,
    scrollToBottom,
    resetScrollState,
  }
}
