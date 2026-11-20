import { describe, expect, it } from 'vitest'
import { fromServerAIStartParams, omitLegacyAIContextLimits, toServerAIStartParams } from '../grpcApi'

describe('会话启动参数', () => {
  it.each([0, 300, undefined])('启动和恢复时剥离两个旧阈值 %s，保留其他设置', (limit) => {
    const input = Object.freeze({ RuntimeContextSizeLimit: limit, TimelineContentSizeLimit: 60, AICallTokenLimit: 40 })
    const wire = toServerAIStartParams(omitLegacyAIContextLimits(input))
    expect(wire).toEqual({ AICallTokenLimit: 40960 })
    expect(fromServerAIStartParams({ ...input, AICallTokenLimit: 40960 })).toEqual({ AICallTokenLimit: 40 })
    expect(input.RuntimeContextSizeLimit).toBe(limit)
  })

  it('不补充缺省字段', () => {
    expect(toServerAIStartParams({})).toEqual({})
    expect(fromServerAIStartParams({})).toEqual({})
  })

  it.each([0, 600000, 600001])('热补丁原样传递 %s 个 token 并保留显式 false', (tokens) => {
    expect(
      toServerAIStartParams({
        ModelContextKey: 'owner:model',
        RuntimeContextSizeLimit: tokens,
        DisableContextAutoAdjust: false,
        AICallTokenLimit: 40,
      }),
    ).toEqual({
      ModelContextKey: 'owner:model',
      RuntimeContextSizeLimit: tokens,
      DisableContextAutoAdjust: false,
      AICallTokenLimit: 40960,
    })
  })
})
