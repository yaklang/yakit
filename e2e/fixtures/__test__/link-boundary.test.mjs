// @vitest-environment node
import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import linkConfig, { isForbiddenLinkModule } from '../../../app/renderer/src/main/vite.link.config.mts'
import { resolveRendererUrls } from '../../../scripts/start-electron.mjs'

const rendererRoot = path.resolve('app/renderer/src/main')

/** 登录回调端口由主进程 HTTP server 固定（OAuth 回调地址与后端约定），不能与 Link dev 端口共用 */
const readLoginCallbackPort = () => {
  const source = fs.readFileSync(path.resolve('app/main/handlers/userInfo.js'), 'utf8')
  const match = source.match(/\.listen\((\d+)/)
  if (!match)
    throw new Error('login callback port not found: expected .listen(<port>) in app/main/handlers/userInfo.js')
  return Number(match[1])
}

describe('Link module boundary', () => {
  it('rejects resolved main page modules', () => {
    expect(isForbiddenLinkModule(path.join(rendererRoot, 'src/pages/example.tsx'))).toBe(true)
    expect(isForbiddenLinkModule(path.join(rendererRoot, 'src/pages/sub/example.tsx?import'))).toBe(true)
  })

  it('rejects resolved newApp modules', () => {
    expect(isForbiddenLinkModule(path.join(rendererRoot, 'src/newApp/NewApp.tsx'))).toBe(true)
  })

  it('allows Link page and shared modules', () => {
    expect(isForbiddenLinkModule(path.join(rendererRoot, 'src/engineLinkStartup/pages/StartupPage.tsx'))).toBe(false)
    expect(isForbiddenLinkModule(path.join(rendererRoot, 'src/components/yakitUI/YakitButton/YakitButton.tsx'))).toBe(
      false,
    )
  })
})

describe('Link dev port', () => {
  // 两个进程同时监听同一端口会 EADDRINUSE：先起 Link 时登录静默失败，先登录时 strictPort 让 Link 起不来
  it('differs from the main-process login callback port', () => {
    const config = linkConfig({ mode: 'development', command: 'serve' })

    expect(config.server.port).not.toBe(readLoginCallbackPort())
  })

  // Electron 主进程按固定地址加载 link 窗口，端口漂移会导致白屏
  it('matches the Link URL that start-electron waits for', () => {
    const config = linkConfig({ mode: 'development', command: 'serve' })
    const [linkUrl] = resolveRendererUrls({ linkOnly: true })

    expect(new URL(linkUrl).port).toBe(String(config.server.port))
  })
})
