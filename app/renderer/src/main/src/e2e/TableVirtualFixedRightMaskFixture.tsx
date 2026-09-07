import { useEffect, useMemo, useRef, useState } from 'react'
import { TableVirtualResize } from '@/components/TableVirtualResize/TableVirtualResize'
import type { ColumnsTypeProps } from '@/components/TableVirtualResize/TableVirtualResizeType'

interface FixtureRow {
  ordinal: number
  ID: number
  HiddenIndex: string
  immutableLabel: string
  identityDigest: string
  Name: string
  Detail: string
  Category: string
  Sentinel: string
  Operation: string
}

type FixtureVariant = 'production' | 'no-top-control' | 'fixed-record-fault'
type FixtureLayout = 'single-right' | 'double-right' | 'left-and-right'
type FixtureState = 'empty' | 'loading' | 'data' | 'append' | 'prepend' | 'replace' | 'remove' | 'sort-filter-refresh'

const ROW_COUNT = 1500
const IDENTITY_FIELDS = ['ordinal', 'ID', 'HiddenIndex', 'immutableLabel'] as const
const getFixtureRowKey = (record: FixtureRow) => record.HiddenIndex

const createIdentityDigest = async (record: FixtureRow) => {
  const identity = IDENTITY_FIELDS.map((field) => `${field}=${typeof record[field]}:${String(record[field])}`).join(
    '\u001f',
  )
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(identity))
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

const createRows = (dataset: 'unique' | 'duplicate'): FixtureRow[] =>
  Array.from({ length: ROW_COUNT }, (_, index) => ({
    ordinal: index,
    ID: dataset === 'duplicate' ? (index % 3) + 1 : index + 1,
    HiddenIndex: `row-${index}`,
    immutableLabel: `fixture-${index}`,
    identityDigest: '',
    Name: `fixture-name-${index}`,
    Detail: `fixture-detail-${index}`,
    Category: `fixture-category-${index % 7}`,
    Sentinel: `sentinel-${index}-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`,
    Operation: '',
  }))

const annotateVirtualRows = (root: HTMLElement) => {
  const scrollContainer = root.querySelector<HTMLElement>('[class*="virtual-table-list-container"]')
  const sentinelMarker = root.querySelector<HTMLElement>('[data-oracle-source="sentinel"]')
  const fixedMarker = root.querySelector<HTMLElement>('[data-oracle-source="fixed"]')
  const sentinelColumn = sentinelMarker?.closest<HTMLElement>('[class*="virtual-table-row-content"]')
  const fixedColumn = fixedMarker?.closest<HTMLElement>('[class*="virtual-table-row-content"]')
  const wrapper = sentinelColumn?.parentElement
  if (!scrollContainer || !wrapper || !sentinelColumn || !fixedColumn) return

  scrollContainer.dataset.testid = 'table-mask-scroll-container'
  wrapper.dataset.testid = 'table-mask-virtual-wrapper'
  fixedColumn.dataset.testid = 'table-mask-fixed-column'
  sentinelColumn.dataset.testid = 'table-mask-sentinel-column'
  const annotateColumn = (column: HTMLElement, source: 'sentinel' | 'fixed') => {
    for (const cell of Array.from(column.children) as HTMLElement[]) {
      const visualIndex = cell.querySelector<HTMLElement>(`[data-oracle-source="${source}"]`)?.dataset.visualIndex
      if (visualIndex !== undefined) cell.dataset.virtualIndex = visualIndex
    }
  }
  annotateColumn(sentinelColumn, 'sentinel')
  annotateColumn(fixedColumn, 'fixed')
  root.dataset.annotationReady = 'true'
}

export const TableVirtualFixedRightMaskFixture = () => {
  const [variant, setVariant] = useState<FixtureVariant>('production')
  const [dataset, setDataset] = useState<'unique' | 'duplicate'>('unique')
  const [identity, setIdentity] = useState<'row-key' | 'render-key'>('row-key')
  const [layout, setLayout] = useState<FixtureLayout>('single-right')
  const [tableState, setTableState] = useState<FixtureState>('data')
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [hoverMode, setHoverMode] = useState<'none' | 'forced'>('none')
  const [manifest, setManifest] = useState<FixtureRow[]>([])
  const [manifestDataset, setManifestDataset] = useState<'unique' | 'duplicate'>()
  const [actionTuple, setActionTuple] = useState<{ ordinal: number; digest: string }>()
  const rootRef = useRef<HTMLDivElement>(null)
  const tableRef = useRef<any>(null)

  useEffect(() => {
    let active = true
    const rows = createRows(dataset)
    Promise.all(rows.map(async (row) => ({ ...row, identityDigest: await createIdentityDigest(row) }))).then((next) => {
      if (!active) return
      setManifest(next)
      setManifestDataset(dataset)
    })
    return () => {
      active = false
    }
  }, [dataset])

  const rows = useMemo(() => {
    if (tableState === 'empty' || tableState === 'loading') return []
    if (tableState === 'append') return manifest.slice(0, 180)
    if (tableState === 'prepend') return [manifest[200], ...manifest.slice(0, 179)].filter(Boolean)
    if (tableState === 'replace') return manifest.slice(300, 480)
    if (tableState === 'remove') return manifest.slice(0, 180).filter(({ ordinal }) => ordinal !== 80)
    if (tableState === 'sort-filter-refresh')
      return manifest
        .filter(({ ordinal }) => ordinal % 2 === 0)
        .slice(0, 180)
        .reverse()
    return manifest
  }, [manifest, tableState])

  const columns = useMemo<ColumnsTypeProps[]>(() => {
    const actionColumn = (title: string, secondary = false): ColumnsTypeProps => ({
      title,
      dataKey: secondary ? 'SecondaryOperation' : 'Operation',
      width: secondary ? 110 : 90,
      fixed: 'right',
      render: (_text, record: FixtureRow, index) => {
        const fixedRecord = variant === 'fixed-record-fault' ? (rows[(index + 1) % rows.length] ?? record) : record
        return (
          <button
            data-oracle-source={secondary ? 'fixed-secondary' : 'fixed'}
            data-visual-index={index}
            data-oracle-ordinal={fixedRecord.ordinal}
            data-oracle-digest={fixedRecord.identityDigest}
            data-testid={secondary ? 'table-mask-secondary-action' : 'table-mask-action'}
            onClick={() => setActionTuple({ ordinal: record.ordinal, digest: record.identityDigest })}
          >
            {secondary ? 'inspect' : 'open'}
          </button>
        )
      },
    })
    return [
      ...(layout === 'left-and-right' ? [{ title: 'Pinned', dataKey: 'ID', width: 90, fixed: 'left' as const }] : []),
      { title: 'ID', dataKey: 'ID', width: 90 },
      { title: 'Name', dataKey: 'Name', width: 260 },
      { title: 'Detail', dataKey: 'Detail', width: 300 },
      { title: 'Category', dataKey: 'Category', width: 220 },
      {
        title: 'Sentinel',
        dataKey: 'Sentinel',
        width: 420,
        render: (text, record: FixtureRow, index) => (
          <span
            data-oracle-source="sentinel"
            data-visual-index={index}
            data-oracle-ordinal={record.ordinal}
            data-oracle-digest={record.identityDigest}
          >
            {text}
          </span>
        ),
      },
      ...(layout === 'double-right' ? [actionColumn('Secondary', true)] : []),
      actionColumn('Operation'),
    ]
  }, [layout, rows, variant])

  useEffect(() => {
    document.getElementById('initial-loading')?.remove()
    const root = rootRef.current
    if (!root) return
    const observer = new MutationObserver(() => annotateVirtualRows(root))
    observer.observe(root, { childList: true, subtree: true })
    annotateVirtualRows(root)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    tableRef.current?.containerRef?.scrollTo({ top: 0, left: 0 })
  }, [dataset, identity, layout, tableState, variant])

  const options = <T extends string>(values: readonly T[], prefix: string, select: (value: T) => void) =>
    values.map((value) => (
      <button key={value} data-testid={`${prefix}-${value}`} onClick={() => select(value)}>
        {value}
      </button>
    ))

  const selectDataset = (value: 'unique' | 'duplicate') => {
    if (value === dataset && manifestDataset === value) return
    setManifest([])
    setManifestDataset(undefined)
    setDataset(value)
  }

  return (
    <div
      ref={rootRef}
      data-testid="table-virtual-fixed-right-fixture"
      data-variant={variant}
      data-layout={layout}
      data-theme={theme}
      data-hover-mode={hoverMode}
    >
      <style>{`
        html, body, #root { margin: 0; width: 100%; height: 100%; overflow: hidden; }
        [data-testid='table-virtual-fixed-right-fixture'] { box-sizing: border-box; min-height: 100%; padding: 32px; background: #fff; }
        [data-testid='table-virtual-fixed-right-fixture'][data-theme='dark'] { color: #f5f5f5; background: #171717; }
        [data-testid='table-mask-controls'] { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 8px; }
        [data-testid='table-mask-calibration'] { display: flex; justify-content: flex-end; gap: 2px; width: 900px; height: 12px; margin-bottom: 4px; }
        [data-calibration] { width: 20px; height: 12px; }
        [data-calibration='red'] { background: color(display-p3 1 0 0); }
        [data-calibration='green'] { background: color(display-p3 0 1 0); }
        [data-calibration='blue'] { background: color(display-p3 0 0 1); }
        [data-calibration='magenta'] { background: color(display-p3 1 0 1); }
        [data-testid='table-mask-frame'] { width: 900px; height: 420px; }
        [data-testid='table-mask-sentinel-column'], [data-testid='table-mask-sentinel-column'] > * { background: color(display-p3 1 0 1) !important; }
        [data-testid='table-mask-fixed-column'], [data-testid='table-mask-fixed-column'] > * {
          background: color(display-p3 0 1 0) !important;
        }
        [data-testid='table-mask-fixed-column'] [data-oracle-source='fixed'] {
          width: 100%;
          height: 100%;
          padding: 0;
          border: 0;
          color: transparent;
          background: transparent;
        }
        [data-variant='no-top-control'] [data-testid='table-mask-fixed-column'] { top: auto !important; }
      `}</style>
      <div data-testid="table-mask-controls">
        {options(['production', 'no-top-control', 'fixed-record-fault'] as const, 'table-mask', setVariant)}
        <output data-testid="table-mask-active-variant">{variant}</output>
        {options(['unique', 'duplicate'] as const, 'table-mask', selectDataset)}
        <output data-testid="table-mask-active-dataset">{dataset}</output>
        <output data-testid="table-mask-manifest-dataset">{manifestDataset ?? 'loading'}</output>
        {options(['row-key', 'render-key'] as const, 'table-mask', setIdentity)}
        <output data-testid="table-mask-active-identity">{identity}</output>
        {options(['single-right', 'double-right', 'left-and-right'] as const, 'table-mask-layout', setLayout)}
        <output data-testid="table-mask-active-layout">{layout}</output>
        {options(
          ['empty', 'loading', 'data', 'append', 'prepend', 'replace', 'remove', 'sort-filter-refresh'] as const,
          'table-mask-state',
          setTableState,
        )}
        <output data-testid="table-mask-active-state">{tableState}</output>
        {options(['light', 'dark'] as const, 'table-mask-theme', setTheme)}
        <output data-testid="table-mask-active-theme">{theme}</output>
        {options(['none', 'forced'] as const, 'table-mask-hover-mode', setHoverMode)}
        <output data-testid="table-mask-active-hover-mode">{hoverMode}</output>
      </div>
      <output
        data-testid="table-mask-action-tuple"
        data-oracle-ordinal={actionTuple?.ordinal}
        data-oracle-digest={actionTuple?.digest}
      />
      <div data-testid="table-mask-calibration">
        <span data-calibration="red" />
        <span data-calibration="green" />
        <span data-calibration="blue" />
        <span data-calibration="magenta" />
      </div>
      <div data-testid="table-mask-frame">
        <TableVirtualResize<FixtureRow>
          key={`${dataset}-${identity}-${layout}`}
          ref={tableRef}
          data={rows}
          columns={columns}
          renderKey="ID"
          {...(identity === 'row-key' ? { getRowKey: getFixtureRowKey } : {})}
          loading={tableState === 'loading'}
          isRefresh={tableState === 'sort-filter-refresh'}
          isShowTitle={false}
          pagination={{ page: 1, limit: ROW_COUNT, total: rows.length, onChange: () => {} }}
        />
      </div>
    </div>
  )
}
