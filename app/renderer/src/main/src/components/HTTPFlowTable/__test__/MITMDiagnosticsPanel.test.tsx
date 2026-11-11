import React from 'react'
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

  it('names the actual waiting phase and keeps ordinary traffic and write pressure visible', () => {
    const dial = {
      Stage: 'dial',
      Count: 22,
      OldestAgeMs: 28_000,
      BrowserBackgroundCount: 22,
      OldestBrowserBackgroundAgeMs: 28_000,
      OldestOtherAgeMs: 0,
    }
    const raw = { ...sample, Version: 3, PersistActive: 0, Diagnostics: { HTTPStages: [dial] } }
    expect(resolvePipelineHealth(view(raw))).toMatchObject({
      tone: 'info',
      trafficScope: 'browser',
      detail: 'Chrome 自动填充有 22 条请求正在连接目标服务器或下游代理，最长 28 秒。',
    })
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

  it('requests storage only when selected and jumps from an observed peak to that trace time range', async () => {
    const { invoke } = installIPC((query) => ({
      SessionId: query.SessionId,
      GeneratedAtUnixMs: now,
      ...(query.View === 'storage'
        ? {
            Storage: [
              { AtUnixMs: now - 2000, PersistPending: 3 },
              { AtUnixMs: now, PersistPending: 1 },
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
    render(<MITMDiagnosticsPanel view={view()} onClose={vi.fn()} />)
    expect(invoke).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: '查看入库压力' }))
    expect(await screen.findByText('37 项')).toBeVisible()
    fireEvent.click(await screen.findByRole('button', { name: '查看该时段请求' }))
    await waitFor(() =>
      expect(invoke).toHaveBeenCalledWith(
        'mitmV2-get-diagnostics',
        expect.objectContaining({
          SessionId: 'mitm-1',
          View: 'range',
          FromUnixMs: now - 7000,
          ToUnixMs: now + 3000,
        }),
      ),
    )
    expect(await screen.findByText('等待共享队列空位')).toBeVisible()
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
    render(<MITMDiagnosticsPanel view={view()} onClose={vi.fn()} />)
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
        }),
      ),
    )
  })

  it('refreshes completed trace details when the flow is saved later', async () => {
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
  })

  it('clears an open panel on stop and leaves old engine summaries usable', async () => {
    const { invoke, on } = installIPC()
    render(<MITMPipelineStatus />)
    const handler = on.mock.calls.find(([event]) => event === 'client-mitmV2-pipeline-stats')?.[1]
    expect(handler).toBeTypeOf('function')
    act(() => handler(undefined, { ...sample, Diagnostics: null }))
    fireEvent.click(screen.getByRole('button', { name: /MITM 实时处理状态，每秒/ }))
    fireEvent.click(await screen.findByRole('button', { name: '打开流量诊断' }))
    expect(screen.getByRole('tab', { name: '入库压力' })).toHaveAttribute('aria-disabled', 'true')
    expect(invoke).not.toHaveBeenCalled()
    act(() => handler(undefined, null))
    expect(screen.queryByRole('region', { name: 'MITM 流量诊断' })).not.toBeInTheDocument()
  })
})
