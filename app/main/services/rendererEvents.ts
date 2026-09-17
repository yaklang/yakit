import type { BrowserWindow } from 'electron'
import { registerMainMethod } from '../ipc/index'
import { sendEvent } from '../ipc/events'
import { mainEventNames } from '../../shared/communication/local-methods'

export function registerRendererEvents(win: BrowserWindow) {
  registerComparisons(win)
  registerMainMethod('ForwardMainEvent', ({ event, data }) => {
    if (!mainEventNames.includes(event)) throw new Error('Unknown renderer notification')
    if (win.isDestroyed()) throw new Error('Main window is unavailable')
    sendEvent(win.webContents, event, data)
  })
}

type CompareData = { type: number; left?: unknown; right?: unknown; ''?: unknown }

function registerComparisons(win: BrowserWindow) {
  // 存储多对比页面的token和data
  const dataMap = new Map<string, CompareData>()
  // 当前token值
  var token = ''

  var flag = ''

  // 接收http-history页面的数据对比请求,生成对映码并转发通知主页新增data-compare页面
  registerMainMethod('add-data-compare', (params) => {
    const infoType = (['', 'left', 'right'] as const)[+params.type]
    if (infoType === undefined) throw new Error('Invalid comparison side')

    if (token) {
      const info = dataMap.get(token)
      if (!info) throw new Error('Comparison no longer exists')
      info.type = +params.type
      info[infoType] = params.info
      dataMap.set(token, info)

      sendEvent(win.webContents, `${token}-data`, {
        token: token,
        info: info,
      })
      if (flag !== infoType) {
        token = ''
        flag = ''
      }
      if (infoType === 'right') {
        sendEvent(win.webContents, 'switch-compare-page', {
          token,
          info,
        })
      }
    } else {
      token = `compare-${new Date().getTime()}-${Math.floor(Math.random() * 50)}`
      const info: CompareData = { type: +params.type }
      info[infoType] = params.info
      dataMap.set(token, info)
      sendEvent(win.webContents, 'main-container-add-compare', {
        openFlag: infoType === 'right',
      })
      flag = infoType
    }
  })

  registerMainMethod('reset-data-compare', () => {
    dataMap.clear()
    flag = ''
    token = ''
  })

  // 接收主页收到的对比数据，并传入数据对比页面中
  registerMainMethod('create-compare-token', async () => {
    if (token) {
      return { token, info: dataMap.get(token) }
    }
    if (dataMap.size === 0) {
      return { token: `compare-${new Date().getTime()}-${Math.floor(Math.random() * 50)}` }
    }
    const data = Array.from(dataMap.entries()).pop()!
    return {
      token: data[0],
      info: data[1],
    }
  })

  //渲染层之间不能直接发送消息，所以通过主进程进行转发
  registerMainMethod('forward-data-compare', (params) => {
    sendEvent(win.webContents, `${params.token}-data`, params)
  })

  registerMainMethod('forward-switch-compare-page', (params) => {
    sendEvent(win.webContents, 'switch-compare-page', params)
  })

  registerMainMethod('forward-main-container-add-compare', (params) => {
    sendEvent(win.webContents, 'main-container-add-compare', params)
  })
}
