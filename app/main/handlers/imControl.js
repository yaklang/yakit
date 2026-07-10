const { ipcMain } = require('electron')
const handlerHelper = require('./handleStreamWithContext')

/**
 * IM 远程控制：启动/停止/订阅 IM Engine 运行态。
 * 对应 yakgrpc proto 的 StartIMControl / StopIMControl / SubscribeIMControlState。
 *
 * 启动后，已配置且启用的 IM bot（飞书/钉钉）开始监听入站消息，
 * 用户在 IM 端通过斜杠命令控制会话，或发送普通消息交给 AI agent 执行。
 */
module.exports = (win, getClient, getEngineAddr) => {
  const stateStreams = new Map()

  // 启动 IM 远程控制
  ipcMain.handle('StartIMControl', async (e, params) => {
    return await new Promise((resolve, reject) => {
      const request = {
        ...(params || {}),
        EngineAddr: params?.EngineAddr || getEngineAddr?.() || '',
      }
      getClient().StartIMControl(request, (err, data) => {
        if (err) {
          reject(err)
          return
        }
        resolve(data)
      })
    })
  })

  // 停止 IM 远程控制
  ipcMain.handle('StopIMControl', async (e, params) => {
    return await new Promise((resolve, reject) => {
      getClient().StopIMControl(params || {}, (err, data) => {
        if (err) {
          reject(err)
          return
        }
        resolve(data)
      })
    })
  })

  // 订阅 IM 远程控制状态。后端会先推完整快照，之后状态变化继续推完整快照。
  ipcMain.handle('subscribe-im-control-state', async (e, token, params) => {
    if (stateStreams.has(token)) {
      return
    }
    const stream = getClient().SubscribeIMControlState(params || {})
    handlerHelper.registerHandler(win, stream, stateStreams, token)
  })

  ipcMain.handle('cancel-im-control-state', handlerHelper.cancelHandler(stateStreams))

  // 热更新 IM 回复配置（转发回复开关 / 回复颗粒度），无需重启 IM Engine
  ipcMain.handle('UpdateIMControlConfig', async (e, params) => {
    return await new Promise((resolve, reject) => {
      getClient().UpdateIMControlConfig(params || {}, (err, data) => {
        if (err) {
          reject(err)
          return
        }
        resolve(data)
      })
    })
  })
}
