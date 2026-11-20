import { useCallback, useEffect, useRef, useState } from 'react'
import { Alert, Checkbox, Progress, Spin, Tooltip } from 'antd'
import {
  DatabaseOutlined,
  FileOutlined,
  ImportOutlined,
  ReloadOutlined,
  ExportOutlined,
  DeleteOutlined,
  SearchOutlined,
  WifiOutlined,
} from '@ant-design/icons'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitInput } from '@/components/yakitUI/YakitInput/YakitInput'
import { YakitSelect } from '@/components/yakitUI/YakitSelect/YakitSelect'
import { YakitModal } from '@/components/yakitUI/YakitModal/YakitModal'
import { YakitResizeBox } from '@/components/yakitUI/YakitResizeBox/YakitResizeBox'
import { yakitStream, yakitTraffic } from '@/services/electronBridge'
import { handleOpenFileSystemDialog } from '@/utils/fileSystemDialog'
import { success } from '@/utils/notification'
import { randomString } from '@/utils/randomUtil'
import { PacketDetailPane } from './PacketDetailPane'
import { PCAPPacketTable } from './PCAPPacketTable'
import type {
  ImportProgress,
  LiveCaptureProgress,
  LiveCaptureRequest,
  PacketFilters,
  PacketPage,
  PacketQuery,
  PCAPDatabase,
  PCAPPacketDetail,
  PcapMetadata,
} from './pcapTypes'
import { emptyFilters, fileName, formatBytes, packetQuery } from './pcapUtils'
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
const initialPage: PacketPage = { Data: [], NextCursor: '0', HasMore: false }
const filterQueryDelay = 400
const databaseName = (database?: PCAPDatabase) =>
  fileName(database?.SourcePath || '') ||
  (database?.DatasetID ? `实时抓包 ${database.DatasetID.slice(0, 8)}` : '捕获数据集')
const sameFilters = (left: PacketFilters, right: PacketFilters) =>
  Object.keys(emptyFilters).every((key) => left[key as keyof PacketFilters] === right[key as keyof PacketFilters])

export default function PCAPPacketViewer() {
  const [databases, setDatabases] = useState<PCAPDatabase[]>([])
  const [datasetID, setDatasetID] = useState('')
  const [libraryLoading, setLibraryLoading] = useState(false)
  const [error, setError] = useState('')
  const [draft, setDraft] = useState<PacketFilters>(emptyFilters)
  const [filters, setFilters] = useState<PacketFilters>(emptyFilters)
  const [cursor, setCursor] = useState('0')
  const [page, setPage] = useState<PacketPage>(initialPage)
  const [totalKnown, setTotalKnown] = useState<string>()
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [listError, setListError] = useState('')
  const [selectedID, setSelectedID] = useState('')
  const [detail, setDetail] = useState<PCAPPacketDetail>()
  const [detailLoading, setDetailLoading] = useState(false)
  const [revision, setRevision] = useState(0)
  const [importOpen, setImportOpen] = useState(false)
  const [inputPath, setInputPath] = useState('')
  const [job, setJob] = useState<{ token: string; path: string }>()
  const [progress, setProgress] = useState<ImportProgress>()
  const [importError, setImportError] = useState('')
  const [captureOpen, setCaptureOpen] = useState(false)
  const [captureMetadata, setCaptureMetadata] = useState<PcapMetadata>()
  const [captureMetadataLoading, setCaptureMetadataLoading] = useState(false)
  const [captureInterface, setCaptureInterface] = useState('')
  const [captureBPF, setCaptureBPF] = useState('')
  const [captureSnaplen, setCaptureSnaplen] = useState('65535')
  const [capturePromisc, setCapturePromisc] = useState(false)
  const [capture, setCapture] = useState<{ token: string; request: LiveCaptureRequest }>()
  const [captureProgress, setCaptureProgress] = useState<LiveCaptureProgress>()
  const [captureError, setCaptureError] = useState('')
  const [captureStopping, setCaptureStopping] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [exportPacket, setExportPacket] = useState(false)
  const [exportPath, setExportPath] = useState('')
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState('')
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const libraryRequest = useRef(0)
  const detailRequest = useRef(0)
  const loadMorePending = useRef(false)
  const captureStopRequested = useRef(false)
  const loadedPacketIDs = useRef(new Set<string>())
  const dataset = databases.find((item) => item.DatasetID === datasetID)
  const datasetQueryable = dataset?.State === 'ready' || Boolean(capture && captureProgress?.DatasetID === datasetID)

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
      setDatabases((current) => {
        if (preferred && !all.some((item) => item.DatasetID === preferred)) {
          const pending = current.find((item) => item.DatasetID === preferred)
          if (pending) return [pending, ...all]
        }
        return all
      })
      setCursor('0')
      setPage(initialPage)
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
    if (!captureOpen || captureMetadata) return
    let current = true
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Starts the external interface request when the capture dialog opens.
    setCaptureMetadataLoading(true)
    yakitTraffic
      .getPcapMetadata()
      .then((metadata) => {
        if (!current) return
        setCaptureMetadata(metadata)
        setCaptureInterface(
          (value) =>
            value || metadata.DefaultPublicNetInterface?.Name || metadata.AvailablePcapDevices?.[0]?.Name || '',
        )
      })
      .catch((e) => {
        if (current) setCaptureError(`无法读取网卡：${errorText(e)}`)
      })
      .finally(() => {
        if (current) setCaptureMetadataLoading(false)
      })
    return () => {
      current = false
    }
  }, [captureMetadata, captureOpen])

  useEffect(() => {
    if (!capture) return
    let current = true
    let finished = false
    let datasetOpened = false
    const { token, request } = capture
    const cleanup = [
      yakitStream.onData(token, (event: LiveCaptureProgress) => {
        if (!current) return
        setCaptureProgress(event)
        if (event.Error) setCaptureError(event.Error)
        if (event.DatasetID) {
          setDatabases((items) => {
            const index = items.findIndex((item) => item.DatasetID === event.DatasetID)
            if (index < 0) {
              return [
                {
                  Id: event.DatasetID,
                  DatasetID: event.DatasetID,
                  SourcePath: '',
                  SourceSize: event.BytesIndexed || '0',
                  Format: 'live',
                  State: event.State || 'ready',
                  PacketCount: event.PacketFrameCounter || '0',
                  LastError: event.Error || '',
                  ProtocolsIndexed: true,
                },
                ...items,
              ]
            }
            return items.map((item, itemIndex) =>
              itemIndex === index
                ? {
                    ...item,
                    SourceSize: event.BytesIndexed || item.SourceSize,
                    State: event.State || item.State,
                    PacketCount: event.PacketFrameCounter || item.PacketCount,
                    LastError: event.Error || item.LastError,
                  }
                : item,
            )
          })
        }
        if (event.DatasetID && !datasetOpened) {
          datasetOpened = true
          setDatasetID(event.DatasetID)
          setDraft(emptyFilters)
          setFilters(emptyFilters)
          setCursor('0')
          setPage(initialPage)
          setTotalKnown(undefined)
          loadLibrary(event.DatasetID)
          setRevision((value) => value + 1)
        }
        if (event.Finished) {
          finished = true
          captureStopRequested.current = false
          setCapture(undefined)
          setCaptureStopping(false)
          if (event.DatasetID) {
            loadLibrary(event.DatasetID)
            setRevision((value) => value + 1)
          }
        }
      }),
      yakitStream.onError(token, (e) => {
        if (!current) return
        if (!captureStopRequested.current) {
          setCaptureError(`实时抓包失败：${errorText(e)}`)
          setCaptureOpen(true)
        }
        captureStopRequested.current = false
        setCapture(undefined)
        setCaptureStopping(false)
      }),
      yakitStream.onEnd(token, () => {
        if (!current || finished) return
        if (!captureStopRequested.current) {
          setCaptureError('实时抓包已结束，但没有收到完成状态。')
          setCaptureOpen(true)
        }
        captureStopRequested.current = false
        setCapture(undefined)
        setCaptureStopping(false)
      }),
    ]
    yakitTraffic.startLiveCapture(request, token).catch((e) => {
      if (!current) return
      setCaptureError(`无法启动实时抓包：${errorText(e)}`)
      setCaptureOpen(true)
      setCapture(undefined)
      setCaptureStopping(false)
    })
    return () => {
      current = false
      cleanup.forEach((unsubscribe) => unsubscribe())
      if (!finished && !captureStopRequested.current) yakitStream.cancel('PcapX', token).catch(() => {})
    }
  }, [capture, loadLibrary])

  useEffect(() => {
    let current = true
    const append = cursor !== '0'
    if (!append) {
      detailRequest.current++
      loadedPacketIDs.current.clear()
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Query changes invalidate dependent network details.
      setSelectedID('')
      setDetail(undefined)
      setDetailLoading(false)
      setPage(initialPage)
    }
    if (!datasetID || !datasetQueryable) {
      setPage(initialPage)
      setLoading(false)
      setLoadingMore(false)
      loadMorePending.current = false
      return
    }
    setListError('')
    setLoading(!append)
    setLoadingMore(append)
    let query: PacketQuery
    try {
      query = packetQuery(datasetID, filters, cursor, 100)
    } catch (e) {
      setError(`数据包查询失败：${errorText(e)}`)
      setPage(initialPage)
      setLoading(false)
      setLoadingMore(false)
      loadMorePending.current = false
      return
    }
    yakitTraffic
      .queryPackets(query)
      .then((response) => {
        if (current) {
          if (append) {
            const loaded = loadedPacketIDs.current
            const additions = response.Data.filter((packet) => {
              if (loaded.has(packet.Id)) return false
              loaded.add(packet.Id)
              return true
            })
            setPage((currentPage) => {
              return {
                ...response,
                Data: [...currentPage.Data, ...additions],
              }
            })
          } else {
            loadedPacketIDs.current = new Set(response.Data.map((packet) => packet.Id))
            setPage(response)
          }
          if (response.Total !== undefined && response.Total !== '') setTotalKnown(response.Total)
          setError('')
        }
      })
      .catch((e) => {
        if (current) {
          const message = `数据包查询失败：${errorText(e)}`
          if (append) {
            setListError(message)
          } else {
            setPage(initialPage)
            setError(message)
          }
        }
      })
      .finally(() => {
        if (current) {
          setLoading(false)
          setLoadingMore(false)
          loadMorePending.current = false
        }
      })
    return () => {
      current = false
    }
  }, [datasetID, datasetQueryable, filters, cursor, revision])

  const applyQueryFilters = useCallback((next: PacketFilters) => {
    setFilters(next)
    setCursor('0')
    setPage(initialPage)
    setTotalKnown(undefined)
  }, [])

  useEffect(() => {
    if (sameFilters(draft, filters)) return
    const timer = setTimeout(() => {
      applyQueryFilters({ ...draft })
    }, filterQueryDelay)
    return () => clearTimeout(timer)
  }, [applyQueryFilters, draft, filters])

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
          setCursor('0')
          setPage(initialPage)
          setTotalKnown(undefined)
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
    setCursor('0')
    setPage(initialPage)
    setTotalKnown(undefined)
    setDraft(emptyFilters)
    setFilters(emptyFilters)
  }
  const selectPacket = useCallback(
    async (id: string) => {
      const request = ++detailRequest.current
      setSelectedID(id)
      setDetail(undefined)
      setDetailLoading(true)
      try {
        const response = await yakitTraffic.getPacketDetail({ DatasetID: datasetID, PacketID: id })
        if (request !== detailRequest.current) return
        if (!response.Packet) throw new Error('该原始包不存在')
        setDetail(response)
      } catch (e) {
        if (request === detailRequest.current) setError(`详情加载失败：${errorText(e)}`)
      } finally {
        if (request === detailRequest.current) setDetailLoading(false)
      }
    },
    [datasetID],
  )
  const closeDetail = () => {
    detailRequest.current++
    setDetail(undefined)
    setSelectedID('')
    setDetailLoading(false)
  }
  const applyFilters = () => {
    applyQueryFilters({ ...draft })
  }
  const updateProtocol = (Protocol: string) => {
    const next = { ...draft, Protocol }
    setDraft(next)
    applyQueryFilters(next)
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
  const startLiveCapture = () => {
    const snaplen = Number(captureSnaplen || '65535')
    if (!captureInterface) {
      setCaptureError('请选择抓包网卡')
      return
    }
    if (!Number.isInteger(snaplen) || snaplen < 1 || snaplen > 16 << 20) {
      setCaptureError('Snaplen 必须是 1–16777216 的整数')
      return
    }
    setCaptureError('')
    setCaptureProgress(undefined)
    setCaptureStopping(false)
    captureStopRequested.current = false
    setCaptureOpen(false)
    setCapture({
      token: `pcap-live-${randomString(24)}`,
      request: {
        NetInterfaceList: [captureInterface],
        BPF: captureBPF.trim(),
        Snaplen: snaplen,
        Promisc: capturePromisc,
        BatchSize: '2000',
        FlushIntervalMilliseconds: '250',
      },
    })
  }
  const stopLiveCapture = async () => {
    if (!capture || captureStopping) return
    captureStopRequested.current = true
    setCaptureStopping(true)
    try {
      await yakitStream.cancel('PcapX', capture.token)
      const stoppedDatasetID = captureProgress?.DatasetID
      setCapture(undefined)
      setCaptureStopping(false)
      setRevision((value) => value + 1)
      loadLibrary(stoppedDatasetID)
    } catch (e) {
      captureStopRequested.current = false
      setCaptureError(`停止实时抓包失败：${errorText(e)}`)
      setCaptureStopping(false)
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
      setCursor('0')
      setPage(initialPage)
      setTotalKnown(undefined)
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

  const hasFilters = Object.values(filters).some(Boolean)
  const loadMore = useCallback(() => {
    if (loading || loadingMore || listError || !page.HasMore || loadMorePending.current) return
    if (!page.NextCursor || page.NextCursor === cursor) {
      setListError('分页游标未前进，请刷新后重试')
      return
    }
    loadMorePending.current = true
    setCursor(page.NextCursor)
  }, [cursor, listError, loading, loadingMore, page.HasMore, page.NextCursor])
  const retryLoadMore = useCallback(() => {
    if (loadingMore) return
    setListError('')
    loadMorePending.current = true
    setRevision((value) => value + 1)
  }, [loadingMore])

  return (
    <div
      className={`${styles.viewer} ${selectedID ? styles['detail-open'] : ''}`}
      aria-label="PCAP 流量分析"
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
      {error && <Alert type="error" showIcon closable onClose={() => setError('')} message={error} />}
      {captureError && (
        <Alert type="error" showIcon closable onClose={() => setCaptureError('')} message={captureError} />
      )}
      <div className={styles.workspace}>
        <aside className={styles.sidebar} aria-label="PCAP 数据集">
          <div className={styles['sidebar-heading']}>
            <span>
              捕获文件 <small>{databases.length}</small>
            </span>
            <div className={styles['sidebar-actions']}>
              <Tooltip title="刷新数据集与当前列表">
                <YakitButton
                  type="text2"
                  size="small"
                  aria-label="刷新"
                  icon={<ReloadOutlined />}
                  loading={libraryLoading}
                  onClick={() => {
                    loadLibrary()
                    setRevision((v) => v + 1)
                  }}
                />
              </Tooltip>
              <Tooltip title="启动实时抓包">
                <YakitButton
                  type="text2"
                  size="small"
                  aria-label="实时抓包"
                  icon={<WifiOutlined />}
                  disabled={!!capture}
                  onClick={() => {
                    setCaptureError('')
                    setCaptureOpen(true)
                  }}
                />
              </Tooltip>
              <Tooltip title="导入 PCAP 文件">
                <YakitButton
                  type="text2"
                  size="small"
                  aria-label="导入 PCAP"
                  icon={<ImportOutlined />}
                  onClick={() => {
                    setImportOpen(true)
                    setImportError('')
                  }}
                />
              </Tooltip>
            </div>
          </div>
          {capture && (
            <div className={styles['capture-status']} role="status" aria-live="polite">
              <div className={styles['capture-heading']}>
                <span>
                  <i /> 实时抓包
                </span>
                <small>
                  {captureProgress?.State === 'ready' ? '运行中' : stateNames[captureProgress?.State || ''] || '启动中'}
                </small>
              </div>
              {captureProgress ? (
                <>
                  <span>
                    {Number(captureProgress.PacketFrameCounter || 0).toLocaleString()} 帧 ·{' '}
                    {Number(captureProgress.ProtocolCount || 0).toLocaleString()} 条协议消息
                  </span>
                  <small>
                    {formatBytes(captureProgress.BytesIndexed)} ·{' '}
                    {Number(captureProgress.NetInterfaceTransferKBPerSeconds || 0).toLocaleString()} KB/s
                  </small>
                </>
              ) : (
                <small>正在打开网卡并创建实时数据集…</small>
              )}
              <div className={styles['capture-actions']}>
                <YakitButton
                  type="outline2"
                  size="small"
                  onClick={() => {
                    if (captureProgress?.DatasetID) loadLibrary(captureProgress.DatasetID)
                    setRevision((value) => value + 1)
                  }}
                >
                  刷新列表
                </YakitButton>
                <YakitButton danger size="small" loading={captureStopping} onClick={stopLiveCapture}>
                  停止抓包
                </YakitButton>
              </div>
            </div>
          )}
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
                <div
                  key={db.DatasetID}
                  className={`${styles['dataset-item']} ${datasetID === db.DatasetID ? styles['active-dataset'] : ''}`}
                  title={db.SourcePath}
                >
                  <button
                    type="button"
                    className={styles['dataset-select']}
                    onClick={() => selectDataset(db.DatasetID)}
                    aria-pressed={datasetID === db.DatasetID}
                  >
                    <FileOutlined />
                    <div>
                      <strong>{databaseName(db)}</strong>
                      <span>
                        {Number(db.PacketCount).toLocaleString()} 个包 <i>·</i> {formatBytes(db.SourceSize)}
                      </span>
                      <small className={db.State === 'ready' ? styles['ready-state'] : styles.warning}>
                        {stateNames[db.State] || db.State} <i>·</i> {db.Format.toUpperCase()}
                      </small>
                    </div>
                  </button>
                  <div className={styles['dataset-actions']}>
                    <Tooltip title="导出此文件">
                      <YakitButton
                        type="text2"
                        size="small"
                        aria-label={`导出 ${databaseName(db)}`}
                        icon={<ExportOutlined />}
                        disabled={db.State !== 'ready'}
                        onClick={() => {
                          if (db.DatasetID !== datasetID) selectDataset(db.DatasetID)
                          setExportPacket(false)
                          setExportPath('')
                          setExportError('')
                          setExportOpen(true)
                        }}
                      />
                    </Tooltip>
                    <Tooltip title="删除此数据集">
                      <YakitButton
                        type="text2"
                        size="small"
                        danger
                        aria-label={`删除 ${databaseName(db)}`}
                        icon={<DeleteOutlined />}
                        onClick={() => {
                          if (db.DatasetID !== datasetID) selectDataset(db.DatasetID)
                          setDeleteOpen(true)
                        }}
                      />
                    </Tooltip>
                  </div>
                </div>
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
              <YakitButton icon={<WifiOutlined />} type="outline2" onClick={() => setCaptureOpen(true)}>
                开始实时抓包
              </YakitButton>
              <small>也可以将本地文件拖入此处 · 远程引擎请填写引擎端路径</small>
            </div>
          ) : (
            <>
              {!datasetQueryable ? (
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
                      onChange={updateProtocol}
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
                        applyQueryFilters(emptyFilters)
                      }}
                    >
                      重置
                    </YakitButton>
                  </form>
                  <div className={styles['packet-workspace']}>
                    <YakitResizeBox
                      isVer
                      firstRatio={selectedID ? '38%' : '100%'}
                      secondRatio={selectedID ? '62%' : '0%'}
                      firstMinSize={120}
                      secondMinSize={selectedID ? 180 : 0}
                      firstNode={
                        <PCAPPacketTable
                          packets={page.Data}
                          totalKnown={totalKnown}
                          hasFilters={hasFilters}
                          selectedID={selectedID}
                          loading={loading}
                          loadingMore={loadingMore}
                          hasMore={page.HasMore && !listError}
                          error={listError}
                          onSelect={selectPacket}
                          onLoadMore={loadMore}
                          onRetry={retryLoadMore}
                        />
                      }
                      secondNode={
                        detailLoading ? (
                          <div className={styles['detail-loading']}>
                            <Spin />
                            <span>正在读取数据包 #{selectedID}</span>
                          </div>
                        ) : detail ? (
                          <PacketDetailPane
                            key={detail.Packet.Id}
                            datasetID={datasetID}
                            detail={detail}
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
        title="实时抓包"
        subTitle="持续写入 pcapdb，抓包过程中即可查询"
        open={captureOpen}
        width={620}
        okText="开始抓包"
        okButtonProps={{ disabled: !captureInterface || captureMetadataLoading }}
        onCancel={() => setCaptureOpen(false)}
        onOk={startLiveCapture}
      >
        <div className={styles['modal-body']}>
          <label htmlFor="pcap-live-interface">抓包网卡</label>
          <YakitSelect
            id="pcap-live-interface"
            aria-label="抓包网卡"
            value={captureInterface}
            loading={captureMetadataLoading}
            options={(captureMetadata?.AvailablePcapDevices || []).map((item) => ({
              value: item.Name,
              label: `${item.Name}${item.IP ? ` · ${item.IP}` : ''}`,
            }))}
            onChange={setCaptureInterface}
          />
          <label htmlFor="pcap-live-bpf">BPF 过滤表达式</label>
          <YakitInput
            id="pcap-live-bpf"
            placeholder="例如 tcp port 80"
            value={captureBPF}
            onChange={(e) => setCaptureBPF(e.target.value)}
          />
          <label htmlFor="pcap-live-snaplen">Snaplen</label>
          <YakitInput
            id="pcap-live-snaplen"
            value={captureSnaplen}
            onChange={(e) => setCaptureSnaplen(e.target.value)}
          />
          <Checkbox checked={capturePromisc} onChange={(e) => setCapturePromisc(e.target.checked)}>
            混杂模式
          </Checkbox>
          <p>当前阶段支持单网卡持续抓包；停止后数据集仍保留，可继续查询、导出或删除。</p>
          {captureError && <Alert type="error" showIcon message={captureError} />}
        </div>
      </YakitModal>
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
            将删除「{dataset && databaseName(dataset)}」的分析数据库和导入的包数据。源路径中的原始 PCAP 文件不会删除。
          </p>
        </div>
      </YakitModal>
    </div>
  )
}
