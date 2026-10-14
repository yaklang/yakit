import { describe, expect, it } from 'vitest'
import { filterColorTag, parseCellStyleVars, resetEmptyVirtualTableViewport } from '../utils'

describe('resetEmptyVirtualTableViewport', () => {
  it('removes the stale scroll range when a deeply-scrolled virtual table is cleared', () => {
    const container = document.createElement('div')
    const wrapper = document.createElement('div')
    container.scrollTop = 182_000
    wrapper.style.height = '182028px'
    wrapper.style.marginTop = '181972px'

    expect(resetEmptyVirtualTableViewport(0, container, wrapper)).toBe(true)
    expect(container.scrollTop).toBe(0)
    expect(wrapper.style.height).toBe('0px')
    expect(wrapper.style.marginTop).toBe('0px')
  })

  it('does not disturb a populated viewport', () => {
    const container = document.createElement('div')
    const wrapper = document.createElement('div')
    container.scrollTop = 280
    wrapper.style.height = '2800px'

    expect(resetEmptyVirtualTableViewport(1, container, wrapper)).toBe(false)
    expect(container.scrollTop).toBe(280)
    expect(wrapper.style.height).toBe('2800px')
  })
})

describe('parseCellStyleVars 彩色单元格内联变量', () => {
  it('无颜色内容返回空对象（不注入任何变量）', () => {
    expect(parseCellStyleVars(undefined)).toEqual({})
    expect(parseCellStyleVars('')).toEqual({})
    expect(parseCellStyleVars('table-cell-bg-')).toEqual({})
  })

  it('单色非红：注入 bg/hover/文字三态变量，不带 is-red 标记', () => {
    const vars = parseCellStyleVars('table-cell-bg-blue') as Record<string, string>

    expect(vars['--vt-cell-bg']).toBe('var(--Colors-Use-Blue-Border)')
    expect(vars['--vt-cell-bg-hover']).toBe('var(--Colors-Use-Blue-Hover)')
    // hover 态沿用 cell 文字色（旧 hover+cell 组合行为）
    expect(vars['--vt-cell-text']).toBe('var(--yakit-colors-Blue-100)')
    expect(vars['--vt-cell-text-hover']).toBe('var(--yakit-colors-Blue-100)')
    expect(vars['--vt-cell-text-active']).toBe('var(--yakit-colors-Blue-100)')
    expect(vars['--vt-cell-is-red']).toBeUndefined()
    expect(Object.keys(vars)).toHaveLength(5)
  })

  it('单色红：文字色为 On-Primary、active 换浅色、带 is-red 标记', () => {
    const vars = parseCellStyleVars('table-cell-bg-red') as Record<string, string>

    expect(vars['--vt-cell-bg']).toBe('var(--Colors-Use-Error-Primary)')
    expect(vars['--vt-cell-bg-hover']).toBe('var(--Colors-Use-Error-Pressed)')
    expect(vars['--vt-cell-text']).toBe('var(--Colors-Use-Error-On-Primary)')
    expect(vars['--vt-cell-text-hover']).toBe('var(--Colors-Use-Error-On-Primary)')
    expect(vars['--vt-cell-text-active']).toBe('var(--yakit-colors-Error-100)')
    expect(vars['--vt-cell-is-red']).toBe('true')
  })

  it('双色：注入原始渐变与 20/30/40 三档预混渐变，颜色按升序', () => {
    const vars = parseCellStyleVars('table-cell-bg-blue table-cell-bg-cyan') as Record<string, string>

    expect(vars['--vt-cell-gradient']).toBe('var(--Colors-Use-Blue-Primary), var(--Colors-Use-Cyan-Primary)')
    expect(vars['--vt-cell-gradient-20']).toBe(
      'color-mix(in srgb, var(--Colors-Use-Blue-Primary) 20%, transparent), color-mix(in srgb, var(--Colors-Use-Cyan-Primary) 20%, transparent)',
    )
    expect(vars['--vt-cell-gradient-30']).toContain('var(--Colors-Use-Cyan-Primary) 30%')
    expect(vars['--vt-cell-gradient-40']).toContain('var(--Colors-Use-Blue-Primary) 40%')
    expect(vars['--vt-cell-bg']).toBeUndefined()
    expect(Object.keys(vars)).toHaveLength(4)
  })

  it('超过三种颜色只取排序后的前三种', () => {
    const vars = parseCellStyleVars(
      'table-cell-bg-yellow table-cell-bg-blue table-cell-bg-red table-cell-bg-green',
    ) as Record<string, string>

    // blue < cyan < green < grey < orange < purple < red < yellow 升序取前三（red 用 Error token）
    expect(vars['--vt-cell-gradient']).toBe(
      'var(--Colors-Use-Blue-Primary), var(--Colors-Use-Green-Primary), var(--Colors-Use-Error-Primary)',
    )
  })

  it('真实链路：filterColorTag 的输出可直接作为输入', () => {
    const cellClassName = filterColorTag('YAKIT_COLOR_GREEN|YAKIT_COLOR_BLUE')
    expect(cellClassName).toBe('table-cell-bg-blue table-cell-bg-green')

    const vars = parseCellStyleVars(cellClassName) as Record<string, string>
    expect(vars['--vt-cell-gradient']).toBe('var(--Colors-Use-Blue-Primary), var(--Colors-Use-Green-Primary)')
  })
})
