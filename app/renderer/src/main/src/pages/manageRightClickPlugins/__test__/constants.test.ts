import { describe, expect, it } from 'vitest'
import {
  DROP_AVAILABLE,
  DROP_SELECTED,
  getGroupTabByKey,
  getSceneByTabKey,
  GroupTabList,
  ManageRightClickPluginsTabKey,
  UpperLimit,
} from '../constants'
import { ContextMenuScene } from '../types'

describe('manageRightClickPlugins constants', () => {
  it('UpperLimit 为 15', () => {
    expect(UpperLimit).toBe(15)
  })

  it('拖拽区域 id 常量互不重复', () => {
    expect(DROP_SELECTED).not.toBe(DROP_AVAILABLE)
  })

  it('GroupTabList 包含全部三种场景', () => {
    const scenes = GroupTabList.map((item) => item.scene)
    expect(scenes).toContain(ContextMenuScene.HistorySingle)
    expect(scenes).toContain(ContextMenuScene.HistoryMulti)
    expect(scenes).toContain(ContextMenuScene.HTTPPacket)
  })

  it('getGroupTabByKey 能按 key 找到对应分组', () => {
    expect(getGroupTabByKey(ManageRightClickPluginsTabKey.PluginExtensionSingle)?.scene).toBe(
      ContextMenuScene.HistorySingle,
    )
    expect(getGroupTabByKey(ManageRightClickPluginsTabKey.PluginExtensionMultiple)?.scene).toBe(
      ContextMenuScene.HistoryMulti,
    )
    expect(getGroupTabByKey(ManageRightClickPluginsTabKey.PacketContextMenu)?.scene).toBe(ContextMenuScene.HTTPPacket)
  })

  it('getGroupTabByKey 对未知 key 返回 undefined', () => {
    expect(getGroupTabByKey('unknown-key')).toBeUndefined()
  })

  it('getSceneByTabKey 返回对应场景，未知 key 返回 undefined', () => {
    expect(getSceneByTabKey(ManageRightClickPluginsTabKey.PluginExtensionSingle)).toBe(ContextMenuScene.HistorySingle)
    expect(getSceneByTabKey(ManageRightClickPluginsTabKey.PacketContextMenu)).toBe(ContextMenuScene.HTTPPacket)
    expect(getSceneByTabKey('not-exist')).toBeUndefined()
  })
})
