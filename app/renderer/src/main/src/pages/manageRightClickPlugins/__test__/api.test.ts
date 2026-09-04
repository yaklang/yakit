import { describe, expect, it } from 'vitest'
import { ContextMenuExecutionType } from '../types'

describe('manageRightClickPlugins api helpers', () => {
  it('应过滤掉 ExecutionType 为 LegacyPacketMutate 的数据包变形插件', () => {
    const actions = [
      { ActionID: 'a1', ExecutionType: ContextMenuExecutionType.ContextMenu },
      { ActionID: 'a2', ExecutionType: ContextMenuExecutionType.LegacyPacketMutate },
      { ActionID: 'a3', ExecutionType: ContextMenuExecutionType.LegacyHistory },
      { ActionID: 'a4', ExecutionType: ContextMenuExecutionType.LegacyPacketContext },
    ] as any[]

    const filtered = actions.filter((action) => action.ExecutionType !== ContextMenuExecutionType.LegacyPacketMutate)

    expect(filtered.map((a) => a.ActionID)).toEqual(['a1', 'a3', 'a4'])
  })
})
