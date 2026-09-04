import i18n from '@/i18n/i18n'
import { GetReleaseEdition } from '@/utils/envfile'
import { pageEventMaps, ShortcutKeyPage, type ShortcutKeyPageName } from '@/utils/globalShortcutKey/events/pageMaps'
import { isConflictToYakEditor } from '@/utils/globalShortcutKey/events/page/yakEditor'
import { sortKeysCombination } from '@/utils/globalShortcutKey/shortcutKeyCore'
import { grpcQueryContextMenuActions } from './api'
import { ContextMenuScene, type ContextMenuAction, type ContextMenuScene as ContextMenuSceneType } from './types'

const tOriginal = i18n.getFixedT(null, ['manageRightClickPlugins', 'shortcutKey', 'utils', 'yakitUi', 'history'])

/** 将按键数组序列化为引擎 Shortcut 字符串（与全局快捷键录制格式一致） */
export const serializeContextMenuShortcut = (keys: string[]): string => {
  if (!keys.length) return ''
  return sortKeysCombination(keys).join('|')
}

/** 解析引擎 Shortcut 字符串为按键数组 */
export const parseContextMenuShortcut = (shortcut?: string): string[] => {
  if (!shortcut || !shortcut.trim()) return []
  return shortcut.split('|').filter(Boolean)
}

export interface CheckContextMenuShortcutConflictOptions {
  /** 当前右键场景：仅数据包场景检测 Monaco 编辑器内置冲突 */
  scene?: ContextMenuSceneType
  /** 同场景其他已启用插件（用于插件间冲突） */
  siblings?: ContextMenuAction[]
  /** 当前正在编辑的插件，比对时排除自身 */
  exclude?: Pick<ContextMenuAction, 'PluginUUID' | 'ActionID'>
}

interface CachedContextMenuShortcut {
  PluginUUID: string
  ActionID: string
  PluginName: string
  Shortcut: string
  Scene: string
}

/** 已启用且已绑定 Shortcut 的右键插件缓存（供原快捷键设置页同步冲突检测） */
let cachedEnabledShortcuts: CachedContextMenuShortcut[] = []

/** 从引擎刷新右键插件快捷键缓存；返回刷新后的缓存条目数（grpc 失败保留旧缓存，返回旧条目数） */
export const refreshContextMenuShortcutCache = async (): Promise<number> => {
  try {
    const res = await grpcQueryContextMenuActions({ IncludeDisabled: false }, true)
    cachedEnabledShortcuts = (res.Actions || [])
      .filter((action) => action.Enabled && !!action.Shortcut)
      .map((action) => ({
        PluginUUID: action.PluginUUID,
        ActionID: action.ActionID,
        PluginName: action.PluginName,
        Shortcut: action.Shortcut,
        Scene: action.Scene,
      }))
  } catch {
    // 保留旧缓存，避免瞬时失败导致误报无冲突
  }
  return cachedEnabledShortcuts.length
}

/** 当前缓存快照（供录制比对前判断缓存是否已就绪，避免用空缓存漏报冲突） */
export const getEnabledContextMenuShortcuts = (): CachedContextMenuShortcut[] => cachedEnabledShortcuts

/** 原快捷键设置页与右键插件场景的运行时重叠（空数组表示无重叠、不比对） */
const SHORTCUT_PAGE_CONTEXT_MENU_SCENES: Record<ShortcutKeyPageName, ContextMenuSceneType[]> = {
  // 全局快捷键到处生效，与所有右键场景都可能冲突
  [ShortcutKeyPage.Global]: [
    ContextMenuScene.HTTPPacket,
    ContextMenuScene.HistorySingle,
    ContextMenuScene.HistoryMulti,
  ],
  // 编辑器快捷键 ↔ 数据包右键插件
  [ShortcutKeyPage.YakEditor]: [ContextMenuScene.HTTPPacket],
  // 多页面快捷键 ↔ History 单/多选右键插件
  [ShortcutKeyPage.YakitMultiple]: [ContextMenuScene.HistorySingle, ContextMenuScene.HistoryMulti],
  // 以下页面与右键插件无运行时触发重叠
  [ShortcutKeyPage.HTTPFuzzer]: [],
  [ShortcutKeyPage.Mitm]: [],
  [ShortcutKeyPage.PluginHub]: [],
  [ShortcutKeyPage.YakRunner]: [],
  [ShortcutKeyPage.ChatCS]: [],
  [ShortcutKeyPage.YakRunner_Audit_Code]: [],
  [ShortcutKeyPage.YakRunnerAiCodeAudit]: [],
  [ShortcutKeyPage.HotPatchManagement]: [],
}

/** 原快捷键页 → 需要比对的右键插件场景；未传 page 时比对全部场景 */
const shortcutPageToContextMenuScenes = (page?: ShortcutKeyPageName): ContextMenuSceneType[] | undefined => {
  if (!page) return undefined
  return SHORTCUT_PAGE_CONTEXT_MENU_SCENES[page] ?? []
}

/**
 * 原快捷键系统录制时：检测是否与已启用右键插件 Shortcut 冲突（依赖缓存，需先 refresh）
 * @param page 当前快捷键设置页 tab，按运行时重叠场景过滤比对范围
 */
export const findContextMenuPluginShortcutConflict = (keys: string[], page?: ShortcutKeyPageName): string => {
  if (!keys.length) return ''
  const scenes = shortcutPageToContextMenuScenes(page)
  // 显式空数组：当前页与右键插件无重叠，不比对
  if (scenes && scenes.length === 0) return ''

  const triggerKeys = sortKeysCombination(keys).join('')
  for (const item of cachedEnabledShortcuts) {
    if (scenes && !scenes.includes(item.Scene as ContextMenuSceneType)) continue
    const bound = parseContextMenuShortcut(item.Shortcut)
    if (!bound.length) continue
    if (sortKeysCombination(bound).join('') === triggerKeys) {
      return tOriginal('ShortcutKey.contextMenuPluginConflict', { name: item.PluginName })
    }
  }
  return ''
}

/** 右键场景 → 原快捷键设置页：与 shouldCheckSystemPage 共用映射的反向判断 */
const shouldCheckSystemPage = (page: ShortcutKeyPageName, scene?: ContextMenuSceneType): boolean => {
  if (!scene) return true
  const scenes = SHORTCUT_PAGE_CONTEXT_MENU_SCENES[page]
  if (!scenes) return true
  // 该系统页与当前右键场景无重叠则跳过
  if (scenes.length === 0) return false
  return scenes.includes(scene)
}

/** 与原快捷键系统比对冲突 */
const findSystemShortcutConflict = (triggerKeys: string, scene?: ContextMenuSceneType): string => {
  const edition = GetReleaseEdition()
  for (const page of Object.keys(pageEventMaps) as ShortcutKeyPageName[]) {
    if (!shouldCheckSystemPage(page, scene)) continue
    const pageInfo = pageEventMaps[page]
    if (pageInfo.scopeShow && !pageInfo.scopeShow.includes(edition)) continue

    const events = pageInfo.getEvents()
    for (const eventKey of Object.keys(events)) {
      const event = events[eventKey]
      if (!event?.keys?.length) continue
      if (event.scopeShow && !event.scopeShow.includes(edition)) continue
      if (sortKeysCombination(event.keys).join('') === triggerKeys) {
        const name = tOriginal(event.name)
        return tOriginal('ManageRightClickPlugins.systemShortcutConflict', { name })
      }
    }
  }
  return ''
}

/**
 * 检测右键插件快捷键冲突（警告不拦截，提示重新设置）
 * - 仅数据包场景：Monaco 编辑器内置快捷键（isConflictToYakEditor）
 * - 原快捷键系统（按场景缩小范围）
 * - 同场景其他已启用插件 Shortcut
 */
export const checkContextMenuShortcutConflict = (
  keys: string[],
  options: CheckContextMenuShortcutConflictOptions = {},
): string => {
  if (!keys.length) return ''

  const { scene, siblings = [], exclude } = options

  // 仅数据包右键（作用于编辑器）需要检测 Monaco 内置冲突；History 单/多选作用于表格，跳过
  if (scene === ContextMenuScene.HTTPPacket) {
    const editorConflict = isConflictToYakEditor(keys)
    if (editorConflict) return editorConflict
  }

  const triggerKeys = sortKeysCombination(keys).join('')
  const systemConflict = findSystemShortcutConflict(triggerKeys, scene)
  if (systemConflict) return systemConflict

  for (const action of siblings) {
    if (!action.Enabled) continue
    if (exclude && action.PluginUUID === exclude.PluginUUID && action.ActionID === exclude.ActionID) {
      continue
    }
    const siblingKeys = parseContextMenuShortcut(action.Shortcut)
    if (!siblingKeys.length) continue
    if (sortKeysCombination(siblingKeys).join('') === triggerKeys) {
      return tOriginal('ManageRightClickPlugins.pluginShortcutConflict', { name: action.PluginName })
    }
  }
  return ''
}

/** 判断按键事件是否命中指定 Shortcut 字符串 */
export const matchContextMenuShortcut = (eventKeys: string[], shortcut?: string): boolean => {
  const bound = parseContextMenuShortcut(shortcut)
  if (!bound.length || !eventKeys.length) return false
  return sortKeysCombination(bound).join('') === sortKeysCombination(eventKeys).join('')
}
