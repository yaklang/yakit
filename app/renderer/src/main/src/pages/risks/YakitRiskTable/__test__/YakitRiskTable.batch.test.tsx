import type React from 'react'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { QueryRisksRequest } from '../YakitRiskTableType'
import type { Risk } from '../../schema'
import { YakitRiskTable } from '../YakitRiskTable'
import { DISPOSAL_STATUS_OPTIONS } from '../constants'

const rows: Risk[] = [
  { Id: 11, Hash: 'risk-11', IP: '127.0.0.1', Title: 'risk 11', RiskType: 'SQL注入', CreatedAt: 1 },
  { Id: 22, Hash: 'risk-22', IP: '127.0.0.2', Title: 'risk 22', RiskType: 'XSS', CreatedAt: 2 },
]

const mocks = vi.hoisted(() => ({
  enterprise: true,
  batchSetRiskTags: vi.fn(),
  deleteRisk: vi.fn(),
  queryRisks: vi.fn(),
  showModal: vi.fn(),
  confirmModal: vi.fn(),
  destroyModal: vi.fn(),
  emit: vi.fn(),
  intervalCallbacks: [] as Array<() => void>,
  queryIncrement: vi.fn(),
  queryRiskTypes: vi.fn(),
  queryRiskTags: vi.fn(),
  columns: [] as any[],
  refreshRisks: undefined as (() => void) | undefined,
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

vi.mock('ahooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useDebounceEffect: vi.fn(),
  useDebounceFn: (fn: (...args: unknown[]) => unknown) => ({ run: fn }),
  useInViewport: () => [true],
  useInterval: (callback: () => void) => {
    mocks.intervalCallbacks.push(callback)
  },
}))

vi.mock('react-resize-detector', () => ({ default: () => null }))

vi.mock('antd', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  Badge: ({ children }: React.PropsWithChildren) => children,
  Divider: () => <span />,
  Tooltip: ({ children }: React.PropsWithChildren) => children,
}))

vi.mock('@yakit-libs/yakit-ui-icons/outline', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  ChevronDownOutlined: () => null,
  ChevronLeftOutlined: () => null,
  ChevronRightOutlined: () => null,
  ClockOutlined: () => null,
  EyeOutlined: () => null,
  OpenOutlined: () => null,
  PlayOutlined: () => null,
  RefreshOutlined: () => null,
  SearchOutlined: () => null,
  TerminalOutlined: () => null,
  TrashOutlined: () => null,
  UploadOutlined: () => null,
}))

vi.mock('@yakit-libs/yakit-ui-icons/colorful', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  CriticalRiskColorful: () => null,
  DefaultRiskColorful: () => null,
  FingerprintInfoRiskColorful: () => null,
  HighRiskColorful: () => null,
  LowRiskColorful: () => null,
  MediumRiskColorful: () => null,
}))

vi.mock('@/components/TableVirtualResize/TableVirtualResize', () => ({
  TableVirtualResize: ({ renderTitle, rowSelection, data, pagination, columns, onChange }) => {
    mocks.columns = columns
    return (
      <div>
        {renderTitle}
        <span data-testid="loaded-count">{data.length}</span>
        <button type="button" onClick={() => onChange(1, 20, undefined, { SeverityList: ['none'] })}>
          filter-none
        </button>
        <button type="button" onClick={() => onChange(1, 20, undefined, { TagList: ['自定义状态', '历史标签'] })}>
          filter-custom-status
        </button>
        <button type="button" onClick={() => pagination.onChange(1)}>
          load-table
        </button>
        <button type="button" onClick={() => rowSelection.onChangeCheckboxSingle(true, '11', rows[0])}>
          select-first
        </button>
        <button type="button" onClick={() => rowSelection.onChangeCheckboxSingle(true, '22', rows[1])}>
          select-second
        </button>
        <button type="button" onClick={() => rowSelection.onSelectAll([], rows, true)}>
          select-all
        </button>
        <button type="button" onClick={() => rowSelection.onSelectAll([], [], false)}>
          clear-selection
        </button>
      </div>
    )
  },
}))

vi.mock('../RiskBatchOperationsMenu', () => ({
  RiskBatchOperationsMenu: ({ onAction }: { onAction: (key: string) => void }) => (
    <div>
      <button type="button" onClick={() => onAction('modify-mark')}>
        batch-modify
      </button>
      <button type="button" onClick={() => onAction('delete')}>
        batch-delete
      </button>
      <button type="button" onClick={() => onAction('export-csv')}>
        batch-export-csv
      </button>
    </div>
  ),
}))

vi.mock('../utils', () => ({
  apiBatchSetRiskTags: mocks.batchSetRiskTags,
  apiDeleteRisk: mocks.deleteRisk,
  apiExportHtml: vi.fn().mockResolvedValue(''),
  apiNewRiskRead: vi.fn().mockResolvedValue(null),
  apiQueryAvailableRiskType: mocks.queryRiskTypes,
  apiQueryRiskTags: mocks.queryRiskTags,
  apiQueryRisks: mocks.queryRisks,
  apiQueryRisksIncrementOrderDesc: mocks.queryIncrement,
  apiRiskFeedbackToOnline: vi.fn().mockResolvedValue(undefined),
  apiSetTagForRisk: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/components/yakitUI/YakitModal/YakitModalConfirm', () => ({
  showYakitModal: mocks.showModal,
  YakitModalConfirm: mocks.confirmModal,
}))
vi.mock('@/components/yakitUI/YakitResizeBox/YakitResizeBox', () => ({
  YakitResizeBox: ({ firstNode }: { firstNode: React.ReactNode }) => <>{firstNode}</>,
}))
vi.mock('@/components/yakitUI/YakitButton/YakitButton', () => ({
  YakitButton: ({ children, onClick, disabled, icon }: React.PropsWithChildren<any>) => (
    <button type="button" disabled={disabled} onClick={onClick}>
      {icon}
      {children}
    </button>
  ),
}))
vi.mock('@/components/yakitUI/YakitInput/YakitInput', () => {
  const YakitInput = () => <input />
  YakitInput.Search = () => <input />
  YakitInput.TextArea = () => <textarea />
  return { YakitInput }
})
vi.mock('@/components/yakitUI/YakitRadioButtons/YakitRadioButtons', () => ({
  YakitRadioButtons: ({ options, onChange }: any) => (
    <div>
      {options.map((option) => (
        <button key={option.value} type="button" onClick={() => onChange({ target: { value: option.value } })}>
          type-{option.value}
        </button>
      ))}
    </div>
  ),
}))
vi.mock('@/components/yakitUI/YakitPopconfirm/YakitPopconfirm', () => ({
  YakitPopconfirm: ({ children, onConfirm }: React.PropsWithChildren<{ onConfirm: () => void }>) => (
    <div>
      {children}
      <button type="button" onClick={onConfirm}>
        confirm-clear
      </button>
    </div>
  ),
}))
vi.mock('@/pages/plugins/funcTemplate', () => ({ FuncBtn: ({ name }: { name: string }) => <button>{name}</button> }))
vi.mock('@/components/yakitUI/YakitDropdownMenu/YakitDropdownMenu', () => ({
  YakitDropdownMenu: ({ children }: React.PropsWithChildren) => children,
}))
vi.mock('@/components/yakitUI/YakitTag/YakitTag', () => ({
  CopyComponents: () => null,
  YakitTag: ({ children }: React.PropsWithChildren) => <span>{children}</span>,
}))
vi.mock('@/components/DataExport/DataExport', () => ({ ExportSelect: () => null }))
vi.mock('@/components/yakitUI/YakitSelect/YakitSelect', () => ({ YakitSelect: () => null }))
vi.mock('@/components/yakitUI/YakitInputNumber/YakitInputNumber', () => ({ YakitInputNumber: () => null }))
vi.mock('@/components/yakitUI/YakitDatePicker/YakitDatePicker', () => ({ YakitDatePicker: () => null }))
vi.mock('@/components/yakitUI/YakitSpin/YakitSpin', () => ({
  YakitSpin: ({ children }: React.PropsWithChildren) => children,
}))
vi.mock('@/utils/editors', () => ({ NewHTTPPacketEditor: () => null }))
vi.mock('@/pages/yakRunner/CollapseList/CollapseList', () => ({ CollapseList: () => null }))
vi.mock('@/components/yakCodemirror/YakCodemirror', () => ({ YakCodemirror: () => null }))
vi.mock('@/pages/assetViewer/reportRenders/markdownRender', () => ({ SafeMarkdown: () => null }))
vi.mock('../RiskDisposalLog', () => ({ RiskDisposalLog: () => null }))
vi.mock('@/store', () => ({ useStore: () => ({ userInfo: { isLogin: true, token: 'token-1' } }) }))
vi.mock('@/utils/envfile', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  isEnterpriseEdition: () => mocks.enterprise,
}))
vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({ t: (key: string) => key, i18n: { language: 'zh' }, i18nRefresh: 0 }),
}))
vi.mock('@/utils/eventBus/eventBus', () => ({
  default: {
    emit: mocks.emit,
    on: (name: string, callback: () => void) => {
      if (name === 'onRefRiskList') mocks.refreshRisks = callback
    },
    off: vi.fn(),
  },
}))
vi.mock('@/utils/notification', () => ({ yakitNotify: vi.fn() }))
vi.mock('@/utils/kv', () => ({ getRemoteValue: vi.fn().mockResolvedValue('true') }))
vi.mock('@/utils/duplex/duplex', () => ({ serverPushStatus: false }))
vi.mock('@/utils/getMainOperatorPageBodyContainer', () => ({ getMainOperatorPageBodyContainer: () => document.body }))
vi.mock('@/pages/pluginHub/utilsUI/UtilsTemplate', () => ({ NoPromptHint: () => null }))

const query: QueryRisksRequest = {
  Pagination: { Page: 1, Limit: 20, OrderBy: 'id', Order: 'desc' },
  Search: 'needle',
  Network: '10.0.0.0/8',
  Ports: '',
  RiskType: '',
  Token: '',
  WaitingVerified: false,
  Severity: '',
  FromId: 0,
  UntilId: 0,
  Tags: '',
  IsRead: '',
  Title: '',
  Ids: [],
  RiskTypeList: ['SQL注入'],
  SeverityList: [],
  TagList: [],
  IPList: [],
}

const renderTable = async () => {
  const view = render(
    <YakitRiskTable query={query} setQuery={vi.fn()} setRiskLoading={vi.fn()} allTotal={100} setAllTotal={vi.fn()} />,
  )
  fireEvent.click(screen.getByRole('button', { name: 'load-table' }))
  await waitFor(() => expect(screen.getByTestId('loaded-count')).toHaveTextContent('2'))
  vi.clearAllMocks()
  mocks.queryRisks.mockResolvedValue({
    Data: rows,
    Total: 100,
    Pagination: { Page: 1, Limit: 20, OrderBy: 'id', Order: 'desc' },
  })
  return view
}

const openBatchEdit = () => {
  fireEvent.click(screen.getByRole('button', { name: 'batch-modify' }))
  return mocks.showModal.mock.calls[0][0].content.props
}

describe('YakitRiskTable 批量操作', () => {
  beforeEach(() => {
    mocks.enterprise = true
    mocks.queryRiskTypes.mockResolvedValue([])
    mocks.queryRiskTags.mockResolvedValue({ RiskTags: [] })
    mocks.intervalCallbacks.length = 0
    mocks.queryRisks.mockResolvedValue({
      Data: rows,
      Total: 100,
      Pagination: { Page: 1, Limit: 20, OrderBy: 'id', Order: 'desc' },
    })
    mocks.batchSetRiskTags.mockResolvedValue({ UpdatedCount: 2 })
    mocks.deleteRisk.mockResolvedValue(null)
    mocks.queryIncrement.mockResolvedValue({ Data: [] })
    mocks.showModal.mockImplementation((config) => {
      return { destroy: mocks.destroyModal, config }
    })
    mocks.confirmModal.mockImplementation(() => ({ destroy: mocks.destroyModal }))
  })

  afterEach(cleanup)

  it.each([false, true])('等级筛选包含无，并将 none 传给风险查询（企业版 %s）', async (enterprise) => {
    mocks.enterprise = enterprise
    const setQuery = vi.fn()
    const { rerender } = render(
      <YakitRiskTable
        query={query}
        setQuery={setQuery}
        setRiskLoading={vi.fn()}
        allTotal={100}
        setAllTotal={vi.fn()}
      />,
    )
    expect(mocks.columns.find((column) => column.dataKey === 'Severity').filterProps.filters).toContainEqual({
      value: 'none',
      label: 'YakitTag.none',
    })
    fireEvent.click(screen.getByRole('button', { name: 'filter-none' }))
    const nextQuery = setQuery.mock.calls.at(-1)?.[0]
    expect(nextQuery).toEqual(expect.objectContaining({ SeverityList: ['none'] }))
    rerender(
      <YakitRiskTable
        query={nextQuery}
        setQuery={setQuery}
        setRiskLoading={vi.fn()}
        allTotal={100}
        setAllTotal={vi.fn()}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'load-table' }))
    await waitFor(() =>
      expect(mocks.queryRisks).toHaveBeenCalledWith(
        expect.objectContaining({ SeverityList: ['none'], Severity: 'none' }),
      ),
    )
  })

  it.each([false, true])('类型筛选保持显示名查询合同，缺失时回退，不展示空白项（企业版 %s）', async (enterprise) => {
    mocks.enterprise = enterprise
    mocks.queryRiskTypes.mockResolvedValue([
      { Name: 'info', Verbose: '', Total: 3 },
      { Name: 'sqli', Verbose: 'SQL注入', Total: 2 },
      { Name: 'sqli-other', Verbose: 'SQL注入', Total: 1 },
      { Name: 'custom', Verbose: '   ', Total: 1 },
      { Name: '', Verbose: '', Total: 1 },
    ])
    await renderTable()
    const filters = mocks.columns.find((column) => column.dataKey === 'RiskTypeVerbose').filterProps.filters
    expect(filters).toEqual([
      { value: 'info', label: 'info', total: 3 },
      { value: 'SQL注入', label: 'SQL注入', total: 3 },
      { value: 'custom', label: 'custom', total: 1 },
    ])
  })

  it('企业版处置状态合并预设、自定义状态和历史标签，保留翻译及统计并去重', async () => {
    mocks.queryRiskTags.mockResolvedValue({
      RiskTags: [
        { Name: '确认', Total: 3 },
        { Name: '自定义状态', Total: 2 },
        { Name: '历史标签', Total: 1 },
        { Name: '自定义状态', Total: 2 },
        { Name: ' ', Total: 1 },
      ],
    })
    await renderTable()
    expect(mocks.columns.find((column) => column.dataKey === 'Tags').filterProps.filters).toEqual([
      ...DISPOSAL_STATUS_OPTIONS.map((item) => ({
        value: item.value,
        label: item.labelKey,
        ...(item.value === '确认' ? { total: 3 } : {}),
      })),
      { value: '自定义状态', label: '自定义状态', total: 2 },
      { value: '历史标签', label: '历史标签', total: 1 },
    ])
  })

  it('自定义处置状态筛选将原始标签值传给风险查询', async () => {
    const setQuery = vi.fn()
    const props = { setQuery, setRiskLoading: vi.fn(), allTotal: 100, setAllTotal: vi.fn() }
    const { rerender } = render(<YakitRiskTable {...props} query={query} />)
    fireEvent.click(screen.getByRole('button', { name: 'filter-custom-status' }))
    const nextQuery = setQuery.mock.calls.at(-1)?.[0]
    expect(nextQuery.TagList).toEqual(['自定义状态', '历史标签'])
    rerender(<YakitRiskTable {...props} query={nextQuery} />)
    fireEvent.click(screen.getByRole('button', { name: 'load-table' }))
    await waitFor(() =>
      expect(mocks.queryRisks).toHaveBeenCalledWith(
        expect.objectContaining({ TagList: ['自定义状态', '历史标签'], Tags: '自定义状态|历史标签' }),
      ),
    )
  })

  it.each(['single', 'batch'])('%s 保存自定义状态后刷新列头筛选选项', async (mode) => {
    await renderTable()
    mocks.queryRiskTags.mockResolvedValue({ RiskTags: [{ Name: '自定义状态', Total: 1 }] })
    let formProps
    if (mode === 'single') {
      const column = mocks.columns.find((item) => item.dataKey === 'RiskTypeVerbose')
      const cell = render(column.render('', rows[0]))
      fireEvent.click(cell.getByText('SQL注入'))
      formProps = mocks.showModal.mock.calls[0][0].content.props
    } else {
      fireEvent.click(screen.getByRole('button', { name: 'select-first' }))
      formProps = openBatchEdit()
    }
    await act(async () => {
      await formProps.onSave({ ...rows[0], SeverityScore: 7, Tags: '自定义状态' })
    })
    await waitFor(() => {
      expect(mocks.queryRiskTags).toHaveBeenCalled()
      expect(mocks.columns.find((column) => column.dataKey === 'Tags').filterProps.filters).toContainEqual({
        value: '自定义状态',
        label: '自定义状态',
        total: 1,
      })
    })
  })

  it('刷新风险列表时同步刷新类型和处置状态选项', async () => {
    mocks.enterprise = false
    await renderTable()
    mocks.queryRiskTypes.mockResolvedValue([{ Name: 'ssrf', Verbose: 'SSRF', Total: 2 }])
    mocks.queryRiskTags.mockResolvedValue({ RiskTags: [{ Name: '待验证', Total: 2 }] })
    act(() => mocks.refreshRisks?.())
    await waitFor(() => {
      expect(mocks.columns.find((column) => column.dataKey === 'RiskTypeVerbose').filterProps.filters).toEqual([
        { value: 'SSRF', label: 'SSRF', total: 2 },
      ])
      expect(mocks.columns.find((column) => column.dataKey === 'Tags').filterProps.filters).toEqual([
        { value: '待验证', label: '待验证', total: 2 },
      ])
    })
  })

  it('显式选择只提交 IDs，成功后刷新列表与分组', async () => {
    await renderTable()
    fireEvent.click(screen.getByRole('button', { name: 'select-first' }))
    fireEvent.click(screen.getByRole('button', { name: 'select-second' }))

    const formProps = openBatchEdit()
    await formProps.onSave({ RiskType: 'SQL注入', SeverityScore: 8.8, Tags: '确认' })

    expect(mocks.batchSetRiskTags).toHaveBeenCalledTimes(1)
    const request = mocks.batchSetRiskTags.mock.calls[0][0]
    expect(request.Ids).toEqual([11, 22])
    expect(request).not.toHaveProperty('Filter')
    expect(mocks.queryRisks).toHaveBeenCalled()
    expect(mocks.emit).toHaveBeenCalledWith('onRefRiskFieldGroup')
  })

  it('显式只选一条时回填该条风险快照', async () => {
    await renderTable()
    fireEvent.click(screen.getByRole('button', { name: 'select-first' }))

    const formProps = openBatchEdit()

    expect(formProps.batchCount).toBe(1)
    expect(formProps.info).toEqual(rows[0])
    expect(formProps.info).not.toBe(rows[0])
  })

  it.each(['batch-modify', 'batch-export-csv'])('单条保存后 %s 使用最新勾选数据', async (action) => {
    await renderTable()
    fireEvent.click(screen.getByRole('button', { name: 'select-first' }))
    const typeColumn = mocks.columns.find((column) => column.dataKey === 'RiskTypeVerbose')
    const cell = render(typeColumn.render('', rows[0]))
    fireEvent.click(cell.getByText('SQL注入'))
    const editProps = mocks.showModal.mock.calls[0][0].content.props
    await act(async () => {
      await editProps.onSave({ ...rows[0], RiskType: 'SSRF', SeverityScore: 8.8, Tags: '确认', TagReason: '已核实' })
    })
    mocks.showModal.mockClear()

    fireEvent.click(screen.getByRole('button', { name: action }))
    const nextProps = mocks.showModal.mock.calls[0][0].content.props
    const savedRisk = action === 'batch-modify' ? nextProps.info : (await nextProps.getData()).response.Data[0]
    expect(savedRisk).toEqual(
      expect.objectContaining({
        Id: 11,
        RiskType: 'SSRF',
        RiskTypeVerbose: 'SSRF',
        SeverityScore: 8.8,
        Severity: 'high',
        Tags: '确认',
        TagReason: '已核实',
      }),
    )
  })

  it('显式选择多条时使用空白批量模板', async () => {
    await renderTable()
    fireEvent.click(screen.getByRole('button', { name: 'select-first' }))
    fireEvent.click(screen.getByRole('button', { name: 'select-second' }))

    const formProps = openBatchEdit()

    expect(formProps.info).toEqual({ Id: 0, Hash: '', IP: '', Title: '', RiskType: '', CreatedAt: 0 })
  })

  it('全选即使总数为一也使用空白批量模板', async () => {
    render(
      <YakitRiskTable query={query} setQuery={vi.fn()} setRiskLoading={vi.fn()} allTotal={1} setAllTotal={vi.fn()} />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'load-table' }))
    await waitFor(() => expect(screen.getByTestId('loaded-count')).toHaveTextContent('2'))
    vi.clearAllMocks()
    fireEvent.click(screen.getByRole('button', { name: 'select-all' }))

    const formProps = openBatchEdit()

    expect(formProps.batchCount).toBe(1)
    expect(formProps.info).toEqual({ Id: 0, Hash: '', IP: '', Title: '', RiskType: '', CreatedAt: 0 })
  })

  it('全选按当前未读过滤提交，不退化为已加载行 IDs', async () => {
    await renderTable()
    fireEvent.click(screen.getByRole('button', { name: 'type-false' }))
    fireEvent.click(screen.getByRole('button', { name: 'select-all' }))

    const formProps = openBatchEdit()
    expect(formProps.batchCount).toBe(100)
    await formProps.onSave({ RiskType: 'XSS', SeverityScore: 5, Tags: '待验证' })

    const request = mocks.batchSetRiskTags.mock.calls[0][0]
    expect(request).not.toHaveProperty('Ids')
    expect(request.Filter).toEqual(
      expect.objectContaining({
        Search: 'needle',
        Network: '10.0.0.0/8',
        RiskType: 'SQL注入',
        IsRead: 'false',
      }),
    )
  })

  it('批量修改失败时向表单返回拒绝且不刷新', async () => {
    await renderTable()
    mocks.batchSetRiskTags.mockRejectedValueOnce(new Error('save failed'))
    fireEvent.click(screen.getByRole('button', { name: 'select-first' }))

    const formProps = openBatchEdit()
    await expect(formProps.onSave({ RiskType: 'SQL注入', SeverityScore: 4, Tags: '确认' })).rejects.toThrow(
      'save failed',
    )

    expect(mocks.queryRisks).not.toHaveBeenCalled()
    expect(mocks.emit).not.toHaveBeenCalledWith('onRefRiskFieldGroup')
  })

  it('删除经确认后执行，并保留打开确认框时的选择范围', async () => {
    await renderTable()
    fireEvent.click(screen.getByRole('button', { name: 'select-first' }))
    fireEvent.click(screen.getByRole('button', { name: 'batch-delete' }))

    expect(mocks.deleteRisk).not.toHaveBeenCalled()
    const confirmConfig = mocks.confirmModal.mock.calls[0][0]
    fireEvent.click(screen.getByRole('button', { name: 'select-second' }))
    await confirmConfig.onOk()

    await waitFor(() => expect(mocks.deleteRisk).toHaveBeenCalledWith({ Ids: [11] }))
    await waitFor(() => expect(mocks.emit).toHaveBeenCalledWith('onRefRiskFieldGroup'))
  })

  it('删除失败保留确认框与原范围，防止重复提交并允许重试', async () => {
    await renderTable()
    mocks.deleteRisk.mockRejectedValueOnce(new Error('delete failed')).mockResolvedValueOnce(null)
    fireEvent.click(screen.getByRole('button', { name: 'select-first' }))
    fireEvent.click(screen.getByRole('button', { name: 'batch-delete' }))

    const confirmConfig = mocks.confirmModal.mock.calls[0][0]
    const firstSubmit = confirmConfig.onOk()
    const duplicatedSubmit = confirmConfig.onOk()
    await Promise.all([firstSubmit, duplicatedSubmit])
    expect(mocks.deleteRisk).toHaveBeenCalledTimes(1)
    expect(mocks.destroyModal).not.toHaveBeenCalled()
    expect(mocks.emit).not.toHaveBeenCalledWith('onRefRiskFieldGroup')

    await confirmConfig.onOk()
    expect(mocks.deleteRisk).toHaveBeenCalledTimes(2)
    expect(mocks.deleteRisk).toHaveBeenNthCalledWith(1, { Ids: [11] })
    expect(mocks.deleteRisk).toHaveBeenNthCalledWith(2, { Ids: [11] })
    expect(mocks.destroyModal).toHaveBeenCalledTimes(1)
  })

  it('清空独立使用当前过滤条件，不依赖批量选择', async () => {
    await renderTable()
    fireEvent.click(screen.getByRole('button', { name: 'confirm-clear' }))

    await waitFor(() => expect(mocks.deleteRisk).toHaveBeenCalledTimes(1))
    const request = mocks.deleteRisk.mock.calls[0][0]
    expect(request).toEqual({
      Filter: expect.objectContaining({ Search: 'needle', Network: '10.0.0.0/8', RiskType: 'SQL注入' }),
    })
    expect(request).not.toHaveProperty('Ids')
  })

  it('社区版即使收到修改标记动作也不打开弹窗', async () => {
    mocks.enterprise = false
    await renderTable()
    fireEvent.click(screen.getByRole('button', { name: 'select-first' }))
    fireEvent.click(screen.getByRole('button', { name: 'batch-modify' }))

    expect(mocks.showModal).not.toHaveBeenCalled()
    expect(mocks.batchSetRiskTags).not.toHaveBeenCalled()
  })

  it('CSV 弹窗固定打开时的显式选择快照', async () => {
    await renderTable()
    fireEvent.click(screen.getByRole('button', { name: 'select-first' }))
    fireEvent.click(screen.getByRole('button', { name: 'batch-export-csv' }))

    const exportProps = mocks.showModal.mock.calls[0][0].content.props
    fireEvent.click(screen.getByRole('button', { name: 'clear-selection' }))
    fireEvent.click(screen.getByRole('button', { name: 'select-second' }))
    const result = await exportProps.getData()

    expect(result.response.Data).toEqual([rows[0]])
    expect(mocks.queryRisks).not.toHaveBeenCalled()
  })

  it('取消 CSV 弹窗后保留原批量选择', async () => {
    await renderTable()
    fireEvent.click(screen.getByRole('button', { name: 'select-first' }))
    fireEvent.click(screen.getByRole('button', { name: 'batch-export-csv' }))

    mocks.showModal.mock.calls[0][0].onCancel()
    mocks.showModal.mockClear()
    fireEvent.click(screen.getByRole('button', { name: 'batch-modify' }))

    expect(mocks.showModal).toHaveBeenCalledTimes(1)
    expect(mocks.showModal.mock.calls[0][0].content.props.batchCount).toBe(1)
  })

  it('全选后后台总数更新仍保持 Filter 范围', async () => {
    const { rerender } = await renderTable()
    fireEvent.click(screen.getByRole('button', { name: 'select-all' }))
    mocks.queryIncrement.mockResolvedValueOnce({
      Data: [{ Id: 33, Hash: 'risk-33', IP: '127.0.0.3', Title: 'risk 33', RiskType: 'SSRF', CreatedAt: 3 }],
    })
    mocks.queryRisks.mockResolvedValueOnce({
      Data: rows,
      Total: 101,
      Pagination: { Page: 1, Limit: 1, OrderBy: 'id', Order: 'desc' },
    })

    mocks.intervalCallbacks[0]()
    await waitFor(() => expect(mocks.queryRisks).toHaveBeenCalled())
    rerender(
      <YakitRiskTable query={query} setQuery={vi.fn()} setRiskLoading={vi.fn()} allTotal={101} setAllTotal={vi.fn()} />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'batch-modify' }))
    const formProps = mocks.showModal.mock.calls[0][0].content.props
    expect(formProps.batchCount).toBe(101)
    await formProps.onSave({ RiskType: 'SQL注入', SeverityScore: 7.5, Tags: '确认' })

    const request = mocks.batchSetRiskTags.mock.calls[0][0]
    expect(request).toHaveProperty('Filter')
    expect(request).not.toHaveProperty('Ids')
  })

  it('CSV 全选查询失败时向导出组件返回拒绝', async () => {
    await renderTable()
    fireEvent.click(screen.getByRole('button', { name: 'select-all' }))
    fireEvent.click(screen.getByRole('button', { name: 'batch-export-csv' }))

    mocks.queryRisks.mockRejectedValueOnce(new Error('export failed'))
    const exportProps = mocks.showModal.mock.calls[0][0].content.props
    await expect(exportProps.getData()).rejects.toThrow('export failed')
  })
})
