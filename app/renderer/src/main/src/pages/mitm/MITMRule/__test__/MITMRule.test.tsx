import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import MITMRule from '../MITMRule'

const { ipcInvoke } = vi.hoisted(() => ({ ipcInvoke: vi.fn() }))
// MITMRule.tsx 模块顶层执行 window.require('electron')，必须在模块导入前就位
vi.hoisted(() => {
  ;(window as any).require = (name: string) => (name === 'electron' ? { ipcRenderer: { invoke: ipcInvoke } } : {})
})

vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({
    t: (key: string) => key,
    i18n: { language: 'en' },
    i18nRefresh: 0,
  }),
}))
vi.mock('../../MITMHacker/utils', () => ({
  grpcClientMITMContentReplacerUpdate: () => ({ on: vi.fn(), remove: vi.fn() }),
  grpcDisableTrafficGuard: vi.fn(),
  grpcMITMContentReplacers: vi.fn(async () => ({})),
}))
vi.mock('@/utils/notification', () => ({ failed: vi.fn(), success: vi.fn(), warn: vi.fn() }))
vi.mock('@/utils/openWebsite', () => ({ openExternalWebsite: vi.fn() }))
vi.mock('@/utils/kv', () => ({ setRemoteValue: vi.fn(async () => {}), getRemoteValue: vi.fn(async () => '') }))
vi.mock('../MITMRuleFromModal', () => ({ MITMRuleFromModal: () => null }))
vi.mock('../MITMRuleConfigure/MITMRuleConfigure', () => ({ MITMRuleExport: () => null, MITMRuleImport: () => null }))
// 用轻量假表格驱动交互：暴露全选、列筛选回调，回显筛选/搜索后的可见行
vi.mock('@/components/TableVirtualResize/TableVirtualResize', () => ({
  TableVirtualResize: (props: any) => (
    <div>
      <span data-testid="fake-table-is-all">{`${props.rowSelection?.isAll ?? false}`}</span>
      <span data-testid="fake-table-rows">{props.data.map((r: any) => `${r.Id}:${r.VerboseName}`).join(',')}</span>
      <button
        data-testid="fake-select-all"
        onClick={() =>
          props.rowSelection?.onSelectAll(
            props.data.map((r: any) => `${r.Id}`),
            props.data,
            true,
          )
        }
      >
        fake-select-all
      </button>
      <button
        data-testid="fake-filter-red"
        onClick={() => props.onChange(1, 20, {}, { Color: ['red'], NoReplace: '' })}
      >
        fake-filter-red
      </button>
      <button data-testid="fake-filter-clear" onClick={() => props.onChange(1, 20, {}, { Color: [], NoReplace: '' })}>
        fake-filter-clear
      </button>
      {props.title}
      {props.extra}
    </div>
  ),
}))
vi.mock('@/components/yakitUI/YakitInput/YakitInput', () => ({
  YakitInput: Object.assign(() => null, {
    Search: (props: any) => (
      <input
        data-testid="rule-search"
        value={props.value ?? ''}
        onChange={(e: any) => props.onChange(e)}
        onKeyDown={(e: any) => {
          if (e.key === 'Enter') {
            props.onPressEnter?.(e)
            props.onSearch?.(e.currentTarget.value)
          }
        }}
      />
    ),
  }),
}))

const makeRule = (index: number, name: string, color: string, noReplace: boolean) => ({
  Id: index,
  Index: index,
  VerboseName: name,
  Rule: `rule-${name}`,
  Color: color,
  NoReplace: noReplace,
  Disabled: false,
  ExactMatch: false,
  RegexpGroups: [],
  Result: '',
  EffectiveURL: '',
  EnableForRequest: false,
  EnableForResponse: true,
  EnableForBody: true,
  EnableForHeader: true,
  EnableForURI: false,
  ExtraRepeat: false,
  Drop: false,
  ExtraTag: [],
  ExtraHeaders: [],
  ExtraCookies: [],
})

const baseRules = [
  makeRule(1, 'R1', 'red', false),
  makeRule(2, 'R2', 'blue', false),
  makeRule(3, 'R3', 'red', true),
  makeRule(4, 'R4', 'blue', true),
]

beforeEach(() => {
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(300)
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(600)
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(private callback: ResizeObserverCallback) {}
      observe(target: Element) {
        // 宽度 >= 670 时表头才内联渲染搜索框
        this.callback(
          [{ target, contentRect: { width: 800, height: 300 } } as ResizeObserverEntry],
          this as unknown as ResizeObserver,
        )
      }
      unobserve() {}
      disconnect() {}
    },
  )
  ipcInvoke.mockImplementation((channel: string) => {
    if (channel === 'GetCurrentRules') return Promise.resolve({ Rules: baseRules })
    if (channel === 'QueryMITMReplacerRules') {
      // 关键词搜索仅命中 R2/R3
      return Promise.resolve({ Rules: { Rules: [baseRules[1], baseRules[2]] } })
    }
    return Promise.resolve({})
  })
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  ipcInvoke.mockReset()
})

const renderRuleTable = async () => {
  // ruleUse=historyAnalysis 走无 Drawer 的纯 div 渲染分支，便于 jsdom 断言
  render(<MITMRule ruleUse="historyAnalysis" visible status={'ok' as any} />)
  const rows = await screen.findByTestId('fake-table-rows')
  await waitFor(() => expect(rows).toHaveTextContent('1:R1,2:R2,3:R3,4:R4'))
  return {
    rows: () => screen.getByTestId('fake-table-rows').textContent ?? '',
    isAll: () => screen.getByTestId('fake-table-is-all').textContent ?? '',
    batchButton: () => screen.getByText('YakitButton.batchOperation').closest('button') as HTMLButtonElement,
    selectAll: () => fireEvent.click(screen.getByTestId('fake-select-all')),
    filterRed: () => fireEvent.click(screen.getByTestId('fake-filter-red')),
  }
}

const openBatchMenuAndClick = async (label: string) => {
  fireEvent.mouseEnter(screen.getByText('YakitButton.batchOperation'))
  const item = await screen.findByText(label)
  fireEvent.click(item)
}

describe('MITMRule 表格状态联动', () => {
  it('切换颜色筛选后清空全选与选中，批量删除只作用于可见行', async () => {
    const table = await renderRuleTable()
    expect(table.batchButton()).toBeDisabled()

    table.selectAll()
    await waitFor(() => expect(table.isAll()).toBe('true'))
    expect(table.batchButton()).toBeEnabled()

    // 全选后切换筛选：选中与全选必须被清空（否则批量操作会命中被隐藏的行）
    table.filterRed()
    await waitFor(() => expect(table.rows()).toBe('1:R1,3:R3'))
    expect(table.isAll()).toBe('false')
    expect(table.batchButton()).toBeDisabled()

    // 在筛选后的可见行上重新全选，批量删除仅删除可见的红色规则
    table.selectAll()
    await waitFor(() => expect(table.batchButton()).toBeEnabled())
    await openBatchMenuAndClick('YakitButton.delete')
    // 红色筛选仍生效时可见行为空（红色规则已删除）
    await waitFor(() => expect(table.rows()).toBe(''))
    // 清除筛选后确认隐藏的蓝色规则未被批量删除
    fireEvent.click(screen.getByTestId('fake-filter-clear'))
    await waitFor(() => expect(table.rows()).toBe('2:R2,4:R4'))
  })

  it('切换筛选后批量禁用只作用于可见行', async () => {
    const table = await renderRuleTable()

    table.filterRed()
    await waitFor(() => expect(table.rows()).toBe('1:R1,3:R3'))
    table.selectAll()
    await waitFor(() => expect(table.batchButton()).toBeEnabled())

    await openBatchMenuAndClick('YakitButton.disable')
    // 清除筛选后可见全量：被禁用的红色规则沉底，隐藏的蓝色规则不受影响
    fireEvent.click(screen.getByTestId('fake-filter-clear'))
    await waitFor(() => expect(table.rows()).toBe('2:R2,4:R4,1:R1,3:R3'))
  })

  it('清空搜索关键词后保留颜色列筛选', async () => {
    const table = await renderRuleTable()

    table.filterRed()
    await waitFor(() => expect(table.rows()).toBe('1:R1,3:R3'))

    // 搜索命中 R2/R3，叠加红色筛选后仅剩 R3（搜索框需等待防抖 resize 后渲染）
    const search = await screen.findByTestId('rule-search')
    fireEvent.change(search, { target: { value: 'keyword' } })
    fireEvent.keyDown(search, { key: 'Enter' })
    await waitFor(() => expect(table.rows()).toBe('3:R3'))

    // 清空关键词：搜索态退出，但颜色筛选保留
    fireEvent.change(search, { target: { value: '' } })
    fireEvent.keyDown(search, { key: 'Enter' })
    await waitFor(() => expect(table.rows()).toBe('1:R1,3:R3'))
    expect((screen.getByTestId('rule-search') as HTMLInputElement).value).toBe('')
  })
})
