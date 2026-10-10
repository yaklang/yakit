import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { HTTPFlow } from '../HTTPFlowTable.constants'

const mocks = vi.hoisted(() => ({
  formProps: undefined as Record<string, any> | undefined,
  apiBatchSetHTTPFlowIssueFields: vi.fn(),
}))

vi.mock('antd', () => ({
  Form: Object.assign(
    (props: Record<string, any>) => {
      mocks.formProps = props
      return (
        <form
          onKeyDown={props.onKeyDown}
          onSubmit={(event) => {
            event.preventDefault()
            props.onFinish(props.initialValues)
          }}
        >
          {props.children}
        </form>
      )
    },
    {
      useForm: () => [{}],
      Item: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    },
  ),
}))
vi.mock('@/components/yakitUI/YakitButton/YakitButton', () => ({
  YakitButton: ({
    children,
    htmlType = 'button',
    onClick,
  }: {
    children: React.ReactNode
    htmlType?: 'button' | 'submit'
    onClick?: () => void
  }) => (
    <button type={htmlType} onClick={onClick}>
      {children}
    </button>
  ),
}))
vi.mock('@/components/yakitUI/YakitSelect/YakitSelect', () => ({
  YakitSelect: Object.assign(
    ({ children }: { children: React.ReactNode }) => (
      <div>
        <input aria-label="选项输入" />
        <select>{children}</select>
      </div>
    ),
    {
      Option: ({ children, value }: { children: React.ReactNode; value: string }) => (
        <option value={value}>{children}</option>
      ),
    },
  ),
}))
vi.mock('@/components/yakitUI/YakitInput/YakitInput', () => ({
  YakitInput: { TextArea: () => <textarea /> },
}))
vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({
    t: (key: string) => (key === 'HTTPFlowTable.markOptions.SQL注入' ? 'SQL injection' : key),
  }),
}))
vi.mock('../HTTPFlowMark.utils', () => ({
  apiBatchSetHTTPFlowIssueFields: mocks.apiBatchSetHTTPFlowIssueFields,
}))

import { FlowMarkEditForm } from '../FlowMarkEditForm'

describe('FlowMarkEditForm', () => {
  beforeEach(() => {
    mocks.formProps = undefined
    mocks.apiBatchSetHTTPFlowIssueFields.mockReset()
    mocks.apiBatchSetHTTPFlowIssueFields.mockResolvedValue({ UpdatedCount: 1 })
  })

  it.each([false, true])('输入框回车不保存或关闭，点击确定仍保存（批量 %s）', async (batch) => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<FlowMarkEditForm batch={batch} ids={[7]} onClose={onClose} />)

    await user.type(screen.getAllByLabelText('选项输入')[0], '{Enter}')
    expect(mocks.apiBatchSetHTTPFlowIssueFields).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'YakitButton.ok' }))
    expect(mocks.apiBatchSetHTTPFlowIssueFields).toHaveBeenCalledOnce()
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce())
  })

  it('initializes a single edit from the current record', () => {
    const info = {
      Id: 7,
      IssueType: 'SQL注入',
      Severity: '高危',
      Status: '待修复',
      StatusReason: '待确认',
    } as HTTPFlow

    render(<FlowMarkEditForm info={info} ids={[7]} />)

    expect(mocks.formProps?.initialValues).toEqual({
      IssueType: 'SQL注入',
      Severity: '高危',
      Status: '待修复',
      StatusReason: '待确认',
    })
  })

  it('does not overwrite fields left empty in a batch edit', async () => {
    render(<FlowMarkEditForm batch ids={[7, 8]} token="token" />)

    await mocks.formProps?.onFinish({
      IssueType: undefined,
      Severity: '',
      Status: undefined,
      StatusReason: '   ',
    })

    expect(mocks.apiBatchSetHTTPFlowIssueFields).toHaveBeenCalledWith({
      Ids: [7, 8],
      Filter: undefined,
      Token: 'token',
    })
  })

  it('clears all single-record fields in the request and successful local patch', async () => {
    const onSuccess = vi.fn()
    const onClose = vi.fn()
    render(
      <FlowMarkEditForm
        info={{ IssueType: 'SQL注入', Severity: '高危', Status: '确认', StatusReason: 'old' }}
        ids={[7]}
        onSuccess={onSuccess}
        onClose={onClose}
      />,
    )

    await mocks.formProps?.onFinish({ StatusReason: '   ' })

    expect(mocks.apiBatchSetHTTPFlowIssueFields).toHaveBeenCalledWith(
      expect.objectContaining({ SetIssueType: '', SetSeverity: '', SetStatus: '', StatusReason: '' }),
    )
    await waitFor(() =>
      expect(onSuccess).toHaveBeenCalledWith({
        Ids: [7],
        IssueType: '',
        Severity: '',
        Status: '',
        StatusReason: '',
      }),
    )
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('translates labels while preserving the API values', async () => {
    render(<FlowMarkEditForm ids={[7]} />)
    expect(screen.getByRole('option', { name: 'SQL injection' })).toHaveValue('SQL注入')
    await mocks.formProps?.onFinish({ IssueType: 'SQL注入' })
    expect(mocks.apiBatchSetHTTPFlowIssueFields).toHaveBeenCalledWith(
      expect.objectContaining({ SetIssueType: 'SQL注入' }),
    )
  })

  it('patches only filled batch fields after the save succeeds', async () => {
    let finishSave!: (value: { UpdatedCount: number }) => void
    mocks.apiBatchSetHTTPFlowIssueFields.mockReturnValue(
      new Promise((resolve) => {
        finishSave = resolve
      }),
    )
    const onSuccess = vi.fn()
    const onClose = vi.fn()
    render(<FlowMarkEditForm batch ids={[7, 8]} onSuccess={onSuccess} onClose={onClose} />)

    mocks.formProps?.onFinish({ Severity: '高危', StatusReason: '  investigate  ' })
    expect(onSuccess).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()

    finishSave({ UpdatedCount: 2 })
    await waitFor(() =>
      expect(onSuccess).toHaveBeenCalledWith({
        Ids: [7, 8],
        Severity: '高危',
        StatusReason: 'investigate',
      }),
    )
    expect(onClose).toHaveBeenCalledOnce()
  })
})
