import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PCAPByteSource } from '../pcapTypes'

const { readBytes } = vi.hoisted(() => ({ readBytes: vi.fn() }))
vi.mock('@/services/electronBridge', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  yakitTraffic: { readBytes },
}))

import { PacketByteViewer } from '../PacketByteViewer'

const source: PCAPByteSource = {
  ID: 'message:51',
  Kind: 'message',
  Name: 'HTTP message #51',
  Length: '20',
  Completeness: 'message',
  ContributorPacketIds: ['1'],
  CompletedInPacketId: '1',
  InitialData: new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]),
  InitialOffset: '0',
  InitialTruncated: true,
}

beforeEach(() => {
  readBytes.mockImplementation(async ({ Offset, Length }) => {
    const offset = Number(Offset)
    const length = Number(Length)
    return {
      Data: new Uint8Array(Array.from({ length }, (_, index) => offset + index)),
      Offset,
      TotalLength: '20',
      EOF: offset + length >= 20,
    }
  })
})
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('bounded PCAP byte viewer', () => {
  it('loads a source window when a selected field is outside the initial prefix', async () => {
    render(
      <PacketByteViewer
        datasetID="dataset"
        source={source}
        selection={{ sourceID: source.ID, ranges: [[15, 17]], label: 'Payload' }}
      />,
    )
    await waitFor(() =>
      expect(readBytes).toHaveBeenCalledWith({
        DatasetID: 'dataset',
        SourceID: 'message:51',
        Offset: '0',
        Length: '20',
      }),
    )
    expect(screen.getByText(/已选中 Payload · 15–16/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '加载后续' })).not.toBeInTheDocument()
  })
})
