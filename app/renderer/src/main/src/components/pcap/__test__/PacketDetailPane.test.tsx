import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PCAPPacketDetail } from '../pcapTypes'

vi.mock('@/services/electronBridge', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  yakitClipboard: { setText: vi.fn() },
  yakitTraffic: { readBytes: vi.fn() },
}))

import { PacketDetailPane } from '../PacketDetailPane'

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
  Nodes: [{ Name: 'Frame 6', DisplayValue: '60 bytes', Children: [], Ranges: [] }],
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
  it('switches to a reassembled message and selects its field range', () => {
    render(<PacketDetailPane datasetID="dataset" detail={detail} onJump={vi.fn()} onClose={vi.fn()} />)
    fireEvent.click(screen.getByRole('tab', { name: 'HTTP重组' }))
    fireEvent.click(screen.getByText('Status Code: 200'))
    expect(screen.getByText(/已选中 9–11/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '#5' })).toBeInTheDocument()
    expect(screen.queryByText('事务级')).not.toBeInTheDocument()
  })

  it('shows a single-frame protocol directly without a reassembly switch', () => {
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
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
    expect(screen.getByText(/DNS Query/)).toBeInTheDocument()
    expect(screen.queryByText('DNS重组')).not.toBeInTheDocument()
  })
})
