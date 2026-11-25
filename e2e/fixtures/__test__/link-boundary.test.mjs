// @vitest-environment node
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { isForbiddenLinkModule } from '../../../app/renderer/src/main/vite.link.config.mts'

const rendererRoot = path.resolve('app/renderer/src/main')

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
