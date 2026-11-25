// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { resolveRendererUrls } from '../../../scripts/start-electron.mjs'

describe('resolveRendererUrls', () => {
  it('waits for both renderers on the fixed dev ports', () => {
    expect(resolveRendererUrls()).toEqual(['http://127.0.0.1:3000', 'http://127.0.0.1:3001/engine-link.html'])
  })
})
