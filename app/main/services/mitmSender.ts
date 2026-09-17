import type { GrpcClient } from '../ipc/grpc'
import type { MITMV2Request } from '../../shared/generated/grpc/types'
import { engineLogOutputFile, getFormattedDateTime } from '../logFile'
import { payloadBytes } from '../ipc/streams'
type MITMStream = ReturnType<GrpcClient['MITMV2']>
type Entry = {
  id: number
  message: MITMV2Request
  settled?: boolean
  resolve?: () => void
  reject?: (error: unknown) => void
}
// 创建消息发送器的工厂函数
export const createMessageSender = (
  stream: MITMStream | null,
  options?: { maxRetries?: number; writeTimeoutMs?: number; maxPendingWrites?: number; maxPendingBytes?: number },
) => {
  const {
    maxRetries = 3,
    writeTimeoutMs = 30000,
    maxPendingWrites = 128,
    maxPendingBytes = 16 * 1024 * 1024,
  } = options || {}
  // 内部变量
  let count = 0
  let releaseWrite: (() => void) | undefined
  let isProcessing = false
  let destroyed = false
  let inflightEntry: Entry | null = null
  let messageStreamRequest: Entry[] = [] // 消息数据
  // 添加重试计数器
  let retryMap = new Map<number, number>()
  const settleEntry = (entry: Entry | null | undefined, error?: unknown) => {
    if (!entry || entry.settled) return
    entry.settled = true
    if (error) {
      if (entry.reject) entry.reject(error)
      return
    }
    if (entry.resolve) entry.resolve()
  }
  // 失败重试
  const onErrorRetry = ({ entry, error }: { entry: Entry; error: unknown }) => {
    const { id, message } = entry
    if (destroyed) {
      settleEntry(entry, error || new Error('MITM stream closed'))
      return
    }
    const retries = retryMap.get(id) || 0
    if (retries < maxRetries) {
      retryMap.set(id, retries + 1)
      messageStreamRequest.unshift(entry)
      return
    } else {
      engineLogOutputFile(
        JSON.stringify({
          grpcIInterface: 'MITMV2',
          time: getFormattedDateTime(),
          message,
          error,
        }),
      )
      settleEntry(entry, error)
    }
  }
  // 处理请求发送
  const processQueue = async () => {
    if (destroyed || isProcessing || !stream || !messageStreamRequest.length) return

    isProcessing = true
    const entry = messageStreamRequest.shift()
    if (!entry) return
    inflightEntry = entry
    const { id, message } = entry
    try {
      // 尝试写入流
      let writeError: Error | null | undefined
      let timedOut = false
      let timeoutId: ReturnType<typeof setTimeout> | undefined
      try {
        const writeDone = new Promise<void>((resolveWrite) => {
          releaseWrite = resolveWrite
          stream?.write(message, (error?: Error | null) => {
            writeError = error
            resolveWrite()
          })
        })
        // 按 writable callback 串行发送；callback 只会在该 chunk 已被消费后触发，
        // 因此不会把整个替换文件堆进消息队列。
        await Promise.race([
          writeDone,
          new Promise<void>((resolveTimeout) => {
            timeoutId = setTimeout(() => {
              timedOut = true
              resolveTimeout()
            }, writeTimeoutMs)
          }),
        ])
      } finally {
        if (timeoutId) clearTimeout(timeoutId)
        releaseWrite = undefined
      }
      if (timedOut) {
        retryMap.delete(id)
        const timeoutError = new Error('MITM stream write timeout')
        engineLogOutputFile(
          JSON.stringify({
            grpcIInterface: 'MITMV2',
            time: getFormattedDateTime(),
            message,
            error: timeoutError,
          }),
        )
        settleEntry(entry, timeoutError)
      } else if (writeError) {
        onErrorRetry({ entry, error: writeError })
      } else {
        retryMap.delete(id)
        settleEntry(entry)
      }
    } catch (err) {
      onErrorRetry({ entry, error: err })
    } finally {
      inflightEntry = null
      await new Promise((resolve) => setTimeout(resolve, 20)) // 必须加上，不然后端接口会卡死
      isProcessing = false
      if (!destroyed) processQueue() // 继续处理下一条
    }
  }
  const checkCapacity = (data: MITMV2Request) => {
    const pending = inflightEntry ? [inflightEntry, ...messageStreamRequest] : messageStreamRequest
    if (
      pending.length >= maxPendingWrites ||
      pending.reduce((size, item) => size + payloadBytes(item.message), payloadBytes(data)) > maxPendingBytes
    )
      throw Object.assign(new Error('MITM write queue capacity exceeded'), { code: 'RESOURCE_EXHAUSTED' })
  }
  // 对外暴露的接口
  return {
    send: (data: MITMV2Request) => {
      if (destroyed) throw new Error('MITM stream closed')
      checkCapacity(data)
      count += 1
      messageStreamRequest.push({
        id: count,
        message: data,
      })
      processQueue() // 触发处理
    },
    sendAndWait: (data: MITMV2Request) => {
      return new Promise<void>((resolve, reject) => {
        if (destroyed) {
          reject(new Error('MITM stream closed'))
          return
        }
        checkCapacity(data)
        count += 1
        messageStreamRequest.push({
          id: count,
          message: data,
          resolve,
          reject,
        })
        processQueue()
      })
    },
    destroy: () => {
      if (destroyed) return
      destroyed = true
      releaseWrite?.()
      const closedError = new Error('MITM stream closed')
      settleEntry(inflightEntry, closedError)
      inflightEntry = null
      for (const pending of messageStreamRequest) {
        settleEntry(pending, closedError)
      }
      messageStreamRequest = []
      retryMap.clear()
      if (stream) stream.cancel()
      stream = null
    },
  }
}
