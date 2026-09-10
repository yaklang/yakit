import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ContextMenuExecutionType, ContextMenuScene, type ContextMenuAction } from '../types'

vi.mock('@/i18n/i18n', () => ({
  default: { getFixedT: () => (k: string, opts?: { name?: string }) => `${k}:${opts?.name || ''}` },
}))
vi.mock('@/utils/globalShortcutKey/events/page/yakEditor', () => ({
  isConflictToYakEditor: vi.fn(() => ''),
}))
vi.mock('@/utils/envfile', () => ({
  GetReleaseEdition: vi.fn(() => 0),
  PRODUCT_RELEASE_EDITION: { Yakit: 0, EnpriTrace: 1, IRify: 2 },
}))
vi.mock('@/utils/globalShortcutKey/events/pageMaps', () => ({
  ShortcutKeyPage: {
    Global: 'global',
    HTTPFuzzer: 'httpFuzzer',
    PluginHub: 'plugin-hub',
    YakRunner_Audit_Code: 'yakrunner-audit-code',
    YakRunner: 'yakScript',
    YakRunnerAiCodeAudit: 'irify-ai-code-audit',
    Mitm: 'mitm-hijack',
    ChatCS: 'chat-cs',
    YakEditor: 'yak-editor',
    YakitMultiple: 'yakit-multiple',
    HotPatchManagement: 'hot-patch-management',
  },
  pageEventMaps: {
    global: {
      getEvents: () => ({
        'sendAndJump*common': { name: 'ShortcutKey.sendAndJump', keys: ['Control', 'R'] },
      }),
    },
    'yak-editor': {
      getEvents: () => ({
        'editorOnly*common': { name: 'ShortcutKey.editorOnly', keys: ['Control', 'E'] },
      }),
    },
    'yakit-multiple': {
      getEvents: () => ({
        'tableOnly*common': { name: 'ShortcutKey.tableOnly', keys: ['Control', 'T'] },
      }),
    },
  },
}))
vi.mock('../api', () => ({
  grpcQueryContextMenuActions: vi.fn(),
}))

import { isConflictToYakEditor } from '@/utils/globalShortcutKey/events/page/yakEditor'
import { grpcQueryContextMenuActions } from '../api'
import {
  checkContextMenuShortcutConflict,
  findContextMenuPluginShortcutConflict,
  matchContextMenuShortcut,
  parseContextMenuShortcut,
  refreshContextMenuShortcutCache,
  serializeContextMenuShortcut,
} from '../shortcut'

const mockIsConflict = isConflictToYakEditor as ReturnType<typeof vi.fn>
const mockQuery = grpcQueryContextMenuActions as ReturnType<typeof vi.fn>

const makeAction = (over: Partial<ContextMenuAction>): ContextMenuAction =>
  ({
    ActionID: 'a1',
    PluginUUID: 'u1',
    PluginName: 'PluginA',
    Enabled: true,
    Shortcut: '',
    ExecutionType: ContextMenuExecutionType.ContextMenu,
    ...over,
  }) as ContextMenuAction

beforeEach(() => {
  mockIsConflict.mockReset()
  mockIsConflict.mockReturnValue('')
  mockQuery.mockReset()
  mockQuery.mockResolvedValue({ Actions: [] })
})

describe('serializeContextMenuShortcut / parseContextMenuShortcut', () => {
  it('空数组序列化为空字符串', () => {
    expect(serializeContextMenuShortcut([])).toBe('')
  })

  it('序列化时按修饰键优先级排序', () => {
    expect(serializeContextMenuShortcut(['R', 'Shift', 'Control'])).toBe('Control|Shift|R')
  })

  it('解析空或空白返回空数组', () => {
    expect(parseContextMenuShortcut('')).toEqual([])
    expect(parseContextMenuShortcut('   ')).toEqual([])
    expect(parseContextMenuShortcut(undefined)).toEqual([])
  })

  it('解析管道分隔字符串', () => {
    expect(parseContextMenuShortcut('Control|Shift|R')).toEqual(['Control', 'Shift', 'R'])
  })
})

describe('checkContextMenuShortcutConflict', () => {
  it('数据包场景才检测 Monaco 冲突', () => {
    mockIsConflict.mockReturnValueOnce('editor conflict')
    expect(checkContextMenuShortcutConflict(['Control', 'C'], { scene: ContextMenuScene.HTTPPacket })).toBe(
      'editor conflict',
    )
  })

  it('History 表格场景不检测 Monaco 冲突', () => {
    mockIsConflict.mockReturnValueOnce('editor conflict')
    const result = checkContextMenuShortcutConflict(['Control', 'C'], {
      scene: ContextMenuScene.HistorySingle,
    })
    expect(mockIsConflict).not.toHaveBeenCalled()
    expect(result).toBe('')
  })

  it('History 单选场景不比对编辑器页系统快捷键', () => {
    const result = checkContextMenuShortcutConflict(['Control', 'E'], {
      scene: ContextMenuScene.HistorySingle,
    })
    expect(result).toBe('')
  })

  it('数据包场景不比对多页面表格系统快捷键', () => {
    const result = checkContextMenuShortcutConflict(['Control', 'T'], {
      scene: ContextMenuScene.HTTPPacket,
    })
    expect(result).toBe('')
  })

  it('History 多选场景会比对多页面表格系统快捷键', () => {
    const result = checkContextMenuShortcutConflict(['Control', 'T'], {
      scene: ContextMenuScene.HistoryMulti,
    })
    expect(result).toContain('ManageRightClickPlugins.systemShortcutConflict')
    expect(result).toContain('ShortcutKey.tableOnly')
  })

  it('与系统快捷键（如发送到 WebFuzzer）冲突时提示重新设置', () => {
    const result = checkContextMenuShortcutConflict(['Control', 'R'], {
      scene: ContextMenuScene.HistorySingle,
    })
    expect(result).toContain('ManageRightClickPlugins.systemShortcutConflict')
    expect(result).toContain('ShortcutKey.sendAndJump')
  })

  it('同场景其他插件 Shortcut 冲突时返回提示', () => {
    const siblings = [
      makeAction({ PluginUUID: 'u2', ActionID: 'a2', PluginName: 'Other', Shortcut: 'Control|Shift|R' }),
    ]
    const result = checkContextMenuShortcutConflict(['Control', 'Shift', 'R'], {
      siblings,
      exclude: { PluginUUID: 'u1', ActionID: 'a1' },
    })
    expect(result).toContain('ManageRightClickPlugins.pluginShortcutConflict')
    expect(result).toContain('Other')
  })

  it('比对时排除自身', () => {
    const siblings = [makeAction({ Shortcut: 'Control|Shift|T' })]
    const result = checkContextMenuShortcutConflict(['Control', 'Shift', 'T'], {
      siblings,
      exclude: { PluginUUID: 'u1', ActionID: 'a1' },
    })
    expect(result).toBe('')
  })
})

describe('findContextMenuPluginShortcutConflict', () => {
  it('编辑器页只比对数据包右键插件', async () => {
    mockQuery.mockResolvedValueOnce({
      Actions: [
        makeAction({
          PluginName: 'MyPlugin',
          Shortcut: 'Control|Alt|P',
          Enabled: true,
          Scene: ContextMenuScene.HTTPPacket,
        }),
      ],
    })
    await refreshContextMenuShortcutCache()
    const result = findContextMenuPluginShortcutConflict(['Control', 'Alt', 'P'], 'yak-editor')
    expect(result).toContain('ShortcutKey.contextMenuPluginConflict')
    expect(result).toContain('MyPlugin')
  })

  it('编辑器页不比对 History 表格插件', async () => {
    mockQuery.mockResolvedValueOnce({
      Actions: [
        makeAction({
          PluginName: 'TablePlugin',
          Shortcut: 'Control|Alt|P',
          Enabled: true,
          Scene: ContextMenuScene.HistorySingle,
        }),
      ],
    })
    await refreshContextMenuShortcutCache()
    expect(findContextMenuPluginShortcutConflict(['Control', 'Alt', 'P'], 'yak-editor')).toBe('')
  })

  it('全局页比对全部右键场景', async () => {
    mockQuery.mockResolvedValueOnce({
      Actions: [
        makeAction({
          PluginName: 'TablePlugin',
          Shortcut: 'Control|Alt|G',
          Enabled: true,
          Scene: ContextMenuScene.HistorySingle,
        }),
      ],
    })
    await refreshContextMenuShortcutCache()
    const result = findContextMenuPluginShortcutConflict(['Control', 'Alt', 'G'], 'global')
    expect(result).toContain('TablePlugin')
  })

  it('多页面页只比对 History 单/多选插件', async () => {
    mockQuery.mockResolvedValueOnce({
      Actions: [
        makeAction({
          PluginName: 'TablePlugin',
          Shortcut: 'Control|Alt|H',
          Enabled: true,
          Scene: ContextMenuScene.HistoryMulti,
        }),
        makeAction({
          PluginName: 'PacketPlugin',
          Shortcut: 'Control|Alt|P',
          Enabled: true,
          Scene: ContextMenuScene.HTTPPacket,
        }),
      ],
    })
    await refreshContextMenuShortcutCache()
    expect(findContextMenuPluginShortcutConflict(['Control', 'Alt', 'H'], 'yakit-multiple')).toContain('TablePlugin')
    expect(findContextMenuPluginShortcutConflict(['Control', 'Alt', 'P'], 'yakit-multiple')).toBe('')
  })

  it('MITM / WebFuzzer 页与右键插件无重叠，不比对', async () => {
    mockQuery.mockResolvedValueOnce({
      Actions: [
        makeAction({
          PluginName: 'PacketPlugin',
          Shortcut: 'Control|Alt|M',
          Enabled: true,
          Scene: ContextMenuScene.HTTPPacket,
        }),
      ],
    })
    await refreshContextMenuShortcutCache()
    expect(findContextMenuPluginShortcutConflict(['Control', 'Alt', 'M'], 'mitm-hijack')).toBe('')
    expect(findContextMenuPluginShortcutConflict(['Control', 'Alt', 'M'], 'httpFuzzer')).toBe('')
  })

  it('与右键无重叠的页（如插件仓库）不比对', async () => {
    mockQuery.mockResolvedValueOnce({
      Actions: [
        makeAction({
          PluginName: 'AnyPlugin',
          Shortcut: 'Control|Alt|P',
          Enabled: true,
          Scene: ContextMenuScene.HTTPPacket,
        }),
      ],
    })
    await refreshContextMenuShortcutCache()
    expect(findContextMenuPluginShortcutConflict(['Control', 'Alt', 'P'], 'plugin-hub')).toBe('')
  })

  it('无匹配时返回空', async () => {
    mockQuery.mockResolvedValueOnce({ Actions: [] })
    await refreshContextMenuShortcutCache()
    expect(findContextMenuPluginShortcutConflict(['Control', 'Alt', 'Z'])).toBe('')
  })

  it('grpc 失败时保留上一次缓存', async () => {
    mockQuery.mockResolvedValueOnce({
      Actions: [
        makeAction({
          PluginName: 'CachedPlugin',
          Shortcut: 'Control|Alt|C',
          Enabled: true,
          Scene: ContextMenuScene.HTTPPacket,
        }),
      ],
    })
    await refreshContextMenuShortcutCache()
    expect(findContextMenuPluginShortcutConflict(['Control', 'Alt', 'C'], 'yak-editor')).toContain('CachedPlugin')

    mockQuery.mockRejectedValueOnce(new Error('network'))
    await refreshContextMenuShortcutCache()
    expect(findContextMenuPluginShortcutConflict(['Control', 'Alt', 'C'], 'yak-editor')).toContain('CachedPlugin')
  })

  it('refresh 返回刷新后的缓存条目数，grpc 失败时返回旧条目数', async () => {
    mockQuery.mockResolvedValueOnce({
      Actions: [
        makeAction({ PluginName: 'P1', Shortcut: 'Control|Alt|1', Enabled: true }),
        makeAction({ PluginName: 'P2', Shortcut: 'Control|Alt|2', Enabled: true }),
        // 未启用 / 未绑定快捷键的项不计入缓存
        makeAction({ PluginName: 'P3', Shortcut: 'Control|Alt|3', Enabled: false }),
        makeAction({ PluginName: 'P4', Shortcut: '', Enabled: true }),
      ],
    })
    await expect(refreshContextMenuShortcutCache()).resolves.toBe(2)

    mockQuery.mockRejectedValueOnce(new Error('network'))
    await expect(refreshContextMenuShortcutCache()).resolves.toBe(2)
  })
})

describe('matchContextMenuShortcut', () => {
  it('按键顺序无关仍可命中', () => {
    expect(matchContextMenuShortcut(['R', 'Control'], 'Control|R')).toBe(true)
  })

  it('未绑定或按键不匹配时返回 false', () => {
    expect(matchContextMenuShortcut(['Control', 'R'], '')).toBe(false)
    expect(matchContextMenuShortcut(['Control', 'S'], 'Control|R')).toBe(false)
  })
})
