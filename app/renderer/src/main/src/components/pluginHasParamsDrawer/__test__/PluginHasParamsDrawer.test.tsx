import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import type { CustomPluginExecuteFormValue } from '@/pages/plugins/operator/localPluginExecuteDetailHeard/LocalPluginExecuteDetailHeardType'
import type { YakParamProps } from '@/pages/plugins/pluginsType'

vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({ t: (key: string) => key }),
}))
vi.mock('@/utils/kv', () => ({ getRemoteValue: vi.fn(async () => ''), setRemoteValue: vi.fn() }))
vi.mock('@/utils/notification', () => ({ failed: vi.fn() }))
vi.mock('@/components/JsonFormWrapper/JsonFormWrapper', () => ({
  getJsonSchemaListResult: () => ({ jsonSchemaError: [], jsonSchemaSuccess: [] }),
}))
vi.mock('@/pages/plugins/operator/localPluginExecuteDetailHeard/LocalPluginExecuteDetailHeard', async () => {
  const { Form } = await import('antd')
  return {
    ExecuteEnterNodeByPluginParams: ({ paramsList }: { paramsList: YakParamProps[] }) => (
      <>
        {paramsList.map((p) => (
          <Form.Item key={p.Field} name={p.Field} valuePropName={p.TypeVerbose === 'boolean' ? 'checked' : undefined}>
            {p.TypeVerbose === 'boolean' ? <input type="checkbox" /> : <input />}
          </Form.Item>
        ))}
      </>
    ),
  }
})
vi.mock('@/pages/plugins/operator/localPluginExecuteDetailHeard/PluginExecuteExtraParamsNodes', () => ({
  ExtraParamsNodeByType: () => null,
}))
vi.mock('@yakit-libs/yakit-ui-icons/outline', () => ({ ChevronUpOutlined: () => null }))
vi.mock('@yakit-libs/yakit-ui-icons/solid', () => ({ CheckSolid: () => null }))
vi.mock('@/components/yakitUI/YakitButton/YakitButton', () => ({
  YakitButton: ({ onClick, children }: { onClick?: () => void; children?: any }) => (
    <button onClick={onClick}>{children}</button>
  ),
}))
vi.mock('@/components/yakitUI/YakitDrawer/YakitDrawer', () => ({
  YakitDrawer: ({ open, title, children }: { open?: boolean; title?: any; children?: any }) =>
    open ? (
      <div>
        <div>{title}</div>
        <div>{children}</div>
      </div>
    ) : null,
}))
vi.mock('@/components/yakitUI/YakitModal/YakitModal', () => ({
  YakitModal: ({ open, footer, children }: { open?: boolean; footer?: any; children?: any }) =>
    open ? (
      <div>
        <div>{footer}</div>
        <div>{children}</div>
      </div>
    ) : null,
}))
vi.mock('re-resizable', () => ({
  Resizable: ({ children }: { children?: any }) => <>{children}</>,
}))

import PluginHasParamsDrawer, { PluginHasParamsModal } from '../PluginHasParamsDrawer'

const requiredParams: YakParamProps[] = [
  { Field: 'b1', FieldVerbose: '布尔参数', TypeVerbose: 'boolean', DefaultValue: '', Help: '' },
  { Field: 'n1', FieldVerbose: '数字参数', TypeVerbose: 'uint', DefaultValue: '', Help: '' },
  { Field: 'empty', FieldVerbose: '空字符串', TypeVerbose: 'string', DefaultValue: '', Help: '' },
  { Field: 's1', FieldVerbose: '空值参数', TypeVerbose: 'string', DefaultValue: '', Help: '' },
  { Field: 's2', FieldVerbose: '未触碰参数', TypeVerbose: 'string', DefaultValue: '', Help: '' },
]
// null / undefined 是自有属性，isNil 会丢掉；false、0、'' 不是 nil，必须留下
const initFormValue = {
  b1: false,
  n1: 0,
  empty: '',
  s1: null,
  s2: undefined,
} as unknown as CustomPluginExecuteFormValue
const keptParams = [
  { Key: 'b1', Value: false },
  { Key: 'n1', Value: 0 },
  { Key: 'empty', Value: '' },
]

describe('插件执行参数过滤（isNil 只丢弃 null 与 undefined）', () => {
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

  it('Drawer 确定后保留 false、0 与空字符串，排除 null 与 undefined', async () => {
    const onOkParamsDrawer = vi.fn()
    render(
      <PluginHasParamsDrawer
        visible
        pluginType="yak"
        scriptName="test-script"
        drawerWidth={30}
        initFormValue={initFormValue}
        requiredParams={requiredParams}
        groupParams={[]}
        onSetDrawerWidth={vi.fn()}
        onCloseParamsDrawer={vi.fn()}
        onOkParamsDrawer={onOkParamsDrawer}
      />,
    )

    fireEvent.click(screen.getByText('YakitButton.ok'))
    await waitFor(() => expect(onOkParamsDrawer).toHaveBeenCalledTimes(1), { timeout: 4000 })
    expect(onOkParamsDrawer).toHaveBeenCalledWith(keptParams)
  })

  it('Modal 保存后保留 false、0 与空字符串，排除 null 与 undefined', async () => {
    const onOkParamsModal = vi.fn()
    render(
      <PluginHasParamsModal
        visible
        pluginType="yak"
        scriptName="test-script"
        initFormValue={initFormValue}
        requiredParams={requiredParams}
        groupParams={[]}
        onCloseParamsModal={vi.fn()}
        onOkParamsModal={onOkParamsModal}
      />,
    )

    fireEvent.click(screen.getByText('YakitButton.save'))
    await waitFor(() => expect(onOkParamsModal).toHaveBeenCalledTimes(1), { timeout: 4000 })
    expect(onOkParamsModal).toHaveBeenCalledWith(true, false, keptParams)
  })
})
