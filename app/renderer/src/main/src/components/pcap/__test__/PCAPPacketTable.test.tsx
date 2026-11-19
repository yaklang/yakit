import { cleanup, render, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PCAPPacketSummary } from '../pcapTypes'
import { PCAPPacketTable } from '../PCAPPacketTable'

const packets: PCAPPacketSummary[] = Array.from({ length: 5000 }, (_, index) => ({
  Id: String(index + 1),
  TimestampNS: '1700000000123456789',
  CapturedLength: '128',
  OriginalLength: '128',
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
  Info: `HTTP response ${index + 1}`,
  DecodeError: '',
}))

beforeEach(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      private callback: ResizeObserverCallback

      constructor(callback: ResizeObserverCallback) {
        this.callback = callback
      }

      observe(target: Element) {
        this.callback([{ target } as ResizeObserverEntry], this as unknown as ResizeObserver)
      }

      unobserve() {}
      disconnect() {}
    },
  )
  vi.spyOn(HTMLElement.prototype, 'offsetParent', 'get').mockReturnValue(document.body)
  vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(function (this: HTMLElement) {
    return this.tagName === 'TR' ? 29 : 480
  })
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(480)
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(1000)
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    right: 1000,
    bottom: 480,
    width: 1000,
    height: 480,
    toJSON: () => ({}),
  })
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('virtualized PCAP packet table', () => {
  it('keeps the rendered row count bounded for a long packet list', async () => {
    const { container } = render(
      <PCAPPacketTable
        packets={packets}
        hasFilters={false}
        selectedID=""
        loading={false}
        loadingMore={false}
        hasMore={false}
        error=""
        onSelect={vi.fn()}
        onLoadMore={vi.fn()}
        onRetry={vi.fn()}
      />,
    )

    await waitFor(() => expect(container.querySelectorAll('tbody tr').length).toBeGreaterThan(0))
    expect(container.querySelectorAll('tbody tr').length).toBeLessThan(100)
  })
})
