const electronMock = vi.hoisted(() => {
  const invoke = vi.fn().mockResolvedValue({ Resources: [] })
  ;(window as any).require = (id: string) => {
    if (id === 'electron') {
      return { ipcRenderer: { invoke } }
    }
    return {}
  }
  return { invoke }
})

vi.mock('../yakRunner/utils', () => ({
  initFileTreeData: vi.fn(() => []),
  getNameByPath: vi.fn(async () => ''),
}))

vi.mock('../../risks/YakitRiskTable/YakitRiskTable', () => ({
  SeverityMapTag: [],
}))

vi.mock('@/utils/kv', () => ({
  getRemoteValue: vi.fn(),
  setRemoteValue: vi.fn(),
}))

vi.mock('@/utils/notification', () => ({
  failed: vi.fn(),
  warn: vi.fn(),
}))

vi.mock('@/pages/yakRunnerScanHistory/utils', () => ({
  apiQuerySSAPrograms: vi.fn(),
}))

import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { RequestYakURLResponse } from '../../yakURLTree/data'
import {
  grpcFetchAuditTree,
  isIncrementalProgramByQuery,
  isIncrementalProgramFromInfo,
  projectNameFromPath,
} from '../utils'
import { apiQuerySSAPrograms } from '@/pages/yakRunnerScanHistory/utils'

const queryPrograms = vi.mocked(apiQuerySSAPrograms)

const lastInvokeParams = () => {
  const call = electronMock.invoke.mock.calls.at(-1)
  return call?.[1] as { Url: { Schema: string; Path: string; Query: { Key: string; Value: string }[] } }
}

const makeInfoRes = (extra?: { Key: string; Value: string }[]) =>
  ({ Resources: extra ? [{ Extra: extra }] : [] }) as unknown as RequestYakURLResponse

describe('yakRunnerAuditCode/utils', () => {
  beforeEach(() => {
    electronMock.invoke.mockClear()
    queryPrograms.mockReset()
  })

  describe('grpcFetchAuditTree diffOnly 拼装', () => {
    it('不传 diffOnly 时只带 op=list（根路径「最近编译」等列表的全量语义）', async () => {
      await grpcFetchAuditTree('/proj')
      expect(lastInvokeParams().Url.Query).toEqual([{ Key: 'op', Value: 'list' }])
      expect(lastInvokeParams().Url.Path).toBe('/proj')
    })

    it('显式传 false 时同样不带 diffOnly', async () => {
      await grpcFetchAuditTree('/', false)
      expect(lastInvokeParams().Url.Query).toEqual([{ Key: 'op', Value: 'list' }])
    })

    it('传 true 时追加 diffOnly=true', async () => {
      await grpcFetchAuditTree('/proj', true)
      expect(lastInvokeParams().Url.Query).toEqual([
        { Key: 'op', Value: 'list' },
        { Key: 'diffOnly', Value: 'true' },
      ])
    })
  })

  describe('isIncrementalProgramFromInfo', () => {
    it('Extra 中 IsIncremental 为 true/1 视为增量', () => {
      expect(isIncrementalProgramFromInfo(makeInfoRes([{ Key: 'IsIncremental', Value: 'true' }]))).toBe(true)
      expect(isIncrementalProgramFromInfo(makeInfoRes([{ Key: 'IsIncremental', Value: '1' }]))).toBe(true)
    })

    it('false/缺失/空 Resources 视为非增量', () => {
      expect(isIncrementalProgramFromInfo(makeInfoRes([{ Key: 'IsIncremental', Value: 'false' }]))).toBe(false)
      expect(isIncrementalProgramFromInfo(makeInfoRes([{ Key: 'Other', Value: 'true' }]))).toBe(false)
      expect(isIncrementalProgramFromInfo(makeInfoRes())).toBe(false)
      expect(isIncrementalProgramFromInfo(undefined as unknown as RequestYakURLResponse)).toBe(false)
    })
  })

  describe('projectNameFromPath', () => {
    it('从 ssadb 根路径提取最后一个路径段', () => {
      expect(projectNameFromPath('/Java_DVWA(2026-10-08 17:14:45)')).toBe('Java_DVWA(2026-10-08 17:14:45)')
      expect(projectNameFromPath('Java_DVWA')).toBe('Java_DVWA')
    })

    it('空路径/纯根路径返回空串', () => {
      expect(projectNameFromPath('/')).toBe('')
      expect(projectNameFromPath('')).toBe('')
      expect(projectNameFromPath(undefined as unknown as string)).toBe('')
    })
  })

  describe('isIncrementalProgramByQuery', () => {
    it('按名称与 IsIncrementalCompile 联合判定', async () => {
      queryPrograms.mockResolvedValue({
        Data: [
          { Name: 'proj', IsIncrementalCompile: true },
          { Name: 'other', IsIncrementalCompile: false },
        ],
      } as any)
      expect(await isIncrementalProgramByQuery('proj')).toBe(true)
      expect(await isIncrementalProgramByQuery('other')).toBe(false)
    })

    it('空名称不发起查询，接口异常返回 false', async () => {
      expect(await isIncrementalProgramByQuery('')).toBe(false)
      expect(queryPrograms).not.toHaveBeenCalled()
      queryPrograms.mockRejectedValue(new Error('grpc fail'))
      expect(await isIncrementalProgramByQuery('proj')).toBe(false)
    })
  })
})
