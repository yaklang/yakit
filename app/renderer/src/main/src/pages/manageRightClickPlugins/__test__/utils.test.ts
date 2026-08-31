import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ManageRightClickPluginsTabKey } from '../constants'
import { ContextMenuExecutionType, type ContextMenuAction } from '../types'

// utils.ts 顶部引入了依赖 Electron bridge 的模块，测试中全部打桩，避免 window.require 报错
vi.mock('@/apiUtils/grpc', () => ({ grpcFetchLocalYakVersion: vi.fn() }))
vi.mock('@/utils/notification', () => ({ yakitFailed: vi.fn() }))
vi.mock('@/constants/hardware', () => ({ SystemInfo: { mode: 'local' } }))
vi.mock('@/i18n/i18n', () => ({ default: { getFixedT: () => (k: string) => k } }))
vi.mock('../api', () => ({ grpcQueryContextMenuActions: vi.fn() }))

import { grpcQueryContextMenuActions } from '../api'
import { getSceneTabActions } from '../utils'

const mockQuery = grpcQueryContextMenuActions as ReturnType<typeof vi.fn>

const makeAction = (over: Partial<ContextMenuAction>): ContextMenuAction =>
  ({
    ActionID: 'a1',
    Enabled: true,
    ExecutionType: ContextMenuExecutionType.ContextMenu,
    ...over,
  }) as ContextMenuAction

beforeEach(() => {
  mockQuery.mockReset()
})

describe('getSceneTabActions', () => {
  it('无效 tabKey 时返回空列表并标记 noData，且不调用 grpc', async () => {
    const res = await getSceneTabActions('unknown-key')
    expect(res).toEqual({ list: [], noData: true })
    expect(mockQuery).not.toHaveBeenCalled()
  })

  it('引擎返回空 Actions 时为空态（noData: true）', async () => {
    mockQuery.mockResolvedValueOnce({ Actions: [], EnabledCustomPluginCount: 0, MaxCustomPluginCount: 0 })
    const res = await getSceneTabActions(ManageRightClickPluginsTabKey.PluginExtensionSingle)
    expect(res).toEqual({ list: [], noData: true })
  })

  it('仅存在禁用项时 list 为空但 noData 为 false（区分“无数据”与“有数据全禁用”）', async () => {
    const disabled = makeAction({ ActionID: 'd1', Enabled: false })
    mockQuery.mockResolvedValueOnce({ Actions: [disabled], EnabledCustomPluginCount: 0, MaxCustomPluginCount: 0 })
    const res = await getSceneTabActions(ManageRightClickPluginsTabKey.PluginExtensionSingle)
    expect(res.list).toEqual([])
    expect(res.noData).toBe(false)
  })

  it('含启用项时 list 仅保留启用项且 noData 为 false', async () => {
    const enabled = makeAction({ ActionID: 'e1', Enabled: true })
    const disabled = makeAction({ ActionID: 'd1', Enabled: false })
    mockQuery.mockResolvedValueOnce({
      Actions: [enabled, disabled],
      EnabledCustomPluginCount: 1,
      MaxCustomPluginCount: 0,
    })
    const res = await getSceneTabActions(ManageRightClickPluginsTabKey.PluginExtensionSingle)
    expect(res.list.map((a) => a.ActionID)).toEqual(['e1'])
    expect(res.noData).toBe(false)
  })

  it('grpc 抛错时回退到空态（noData: true）', async () => {
    mockQuery.mockRejectedValueOnce(new Error('network'))
    const res = await getSceneTabActions(ManageRightClickPluginsTabKey.PluginExtensionSingle)
    expect(res).toEqual({ list: [], noData: true })
  })

  it('查询参数携带 IncludeDisabled: true', async () => {
    mockQuery.mockResolvedValueOnce({ Actions: [], EnabledCustomPluginCount: 0, MaxCustomPluginCount: 0 })
    await getSceneTabActions(ManageRightClickPluginsTabKey.PluginExtensionSingle)
    expect(mockQuery).toHaveBeenCalledTimes(1)
    expect(mockQuery.mock.calls[0][0]).toMatchObject({ IncludeDisabled: true })
  })
})
