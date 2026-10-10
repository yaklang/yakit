import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SelectSearch } from '../TableVirtualResize'
import type { SelectSearchProps } from '../TableVirtualResizeType'

vi.mock('@/utils/globalShortcutKey/events/useShortcutKeyTrigger', () => ({ default: () => {} }))
vi.mock('@/utils/globalShortcutKey/events/global', () => ({ ShortcutKeyFocusType: { TableVirtual: 'table' } }))
vi.mock('@/utils/globalShortcutKey/shortcutKeyFocusHook/ShortcutKeyFocusHook', () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))
vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({ t: (key: string) => key, i18n: { language: 'en' } }),
}))
vi.mock('@/utils/kv', () => ({ getRemoteValue: async () => undefined }))
// jsdom 无布局，ahooks useVirtualList 拿不到容器高度导致列表恒为空；测试只关选项渲染与点击，直接平铺全部选项
vi.mock('ahooks', async (importOriginal) => {
  const mod = await importOriginal<any>()
  return {
    ...mod,
    useVirtualList: (data: any[]) => [data.map((data, index) => ({ data, index }))],
  }
})
// CI 的根配置将样式模块替换为空对象；为类名断言提供稳定映射。
vi.mock('../TableVirtualResize.module.scss', () => ({
  default: {
    'select-item': 'select-item',
    'select-item-active': 'select-item-active',
    'select-item-active-single': 'select-item-active-single',
    'check-icon': 'check-icon',
  },
}))
vi.mock('../../yakitUI/YakitInput/YakitInput', () => ({ YakitInput: () => null }))
vi.mock('../../yakitUI/YakitSelect/YakitSelect', () => ({ YakitSelect: () => null }))
vi.mock('../../yakitUI/YakitTag/YakitTag', () => ({ YakitTag: () => null }))
vi.mock('@/components/yakitUI/YakitDatePicker/YakitDatePicker', () => ({
  YakitDatePicker: { RangePicker: () => null },
}))
vi.mock('../../yakitUI/YakitSpin/YakitSpin', () => ({
  YakitSpin: ({ children }: { children: ReactNode }) => <>{children}</>,
}))

beforeEach(() => {
  // useVirtualList 依赖容器尺寸，在 jsdom 中提供可见视口
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(300)
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(600)
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(private callback: ResizeObserverCallback) {}
      observe(target: Element) {
        this.callback(
          [{ target, contentRect: { width: 600, height: 300 } } as ResizeObserverEntry],
          this as unknown as ResizeObserver,
        )
      }
      unobserve() {}
      disconnect() {}
    },
  )
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

// 夹具用中性选项值：SelectSearch 是通用筛选组件，颜色/状态等筛选语义由业务方通过 filters 配置传入
const options = [
  { value: 'a', label: '选项A' },
  { value: 'b', label: '选项B' },
]

const renderSelectSearch = (props: Partial<SelectSearchProps> = {}) => {
  const onSelect = vi.fn()
  const onClose = vi.fn()
  const onQuery = vi.fn()
  const base: SelectSearchProps = {
    originalList: options,
    value: [],
    onSelect,
    onClose,
    onQuery,
    filterProps: {},
    ...props,
  }
  const view = (p: SelectSearchProps = base) => <SelectSearch {...p} />
  const result = render(view())
  return {
    ...result,
    onSelect,
    rerenderProps: (p: Partial<SelectSearchProps>) => result.rerender(view({ ...base, ...p })),
  }
}

describe('SelectSearch 多选选项渲染', () => {
  it('filterOptionRender 自定义渲染替代默认文本', () => {
    renderSelectSearch({
      filterProps: {
        filterMultiple: true,
        filterOptionRender: (d) => <em>{`custom-${d.label}`}</em>,
      },
    })
    expect(screen.getByText('custom-选项A')).toBeInTheDocument()
    expect(screen.getByText('custom-选项B')).toBeInTheDocument()
    // 默认文本回退分支不应出现
    expect(screen.queryByText('选项A')).not.toBeInTheDocument()
    expect(screen.queryByText('选项B')).not.toBeInTheDocument()
  })

  it('未传 filterOptionRender 时回退为 label 文本', () => {
    renderSelectSearch({ filterProps: { filterMultiple: true } })
    expect(screen.getByText('选项A')).toBeInTheDocument()
    expect(screen.getByText('选项B')).toBeInTheDocument()
  })

  it('点击选项回调 onSelect 且选中态样式随 value 更新', () => {
    const { onSelect, rerenderProps } = renderSelectSearch({ filterProps: { filterMultiple: true } })
    const firstItem = screen.getByText('选项A').closest('div')

    // 未选中时点击：追加到选中集合
    fireEvent.click(firstItem as HTMLElement)
    expect(onSelect).toHaveBeenCalledExactlyOnceWith(['a'], options[0])

    // 父组件受控回填后：选项带选中态样式与勾选图标
    rerenderProps({ value: ['a'] })
    const firstItemChecked = screen.getByText('选项A').closest('div')
    expect(firstItemChecked).toHaveClass('select-item-active')
    expect(firstItemChecked?.querySelector('.check-icon')).toBeInTheDocument()

    // 已选中时再点击：从选中集合移除
    fireEvent.click(firstItemChecked as HTMLElement)
    expect(onSelect).toHaveBeenLastCalledWith([], options[0])
  })
})

describe('SelectSearch 单选选项渲染', () => {
  it('filterOptionRender 自定义渲染替代默认文本', () => {
    renderSelectSearch({
      value: '',
      filterProps: { filterOptionRender: (d) => <em>{`custom-${d.label}`}</em> },
    })
    expect(screen.getByText('custom-选项A')).toBeInTheDocument()
    expect(screen.queryByText('选项A')).not.toBeInTheDocument()
  })

  it('未传 filterOptionRender 时回退 label，label 缺失时回退 value', () => {
    renderSelectSearch({
      value: '',
      originalList: [
        { value: 'a', label: '选项A' },
        { value: 'no-label', label: '' },
      ],
    })
    expect(screen.getByText('选项A')).toBeInTheDocument()
    expect(screen.getByText('no-label')).toBeInTheDocument()
  })

  it('点击选项回调 onSelect(值, 选项)', () => {
    const { onSelect } = renderSelectSearch({ value: '' })
    fireEvent.click(screen.getByText('选项A'))
    expect(onSelect).toHaveBeenCalledExactlyOnceWith('a', options[0])
  })

  it('filtersSelectAll 未设 textAll 时显示 all，设置后显示自定义文案并按 valueAll 回调', () => {
    const { onSelect } = renderSelectSearch({
      value: '',
      filterProps: { filtersSelectAll: { isAll: true } },
    })
    fireEvent.click(screen.getByText('all'))
    expect(onSelect).toHaveBeenCalledExactlyOnceWith('all', { value: 'all', label: 'all' })

    const { onSelect: onSelect2 } = renderSelectSearch({
      value: '',
      filterProps: { filtersSelectAll: { isAll: true, textAll: '全部', valueAll: '*' } },
    })
    fireEvent.click(screen.getByText('全部'))
    expect(onSelect2).toHaveBeenCalledExactlyOnceWith('*', { value: '*', label: '全部' })
  })
})
