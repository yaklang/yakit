import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import postcss from 'postcss'
import { compile } from 'sass'
import { expect, it } from 'vitest'

const path = resolve(dirname(fileURLToPath(import.meta.url)), '../template.module.scss')
const css = postcss.parse(compile(path).css)
const runningStatusCss = postcss.parse(
  compile(resolve(dirname(path), 'AIRunningStatus/AIRunningStatus.module.scss')).css,
)

it('运行状态显示且输入框小于 500px 时使用简短的模式数量文案', () => {
  const overrides: string[] = []
  css.walkAtRules('container', (query) => {
    query.walkRules((rule) => {
      rule.walkDecls(/^--ai-footer-mode-count-/, (decl) => {
        expect(rule.selector).toContain('.footer:has(> .footer-right button[data-ai-running-status]) > .footer-left')
        expect(query.params).toBe('ai-chat-textarea (width < 500px)')
        overrides.push(`${decl.prop}: ${decl.value}`)
      })
    })
  })
  expect(overrides).toEqual([
    '--ai-footer-mode-count-full-display: none',
    '--ai-footer-mode-count-short-display: inline',
  ])
})

it.each([
  ['label', 864],
  ['chevron', 512],
  ['time', 410],
])('运行状态的 %s 在输入框小于 %ipx 时隐藏', (part, width) => {
  const hiddenQueries: string[] = []
  runningStatusCss.walkAtRules('container', (query) => {
    query.walkRules((rule) => {
      if (!rule.selector.endsWith(`.${part}`)) return
      rule.walkDecls('display', (decl) => {
        if (decl.value === 'none') hiddenQueries.push(query.params)
      })
    })
  })
  expect(hiddenQueries).toEqual([`ai-chat-textarea (width < ${width}px)`])
})

it('输入框小于 864px 时隐藏排队发送文字，小于 640px 时隐藏整个按钮', () => {
  const hiddenLabels: string[] = []
  const hiddenButtons: string[] = []
  css.walkAtRules('container', (query) => {
    query.walkRules((rule) => {
      if (!rule.selector.includes('.queue-send-btn')) return
      rule.walkDecls('display', (decl) => {
        if (decl.value !== 'none') return
        if (rule.selector.endsWith('.queue-send-label')) hiddenLabels.push(query.params)
        if (rule.selector.endsWith('.queue-send-btn:global(.ant-btn)')) hiddenButtons.push(query.params)
      })
    })
  })
  expect(hiddenLabels).toEqual(['ai-chat-textarea (width < 864px)'])
  expect(hiddenButtons).toEqual(['ai-chat-textarea (width < 640px)'])
})

it('两个状态徽标同时显示时同步收起模型、场景和设置，其余情况按输入框宽度收起', () => {
  const declarations: Record<string, string> = {}
  const compactQueries: string[] = []
  const compactSelectors: string[] = []
  const sceneDeclarations: Record<string, string> = {}
  const settingsDeclarations: Record<string, string> = {}
  css.walkRules((rule) => {
    if (!rule.selector.includes('.model-self-adaptive')) return
    rule.walkDecls('--ai-footer-selector-label-display', (decl) => {
      if (decl.value !== 'none') return
      const parent = rule.parent
      if (parent?.type === 'atrule') compactQueries.push(parent.params)
      else compactSelectors.push(rule.selector)
    })
  })
  css.walkAtRules('container', (query) => {
    if (query.params === 'ai-chat-textarea (width < 640px)') {
      query.walkRules((rule) => {
        const target = rule.selector.endsWith('.focus-mode-self-adaptive')
          ? sceneDeclarations
          : rule.selector.endsWith('.settings-label')
            ? settingsDeclarations
            : undefined
        if (target)
          rule.walkDecls((decl) => {
            target[decl.prop] = decl.value
          })
      })
    }
    if (query.params !== 'ai-chat-textarea (width < 450px)') return
    query.walkRules((rule) => {
      if (!rule.selector.includes('> .footer-left .model-self-adaptive')) return
      rule.walkDecls((decl) => {
        declarations[decl.prop] = decl.value
      })
    })
  })
  expect(declarations['--ai-footer-selector-label-display']).toBe('none')
  expect(compactQueries).toEqual(['ai-chat-textarea (width < 450px)'])
  expect(compactSelectors).toEqual([
    expect.stringContaining(
      '.footer:has(> .footer-right button[data-ai-context-usage]):has(> .footer-right button[data-ai-running-status]) > .footer-left .model-self-adaptive',
    ),
  ])
  expect(sceneDeclarations['--ai-footer-selector-label-display']).toBe('none')
  expect(settingsDeclarations.display).toBe('none')
})
