import type React from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { YakitRiskEditForm } from '../YakitRiskTable'

const mocks = vi.hoisted(() => ({
  verifierUid: vi.fn(),
  userSearch: vi.fn(),
  notify: vi.fn(),
  setFieldsValue: vi.fn(),
  getFieldValue: vi.fn(() => undefined),
  finishValues: vi.fn(),
}))

vi.hoisted(() => {
  Object.defineProperty(window, 'require', {
    configurable: true,
    value: () => ({ ipcRenderer: { invoke: vi.fn(), on: vi.fn(), removeAllListeners: vi.fn() } }),
  })
  Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
    configurable: true,
    value: () => ({ fillStyle: '', fillRect: vi.fn() }),
  })
})

vi.mock('lottie-web', () => ({ default: { loadAnimation: vi.fn(), destroy: vi.fn() } }))

vi.mock('antd', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>()
  const Form = (({ children, onFinish }: React.PropsWithChildren<{ onFinish?: (value: unknown) => void }>) => (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        onFinish?.(mocks.finishValues())
      }}
    >
      {children}
      <button type="submit">测试提交</button>
    </form>
  )) as unknown as React.FC<React.PropsWithChildren> & Record<string, unknown>
  Form.Item = ({ children }: React.PropsWithChildren) => <div>{children}</div>
  Form.useForm = () => [
    {
      setFieldsValue: mocks.setFieldsValue,
      getFieldValue: mocks.getFieldValue,
    },
  ]
  Form.useWatch = (name: string) => (name === 'disposal_status' ? ['已修复'] : undefined)
  return { ...actual, Form, Tooltip: ({ children }: React.PropsWithChildren) => children }
})
vi.mock('@/store', () => ({ useStore: () => ({ userInfo: { isLogin: true } }) }))
vi.mock('@/utils/envfile', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  isEnterpriseEdition: () => true,
}))
vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({ t: (key: string) => key, i18n: { language: 'zh' }, i18nRefresh: 0 }),
}))
vi.mock('@/pages/risks/riskVerifier', () => ({ apiGetRiskVerifierUid: mocks.verifierUid }))
vi.mock('@/pages/notepadManage/NotepadShareModal/utils', () => ({ apiGetUserSearch: mocks.userSearch }))
vi.mock('@/utils/notification', () => ({ yakitNotify: mocks.notify }))
vi.mock('@/components/yakitUI/YakitSpin/YakitSpin', () => ({
  YakitSpin: ({ children }: React.PropsWithChildren) => children,
}))
vi.mock('@/components/yakitUI/YakitSelect/YakitSelect', () => {
  const YakitSelect = ({ children, onChange }: React.PropsWithChildren<{ onChange?: () => void }>) => (
    <button type="button" data-testid="select" onClick={onChange}>
      {children}
    </button>
  )
  YakitSelect.Option = ({ children }: React.PropsWithChildren) => <div>{children}</div>
  return { YakitSelect }
})
vi.mock('@/components/yakitUI/YakitInput/YakitInput', () => {
  const YakitInput = () => <input />
  YakitInput.TextArea = () => <textarea />
  return { YakitInput }
})
vi.mock('@/components/yakitUI/YakitInputNumber/YakitInputNumber', () => ({ YakitInputNumber: () => <input /> }))
vi.mock('@/components/yakitUI/YakitDatePicker/YakitDatePicker', () => ({ YakitDatePicker: () => <input /> }))
vi.mock('@/components/yakitUI/YakitButton/YakitButton', () => ({
  YakitButton: ({ children }: React.PropsWithChildren) => <button type="button">{children}</button>,
}))

const deferred = <T,>() => {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

describe('YakitRiskEditForm 验证人回填', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.verifierUid.mockResolvedValue(undefined)
    mocks.userSearch.mockResolvedValue({ data: [] })
    mocks.finishValues.mockReturnValue({})
    mocks.getFieldValue.mockImplementation(() => {
      const lastCall = mocks.setFieldsValue.mock.calls.at(-1)?.[0]
      return lastCall?.verifier
    })
  })
  afterEach(cleanup)

  it('已有 uid 时直接查询姓名，不请求线上风险', async () => {
    mocks.userSearch.mockResolvedValue({ data: [{ id: 1, uid: 'uid-1', name: '张三' }] })

    render(
      <YakitRiskEditForm info={{ Hash: 'risk-1', VerifierUid: 'uid-1', Tags: '已修复' } as never} onSave={vi.fn()} />,
    )

    await waitFor(() => expect(mocks.setFieldsValue).toHaveBeenLastCalledWith({ verifier: 'uid-1' }))
    await waitFor(() => expect(mocks.userSearch).toHaveBeenCalledWith({ uid: 'uid-1' }))
    await waitFor(() => expect(screen.getByText('张三')).toBeInTheDocument())
    expect(mocks.verifierUid).not.toHaveBeenCalled()
  })

  it('gRPC 数据缺少 uid 时从线上风险回填并查询姓名', async () => {
    mocks.verifierUid.mockResolvedValue('uid-online')
    mocks.userSearch.mockResolvedValue({ data: [{ uid: 'uid-online', name: '李四' }] })

    render(<YakitRiskEditForm info={{ Hash: 'risk-2', Tags: '已修复' } as never} onSave={vi.fn()} />)

    await waitFor(() => expect(mocks.verifierUid).toHaveBeenCalledWith('risk-2'))
    await waitFor(() => expect(mocks.userSearch).toHaveBeenCalledWith({ uid: 'uid-online' }))
    expect(mocks.setFieldsValue).toHaveBeenCalledWith({ verifier: 'uid-online' })
  })

  it('线上 uid 返回前用户已操作验证人时不覆盖表单', async () => {
    const pending = deferred<string | undefined>()
    mocks.verifierUid.mockReturnValue(pending.promise)
    render(<YakitRiskEditForm info={{ Hash: 'risk-3', Tags: '已修复' } as never} onSave={vi.fn()} />)

    const selects = screen.getAllByTestId('select')
    fireEvent.click(selects[selects.length - 1])
    pending.resolve('late-uid')

    await waitFor(() => expect(mocks.verifierUid).toHaveBeenCalledWith('risk-3'))
    await pending.promise
    expect(mocks.setFieldsValue).not.toHaveBeenCalled()
    expect(mocks.userSearch).not.toHaveBeenCalled()
  })

  it('线上查询失败时提示错误且不写入空 uid', async () => {
    mocks.verifierUid.mockRejectedValue(new Error('network error'))
    render(<YakitRiskEditForm info={{ Hash: 'risk-4', Tags: '已修复' } as never} onSave={vi.fn()} />)

    await waitFor(() => expect(mocks.notify).toHaveBeenCalledWith('error', 'YakitNotification.queryFailed'))
    expect(mocks.setFieldsValue).not.toHaveBeenCalled()
  })

  it('非已修复风险不请求线上验证人', async () => {
    render(<YakitRiskEditForm info={{ Hash: 'risk-pending', Tags: '待处理' } as never} onSave={vi.fn()} />)

    await Promise.resolve()
    expect(mocks.verifierUid).not.toHaveBeenCalled()
    expect(mocks.userSearch).not.toHaveBeenCalled()
  })

  it('保存已修复风险时映射验证人与修复字段', () => {
    mocks.finishValues.mockReturnValue({
      risk_type: '命令执行',
      cvss: 8.8,
      disposal_status: ['已修复'],
      verifier: 'uid-1',
      repair_time: 1700000000,
      repair_suggestion: '升级组件',
    })
    const onSave = vi.fn()
    render(
      <YakitRiskEditForm
        info={{ Hash: '', Verifier: '张三', Tags: '已修复', SeverityScore: 5 } as never}
        onSave={onSave}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: '测试提交' }))

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        RiskType: '命令执行',
        RiskTypeVerbose: '命令执行',
        SeverityScore: 8.8,
        Tags: '已修复',
        Verifier: '张三',
        VerifierUid: 'uid-1',
        FixTime: 1700000000,
        FixSuggestion: '升级组件',
        TagReason: undefined,
      }),
    )
  })

  it('保存非已修复风险时清除旧验证人与修复字段', async () => {
    mocks.finishValues.mockReturnValue({
      risk_type: '命令执行',
      cvss: 4.2,
      disposal_status: ['待处理'],
      verifier: 'old-uid',
      repair_time: 1700000000,
      repair_suggestion: '旧建议',
      disposal_note: '等待排期',
    })
    const onSave = vi.fn()
    render(
      <YakitRiskEditForm
        info={{ Hash: '', Verifier: '旧验证人', VerifierUid: 'old-uid', Tags: '待处理' } as never}
        onSave={onSave}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: '测试提交' }))

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        Tags: '待处理',
        Verifier: undefined,
        VerifierUid: undefined,
        FixTime: undefined,
        FixSuggestion: undefined,
        TagReason: '等待排期',
      }),
    )
    await waitFor(() => expect(mocks.userSearch).toHaveBeenCalledWith({ uid: 'old-uid' }))
  })
})
