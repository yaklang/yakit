/**
 * 表格底部快速预览该显示哪段响应，以及要不要让流式正文重放。
 *
 * 流式响应（分块 / SSE）进库的通常只有响应头，正文是后来一段段追加进编辑器的。
 * 响应头是异步读回来的：预览会先空着，头一到，编辑器整段换成响应头，已经追加的正文就没了。
 * 页签藏起来再打开也是一次重新挂载。这两种情况都要把已经收到的正文再追加一遍。
 * 流结束后不再传 resetKey，避免正文被追加两次。
 */
export interface FuzzerPreviewChunk {
  Direction?: number
  IsFinal?: boolean
  /** 这一小段正文。流式过程中用不到，流结束后拼回预览。 */
  text?: string
}

export interface FuzzerPreviewMemory {
  uuid?: string
  /** 这一行流式期间见过的响应头。页签隐藏后库里的字节会被清掉，这里留着。 */
  header: string
}

/** 0 未标明、2 响应增量算响应；1 是请求分块，不参与响应预览。与 isResponseChunkedData 一致。 */
const isResponseChunk = (chunk?: FuzzerPreviewChunk) => {
  if (!chunk) return false
  const direction = chunk.Direction ?? 0
  return direction === 0 || direction === 2
}

export function fuzzerTablePreview(input: {
  uuid?: string
  chunks?: FuzzerPreviewChunk[]
  showingResponse: boolean
  /** 当前读到的响应原文。流式时一般是响应头，还没读到时是空字符串。 */
  responseText: string
  memory: FuzzerPreviewMemory
}): { memory: FuzzerPreviewMemory; responseText: string; resetKey?: string } {
  const memory = input.memory.uuid === input.uuid ? input.memory : { uuid: input.uuid, header: '' }
  const responseChunks = (input.chunks || []).filter(isResponseChunk)
  const last = responseChunks[responseChunks.length - 1]
  const streaming = responseChunks.length > 0 && !last?.IsFinal
  // 只记下第一次非空内容，当作响应头。后面的空读（页签隐藏）不能把它清掉。
  if (streaming && input.responseText && !memory.header) {
    memory.header = input.responseText
  }
  if (streaming && input.showingResponse) {
    return { memory, responseText: memory.header, resetKey: memory.header }
  }
  // 流结束后正文仍在 chunk 里，库里多半还是响应头。拼回去，页签重新打开才能看到全文。
  // 库里的内容如果已经不是当时的响应头，就直接用库里的，避免正文拼两次。
  if (input.showingResponse) {
    const body = responseChunks.map((chunk) => chunk.text || '').join('')
    const header = memory.header || input.responseText
    const storedIsHeader = !input.responseText || !memory.header || input.responseText === memory.header
    if (body && header && storedIsHeader) {
      return { memory, responseText: header + body, resetKey: undefined }
    }
  }
  return { memory, responseText: input.responseText, resetKey: undefined }
}
