import { describe, expect, it, vi } from 'vitest'
import type * as ToolModule from '@/utils/tool'

// tool.ts 在 JSON.parse 失败时会调用 debugToPrintLogs 输出日志，
// 该函数依赖全局 yakitLogs，在 jsdom 环境可能报错，这里 mock 掉避免噪音。
vi.mock('@/utils/tool', async (importOriginal) => {
  const actual = await importOriginal<typeof ToolModule>()
  return {
    ...actual,
    debugToPrintLogs: vi.fn(),
  }
})

import { extractExecResultProgress, type ExecResultProgressInfo } from '../yakitLogSchema'
import type { ExecResult } from '../../pages/invoker/schema'

// 构造 ExecResult，Message 为 Uint8Array（JSON 字符串的字节）
const buildExecResult = (message: string | null, isMessage = true): ExecResult => ({
  Hash: '',
  OutputJson: '',
  Raw: new Uint8Array(),
  IsMessage: isMessage,
  Message: message == null ? new Uint8Array() : new TextEncoder().encode(message),
  Progress: 0,
})

describe('extractExecResultProgress', () => {
  it('IsMessage 为 false 时返回 undefined', () => {
    const data = buildExecResult('{"type":"progress","content":{"progress":0.5}}', false)
    expect(extractExecResultProgress(data)).toBeUndefined()
  })

  it('Message 为空 Uint8Array 时返回 undefined', () => {
    const data = buildExecResult('')
    // 空 Message 解析为空字符串，JSON.parse('') 抛错被 catch，返回 undefined
    expect(extractExecResultProgress(data)).toBeUndefined()
  })

  it('解析 progress 类型并返回 value 与 finished=false（进度 < 1）', () => {
    const data = buildExecResult('{"type":"progress","content":{"progress":0.5,"id":"x"}}')
    expect(extractExecResultProgress(data)).toEqual({ value: 0.5, finished: false } as ExecResultProgressInfo)
  })

  it('progress === 1 时 finished 为 true', () => {
    const data = buildExecResult('{"type":"progress","content":{"progress":1,"id":"x"}}')
    expect(extractExecResultProgress(data)).toEqual({ value: 1, finished: true } as ExecResultProgressInfo)
  })

  it('progress 为 0 时 finished 为 false（0 !== 1）', () => {
    const data = buildExecResult('{"type":"progress","content":{"progress":0,"id":"x"}}')
    expect(extractExecResultProgress(data)).toEqual({ value: 0, finished: false } as ExecResultProgressInfo)
  })

  it('type 不是 progress 时返回 undefined', () => {
    const data = buildExecResult('{"type":"log","content":{"level":"info","data":"hi","timestamp":1}}')
    expect(extractExecResultProgress(data)).toBeUndefined()
  })

  it('progress 字段不是数字时返回 undefined', () => {
    const data = buildExecResult('{"type":"progress","content":{"progress":"abc","id":"x"}}')
    expect(extractExecResultProgress(data)).toBeUndefined()
  })

  it('content 缺少 progress 字段时返回 undefined', () => {
    const data = buildExecResult('{"type":"progress","content":{"id":"x"}}')
    expect(extractExecResultProgress(data)).toBeUndefined()
  })

  it('Message 不是合法 JSON 时返回 undefined 且不抛错', () => {
    const data = buildExecResult('{not-json')
    expect(() => extractExecResultProgress(data)).not.toThrow()
    expect(extractExecResultProgress(data)).toBeUndefined()
  })

  it('option.page / option.fun 透传不影响解析结果', () => {
    const data = buildExecResult('{"type":"progress","content":{"progress":0.8,"id":"x"}}')
    expect(extractExecResultProgress(data, { page: 'TestPage', fun: 'TestFun' })).toEqual({
      value: 0.8,
      finished: false,
    } as ExecResultProgressInfo)
  })

  it('进度为负数时 finished 为 false', () => {
    const data = buildExecResult('{"type":"progress","content":{"progress":-1,"id":"x"}}')
    expect(extractExecResultProgress(data)).toEqual({ value: -1, finished: false } as ExecResultProgressInfo)
  })
})
