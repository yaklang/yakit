import { describe, expect, it } from 'vitest'
import { withServerRuntimeContextLimit } from '../grpcApi'

describe('official runtime context byte boundary', () => {
  it.each([307200, '307200', ' 307200 ', Number.MAX_SAFE_INTEGER])(
    'preserves a safe positive byte threshold %s without converting it again',
    (value) => {
      expect(withServerRuntimeContextLimit({ RuntimeContextSizeLimit: value }).RuntimeContextSizeLimit).toBe(
        Number(value),
      )
    },
  )

  it.each([undefined, 0, -1, 0.5, NaN, Infinity, '', 'bad', '307200bytes', '9223372036854775807'])(
    'uses the engine default for missing or invalid byte threshold %s',
    (value) => {
      expect(withServerRuntimeContextLimit({ RuntimeContextSizeLimit: value }).RuntimeContextSizeLimit).toBe(0)
    },
  )

  it('drops the legacy threshold while preserving the selected Forge, resources and caller data', () => {
    const params = Object.freeze({
      RuntimeContextSizeLimit: '307200',
      TimelineContentSizeLimit: 61440,
      ForgeName: 'selected-digital-employee',
      EnabledCapabilities: [{ Name: 'audit-tool', Type: 'tool' }],
      Strategy: { EnableGoalMode: true },
    })
    const result = withServerRuntimeContextLimit(params)
    expect(result).toEqual({
      RuntimeContextSizeLimit: 307200,
      ForgeName: params.ForgeName,
      EnabledCapabilities: params.EnabledCapabilities,
      Strategy: params.Strategy,
    })
    expect(params.TimelineContentSizeLimit).toBe(61440)
    expect(params.RuntimeContextSizeLimit).toBe('307200')
    expect(withServerRuntimeContextLimit({ TimelineContentSizeLimit: 61440 })).toEqual({ RuntimeContextSizeLimit: 0 })
  })
})
