import { useCallback, useEffect, useRef, useState } from 'react'
import { Alert, Empty, Progress, Spin, Table, Tooltip } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useSize } from 'ahooks'
import {
  DatabaseOutlined,
  FileOutlined,
  ImportOutlined,
  ReloadOutlined,
  ExportOutlined,
  DeleteOutlined,
  SearchOutlined,
  LeftOutlined,
  RightOutlined,
} from '@ant-design/icons'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitInput } from '@/components/yakitUI/YakitInput/YakitInput'
import { YakitSelect } from '@/components/yakitUI/YakitSelect/YakitSelect'
import { YakitTag } from '@/components/yakitUI/YakitTag/YakitTag'
import { YakitModal } from '@/components/yakitUI/YakitModal/YakitModal'
import { YakitResizeBox } from '@/components/yakitUI/YakitResizeBox/YakitResizeBox'
import { yakitStream, yakitTraffic } from '@/services/electronBridge'
import { handleOpenFileSystemDialog } from '@/utils/fileSystemDialog'
import { success } from '@/utils/notification'
import { randomString } from '@/utils/randomUtil'
import { PacketDetailPane } from './PacketDetailPane'
import type { ImportProgress, PacketFilters, PacketPage, PCAPDatabase, PCAPPacket } from './pcapTypes'
import { emptyFilters, fileName, formatBytes, formatTimestamp, packetQuery } from './pcapUtils'
import styles from './PCAPPacketViewer.module.scss'

const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error))
const stateNames: Record<string, string> = {
  ready: '可查看',
  importing: '导入中',
  analyzing: '分析中',
  failed: '失败',
  interrupted: '已中断',
  deleting: '删除中',
}
const protocolColor = (protocol: string) =>
  ({ HTTP: 'success', DNS: 'blue', TLS: 'purple', ARP: 'warning', TCP: 'info', UDP: 'cyan' })[protocol] || 'info'
const initialPage: PacketPage = { Data: [], Total: '0', NextCursor: '0', HasMore: false, Truncated: false }

export default function PCAPPacketViewer() {
  const [databases, setDatabases] = useState<PCAPDatabase[]>([])
  const [datasetID, setDatasetID] = useState('')
  const [libraryLoading, setLibraryLoading] = useState(false)
  const [error, setError] = useState('')
  const [draft, setDraft] = useState<PacketFilters>(emptyFilters)
  const [filters, setFilters] = useState<PacketFilters>(emptyFilters)
  const [limit, setLimit] = useState(100)
  const [paging, setPaging] = useState({ cursors: ['0'], index: 0 })
  const [page, setPage] = useState<PacketPage>(initialPage)
  const [loading, setLoading] = useState(false)
  const [selectedID, setSelectedID] = useState('')
  const [detail, setDetail] = useState<PCAPPacket>()
  const [detailLoading, setDetailLoading] = useState(false)
  const [revision, setRevision] = useState(0)
  const [importOpen, setImportOpen] = useState(false)
  const [inputPath, setInputPath] = useState('')
  const [job, setJob] = useState<{ token: string; path: string }>()
  const [progress, setProgress] = useState<ImportProgress>()
  const [importError, setImportError] = useState('')
  const [exportOpen, setExportOpen] = useState(false)
  const [exportPacket, setExportPacket] = useState(false)
  const [exportPath, setExportPath] = useState('')
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState('')
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const libraryRequest = useRef(0)
  const detailRequest = useRef(0)
  const tableRef = useRef<HTMLDivElement>(null)
  const tableSize = useSize(tableRef)
  const dataset = databases.find((item) => item.DatasetID === datasetID)
  const cursor = paging.cursors[paging.index]

  useEffect(() => {
    if (!selectedID) return
    const frame = requestAnimationFrame(() => {
      tableRef.current
        ?.querySelector(`tr[data-row-key="${CSS.escape(selectedID)}"]`)
        ?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
    })
    return () => cancelAnimationFrame(frame)
  }, [selectedID, tableSize?.height, detail])

  const loadLibrary = useCallback(async (preferred?: string) => {
    const request = ++libraryRequest.current
    setLibraryLoading(true)
    try {
      const all: PCAPDatabase[] = []
      let after = '0'
      do {
        const response = await yakitTraffic.queryDatabases({ Pagination: { Limit: 100, AfterId: after } })
        if (request !== libraryRequest.current) return
        all.push(...response.Data)
        if (!response.HasMore) break
        if (response.NextCursor === after) throw new Error('数据集分页游标未前进，请更新引擎')
        after = response.NextCursor
      } while (request === libraryRequest.current)
      setDatabases(all)
      setDatasetID(
        (current) =>
          preferred ||
          (all.some((d) => d.DatasetID === current)
            ? current
            : all.find((d) => d.State === 'ready')?.DatasetID || all[0]?.DatasetID || ''),
      )
      setError('')
    } catch (e) {
      if (request === libraryRequest.current)
        setError(`无法加载 PCAP 数据集：${errorText(e)}。请确认已连接支持 PCAP 数据库的引擎。`)
    } finally {
      if (request === libraryRequest.current) setLibraryLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Starts the external catalog request on mount.
    loadLibrary()
    return () => {
      libraryRequest.current++
      detailRequest.current++
    }
  }, [loadLibrary])

  useEffect(() => {
    let current = true
    detailRequest.current++
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Query changes invalidate dependent network details.
    setSelectedID('')
    setDetail(undefined)
    setDetailLoading(false)
    setPage(initialPage)
    if (!datasetID || dataset?.State !== 'ready') {
      setPage(initialPage)
      setLoading(false)
      return
    }
    setLoading(true)
    yakitTraffic
      .queryPackets(packetQuery(datasetID, filters, cursor, limit))
      .then((response) => {
        if (current) {
          setPage(response)
          setError('')
        }
      })
      .catch((e) => {
        if (current) {
          setPage(initialPage)
          setError(`数据包查询失败：${errorText(e)}`)
        }
      })
      .finally(() => {
        if (current) setLoading(false)
      })
    return () => {
      current = false
    }
  }, [datasetID, dataset?.State, filters, cursor, limit, revision])

  useEffect(() => {
    if (!job) return
    let finished = false
    let current = true
    const cleanup = [
      yakitStream.onData(job.token, (event: ImportProgress) => {
        if (!current) return
        setProgress(event)
        if (event.Finished) {
          finished = true
          setImportOpen(false)
          setJob(undefined)
          setPaging({ cursors: ['0'], index: 0 })
          loadLibrary(event.DatasetID)
          setRevision((v) => v + 1)
        }
      }),
      yakitStream.onError(job.token, (e) => {
        if (!current) return
        setImportError(`导入失败：${errorText(e)}`)
        setJob(undefined)
        loadLibrary()
      }),
      yakitStream.onEnd(job.token, () => {
        if (!current || finished) return
        setImportError('导入已结束，但没有收到成功确认，请重试。')
        setJob(undefined)
        loadLibrary()
      }),
    ]
    yakitTraffic.importFile({ InputFile: job.path }, job.token).catch((e) => {
      if (current) {
        setImportError(errorText(e))
        setJob(undefined)
      }
    })
    return () => {
      current = false
      cleanup.forEach((unsubscribe) => unsubscribe())
      if (!finished) yakitStream.cancel('ImportPCAPFile', job.token).catch(() => {})
    }
  }, [job, loadLibrary])

  const selectDataset = (id: string) => {
    setDatasetID(id)
    setPaging({ cursors: ['0'], index: 0 })
    setDraft(emptyFilters)
    setFilters(emptyFilters)
  }
  const selectPacket = async (id: string) => {
    const request = ++detailRequest.current
    setSelectedID(id)
    setDetail(undefined)
    setDetailLoading(true)
    try {
      const response = await yakitTraffic.queryPackets({ DatasetID: datasetID, Id: id, Full: true })
      if (request !== detailRequest.current) return
      if (!response.Data.length) throw new Error('该原始包不存在')
      setDetail(response.Data[0])
    } catch (e) {
      if (request === detailRequest.current) setError(`详情加载失败：${errorText(e)}`)
    } finally {
      if (request === detailRequest.current) setDetailLoading(false)
    }
  }
  const closeDetail = () => {
    detailRequest.current++
    setDetail(undefined)
    setSelectedID('')
    setDetailLoading(false)
  }
  const applyFilters = () => {
    setFilters({ ...draft })
    setPaging({ cursors: ['0'], index: 0 })
  }
  const browse = async () => {
    try {
      const result = await handleOpenFileSystemDialog({
        title: '选择 PCAP 抓包文件',
        properties: ['openFile'],
        filters: [{ name: 'Packet capture', extensions: ['pcap', 'pcapng', 'cap'] }],
      })
      if (!result.canceled && result.filePaths[0]) setInputPath(result.filePaths[0])
    } catch (e) {
      setImportError(errorText(e))
    }
  }
  const exportData = async () => {
    if (!dataset || !exportPath.trim()) return
    setExporting(true)
    setExportError('')
    try {
      const response = await yakitTraffic.exportData({
        DatasetID: dataset.DatasetID,
        TargetPath: exportPath.trim(),
        PacketID: exportPacket ? selectedID : '0',
      })
      success(`已导出 ${formatBytes(response.Bytes)}：${response.Path}`)
      setExportOpen(false)
    } catch (e) {
      setExportError(errorText(e))
    } finally {
      setExporting(false)
    }
  }
  const deleteDatabase = async () => {
    if (!dataset) return
    setDeleting(true)
    try {
      const response = await yakitTraffic.deleteDatabase({ DatasetID: dataset.DatasetID })
      if (!response.Deleted) throw new Error('未能删除数据集')
      setDeleteOpen(false)
      setPaging({ cursors: ['0'], index: 0 })
      setDraft(emptyFilters)
      setFilters(emptyFilters)
      await loadLibrary()
      if (response.CleanupPending) setError(`数据集已移除，文件清理待重试：${response.CleanupError}`)
    } catch (e) {
      setError(`删除失败：${errorText(e)}`)
    } finally {
      setDeleting(false)
    }
  }

  const columns: ColumnsType<PCAPPacket> = [
    { title: 'No.', dataIndex: 'Id', width: 68, render: (id) => <span className={styles['packet-number']}>{id}</span> },
    {
      title: '捕获时间',
      dataIndex: 'TimestampNS',
      width: 180,
      render: (value) => <span className={styles.mono}>{formatTimestamp(value)}</span>,
    },
    {
      title: '源地址',
      dataIndex: 'NetworkEndpointIPSrc',
      width: 180,
      ellipsis: true,
      render: (ip, p) => (
        <span className={styles.mono}>
          {ip || p.EthernetEndpointHardwareAddrSrc || '—'}
          {ip && p.TransportLayerType && ['TCP', 'UDP', 'SCTP'].includes(p.TransportLayerType) && (
            <small>:{p.TransportEndpointPortSrc}</small>
          )}
        </span>
      ),
    },
    {
      title: '目的地址',
      dataIndex: 'NetworkEndpointIPDst',
      width: 180,
      ellipsis: true,
      render: (ip, p) => (
        <span className={styles.mono}>
          {ip || p.EthernetEndpointHardwareAddrDst || '—'}
          {ip && ['TCP', 'UDP', 'SCTP'].includes(p.TransportLayerType) && <small>:{p.TransportEndpointPortDst}</small>}
        </span>
      ),
    },
    {
      title: '协议',
      dataIndex: 'Protocol',
      width: 90,
      render: (value) => (
        <span className={styles['protocol-badge']} data-protocol={protocolColor(value)}>
          {value || '—'}
        </span>
      ),
    },
    {
      title: '长度',
      dataIndex: 'CapturedLength',
      width: 76,
      align: 'right',
      render: (value) => <span className={styles.mono}>{value}</span>,
    },
    {
      title: '摘要',
      dataIndex: 'Info',
      ellipsis: true,
      render: (value, p) => (
        <span className={p.DecodeError ? styles.warning : ''} title={p.DecodeError || value}>
          {value}
        </span>
      ),
    },
  ]

  const packetTable = (
    <section className={styles['packet-list']} aria-label="原始数据包列表">
      <div className={styles['pane-heading']}>
        <span>
          原始数据包{' '}
          <small>
            {Number(page.Total).toLocaleString()} 条{Object.values(filters).some(Boolean) ? '匹配' : ''}
          </small>
        </span>
        <small>一行一个捕获包 · 按捕获顺序</small>
      </div>
      <div className={styles['table-box']} ref={tableRef}>
        <Table<PCAPPacket>
          size="small"
          rowKey="Id"
          columns={columns}
          dataSource={page.Data}
          loading={loading}
          pagination={false}
          tableLayout="fixed"
          scroll={{ x: 1100, y: Math.max(100, (tableSize?.height || 340) - 40) }}
          rowClassName={(p) => (p.Id === selectedID ? styles['selected-row'] : '')}
          onRow={(packet) => ({
            onClick: () => selectPacket(packet.Id),
            tabIndex: 0,
            onKeyDown: (e) => {
              if (e.key === 'Enter') selectPacket(packet.Id)
            },
            'aria-selected': packet.Id === selectedID,
          })}
          locale={{
            emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="没有匹配的数据包，试试调整过滤条件" />,
          }}
        />
      </div>
      <div className={styles.pagination}>
        <span>
          {page.Truncated
            ? '当前页已按响应大小缩短，可继续翻页'
            : `当前页 ${page.Data.length} 条 · 选中 ${selectedID ? `#${selectedID}` : '—'}`}
        </span>
        <div className={styles.actions}>
          <YakitSelect
            aria-label="每页条数"
            value={limit}
            wrapperStyle={{ width: 100, flexShrink: 0 }}
            style={{ width: '100%' }}
            options={[50, 100, 200, 500].map((value) => ({ value, label: `${value} 条/页` }))}
            onChange={(value) => {
              setLimit(value)
              setPaging({ cursors: ['0'], index: 0 })
            }}
          />
          <YakitButton
            type="outline2"
            size="small"
            aria-label="上一页"
            disabled={loading || paging.index === 0}
            icon={<LeftOutlined />}
            onClick={() => setPaging((p) => ({ ...p, index: p.index - 1 }))}
          />
          <span>第 {paging.index + 1} 页</span>
          <YakitButton
            type="outline2"
            size="small"
            aria-label="下一页"
            disabled={loading || !page.HasMore}
            icon={<RightOutlined />}
            onClick={() =>
              setPaging((p) => ({ cursors: [...p.cursors.slice(0, p.index + 1), page.NextCursor], index: p.index + 1 }))
            }
          />
        </div>
      </div>
    </section>
  )

  return (
    <div
      className={styles.viewer}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes('Files')) e.preventDefault()
      }}
      onDrop={(e) => {
        e.preventDefault()
        const file = e.dataTransfer.files[0] as File & { path?: string }
        if (file?.path && !job) {
          setInputPath(file.path)
          setImportError('')
          setImportOpen(true)
        }
      }}
    >
      <header className={styles.header}>
        <div className={styles.brand}>
          <div className={styles['brand-icon']}>
            <DatabaseOutlined />
          </div>
          <div>
            <h2>
              流量分析 <YakitTag color="warning">实验性</YakitTag>
            </h2>
            <p>从原始数据包，追踪每一次协议交互</p>
          </div>
        </div>
        <div className={styles.actions}>
          <Tooltip title="刷新数据集与当前列表">
            <YakitButton
              type="outline2"
              icon={<ReloadOutlined />}
              onClick={() => {
                loadLibrary()
                setRevision((v) => v + 1)
              }}
              loading={libraryLoading}
            >
              刷新
            </YakitButton>
          </Tooltip>
          <YakitButton
            aria-label="导入 PCAP"
            icon={<ImportOutlined />}
            onClick={() => {
              setImportOpen(true)
              setImportError('')
            }}
          >
            导入 PCAP
          </YakitButton>
        </div>
      </header>
      {error && <Alert type="error" showIcon closable onClose={() => setError('')} message={error} />}
      <div className={styles.workspace}>
        <aside className={styles.sidebar} aria-label="PCAP 数据集">
          <div className={styles['sidebar-heading']}>
            <span>捕获文件</span>
            <small>{databases.length}</small>
          </div>
          <div className={styles['dataset-list']}>
            {libraryLoading && !databases.length ? (
              <Spin />
            ) : !databases.length ? (
              <div className={styles['sidebar-empty']}>
                <FileOutlined />
                <span>还没有捕获文件</span>
                <small>支持 .pcap / .pcapng / .cap</small>
              </div>
            ) : (
              databases.map((db) => (
                <button
                  type="button"
                  key={db.DatasetID}
                  className={`${styles['dataset-item']} ${datasetID === db.DatasetID ? styles['active-dataset'] : ''}`}
                  onClick={() => selectDataset(db.DatasetID)}
                  title={db.SourcePath}
                  aria-pressed={datasetID === db.DatasetID}
                >
                  <FileOutlined />
                  <div>
                    <strong>{fileName(db.SourcePath)}</strong>
                    <span>
                      {Number(db.PacketCount).toLocaleString()} 个包 <i>·</i> {formatBytes(db.SourceSize)}
                    </span>
                    <small className={db.State === 'ready' ? styles['ready-state'] : styles.warning}>
                      {stateNames[db.State] || db.State} <i>·</i> {db.Format.toUpperCase()}
                    </small>
                  </div>
                </button>
              ))
            )}
          </div>
          <div className={styles['sidebar-note']}>
            <span className={styles['status-dot']} /> PCAPDB 驱动
            <small>
              数据保存在当前引擎
              <br />
              原始包与协议消息关联展示
            </small>
          </div>
        </aside>
        <main className={styles.main}>
          {!dataset ? (
            <div className={styles.welcome}>
              <div className={styles['welcome-icon']}>
                <DatabaseOutlined />
              </div>
              <h3>每个数据包，都有迹可循</h3>
              <p>导入一个捕获文件，查看协议层次、原始字节与重组消息。</p>
              <YakitButton icon={<ImportOutlined />} onClick={() => setImportOpen(true)}>
                导入第一个 PCAP 文件
              </YakitButton>
              <small>也可以将本地文件拖入此处 · 远程引擎请填写引擎端路径</small>
            </div>
          ) : (
            <>
              <div className={styles['dataset-summary']}>
                <div>
                  <h3 title={dataset.SourcePath}>{fileName(dataset.SourcePath)}</h3>
                  <p title={dataset.SourcePath}>{dataset.SourcePath}</p>
                </div>
                <div className={styles['summary-stats']}>
                  <span>
                    <strong>{Number(dataset.PacketCount).toLocaleString()}</strong>
                    <small>原始数据包</small>
                  </span>
                  <span>
                    <strong>{formatBytes(dataset.SourceSize)}</strong>
                    <small>捕获文件大小</small>
                  </span>
                  <YakitButton
                    type="outline2"
                    size="small"
                    icon={<ExportOutlined />}
                    disabled={dataset.State !== 'ready'}
                    onClick={() => {
                      setExportPacket(false)
                      setExportPath('')
                      setExportError('')
                      setExportOpen(true)
                    }}
                  >
                    导出
                  </YakitButton>
                  <YakitButton
                    type="text2"
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    aria-label="删除当前数据集"
                    onClick={() => setDeleteOpen(true)}
                  />
                </div>
              </div>
              {dataset.State !== 'ready' ? (
                <div className={styles.welcome}>
                  <Alert
                    type="warning"
                    showIcon
                    message={stateNames[dataset.State] || dataset.State}
                    description={dataset.LastError || '数据集尚未就绪；导入结束后刷新，或重新导入原文件。'}
                  />
                </div>
              ) : (
                <>
                  <form
                    className={styles.filters}
                    onSubmit={(e) => {
                      e.preventDefault()
                      applyFilters()
                    }}
                  >
                    <YakitSelect
                      aria-label="协议过滤"
                      value={draft.Protocol}
                      wrapperStyle={{ width: 120, flexShrink: 0 }}
                      style={{ width: '100%' }}
                      options={['', 'TCP', 'UDP', 'HTTP', 'DNS', 'TLS', 'ARP', 'ICMPv4', 'ICMPv6'].map((value) => ({
                        value,
                        label: value || '全部协议',
                      }))}
                      onChange={(Protocol) => setDraft((f) => ({ ...f, Protocol }))}
                    />
                    {(
                      [
                        { key: 'SrcIP', label: '源 IP' },
                        { key: 'SrcPort', label: '源端口' },
                        { key: 'DstIP', label: '目的 IP' },
                        { key: 'DstPort', label: '目的端口' },
                      ] as const
                    ).map(({ key, label }) => (
                      <YakitInput
                        key={key}
                        aria-label={label}
                        placeholder={label}
                        allowClear
                        value={draft[key]}
                        wrapperClassName={key.endsWith('Port') ? styles['port-filter'] : styles['ip-filter']}
                        onChange={(e) => setDraft((f) => ({ ...f, [key]: e.target.value }))}
                      />
                    ))}
                    <YakitInput
                      aria-label="摘要关键词"
                      prefix={<SearchOutlined />}
                      placeholder="地址 / 协议摘要"
                      allowClear
                      value={draft.Keyword}
                      wrapperClassName={styles['keyword-filter']}
                      onChange={(e) => setDraft((f) => ({ ...f, Keyword: e.target.value }))}
                    />
                    <YakitButton htmlType="submit" loading={loading}>
                      查询
                    </YakitButton>
                    <YakitButton
                      type="text2"
                      onClick={() => {
                        setDraft(emptyFilters)
                        setFilters(emptyFilters)
                        setPaging({ cursors: ['0'], index: 0 })
                      }}
                    >
                      重置
                    </YakitButton>
                  </form>
                  <div className={styles['packet-workspace']}>
                    <YakitResizeBox
                      isVer
                      firstRatio={selectedID ? '48%' : '100%'}
                      secondRatio={selectedID ? '52%' : '0%'}
                      firstMinSize={150}
                      secondMinSize={selectedID ? 200 : 0}
                      firstNode={packetTable}
                      secondNode={
                        detailLoading ? (
                          <div className={styles['detail-loading']}>
                            <Spin />
                            <span>正在读取数据包 #{selectedID}</span>
                          </div>
                        ) : detail ? (
                          <PacketDetailPane
                            key={detail.Id}
                            packet={detail}
                            onJump={selectPacket}
                            onClose={closeDetail}
                          />
                        ) : selectedID ? (
                          <div className={styles.welcome}>
                            <p>详情读取失败</p>
                            <YakitButton onClick={() => selectPacket(selectedID)}>重试</YakitButton>
                            <YakitButton type="text2" onClick={closeDetail}>
                              关闭详情
                            </YakitButton>
                          </div>
                        ) : null
                      }
                    />
                  </div>
                </>
              )}
            </>
          )}
        </main>
      </div>
      <YakitModal
        title="导入捕获文件"
        subTitle="建立包索引与协议分析，原始文件保持不变"
        open={importOpen}
        width={620}
        okText={job ? '正在导入' : '开始导入'}
        confirmLoading={!!job}
        okButtonProps={{ disabled: !inputPath.trim() || !!job }}
        cancelText={job ? '取消导入' : '取消'}
        onCancel={() => {
          if (job) {
            setJob(undefined)
            loadLibrary()
          }
          setImportOpen(false)
        }}
        onOk={() => {
          setImportError('')
          setProgress(undefined)
          setJob({ token: `pcap-${randomString(24)}`, path: inputPath.trim() })
        }}
      >
        <div className={styles['modal-body']}>
          <label htmlFor="pcap-import-path">引擎上的文件路径</label>
          <div className={styles['path-input']}>
            <YakitInput
              id="pcap-import-path"
              placeholder="/path/to/capture.pcapng"
              value={inputPath}
              disabled={!!job}
              onChange={(e) => setInputPath(e.target.value)}
            />
            <YakitButton type="outline2" disabled={!!job} onClick={browse}>
              选择文件
            </YakitButton>
          </div>
          <p>本地引擎可直接选择或拖入文件；连接远程引擎时，请填写远程机器上的路径。支持 PCAP、PCAPNG。</p>
          {progress && (
            <div role="status">
              <span>
                {stateNames[progress.State] || progress.State} · {Number(progress.PacketCount).toLocaleString()} 个包
              </span>
              <Progress
                percent={Math.min(
                  99,
                  Math.round((Number(progress.BytesIndexed) / Math.max(1, Number(progress.TotalBytes))) * 100),
                )}
                status="active"
              />
              <small>正在解析并保存协议消息，完成后自动打开。</small>
            </div>
          )}
          {importError && <Alert type="error" showIcon message={importError} />}
        </div>
      </YakitModal>
      <YakitModal
        title="导出流量数据"
        open={exportOpen}
        width={560}
        okText="导出"
        confirmLoading={exporting}
        okButtonProps={{ disabled: !exportPath.trim() }}
        onCancel={() => setExportOpen(false)}
        onOk={exportData}
      >
        <div className={styles['modal-body']}>
          <YakitSelect
            aria-label="导出内容"
            value={exportPacket ? 'packet' : 'capture'}
            options={[
              { value: 'capture', label: '完整原始捕获文件（保留 PCAP / PCAPNG 格式）' },
              { value: 'packet', label: `当前包 #${selectedID || '—'} 的原始字节（非 PCAP）`, disabled: !selectedID },
            ]}
            onChange={(value) => setExportPacket(value === 'packet')}
          />
          <label htmlFor="pcap-export-path">引擎上的目标文件路径</label>
          <YakitInput
            id="pcap-export-path"
            value={exportPath}
            onChange={(e) => setExportPath(e.target.value)}
            placeholder={exportPacket ? '/path/to/packet.bin' : `/path/to/export.${dataset?.Format || 'pcap'}`}
          />
          <p>目标路径位于引擎所在机器；已有文件不会被覆盖。</p>
          {exportError && <Alert type="error" showIcon message={exportError} />}
        </div>
      </YakitModal>
      <YakitModal
        title="删除此捕获数据集？"
        open={deleteOpen}
        width={460}
        okText="删除数据集"
        okButtonProps={{ danger: true }}
        confirmLoading={deleting}
        onCancel={() => setDeleteOpen(false)}
        onOk={deleteDatabase}
      >
        <div className={styles['modal-body']}>
          <p>
            将删除「{dataset && fileName(dataset.SourcePath)}」的分析数据库和导入的包数据。源路径中的原始 PCAP
            文件不会删除。
          </p>
        </div>
      </YakitModal>
    </div>
  )
}
