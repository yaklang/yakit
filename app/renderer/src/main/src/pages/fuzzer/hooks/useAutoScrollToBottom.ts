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
  const resetKeyRef = useRef(resetKey)
  resetKeyRef.current = resetKey

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
    if (resetKey !== undefined && seenChunkRef.current.size && responseChunks.length) {
      seenChunkRef.current = new Set()
      addStreamIndexRef.current = responseChunks.length
      addStreamContentRef.current = takeNewChunks(responseChunks)
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
  // 已经入队的 chunk。数组被截成尾段后长度不再变，只能靠 Index 认出新段。
  const seenChunkRef = useRef<Set<string>>(new Set())
  // Monaco流式加载内容
  const addStreamContentRef = useRef<RandomChunkedResponse[]>([])
  const chunkKey = (chunk: RandomChunkedResponse) => `${Number(chunk.Index)}-${chunk.Direction ?? 0}`
  const takeNewChunks = useMemoizedFn((chunks: RandomChunkedResponse[]) => {
    const fresh: RandomChunkedResponse[] = []
    chunks.forEach((chunk) => {
      const key = chunkKey(chunk)
      if (seenChunkRef.current.has(key)) return
      seenChunkRef.current.add(key)
      fresh.push(chunk)
    })
    return fresh
  })
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

  // chunkedData 变化时，只追加还没写过的段。基座已经是全文时不再入队。
  useThrottleEffect(
    () => {
      if (!editorRef.current || responseChunks.length === 0) return
      if (streamFinished && resetKey === undefined) {
        dropFinishedQueue()
        return
      }
      const fresh = takeNewChunks(responseChunks)
      if (!fresh.length) return
      addStreamIndexRef.current = responseChunks.length
      addStreamContentRef.current = [...addStreamContentRef.current, ...fresh]
    },
    [responseChunks],
    {
      wait: 500,
    },
  )

  useEffect(() => {
    timeRef.current = setInterval(() => {
      // 基座已换成全文时，丢掉队列，避免再贴一遍。基座仍是响应头时，把新尾段写完。
      if (streamFinishedRef.current && resetKeyRef.current === undefined) {
        addStreamContentRef.current = []
        return
      }
      if (addStreamContentRef.current.length) appendText()
    }, 500)
    return () => {
      if (streamFinishedRef.current && resetKeyRef.current === undefined) {
        addStreamContentRef.current = []
      } else if (addStreamContentRef.current.length) {
        appendText()
      }
      if (timeRef.current) {
        clearInterval(timeRef.current)
      }
    }
  }, [isStreamLoad])

  // id 变化时，重新加载增量数据。已完成的响应不再整段追加。
  useUpdateEffect(() => {
    seenChunkRef.current = new Set()
    if (streamFinished && resetKey === undefined) {
      dropFinishedQueue()
      return
    }
    addStreamIndexRef.current = responseChunks.length
    addStreamContentRef.current = takeNewChunks(responseChunks)
    // 延迟执行，等待编辑器内容更新完成
    setTimeout(() => {
      scrollToBottom()
    }, 100)
  }, [id])

  // 基座被换掉（例如响应头刚读回来）时，编辑器里已追加的正文没了，从头重放。
  useUpdateEffect(() => {
    if (resetKey === undefined) return
    seenChunkRef.current = new Set()
    addStreamIndexRef.current = responseChunks.length
    addStreamContentRef.current = takeNewChunks(responseChunks)
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
