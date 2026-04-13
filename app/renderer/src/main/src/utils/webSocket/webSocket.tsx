import emiter from '../eventBus/eventBus'
import { failed } from '@/utils/notification'
import { Uint8ArrayToString } from '../str'
import { API } from '@/services/swagger/resposeType'
import { JSONParseLog } from '../tool'
import { yakitSocket } from '@/services/electronBridge'

let webSocketListeners: Array<() => void> = []

const cleanupWebSocketListeners = () => {
  webSocketListeners.forEach((off) => off())
  webSocketListeners = []
}

/**@name webSocket是否开启 */
export let webSocketStatus = false

export const startWebSocket = () => {
  cleanupWebSocketListeners()

  const offMessage = yakitSocket.onMessage((data: Uint8Array) => {
    try {
      const obj = JSONParseLog(Uint8ArrayToString(data), { page: 'webSocket', fun: 'startWebSocket' })
      switch (obj.messageType) {
        case 'messageLog':
          emiter.emit('onRefreshMessageSocket', JSON.stringify(obj.params))
          break
      }
    } catch (error) {}
  })

  const offOpen = yakitSocket.onOpen(() => {
    webSocketStatus = true
    // 连接成功时 通知需要消息中心信息
    sendWebSocket({
      messageType: 'messageLog',
      params: {},
    })
  })

  const offClose = yakitSocket.onClose(() => {
    webSocketStatus = false
  })

  const offError = yakitSocket.onError((error: any) => {
    // console.log("webSocket错误",error);
  })

  webSocketListeners = [offMessage, offOpen, offClose, offError]
}

export const closeWebSocket = () => {
  yakitSocket.close()
  cleanupWebSocketListeners()
}

export const sendWebSocket = (data: API.WsRequest) => {
  yakitSocket.send(data)
}
