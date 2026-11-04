// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import vm from 'node:vm'

const require = createRequire(import.meta.url)
const source = readFileSync(new URL('../userInfo.js', import.meta.url), 'utf8')

const USER_INFO = {
  isLogin: false,
  platform: null,
  githubName: null,
  githubHeadImg: null,
  wechatName: null,
  wechatHeadImg: null,
  qqName: null,
  qqHeadImg: null,
  role: null,
  token: '',
  user_id: '',
  companyName: null,
  companyHeadImg: null,
}
const HttpSetting = { httpBaseURL: '', wsBaseURL: '' }

function webContents(url = 'file:///index.html') {
  return {
    send: vi.fn(),
    isDestroyed: () => false,
    getURL: () => url,
  }
}

function appWindow(contents, destroyed = false) {
  return { isDestroyed: () => destroyed, webContents: contents }
}

function trustedEvent(sender) {
  return { sender }
}

function setup() {
  const handlers = {}
  const listeners = {}
  const ipcMain = {
    handle: (channel, fn) => {
      handlers[channel] = fn
    },
    on: (channel, fn) => {
      listeners[channel] = fn
    },
  }
  const windows = []
  const mainContents = webContents('file:///main.html')
  const mainWindow = appWindow(mainContents)
  const module = { exports: {} }
  vm.runInNewContext(source, {
    module,
    require: (id) => {
      if (id === 'electron')
        return { ipcMain, BrowserWindow: { getAllWindows: () => windows }, shell: { openExternal: vi.fn() } }
      if (id === '../httpServer') {
        return {
          httpApi: vi.fn(),
          getSocketUrl: (value) => `ws://${new URL(value).host}`,
        }
      }
      if (id === '../state') return { USER_INFO, HttpSetting }
      if (id === './wechatWebTemplate/index') return { templateStr: '' }
      if (id === 'url') return require('node:url')
      if (id === 'http') return require('node:http')
      if (id === '../security') return require('../../security')
      throw new Error(`unexpected require: ${id}`)
    },
  })
  module.exports.register(mainWindow, () => {})
  return { handlers, listeners, windows, mainWindow, mainContents }
}

describe('user info window sync', () => {
  it('broadcasts company sign-in to every open window and keeps the success notice on the main window', async () => {
    const { handlers, windows, mainContents } = setup()
    const childContents = webContents()
    const destroyedContents = webContents()
    windows.push(mainWindowOf(mainContents), appWindow(childContents), appWindow(destroyedContents, true))

    await handlers['company-sign-in'](trustedEvent(childContents), {
      from_platform: 'company',
      role: 'admin',
      user_id: 7,
      token: 'token-1',
      name: 'Admin',
      head_img: 'avatar',
    })

    const user = expect.objectContaining({ isLogin: true, token: 'token-1', companyName: 'Admin', role: 'admin' })
    expect(mainContents.send).toHaveBeenCalledWith('fetch-signin-token', user)
    expect(childContents.send).toHaveBeenCalledWith('fetch-signin-token', user)
    expect(destroyedContents.send).not.toHaveBeenCalled()
    expect(mainContents.send).toHaveBeenCalledWith('fetch-signin-data', { ok: true, info: '登录成功' })
    expect(childContents.send).not.toHaveBeenCalledWith('fetch-signin-data', expect.anything())
  })

  it('broadcasts the current session on company refresh and a logout to every open window', () => {
    const { listeners, windows, mainContents } = setup()
    USER_INFO.isLogin = true
    USER_INFO.token = 'stored-token'
    const childContents = webContents()
    windows.push(appWindow(mainContents), appWindow(childContents))

    listeners['company-refresh-in'](trustedEvent(mainContents))
    expect(mainContents.send).toHaveBeenCalledWith('fetch-signin-token', USER_INFO)
    expect(childContents.send).toHaveBeenCalledWith('fetch-signin-token', USER_INFO)
    expect(childContents.send).not.toHaveBeenCalledWith('fetch-signin-data', expect.anything())

    listeners['user-sign-out'](trustedEvent(mainContents), { isEnpriTrace: true })
    expect(mainContents.send).toHaveBeenCalledWith('login-out')
    expect(childContents.send).toHaveBeenCalledWith('login-out')
    expect(mainContents.send).toHaveBeenCalledWith('again-judge-license-login')
    expect(childContents.send).not.toHaveBeenCalledWith('again-judge-license-login')
    expect(USER_INFO.isLogin).toBe(false)
    expect(USER_INFO.token).toBeNull()
  })

  it('returns the private-domain status to the window that submitted it', async () => {
    const { handlers, windows, mainContents } = setup()
    USER_INFO.token = 'stale-token'
    const childContents = webContents()
    const otherContents = webContents()
    windows.push(appWindow(mainContents), appWindow(childContents), appWindow(otherContents))

    await handlers['edit-baseUrl'](trustedEvent(childContents), { baseUrl: 'http://127.0.0.1:8081' })

    expect(childContents.send).toHaveBeenCalledExactlyOnceWith('edit-baseUrl-status', { ok: true, info: '更改成功' })
    expect(mainContents.send).toHaveBeenCalledExactlyOnceWith('refresh-new-home', { ok: true, info: '刷新成功' })
    expect(otherContents.send).not.toHaveBeenCalled()
    expect(HttpSetting.httpBaseURL).toBe('http://127.0.0.1:8081')
    expect(HttpSetting.wsBaseURL).toBe('ws://127.0.0.1:8081')
    expect(USER_INFO.token).toBe('')
  })

  it('does not send the private-domain status when the submitting window is already destroyed', async () => {
    const { handlers, mainContents } = setup()
    const sender = webContents()
    sender.isDestroyed = () => true

    await handlers['edit-baseUrl'](trustedEvent(sender), { baseUrl: 'http://127.0.0.1:8081/' })

    expect(sender.send).not.toHaveBeenCalled()
    expect(mainContents.send).toHaveBeenCalledExactlyOnceWith('refresh-new-home', { ok: true, info: '刷新成功' })
  })
})

function mainWindowOf(contents) {
  return appWindow(contents)
}
