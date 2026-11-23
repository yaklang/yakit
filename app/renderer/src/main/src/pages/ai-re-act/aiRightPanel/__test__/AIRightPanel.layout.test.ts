import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { compile } from 'sass'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const pageDir = path.resolve(currentDir, '..')
const chatStylePath = path.resolve(pageDir, '../aiReActChat/AIReActChat.module.scss')
const contentsStylePath = path.resolve(pageDir, '../aiReActChatContents/AIReActChatContents.module.scss')
const contentsComponentPath = path.resolve(pageDir, '../aiReActChatContents/AIReActChatContents.tsx')
const panelStylePath = path.resolve(pageDir, 'AIRightPanel.module.scss')
const todoWrapperStylePath = path.resolve(pageDir, '../aiReActChat/aiToDoListWrapper/AIToDoListWrapper.module.scss')
const mixinStylePath = path.resolve(pageDir, '../styles/mixin.scss')
const agentChatStylePath = path.resolve(pageDir, '../../ai-agent/aiAgentChat/AIAgentChat.module.scss')
const layoutStylePath = path.resolve(
  pageDir,
  '../../ai-agent/aiAgentChat/AIAgentChatLayout/AIAgentChatLayout.module.scss',
)

describe('AIRightPanel layout contract', () => {
  it('1152px 以上仅有添加按钮时预留按钮空间，出现标签时预留完整标签列', () => {
    const layoutCss = compile(layoutStylePath).css
    const chatCss = compile(chatStylePath).css
    const contentCss = compile(path.resolve(pageDir, '../../ai-agent/aiChatContent/AIChatContent.module.scss')).css

    expect(layoutCss).toMatch(/\.chat-content\s*\{[^}]*container: ai-chat-content\s*\/\s*inline-size/)
    expect(contentCss).toMatch(/container: ai-chat-content-tabs\s*\/\s*inline-size/)
    expect(contentCss).not.toMatch(/container: ai-chat-content\s*\/\s*inline-size/)
    expect(chatCss).toMatch(
      /@container ai-chat-content \(width > 1152px\)\s*\{\s*\.ai-re-act:has\(\.chat-footer \[data-ai-summary-row\]:not\(:empty\)\)\s*\{\s*--ai-summary-side-width: 32px;/,
    )
    expect(chatCss).toMatch(
      /\.ai-re-act:has\(\.chat-footer \[data-ai-summary-row\] \[data-ai-summary-tag\]\)\s*\{\s*--ai-summary-side-width: 144px;/,
    )
    expect(chatCss).toContain(
      'calc(var(--ai-summary-side-width) - max(0px, (100% - var(--ai-right-panel-chat-slot-width, 0px) - 880px) / 2))',
    )
  })

  it('小屏面板的父级层叠上下文高于 TodoList，浮层可以覆盖待办卡片', () => {
    const panelCss = compile(panelStylePath).css
    const todoCss = compile(todoWrapperStylePath).css
    const panelLayer = panelCss.match(
      /\.right-panel-wrapper\[data-ai-right-panel-small=true\]\s*\{[^}]*z-index:\s*(\d+)/,
    )
    const todoLayer = todoCss.match(/\.todoList-wrapper\s*\{[^}]*z-index:\s*(\d+)/)
    expect(panelLayer).not.toBeNull()
    expect(todoLayer).not.toBeNull()
    expect(Number(panelLayer?.[1])).toBeGreaterThan(Number(todoLayer?.[1]))
  })

  it('keeps the panel interactive while allowing the far-right scrollbar to receive input', () => {
    const css = compile(panelStylePath).css

    expect(css).toContain('pointer-events: none')
    expect(css).toContain('pointer-events: auto')
    // themeify.color-mix-border 会同时生成普通颜色 fallback 与 color-mix 支持分支
    expect(css).toContain('border: 1px solid var(--Colors-Use-Neutral-Disable)')
    expect(css).toContain('border: 1px solid color-mix(in srgb, var(--Colors-Use-Neutral-Disable) 50%, transparent)')
    expect(css).toContain('right: -8px')
    expect(css).toContain('bottom: -6px')
    expect(css).toContain('width: 16px')
    expect(css).toContain('height: 14px')
    expect(css).toContain('background-color: var(--Colors-Use-Neutral-Disable)')
    expect(css).toContain('background-color: var(--Colors-Use-Status-High)')
    expect(css).toContain('border: 1px solid var(--Colors-Use-Neutral-Bg)')
  })

  it('keeps the Virtuoso scroller full width and shares one content track', () => {
    const chatSource = readFileSync(chatStylePath, 'utf8')
    const contentsSource = readFileSync(contentsStylePath, 'utf8')
    const contentsComponentSource = readFileSync(contentsComponentPath, 'utf8')
    const mixinSource = readFileSync(mixinStylePath, 'utf8')
    const layoutSource = readFileSync(layoutStylePath, 'utf8')

    expect(layoutSource).toContain('--ai-right-panel-slot-width: 0px')
    expect(layoutSource).toContain('--ai-right-panel-slot-width: 325px')
    expect(layoutSource).toContain('--ai-right-panel-slot-width: 61px')
    expect(chatSource).toContain(
      '--ai-right-panel-content-shift: calc(var(--ai-right-panel-chat-slot-width, 0px) / -2)',
    )
    expect(chatSource).not.toContain('--ai-right-panel-list-content-shift')
    expect(chatSource).toContain('--ai-right-panel-slot-width: 325px')
    expect(chatSource).toContain('--ai-right-panel-slot-width: 61px')
    expect(chatSource.replace(/\s+/g, ' ')).toContain(
      '--ai-right-panel-content-track-width: min( 864px, calc(100% - var(--ai-right-panel-chat-slot-width, 0px) - 2 * var(--ai-content-gutter, 0px)) )',
    )
    // 轨道的实际声明收敛在共享 mixin，面板态 footer include 同一条轨道
    expect(chatSource).toContain('@include mixin.ai-right-panel-content-track')
    expect(chatSource).toContain('.chat-layout-wrapper')
    const trackMixinBlock =
      mixinSource.match(/@mixin\s+ai-right-panel-content-track\([^)]*\)\s*\{([\s\S]*?)\n\}/)?.[1] ?? ''
    expect(trackMixinBlock).toContain(
      'width: calc(var(--ai-right-panel-content-track-width) - var(--ai-summary-track-inset, 0px))',
    )
    expect(trackMixinBlock).toContain('margin: 0 auto')
    expect(trackMixinBlock).toContain(
      'margin-left: calc((100% - var(--ai-right-panel-content-track-width)) / 2 + var(--ai-summary-track-inset, 0px))',
    )
    expect(trackMixinBlock).toContain('transform: translateX(var(--ai-right-panel-content-shift))')
    expect(contentsSource).toContain('.re-act-contents-track')
    expect(contentsSource).toContain('@include mixin.ai-right-panel-content-track')
    expect(contentsComponentSource).toContain('List: VirtuosoListContainer')
    expect(contentsComponentSource).toContain("styles['re-act-contents-track']")
    const itemWrapperBlock = contentsSource.match(/\.item-wrapper\s*\{([\s\S]*?)\n\s*\.item-inner/)?.[1] ?? ''
    expect(itemWrapperBlock).not.toMatch(/padding-(left|right):/)
  })

  it('keeps the Virtuoso footer, todo card and review popup on the same content track as the message list', () => {
    const contentsSource = readFileSync(contentsStylePath, 'utf8')
    const todoWrapperSource = readFileSync(todoWrapperStylePath, 'utf8')
    const agentChatSource = readFileSync(agentChatStylePath, 'utf8')

    // Virtuoso 的 Footer 与内部 List 是兄弟节点，脱离 List 轨道后需自行套用轨道 mixin
    // （原 .end 已合并进 .footer-loading）
    const footerLoadingBlock = contentsSource.match(/\.footer-loading\s*\{([\s\S]*?)\n\s*\}/)?.[1] ?? ''
    expect(footerLoadingBlock).toContain('@include mixin.ai-right-panel-content-track')
    const loadMoreHeaderBlock = contentsSource.match(/\.load-more-header\s*\{([\s\S]*?)\n\s*\}/)?.[1] ?? ''
    expect(loadMoreHeaderBlock).toContain('@include mixin.ai-right-panel-content-track')

    // 待办卡片与消息列表共用同一条内容轨道
    const todoListBlock = todoWrapperSource.match(/\.to-do-list\s*\{([\s\S]*?)\n\s*\}/)?.[1] ?? ''
    expect(todoListBlock).toContain('@include mixin.ai-right-panel-content-track')
    expect(todoListBlock).toContain('margin-top: 8px')
    expect(todoListBlock).not.toContain('margin:')

    // review 弹层绝对定位于全宽根容器上，同样需要轨道对齐消息区中心
    const reviewBoxBlock = agentChatSource.match(/\.review-box\s*\{([\s\S]*?)\n\}/)?.[1] ?? ''
    expect(reviewBoxBlock).toContain('@include mixin.ai-right-panel-content-track')
  })
})
