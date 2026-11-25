// @vitest-environment node
import { afterEach, describe, expect, it } from 'vitest'
import { resolveRendererUrls } from '../../../scripts/start-electron.mjs'

const ENV_KEYS = ['YAKIT_LINK_DEV_PORT']
const originalEnv = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]))

afterEach(() => {
  for (const key of ENV_KEYS) {
    const value = originalEnv[key]
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
})

describe('resolveRendererUrls', () => {
  it('waits for both renderers by default', () => {
    delete process.env.YAKIT_LINK_DEV_PORT

    expect(resolveRendererUrls()).toEqual(['http://127.0.0.1:3000', 'http://127.0.0.1:3001/engine-link.html'])
  })

  it('honors a custom Link dev port', () => {
    process.env.YAKIT_LINK_DEV_PORT = '3101'

    expect(resolveRendererUrls()).toEqual(['http://127.0.0.1:3000', 'http://127.0.0.1:3101/engine-link.html'])
  })
})
