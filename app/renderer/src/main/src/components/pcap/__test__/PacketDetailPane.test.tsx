import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PCAPPacketDetail } from '../pcapTypes'

const { copySelection, saveSelection } = vi.hoisted(() => ({
  copySelection: vi.fn(),
  saveSelection: vi.fn(),
}))
vi.mock('../pcapByteActions', () => ({ copySelection, saveSelection }))
vi.mock('@/services/electronBridge', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  yakitClipboard: { setText: vi.fn() },
  yakitTraffic: { readBytes: vi.fn() },
}))

import { PacketDetailPane } from '../PacketDetailPane'

const expandTreeNode = (name: string) => {
  const node = screen.getAllByRole('treeitem').find((item) => within(item).queryByText(name, { exact: true }))
  const switcher = node?.querySelector('.ant-tree-switcher')
  if (!switcher) throw new Error(`Tree node ${name} is not expandable`)
  fireEvent.click(switcher)
}

const response = new TextEncoder().encode('HTTP/1.1 200 OK\r\nContent-Length: 0\r\n\r\n')
const detail: PCAPPacketDetail = {
  Packet: {
    Id: '6',
    TimestampNS: '1700000000123456789',
    CapturedLength: '60',
    OriginalLength: '60',
    LinkType: '1',
    Section: '0',
    Interface: '0',
    SourceMAC: '',
    DestinationMAC: '',
    VLANStack: '',
    SourceIP: '10.0.0.2',
    DestinationIP: '10.0.0.1',
    SourcePort: 80,
    DestinationPort: 12345,
    Transport: 'tcp',
    Protocol: 'HTTP',
    ApplicationProtocols: ['HTTP'],
    Info: 'HTTP/1.1 200 OK',
    DecodeError: '',
  },
  Nodes: [
    {
      Name: 'Frame 6',
      DisplayValue: '60 bytes',
      Children: [{ Name: 'Frame length', DisplayValue: '60 bytes', Children: [], Ranges: [] }],
      Ranges: [],
    },
  ],
  Messages: [
    {
      MessageId: '51',
      Protocol: 'HTTP',
      Summary: 'HTTP/1.1 200 OK',
      Status: 'complete',
      Completeness: 'message',
      SourceID: 'message:51',
      Nodes: [
        {
          Name: 'HTTP',
          Children: [
            {
              Name: 'Status Code',
              DisplayValue: '200',
              Children: [],
              Ranges: [{ SourceID: 'message:51', BitOffset: '72', BitLength: '24' }],
            },
          ],
          Ranges: [],
        },
      ],
      DecodeError: '',
      NodesTruncated: false,
    },
  ],
  RelatedMessages: [],
  ByteSources: [
    {
      ID: 'frame:6',
      Kind: 'frame',
      Name: 'Frame #6',
      Length: '60',
      Completeness: 'frame',
      ContributorPacketIds: [],
      CompletedInPacketId: '0',
      InitialData: new Uint8Array(60),
      InitialOffset: '0',
      InitialTruncated: false,
    },
    {
      ID: 'message:51',
      Kind: 'message',
      Name: 'HTTP reassembled message #51',
      Length: String(response.length),
      Completeness: 'message',
      ContributorPacketIds: ['5', '6'],
      CompletedInPacketId: '6',
      InitialData: response,
      InitialOffset: '0',
      InitialTruncated: false,
    },
  ],
}

beforeEach(() => {
  vi.clearAllMocks()
  copySelection.mockResolvedValue(3)
  saveSelection.mockResolvedValue('/tmp/status-code.bin')
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  )
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('typed PCAP detail pane', () => {
  it('switches between the physical frame and the message completed here', async () => {
    render(<PacketDetailPane datasetID="dataset" detail={detail} onJump={vi.fn()} onClose={vi.fn()} />)
    expect(screen.getByRole('tab', { name: '物理帧' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: '重组流' })).toBeInTheDocument()
    expect(screen.queryByText('Frame length')).not.toBeInTheDocument()
    expandTreeNode('Frame 6')
    expect(screen.getByText('Frame length')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('tab', { name: '重组流' }))
    expect(screen.getByRole('tab', { name: '重组流' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.queryByText('Status Code')).not.toBeInTheDocument()
    expandTreeNode('HTTP')
    fireEvent.click(screen.getByText('Status Code'))
    expect(screen.getByText(/已选中 Status Code · 9–11/)).toBeInTheDocument()
    fireEvent.contextMenu(screen.getByText('Status Code'))
    expect(await screen.findByText('保存原始字节 (.bin)')).toBeInTheDocument()
    expect(screen.getByText('复制 Base64')).toBeInTheDocument()
    await act(async () => {
      fireEvent.click(screen.getByText('复制 HEX'))
      await Promise.resolve()
    })
    await vi.waitFor(() =>
      expect(copySelection).toHaveBeenCalledWith(
        'dataset',
        expect.objectContaining({
          sourceID: 'message:51',
          ranges: [[9, 12]],
          label: 'Status Code',
        }),
        'hex',
      ),
    )
    expect(screen.getByRole('button', { name: '#5' })).toBeInTheDocument()
    expect(screen.queryByText('事务级')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('tab', { name: '物理帧' }))
    expect(screen.getByRole('tab', { name: '物理帧' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.queryByText('Frame length')).not.toBeInTheDocument()
    expandTreeNode('Frame 6')
    expect(screen.getByText('Frame length')).toBeInTheDocument()
  })

  it('keeps the physical frame when its byte source is omitted', () => {
    const withoutFrameSource: PCAPPacketDetail = {
      ...detail,
      ByteSources: detail.ByteSources.filter((source) => source.Kind !== 'frame'),
    }
    render(<PacketDetailPane datasetID="dataset" detail={withoutFrameSource} onJump={vi.fn()} onClose={vi.fn()} />)
    expect(screen.getByRole('tab', { name: '物理帧' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.queryByText('Frame length')).not.toBeInTheDocument()
    expandTreeNode('Frame 6')
    expect(screen.getByText('Frame length')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('tab', { name: '重组流' }))
    expandTreeNode('HTTP')
    expect(screen.getByText('Status Code')).toBeInTheDocument()
  })

  it('collapses a long contributor list into a jumpable popover', async () => {
    const onJump = vi.fn()
    const contributorIDs = Array.from({ length: 12 }, (_, index) => String(index + 1))
    const longMessage: PCAPPacketDetail = {
      ...detail,
      ByteSources: detail.ByteSources.map((source) =>
        source.ID === 'message:51' ? { ...source, ContributorPacketIds: contributorIDs } : source,
      ),
    }
    render(<PacketDetailPane datasetID="dataset" detail={longMessage} onJump={onJump} onClose={vi.fn()} />)
    fireEvent.click(screen.getByRole('tab', { name: '重组流' }))

    const more = screen.getByRole('button', { name: '查看全部 12 个重组贡献帧' })
    expect(more).toHaveTextContent('+9')
    fireEvent.click(more)
    fireEvent.click(await screen.findByRole('button', { name: '跳转到物理帧 #12' }))
    expect(onJump).toHaveBeenCalledWith('12')
  })

  it('keeps the physical frame available for a single-frame protocol message', () => {
    const dnsDetail: PCAPPacketDetail = {
      ...detail,
      Packet: { ...detail.Packet, Transport: 'udp', Protocol: 'DNS' },
      Nodes: [{ Name: 'Frame 6', DisplayValue: '60 bytes', Children: [], Ranges: [] }],
      Messages: [
        {
          ...detail.Messages[0],
          MessageId: '52',
          Protocol: 'DNS',
          Summary: 'DNS response',
          SourceID: 'message:52',
          Nodes: [{ Name: 'DNS Query', DisplayValue: 'example.test', Children: [], Ranges: [] }],
        },
      ],
      ByteSources: [
        detail.ByteSources[0],
        {
          ...detail.ByteSources[1],
          ID: 'message:52',
          Name: 'DNS message #52',
          ContributorPacketIds: ['6'],
        },
      ],
    }
    render(<PacketDetailPane datasetID="dataset" detail={dnsDetail} onJump={vi.fn()} onClose={vi.fn()} />)
    expect(screen.getByRole('tab', { name: '物理帧' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText('Frame 6')).toBeInTheDocument()
    expect(screen.queryByText(/DNS Query/)).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('tab', { name: '重组流' }))
    expect(screen.getByText(/DNS Query/)).toBeInTheDocument()
    expect(screen.queryByText('DNS重组')).not.toBeInTheDocument()
  })
})
