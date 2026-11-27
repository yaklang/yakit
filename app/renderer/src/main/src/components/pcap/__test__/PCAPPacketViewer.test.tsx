import React from 'react'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PacketPage, PCAPDatabase, PCAPPacketDetail, PCAPPacketSummary, Paging } from '../pcapTypes'

const { api, listeners, cancel, browse, scrollToIndex } = vi.hoisted(() => ({
  api: {
    getPcapMetadata: vi.fn(),
    queryPackets: vi.fn(),
    getPacketDetail: vi.fn(),
    readBytes: vi.fn(),
    queryDatabases: vi.fn(),
    importFile: vi.fn(),
    startLiveCapture: vi.fn(),
    exportData: vi.fn(),
    deleteDatabase: vi.fn(),
  },
  listeners: new Map<string, (payload?: any) => void>(),
  cancel: vi.fn(),
  browse: vi.fn(),
  scrollToIndex: vi.fn(),
}))
vi.mock('@/services/electronBridge', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  yakitTraffic: api,
  yakitStream: {
    onData: (token, callback) => {
      listeners.set(`${token}-data`, callback)
      return () => listeners.delete(`${token}-data`)
    },
    onError: (token, callback) => {
      listeners.set(`${token}-error`, callback)
      return () => listeners.delete(`${token}-error`)
    },
    onEnd: (token, callback) => {
      listeners.set(`${token}-end`, callback)
      return () => listeners.delete(`${token}-end`)
    },
    cancel,
  },
}))
vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({ t: (key: string) => key, i18n: { language: 'zh' } }),
}))
vi.mock('@/utils/notification', () => ({ success: vi.fn() }))
vi.mock('@/utils/fileSystemDialog', () => ({ handleOpenFileSystemDialog: browse }))
vi.mock('react-virtuoso', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  TableVirtuoso: React.forwardRef(function MockTableVirtuoso(
    { data, fixedHeaderContent, itemContent, endReached, followOutput, components }: any,
    ref,
  ) {
    React.useImperativeHandle(ref, () => ({
      scrollTo: vi.fn(),
      scrollBy: vi.fn(),
      scrollToIndex,
      scrollIntoView: vi.fn(),
      getState: vi.fn(),
    }))
    const Row = components?.TableRow
    const EmptyPlaceholder = components?.EmptyPlaceholder
    return (
      <div>
        {data.length ? (
          <table>
            <thead>{fixedHeaderContent?.()}</thead>
            <tbody>
              {data.map((item: any, index: number) => (
                <Row key={item.Id} item={item} data-index={index} data-item-index={index} data-known-size={29}>
                  {itemContent(index, item)}
                </Row>
              ))}
            </tbody>
          </table>
        ) : (
          EmptyPlaceholder && <EmptyPlaceholder />
        )}
        {followOutput && <span data-testid="packet-follow-output">{String(followOutput)}</span>}
        {endReached && <button onClick={() => endReached(data.length - 1)}>触发加载更多</button>}
      </div>
    )
  }),
}))
vi.mock('../PacketDetailPane', () => ({
  PacketDetailPane: ({ detail, onJump }) => (
    <div data-testid="packet-details">
      详情 #{detail.Packet.Id}
      <button onClick={() => onJump('38')}>跳转完成包</button>
    </div>
  ),
}))

import PCAPPacketViewer from '../PCAPPacketViewer'

const nativeGetComputedStyle = window.getComputedStyle.bind(window)

const database: PCAPDatabase = {
  Id: '1',
  DatasetID: 'dataset-a',
  SourcePath: '/captures/http.cap',
  SourceSize: '24000',
  Format: 'pcap',
  State: 'ready',
  PacketCount: '43',
  LastError: '',
  PreviewTruncated: false,
  ProtocolsIndexed: true,
  SourceKind: 'file',
  CaptureInterface: '',
  CaptureBPF: '',
  ProtocolCount: '0',
  SessionCount: '0',
  StreamCount: '0',
  StreamChunkCount: '0',
  StreamsIndexed: false,
  CreatedAt: '1700000000',
}
const packet = (id: string): PCAPPacketSummary => ({
  Id: id,
  TimestampNS: '1700000000123456789',
  CapturedLength: '478',
  OriginalLength: '478',
  LinkType: '1',
  Section: '0',
  Interface: '0',
  SourceMAC: '',
  DestinationMAC: '',
  VLANStack: '',
  SourceIP: '10.0.0.1',
  DestinationIP: '10.0.0.2',
  SourcePort: 80,
  DestinationPort: 12345,
  Transport: 'tcp',
  Protocol: 'HTTP',
  ApplicationProtocols: ['HTTP'],
  Info: `HTTP response ${id}`,
  DecodeError: '',
})
const paging = (afterId: string, limit = 100): Paging => ({
  Page: '1',
  Limit: String(limit),
  OrderBy: 'id',
  Order: 'asc',
  RawOrder: '',
  BeforeId: '0',
  AfterId: afterId,
})
const page = (id: string, hasMore = false): PacketPage => ({
  Data: [packet(id)],
  Total: id === '10' ? '43' : '',
  Pagination: paging(id, hasMore ? 1 : 100),
})
const databasePage = (data: PCAPDatabase[], total = String(data.length)) => ({
  Data: data,
  Total: total,
  Pagination: paging(data[data.length - 1]?.Id || '0'),
})
const detail = (id: string): PCAPPacketDetail => ({
  Packet: packet(id),
  Nodes: [
    {
      Name: `Frame ${id}`,
      DisplayValue: 'captured frame',
      Children: [],
      Ranges: [],
    },
  ],
  Messages: [],
  RelatedMessages: [],
  ByteSources: [
    {
      ID: `frame:${id}`,
      Kind: 'frame',
      Name: `Frame #${id}`,
      Length: '478',
      Completeness: 'frame',
      ContributorPacketIds: [],
      CompletedInPacketId: '0',
      InitialData: [],
      InitialOffset: '0',
      InitialTruncated: false,
    },
  ],
})

beforeEach(() => {
  vi.stubGlobal('CSS', { escape: (value: string) => value })
  Element.prototype.scrollIntoView = vi.fn()
  vi.spyOn(window, 'getComputedStyle').mockImplementation((element) => nativeGetComputedStyle(element))
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  )
  window.matchMedia = vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
  vi.clearAllMocks()
  listeners.clear()
  api.queryDatabases.mockResolvedValue(databasePage([database], '1'))
  api.getPcapMetadata.mockResolvedValue({
    AvailablePcapDevices: [
      { Name: 'eth0', Description: 'Ethernet', NetInterfaceName: 'eth0', Addr: '', IP: '10.0.0.10' },
    ],
    DefaultPublicNetInterface: {
      Name: 'eth0',
      Description: 'Ethernet',
      NetInterfaceName: 'eth0',
      Addr: '',
      IP: '10.0.0.10',
    },
  })
  api.queryPackets.mockImplementation(async (query) => page(query.Pagination.AfterId === '10' ? '20' : '10', true))
  api.getPacketDetail.mockImplementation(async ({ PacketID }) => detail(PacketID))
  api.readBytes.mockResolvedValue({ Data: [], Offset: '0', TotalLength: '478', EOF: false })
  api.importFile.mockResolvedValue(undefined)
  api.startLiveCapture.mockResolvedValue(undefined)
  cancel.mockResolvedValue(undefined)
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('PCAP packet workspace', () => {
  it('uses the new query contract and appends cursor results while scrolling', async () => {
    render(<PCAPPacketViewer />)
    await screen.findByText('HTTP response 10')
    const datasetItem = screen.getByText('http.cap').closest('button')
    expect(datasetItem).not.toHaveTextContent('PCAP')
    expect(datasetItem).not.toHaveTextContent('可查看')
    expect(datasetItem).toHaveTextContent(/(今天|昨天|\d{1,2}月\d{1,2}日|\d{4}年\d{1,2}月\d{1,2}日) \d{2}:\d{2}/)
    expect(api.queryPackets).toHaveBeenCalledWith({
      DatasetID: database.DatasetID,
      Filter: {},
      Pagination: { Limit: 100, AfterId: '0' },
    })
    fireEvent.click(await screen.findByRole('button', { name: '触发加载更多' }))
    await screen.findByText('HTTP response 20')
    expect(screen.getByText('HTTP response 10')).toBeInTheDocument()
    expect(api.queryPackets).toHaveBeenLastCalledWith({
      DatasetID: database.DatasetID,
      Filter: {},
      Pagination: { Limit: 100, AfterId: '10' },
    })
    fireEvent.change(screen.getByRole('textbox', { name: '源 IP' }), { target: { value: '10.0.0.1' } })
    fireEvent.change(screen.getByRole('textbox', { name: '源端口' }), { target: { value: '0' } })
    fireEvent.click(screen.getByRole('button', { name: '查询' }))
    await waitFor(() =>
      expect(api.queryPackets).toHaveBeenLastCalledWith({
        DatasetID: database.DatasetID,
        Filter: { SourceIP: ['10.0.0.1'], SourcePort: [0] },
        Pagination: { Limit: 100, AfterId: '0' },
      }),
    )
  })

  it('queries automatically after text filters settle', async () => {
    render(<PCAPPacketViewer />)
    await screen.findByText('HTTP response 10')
    const keyword = screen.getByRole('textbox', { name: '摘要关键词' })
    fireEvent.change(keyword, { target: { value: 'HTTP' } })
    fireEvent.change(keyword, { target: { value: 'HTTP response 10' } })
    await waitFor(
      () =>
        expect(api.queryPackets).toHaveBeenLastCalledWith({
          DatasetID: database.DatasetID,
          Filter: { Keyword: 'HTTP response 10' },
          Pagination: { Limit: 100, AfterId: '0' },
        }),
      { timeout: 1500 },
    )
  })

  it('requeries packets when the active dataset is selected again', async () => {
    render(<PCAPPacketViewer />)
    await screen.findByText('HTTP response 10')
    const queryCount = api.queryPackets.mock.calls.length
    fireEvent.click(screen.getByText('http.cap').closest('button')!)
    await waitFor(() => expect(api.queryPackets.mock.calls.length).toBeGreaterThan(queryCount))
    await screen.findByText('HTTP response 10')
  })

  it('polls the catalog without resetting the packet query', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
    try {
      render(<PCAPPacketViewer />)
      await screen.findByText('HTTP response 10')
      const databaseQueries = api.queryDatabases.mock.calls.length
      const packetQueries = api.queryPackets.mock.calls.length
      api.queryDatabases.mockResolvedValue(databasePage([{ ...database, PacketCount: '44', SourceSize: '25000' }], '1'))

      act(() => vi.advanceTimersByTime(2000))
      await waitFor(() => expect(api.queryDatabases.mock.calls.length).toBeGreaterThan(databaseQueries))
      expect(screen.getByText('http.cap').closest('button')).toHaveTextContent('44包')
      expect(api.queryPackets.mock.calls.length).toBe(packetQueries)
    } finally {
      vi.useRealTimers()
    }
  })

  it('shows persisted live captures by interface and BPF without a redundant LIVE badge', async () => {
    const liveDatabase: PCAPDatabase = {
      ...database,
      Id: '18',
      DatasetID: '2415095b-1256-4346-a79b-60ee56f2c09a',
      SourcePath: '',
      Format: 'pcap',
      PacketCount: '791615',
      SourceSize: '384431',
      SourceKind: 'live',
      CaptureInterface: 'eth0',
      CaptureBPF: 'tcp port 443',
    }
    api.queryDatabases.mockResolvedValue(databasePage([liveDatabase], '1'))
    render(<PCAPPacketViewer />)
    const item = (await screen.findByText('eth0 · tcp port 443')).closest('button')
    expect(item).not.toHaveTextContent('LIVE')
    expect(item).not.toHaveTextContent('PCAP')
    expect(item).toHaveTextContent('79.2万包')
    fireEvent.mouseEnter(item!.parentElement!)
    const details = await screen.findByLabelText('eth0 · tcp port 443 详细信息')
    expect(within(details).getByText('791,615 个')).toBeInTheDocument()
    expect(within(details).getByText('eth0')).toBeInTheDocument()
    expect(within(details).getByText('tcp port 443')).toBeInTheDocument()
    expect(within(details).getByText('2415095b-1256-4346-a79b-60ee56f2c09a')).toBeInTheDocument()
  })

  it('queries immediately after selecting a protocol', async () => {
    render(<PCAPPacketViewer />)
    await screen.findByText('HTTP response 10')
    fireEvent.mouseDown(screen.getByRole('combobox', { name: '协议过滤' }))
    fireEvent.click(await screen.findByTitle('DNS'))
    await waitFor(() =>
      expect(api.queryPackets).toHaveBeenLastCalledWith({
        DatasetID: database.DatasetID,
        Filter: { ApplicationLayerTypes: ['DNS'] },
        Pagination: { Limit: 100, AfterId: '0' },
      }),
    )
  })

  it('accepts a custom protocol beyond the completion suggestions', async () => {
    render(<PCAPPacketViewer />)
    await screen.findByText('HTTP response 10')
    const input = screen.getByRole('combobox', { name: '协议过滤' })
    fireEvent.change(input, { target: { value: 'MODBUS' } })
    await waitFor(
      () =>
        expect(api.queryPackets).toHaveBeenLastCalledWith({
          DatasetID: database.DatasetID,
          Filter: { ApplicationLayerTypes: ['MODBUS'] },
          Pagination: { Limit: 100, AfterId: '0' },
        }),
      { timeout: 1500 },
    )
    expect(input).toHaveValue('MODBUS')
  })

  it('loads a typed packet detail and jumps to the completion frame', async () => {
    render(<PCAPPacketViewer />)
    await screen.findByText('HTTP response 10')
    fireEvent.click(screen.getByText('HTTP response 10'))
    await screen.findByTestId('packet-details')
    expect(api.getPacketDetail).toHaveBeenCalledWith({ DatasetID: database.DatasetID, PacketID: '10' })
    fireEvent.click(screen.getByRole('button', { name: '跳转完成包' }))
    await waitFor(() =>
      expect(api.getPacketDetail).toHaveBeenCalledWith({ DatasetID: database.DatasetID, PacketID: '38' }),
    )
  })

  it('ignores a late detail response after switching datasets', async () => {
    const second = { ...database, Id: '2', DatasetID: 'dataset-b', SourcePath: '/captures/dns.cap' }
    api.queryDatabases.mockResolvedValue(databasePage([database, second]))
    let resolveDetail: (value: PCAPPacketDetail) => void = () => {}
    api.getPacketDetail.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveDetail = resolve
        }),
    )
    render(<PCAPPacketViewer />)
    await screen.findByText('HTTP response 10')
    fireEvent.click(screen.getByText('HTTP response 10'))
    fireEvent.click(screen.getByText('dns.cap').closest('button')!)
    await waitFor(() =>
      expect(api.queryPackets).toHaveBeenLastCalledWith(
        expect.objectContaining({ DatasetID: 'dataset-b', Pagination: { Limit: 100, AfterId: '0' } }),
      ),
    )
    await act(async () => resolveDetail(detail('999')))
    expect(screen.queryByTestId('packet-details')).not.toBeInTheDocument()
  })

  it('registers import listeners before starting, waits for Finished and cleans up subscriptions', async () => {
    render(<PCAPPacketViewer />)
    await screen.findByText('HTTP response 10')
    fireEvent.click(screen.getByRole('button', { name: '导入 PCAP' }))
    fireEvent.change(screen.getByLabelText('引擎上的文件路径'), { target: { value: '/captures/new.pcap' } })
    api.importFile.mockImplementation(async (_params, token) => {
      expect(listeners.has(`${token}-data`)).toBe(true)
    })
    fireEvent.click(screen.getByRole('button', { name: '开始导入' }))
    await waitFor(() => expect(api.importFile).toHaveBeenCalled())
    const token = api.importFile.mock.calls[0][1]
    act(() =>
      listeners.get(`${token}-data`)?.({
        State: 'analyzing',
        PacketCount: '43',
        BytesIndexed: '24000',
        TotalBytes: '24000',
        Finished: false,
      }),
    )
    expect(screen.getAllByRole('status').some((element) => element.textContent?.includes('分析中'))).toBe(true)
    act(() =>
      listeners.get(`${token}-data`)?.({
        State: 'ready',
        PacketCount: '43',
        Finished: true,
        DatasetID: database.DatasetID,
      }),
    )
    await waitFor(() => expect(listeners.size).toBe(0))
    expect(cancel).not.toHaveBeenCalled()
  })

  it('starts live capture, displays progress and cancels the PcapX stream', async () => {
    render(<PCAPPacketViewer />)
    await screen.findByText('HTTP response 10')
    fireEvent.click(screen.getByRole('button', { name: '实时抓包' }))
    await waitFor(() => expect(api.getPcapMetadata).toHaveBeenCalledOnce())
    fireEvent.change(screen.getByLabelText('BPF 过滤表达式'), { target: { value: 'tcp port 80' } })
    api.startLiveCapture.mockImplementation(async (_params, token) => {
      expect(listeners.has(`${token}-data`)).toBe(true)
    })
    fireEvent.click(screen.getByRole('button', { name: '开始抓包' }))
    await waitFor(() => expect(api.startLiveCapture).toHaveBeenCalled())
    expect(api.startLiveCapture).toHaveBeenCalledWith(
      expect.objectContaining({
        NetInterfaceList: ['eth0'],
        BPF: 'tcp port 80',
        Snaplen: 65535,
        Promisc: false,
      }),
      expect.any(String),
    )
    const token = api.startLiveCapture.mock.calls[0][1]
    const liveDatasetID = 'live-dataset-2026'
    const liveDatabase: PCAPDatabase = {
      ...database,
      Id: '18',
      DatasetID: liveDatasetID,
      SourcePath: '',
      SourceSize: '24000',
      Format: 'pcap',
      State: 'ready',
      PacketCount: '42',
      SourceKind: 'live',
      CaptureInterface: 'eth0',
      CaptureBPF: 'tcp port 80',
      ProtocolCount: '8',
      SessionCount: '3',
      StreamCount: '5',
      StreamChunkCount: '7',
      StreamsIndexed: true,
    }
    api.queryDatabases.mockResolvedValue(databasePage([liveDatabase], '1'))
    act(() =>
      listeners.get(`${token}-data`)?.({
        Database: {
          ...liveDatabase,
        },
        PacketFrameCounter: '42',
        NetInterfaceTransferKBPerSeconds: '16',
        TCPReassembledCount: '7',
        TrafficSessionCount: '3',
        Finished: false,
        Error: '',
      }),
    )
    const liveRow = (await screen.findByText('eth0 · tcp port 80')).closest('button')!
    expect(within(liveRow).getByText('抓包中')).toBeInTheDocument()
    expect(within(liveRow).getByText('16 KB/s')).toBeInTheDocument()
    fireEvent.mouseEnter(liveRow.parentElement!)
    const liveDetails = await screen.findByLabelText('eth0 · tcp port 80 详细信息')
    expect(within(liveDetails).getByText('tcp port 80')).toBeInTheDocument()
    expect(within(liveDetails).getByText('16 KB/s')).toBeInTheDocument()
    expect(screen.queryByText(/42 帧/)).not.toBeInTheDocument()
    await waitFor(() =>
      expect(api.queryPackets).toHaveBeenLastCalledWith({
        DatasetID: liveDatasetID,
        Filter: {},
        Pagination: { Limit: 100, AfterId: '0' },
      }),
    )
    await screen.findByText('HTTP response 10')
    const liveItem = liveRow
    expect(liveItem).toHaveAttribute('aria-pressed', 'true')
    expect(liveItem).toHaveTextContent('42包')
    act(() =>
      listeners.get(`${token}-data`)?.({
        Database: {
          ...liveDatabase,
          SourceSize: '99999',
          PacketCount: '999',
          CaptureInterface: 'stream0',
          CaptureBPF: 'udp port 53',
          ProtocolCount: '99',
        },
        PacketFrameCounter: '999',
        NetInterfaceTransferKBPerSeconds: '32',
        TCPReassembledCount: '70',
        TrafficSessionCount: '30',
        Finished: false,
        Error: '',
      }),
    )
    expect(within(liveItem).getByText('32 KB/s')).toBeInTheDocument()
    expect(within(liveDetails).getByText('32 KB/s')).toBeInTheDocument()
    expect(liveItem).toHaveTextContent('eth0 · tcp port 80')
    expect(screen.queryByText('stream0 · udp port 53')).not.toBeInTheDocument()
    expect(liveItem).toHaveTextContent('42包')
    expect(liveItem).not.toHaveTextContent('999包')
    expect(screen.getByTestId('packet-follow-output')).toHaveTextContent('auto')
    await waitFor(() => expect(scrollToIndex).toHaveBeenCalledWith({ index: 0, align: 'end' }))
    api.queryPackets.mockResolvedValue(page('43', true))
    await waitFor(
      () =>
        expect(api.queryPackets).toHaveBeenCalledWith({
          DatasetID: liveDatasetID,
          Filter: {},
          Pagination: { Limit: 100, AfterId: '10' },
        }),
      { timeout: 2500 },
    )
    await waitFor(() => expect(screen.getByText('HTTP response 43')).toBeInTheDocument(), { timeout: 2500 })
    await waitFor(() => expect(scrollToIndex).toHaveBeenLastCalledWith({ index: 1, align: 'end' }))
    fireEvent.click(await screen.findByRole('button', { name: '触发加载更多' }))
    await waitFor(() =>
      expect(api.queryPackets).toHaveBeenLastCalledWith({
        DatasetID: liveDatasetID,
        Filter: {},
        Pagination: { Limit: 100, AfterId: '43' },
      }),
    )
    api.queryPackets.mockResolvedValue(page('44'))
    await waitFor(() => expect(screen.getByText('HTTP response 44')).toBeInTheDocument(), { timeout: 2500 })
    fireEvent.click(screen.getByRole('button', { name: '停止实时抓包' }))
    await waitFor(() => expect(cancel).toHaveBeenCalledWith('PcapX', token))
    await waitFor(() => expect(screen.queryByRole('button', { name: '停止抓包' })).not.toBeInTheDocument())
    expect(screen.queryByTestId('packet-follow-output')).not.toBeInTheDocument()
    expect(liveItem).toHaveAttribute('aria-pressed', 'true')
    expect(within(liveItem).queryByText('抓包中')).not.toBeInTheDocument()
    expect(cancel).toHaveBeenCalledTimes(1)
  }, 12000)

  it('does not silently treat an unsupported engine as an empty library', async () => {
    api.queryDatabases.mockRejectedValue(new Error('UNIMPLEMENTED'))
    render(<PCAPPacketViewer />)
    await screen.findByText(/无法加载 PCAP 数据集/)
    expect(api.queryPackets).not.toHaveBeenCalled()
  })

  it('exports only to the explicit engine-side target path', async () => {
    api.exportData.mockResolvedValue({ Path: '/exports/http.cap', Bytes: '24000', SHA256: 'sha' })
    render(<PCAPPacketViewer />)
    await screen.findByText('HTTP response 10')
    fireEvent.click(screen.getByRole('button', { name: /导出/ }))
    fireEvent.change(screen.getByLabelText('引擎上的目标文件路径'), { target: { value: '/exports/http.cap' } })
    fireEvent.click(screen.getByRole('button', { name: '导出' }))
    await waitFor(() =>
      expect(api.exportData).toHaveBeenCalledWith({
        DatasetID: database.DatasetID,
        TargetPath: '/exports/http.cap',
        PacketID: '0',
      }),
    )
  })

  it('requires confirmation before deleting a dataset and refreshes the library', async () => {
    api.deleteDatabase.mockResolvedValue({ Deleted: true, CleanupPending: false })
    render(<PCAPPacketViewer />)
    await screen.findByText('HTTP response 10')
    fireEvent.click(screen.getByRole('button', { name: '删除 http.cap' }))
    expect(api.deleteDatabase).not.toHaveBeenCalled()
    api.queryDatabases.mockResolvedValue(databasePage([]))
    fireEvent.click(screen.getByRole('button', { name: '删除数据集' }))
    await waitFor(() => expect(api.deleteDatabase).toHaveBeenCalledWith({ DatasetID: database.DatasetID }))
    await screen.findByText('每个数据包，都有迹可循')
  })

  it('cancels in-progress import and removes its listeners when the page closes', async () => {
    const view = render(<PCAPPacketViewer />)
    await screen.findByText('HTTP response 10')
    fireEvent.click(screen.getByRole('button', { name: '导入 PCAP' }))
    fireEvent.change(screen.getByLabelText('引擎上的文件路径'), { target: { value: '/captures/cancel.pcap' } })
    fireEvent.click(screen.getByRole('button', { name: '开始导入' }))
    await waitFor(() => expect(api.importFile).toHaveBeenCalled())
    const token = api.importFile.mock.calls[0][1]
    view.unmount()
    expect(cancel).toHaveBeenCalledWith('ImportPCAPFile', token)
    expect(listeners.size).toBe(0)
  })
})
