/** 辅助窗口 IPC 通道（与 AuxWindowManager 对应） */
const CHANNEL_INIT = 'aux-window:init-data'
const CHANNEL_PUSH = 'aux-window:push-data'
const CHANNEL_OPENED = 'aux-window:opened'
const CHANNEL_CLOSED = 'aux-window:closed'
/** 全局设置广播：主题 / 语言等 */
const CHANNEL_APP_SYNC = 'aux-window:app-sync'

module.exports = {
  CHANNEL_INIT,
  CHANNEL_PUSH,
  CHANNEL_OPENED,
  CHANNEL_CLOSED,
  CHANNEL_APP_SYNC,
}
