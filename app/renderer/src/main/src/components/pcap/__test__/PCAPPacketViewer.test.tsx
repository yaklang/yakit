import React from 'react'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PacketPage, PCAPDatabase, PCAPPacket } from '../pcapTypes'

const { api, listeners, cancel, browse } = vi.hoisted(() => ({
  api: {
    queryPackets: vi.fn(),
    queryDatabases: vi.fn(),
    importFile: vi.fn(),
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
vi.mock('../PacketDetailPane', () => ({
  PacketDetailPane: ({ packet, onJump }) => (
    <div data-testid="packet-details">
      详情 #{packet.Id}
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
const packet = (id: string): PCAPPacket => ({
  Id: id,
  TimestampNS: '1700000000123456789',
  CapturedLength: '478',
  OriginalLength: '478',
  LinkType: '1',
  Section: '0',
  Interface: '0',
  LinkLayerType: 'Ethernet',
  NetworkLayerType: 'IPv4',
  TransportLayerType: 'TCP',
  NetworkEndpointIPSrc: '10.0.0.1',
  NetworkEndpointIPDst: '10.0.0.2',
  TransportEndpointPortSrc: '80',
  TransportEndpointPortDst: '12345',
  EthernetEndpointHardwareAddrSrc: '',
  EthernetEndpointHardwareAddrDst: '',
  Protocol: 'HTTP',
  Info: `HTTP response ${id}`,
  DecodeError: '',
  Raw: [],
  Details: '',
})
const page = (id: string, hasMore = false): PacketPage => ({
  Data: [packet(id)],
  Total: '43',
  NextCursor: id,
  HasMore: hasMore,
  Truncated: false,
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
  api.queryPackets.mockImplementation(async (query) =>
    page(query.Id || (query.FromId === '10' ? '20' : '10'), !query.Id && query.FromId === '0'),
  )
  api.importFile.mockResolvedValue(undefined)
  cancel.mockResolvedValue(undefined)
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('PCAP packet workspace', () => {
  it('queries original frames through the old API, filters before paging and uses exact cursors', async () => {
    render(<PCAPPacketViewer />)
    await screen.findByText('HTTP response 10')
    expect(api.queryPackets).toHaveBeenCalledWith(
      expect.objectContaining({ DatasetID: database.DatasetID, Full: false, FromId: '0' }),
    )
    fireEvent.click(screen.getByRole('button', { name: '下一页' }))
    await screen.findByText('HTTP response 20')
    expect(api.queryPackets).toHaveBeenLastCalledWith(
      expect.objectContaining({ FromId: '10', Pagination: { Page: 1, Limit: 100 } }),
    )
    fireEvent.change(screen.getByRole('textbox', { name: '源 IP' }), { target: { value: '10.0.0.1' } })
    fireEvent.change(screen.getByRole('textbox', { name: '源端口' }), { target: { value: '0' } })
    fireEvent.click(screen.getByRole('button', { name: '查询' }))
    await waitFor(() =>
      expect(api.queryPackets).toHaveBeenLastCalledWith(
        expect.objectContaining({ FromId: '0', SrcIP: '10.0.0.1', SrcPort: '0' }),
      ),
    )
    fireEvent.click(screen.getByText('HTTP response 10'))
    await screen.findByTestId('packet-details')
    expect(api.queryPackets).toHaveBeenLastCalledWith({ DatasetID: database.DatasetID, Id: '10', Full: true })
    fireEvent.click(screen.getByRole('button', { name: '跳转完成包' }))
    await waitFor(() => expect(screen.getByTestId('packet-details')).toHaveTextContent('详情 #38'))
  })

  it('ignores a late detail response after switching datasets', async () => {
    const second = { ...database, Id: '2', DatasetID: 'dataset-b', SourcePath: '/captures/dns.cap' }
    api.queryDatabases.mockResolvedValue({ Data: [database, second], HasMore: false })
    let resolveDetail: (value: PacketPage) => void = () => {}
    api.queryPackets.mockImplementation((query) =>
      query.Full
        ? new Promise((resolve) => {
            resolveDetail = resolve
          })
        : Promise.resolve(page('10')),
    )
    render(<PCAPPacketViewer />)
    await screen.findByText('HTTP response 10')
    fireEvent.click(screen.getByText('HTTP response 10'))
    fireEvent.click(screen.getByRole('button', { name: /dns.cap/ }))
    await waitFor(() =>
      expect(api.queryPackets).toHaveBeenLastCalledWith(
        expect.objectContaining({ DatasetID: 'dataset-b', Full: false }),
      ),
    )
    await act(async () => resolveDetail(page('999')))
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
    expect(screen.getByRole('status')).toHaveTextContent('分析中')
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
    fireEvent.click(screen.getByRole('button', { name: '删除当前数据集' }))
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
