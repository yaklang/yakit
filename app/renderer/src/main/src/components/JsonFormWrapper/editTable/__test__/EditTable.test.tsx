import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import type { ColumnSchemaProps } from '../EditTable'

vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({ t: (key: string) => key }),
}))
vi.mock('@/utils/notification', () => ({ failed: vi.fn(), warn: vi.fn() }))
vi.mock('@/components/yakitUI/YakitDropdownMenu/YakitDropdownMenu', () => ({
  YakitDropdownMenu: ({ children }: { children?: any }) => <>{children}</>,
}))
vi.mock('@/components/yakitUI/YakitInput/YakitInput', () => {
  const YakitInput = (props: any) => <input {...props} />
  YakitInput.TextArea = (props: any) => <textarea {...props} />
  return { YakitInput }
})
vi.mock('@/components/yakitUI/YakitSelect/YakitSelect', () => ({
  YakitSelect: (props: any) => <select {...props} />,
}))
vi.mock('@/components/yakitUI/YakitSwitch/YakitSwitch', () => ({
  YakitSwitch: (props: any) => <input type="checkbox" {...props} />,
}))

import { EditTable } from '../EditTable'

const getRowInputs = (container: HTMLElement) => container.querySelectorAll('.ant-table-tbody input')

describe('EditTable 编辑回填', () => {
  beforeAll(() => {
    if (!window.matchMedia) {
      window.matchMedia = (() => ({
        matches: false,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })) as unknown as typeof window.matchMedia
    }
    if (!window.ResizeObserver) {
      window.ResizeObserver = class {
        observe() {}
        unobserve() {}
        disconnect() {}
      } as unknown as typeof window.ResizeObserver
    }
  })
  afterEach(cleanup)

  it('编辑行时缺失字段回填 schema 默认值', async () => {
    const columnSchema: ColumnSchemaProps = {
      items: {
        properties: {
          a: { type: 'string', title: '列A' },
          b: { type: 'string', title: '列B', default: '默认B' },
        },
        require: [],
      },
    }
    const { container } = render(<EditTable columnSchema={columnSchema} uiSchema={{}} value={[{ a: 'z' }]} />)

    await waitFor(() => expect(screen.getByText('z')).toBeTruthy())
    fireEvent.doubleClick(screen.getByText('z').closest('tr') as HTMLElement)

    await waitFor(() => expect(getRowInputs(container).length).toBe(2))
    const inputs = getRowInputs(container)
    expect(inputs[0]).toHaveValue('z')
    expect(inputs[1]).toHaveValue('默认B')
  })

  it('编辑行时缺失字段回填 false、0 与空字符串默认值', async () => {
    const onChange = vi.fn()
    const columnSchema: ColumnSchemaProps = {
      items: {
        properties: {
          a: { type: 'string', title: '列A' },
          flag: { type: 'boolean', title: '开关', default: false },
          count: { type: 'string', title: '数量', default: 0 },
          note: { type: 'string', title: '备注', default: '' },
        },
        require: [],
      },
    }
    const { container } = render(
      <EditTable columnSchema={columnSchema} uiSchema={{}} value={[{ a: 'z' }]} onChange={onChange} />,
    )

    await waitFor(() => expect(screen.getByText('z')).toBeTruthy())
    fireEvent.doubleClick(screen.getByText('z').closest('tr') as HTMLElement)

    await waitFor(() => expect(getRowInputs(container).length).toBe(4))
    const inputs = getRowInputs(container)
    expect(inputs[0]).toHaveValue('z')
    expect(inputs[1]).not.toBeChecked()
    expect(inputs[2]).toHaveValue('0')
    expect(inputs[3]).toHaveValue('')

    fireEvent(inputs[0], new FocusEvent('focusout', { bubbles: true }))
    await waitFor(() => expect(onChange).toHaveBeenCalled(), { timeout: 2000 })
    expect(onChange).toHaveBeenCalledWith([expect.objectContaining({ a: 'z', flag: false, count: 0, note: '' })])
  })

  it('失焦保存后再编辑其他行，表单不残留上一行已改数据', async () => {
    const columnSchema: ColumnSchemaProps = {
      items: {
        properties: {
          a: { type: 'string', title: '列A' },
          b: { type: 'string', title: '列B' },
        },
        require: [],
      },
    }
    const { container } = render(
      <EditTable columnSchema={columnSchema} uiSchema={{}} value={[{ a: 'x', b: 'y' }, { a: 'z' }]} />,
    )

    await waitFor(() => expect(screen.getByText('x')).toBeTruthy())
    fireEvent.doubleClick(screen.getByText('x').closest('tr') as HTMLElement)
    await waitFor(() => expect(getRowInputs(container).length).toBe(2))

    fireEvent.change(getRowInputs(container)[1], { target: { value: 'y2' } })
    fireEvent(getRowInputs(container)[1], new FocusEvent('focusout', { bubbles: true }))

    // 失焦自动保存后退出编辑态
    await waitFor(() => expect(getRowInputs(container).length).toBe(0), { timeout: 2000 })

    fireEvent.doubleClick(screen.getByText('z').closest('tr') as HTMLElement)
    await waitFor(() => expect(getRowInputs(container).length).toBe(2))
    const inputs = getRowInputs(container)
    expect(inputs[0]).toHaveValue('z')
    expect(inputs[1]).toHaveValue('')
  })
})
