import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import postcss from 'postcss'
import { compile } from 'sass'
import { expect, it } from 'vitest'

it('输入框宽度小于 530px 时底栏模型仅显示图标', () => {
  const path = resolve(dirname(fileURLToPath(import.meta.url)), '../template.module.scss')
  const css = postcss.parse(compile(path).css)
  const declarations: Record<string, string> = {}
  css.walkAtRules('container', (query) => {
    if (query.params !== 'ai-chat-textarea (width < 530px)') return
    query.walkRules((rule) => {
      if (!rule.selector.includes('> .footer-left .model-self-adaptive')) return
      rule.walkDecls((decl) => {
        declarations[decl.prop] = decl.value
      })
    })
  })
  expect(declarations['--ai-footer-selector-label-display']).toBe('none')
  expect(declarations.width).toBe('24px')
})
