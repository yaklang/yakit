import WebSocket from 'ws'
import { registerMainMethod } from '../ipc/index'
import { sendEvent } from '../ipc/events'
import { BrowserWindow, shell, type IpcMainEvent, type Event } from 'electron'
import { httpApi, getSocketUrl } from '../httpServer'
import { USER_INFO, HttpSetting } from '../state'
import { templateStr } from '../resources/oauthSuccessPage'
import urltt from 'node:url'
import http from 'node:http'
import { normalizeHttpBaseUrl, normalizeHttpUrl } from '../security'
import type { YakClient } from '../../shared/generated/grpc/types'
interface LoginInfo {
  from_platform: string
  name: string
  head_img: string
  role: string | null
  user_id: number | string
  token: string
  reason?: string
}
interface AuthReply {
  code: number
  data: LoginInfo
}
function readAuthReply(value: unknown): AuthReply {
  if (!value || typeof value !== 'object' || !('code' in value) || typeof value.code !== 'number')
    throw new Error('Invalid login response')
  const data =
    'data' in value && value.data && typeof value.data === 'object' ? (value.data as Record<string, unknown>) : {}
  if (value.code === 200 && (typeof data.token !== 'string' || !data.token)) throw new Error('Login token missing')
  return {
    code: value.code,
    data: {
      from_platform: typeof data.from_platform === 'string' ? data.from_platform : '',
      name: typeof data.name === 'string' ? data.name : '',
      head_img: typeof data.head_img === 'string' ? data.head_img : '',
      role: typeof data.role === 'string' ? data.role : null,
      user_id: typeof data.user_id === 'number' || typeof data.user_id === 'string' ? data.user_id : '',
      token: typeof data.token === 'string' ? data.token : '',
      reason: typeof data.reason === 'string' ? data.reason : undefined,
    },
  }
}

// http 服务
let server: http.Server | null = null
const LOGIN_ALLOWED_HOSTS = {
  github: ['github.com'],
  wechat: ['open.weixin.qq.com'],
  qq: ['graph.qq.com', 'open.mobileqq.com'],
}

const normalizeLoginUrl = (type: keyof typeof LOGIN_ALLOWED_HOSTS, targetUrl: string) => {
  const allowedHosts = LOGIN_ALLOWED_HOSTS[type]
  if (!allowedHosts) {
    throw new Error('unsupported login type')
  }

  return normalizeHttpUrl(targetUrl, {
    allowedHosts,
    requireHttps: true,
  })
}

const clearBrowserSession = (targetWindow: BrowserWindow | null) => {
  try {
    const clearTask = targetWindow?.webContents?.session?.clearStorageData?.()
    if (clearTask && typeof clearTask.catch === 'function') {
      clearTask.catch(() => {})
    }
  } catch (error) {}
}

export function registerAccountServices(win: BrowserWindow) {
  registerAccountSocket(win)
  win.once('closed', () => {
    server?.close()
    server = null
  })
  const commonSignIn = (res: AuthReply) => {
    const info = res.data
    const user = {
      isLogin: true,
      platform: info.from_platform,
      githubName: info.from_platform === 'github' ? info.name : null,
      githubHeadImg: info.from_platform === 'github' ? info.head_img : null,
      wechatName: info.from_platform === 'wechat' ? info.name : null,
      wechatHeadImg: info.from_platform === 'wechat' ? info.head_img : null,
      qqName: info.from_platform === 'qq' ? info.name : null,
      qqHeadImg: info.from_platform === 'qq' ? info.head_img : null,
      role: info.role,
      user_id: info.user_id,
      token: info.token,
      companyName: info.name,
      companyHeadImg: info.head_img,
    }

    USER_INFO.isLogin = user.isLogin
    USER_INFO.platform = user.platform
    USER_INFO.githubName = user.githubName
    USER_INFO.githubHeadImg = user.githubHeadImg
    USER_INFO.wechatName = user.wechatName
    USER_INFO.wechatHeadImg = user.wechatHeadImg
    USER_INFO.qqName = user.qqName
    USER_INFO.qqHeadImg = user.qqHeadImg
    USER_INFO.role = user.role
    USER_INFO.token = info.token
    USER_INFO.user_id = user.user_id
    USER_INFO.companyName = user.companyName
    USER_INFO.companyHeadImg = user.companyHeadImg
    sendEvent(win.webContents, 'fetch-signin-token', user)
    sendEvent(win.webContents, 'fetch-signin-data', { ok: true, info: '登录成功' })
  }
  // login modal
  registerMainMethod('user-sign-in', async (arg) => {
    const typeApi = {
      github: 'auth/from-github/callback',
      wechat: 'auth/from-wechat/callback',
      qq: 'auth/from-qq/callback',
    }

    const { url = '', type } = arg || {}
    let loginUrl = ''
    try {
      if (!typeApi[type]) {
        throw new Error('unsupported login type')
      }
      loginUrl = normalizeLoginUrl(type, url)
    } catch (error) {
      sendEvent(win.webContents, 'fetch-signin-data', {
        ok: false,
        info: error instanceof Error ? error.message : '登录地址无效,请重新登录！',
      })
      return
    }

    if (type === 'wechat') {
      const authWindow = new BrowserWindow({
        width: 600,
        height: 500,
        autoHideMenuBar: true,
        resizable: true,
        parent: win,
        minimizable: false,
        maximizable: false,
        fullscreen: false,
        fullscreenable: false,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          sandbox: true,
          webSecurity: true,
        },
      })
      const usedCodes = new Set()
      authWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
      authWindow.show()
      void authWindow.loadURL(loginUrl).catch((error) => {
        sendEvent(win.webContents, 'fetch-signin-data', { ok: false, info: error.message })
        if (!authWindow.isDestroyed()) authWindow.destroy()
      })
      const onWillNavigate = (navigationEvent: Event, targetUrl: string) => {
        if (!targetUrl) return
        if (!typeApi[type]) return

        try {
          normalizeHttpUrl(targetUrl, {
            allowedHosts: LOGIN_ALLOWED_HOSTS.wechat,
            requireHttps: true,
          })
          return
        } catch (error) {}

        let normalizedCallbackUrl = ''
        try {
          normalizedCallbackUrl = normalizeHttpUrl(targetUrl)
        } catch (error) {
          return
        }

        navigationEvent.preventDefault()

        const params = new URL(normalizedCallbackUrl).searchParams
        const wxCode = params.get('code')
        if (!wxCode) {
          clearBrowserSession(authWindow)
          sendEvent(win.webContents, 'fetch-signin-data', { ok: false, info: 'code获取失败,请重新登录！' })
          if (!authWindow.isDestroyed()) authWindow.close()
          return
        }
        if (usedCodes.has(wxCode)) {
          return
        }
        usedCodes.add(wxCode)
        httpApi({
          method: 'get',
          url: typeApi[type],
          params: { code: wxCode },
        })
          .then(readAuthReply)
          .then((res) => {
            if (authWindow.isDestroyed()) return
            if (res.code !== 200) {
              clearBrowserSession(authWindow)
              sendEvent(win.webContents, 'fetch-signin-data', {
                ok: false,
                info: res.data.reason || '请求异常，请重新登录！',
              })
              if (!authWindow.isDestroyed()) authWindow.close()
              return
            }
            commonSignIn(res)

            clearBrowserSession(authWindow)
            if (!authWindow.isDestroyed()) authWindow.close()
          })
          .catch((err) => {
            clearBrowserSession(authWindow)
            sendEvent(win.webContents, 'fetch-signin-data', { ok: false, info: '登录错误:' + err })
            if (!authWindow.isDestroyed()) authWindow.close()
          })
      }
      authWindow.webContents.on('will-navigate', onWillNavigate)

      authWindow.on('close', () => {
        clearBrowserSession(authWindow)
        if (authWindow && !authWindow.isDestroyed()) {
          authWindow.webContents.removeListener('will-navigate', onWillNavigate)
        }
      })
    }
    if (type === 'github') {
      if (server) {
        // 关闭之前 HTTP 服务器
        server.close()
      }
      server = http.createServer(async (req, res) => {
        const { pathname } = urltt.parse(req.url || '/', true)
        if (pathname === '/callback') {
          res.write(templateStr)
          res.end()
        } else if (pathname === '/judgeSignin') {
          const { query } = urltt.parse(req.url || '/', true)
          // 处理回调的逻辑
          const ghCode = query.code
          if (!ghCode) {
            res.end(
              JSON.stringify({
                login: false,
                ghCode,
              }),
            )
            return
          }
          await new Promise<void>((resolve, reject) => {
            httpApi({
              method: 'get',
              url: typeApi[type],
              params: { code: ghCode },
              headers: { Accept: 'application/json, text/plain, */*' },
            })
              .then(readAuthReply)
              .then((resp) => {
                if (resp.code !== 200) {
                  sendEvent(win.webContents, 'fetch-signin-data', {
                    ok: false,
                    info: resp.data.reason || '请求异常，请重新登录！',
                  })
                  res.end(
                    JSON.stringify({
                      login: false,
                    }),
                  )
                  resolve()
                  return
                }
                commonSignIn(resp)
                res.end(
                  JSON.stringify({
                    login: true,
                  }),
                )
                resolve()
              })
              .catch((err) => {
                sendEvent(win.webContents, 'fetch-signin-data', { ok: false, info: '登录错误:' + err })
                res.end(
                  JSON.stringify({
                    login: false,
                  }),
                )
                resolve()
              })
          })
        } else if (pathname === '/goback') {
          // 方法1（效果未实现）
          // win.blur()
          // win.focus()
          // win.moveTop()
          // 方法2
          win.setAlwaysOnTop(true)
          setTimeout(() => {
            win.setAlwaysOnTop(false)
          }, 100)
          win.show()
          res.statusCode = 200
          res.end()
          // 关闭 HTTP 服务器
          server?.close()
        }

        res.end()
      })

      const authServer = server
      await new Promise<void>((resolve, reject) => {
        authServer.once('error', reject)
        authServer.listen(3001, () => resolve())
      })
      try {
        await shell.openExternal(loginUrl)
      } catch (error) {
        authServer.close()
        throw error
      }
    }
  })
  registerMainMethod('company-sign-in', async (info) => {
    const user = {
      isLogin: true,
      platform: info.from_platform,
      githubName: null,
      githubHeadImg: null,
      wechatName: null,
      wechatHeadImg: null,
      qqName: null,
      qqHeadImg: null,
      role: info.role,
      user_id: info.user_id,
      token: info.token,
      companyName: info.name,
      companyHeadImg: info.head_img,
    }
    USER_INFO.isLogin = user.isLogin
    USER_INFO.platform = user.platform
    USER_INFO.githubName = user.githubName
    USER_INFO.githubHeadImg = user.githubHeadImg
    USER_INFO.wechatName = user.wechatName
    USER_INFO.wechatHeadImg = user.wechatHeadImg
    USER_INFO.qqName = user.qqName
    USER_INFO.qqHeadImg = user.qqHeadImg
    USER_INFO.role = user.role
    USER_INFO.token = info.token
    USER_INFO.user_id = user.user_id
    USER_INFO.companyName = user.companyName
    USER_INFO.companyHeadImg = user.companyHeadImg
    sendEvent(win.webContents, 'fetch-signin-token', user)
    sendEvent(win.webContents, 'fetch-signin-data', { ok: true, info: '登录成功' })

    return { next: true }
  })

  registerMainMethod('company-refresh-in', () => {
    sendEvent(win.webContents, 'fetch-signin-token', USER_INFO)
    sendEvent(win.webContents, 'fetch-signin-data', { ok: true, info: '登录成功' })
  })

  registerMainMethod('get-login-user-info', async () => {
    return USER_INFO
  })

  registerMainMethod('user-sign-out', (arg) => {
    server?.close()
    server = null
    USER_INFO.isLogin = false
    USER_INFO.platform = null
    USER_INFO.githubName = null
    USER_INFO.githubHeadImg = null
    USER_INFO.wechatName = null
    USER_INFO.wechatHeadImg = null
    USER_INFO.qqName = null
    USER_INFO.qqHeadImg = null
    USER_INFO.role = null
    USER_INFO.token = null
    USER_INFO.user_id = ''
    USER_INFO.companyName = null
    USER_INFO.companyHeadImg = null
    sendEvent(win.webContents, 'login-out')
    // 企业版为强制登录 - 退出登录则需重新回到登录页
    if (arg?.isEnpriTrace) {
      sendEvent(win.webContents, 'again-judge-license-login')
    }
  })

  registerMainMethod('sync-update-user', (user) => {
    USER_INFO.isLogin = user.isLogin
    USER_INFO.platform = user.platform
    USER_INFO.githubName = user.githubName
    USER_INFO.githubHeadImg = user.githubHeadImg
    USER_INFO.wechatName = user.wechatName
    USER_INFO.wechatHeadImg = user.wechatHeadImg
    USER_INFO.qqName = user.qqName
    USER_INFO.qqHeadImg = user.qqHeadImg
    USER_INFO.role = user.role
    USER_INFO.token = user.token
    USER_INFO.user_id = user.user_id
    USER_INFO.companyName = user.companyName
    USER_INFO.companyHeadImg = user.companyHeadImg
    return user
  })

  registerMainMethod('edit-baseUrl', async (arg) => {
    return await new Promise<void>((resolve, reject) => {
      try {
        const baseUrl = normalizeHttpBaseUrl(arg?.baseUrl)
        HttpSetting.wsBaseURL = getSocketUrl(baseUrl)
        HttpSetting.httpBaseURL = baseUrl
        USER_INFO.token = ''
        sendEvent(win.webContents, 'edit-baseUrl-status', { ok: true, info: '更改成功' })
        sendEvent(win.webContents, 'refresh-new-home', { ok: true, info: '刷新成功' })
        resolve()
      } catch (error) {
        reject(error)
      }
    })
  })

  registerMainMethod('reset-password', () => {
    sendEvent(win.webContents, 'reset-password-callback')
  })

  registerMainMethod('get-ws-url', () => {
    return HttpSetting.wsBaseURL
  })
}

function registerAccountSocket(win: BrowserWindow) {
  let socket: WebSocket | undefined
  let retry: ReturnType<typeof setTimeout> | undefined
  let reconnectCount = 0

  const close = () => {
    clearTimeout(retry)
    retry = undefined
    const current = socket
    socket = undefined
    current?.close(1000, 'Normal closure')
  }
  const start = () => {
    close()
    if (!USER_INFO.isLogin || win.isDestroyed()) return
    const current = new WebSocket(`${HttpSetting.wsBaseURL}api/ws`, {
      headers: { Authorization: USER_INFO.token ?? '' },
    })
    socket = current
    current.on('open', () => {
      if (socket !== current) return
      reconnectCount = 0
      sendEvent(win.webContents, 'client-socket-open')
    })
    current.on('message', (data) => {
      if (socket === current) sendEvent(win.webContents, 'client-socket-message', data)
    })
    current.on('close', () => {
      if (socket !== current) return
      socket = undefined
      sendEvent(win.webContents, 'client-socket-close')
    })
    current.on('error', () => {
      if (socket !== current || retry) return
      if (reconnectCount >= 3) {
        reconnectCount = 0
        close()
        sendEvent(win.webContents, 'client-socket-error', 'Maximum reconnection attempts reached')
        return
      }
      reconnectCount++
      // Reconnect directly; an IPC handler is not an EventEmitter event.
      retry = setTimeout(() => {
        retry = undefined
        start()
      }, 2000)
    })
  }
  registerMainMethod('socket-start', () => {
    reconnectCount = 0
    start()
  })
  registerMainMethod('socket-send', (data) => {
    if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(data))
  })
  registerMainMethod('socket-close', () => {
    reconnectCount = 0
    close()
  })
  win.once('closed', close)
}
