import { AIAgentGrpcApi, AIOutputEvent } from './grpcApi'
import { formatTimestamp } from '@/utils/timeUtil'

export class AIAgentLogEmitter {
  // 临时缓冲区：存储还没接收完的 stream 字符串
  // 键名设计：由于要区分 session，使用 `${sessionId}_${eventUUID}` 作为唯一 Key
  private streamBuffer = new Map<string, string>()

  /** 发送日志数据到日志窗口的逻辑 */
  private emitToOtherWindow(
    sessionId: string,
    Timestamp: AIOutputEvent['Timestamp'],
    level: string,
    message: string,
    isStream?: boolean,
  ) {
    const { ipcRenderer } = window.require('electron')
    ipcRenderer.send('forward-ai-chat-log-data', {
      sessionId,
      level: level,
      message: message,
      timestamp: formatTimestamp(Timestamp),
      isStream: isStream,
    })
  }

  /** 🪐 核心分发入口：接收数据处理层传来的数据，决定是暂存还是直接发送 */
  public dispatch(params: {
    session: string
    type: 'log' | 'stream'
    Timestamp: AIOutputEvent['Timestamp']
    /** log类型专属，stream类型该字段值为空 */
    log?: AIAgentGrpcApi.Log
    /** stream类型专属，log类型该字段值为空 */
    stream?: {
      NodeId: AIOutputEvent['NodeId']
      EventUUID: AIOutputEvent['EventUUID']
      content: string
      status: 'start' | 'end'
    }
  }) {
    const { session, type, Timestamp, log, stream } = params

    if (type === 'log') {
      if (!log) return
      this.emitToOtherWindow(session, Timestamp, log.level, log.message)
    }

    if (type === 'stream') {
      if (!stream) return

      const { NodeId, EventUUID, content, status } = stream
      const mapKey = `${session}_${EventUUID}`
      const currentText = this.streamBuffer.get(mapKey) || ''
      const newChunk = currentText + content
      if (status === 'end') {
        // 拼接完成，直接发送
        this.emitToOtherWindow(session, Timestamp, NodeId, newChunk, true)
        this.streamBuffer.delete(mapKey)
      } else {
        // 追加到临时缓冲区
        this.streamBuffer.set(mapKey, newChunk)
      }
    }
  }

  /** 🛑 当会话被关闭时，清理可能因为异常断开而残留的 Buffer 内存 */
  public clearSessionBuffer(sessionId: string) {
    for (const key of this.streamBuffer.keys()) {
      if (key.startsWith(`${sessionId}_`)) {
        this.streamBuffer.delete(key)
      }
    }
  }

  /** 清空日志窗口里的所有内容 */
  public clearLogsWindow(sessionId: string) {
    const { ipcRenderer } = window.require('electron')
    ipcRenderer.invoke('clear-ai-chat-log-data')
  }
  /** 关闭日志窗口 */
  public closeLogsWindow(sessionId: string) {
    this.clearSessionBuffer(sessionId)
    const { ipcRenderer } = window.require('electron')
    ipcRenderer.send('close-ai-chat-window')
  }
}

// 导出单例
export const aiAgentLogEmitter = new AIAgentLogEmitter()
