import { useEffect, useMemo, useRef } from 'react'
import { Empty, Spin } from 'antd'
import { TableVirtuoso, type ItemProps, type TableVirtuosoHandle } from 'react-virtuoso'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import type { PCAPPacketSummary } from './pcapTypes'
import { formatTimestamp } from './pcapUtils'
import styles from './PCAPPacketViewer.module.scss'

interface PacketColumn {
  key: string
  title: string
  width: number
  align?: 'left' | 'right'
  render: (packet: PCAPPacketSummary) => React.ReactNode
}

const protocolColor = (protocol: string) =>
  ({ HTTP: 'success', DNS: 'blue', TLS: 'purple', ARP: 'warning', TCP: 'info', UDP: 'cyan' })[protocol] || 'info'

const columns: PacketColumn[] = [
  {
    key: 'Id',
    title: 'No.',
    width: 68,
    render: (packet) => <span className={styles['packet-number']}>{packet.Id}</span>,
  },
  {
    key: 'TimestampNS',
    title: '捕获时间',
    width: 180,
    render: (packet) => <span className={styles.mono}>{formatTimestamp(packet.TimestampNS)}</span>,
  },
  {
    key: 'SourceIP',
    title: '源地址',
    width: 180,
    render: (packet) => (
      <span className={styles.mono}>
        {packet.SourceIP || packet.SourceMAC || '—'}
        {packet.SourceIP && ['tcp', 'udp', 'sctp'].includes(packet.Transport) && <small>:{packet.SourcePort}</small>}
      </span>
    ),
  },
  {
    key: 'DestinationIP',
    title: '目的地址',
    width: 180,
    render: (packet) => (
      <span className={styles.mono}>
        {packet.DestinationIP || packet.DestinationMAC || '—'}
        {packet.DestinationIP && ['tcp', 'udp', 'sctp'].includes(packet.Transport) && (
          <small>:{packet.DestinationPort}</small>
        )}
      </span>
    ),
  },
  {
    key: 'Protocol',
    title: '协议',
    width: 90,
    render: (packet) => (
      <span className={styles['protocol-badge']} data-protocol={protocolColor(packet.Protocol)}>
        {packet.Protocol || '—'}
      </span>
    ),
  },
  {
    key: 'CapturedLength',
    title: '长度',
    width: 76,
    align: 'right',
    render: (packet) => <span className={styles.mono}>{packet.CapturedLength}</span>,
  },
  {
    key: 'Info',
    title: '摘要',
    width: 326,
    render: (packet) => (
      <span className={packet.DecodeError ? styles.warning : ''} title={packet.DecodeError || packet.Info}>
        {packet.Info}
      </span>
    ),
  },
]

const PacketTableEmpty = () => (
  <div className={styles['packet-table-empty']}>
    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="没有匹配的数据包，试试调整过滤条件" />
  </div>
)

export const PCAPPacketTable = ({
  packets,
  totalKnown,
  hasFilters,
  selectedID,
  loading,
  loadingMore,
  hasMore,
  error,
  onSelect,
  onLoadMore,
  onRetry,
}: {
  packets: PCAPPacketSummary[]
  totalKnown?: string
  hasFilters: boolean
  selectedID: string
  loading: boolean
  loadingMore: boolean
  hasMore: boolean
  error: string
  onSelect: (id: string) => void
  onLoadMore: () => void
  onRetry: () => void
}) => {
  const listRef = useRef<TableVirtuosoHandle>(null)
  const lastSelectedID = useRef('')

  useEffect(() => {
    if (!packets.length) listRef.current?.scrollTo({ top: 0 })
  }, [packets.length])

  useEffect(() => {
    if (!selectedID) {
      lastSelectedID.current = ''
      return
    }
    if (lastSelectedID.current === selectedID) return
    lastSelectedID.current = selectedID
    const index = packets.findIndex((packet) => packet.Id === selectedID)
    if (index < 0) return
    const frame = requestAnimationFrame(() => {
      listRef.current?.scrollToIndex({ index, align: 'center' })
    })
    return () => cancelAnimationFrame(frame)
  }, [packets, selectedID])

  const components = useMemo(
    () => ({
      Table: ({ style, ...props }: React.ComponentProps<'table'>) => (
        <table
          {...props}
          aria-label="原始数据包列表"
          style={{ ...style, width: 1100, minWidth: 1100, tableLayout: 'fixed' }}
        />
      ),
      TableRow: ({ item, children, ...props }: ItemProps<PCAPPacketSummary>) => {
        const selected = item.Id === selectedID
        return (
          <tr
            {...props}
            className={selected ? styles['selected-row'] : ''}
            data-row-key={item.Id}
            tabIndex={0}
            aria-selected={selected}
            onClick={() => onSelect(item.Id)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                onSelect(item.Id)
              }
            }}
          >
            {children}
          </tr>
        )
      },
      EmptyPlaceholder: PacketTableEmpty,
    }),
    [onSelect, selectedID],
  )

  const totalText =
    totalKnown === undefined
      ? hasFilters
        ? '匹配总数未统计'
        : '总数未统计'
      : `${Number(totalKnown).toLocaleString()} 条${hasFilters ? '匹配' : ''}`

  return (
    <section className={styles['packet-list']} aria-label="原始数据包列表">
      <div className={styles['pane-heading']}>
        <span>
          原始数据包 <small>{totalText}</small>
        </span>
        <small>已加载 {packets.length.toLocaleString()} 条 · 滚动继续加载</small>
      </div>
      <div className={styles['table-box']} data-testid="pcap-packet-scroll">
        <TableVirtuoso
          ref={listRef}
          data={packets}
          className={styles['packet-table']}
          style={{ height: '100%' }}
          fixedItemHeight={29}
          overscan={20}
          increaseViewportBy={{ top: 400, bottom: 800 }}
          computeItemKey={(_, packet) => packet.Id}
          fixedHeaderContent={() => (
            <tr>
              {columns.map((column) => (
                <th key={column.key} scope="col" style={{ width: column.width, textAlign: column.align }}>
                  {column.title}
                </th>
              ))}
            </tr>
          )}
          itemContent={(_, packet) =>
            columns.map((column) => (
              <td key={column.key} style={{ width: column.width, textAlign: column.align }}>
                {column.render(packet)}
              </td>
            ))
          }
          endReached={hasMore ? onLoadMore : undefined}
          components={components}
        />
        {loading && (
          <div className={styles['packet-table-loading']} role="status">
            <Spin size="small" />
          </div>
        )}
      </div>
      {error ? (
        <div className={styles['scroll-status']}>
          <span>{error}</span>
          <YakitButton type="text2" size="small" onClick={onRetry}>
            重试
          </YakitButton>
        </div>
      ) : loadingMore ? (
        <div className={styles['scroll-status']} role="status">
          <Spin size="small" /> 正在加载更多数据
        </div>
      ) : !hasMore && packets.length > 0 ? (
        <div className={styles['scroll-status']}>已加载全部 {packets.length.toLocaleString()} 条数据</div>
      ) : null}
    </section>
  )
}
