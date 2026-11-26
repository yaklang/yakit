import http from 'node:http'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { buildElectron, repoRoot, run } from './build-electron.mjs'

const pageReady = (url) =>
  new Promise((resolve) => {
    const request = http.get(url, (response) => {
      let body = ''
      response.setEncoding('utf8')
      response.on('data', (chunk) => {
        body += chunk
      })
      response.on('end', () => resolve(response.statusCode === 200 && /<script\b|<div\s+id=["']root["']/.test(body)))
      response.on('error', () => resolve(false))
    })
    request.setTimeout(2000, () => request.destroy())
    request.on('error', () => resolve(false))
  })

/**
 * 默认等待两端。linkOnly 只用于"只改 Link"：link 窗口是启动入口（show: true），
 * 主窗口要等 link 连接引擎后才显示，所以没有"只等 main"的等价模式。
 */
export const resolveRendererUrls = ({ linkOnly = false } = {}) =>
  linkOnly
    ? ['http://127.0.0.1:3001/engine-link.html']
    : ['http://127.0.0.1:3000', 'http://127.0.0.1:3001/engine-link.html']

/** 只补起单个 dev server 的命令（main :3000 / link :3001 端口互不冲突） */
export const rendererDevCommand = (url) =>
  url.includes('engine-link') || url.includes(':3001')
    ? 'yarn --cwd app/renderer/src/main vite --config vite.link.config.mts'
    : 'yarn --cwd app/renderer/src/main vite'

/** Electron 固定创建两个窗口；link 是启动入口，main 默认隐藏，所以只改 Link 时可以不等 main */
const rendererNotReady = (pending) => {
  const linkOnlyAdvice = pending.some((url) => !url.includes('3001'))
    ? ['  - 只改 Link 时可直接运行 yarn cli electron --link（只等待 :3001，不等待 main）']
    : []
  return [
    `Renderer pages not ready: ${pending.join(', ')}`,
    'Electron 固定创建 main :3000 与 link :3001 两个窗口，未启动的一端会加载失败（link 是启动入口，主窗口连接引擎后才显示）。可选：',
    ...pending.map((url) => `  - 另开终端补起该端：${rendererDevCommand(url)}，然后重新运行 yarn cli electron`),
    ...linkOnlyAdvice,
    '  - 或关闭当前单端服务后执行 yarn cli start -v <edition> 起两端，再运行 yarn cli electron',
  ].join('\n')
}

const FALLBACK_SINGLE_END_TIMEOUT_MS = 30000

/** 单端等待的快速失败阈值；机器冷启动较慢时可用 YAKIT_SINGLE_END_TIMEOUT_MS 覆盖，非法值回退默认 */
export const resolveSingleEndTimeoutMs = (value = process.env.YAKIT_SINGLE_END_TIMEOUT_MS) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : FALLBACK_SINGLE_END_TIMEOUT_MS
}

export async function waitForRenderers({
  urls = resolveRendererUrls(),
  timeoutMs = 120000,
  singleEndTimeoutMs = resolveSingleEndTimeoutMs(),
} = {}) {
  const deadline = Date.now() + timeoutMs
  let pending = urls
  let singleEndSince = 0
  while (pending.length) {
    const checks = await Promise.all(pending.map(pageReady))
    pending = pending.filter((_, i) => !checks[i])
    if (!pending.length) return
    // 只等一端（linkOnly）或两端里已有一端就绪：超过阈值仍未就绪就快速失败，不再等满 120s
    if (urls.length === 1 || pending.length < urls.length) {
      singleEndSince ||= Date.now()
      if (Date.now() - singleEndSince >= singleEndTimeoutMs) throw new Error(rendererNotReady(pending))
    }
    if (Date.now() >= deadline) throw new Error(rendererNotReady(pending))
    await new Promise((resolve) => setTimeout(resolve, Math.min(1000, deadline - Date.now())))
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const linkOnly = process.argv.includes('--link')
  await waitForRenderers({ urls: resolveRendererUrls({ linkOnly }) })
  await buildElectron({ mode: 'development' })
  const { default: electron } = await import('electron')
  await run(electron, [repoRoot])
}
