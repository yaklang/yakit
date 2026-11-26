// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { matchesYakitWindowUrl } from '../electron/window-url.mjs'

describe('matchesYakitWindowUrl', () => {
  it('matches the dev main window without matching a Link port that starts with 3000', () => {
    expect(matchesYakitWindowUrl('http://127.0.0.1:3000/', '127.0.0.1:3000/')).toBe(true)
    expect(matchesYakitWindowUrl('http://127.0.0.1:30000/engine-link.html', '127.0.0.1:3000/')).toBe(false)
  })

  it('matches the dev Link window by host, port and pathname', () => {
    expect(matchesYakitWindowUrl('http://127.0.0.1:5173/engine-link.html', '127.0.0.1:5173/engine-link.html')).toBe(
      true,
    )
    expect(matchesYakitWindowUrl('http://127.0.0.1:5173/engine-link.html', '127.0.0.1:3000/')).toBe(false)
  })

  it('matches production paths inside the asar without confusing main and Link', () => {
    const main = 'file:///opt/yakit/resources/app.asar/renderer/pages/main/index.html'
    const link = 'file:///opt/yakit/resources/app.asar/renderer/pages/link/engine-link.html'

    expect(matchesYakitWindowUrl(main, '/renderer/pages/main/index.html')).toBe(true)
    expect(matchesYakitWindowUrl(link, '/renderer/pages/main/index.html')).toBe(false)
    expect(matchesYakitWindowUrl(link, '/renderer/pages/link/engine-link.html')).toBe(true)
  })
})
