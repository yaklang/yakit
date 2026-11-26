// @vitest-environment node
import http from 'node:http'
import { afterEach, describe, expect, it } from 'vitest'
import {
  rendererDevCommand,
  resolveRendererUrls,
  resolveSingleEndTimeoutMs,
  waitForRenderers,
} from '../../../scripts/start-electron.mjs'

const servers = []

const startPageServer = async () =>
  new Promise((resolve) => {
    const server = http.createServer((request, response) => {
      response.statusCode = 200
      response.end('<div id="root"></div>')
    })
    server.listen(0, '127.0.0.1', () => {
      servers.push(server)
      resolve(`http://127.0.0.1:${server.address().port}`)
    })
  })

afterEach(async () => {
  for (const server of servers.splice(0)) await new Promise((resolve) => server.close(resolve))
})

describe('resolveRendererUrls', () => {
  it('waits for both renderers on the fixed dev ports', () => {
    expect(resolveRendererUrls()).toEqual(['http://127.0.0.1:3000', 'http://127.0.0.1:3001/engine-link.html'])
  })

  it('can target link only', () => {
    expect(resolveRendererUrls({ linkOnly: true })).toEqual(['http://127.0.0.1:3001/engine-link.html'])
    expect(resolveRendererUrls()).toEqual(['http://127.0.0.1:3000', 'http://127.0.0.1:3001/engine-link.html'])
  })
})

describe('waitForRenderers', () => {
  it('resolves once every renderer page is ready', async () => {
    const urls = [await startPageServer(), await startPageServer()]
    await expect(waitForRenderers({ urls })).resolves.toBeUndefined()
  })

  it('fails fast with a remedy when only one renderer is up', async () => {
    const urls = [await startPageServer(), 'http://127.0.0.1:1']
    await expect(waitForRenderers({ urls, singleEndTimeoutMs: 0 })).rejects.toThrow(
      'Electron 固定创建 main :3000 与 link :3001 两个窗口',
    )
    await expect(waitForRenderers({ urls, singleEndTimeoutMs: 0 })).rejects.toThrow(
      'yarn --cwd app/renderer/src/main vite',
    )
  })

  it('suggests --link when only the link renderer is up', async () => {
    const urls = ['http://127.0.0.1:1', await startPageServer()]
    await expect(waitForRenderers({ urls, singleEndTimeoutMs: 0 })).rejects.toThrow('yarn cli electron --link')
  })

  it('fails fast when the single awaited renderer never comes up', async () => {
    const urls = ['http://127.0.0.1:1/engine-link.html']
    await expect(waitForRenderers({ urls, singleEndTimeoutMs: 0 })).rejects.toThrow('Renderer pages not ready')
  })
})

describe('resolveSingleEndTimeoutMs', () => {
  it('accepts positive values and falls back to 30s otherwise', () => {
    expect(resolveSingleEndTimeoutMs('1500')).toBe(1500)
    expect(resolveSingleEndTimeoutMs(0)).toBe(30000)
    expect(resolveSingleEndTimeoutMs(-1)).toBe(30000)
    expect(resolveSingleEndTimeoutMs('abc')).toBe(30000)
    expect(resolveSingleEndTimeoutMs(null)).toBe(30000)
  })
})

describe('rendererDevCommand', () => {
  it('maps each dev entry to the command that starts only it', () => {
    expect(rendererDevCommand('http://127.0.0.1:3000')).toBe('yarn --cwd app/renderer/src/main vite')
    expect(rendererDevCommand('http://127.0.0.1:3001/engine-link.html')).toBe(
      'yarn --cwd app/renderer/src/main vite --config vite.link.config.mts',
    )
  })
})
