const { ipcMain } = require('electron')

/**
 * IM 远程控制：启动/停止/查询 IM Engine。
 * 对应 yakgrpc proto 的 StartIMControl / StopIMControl / GetIMControlStatus。
 *
 * 启动后，已配置且启用的 IM bot（飞书/钉钉）开始监听入站消息，
 * 用户在 IM 端通过斜杠命令控制会话，或发送普通消息交给 AI agent 执行。
 */
module.exports = (win, getClient) => {
  // 启动 IM 远程控制
  ipcMain.handle('StartIMControl', async (e, params) => {
    return await new Promise((resolve, reject) => {
      getClient().StartIMControl(params || {}, (err, data) => {
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

  // 查询 IM 远程控制状态
  ipcMain.handle('GetIMControlStatus', async (e, params) => {
    return await new Promise((resolve, reject) => {
      getClient().GetIMControlStatus(params || {}, (err, data) => {
        if (err) {
          reject(err)
          return
        }
        resolve(data)
      })
    })
  })

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
