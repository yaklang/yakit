import { useCallback, useEffect, useRef, useState } from 'react'
import { Alert, Checkbox, Progress, Spin, Tooltip } from 'antd'
import {
  DatabaseOutlined,
  DocumentDownloadOutlined,
  FileArchiveOutlined,
  FileUpOutlined,
  InboxOutlined,
  LibraryOutlined,
  RefreshOutlined,
  RssOutlined,
  SearchOutlined,
  Trash2Outlined,
} from '@yakit-libs/yakit-ui-icons/outline'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitAutoComplete } from '@/components/yakitUI/YakitAutoComplete/YakitAutoComplete'
import { YakitInput } from '@/components/yakitUI/YakitInput/YakitInput'
import { YakitPopover } from '@/components/yakitUI/YakitPopover/YakitPopover'
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
  Paging,
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
const pcapPageSize = 100
const initialPaging: Paging = {
  Page: '1',
  Limit: String(pcapPageSize),
  OrderBy: 'id',
  Order: 'asc',
  RawOrder: '',
  BeforeId: '0',
  AfterId: '0',
}
type PacketListPage = PacketPage & { NextCursor: string; HasMore: boolean }
const initialPage: PacketListPage = { Data: [], Pagination: initialPaging, NextCursor: '0', HasMore: false }
const packetPageView = (response: PacketPage, loadedCount = 0): PacketListPage => {
  const limit = Number(response.Pagination?.Limit || pcapPageSize)
  const total = response.Total !== undefined && response.Total !== '' ? Number(response.Total) : undefined
  return {
    ...response,
    NextCursor: response.Pagination?.AfterId || '0',
    HasMore: response.Data.length >= limit && (total === undefined || loadedCount + response.Data.length < total),
  }
}
const filterQueryDelay = 400
const liveRefreshInterval = 1000
const libraryRefreshInterval = 2000
const commonProtocols = [
  'TCP',
  'UDP',
  'SCTP',
  'ARP',
  'ICMPv4',
  'ICMPv6',
  'HTTP',
  'TLS',
  'DNS',
  'DHCP',
  'FTP',
  'SMTP',
  'POP3',
  'IMAP',
  'SSH',
  'NTP',
]
const protocolOptions = commonProtocols.map((value) => ({ value, label: value }))
const normalizeDatabase = (database: PCAPDatabase): PCAPDatabase => ({
  ...database,
  SourceKind: database.SourceKind || (database.SourcePath ? 'file' : 'live'),
})
const databaseFields = [
  'Id',
  'DatasetID',
  'SourcePath',
  'SourceSize',
  'Format',
  'State',
  'PacketCount',
  'LastError',
  'PreviewTruncated',
  'ProtocolsIndexed',
  'SourceKind',
  'CaptureInterface',
  'CaptureBPF',
  'ProtocolCount',
  'SessionCount',
  'StreamCount',
  'StreamChunkCount',
  'StreamsIndexed',
  'CreatedAt',
] as const satisfies readonly (keyof PCAPDatabase)[]
const sameDatabases = (left: PCAPDatabase[], right: PCAPDatabase[]) =>
  left.length === right.length &&
  left.every((database, index) => databaseFields.every((field) => database[field] === right[index]?.[field]))
const isLiveDatabase = (database?: PCAPDatabase) =>
  Boolean(database && (database.SourceKind === 'live' || database.Format === 'live'))
const databaseName = (database?: PCAPDatabase) =>
  isLiveDatabase(database)
    ? database?.CaptureInterface
      ? [database.CaptureInterface, database.CaptureBPF.trim()].filter(Boolean).join(' · ')
      : database?.DatasetID
        ? `实时抓包 ${database.DatasetID.slice(0, 8)}`
        : '实时抓包'
    : fileName(database?.SourcePath || '') || '捕获数据集'
const formatPacketCount = (value: string) => {
  const count = Number(value)
  if (!Number.isFinite(count)) return '0'
  if (count < 10000) return count.toLocaleString()
  const unit = count >= 1000000000000 ? 1000000000000 : count >= 100000000 ? 100000000 : 10000
  const suffix = unit === 1000000000000 ? '万亿' : unit === 100000000 ? '亿' : '万'
  return `${(count / unit).toFixed(1).replace(/\.0$/, '')}${suffix}`
}
const formatCreatedAt = (value: string) => {
  const seconds = Number(value)
  if (!Number.isFinite(seconds) || seconds <= 0) return ''
  const date = new Date(seconds * 1000)
  const now = new Date()
  const pad = (part: number) => String(part).padStart(2, '0')
  const time = `${pad(date.getHours())}:${pad(date.getMinutes())}`
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const dateStart = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const dayDiff = Math.round((today.getTime() - dateStart.getTime()) / 86400000)
  if (dayDiff === 0) return `今天 ${time}`
  if (dayDiff === 1) return `昨天 ${time}`
  if (date.getFullYear() === now.getFullYear()) return `${date.getMonth() + 1}月${date.getDate()}日 ${time}`
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${time}`
}
const formatCreatedAtFull = (value: string) => {
  const seconds = Number(value)
  if (!Number.isFinite(seconds) || seconds <= 0) return '—'
  const date = new Date(seconds * 1000)
  const pad = (part: number) => String(part).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(
    date.getMinutes(),
  )}:${pad(date.getSeconds())}`
}
const DatabaseDetailsContent = ({
  database,
  capture,
}: {
  database: PCAPDatabase
  capture?: { speed: string; stopping: boolean; onStop: () => void }
}) => {
  const live = isLiveDatabase(database)
  return (
    <section className={styles['database-details']} aria-label={`${databaseName(database)} 详细信息`}>
      <header className={styles['database-details-header']}>
        <div>
          <strong>{databaseName(database)}</strong>
          <span>{live ? '实时抓包' : 'PCAP 文件'}</span>
        </div>
        <span className={styles['database-details-state']} data-ready={database.State === 'ready'}>
          {stateNames[database.State] || database.State}
        </span>
      </header>
      <dl className={styles['database-details-list']}>
        <dt>创建时间</dt>
        <dd>{formatCreatedAtFull(database.CreatedAt)}</dd>
        <dt>数据包</dt>
        <dd>{Number(database.PacketCount || 0).toLocaleString()} 个</dd>
        <dt>数据大小</dt>
        <dd>{formatBytes(database.SourceSize)}</dd>
        <dt>存储格式</dt>
        <dd>{database.Format ? database.Format.toUpperCase() : '—'}</dd>
        {live ? (
          <>
            <dt>网卡</dt>
            <dd>{database.CaptureInterface || '—'}</dd>
            <dt>BPF</dt>
            <dd className={styles.mono}>{database.CaptureBPF || '未设置'}</dd>
          </>
        ) : (
          <>
            <dt>文件路径</dt>
            <dd className={styles['database-details-path']}>{database.SourcePath || '—'}</dd>
          </>
        )}
        <dt>协议消息</dt>
        <dd>{Number(database.ProtocolCount || 0).toLocaleString()}</dd>
        <dt>会话</dt>
        <dd>{Number(database.SessionCount || 0).toLocaleString()}</dd>
        <dt>重组流</dt>
        <dd>{Number(database.StreamCount || 0).toLocaleString()}</dd>
        <dt>重组块</dt>
        <dd>{Number(database.StreamChunkCount || 0).toLocaleString()}</dd>
        <dt>索引</dt>
        <dd>
          协议{database.ProtocolsIndexed ? '已完成' : '未完成'} · 流{database.StreamsIndexed ? '已完成' : '未完成'}
        </dd>
        <dt>DatasetID</dt>
        <dd className={styles.mono}>{database.DatasetID}</dd>
      </dl>
      {database.LastError ? <div className={styles['database-details-error']}>{database.LastError}</div> : null}
      {database.PreviewTruncated ? (
        <div className={styles['database-details-note']}>部分元信息过长，已截断。</div>
      ) : null}
      {capture ? (
        <div className={styles['database-details-capture']}>
          <span>
            <i />
            正在抓包
          </span>
          <strong>{Number(capture.speed || 0).toLocaleString()} KB/s</strong>
          <YakitButton danger size="small" loading={capture.stopping} onClick={capture.onStop}>
            停止抓包
          </YakitButton>
        </div>
      ) : null}
    </section>
  )
}
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
  const [page, setPage] = useState<PacketListPage>(initialPage)
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
  const [liveRefreshNonce, setLiveRefreshNonce] = useState(0)
  const [exportOpen, setExportOpen] = useState(false)
  const [exportPacket, setExportPacket] = useState(false)
  const [exportPath, setExportPath] = useState('')
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState('')
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const libraryRequest = useRef(0)
  const libraryLoadingRef = useRef(false)
  const libraryPolling = useRef(false)
  const detailRequest = useRef(0)
  const loadMorePending = useRef(false)
  const liveRequestInFlight = useRef(false)
  const captureStopRequested = useRef(false)
  const loadedPacketIDs = useRef(new Set<string>())
  const captureDatabase = captureProgress?.Database
  const dataset = databases.find((item) => item.DatasetID === datasetID)
  const datasetQueryable = dataset?.State === 'ready' || Boolean(capture && captureDatabase?.DatasetID === datasetID)

  const fetchLibrary = useCallback(async () => {
    const all: PCAPDatabase[] = []
    let after = '0'
    while (true) {
      const response = await yakitTraffic.queryDatabases({
        Pagination: { Limit: pcapPageSize, AfterId: after },
      })
      all.push(...response.Data.map(normalizeDatabase))
      const nextCursor = response.Pagination?.AfterId || '0'
      const limit = Number(response.Pagination?.Limit || pcapPageSize)
      if (response.Data.length < limit) break
      if (nextCursor === after) throw new Error('数据集分页游标未前进，请更新引擎')
      after = nextCursor
    }
    return all
  }, [])

  const loadLibrary = useCallback(
    async (preferred?: string) => {
      const request = ++libraryRequest.current
      libraryLoadingRef.current = true
      setLibraryLoading(true)
      try {
        const all = await fetchLibrary()
        if (request !== libraryRequest.current) return
        setDatabases((current) => {
          if (preferred && !all.some((item) => item.DatasetID === preferred)) {
            const pending = current.find((item) => item.DatasetID === preferred)
            if (pending) return [pending, ...all]
          }
          return all
        })
        if (!preferred) {
          setCursor('0')
          setPage(initialPage)
        }
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
        if (request === libraryRequest.current) {
          libraryLoadingRef.current = false
          setLibraryLoading(false)
        }
      }
    },
    [fetchLibrary],
  )

  const refreshLibrary = useCallback(async () => {
    if (libraryLoadingRef.current || libraryPolling.current) return
    const request = ++libraryRequest.current
    libraryPolling.current = true
    try {
      const all = await fetchLibrary()
      if (request === libraryRequest.current) {
        setDatabases((current) => (sameDatabases(current, all) ? current : all))
      }
    } catch {
      // Keep the last successful catalog; the manual refresh reports failures.
    } finally {
      libraryPolling.current = false
    }
  }, [fetchLibrary])

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState !== 'hidden') void refreshLibrary()
    }, libraryRefreshInterval)
    return () => clearInterval(timer)
  }, [refreshLibrary])

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
        const database = event.Database ? normalizeDatabase(event.Database) : undefined
        // PcapX is live progress only. The catalog is authoritative and must come from QueryPCAPDatabase.
        if (database?.DatasetID && !datasetOpened) {
          datasetOpened = true
          setDatasetID(database.DatasetID)
          setDraft(emptyFilters)
          setFilters(emptyFilters)
          setCursor('0')
          setPage(initialPage)
          setTotalKnown(undefined)
          loadLibrary(database.DatasetID)
          setRevision((value) => value + 1)
        }
        if (event.Finished) {
          finished = true
          captureStopRequested.current = false
          setCapture(undefined)
          setCaptureStopping(false)
          if (database?.DatasetID) {
            loadLibrary(database.DatasetID)
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
      query = packetQuery(datasetID, filters, cursor, pcapPageSize)
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
              const nextPage = packetPageView(response, currentPage.Data.length)
              return {
                ...nextPage,
                Data: [...currentPage.Data, ...additions],
              }
            })
          } else {
            loadedPacketIDs.current = new Set(response.Data.map((packet) => packet.Id))
            setPage(packetPageView(response))
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

  const lastPacketID = page.Data[page.Data.length - 1]?.Id || '0'
  useEffect(() => {
    if (!capture || captureDatabase?.DatasetID !== datasetID || selectedID || loading || loadingMore) {
      return
    }
    let current = true
    let query: PacketQuery
    try {
      query = packetQuery(datasetID, filters, lastPacketID, pcapPageSize)
    } catch {
      return
    }
    const timer = setTimeout(() => {
      if (!current) return
      if (liveRequestInFlight.current) {
        setLiveRefreshNonce((value) => value + 1)
        return
      }
      liveRequestInFlight.current = true
      yakitTraffic
        .queryPackets(query)
        .then((response) => {
          if (!current) return
          const loaded = loadedPacketIDs.current
          const additions = response.Data.filter((packet) => {
            if (loaded.has(packet.Id)) return false
            loaded.add(packet.Id)
            return true
          })
          setPage((currentPage) => {
            const nextPage = packetPageView(response, currentPage.Data.length)
            return {
              ...nextPage,
              Data: [...currentPage.Data, ...additions],
              Total: response.Total ?? currentPage.Total,
            }
          })
          if (response.Total !== undefined && response.Total !== '') setTotalKnown(response.Total)
          setListError('')
        })
        .catch((e) => {
          if (current) setListError(`实时刷新失败：${errorText(e)}`)
        })
        .finally(() => {
          liveRequestInFlight.current = false
          if (current) setLiveRefreshNonce((value) => value + 1)
        })
    }, liveRefreshInterval)
    return () => {
      current = false
      clearTimeout(timer)
    }
  }, [
    capture,
    captureDatabase?.DatasetID,
    datasetID,
    filters,
    lastPacketID,
    liveRefreshNonce,
    loading,
    loadingMore,
    selectedID,
  ])

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
    setRevision((value) => value + 1)
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
      const stoppedDatasetID = captureDatabase?.DatasetID
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
              <LibraryOutlined size={15} />
              流量分析 <small>{databases.length}</small>
            </span>
            <div className={styles['sidebar-actions']}>
              <Tooltip title="刷新数据集与当前列表">
                <YakitButton
                  type="text2"
                  size="small"
                  aria-label="刷新"
                  icon={<RefreshOutlined size={16} />}
                  loading={libraryLoading}
                  onClick={() => {
                    loadLibrary()
                    setRevision((v) => v + 1)
                  }}
                />
              </Tooltip>
              <Tooltip title={capture ? '停止实时抓包' : '启动实时抓包'}>
                <YakitButton
                  type="text2"
                  size="small"
                  danger={!!capture}
                  loading={captureStopping}
                  aria-label={capture ? '停止实时抓包' : '实时抓包'}
                  icon={<RssOutlined size={16} />}
                  onClick={() => {
                    if (capture) {
                      void stopLiveCapture()
                      return
                    }
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
                  icon={<FileUpOutlined size={16} />}
                  onClick={() => {
                    setImportOpen(true)
                    setImportError('')
                  }}
                />
              </Tooltip>
            </div>
          </div>
          <div className={styles['dataset-list']}>
            {libraryLoading && !databases.length ? (
              <Spin />
            ) : !databases.length ? (
              <div className={styles['sidebar-empty']}>
                <InboxOutlined size={30} />
                <span>还没有捕获文件</span>
                <small>支持 .pcap / .pcapng / .cap</small>
              </div>
            ) : (
              databases.map((db) => (
                <YakitPopover
                  key={db.DatasetID}
                  trigger="hover"
                  placement="rightTop"
                  mouseEnterDelay={0.35}
                  classNames={{ root: styles['database-details-overlay'] }}
                  content={
                    <DatabaseDetailsContent
                      database={db}
                      capture={
                        capture && captureDatabase?.DatasetID === db.DatasetID
                          ? {
                              speed: captureProgress?.NetInterfaceTransferKBPerSeconds || '0',
                              stopping: captureStopping,
                              onStop: () => void stopLiveCapture(),
                            }
                          : undefined
                      }
                    />
                  }
                >
                  <div
                    className={`${styles['dataset-item']} ${datasetID === db.DatasetID ? styles['active-dataset'] : ''}`}
                    data-capturing={capture && captureDatabase?.DatasetID === db.DatasetID ? 'true' : undefined}
                  >
                    <button
                      type="button"
                      className={styles['dataset-select']}
                      onClick={() => selectDataset(db.DatasetID)}
                      aria-pressed={datasetID === db.DatasetID}
                    >
                      {isLiveDatabase(db) ? <RssOutlined size={19} /> : <FileArchiveOutlined size={19} />}
                      <div>
                        <strong>{databaseName(db)}</strong>
                        <div
                          className={styles['dataset-summary']}
                          title={`${
                            formatCreatedAt(db.CreatedAt) ? `${formatCreatedAtFull(db.CreatedAt)} · ` : ''
                          }${Number(db.PacketCount).toLocaleString()} 个包`}
                        >
                          {formatCreatedAt(db.CreatedAt) ? (
                            <>
                              <time
                                className={styles['dataset-created']}
                                dateTime={new Date(Number(db.CreatedAt) * 1000).toISOString()}
                              >
                                {formatCreatedAt(db.CreatedAt)}
                              </time>
                              <i>·</i>
                            </>
                          ) : null}
                          <span className={styles['dataset-packet-count']}>{formatPacketCount(db.PacketCount)}包</span>
                        </div>
                        {capture && captureDatabase?.DatasetID === db.DatasetID ? (
                          <div className={styles['dataset-capture-live']}>
                            <span>
                              <i />
                              抓包中
                            </span>
                            <strong>
                              {Number(captureProgress?.NetInterfaceTransferKBPerSeconds || 0).toLocaleString()} KB/s
                            </strong>
                          </div>
                        ) : null}
                        {db.State !== 'ready' ? (
                          <small className={styles.warning}>{stateNames[db.State] || db.State}</small>
                        ) : null}
                      </div>
                    </button>
                    <div className={styles['dataset-actions']}>
                      <Tooltip title="导出此文件">
                        <YakitButton
                          type="text2"
                          size="small"
                          aria-label={`导出 ${databaseName(db)}`}
                          icon={<DocumentDownloadOutlined size={15} />}
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
                          icon={<Trash2Outlined size={15} />}
                          onClick={() => {
                            if (db.DatasetID !== datasetID) selectDataset(db.DatasetID)
                            setDeleteOpen(true)
                          }}
                        />
                      </Tooltip>
                    </div>
                  </div>
                </YakitPopover>
              ))
            )}
          </div>
        </aside>
        <main className={styles.main}>
          {!dataset ? (
            <div className={styles.welcome}>
              <div className={styles['welcome-icon']}>
                <DatabaseOutlined size={36} />
              </div>
              <h3>每个数据包，都有迹可循</h3>
              <p>导入一个捕获文件，查看协议层次、原始字节与重组消息。</p>
              <YakitButton icon={<FileUpOutlined size={16} />} onClick={() => setImportOpen(true)}>
                导入第一个 PCAP 文件
              </YakitButton>
              <YakitButton icon={<RssOutlined size={16} />} type="outline2" onClick={() => setCaptureOpen(true)}>
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
                    <YakitAutoComplete
                      aria-label="协议过滤"
                      value={draft.Protocol}
                      allowClear
                      placeholder="全部协议（可输入）"
                      wrapperStyle={{ width: 150, flexShrink: 0 }}
                      style={{ width: '100%' }}
                      options={protocolOptions}
                      notFoundContent="回车使用自定义协议"
                      onChange={(value) => setDraft((current) => ({ ...current, Protocol: value }))}
                      onSelect={(value) => updateProtocol(value)}
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
                      prefix={<SearchOutlined size={16} />}
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
                          followLive={Boolean(capture && captureDatabase?.DatasetID === datasetID)}
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
