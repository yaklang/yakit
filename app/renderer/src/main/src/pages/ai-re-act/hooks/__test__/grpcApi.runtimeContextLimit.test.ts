import { describe, expect, it } from 'vitest'
import { withServerRuntimeContextLimit } from '../grpcApi'

describe('withServerRuntimeContextLimit', () => {
  it.each([307200, Number.MAX_SAFE_INTEGER, '307200', String(Number.MAX_SAFE_INTEGER)])(
    '将合法正数字节阈值 %s 规范化为 number，不重复换算单位',
    (limit) => {
      expect(withServerRuntimeContextLimit({ RuntimeContextSizeLimit: limit }).RuntimeContextSizeLimit).toBe(
        Number(limit),
      )
    },
  )

  it.each([
    undefined,
    0,
    -1,
    1.5,
    NaN,
    Infinity,
    -Infinity,
    Number.MAX_SAFE_INTEGER + 1,
    '',
    '   ',
    '0',
    '-1',
    '1.5',
    'NaN',
    'Infinity',
    '307200bytes',
    '9007199254740992',
    '9007199254740993',
    '9223372036854775807',
    '9223372036854775808',
  ])('缺省、非正数或非法阈值 %s 使用服务端默认值', (limit) => {
    expect(withServerRuntimeContextLimit({ RuntimeContextSizeLimit: limit }).RuntimeContextSizeLimit).toBe(0)
  })

  it('去掉字符串周围空白后保留字节值', () => {
    expect(withServerRuntimeContextLimit({ RuntimeContextSizeLimit: ' 307200 ' }).RuntimeContextSizeLimit).toBe(307200)
  })

  it.each([
    { limit: '0x100', expected: 256 },
    { limit: '1e3', expected: 1000 },
  ])('使用 Number 将 $limit 转换为 $expected', ({ limit, expected }) => {
    expect(withServerRuntimeContextLimit({ RuntimeContextSizeLimit: limit }).RuntimeContextSizeLimit).toBe(expected)
  })

  it('删除旧字段，保留其他参数且不修改入参', () => {
    const params = Object.freeze({
      TimelineContentSizeLimit: 61440,
      RuntimeContextSizeLimit: '307200',
      UserQuery: '保持原来的任务',
      Strategy: { EnableGoalMode: true },
    })
    const result = withServerRuntimeContextLimit(params)
    expect(result).toEqual({
      RuntimeContextSizeLimit: 307200,
      UserQuery: params.UserQuery,
      Strategy: params.Strategy,
    })
    expect(result).not.toHaveProperty('TimelineContentSizeLimit')
    expect(params.TimelineContentSizeLimit).toBe(61440)
    expect(params.RuntimeContextSizeLimit).toBe('307200')
  })

  it('仅有旧字段时不迁移旧阈值，交给服务端默认值', () => {
    expect(withServerRuntimeContextLimit({ TimelineContentSizeLimit: 61440 })).toEqual({ RuntimeContextSizeLimit: 0 })
    expect(withServerRuntimeContextLimit({})).toEqual({ RuntimeContextSizeLimit: 0 })
  })
})
