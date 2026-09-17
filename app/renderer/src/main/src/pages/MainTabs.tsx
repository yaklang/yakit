import { ipc } from '../../../../../shared/communication/window-client'
// 通过IPC通信-远程打开一个页面
export const addToTab = (type: string, data?: any) => {
  ipc.invoke('local', 'ForwardMainEvent', { event: 'fetch-send-to-tab', data: { type, data } })
}
