import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type * as FuzzerEditorMenuLayout from '../fuzzerEditorMenuLayout'

/**
 * 叠放约定（对齐当前实现）：
 * - Monaco 竖向滚动条 .scrollbar.visible ≈ z-index:11
 * - 面板是 bar 根下 groups 的兄弟；仅给按钮组加 z-index 盖不住滚动条
 * - content widget 须 allowEditorOverflow（挂到 overflowingContentWidgets）且 z-index≥20
 */
const here = path.dirname(fileURLToPath(import.meta.url))
const scssPath = path.resolve(here, '../HTTPFuzzerEditorMenu.module.scss')
const scss = readFileSync(scssPath, 'utf8')
const editerMenuFunPath = path.resolve(here, '../../../components/yakitUI/YakitEditor/fizzMenu/editerMenuFun.tsx')
const editerMenuFunSrc = readFileSync(editerMenuFunPath, 'utf8')

const blockBody = (className: string) => {
  const escaped = className.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  // Prefer multi-line close (`\n}`) so nested SCSS rules do not truncate; fall back to
  // first `}` for one-line / minified blocks (assumes no nested rules in that form).
  const multi = new RegExp('\\.' + escaped + '\\s*\\{([\\s\\S]*?)\\n\\}')
  const single = new RegExp('\\.' + escaped + '\\s*\\{([^}]*)\\}')
  const m = scss.match(multi) || scss.match(single)
  expect(m, 'missing .' + className + ' block').toBeTruthy()
  return m![1]
}

const hasZIndexAtLeast = (body: string, min: number) => {
  const m = body.match(/^\s*z-index:\s*(\d+)\s*;/m)
  expect(m, 'expected z-index property in block, got: ' + body.slice(0, 160)).toBeTruthy()
  expect(Number(m![1])).toBeGreaterThanOrEqual(min)
}

describe('HTTPFuzzerEditorMenu stacking contract (vs Monaco scrollbar ~11)', () => {
  it('bar root z-index >= 20 so sibling panel can cover scrollbar', () => {
    hasZIndexAtLeast(blockBody('http-fuzzer-click-editor'), 20)
    hasZIndexAtLeast(blockBody('http-fuzzer-range-editor-body'), 20)
    hasZIndexAtLeast(blockBody('http-fuzzer-read-editor'), 20)
  })

  it('dropdown panel class z-index >= 20', () => {
    hasZIndexAtLeast(blockBody('http-fuzzer-click-editor-menu'), 20)
    hasZIndexAtLeast(blockBody('http-fuzzer-range-editor-menu'), 20)
    hasZIndexAtLeast(blockBody('http-fuzzer-range-read-only-editor-menu'), 20)
  })

  it('SmartDecode float layer stays above normal panel (1050)', () => {
    expect(scss).toMatch(/\.http-fuzzer-range-editor-menu\.smart-decode-float-layer\s*\{[\s\S]*?z-index:\s*1050/)
    expect(scss).toMatch(/\.smart-decode-float-layer\s*,\s*\.http-fuzzer-range-editor-menu\.smart-decode-float-layer/)
  })

  it('editerMenuFun content widgets use allowEditorOverflow (overflowingContentWidgets)', () => {
    const hits = editerMenuFunSrc.match(/allowEditorOverflow:\s*true/g) || []
    expect(hits.length).toBeGreaterThanOrEqual(2)
    expect(editerMenuFunSrc).toMatch(/domNode\.style\.zIndex\s*=\s*['"]20['"]/)
  })
})

vi.mock('../fuzzerEditorMenuLayout', async (importOriginal) => {
  const mod = await importOriginal<typeof FuzzerEditorMenuLayout>()
  return {
    ...mod,
    useMenuBarLayout: () => true,
    useAnchoredMenuPanel: () => ({
      position: 'absolute' as const,
      visibility: 'visible' as const,
      maxWidth: 360,
    }),
  }
})

import { FuzzerEditorMenuBar, type FuzzerEditorMenuGroup } from '../fuzzerEditorMenuBar'

describe('FuzzerEditorMenuBar panel mount structure', () => {
  afterEach(() => {
    cleanup()
  })

  it('panel mounts under [data-menu-bar] as sibling of groups', () => {
    const groups: FuzzerEditorMenuGroup[] = [
      {
        id: 'click',
        className: 'group-click',
        simpleClassName: 'simple',
        items: [
          {
            id: 'insert-tag',
            label: '????',
            icon: <span>t</span>,
            className: 'item',
            panelClassName: 'panel-cls',
            renderPanel: () => <div data-testid="panel-body">panel</div>,
          },
        ],
      },
      {
        id: 'codec',
        className: 'group-codec',
        simpleClassName: 'simple',
        items: [
          {
            id: 'encode',
            label: '??',
            icon: <span>e</span>,
            className: 'item',
          },
        ],
      },
    ]

    const { container } = render(<FuzzerEditorMenuBar groups={groups} lang="zh" className="bar-root" />)
    fireEvent.click(screen.getByText('????'))

    const bar = container.querySelector('[data-menu-bar]') as HTMLElement
    expect(bar).toBeTruthy()
    const panel = bar.querySelector(':scope > [data-menu-panel]') as HTMLElement
    expect(panel).toBeTruthy()
    expect(panel.className).toContain('panel-cls')
    expect(panel.parentElement).toBe(bar)
    expect(bar.querySelector(':scope > .group-click')).toBeTruthy()
    expect(bar.querySelector(':scope > .group-codec')).toBeTruthy()
    expect(bar.querySelector('.group-click [data-menu-panel]')).toBeNull()
  })
})
