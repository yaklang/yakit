import { ipc } from '../../../../../../shared/communication/window-client'
import emiter from '../eventBus/eventBus'
import { Uint8ArrayToString } from '../str'
import type { API } from '@/services/swagger/resposeType'
import { JSONParseLog } from '../tool'
let webSocketListeners: Array<() => void> = []

const cleanupWebSocketListeners = () => {
  webSocketListeners.forEach((off) => off())
  webSocketListeners = []
}

/**@name webSocket是否开启 */
export let webSocketStatus = false

export const startWebSocket = () => {
  cleanupWebSocketListeners()

  const offMessage = ipc.on('client-socket-message', (data: Uint8Array) => {
    try {
      const obj = JSONParseLog(Uint8ArrayToString(data), { page: 'webSocket', fun: 'startWebSocket' })
      switch (obj.messageType) {
        case 'messageLog':
          emiter.emit('onRefreshMessageSocket', JSON.stringify(obj.params))
          break
      }
    } catch (error) {}
  })

  const offOpen = ipc.on('client-socket-open', () => {
    webSocketStatus = true
    // 连接成功时 通知需要消息中心信息
    sendWebSocket({
      messageType: 'messageLog',
      params: {},
    })
  })

  const offClose = ipc.on('client-socket-close', () => {
    webSocketStatus = false
  })

  const offError = ipc.on('client-socket-error', (error: any) => {
    // console.log("webSocket错误",error);
  })

  webSocketListeners = [offMessage, offOpen, offClose, offError]
}

export const closeWebSocket = () => {
  ipc.invoke('local', 'socket-close', {})
  cleanupWebSocketListeners()
}

export const sendWebSocket = (data: API.WsRequest) => {
  ipc.invoke('local', 'socket-send', data)
}
