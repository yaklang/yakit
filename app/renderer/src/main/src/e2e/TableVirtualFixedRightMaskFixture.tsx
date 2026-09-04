import { useEffect, useMemo, useRef, useState } from 'react'
import { TableVirtualResize } from '@/components/TableVirtualResize/TableVirtualResize'
import type { ColumnsTypeProps } from '@/components/TableVirtualResize/TableVirtualResizeType'

interface FixtureRow {
  ID: number
  HiddenIndex: string
  Name: string
  Detail: string
  Category: string
  Sentinel: string
  Operation: string
}

const ROW_COUNT = 1500
const getFixtureRowKey = (record: FixtureRow) => record.HiddenIndex

const columns: ColumnsTypeProps[] = [
  { title: 'ID', dataKey: 'ID', width: 100 },
  { title: 'Name', dataKey: 'Name', width: 260 },
  { title: 'Detail', dataKey: 'Detail', width: 300 },
  { title: 'Category', dataKey: 'Category', width: 220 },
  {
    title: 'Sentinel',
    dataKey: 'Sentinel',
    width: 420,
    render: (text, _record, index) => <span data-fixture-row-index={index}>{text}</span>,
  },
  { title: 'Operation', dataKey: 'Operation', width: 90, fixed: 'right', render: () => null },
]

const annotateVirtualRows = (root: HTMLElement) => {
  const scrollContainer = root.querySelector<HTMLElement>('[class*="virtual-table-list-container"]')
  const wrapper = Array.from(root.querySelectorAll<HTMLElement>('[class*="virtual-table-list"]')).find((candidate) => {
    const children = Array.from(candidate.children)
    return (
      children.length === columns.length &&
      children.every((child) => child.className.includes('virtual-table-row-content'))
    )
  })
  const renderedColumns = wrapper?.querySelectorAll<HTMLElement>(':scope > [class*="virtual-table-row-content"]')
  const sentinelColumn = renderedColumns?.item(4)
  const fixedColumn = renderedColumns?.item(5)

  if (!scrollContainer || !wrapper || !sentinelColumn || !fixedColumn) return

  scrollContainer.dataset.testid = 'table-mask-scroll-container'
  wrapper.dataset.testid = 'table-mask-virtual-wrapper'
  fixedColumn.dataset.testid = 'table-mask-fixed-column'
  sentinelColumn.dataset.testid = 'table-mask-sentinel-column'

  const sentinelCells = Array.from(sentinelColumn.children) as HTMLElement[]
  const fixedCells = Array.from(fixedColumn.children) as HTMLElement[]
  if (sentinelCells.length === 0 && fixedCells.length === 0) return
  if (sentinelCells.length === 0 || sentinelCells.length !== fixedCells.length) {
    throw new Error(
      `Fixture columns must contain the same non-zero cell count: sentinel=${sentinelCells.length}, fixed=${fixedCells.length}`,
    )
  }
  sentinelCells.forEach((cell, position) => {
    const index = cell.querySelector<HTMLElement>('[data-fixture-row-index]')?.dataset.fixtureRowIndex
    if (index === undefined) return
    cell.dataset.virtualIndex = index
    if (fixedCells[position]) fixedCells[position].dataset.virtualIndex = index
  })
  root.dataset.annotationReady = 'true'
}

export const TableVirtualFixedRightMaskFixture = () => {
  const [variant, setVariant] = useState<'production' | 'no-top-control'>('production')
  const [dataset, setDataset] = useState<'unique' | 'duplicate'>('unique')
  const [identity, setIdentity] = useState<'row-key' | 'render-key'>('row-key')
  const rootRef = useRef<HTMLDivElement>(null)
  const tableRef = useRef<any>(null)
  const rows = useMemo<FixtureRow[]>(
    () =>
      Array.from({ length: ROW_COUNT }, (_, index) => ({
        ID: dataset === 'duplicate' ? (index % 3) + 1 : index + 1,
        HiddenIndex: `row-${index}`,
        Name: `fixture-name-${index}`,
        Detail: `fixture-detail-${index}`,
        Category: `fixture-category-${index % 7}`,
        Sentinel: `sentinel-${index}-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`,
        Operation: '',
      })),
    [dataset],
  )

  useEffect(() => {
    document.getElementById('initial-loading')?.remove()
    const root = rootRef.current
    if (!root) return

    const annotate = () => annotateVirtualRows(root)
    const observer = new MutationObserver(annotate)
    observer.observe(root, { childList: true, subtree: true })
    annotate()
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    tableRef.current?.containerRef?.scrollTo({ top: 0, left: 0 })
  }, [dataset, identity, variant])

  return (
    <div
      ref={rootRef}
      data-testid="table-virtual-fixed-right-fixture"
      data-variant={variant}
      data-dataset={dataset}
      data-identity={identity}
    >
      <style>{`
        html, body, #root { margin: 0; width: 100%; height: 100%; overflow: hidden; }
        [data-testid='table-virtual-fixed-right-fixture'] {
          box-sizing: border-box;
          min-height: 100%;
          padding: 32px;
          background: #ffffff;
        }
        [data-testid='table-mask-controls'] { display: flex; gap: 8px; margin-bottom: 8px; }
        [data-testid='table-mask-calibration'] {
          display: flex;
          justify-content: flex-end;
          gap: 2px;
          width: 900px;
          height: 12px;
          margin-bottom: 4px;
        }
        [data-calibration] { width: 20px; height: 12px; }
        [data-calibration='red'] { background: color(display-p3 1 0 0); }
        [data-calibration='green'] { background: color(display-p3 0 1 0); }
        [data-calibration='blue'] { background: color(display-p3 0 0 1); }
        [data-testid='table-mask-frame'] { width: 900px; height: 420px; }
        [data-testid='table-mask-sentinel-column'],
        [data-testid='table-mask-sentinel-column'] > * { background: color(display-p3 1 0 1) !important; }
        [data-testid='table-mask-fixed-column'] { background: color(display-p3 0 1 0) !important; }
        [data-variant='no-top-control'] [data-testid='table-mask-fixed-column'] { top: auto !important; }
      `}</style>
      <div data-testid="table-mask-controls">
        <button data-testid="table-mask-production" onClick={() => setVariant('production')}>
          production
        </button>
        <button data-testid="table-mask-no-top-control" onClick={() => setVariant('no-top-control')}>
          no-top non-causal control
        </button>
        <output data-testid="table-mask-active-variant">{variant}</output>
        <button data-testid="table-mask-unique" onClick={() => setDataset('unique')}>
          unique IDs
        </button>
        <button data-testid="table-mask-duplicate" onClick={() => setDataset('duplicate')}>
          duplicate IDs
        </button>
        <output data-testid="table-mask-active-dataset">{dataset}</output>
        <button data-testid="table-mask-row-key" onClick={() => setIdentity('row-key')}>
          HiddenIndex row key
        </button>
        <button data-testid="table-mask-render-key" onClick={() => setIdentity('render-key')}>
          renderKey identity
        </button>
        <output data-testid="table-mask-active-identity">{identity}</output>
      </div>
      <div data-testid="table-mask-calibration">
        <span data-calibration="red" />
        <span data-calibration="green" />
        <span data-calibration="blue" />
      </div>
      <div data-testid="table-mask-frame">
        <TableVirtualResize<FixtureRow>
          key={`${dataset}-${identity}`}
          ref={tableRef}
          data={rows}
          columns={columns}
          renderKey="ID"
          {...(identity === 'row-key' ? { getRowKey: getFixtureRowKey } : {})}
          isRefresh={false}
          isShowTitle={false}
          pagination={{ page: 1, limit: ROW_COUNT, total: ROW_COUNT, onChange: () => {} }}
        />
      </div>
    </div>
  )
}
