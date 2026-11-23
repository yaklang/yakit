import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import postcss from 'postcss'
import { compile } from 'sass'
import { expect, it } from 'vitest'

it('底栏先收起场景和设置，宽度小于 450px 时才收起模型', () => {
  const path = resolve(dirname(fileURLToPath(import.meta.url)), '../template.module.scss')
  const css = postcss.parse(compile(path).css)
  const declarations: Record<string, string> = {}
  const compactQueries: string[] = []
  const sceneDeclarations: Record<string, string> = {}
  const settingsDeclarations: Record<string, string> = {}
  css.walkRules((rule) => {
    if (!rule.selector.includes('.model-self-adaptive')) return
    rule.walkDecls('--ai-footer-selector-label-display', (decl) => {
      if (decl.value !== 'none') return
      const parent = rule.parent
      expect(parent?.type).toBe('atrule')
      if (parent?.type === 'atrule') compactQueries.push(parent.params)
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
  expect(sceneDeclarations['--ai-footer-selector-label-display']).toBe('none')
  expect(settingsDeclarations.display).toBe('none')
})
