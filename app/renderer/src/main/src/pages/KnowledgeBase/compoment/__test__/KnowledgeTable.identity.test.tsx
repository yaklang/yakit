import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

interface KnowledgeRow {
  ID: number
  HiddenIndex: string
  KnowledgeBaseId: number
}

const testState = vi.hoisted(() => ({
  rows: [] as KnowledgeRow[],
  tableProps: undefined as any,
  setTableData: vi.fn(),
  invoke: vi.fn(),
}))

vi.mock('@/components/TableVirtualResize/TableVirtualResize', async () => {
  const React = await import('react')
  return {
    TableVirtualResize: React.forwardRef((props: any, _ref) => {
      testState.tableProps = props
      return React.createElement('div', { 'data-testid': 'knowledge-table-shell' })
    }),
  }
})

vi.mock('ahooks', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>
  return {
    ...actual,
    useRequest: (service: (...args: any[]) => Promise<any>, options: any = {}) => ({
      data: undefined,
      loading: false,
      run: (...args: any[]) => {
        void service(...args).then(options.onSuccess, options.onError)
      },
      runAsync: service,
    }),
  }
})

vi.mock('@/components/yakitUI/YakitResizeBox/YakitResizeBox', async () => {
  const React = await import('react')
  return {
    YakitResizeBox: ({ firstNode }: { firstNode: ReactNode }) => React.createElement(React.Fragment, null, firstNode),
  }
})

vi.mock('react-resize-detector', () => ({ default: () => null }))

vi.mock('@/hook/useVirtualTableHook/useVirtualTableHook', () => ({
  default: () => [
    { Filter: {}, Pagination: {} },
    testState.rows,
    testState.rows.length,
    { Page: 1, Limit: 20 },
    undefined,
    undefined,
    { setP: vi.fn(), setTData: testState.setTableData, startT: vi.fn() },
  ],
}))

vi.mock('../../utils', () => ({
  apiQueryEntity: vi.fn(),
  apiSearchKnowledgeBaseEntry: vi.fn(),
  transformToGraphData: vi.fn(),
}))

vi.mock('../GraphChart', () => ({ default: () => null }))
vi.mock('../GenerateKnowledge', () => ({ GenerateKnowledge: () => null }))
vi.mock('../KnowledgeDetailDrawer', () => ({ KnowledgeDetailDrawer: () => null }))
vi.mock('@/pages/pluginHub/hooks/useListenWidth', () => ({ default: () => 1200 }))
vi.mock('@/pages/invoker/schema', () => ({ genDefaultPagination: () => ({ Page: 1, Limit: 20 }) }))
vi.mock('@/utils/eventBus/eventBus', () => ({ default: { on: vi.fn(), off: vi.fn() } }))
vi.mock('@/utils/notification', () => ({ failed: vi.fn(), success: vi.fn() }))
vi.mock('@/components/yakitUI/YakitTag/YakitTag', () => ({ YakitTag: () => null }))
vi.mock('@/components/yakitUI/YakitPopconfirm/YakitPopconfirm', async () => {
  const React = await import('react')
  return {
    YakitPopconfirm: ({ children, disabled, onConfirm }: any) =>
      React.createElement(
        'button',
        {
          'data-testid': 'confirm-delete',
          disabled,
          onClick: disabled ? undefined : () => onConfirm?.({ stopPropagation: vi.fn() }),
        },
        children,
      ),
  }
})
vi.mock('@/components/yakitUI/YakitRadioButtons/YakitRadioButtons', () => ({ YakitRadioButtons: () => null }))
vi.mock('@/components/yakitUI/YakitSpin/YakitSpin', () => ({ YakitSpin: ({ children }: any) => children }))
vi.mock('@/components/yakitUI/YakitEmpty/YakitEmpty', () => ({ YakitEmpty: () => null }))
vi.mock('@/components/yakitUI/YakitInputNumber/YakitInputNumber', () => ({ YakitInputNumber: () => null }))
vi.mock('@/components/yakitUI/YakitPopover/YakitPopover', () => ({ YakitPopover: () => null }))
vi.mock('@/pages/pluginHub/hubExtraOperate/funcTemplate', () => ({ HubButton: () => null }))
vi.mock('@yakit-libs/yakit-ui-icons/outline', () => ({
  ExclamationOutlined: () => null,
  PhotographOutlined: () => null,
  Play2Outlined: () => null,
  TerminalOutlined: () => null,
  XOutlined: () => null,
  ArrowCircleRightOutlined: () => null,
  TrashOutlined: () => null,
}))
vi.mock('@yakit-libs/yakit-ui-icons/solid', () => ({ XSolid: () => null }))

const validRows: KnowledgeRow[] = [
  { ID: 7, HiddenIndex: 'knowledge-a', KnowledgeBaseId: 1 },
  { ID: 8, HiddenIndex: 'knowledge-b', KnowledgeBaseId: 1 },
]

const duplicateIdRows: KnowledgeRow[] = [validRows[0], { ...validRows[1], ID: 7 }]

const renderKnowledgeTable = async (selectList: KnowledgeRow[] = validRows) => {
  const setSelectList = vi.fn()
  const setAllCheck = vi.fn()
  const setTableProps = vi.fn()
  const electron = { ipcRenderer: { invoke: testState.invoke } }
  Object.defineProperty(window, 'require', {
    configurable: true,
    value: vi.fn(() => electron),
  })
  const { KnowledgeTable } = await import('../KnowledgeTable')

  const tableProps = {
    knowledgeBaseItems: { ID: 1 } as any,
    setTableProps,
    tableProps: { type: 'knowledge', tableTotal: 0 } as any,
    query: '',
    linkId: [],
    selectList,
    setSelectList,
    allCheck: false,
    setAllCheck,
  }
  const rendered = render(<KnowledgeTable {...tableProps} />)

  return {
    rerender: () => rendered.rerender(<KnowledgeTable {...tableProps} />),
    setSelectList,
  }
}

describe('KnowledgeTable interaction identity', () => {
  beforeEach(() => {
    testState.rows = validRows
    testState.tableProps = undefined
    testState.setTableData.mockReset()
    testState.invoke.mockReset()
    testState.invoke.mockResolvedValue(undefined)
    vi.clearAllMocks()
  })

  afterEach(cleanup)

  it('preserves ID as the interaction key for a snapshot with unique valid identities', async () => {
    await renderKnowledgeTable()

    expect(testState.tableProps.renderKey).toBe('ID')
  })

  it('publishes numeric selected row keys for a snapshot with unique valid identities', async () => {
    await renderKnowledgeTable()

    expect(testState.tableProps.rowSelection.selectedRowKeys).toEqual([7, 8])
  })

  it('disables checkbox interaction when two records share the interaction ID', async () => {
    testState.rows = duplicateIdRows
    await renderKnowledgeTable([])

    expect(testState.tableProps.rowSelection.getCheckboxProps(duplicateIdRows[1])).toMatchObject({ disabled: true })
  })

  it('refuses current-row selection when two records share the interaction ID', async () => {
    testState.rows = duplicateIdRows
    const { setSelectList } = await renderKnowledgeTable([])

    await act(() => testState.tableProps.onSetCurrentRow(duplicateIdRows[1]))

    expect(setSelectList).not.toHaveBeenCalled()
  })

  it('refuses deletion when two records share the interaction ID', async () => {
    testState.rows = duplicateIdRows
    await renderKnowledgeTable([])
    const operationColumn = testState.tableProps.columns.find(({ title }: any) => title === '操作')
    const operationCell = operationColumn.render('', duplicateIdRows[1])
    const rendered = render(operationCell)
    const confirm = rendered.queryByTestId('confirm-delete')

    if (confirm) fireEvent.click(confirm)

    expect(testState.invoke).not.toHaveBeenCalledWith('DeleteKnowledgeBaseEntry', expect.anything())
  })

  it('sends both the interaction ID and exact HiddenIndex when deleting a valid record', async () => {
    await renderKnowledgeTable([])
    const operationColumn = testState.tableProps.columns.find(({ title }: any) => title === '操作')

    fireEvent.click(render(operationColumn.render('', validRows[0])).getByTestId('confirm-delete'))

    await waitFor(() =>
      expect(testState.invoke).toHaveBeenCalledWith('DeleteKnowledgeBaseEntry', {
        KnowledgeBaseEntryId: validRows[0].ID,
        KnowledgeBaseId: validRows[0].KnowledgeBaseId,
        KnowledgeBaseEntryHiddenIndex: validRows[0].HiddenIndex,
      }),
    )
  })

  it('removes only the requested HiddenIndex from the response-time snapshot after a delayed deletion', async () => {
    let resolveDelete: (() => void) | undefined
    testState.invoke.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveDelete = resolve
      }),
    )
    testState.rows = [validRows[0]]
    const { rerender } = await renderKnowledgeTable([])
    const operationColumn = testState.tableProps.columns.find(({ title }: any) => title === '操作')
    const operationCell = operationColumn.render('', validRows[0])

    fireEvent.click(render(operationCell).getByTestId('confirm-delete'))

    const sameIdReplacement = { ...validRows[1], ID: validRows[0].ID }
    testState.rows = [validRows[0], sameIdReplacement]
    rerender()
    resolveDelete?.()

    await waitFor(() => expect(testState.setTableData).toHaveBeenCalledWith([sameIdReplacement]))
  })

  it('disables checkbox interaction for a record with a whitespace-only HiddenIndex', async () => {
    const invalidRow = { ID: 9, HiddenIndex: '   ', KnowledgeBaseId: 1 }
    testState.rows = [invalidRow]
    await renderKnowledgeTable([])

    expect(testState.tableProps.rowSelection.getCheckboxProps(invalidRow)).toMatchObject({ disabled: true })
  })

  it('refuses current-row selection for a record with an empty HiddenIndex', async () => {
    const invalidRow = { ID: 9, HiddenIndex: '', KnowledgeBaseId: 1 }
    testState.rows = [invalidRow]
    const { setSelectList } = await renderKnowledgeTable([])

    await act(() => testState.tableProps.onSetCurrentRow(invalidRow))

    expect(setSelectList).not.toHaveBeenCalled()
  })

  it('disables checkbox interaction for a non-string HiddenIndex', async () => {
    const invalidRow = { ID: 9, HiddenIndex: 99, KnowledgeBaseId: 1 } as unknown as KnowledgeRow
    testState.rows = [invalidRow]
    await renderKnowledgeTable([])

    expect(testState.tableProps.rowSelection.getCheckboxProps(invalidRow)).toMatchObject({ disabled: true })
  })

  it('disables both records when HiddenIndex is duplicated inside one snapshot', async () => {
    const duplicateHiddenIndexRows = [validRows[0], { ...validRows[1], HiddenIndex: validRows[0].HiddenIndex }]
    testState.rows = duplicateHiddenIndexRows
    await renderKnowledgeTable([])

    expect(duplicateHiddenIndexRows.map(testState.tableProps.rowSelection.getCheckboxProps)).toEqual([
      expect.objectContaining({ disabled: true }),
      expect.objectContaining({ disabled: true }),
    ])
  })

  it('shows an identity diagnostic instead of dangerous controls for an ambiguous record', async () => {
    testState.rows = duplicateIdRows
    await renderKnowledgeTable([])
    const operationColumn = testState.tableProps.columns.find(({ title }: any) => title === '操作')

    render(operationColumn.render('', duplicateIdRows[1]))

    expect(screen.getByText('身份异常')).toBeVisible()
  })
})
