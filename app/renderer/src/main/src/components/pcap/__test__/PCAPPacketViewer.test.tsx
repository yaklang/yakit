import React from 'react'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PacketPage, PCAPDatabase, PCAPPacketDetail, PCAPPacketSummary } from '../pcapTypes'

const { api, listeners, cancel, browse } = vi.hoisted(() => ({
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
    { data, fixedHeaderContent, itemContent, endReached, components }: any,
    ref,
  ) {
    React.useImperativeHandle(ref, () => ({
      scrollTo: vi.fn(),
      scrollBy: vi.fn(),
      scrollToIndex: vi.fn(),
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
  ProtocolsIndexed: true,
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
const page = (id: string, hasMore = false): PacketPage => ({
  Data: [packet(id)],
  Total: id === '10' ? '43' : '',
  NextCursor: id,
  HasMore: hasMore,
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
  api.queryDatabases.mockResolvedValue({ Data: [database], Total: '1', HasMore: false, NextCursor: '1' })
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
})

describe('PCAP packet workspace', () => {
  it('uses the new query contract and appends cursor results while scrolling', async () => {
    render(<PCAPPacketViewer />)
    await screen.findByText('HTTP response 10')
    expect(api.queryPackets).toHaveBeenCalledWith({
      DatasetID: database.DatasetID,
      Filter: {},
      Pagination: { Limit: 100, AfterId: '0' },
    })
    fireEvent.click(screen.getByRole('button', { name: '触发加载更多' }))
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
    api.queryDatabases.mockResolvedValue({ Data: [database, second], HasMore: false })
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
    act(() =>
      listeners.get(`${token}-data`)?.({
        DatasetID: database.DatasetID,
        State: 'ready',
        PacketFrameCounter: '42',
        ProtocolCount: '8',
        BytesIndexed: '24000',
        TotalBytes: '24000',
        NetInterfaceTransferKBPerSeconds: '16',
        Finished: false,
      }),
    )
    await screen.findByText(/42 帧/)
    fireEvent.click(screen.getByRole('button', { name: '停止抓包' }))
    await waitFor(() => expect(cancel).toHaveBeenCalledWith('PcapX', token))
  })

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
    api.queryDatabases.mockResolvedValue({ Data: [], HasMore: false })
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
