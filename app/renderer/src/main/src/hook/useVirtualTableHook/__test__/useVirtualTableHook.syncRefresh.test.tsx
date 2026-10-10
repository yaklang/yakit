import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import useVirtualTableHook from '../useVirtualTableHook'
import type { ParamsTProps } from '../useVirtualTableHookType'

vi.mock('@/utils/duplex/duplex', () => ({
  serverPushStatus: false,
  subscribeServerPushStatus: vi.fn(() => () => {}),
}))
vi.mock('@/utils/notification', () => ({ yakitNotify: vi.fn() }))

interface TestRow {
  Id: number
  Status: string
}

const defaultParams: ParamsTProps = {
  Filter: {
    Keyword: 'keep-this-filter',
    SourceType: 'mitm',
  },
  Pagination: {
    Page: 3,
    Limit: 20,
    Order: 'desc',
    OrderBy: 'updated_at',
  },
}

describe('useVirtualTableHook sync refresh', () => {
  it.each([true, false])('refreshes existing rows while preserving filters (hidden: %s)', async (hidden) => {
    const grpcFun = vi
      .fn()
      .mockResolvedValueOnce({
        Data: [{ Id: 7, Status: 'old' }],
        Pagination: defaultParams.Pagination,
        Total: 1,
      })
      .mockResolvedValueOnce({
        Data: [{ Id: 7, Status: 'updated' }],
        Pagination: defaultParams.Pagination,
        Total: 1,
      })
    const tableBoxRef = { current: null }
    const tableRef = { current: { containerRef: { scrollTop: 0, clientHeight: 84, scrollHeight: 84 } } }
    const boxHeightRef = { current: 84 }

    const { result, rerender } = renderHook(
      ({ active }) =>
        useVirtualTableHook<ParamsTProps, TestRow, 'Data', 'Id'>({
          tableBoxRef,
          tableRef,
          boxHeightRef,
          grpcFun,
          defaultParams,
          inViewport: active,
        }),
      { initialProps: { active: true } },
    )

    await waitFor(() => {
      expect(result.current[1]).toEqual([{ Id: 7, Status: 'old' }])
    })

    if (hidden) rerender({ active: false })
    act(() => {
      const currentParams = result.current[0]
      result.current[6].setP({ Filter: { ...currentParams.Filter } } as ParamsTProps)
    })

    if (hidden) {
      expect(grpcFun).toHaveBeenCalledTimes(1)
      rerender({ active: true })
    }

    await waitFor(() => {
      expect(result.current[1]).toEqual([{ Id: 7, Status: 'updated' }])
    })
    expect(grpcFun).toHaveBeenCalledTimes(2)
    expect(grpcFun.mock.calls[1][0]).toEqual(
      expect.objectContaining({
        Filter: defaultParams.Filter,
        Pagination: expect.objectContaining({
          Order: 'desc',
          OrderBy: 'updated_at',
        }),
      }),
    )
  })
})
