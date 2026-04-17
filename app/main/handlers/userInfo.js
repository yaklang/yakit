const { ipcMain, BrowserWindow, shell } = require('electron')
const { httpApi, getSocketUrl } = require('../httpServer')
const { USER_INFO, HttpSetting } = require('../state')
const { templateStr } = require('./wechatWebTemplate/index')
const urltt = require('url')
const http = require('http')
const { assertTrustedAppSender, normalizeHttpBaseUrl, normalizeHttpUrl } = require('../security')
const { printLogOutputFile } = require('../logFile')

// http 服务
let server = null
const LOGIN_ALLOWED_HOSTS = {
  github: ['github.com'],
  wechat: ['open.weixin.qq.com'],
  qq: ['graph.qq.com', 'open.mobileqq.com'],
}

const normalizeLoginUrl = (type, targetUrl) => {
  const allowedHosts = LOGIN_ALLOWED_HOSTS[type]
  if (!allowedHosts) {
    throw new Error('unsupported login type')
  }

  return normalizeHttpUrl(targetUrl, {
    allowedHosts,
    requireHttps: true,
  })
}

const clearBrowserSession = (targetWindow) => {
  try {
    const clearTask = targetWindow?.webContents?.session?.clearStorageData?.()
    if (clearTask && typeof clearTask.catch === 'function') {
      clearTask.catch(() => {})
    }
  } catch (error) {}
}

module.exports = {
  register: (win, getClient) => {
    const commonSignIn = (res, type) => {
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
      win.webContents.send('fetch-signin-token', user)
      if (type === 'ccb') {
        win.webContents.send('fetch-signin-ccb-data', { ok: true, info: '登录成功' })
      } else {
        win.webContents.send('fetch-signin-data', { ok: true, info: '登录成功' })
      }
    }
    // login modal
    ipcMain.on('user-sign-in', (event, arg) => {
      assertTrustedAppSender(event, 'user-sign-in')
      const typeApi = {
        github: 'auth/from-github/callback',
        wechat: 'auth/from-wechat/callback',
        qq: 'auth/from-qq/callback',
        ccb: 'auth/from-ccb/callback',
      }

      const { url = '', type } = arg || {}
      let loginUrl = ''
      try {
        if (!typeApi[type]) {
          throw new Error('unsupported login type')
        }
        loginUrl = normalizeLoginUrl(type, url)
      } catch (error) {
        win.webContents.send('fetch-signin-data', {
          ok: false,
          info: error?.message || '登录地址无效,请重新登录！',
        })
        return
      }

      if (type === 'wechat') {
        var authWindow = new BrowserWindow({
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
        authWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
        authWindow.show()
        authWindow.loadURL(loginUrl)
        authWindow.webContents.on('will-navigate', (navigationEvent, targetUrl) => {
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
            win.webContents.send('fetch-signin-data', { ok: false, info: 'code获取失败,请重新登录！' })
            authWindow.close()
            return
          }
          httpApi({
            method: 'get',
            url: typeApi[type],
            params: { code: wxCode },
          })
            .then((res) => {
              if (!authWindow) return
              if (res.code !== 200) {
                clearBrowserSession(authWindow)
                win.webContents.send('fetch-signin-data', {
                  ok: false,
                  info: res.data.reason || '请求异常，请重新登录！',
                })
                authWindow.close()
                return
              }
              commonSignIn(res, type)

              clearBrowserSession(authWindow)
              setTimeout(() => authWindow.close(), 200)
            })
            .catch((err) => {
              clearBrowserSession(authWindow)
              win.webContents.send('fetch-signin-data', { ok: false, info: '登录错误:' + err })
              authWindow.close()
            })
        })

        authWindow.on('close', () => {
          clearBrowserSession(authWindow)
          authWindow = null
        })
      }
      if (['github', 'ccb'].includes(type)) {
        if (server) {
          // 关闭之前 HTTP 服务器
          server.close()
        }
        server = http
          .createServer(async (req, res) => {
            const { pathname } = urltt.parse(req.url, true)
            if (pathname === '/callback') {
              res.write(templateStr)
              res.end()
            } else if (pathname === '/judgeSignin') {
              const { query } = urltt.parse(req.url, true)
              printLogOutputFile(
                'ccb-------judgeSignin',
                JSON.stringify({
                  url: req.url,
                  query,
                }),
              )
              // 处理回调的逻辑
              const ghCode = query.code
              if (!ghCode) {
                printLogOutputFile('ccb-------ghCode:' + ghCode)
                res.end(
                  JSON.stringify({
                    login: false,
                    ghCode,
                  }),
                )
                return
              }
              await new Promise((resolve, reject) => {
                printLogOutputFile(
                  'ccb-------请求:' +
                    JSON.stringify({
                      url: typeApi[type],
                      params: { code: ghCode },
                    }),
                )
                httpApi({
                  method: 'get',
                  url: typeApi[type],
                  params: { code: ghCode },
                  headers: { Accept: 'application/json, text/plain, */*' },
                })
                  .then((resp) => {
                    printLogOutputFile('ccb-------响应:' + JSON.stringify(resp))
                    if (resp.code !== 200) {
                      if (type === 'ccb') {
                        win.webContents.send('fetch-signin-ccb-data', {
                          ok: false,
                          info: resp.data.reason || '请求异常，请重新登录！',
                        })
                      } else {
                        win.webContents.send('fetch-signin-data', {
                          ok: false,
                          info: resp.data.reason || '请求异常，请重新登录！',
                        })
                      }
                      res.end(
                        JSON.stringify({
                          login: false,
                        }),
                      )
                      resolve()
                      return
                    }
                    commonSignIn(resp, type)
                    res.end(
                      JSON.stringify({
                        login: true,
                      }),
                    )
                    resolve()
                  })
                  .catch((err) => {
                    printLogOutputFile('ccb-------错误:' + JSON.stringify(err))
                    if (type === 'ccb') {
                      win.webContents.send('fetch-signin-ccb-data', {
                        ok: false,
                        info: '登录错误:' + err,
                      })
                    } else {
                      win.webContents.send('fetch-signin-data', { ok: false, info: '登录错误:' + err })
                    }
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
              server.close()
            }

            res.end()
          })
          .listen(3001, () => {
            console.log('HTTP server is listening on port 3001')
          })
        shell.openExternal(loginUrl)
      }
    })
    ipcMain.handle('company-sign-in', async (event, info) => {
      assertTrustedAppSender(event, 'company-sign-in')
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
      win.webContents.send('fetch-signin-token', user)
      if (USER_INFO.platform === 'ccb') {
        win.webContents.send('fetch-signin-ccb-data', { ok: true, info: '登录成功' })
      } else {
        win.webContents.send('fetch-signin-data', { ok: true, info: '登录成功' })
      }

      return new Promise((resolve, reject) => {
        resolve({ next: true })
      })
    })

    ipcMain.on('company-refresh-in', (event) => {
      assertTrustedAppSender(event, 'company-refresh-in')
      win.webContents.send('fetch-signin-token', USER_INFO)
      if (USER_INFO.platform === 'ccb') {
        win.webContents.send('fetch-signin-ccb-data', { ok: true, info: '登录成功' })
      } else {
        win.webContents.send('fetch-signin-data', { ok: true, info: '登录成功' })
      }
    })

    ipcMain.handle('get-login-user-info', async (e) => {
      assertTrustedAppSender(e, 'get-login-user-info')
      return await new Promise((resolve, reject) => {
        resolve(USER_INFO)
      })
    })

    ipcMain.on('user-sign-out', (event, arg) => {
      assertTrustedAppSender(event, 'user-sign-out')
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
      win.webContents.send('login-out')
      // 企业版为强制登录 - 退出登录则需重新回到登录页
      if (arg?.isEnpriTrace) {
        win.webContents.send('again-judge-license-login')
      }
    })

    ipcMain.on('sync-update-user', (event, user) => {
      const isCCB = user.platform === 'ccb'
      assertTrustedAppSender(event, 'sync-update-user')
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
      USER_INFO.companyName = isCCB ? user.ccbName : user.companyName
      USER_INFO.companyHeadImg = isCCB ? user.ccbHeadImg : user.companyHeadImg
      event.returnValue = user
    })

    ipcMain.handle('edit-baseUrl', async (event, arg) => {
      return await new Promise((resolve, reject) => {
        try {
          assertTrustedAppSender(event, 'edit-baseUrl')
          const baseUrl = normalizeHttpBaseUrl(arg?.baseUrl)
          HttpSetting.wsBaseURL = getSocketUrl(baseUrl)
          HttpSetting.httpBaseURL = baseUrl
          USER_INFO.token = ''
          win.webContents.send('edit-baseUrl-status', { ok: true, info: '更改成功' })
          win.webContents.send('refresh-new-home', { ok: true, info: '刷新成功' })
          resolve()
        } catch (error) {
          reject(error)
        }
      })
    })

    ipcMain.handle('reset-password', (event, arg) => {
      assertTrustedAppSender(event, 'reset-password')
      win.webContents.send('reset-password-callback')
    })

    ipcMain.handle('get-ws-url', (event, arg) => {
      assertTrustedAppSender(event, 'get-ws-url')
      return HttpSetting.wsBaseURL
    })
  },
}
