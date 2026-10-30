import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { HTTPFlow } from '../HTTPFlowTable.constants'
import { buildBatchScopes } from '@/components/BatchScopeSelector/batchScope'

const mocks = vi.hoisted(() => ({
  formProps: undefined as Record<string, any> | undefined,
  batchScopeProps: undefined as Record<string, any> | undefined,
  apiBatchSetHTTPFlowIssueFields: vi.fn(),
}))
vi.mock('@/components/BatchScopeSelector/BatchScopeSelector', () => ({
  BatchScopeSelector: (props: Record<string, any>) => {
    mocks.batchScopeProps = props
    return <div>batch-scope-selector</div>
  },
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
    { useForm: () => [{}], Item: ({ children }: { children: React.ReactNode }) => <>{children}</> },
  ),
}))
vi.mock('@/components/yakitUI/YakitButton/YakitButton', () => ({
  YakitButton: ({ children, htmlType = 'button', onClick, disabled }: any) => (
    <button type={htmlType} onClick={onClick} disabled={disabled}>
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
    { Option: ({ children, value }: any) => <option value={value}>{children}</option> },
  ),
}))
vi.mock('@/components/yakitUI/YakitInput/YakitInput', () => ({ YakitInput: { TextArea: () => <textarea /> } }))
vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({
    t: (key: string) => (key === 'HTTPFlowTable.markOptions.SQL注入' ? 'SQL injection' : key),
  }),
}))
vi.mock('@/utils/notification', () => ({ yakitNotify: vi.fn() }))
vi.mock('../HTTPFlowMark.utils', () => ({ apiBatchSetHTTPFlowIssueFields: mocks.apiBatchSetHTTPFlowIssueFields }))

import { FlowMarkEditForm } from '../FlowMarkEditForm'

interface StatefulFlow {
  Id: number
  IssueType: string
  Status: string
}

const createStatefulFlowMock = (flows: StatefulFlow[], updatedIds: number[]) => {
  mocks.apiBatchSetHTTPFlowIssueFields.mockImplementation(async (request) => {
    const filter = request.Filter || {}
    const pagination = filter.Pagination || {}
    const requestIds = new Set<number>(request.Ids || [])
    const includeIds = new Set<number>(filter.IncludeId || [])
    const candidates = flows
      .filter((flow) => (requestIds.size ? requestIds.has(flow.Id) : !includeIds.size || includeIds.has(flow.Id)))
      .filter((flow) => requestIds.size || !filter.IssueType || flow.IssueType === filter.IssueType)
      .filter((flow) => requestIds.size || !filter.Status || flow.Status === filter.Status)
      .sort((a, b) => (pagination.Order === 'asc' ? a.Id - b.Id : b.Id - a.Id))
    const page = Number(pagination.Page || 1)
    const limit = Number(pagination.Limit || candidates.length)
    const selected = requestIds.size ? candidates : candidates.slice((page - 1) * limit, page * limit)
    selected.forEach((flow) => {
      updatedIds.push(flow.Id)
      if (request.SetIssueType !== undefined) flow.IssueType = request.SetIssueType
      if (request.SetStatus !== undefined) flow.Status = request.SetStatus
    })
    return { UpdatedCount: selected.length }
  })
}

const renderStatefulBatch = async (selection: 'all' | 'explicit', values: { IssueType?: string; Status?: string }) => {
  const ids = selection === 'explicit' ? Array.from({ length: 2501 }, (_, index) => index + 1) : []
  render(
    <FlowMarkEditForm
      batch
      batchCount={2501}
      ids={ids}
      filter={{ IssueType: 'XSS', Pagination: { Page: 1, Limit: 20, OrderBy: 'id', Order: 'asc' } }}
    />,
  )
  await act(async () => {
    mocks.formProps?.onFinish(values)
  })
  const execute = mocks.batchScopeProps?.execute
  expect(execute).toBeTypeOf('function')
  for (const scope of buildBatchScopes(2501)) await execute(scope)
}

describe('FlowMarkEditForm', () => {
  beforeEach(() => {
    mocks.formProps = undefined
    mocks.batchScopeProps = undefined
    mocks.apiBatchSetHTTPFlowIssueFields.mockReset()
    mocks.apiBatchSetHTTPFlowIssueFields.mockResolvedValue({ UpdatedCount: 1 })
  })

  it('keeps single-record behavior unchanged', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<FlowMarkEditForm ids={[7]} onClose={onClose} />)
    await user.type(screen.getAllByLabelText('选项输入')[0], '{Enter}')
    expect(mocks.apiBatchSetHTTPFlowIssueFields).not.toHaveBeenCalled()
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

  it('submits at most 1000 selected rows immediately with filter pagination and no top-level IDs', async () => {
    mocks.apiBatchSetHTTPFlowIssueFields.mockResolvedValue({ UpdatedCount: 2 })
    const onClose = vi.fn()
    const onSuccess = vi.fn()
    render(
      <FlowMarkEditForm
        batch
        batchCount={2}
        ids={[7, 8]}
        filter={{ Status: '待修复', Pagination: { Page: 9, Limit: 20, OrderBy: 'updated_at', Order: 'asc' } }}
        orderBy="created_at"
        order="desc"
        token="token"
        onClose={onClose}
        onSuccess={onSuccess}
      />,
    )
    await act(async () => {
      mocks.formProps?.onFinish({ Severity: '高危', StatusReason: ' investigate ' })
    })
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce())
    expect(mocks.batchScopeProps).toBeUndefined()
    expect(mocks.apiBatchSetHTTPFlowIssueFields).toHaveBeenCalledWith({
      Token: 'token',
      SetSeverity: '高危',
      StatusReason: 'investigate',
      Filter: {
        Status: '待修复',
        IncludeId: [7, 8],
        AfterId: undefined,
        BeforeId: undefined,
        Pagination: { Page: 1, Limit: 1000, OrderBy: 'created_at', Order: 'desc' },
      },
    })
    expect(mocks.apiBatchSetHTTPFlowIssueFields.mock.calls[0][0]).not.toHaveProperty('Ids')
    expect(onSuccess).toHaveBeenCalledWith({ Ids: [7, 8], Severity: '高危', StatusReason: 'investigate' })
  })

  it('blocks duplicate submission and cancellation while a small batch is pending', async () => {
    const user = userEvent.setup()
    let resolveRequest!: (result: { UpdatedCount: number }) => void
    const pending = new Promise<{ UpdatedCount: number }>((resolve) => {
      resolveRequest = resolve
    })
    mocks.apiBatchSetHTTPFlowIssueFields.mockReturnValueOnce(pending)
    const onClose = vi.fn()
    const onSuccess = vi.fn()
    render(<FlowMarkEditForm batch batchCount={2} ids={[7, 8]} onClose={onClose} onSuccess={onSuccess} />)

    const cancel = screen.getByRole('button', { name: 'YakitButton.cancel' })
    act(() => {
      mocks.formProps?.onFinish({ Severity: '高危' })
      mocks.formProps?.onFinish({ Severity: '高危' })
      cancel.click()
    })

    expect(cancel).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'YakitButton.ok' }))
    await user.click(cancel)
    expect(mocks.apiBatchSetHTTPFlowIssueFields).toHaveBeenCalledOnce()
    expect(onSuccess).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()

    await act(async () => resolveRequest({ UpdatedCount: 2 }))
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce())
    expect(onSuccess).toHaveBeenCalledExactlyOnceWith({ Ids: [7, 8], Severity: '高危' })
    expect(mocks.apiBatchSetHTTPFlowIssueFields).toHaveBeenCalledOnce()
  })

  it('shows ranges only above 1000 and page 3 keeps limit 1000 without prefetch', async () => {
    const onRefresh = vi.fn()
    render(
      <FlowMarkEditForm
        batch
        batchCount={2501}
        ids={[]}
        filter={{ IssueType: 'XSS', Pagination: { Page: 1, Limit: 20, OrderBy: 'id', Order: 'desc' } }}
        token="token"
        onRefresh={onRefresh}
      />,
    )
    await act(async () => {
      mocks.formProps?.onFinish({ Status: '确认' })
    })
    expect(await screen.findByText('batch-scope-selector')).toBeInTheDocument()
    expect(mocks.apiBatchSetHTTPFlowIssueFields).not.toHaveBeenCalled()
    const batchScopeProps = mocks.batchScopeProps!
    expect(batchScopeProps.total).toBe(2501)

    mocks.apiBatchSetHTTPFlowIssueFields.mockResolvedValueOnce({ UpdatedCount: 501 })
    await batchScopeProps.execute({ index: 2, page: 3, limit: 1000, start: 2001, end: 2501, count: 501 })
    const request = mocks.apiBatchSetHTTPFlowIssueFields.mock.calls[0][0]
    expect(request.Filter).toEqual({
      IssueType: 'XSS',
      AfterId: undefined,
      BeforeId: undefined,
      Pagination: { Page: 3, Limit: 1000, OrderBy: 'id', Order: 'desc' },
    })
    expect(request).not.toHaveProperty('Ids')
    batchScopeProps.onScopeSuccess({ page: 3 })
    expect(onRefresh).toHaveBeenCalledOnce()
  })

  it('closes a partial small batch after refreshing so successful rows cannot be repeated', async () => {
    mocks.apiBatchSetHTTPFlowIssueFields.mockResolvedValue({ UpdatedCount: 1 })
    const onClose = vi.fn()
    const onRefresh = vi.fn()
    render(<FlowMarkEditForm batch batchCount={2} ids={[7, 8]} onClose={onClose} onRefresh={onRefresh} />)
    await act(async () => {
      mocks.formProps?.onFinish({ Severity: '中危' })
    })
    await waitFor(() => expect(onRefresh).toHaveBeenCalledOnce())
    expect(onClose).toHaveBeenCalledOnce()
  })

  for (const selection of ['all', 'explicit'] as const) {
    it(`${selection} selection covers every original row once when edited fields do not affect the filter`, async () => {
      const flows = Array.from({ length: 2501 }, (_, index) => ({
        Id: index + 1,
        IssueType: 'XSS',
        Status: '待修复',
      }))
      const updatedIds: number[] = []
      createStatefulFlowMock(flows, updatedIds)

      await renderStatefulBatch(selection, { Status: '确认' })

      expect(new Set(updatedIds).size).toBe(2501)
      expect(updatedIds).toHaveLength(2501)
      expect(flows.every((flow) => flow.Status === '确认')).toBe(true)
    })

    // 已知 P0：可变筛选集合按页执行会遗漏原目标；生产逻辑修复后移除 fails。
    it.fails(
      `${selection} selection keeps the original target set when an edited field shrinks the filter`,
      async () => {
        const flows = Array.from({ length: 2501 }, (_, index) => ({
          Id: index + 1,
          IssueType: 'XSS',
          Status: '待修复',
        }))
        const updatedIds: number[] = []
        createStatefulFlowMock(flows, updatedIds)

        await renderStatefulBatch(selection, { IssueType: 'SQL注入' })

        expect(new Set(updatedIds).size).toBe(2501)
        expect(updatedIds).toHaveLength(2501)
        expect(flows.every((flow) => flow.IssueType === 'SQL注入')).toBe(true)
      },
    )
  }

  it('translates labels while preserving API values', async () => {
    render(<FlowMarkEditForm ids={[7]} />)
    expect(screen.getByRole('option', { name: 'SQL injection' })).toHaveValue('SQL注入')
    await mocks.formProps?.onFinish({ IssueType: 'SQL注入' })
    expect(mocks.apiBatchSetHTTPFlowIssueFields).toHaveBeenCalledWith(
      expect.objectContaining({ SetIssueType: 'SQL注入' }),
    )
  })
})
