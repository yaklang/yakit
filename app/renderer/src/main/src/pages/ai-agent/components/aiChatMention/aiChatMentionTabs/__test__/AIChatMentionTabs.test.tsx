import React from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AIMentionTabsEnum } from '../../../../defaultConstant'
import { AIChatMentionTabs } from '../AIChatMentionTabs'

vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({
    t: (key: string) => key,
    i18nRefresh: 0,
  }),
}))

vi.mock('@yakit-libs/yakit-ui-icons/outline', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@yakit-libs/yakit-ui-icons/outline')>()
  return {
    ...actual,
    ChevronDoubleLeftOutlined: () => <span>left</span>,
    ChevronDoubleRightOutlined: () => <span>right</span>,
  }
})

const tabs = [
  { value: AIMentionTabsEnum.All, label: 'AIMentionTabs.all' },
  { value: AIMentionTabsEnum.Forge_Name, label: 'AIMentionTabs.skill' },
  { value: AIMentionTabsEnum.Tool, label: 'AIMentionTabs.tool' },
  { value: AIMentionTabsEnum.KnowledgeBase, label: 'AIMentionTabs.knowledgeBase' },
]

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

function mockTabsOverflow(
  tabsEl: HTMLElement,
  opts: { scrollWidth: number; clientWidth: number; scrollLeft?: number },
) {
  Object.defineProperty(tabsEl, 'scrollWidth', { configurable: true, value: opts.scrollWidth })
  Object.defineProperty(tabsEl, 'clientWidth', { configurable: true, value: opts.clientWidth })
  Object.defineProperty(tabsEl, 'scrollLeft', {
    configurable: true,
    writable: true,
    value: opts.scrollLeft ?? 0,
  })
  tabsEl.scrollBy = vi.fn() as unknown as typeof tabsEl.scrollBy
}

describe('AIChatMentionTabs', () => {
  it('点击 Tab 会回调 onChange', () => {
    const onChange = vi.fn()
    render(<AIChatMentionTabs tabs={tabs} activeKey={AIMentionTabsEnum.All} tabCounts={{}} onChange={onChange} />)
    fireEvent.click(screen.getByText('AIMentionTabs.skill'))
    expect(onChange).toHaveBeenCalledWith(AIMentionTabsEnum.Forge_Name)
  })

  it('「全部」不展示角标；其它 Tab 有 count>0 时展示', () => {
    render(
      <AIChatMentionTabs
        tabs={tabs}
        activeKey={AIMentionTabsEnum.All}
        tabCounts={{
          [AIMentionTabsEnum.All]: 99,
          [AIMentionTabsEnum.Forge_Name]: 3,
          [AIMentionTabsEnum.Tool]: 0,
        }}
        onChange={vi.fn()}
      />,
    )
    const allBtn = screen.getByText('AIMentionTabs.all').closest('button')!
    const forgeBtn = screen.getByText('AIMentionTabs.skill').closest('button')!
    const toolBtn = screen.getByText('AIMentionTabs.tool').closest('button')!
    expect(allBtn.textContent).toBe('AIMentionTabs.all')
    expect(forgeBtn.textContent).toContain('3')
    expect(toolBtn.textContent).toBe('AIMentionTabs.tool')
  })

  it('选中 Tab 带 data-mention-tab-active', () => {
    render(<AIChatMentionTabs tabs={tabs} activeKey={AIMentionTabsEnum.Tool} tabCounts={{}} onChange={vi.fn()} />)
    expect(screen.getByText('AIMentionTabs.tool').closest('button')).toHaveAttribute('data-mention-tab-active', 'true')
    expect(screen.getByText('AIMentionTabs.all').closest('button')).not.toHaveAttribute('data-mention-tab-active')
  })

  it('溢出时显示右箭头，点击会 scrollBy', () => {
    const { container, rerender } = render(
      <AIChatMentionTabs tabs={tabs} activeKey={AIMentionTabsEnum.All} tabCounts={{}} onChange={vi.fn()} />,
    )
    const tabsEl = container.querySelector('[class*="mention-tabs"]:not([class*="wrap"]):not([class*="arrow"])')
    expect(tabsEl).toBeTruthy()
    mockTabsOverflow(tabsEl as HTMLElement, { scrollWidth: 500, clientWidth: 120, scrollLeft: 0 })
    // 触发 updateTabScroll（tabs length 变化）
    rerender(
      <AIChatMentionTabs
        tabs={[...tabs, { value: AIMentionTabsEnum.Browser, label: 'AIMentionTabs.browser' }]}
        activeKey={AIMentionTabsEnum.All}
        tabCounts={{}}
        onChange={vi.fn()}
      />,
    )
    const right = screen.getByLabelText('scroll-tabs-right')
    expect(screen.queryByLabelText('scroll-tabs-left')).not.toBeInTheDocument()
    fireEvent.click(right)
    expect((tabsEl as HTMLElement).scrollBy).toHaveBeenCalledWith({ left: 140 })
  })

  it('已向右滚动时显示左箭头', () => {
    const { container, rerender } = render(
      <AIChatMentionTabs tabs={tabs} activeKey={AIMentionTabsEnum.All} tabCounts={{}} onChange={vi.fn()} />,
    )
    const tabsEl = container.querySelector('[class*="mention-tabs"]:not([class*="wrap"]):not([class*="arrow"])')!
    mockTabsOverflow(tabsEl as HTMLElement, { scrollWidth: 500, clientWidth: 120, scrollLeft: 80 })
    fireEvent.scroll(tabsEl)
    rerender(
      <AIChatMentionTabs tabs={[...tabs]} activeKey={AIMentionTabsEnum.Forge_Name} tabCounts={{}} onChange={vi.fn()} />,
    )
    // activeKey 变化会 scrollActiveTabIntoView + updateTabScroll
    expect(screen.getByLabelText('scroll-tabs-left')).toBeInTheDocument()
  })
})
