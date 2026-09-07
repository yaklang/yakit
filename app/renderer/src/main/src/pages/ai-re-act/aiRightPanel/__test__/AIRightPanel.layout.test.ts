import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { compile } from 'sass'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const pageDir = path.resolve(currentDir, '..')
const chatStylePath = path.resolve(pageDir, '../aiReActChat/AIReActChat.module.scss')
const contentsStylePath = path.resolve(pageDir, '../aiReActChatContents/AIReActChatContents.module.scss')
const panelStylePath = path.resolve(pageDir, 'AIRightPanel.module.scss')

describe('AIRightPanel layout contract', () => {
  it('keeps the panel interactive while allowing the far-right scrollbar to receive input', () => {
    const css = compile(panelStylePath).css

    expect(css).toContain('pointer-events: none')
    expect(css).toContain('pointer-events: auto')
    // themeify.color-mix-border 会同时生成普通颜色 fallback 与 color-mix 支持分支
    expect(css).toContain('border: 1px solid var(--Colors-Use-Neutral-Disable)')
    expect(css).toContain('border: 1px solid color-mix(in srgb, var(--Colors-Use-Neutral-Disable) 50%, transparent)')
  })

  it('uses the recalculated list offsets after item-wrapper padding removal', () => {
    const chatSource = readFileSync(chatStylePath, 'utf8')
    const contentsSource = readFileSync(contentsStylePath, 'utf8')

    expect(chatSource).toContain('--ai-right-panel-slot-width: 0px')
    expect(chatSource).toContain('--ai-right-panel-content-shift: 0px')
    expect(chatSource).toContain('--ai-right-panel-list-content-shift: 0px')
    expect(chatSource).toContain('--ai-right-panel-slot-width: 325px')
    expect(chatSource).toContain('--ai-right-panel-content-shift: -162.5px')
    expect(chatSource).toContain('--ai-right-panel-slot-width: 61px')
    expect(chatSource).toContain('--ai-right-panel-content-shift: -30.5px')
    expect(chatSource).toContain('width: min(784px, calc(100% - var(--ai-right-panel-slot-width)))')
    expect(chatSource).toContain('transform: translateX(var(--ai-right-panel-list-content-shift))')
    expect(chatSource).toContain('.chat-layout-wrapper')
    const itemWrapperBlock = contentsSource.match(/\.item-wrapper\s*\{([\s\S]*?)\n\s*\.item-inner/)?.[1] ?? ''
    expect(itemWrapperBlock).not.toMatch(/padding-(left|right):/)
  })
})
