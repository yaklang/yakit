import { describe, expect, it } from 'vitest'
import { AIToDoListStatusEnum } from '@/pages/ai-agent/defaultConstant'
import type { AIAgentGrpcApi } from '@/pages/ai-re-act/hooks/grpcApi'
import { buildSegments, isValidUnixSec } from '../ganttUtils'

const BASE_TS = 1750000000
const NOW = BASE_TS + 3600

const createItem = (item: Partial<AIAgentGrpcApi.TodoListUpdateItem>): AIAgentGrpcApi.TodoListUpdateItem => ({
  id: 'todo-1',
  content: '待办内容',
  status: AIToDoListStatusEnum.Pending,
  created_at: 1,
  updated_at: 1,
  created_ts: BASE_TS,
  ...item,
})

describe('isValidUnixSec', () => {
  it('仅接受大于 1e9 的有限秒级时间戳', () => {
    expect(isValidUnixSec(BASE_TS)).toBe(true)
    expect(isValidUnixSec(0)).toBe(false)
    expect(isValidUnixSec(1)).toBe(false)
    // created_at/updated_at 这类占位序号不应被当作时间戳
    expect(isValidUnixSec(123)).toBe(false)
    expect(isValidUnixSec(Number.NaN)).toBe(false)
    expect(isValidUnixSec(Number.POSITIVE_INFINITY)).toBe(false)
    expect(isValidUnixSec(undefined)).toBe(false)
  })
})

describe('buildSegments 状态分段', () => {
  it('PENDING：仅一条 wait 条带，终点为 now', () => {
    const segments = buildSegments(createItem({ status: AIToDoListStatusEnum.Pending }), NOW)
    expect(segments).toEqual([{ kind: 'wait', startTs: BASE_TS, endTs: NOW }])
  })

  it('DOING：有 focus_started_ts 时拆为 wait + execute，条带延伸到 now', () => {
    const focus = BASE_TS + 300
    const segments = buildSegments(createItem({ status: AIToDoListStatusEnum.Doing, focus_started_ts: focus }), NOW)
    expect(segments).toEqual([
      { kind: 'wait', startTs: BASE_TS, endTs: focus },
      { kind: 'execute', startTs: focus, endTs: NOW },
    ])
  })

  it('DOING：无 focus_started_ts 时仅一条 wait 条带', () => {
    const segments = buildSegments(createItem({ status: AIToDoListStatusEnum.Doing }), NOW)
    expect(segments).toEqual([{ kind: 'wait', startTs: BASE_TS, endTs: NOW }])
  })

  it('DONE：拆为 wait + execute + success，且成功尾部约占执行段的 25%', () => {
    const focus = BASE_TS + 300
    const closed = BASE_TS + 1300
    const segments = buildSegments(
      createItem({ status: AIToDoListStatusEnum.Done, focus_started_ts: focus, closed_ts: closed }),
      NOW,
    )
    // 执行段 300 → 1300，成功收尾 = 1300 - 1000*0.25 = 1050
    expect(segments).toEqual([
      { kind: 'wait', startTs: BASE_TS, endTs: focus },
      { kind: 'execute', startTs: focus, endTs: BASE_TS + 1050 },
      { kind: 'success', startTs: BASE_TS + 1050, endTs: closed },
    ])
  })

  it('DONE：focus_started_ts 不晚于 created_ts 时成功条带从 focus 处开始', () => {
    const focus = BASE_TS
    const closed = BASE_TS + 600
    const segments = buildSegments(
      createItem({ status: AIToDoListStatusEnum.Done, focus_started_ts: focus, closed_ts: closed }),
      NOW,
    )
    expect(segments).toEqual([{ kind: 'success', startTs: BASE_TS, endTs: closed }])
  })

  it('DONE：无任何时间戳时条带收成点，不延伸到 now', () => {
    const item = createItem({ status: AIToDoListStatusEnum.Done, closed_ts: undefined })
    // 仅保留 created_ts，其余时间戳全空
    const bare = { ...item, created_ts: BASE_TS } as AIAgentGrpcApi.TodoListUpdateItem
    const segments = buildSegments(bare, NOW)
    // 终态无 closed/时长字段：终点收成 created，拆为 wait 点 + success 点
    expect(segments).toEqual([
      { kind: 'wait', startTs: BASE_TS, endTs: BASE_TS },
      { kind: 'success', startTs: BASE_TS, endTs: BASE_TS },
    ])
  })

  it('SKIPPED：有 focus 时拆为 wait + skipped', () => {
    const focus = BASE_TS + 200
    const closed = BASE_TS + 800
    const segments = buildSegments(
      createItem({ status: AIToDoListStatusEnum.Skipped, focus_started_ts: focus, closed_ts: closed }),
      NOW,
    )
    expect(segments).toEqual([
      { kind: 'wait', startTs: BASE_TS, endTs: focus },
      { kind: 'skipped', startTs: focus, endTs: closed },
    ])
  })

  it('SKIPPED：无 focus 时按 35% 位置拆分 wait + skipped', () => {
    const closed = BASE_TS + 1000
    const segments = buildSegments(createItem({ status: AIToDoListStatusEnum.Skipped, closed_ts: closed }), NOW)
    // 35% 位置：BASE_TS + 350
    expect(segments).toEqual([
      { kind: 'wait', startTs: BASE_TS, endTs: BASE_TS + 350 },
      { kind: 'skipped', startTs: BASE_TS + 350, endTs: closed },
    ])
  })

  it('DELETED：拆分逻辑与 SKIPPED 相同，但末段为 failed', () => {
    const focus = BASE_TS + 200
    const closed = BASE_TS + 800
    const segments = buildSegments(
      createItem({ status: AIToDoListStatusEnum.Deleted, focus_started_ts: focus, closed_ts: closed }),
      NOW,
    )
    expect(segments).toEqual([
      { kind: 'wait', startTs: BASE_TS, endTs: focus },
      { kind: 'failed', startTs: focus, endTs: closed },
    ])
  })
})

describe('buildSegments 时间戳回退', () => {
  it('进行中（DOING）有 closed_ts 时优先用 closed 而非 now', () => {
    const focus = BASE_TS + 100
    const closed = BASE_TS + 500
    const segments = buildSegments(
      createItem({ status: AIToDoListStatusEnum.Doing, focus_started_ts: focus, closed_ts: closed }),
      NOW,
    )
    expect(segments[1]).toEqual({ kind: 'execute', startTs: focus, endTs: closed })
  })

  it('终态无 closed_ts 时优先用 focus_seconds 推算终点', () => {
    const focus = BASE_TS + 100
    const segments = buildSegments(
      createItem({
        status: AIToDoListStatusEnum.Done,
        focus_started_ts: focus,
        focus_seconds: 400,
        survival_seconds: 9999,
        age_seconds: 8888,
      }),
      NOW,
    )
    // 终点 = focus + 400 = BASE_TS + 500，而非 survival/age 推算的更晚时间
    const success = segments.find((seg) => seg.kind === 'success')
    expect(success?.endTs).toBe(BASE_TS + 500)
  })

  it('终态无 focus_seconds 时回退 survival_seconds 推算终点', () => {
    const segments = buildSegments(
      createItem({ status: AIToDoListStatusEnum.Done, survival_seconds: 600, age_seconds: 8888 }),
      NOW,
    )
    // 终点 = created + 600；无 focus，直接 wait + success 点
    const success = segments.find((seg) => seg.kind === 'success')
    expect(success?.endTs).toBe(BASE_TS + 600)
  })

  it('终态无 survival_seconds 时回退 age_seconds 推算终点', () => {
    const segments = buildSegments(createItem({ status: AIToDoListStatusEnum.Done, age_seconds: 700 }), NOW)
    const success = segments.find((seg) => seg.kind === 'success')
    expect(success?.endTs).toBe(BASE_TS + 700)
  })

  it('终态仅有 focus_started_ts 时终点收成 focus，不拖到 now', () => {
    const focus = BASE_TS + 100
    const segments = buildSegments(createItem({ status: AIToDoListStatusEnum.Skipped, focus_started_ts: focus }), NOW)
    expect(segments).toEqual([
      { kind: 'wait', startTs: BASE_TS, endTs: focus },
      { kind: 'skipped', startTs: focus, endTs: focus },
    ])
  })

  it('时长字段为负数时视为无效，不参与推算', () => {
    const segments = buildSegments(
      createItem({ status: AIToDoListStatusEnum.Done, focus_seconds: -1, survival_seconds: -2, age_seconds: -3 }),
      NOW,
    )
    const success = segments.find((seg) => seg.kind === 'success')
    // 全部无效时终点收成 created
    expect(success?.endTs).toBe(BASE_TS)
  })

  it('无有效 created_ts 时返回空条带', () => {
    const segments = buildSegments(createItem({ created_ts: undefined, created_at: 12345 }), NOW)
    expect(segments).toEqual([])
  })

  it('未知状态回退为一条 wait 条带', () => {
    const segments = buildSegments(
      createItem({ status: 'UNKNOWN' as AIAgentGrpcApi.TodoListUpdateItem['status'] }),
      NOW,
    )
    expect(segments).toEqual([{ kind: 'wait', startTs: BASE_TS, endTs: NOW }])
  })
})
