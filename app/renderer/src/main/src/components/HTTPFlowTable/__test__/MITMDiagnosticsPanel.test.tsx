import type React from 'react'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { MITMDiagnosticsQuery, MITMTraceRow } from '../MITMDiagnostics.types'
import { resolvePipelineHealth, type MITMPipelineViewState } from '../MITMDiagnostics.utils'
import {
  deriveMITMPipelineRates,
  normalizeMITMPipelineStats,
  type RawMITMPipelineStats,
} from '../MITMPipelineStatus.utils'
import { MITMDiagnosticsPanel } from '../MITMDiagnosticsPanel'
import { MITMPipelineStatus } from '../MITMPipelineStatus'

vi.mock('../../yakitUI/YakitDrawer/YakitDrawer', () => ({
  YakitDrawer: ({ children, title }: { children: React.ReactNode; title: string }) => (
    <section aria-label={title}>{children}</section>
  ),
}))

vi.mock('../MITMDiagnosticsTrend', () => ({
  default: ({ kind }: { kind: string }) => <div role="img" aria-label={kind} />,
}))

vi.mock('../../HTTPFlowDetail', () => ({
  HTTPFlowDetail: ({ id, pageType }: { id: number; pageType?: string }) => (
    <div>
      {pageType} #{id}
    </div>
  ),
}))

const now = Date.now()
const sample: RawMITMPipelineStats = {
  SessionId: 'mitm-1',
  GeneratedAtUnixMs: now,
  PersistActive: '3',
  OldestPersistAgeMs: '1800',
  DatabaseWriteQueueDepth: '40960',
  DatabaseWriteQueueCapacity: '40960',
  Diagnostics: {
    PersistBlocked: '2',
    OldestPersistBlockedAgeMs: '1400',
    PersistWriteSamples: '3',
    PersistWriteP95Ms: '16',
    DatabaseWriteTakenUnfinished: '37',
    WebSocketOnline: '1',
  },
}
const view = (raw: RawMITMPipelineStats = sample): MITMPipelineViewState => {
  const stats = normalizeMITMPipelineStats(raw)
  return { stats, rates: deriveMITMPipelineRates(undefined, stats), frontend: { visibleBacklog: 0, pendingQueries: 0 } }
}

const row: MITMTraceRow = {
  TraceId: '2',
  Host: 'example.invalid',
  Method: 'GET',
  Protocol: 'WebSocket',
  ConnectionId: 'downstream-1',
  Stage: 'websocket_online',
  Outcome: '',
  ErrorCode: '',
  StatusCode: 101,
  StartedAtUnixMs: now - 12000,
  StageAtUnixMs: now - 11000,
  FinishedAtUnixMs: '0',
  FlowId: '0',
  Attempts: 1,
  Spans: [],
  SpansTruncated: false,
}

const installIPC = (handler = (_query: MITMDiagnosticsQuery) => ({})) => {
  const invoke = vi.fn(async (_channel: string, query: MITMDiagnosticsQuery) => handler(query))
  const on = vi.fn()
  const removeListener = vi.fn()
  vi.stubGlobal('require', () => ({ ipcRenderer: { invoke, on, removeListener } }))
  return { invoke, on, removeListener }
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('MITM diagnostics', () => {
  it('separates active session pressure from the shared writer and long-lived streams', () => {
    expect(resolvePipelineHealth(view()).label).toBe('入库提交受阻')
    const ready = view({
      ...sample,
      PersistActive: 0,
      UpstreamActive: 1,
      OldestUpstreamAgeMs: 20_000,
      Diagnostics: { HTTPStages: [{ Stage: 'streaming', Count: 1, OldestAgeMs: 20_000 }] },
    })
    expect(resolvePipelineHealth(ready).label).toBe('处理正常')
    const old = view({ ...sample, Diagnostics: null, OldestUpstreamAgeMs: 4000 })
    expect(resolvePipelineHealth(old).label).toBe('上游处理中')
  })

  it('keeps background waits out of alerts and names ordinary waits and write pressure', () => {
    const dial = {
      Stage: 'dial',
      Count: 22,
      OldestAgeMs: 28_000,
      BrowserBackgroundCount: 22,
      OldestBrowserBackgroundAgeMs: 28_000,
      OldestOtherAgeMs: 0,
    }
    const raw = { ...sample, Version: 3, PersistActive: 0, Diagnostics: { HTTPStages: [dial] } }
    expect(resolvePipelineHealth(view(raw)).tone).toBe('healthy')
    const mixed = { ...raw, Diagnostics: { HTTPStages: [{ ...dial, Count: 23, OldestOtherAgeMs: 3100 }] } }
    expect(resolvePipelineHealth(view(mixed))).toMatchObject({
      tone: 'warning',
      label: '建立上游连接',
      detail: '1 条请求正在连接目标服务器或下游代理，最长 3.1 秒。',
    })
    expect(resolvePipelineHealth(view({ ...raw, Diagnostics: { ...raw.Diagnostics, PersistBlocked: 1 } })).focus).toBe(
      'storage',
    )
  })

  it('loads live history and switches between ordinary traffic and Chrome background traces', async () => {
    const ordinary = { ...row, Protocol: 'HTTP/1.1', Stage: 'first_byte', StatusCode: 0 }
    const autofill = {
      ...ordinary,
      TraceId: '3',
      Host: 'content-autofill.googleapis.com',
      BrowserService: 'chrome_autofill',
    }
    const { invoke } = installIPC((query) => ({
      SessionId: query.SessionId,
      GeneratedAtUnixMs: now,
      ...(query.View === 'storage'
        ? {
            Storage: [
              { AtUnixMs: now - 1000, RequestTotal: 1 },
              { AtUnixMs: now, RequestTotal: 3 },
            ],
          }
        : query.View === 'detail'
          ? { Detail: query.TraceId === '3' ? autofill : ordinary }
          : {
              Traces: query.TrafficScope === 'browser' ? [autofill] : [ordinary],
              Total: query.TrafficScope === 'browser' ? 22 : 1,
              BrowserBackgroundTotal: 22,
            }),
    }))
    render(<MITMDiagnosticsPanel view={view({ ...sample, Version: 3 })} onClose={vi.fn()} />)
    expect(await screen.findByRole('img', { name: 'traffic' })).toBeVisible()
    fireEvent.click(screen.getByRole('tab', { name: '请求轨迹' }))
    expect(await screen.findByRole('heading', { name: 'GET example.invalid' })).toBeVisible()
    expect(invoke).toHaveBeenCalledWith('mitmV2-get-diagnostics', expect.objectContaining({ TrafficScope: 'focus' }))
    fireEvent.click(screen.getByRole('radio', { name: '浏览器后台 · 22' }))
    const detail = await screen.findByRole('article', { name: '请求阶段明细' })
    expect(await within(detail).findByText('Chrome 自动填充')).toBeVisible()
    expect(within(detail).getByRole('heading', { name: 'GET content-autofill.googleapis.com' })).toBeVisible()
    expect(invoke).toHaveBeenCalledWith('mitmV2-get-diagnostics', expect.objectContaining({ TrafficScope: 'browser' }))
    expect(invoke.mock.calls.filter(([, query]) => query.View === 'storage')).toHaveLength(1)
  })

  it.each([false, true])('ends the trace query on a mismatched session (after first sample: %s)', async (hasSample) => {
    vi.useFakeTimers()
    try {
      let replySession = hasSample ? sample.SessionId : 'other-session'
      const { invoke } = installIPC((query) =>
        query.View === 'detail'
          ? { SessionId: query.SessionId, Detail: row }
          : { SessionId: replySession, Traces: [row], Total: 1 },
      )
      render(<MITMDiagnosticsPanel view={view()} onClose={vi.fn()} />)
      await act(async () => {
        fireEvent.click(screen.getByRole('tab', { name: '请求轨迹' }))
      })
      if (hasSample) {
        expect(screen.getByRole('heading', { name: 'GET example.invalid' })).toBeVisible()
        replySession = 'other-session'
        await act(async () => {
          await vi.advanceTimersByTimeAsync(3_000)
        })
      }
      expect(screen.getByRole('status')).toHaveTextContent('暂时无法读取轨迹')
      expect(screen.queryByText('正在读取轨迹…')).not.toBeInTheDocument()
      expect(screen.queryByText(/example\.invalid/)).not.toBeInTheDocument()
      invoke.mockClear()
      await act(async () => {
        await vi.advanceTimersByTimeAsync(9_000)
      })
      expect(invoke).not.toHaveBeenCalled()
    } finally {
      vi.useRealTimers()
    }
  })

  it('backs off failed trace polls up to 30 seconds and resumes the normal interval on success', async () => {
    vi.useFakeTimers()
    try {
      let failing = true
      const { invoke } = installIPC((query) => {
        if (failing) throw new Error('DEADLINE_EXCEEDED')
        return { SessionId: query.SessionId, Traces: [] }
      })
      const advance = (ms: number) =>
        act(async () => {
          await vi.advanceTimersByTimeAsync(ms)
        })
      const { unmount } = render(<MITMDiagnosticsPanel view={view()} onClose={vi.fn()} />)
      await act(async () => {
        fireEvent.click(screen.getByRole('tab', { name: '请求轨迹' }))
      })
      expect(screen.getByRole('status')).toHaveTextContent('暂时无法读取轨迹')

      for (const delay of [6_000, 12_000, 24_000, 30_000, 30_000]) {
        const calls = invoke.mock.calls.length
        await advance(delay - 1)
        expect(invoke).toHaveBeenCalledTimes(calls)
        await advance(1)
        expect(invoke).toHaveBeenCalledTimes(calls + 1)
      }

      failing = false
      await advance(30_000)
      expect(screen.queryByText('暂时无法读取轨迹')).not.toBeInTheDocument()
      invoke.mockClear()
      await advance(2_999)
      expect(invoke).not.toHaveBeenCalled()
      await advance(1)
      expect(invoke).toHaveBeenCalledOnce()

      unmount()
      await advance(30_000)
      expect(invoke).toHaveBeenCalledOnce()
    } finally {
      vi.useRealTimers()
    }
  })

  it('keeps excluded waits in the summary and only loads their paged samples on demand', async () => {
    vi.useFakeTimers()
    try {
      const ordinary = {
        ...row,
        Protocol: 'HTTP/1.1',
        Stage: 'pool_wait',
        StatusCode: 0,
        FilterDecision: 'pending',
      }
      const excluded = { ...ordinary, TraceId: '3', Host: 'excluded.invalid', FilterDecision: 'request_excluded' }
      const { invoke } = installIPC((query) => ({
        SessionId: query.SessionId,
        GeneratedAtUnixMs: now,
        ...(query.View === 'storage'
          ? { Storage: [] }
          : query.View === 'detail'
            ? { Detail: query.TraceId === excluded.TraceId ? excluded : ordinary }
            : query.TrafficScope === 'all'
              ? { Traces: [excluded, ordinary], Total: 101 }
              : { Traces: [ordinary], Total: 1 }),
      }))
      const raw = {
        ...sample,
        Version: 4,
        PersistActive: 0,
        Diagnostics: {
          HTTPStages: [
            {
              Stage: 'pool_wait',
              Count: 101,
              OldestAgeMs: 28_000,
              FilteredCount: 100,
              InScopeOtherCount: 1,
              OldestInScopeOtherAgeMs: 3_100,
            },
            { Stage: 'dial', Count: 51, OldestAgeMs: 40_000, FilteredCount: 51 },
          ],
        },
      }
      expect(resolvePipelineHealth(view(raw))).toMatchObject({
        label: '等待连接池空位',
        detail: '1 条请求正在等待上游连接池释放空位，最长 3.1 秒。',
      })
      render(<MITMDiagnosticsPanel view={view(raw)} onClose={vi.fn()} />)
      const phases = within(screen.getByRole('table', { name: 'HTTP 在途阶段' }))
      expect(phases.getByText('101')).toBeVisible()
      expect(phases.getByText('51')).toBeVisible()
      await act(async () => {
        fireEvent.click(phases.getByRole('button', { name: '等待连接池空位' }))
      })
      expect(screen.getByText('跟随 MITM 过滤器')).toBeVisible()
      expect(screen.getByRole('heading', { name: 'GET example.invalid' })).toBeVisible()
      expect(screen.queryByText('excluded.invalid')).not.toBeInTheDocument()
      expect(invoke).toHaveBeenCalledWith(
        'mitmV2-get-diagnostics',
        expect.objectContaining({
          View: 'active',
          Stage: 'pool_wait',
          TrafficScope: 'capture',
          Limit: 24,
          Offset: 0,
        }),
      )

      await act(async () => {
        fireEvent.click(screen.getByRole('checkbox', { name: '包含已过滤请求' }))
      })
      expect(screen.getByRole('heading', { name: 'GET excluded.invalid' })).toBeVisible()
      expect(screen.getByText('命中 MITM 请求过滤规则。')).toBeVisible()
      expect(invoke).toHaveBeenCalledWith(
        'mitmV2-get-diagnostics',
        expect.objectContaining({
          View: 'active',
          Stage: 'pool_wait',
          TrafficScope: 'all',
          Limit: 24,
          Offset: 0,
        }),
      )
      invoke.mockClear()
      await act(async () => {
        await vi.advanceTimersByTimeAsync(6_000)
      })
      expect(invoke).not.toHaveBeenCalled()
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: '刷新样本' }))
      })
      expect(invoke).toHaveBeenCalledTimes(1)
      await act(async () => {
        fireEvent.click(screen.getByRole('checkbox', { name: '包含已过滤请求' }))
      })
      expect(screen.queryByText('excluded.invalid')).not.toBeInTheDocument()
      invoke.mockClear()
      await act(async () => {
        await vi.advanceTimersByTimeAsync(3_000)
      })
      expect(invoke).toHaveBeenCalledWith(
        'mitmV2-get-diagnostics',
        expect.objectContaining({
          View: 'active',
          TrafficScope: 'capture',
        }),
      )
    } finally {
      vi.useRealTimers()
    }
  })

  it('jumps from an observed write peak to that trace time range with capture scope', async () => {
    const { invoke } = installIPC((query) => ({
      SessionId: query.SessionId,
      GeneratedAtUnixMs: now,
      ...(query.View === 'storage'
        ? {
            Storage: [
              { AtUnixMs: now - 2000, PersistPending: 3 },
              { AtUnixMs: now, PersistPending: 1 },
              { AtUnixMs: 0, PersistPending: 40 },
              { PersistPending: 50 },
            ],
          }
        : query.View === 'range'
          ? {
              Traces: [
                { ...row, Protocol: 'HTTP/1.1', Stage: 'persist_write', Outcome: 'completed', FinishedAtUnixMs: now },
              ],
              Total: 1,
            }
          : {
              Detail: {
                ...row,
                Protocol: 'HTTP/1.1',
                Spans: [
                  {
                    Stage: 'persist_blocked',
                    StartedAtUnixMs: now - 2000,
                    FinishedAtUnixMs: now,
                    Attempt: 0,
                    Protocol: '',
                  },
                ],
              },
            }),
    }))
    render(<MITMDiagnosticsPanel view={view({ ...sample, Version: 4 })} onClose={vi.fn()} />)
    expect(invoke.mock.calls.map(([, query]) => query.View)).toEqual(['storage'])
    fireEvent.click(screen.getByRole('button', { name: '查看入库压力' }))
    expect(await screen.findByText('37 项')).toBeVisible()
    fireEvent.click(await screen.findByRole('button', { name: '查看该时段请求' }))
    await waitFor(() =>
      expect(invoke).toHaveBeenCalledWith(
        'mitmV2-get-diagnostics',
        expect.objectContaining({
          SessionId: 'mitm-1',
          View: 'range',
          TrafficScope: 'capture',
          FromUnixMs: now - 7000,
          ToUnixMs: now + 3000,
        }),
      ),
    )
    expect(await screen.findByText('等待共享队列空位')).toBeVisible()
  })

  it('hides the peak jump when no pending write sample has a valid time range', async () => {
    installIPC((query) => ({
      SessionId: query.SessionId,
      Storage: [{ AtUnixMs: 5_000, PersistPending: 4 }],
    }))
    render(<MITMDiagnosticsPanel view={view({ ...sample, Version: 4 })} onClose={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: '查看入库压力' }))
    expect(await screen.findByRole('img', { name: 'pending' })).toBeVisible()
    expect(screen.queryByRole('button', { name: '查看该时段请求' })).not.toBeInTheDocument()
  })

  it('opens each request phase in the trace using its engine stage', async () => {
    const stages = [
      ['manual_request', '等待手动处理请求'],
      ['manual_response', '等待手动处理响应'],
      ['upstream', '准备上游请求'],
      ['send', '发送上游请求'],
      ['local_response', '本地响应'],
      ['response_processing', '处理响应'],
    ]
    const { invoke } = installIPC((query) => ({ SessionId: query.SessionId, Traces: [] }))
    const raw = {
      ...sample,
      Version: 4,
      Diagnostics: {
        HTTPStages: stages.map(([Stage]) => ({ Stage, Count: 1, OldestAgeMs: 1000 })),
      },
    }
    render(<MITMDiagnosticsPanel view={view(raw)} onClose={vi.fn()} />)
    for (const [stage, label] of stages) {
      const phases = within(screen.getByRole('table', { name: 'HTTP 在途阶段' }))
      await act(async () => {
        fireEvent.click(phases.getByRole('button', { name: label }))
      })
      expect(screen.getByText(`在途阶段 · ${label}`)).toBeVisible()
      expect(invoke).toHaveBeenCalledWith(
        'mitmV2-get-diagnostics',
        expect.objectContaining({ View: 'active', Stage: stage, TrafficScope: 'capture' }),
      )
      fireEvent.click(screen.getByRole('tab', { name: '实时状态' }))
    }
  })

  it('shows online WebSockets and filters by the actual downstream connection', async () => {
    const { invoke } = installIPC((query) => ({
      SessionId: query.SessionId,
      GeneratedAtUnixMs: now,
      Traces: [row],
      Total: 1,
      Detail: {
        ...row,
        Spans: [
          {
            Stage: 'websocket_online',
            StartedAtUnixMs: row.StageAtUnixMs,
            FinishedAtUnixMs: '0',
            Attempt: 0,
            Protocol: '',
          },
        ],
      },
    }))
    render(<MITMDiagnosticsPanel view={view({ ...sample, Version: 4 })} onClose={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: '查看连接' }))
    const detail = await screen.findByRole('article', { name: '请求阶段明细' })
    expect((await within(detail).findAllByText('连接在线'))[0]).toBeVisible()
    fireEvent.click(within(detail).getByRole('button', { name: '查看同一客户端连接' }))
    await waitFor(() =>
      expect(invoke).toHaveBeenCalledWith(
        'mitmV2-get-diagnostics',
        expect.objectContaining({
          View: 'websocket',
          ConnectionId: 'downstream-1',
          TrafficScope: 'capture',
        }),
      ),
    )
  })

  it('opens MITM flow details when a completed trace is saved later', async () => {
    vi.useFakeTimers()
    try {
      let flowId = '0'
      installIPC((query) => {
        const completed = {
          ...row,
          Protocol: 'HTTP/1.1',
          Stage: 'response_processing',
          Outcome: 'completed',
          FinishedAtUnixMs: now,
          FlowId: flowId,
        }
        return {
          SessionId: query.SessionId,
          GeneratedAtUnixMs: now,
          ...(query.View === 'slow'
            ? { Traces: [completed], Total: 1 }
            : query.View === 'detail'
              ? { Detail: completed }
              : { Traces: [], Total: 0 }),
        }
      })
      render(<MITMDiagnosticsPanel view={view()} onClose={vi.fn()} />)
      fireEvent.click(screen.getByRole('tab', { name: '请求轨迹' }))
      await act(async () => {
        fireEvent.click(screen.getByRole('radio', { name: '近期慢请求' }))
      })
      expect(screen.getByRole('heading', { name: 'GET example.invalid' })).toBeVisible()
      expect(screen.queryByRole('button', { name: '查看流量 #42' })).not.toBeInTheDocument()
      flowId = '42'
      await act(async () => {
        await vi.advanceTimersByTimeAsync(3000)
      })
      expect(screen.getByRole('button', { name: '查看流量 #42' })).toBeVisible()
    } finally {
      vi.useRealTimers()
    }
    fireEvent.click(screen.getByRole('button', { name: '查看流量 #42' }))
    const drawer = screen.getByRole('region', { name: '流量 #42' })
    expect(await within(drawer).findByText('MITM #42')).toBeVisible()
  })

  it('clears an open panel on stop and leaves old engine summaries usable', async () => {
    const { invoke, on } = installIPC()
    render(<MITMPipelineStatus />)
    const handler = on.mock.calls.find(([event]) => event === 'client-mitmV2-pipeline-stats')?.[1]
    expect(handler).toBeTypeOf('function')
    act(() => handler(undefined, { ...sample, ActiveTotal: '7', Diagnostics: null }))
    const trigger = screen.getByRole('button', { name: /MITM 实时处理状态，每秒.*在途 7 条请求，本会话待写 3 项/ })
    expect(within(trigger).getByText('在途 7')).toBeVisible()
    fireEvent.click(trigger)
    const openDiagnostics = await screen.findByRole('button', { name: '打开流量诊断' })
    expect(screen.getByText(/^本会话待写 3 项 ·/)).toBeInTheDocument()
    fireEvent.click(openDiagnostics)
    expect(screen.getByRole('tab', { name: '入库压力' })).toHaveAttribute('aria-disabled', 'true')
    expect(invoke).not.toHaveBeenCalled()
    act(() => handler(undefined, null))
    expect(screen.queryByRole('region', { name: 'MITM 流量诊断' })).not.toBeInTheDocument()
  })
})
