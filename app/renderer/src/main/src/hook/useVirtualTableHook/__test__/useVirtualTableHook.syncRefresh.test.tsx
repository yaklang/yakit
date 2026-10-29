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

describe('useVirtualTableHook bottom dedup', () => {
  // 触底几何：可视底部已越过 shouldLoadVirtualTableBottom 的 0.9 阈值
  const bottomGeometry = { scrollTop: 80, clientHeight: 84, scrollHeight: 100 }

  // 单飞守卫在响应提交 100ms 后才释放，需先等它松开再触发底部加载
  const waitForRelease = async () => {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 150))
    })
  }

  it.each([
    {
      name: '触底追加过滤与当前窗口重复的行',
      secondPage: [
        { Id: 7, Status: 'old' },
        { Id: 8, Status: 'new' },
      ],
      expected: [
        { Id: 7, Status: 'old' },
        { Id: 8, Status: 'new' },
      ],
      total: 2,
    },
    {
      name: '触底整页重复时窗口保持不变',
      secondPage: [{ Id: 7, Status: 'old' }],
      expected: [{ Id: 7, Status: 'old' }],
      total: 1,
    },
  ])('$name', async ({ secondPage, expected, total }) => {
    const grpcFun = vi
      .fn()
      .mockResolvedValueOnce({
        Data: [{ Id: 7, Status: 'old' }],
        Pagination: defaultParams.Pagination,
        Total: 1,
      })
      .mockResolvedValueOnce({ Data: secondPage, Pagination: defaultParams.Pagination, Total: total })
      // 兜底空页：偶发的轮询定时器抢先触发时不污染调用计数
      .mockResolvedValue({ Data: [], Pagination: defaultParams.Pagination, Total: total })

    const tableBoxRef = { current: null }
    const tableRef = { current: { containerRef: { ...bottomGeometry } } }
    const boxHeightRef = { current: 84 }

    const { result } = renderHook(() =>
      useVirtualTableHook<ParamsTProps, TestRow, 'Data', 'Id'>({
        tableBoxRef,
        tableRef,
        boxHeightRef,
        grpcFun,
        defaultParams,
        inViewport: true,
      }),
    )

    await waitFor(() => {
      expect(result.current[1]).toEqual([{ Id: 7, Status: 'old' }])
    })
    await waitForRelease()

    // 触发并在 act 内等待响应提交：整页重复场景 expected 与旧窗口相同，
    // 提交前断言会因 waitFor 首次同步检查通过而漏掉追加重复行的回归
    await act(async () => {
      result.current[6].notifyPushUpdate()
    })

    // 第二次调用恒为本次触底加载；不锁总次数，1s 后启动的兼容轮询定时器可能再插入调用
    expect(grpcFun.mock.calls[1]?.[0]).toEqual(
      expect.objectContaining({
        Filter: defaultParams.Filter,
        Pagination: expect.objectContaining({ Order: 'desc', BeforeId: 7 }),
      }),
    )
    // 响应已提交，此处断言提交后的窗口：整页重复不得把重复行追加进窗口
    expect(result.current[1]).toEqual(expected)
  })

  it('触底去重用字符串键比较：不同大整数字符串 Id 不被误判为重复', async () => {
    // gRPC longs:String 下 uint64 Id 运行时以字符串到达（类型契约仍是 number），按数字键去重时
    // 9007199254740993(2^53+1) 与 9007199254740992(2^53) 转 Number 后相同，新行会被误删
    const oldRow = { Id: '9007199254740992' as unknown as number, Status: 'old' }
    const newRow = { Id: '9007199254740993' as unknown as number, Status: 'new' }
    const grpcFun = vi
      .fn()
      .mockResolvedValueOnce({
        Data: [oldRow],
        Pagination: defaultParams.Pagination,
        Total: 2,
      })
      .mockResolvedValueOnce({
        Data: [newRow],
        Pagination: defaultParams.Pagination,
        Total: 2,
      })
      // 兜底空页：偶发的轮询定时器抢先触发时不污染调用计数
      .mockResolvedValue({ Data: [], Pagination: defaultParams.Pagination, Total: 2 })

    const tableBoxRef = { current: null }
    const tableRef = { current: { containerRef: { ...bottomGeometry } } }
    const boxHeightRef = { current: 84 }

    const { result } = renderHook(() =>
      useVirtualTableHook<ParamsTProps, TestRow, 'Data', 'Id'>({
        tableBoxRef,
        tableRef,
        boxHeightRef,
        grpcFun,
        defaultParams,
        inViewport: true,
      }),
    )

    await waitFor(() => {
      expect(result.current[1]).toEqual([oldRow])
    })
    await waitForRelease()

    await act(async () => {
      result.current[6].notifyPushUpdate()
    })

    expect(result.current[1]).toEqual([oldRow, newRow])
  })
})
