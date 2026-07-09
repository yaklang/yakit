const { ipcMain } = require('electron')
const handlerHelper = require('./handleStreamWithContext')

/**
 * IM Bot 远程通知：飞书/钉钉 bot 凭证的保存/列出/删除/连接自检。
 * 对应 yakgrpc proto 的 SaveIMBot / ListIMBots / DeleteIMBot / TestIMBot。
 *
 * 前端通过 ipcRenderer.invoke('RpcName', params) 调用，主进程桥接到 gRPC。
 */
module.exports = (win, getClient) => {
  // 飞书扫码注册进行中的流集合，按 token 索引，避免重复启动 / 用于取消
  const onboardingStreams = new Map()

  // 保存（按平台 upsert）一条 IM bot 凭证
  ipcMain.handle('SaveIMBot', async (e, params) => {
    return await new Promise((resolve, reject) => {
      getClient().SaveIMBot(params || {}, (err, data) => {
        if (err) {
          reject(err)
          return
        }
        resolve(data)
      })
    })
  })

  // 列出所有已配置的 IM bot
  ipcMain.handle('ListIMBots', async (e, params) => {
    return await new Promise((resolve, reject) => {
      getClient().ListIMBots(params || {}, (err, data) => {
        if (err) {
          reject(err)
          return
        }
        resolve(data)
      })
    })
  })

  // 按平台删除一条 IM bot 配置
  ipcMain.handle('DeleteIMBot', async (e, params) => {
    return await new Promise((resolve, reject) => {
      getClient().DeleteIMBot(params || {}, (err, data) => {
        if (err) {
          reject(err)
          return
        }
        resolve(data)
      })
    })
  })

  // 连接自检：验证凭证可用（不发业务消息；若提供 targetId 则发一条测试消息）
  ipcMain.handle('TestIMBot', async (e, params) => {
    return await new Promise((resolve, reject) => {
      getClient().TestIMBot(params || {}, (err, data) => {
        if (err) {
          reject(err)
          return
        }
        resolve(data)
      })
    })
  })

  // IM 扫码注册（server-streaming）：平台无关单入口，靠 params.Platform 路由到对应平台。
  // 前端先 invoke('start-im-onboarding', token, params) 启动（params 含 Platform 字段），
  // 再通过 ipcRenderer.on(`${token}-data`, cb) 接收 IMOnboardingEvent，
  // `${token}-end` 表示流结束，`${token}-error` 表示出错。
  // 新增平台无需改这里，只需后端注册 Onboarder。
  ipcMain.handle('start-im-onboarding', async (e, token, params) => {
    if (onboardingStreams.has(token)) {
      return // 同一 token 已在运行，忽略重复启动
    }
    const stream = getClient().StartIMOnboarding(params || {})
    handlerHelper.registerHandler(win, stream, onboardingStreams, token)
  })

  // 取消进行中的扫码注册
  ipcMain.handle('cancel-im-onboarding', handlerHelper.cancelHandler(onboardingStreams))
}
