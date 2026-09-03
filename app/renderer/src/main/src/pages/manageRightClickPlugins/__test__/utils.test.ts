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
import { getSceneTabActions, isSameAction, patchAction } from '../utils'

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

describe('isSameAction', () => {
  it('PluginUUID 与 ActionID 均相同视为同一动作', () => {
    const a = makeAction({ PluginUUID: 'p1', ActionID: 'a1' })
    const b = makeAction({ PluginUUID: 'p1', ActionID: 'a1', Shortcut: 'ctrl|k' })
    expect(isSameAction(a, b)).toBe(true)
  })

  it('PluginUUID 不同（跨插件同名动作）视为不同动作', () => {
    const a = makeAction({ PluginUUID: 'p1', ActionID: 'a1' })
    const b = makeAction({ PluginUUID: 'p2', ActionID: 'a1' })
    expect(isSameAction(a, b)).toBe(false)
  })

  it('ActionID 不同（同插件多动作）视为不同动作', () => {
    const a = makeAction({ PluginUUID: 'p1', ActionID: 'a1' })
    const b = makeAction({ PluginUUID: 'p1', ActionID: 'a2' })
    expect(isSameAction(a, b)).toBe(false)
  })

  it('与匹配无关的字段差异不影响判定', () => {
    const a = makeAction({ PluginUUID: 'p1', ActionID: 'a1', Enabled: true, Sort: 0 })
    const b = makeAction({ PluginUUID: 'p1', ActionID: 'a1', Enabled: false, Sort: 3 })
    expect(isSameAction(a, b)).toBe(true)
  })
})

describe('patchAction', () => {
  it('按唯一标识命中时仅更新目标项的指定字段，其余字段与列表项保持不变', () => {
    const list = [
      makeAction({ PluginUUID: 'p1', ActionID: 'a1', Shortcut: '', Sort: 0 }),
      makeAction({ PluginUUID: 'p1', ActionID: 'a2', Shortcut: 'ctrl|1', Sort: 1 }),
    ]
    const next = patchAction(list, { PluginUUID: 'p1', ActionID: 'a2' }, { Shortcut: 'ctrl|9' })
    expect(next[1].Shortcut).toBe('ctrl|9')
    expect(next[1].Sort).toBe(1)
    expect(next[0]).toBe(list[0]) // 未命中项原样保留（引用不变）
  })

  it('命中项返回新对象，不 mutate 原列表', () => {
    const list = [makeAction({ PluginUUID: 'p1', ActionID: 'a1', Enabled: false })]
    const next = patchAction(list, { PluginUUID: 'p1', ActionID: 'a1' }, { Enabled: true })
    expect(next[0]).not.toBe(list[0])
    expect(next[0].Enabled).toBe(true)
    expect(list[0].Enabled).toBe(false)
  })

  it('无匹配项时列表内容不变', () => {
    const list = [makeAction({ PluginUUID: 'p1', ActionID: 'a1' })]
    const next = patchAction(list, { PluginUUID: 'p9', ActionID: 'x9' }, { Enabled: true })
    expect(next).toEqual(list)
  })

  it('支持同时补丁多个字段（模拟 toUnboundAction 场景）', () => {
    const list = [
      makeAction({ PluginUUID: 'p1', ActionID: 'a1', Enabled: true, Shortcut: 'ctrl|1', ResultMode: 'drawer' }),
    ]
    const next = patchAction(
      list,
      { PluginUUID: 'p1', ActionID: 'a1' },
      {
        Enabled: false,
        Shortcut: '',
        ResultMode: 'tab',
      },
    )
    expect(next[0]).toMatchObject({ Enabled: false, Shortcut: '', ResultMode: 'tab' })
  })
})
