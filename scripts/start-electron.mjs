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

export async function waitForRenderers({
  urls = ['http://127.0.0.1:3000', 'http://127.0.0.1:5173'],
  timeoutMs = 120000,
} = {}) {
  const deadline = Date.now() + timeoutMs
  let pending = urls
  while (pending.length) {
    const checks = await Promise.all(pending.map(pageReady))
    pending = pending.filter((_, i) => !checks[i])
    if (!pending.length) return
    if (Date.now() >= deadline)
      throw new Error(`Renderer pages not ready: ${pending.join(', ')}; run yarn cli start -v <edition> first`)
    await new Promise((resolve) => setTimeout(resolve, Math.min(1000, deadline - Date.now())))
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  await waitForRenderers()
  await buildElectron({ mode: 'development' })
  const { default: electron } = await import('electron')
  await run(electron, [repoRoot])
}
