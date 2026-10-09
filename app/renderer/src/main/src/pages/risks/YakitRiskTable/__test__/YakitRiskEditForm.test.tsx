import type React from 'react'
import { cloneElement, isValidElement } from 'react'
import moment from 'moment'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { YakitRiskEditForm } from '../YakitRiskTable'

const mocks = vi.hoisted(() => ({
  verifierUid: vi.fn(),
  userSearch: vi.fn(),
  notify: vi.fn(),
  setFieldsValue: vi.fn(),
  getFieldValue: vi.fn(() => undefined),
  finishValues: vi.fn(),
  initialValues: {} as Record<string, unknown>,
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
  const Form = (({
    children,
    onFinish,
    onKeyDown,
    initialValues,
  }: React.PropsWithChildren<{
    onFinish?: (value: unknown) => void
    onKeyDown?: React.KeyboardEventHandler<HTMLFormElement>
    initialValues: Record<string, unknown>
  }>) => {
    mocks.initialValues = initialValues
    return (
      <form
        onKeyDown={onKeyDown}
        onSubmit={(event) => {
          event.preventDefault()
          onFinish?.(mocks.finishValues())
        }}
      >
        {children}
        <button type="submit">测试提交</button>
      </form>
    )
  }) as unknown as React.FC<React.PropsWithChildren> & Record<string, unknown>
  Form.Item = ({
    children,
    name,
    getValueProps,
  }: React.PropsWithChildren<{
    name?: string
    getValueProps?: (value: unknown) => Record<string, unknown>
  }>) => (
    <div>
      {name === 'repair_time' && getValueProps && isValidElement(children)
        ? cloneElement(children, getValueProps(mocks.initialValues[name]))
        : children}
    </div>
  )
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
vi.mock('@/components/yakitUI/YakitInputNumber/YakitInputNumber', () => ({
  YakitInputNumber: () => <input data-testid="cvss-input" />,
}))
vi.mock('@/components/yakitUI/YakitDatePicker/YakitDatePicker', () => ({
  YakitDatePicker: ({ value }: { value?: moment.Moment }) => (
    <input aria-label="修复时间" value={value?.format('YYYY-MM-DD') || ''} readOnly />
  ),
}))
vi.mock('@/components/yakitUI/YakitButton/YakitButton', () => ({
  YakitButton: ({
    children,
    htmlType = 'button',
    onClick,
    disabled,
  }: React.PropsWithChildren<{
    htmlType?: 'button' | 'submit'
    onClick?: () => void
    disabled?: boolean
  }>) => (
    <button type={htmlType} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
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
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it.each([undefined, null, 0, '0', '', -1, 'invalid'])(
    '未设置或无效修复时间 %s 默认当天，并提交实际默认值',
    async (FixTime) => {
      vi.spyOn(Date, 'now').mockReturnValue(new Date('2026-10-09T14:00:00+08:00').getTime())
      const onSave = vi.fn().mockResolvedValue(undefined)
      render(<YakitRiskEditForm info={{ Hash: '', FixTime } as never} onSave={onSave} />)
      expect(screen.getByLabelText('修复时间')).toHaveValue(moment().format('YYYY-MM-DD'))
      expect(mocks.initialValues.repair_time).toBe(moment().unix())
      mocks.finishValues.mockReturnValue({
        ...mocks.initialValues,
        risk_type: 'SQL注入',
        cvss: 7,
        disposal_status: ['已修复'],
        verifier: 'uid-1',
      })
      fireEvent.click(screen.getByRole('button', { name: '测试提交' }))
      await waitFor(() => expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ FixTime: moment().unix() })))
    },
  )

  it.each([1700000000, '1700000000'])('已有有效修复时间 %s 保留原日期并统一为数字时间戳', (FixTime) => {
    render(<YakitRiskEditForm info={{ Hash: '', FixTime } as never} onSave={vi.fn()} />)
    expect(screen.getByLabelText('修复时间')).toHaveValue(moment.unix(1700000000).format('YYYY-MM-DD'))
    expect(mocks.initialValues.repair_time).toBe(1700000000)
  })

  it('批量修改无修复时间时也默认当天', () => {
    vi.spyOn(Date, 'now').mockReturnValue(new Date('2026-10-09T14:00:00+08:00').getTime())
    render(<YakitRiskEditForm info={{ Hash: '' } as never} batchCount={2} onSave={vi.fn()} />)
    expect(screen.getByLabelText('修复时间')).toHaveValue(moment().format('YYYY-MM-DD'))
    expect(mocks.initialValues.repair_time).toBe(moment().unix())
  })

  it.each([undefined, 2])('CVSS 回车不保存或关闭，点击确定仍保存（批量数 %s）', async (batchCount) => {
    const user = userEvent.setup()
    mocks.finishValues.mockReturnValue({ risk_type: 'SQL注入', cvss: 7, disposal_status: ['待验证'] })
    const onSave = vi.fn().mockResolvedValue(undefined)
    const onClose = vi.fn()
    render(<YakitRiskEditForm info={{ Hash: '' } as never} batchCount={batchCount} onSave={onSave} onClose={onClose} />)

    await user.click(screen.getByTestId('cvss-input'))
    await user.keyboard('{Enter}')
    expect(onSave).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'YakitButton.ok' }))
    await waitFor(() => expect(onSave).toHaveBeenCalledOnce())
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce())
  })

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

  it('保存已修复风险时映射验证人与修复字段', async () => {
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

    await act(async () => fireEvent.click(screen.getByRole('button', { name: '测试提交' })))

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

    await waitFor(() => expect(mocks.userSearch).toHaveBeenCalledWith({ uid: 'old-uid' }))
    await act(async () => fireEvent.click(screen.getByRole('button', { name: '测试提交' })))

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
  })

  it('批量保存等待接口完成再关闭，重复提交不会发出第二次请求', async () => {
    mocks.finishValues.mockReturnValue({ risk_type: 'SQL注入', cvss: 0, disposal_status: [] })
    const pending = deferred<void>()
    const onSave = vi.fn(() => pending.promise)
    const onClose = vi.fn()
    render(<YakitRiskEditForm info={{} as never} batchCount={20} onSave={onSave} onClose={onClose} />)

    expect(screen.getByText('YakitRiskTable.batch_mark_hint')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '测试提交' }))
    fireEvent.click(screen.getByRole('button', { name: '测试提交' }))
    expect(onSave).toHaveBeenCalledTimes(1)
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ SeverityScore: 0, Tags: '' }))
    expect(onClose).not.toHaveBeenCalled()
    pending.resolve()
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
  })

  it('批量保存失败保留弹窗，重试成功后关闭', async () => {
    mocks.finishValues.mockReturnValue({ risk_type: 'SQL注入', cvss: 5, disposal_status: ['确认'] })
    const onSave = vi.fn().mockRejectedValueOnce(new Error('保存失败')).mockResolvedValueOnce(undefined)
    const onClose = vi.fn()
    render(<YakitRiskEditForm info={{} as never} batchCount={2} onSave={onSave} onClose={onClose} />)

    fireEvent.click(screen.getByRole('button', { name: '测试提交' }))
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1))
    expect(onClose).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: '测试提交' }))
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
  })

  it.each([
    [{ cvss: 5 }, 'YakitRiskEditForm.risk_type_required'],
    [{ risk_type: 'SQL注入' }, 'YakitRiskEditForm.cvss_required'],
    [{ risk_type: 'SQL注入', cvss: 11 }, 'YakitRiskEditForm.cvss_range'],
  ])('批量编辑校验必填类型和 CVSS 范围 %j', (values, error) => {
    mocks.finishValues.mockReturnValue(values)
    const onSave = vi.fn()
    render(<YakitRiskEditForm info={{} as never} batchCount={2} onSave={onSave} />)
    fireEvent.click(screen.getByRole('button', { name: '测试提交' }))
    expect(onSave).not.toHaveBeenCalled()
    expect(mocks.notify).toHaveBeenCalledWith('error', error)
  })
})
