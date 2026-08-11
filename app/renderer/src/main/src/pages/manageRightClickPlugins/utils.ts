import type { QueryYakScriptsResponse, YakScript } from '../invoker/schema'
import { getRemoteValue } from '@/utils/kv'
import { RemotePluginGV } from '@/enums/plugin'
import {
  getGroupTabByKey,
  UpperLimit,
  type ManageRightClickPluginsTabKey,
  type RightClickPluginItem,
  type RightClickPluginsOrderCache,
} from './constants'

const { ipcRenderer } = window.require('electron')

export const reorder = (list: RightClickPluginItem[], startIndex: number, endIndex: number) => {
  const result = [...list]
  const [removed] = result.splice(startIndex, 1)
  result.splice(endIndex, 0, removed)
  return result
}

export const getItemStyle = (isDragging, draggableStyle) => ({
  ...draggableStyle,
})

export const yakScriptToPluginItem = (plugin: YakScript): RightClickPluginItem => ({
  scriptName: plugin.ScriptName,
  scriptId: +plugin.Id || 0,
  headImg: plugin.HeadImg || '',
  help: plugin.Help,
})

export const parsePluginTags = (tags?: string): string[] => {
  if (!tags) return []
  return tags
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
}

/** 默认：有 tag 时取该 tag 下前 N 个完整插件；无 tag 返回空 */
export const fetchDefaultYakScriptsByTag = (tag?: string, limit = UpperLimit): Promise<YakScript[]> => {
  if (!tag) return Promise.resolve([])
  return ipcRenderer
    .invoke('QueryYakScript', {
      Pagination: { Limit: limit, Order: 'desc', Page: 1, OrderBy: 'updated_at' },
      Keyword: '',
      Tag: [tag],
    })
    .then((res: QueryYakScriptsResponse) => (res.Data || []).slice(0, limit))
    .catch(() => [])
}

/** 默认：有 tag 时取该 tag 下前 N 个；无 tag 的 tab 默认空列表 */
export const fetchDefaultPluginsByTag = (tag?: string): Promise<RightClickPluginItem[]> => {
  return fetchDefaultYakScriptsByTag(tag).then((list) => list.map(yakScriptToPluginItem))
}

/**
 * 按自定义插件名顺序解析完整插件详情
 * - 有 tag：须仍带有该 tag
 * - 无 tag：仅按插件名解析
 */
export const fetchYakScriptsByCustomNames = (names: string[], tag?: string): Promise<YakScript[]> => {
  if (!names.length) return Promise.resolve([])
  const params: Record<string, any> = {
    Pagination: { Limit: names.length, Order: 'desc', Page: 1, OrderBy: 'updated_at' },
    IncludedScriptNames: names,
  }
  if (tag) params.Tag = [tag]
  return ipcRenderer
    .invoke('QueryYakScript', params)
    .then((res: QueryYakScriptsResponse) => {
      const map = new Map((res.Data || []).map((p) => [p.ScriptName, p]))
      return names.map((name) => map.get(name)).filter(Boolean) as YakScript[]
    })
    .catch(() => [])
}

/**
 * 按自定义插件名顺序解析插件详情
 * - 有 tag：须仍带有该 tag（与右侧列表条件对齐）
 * - 无 tag：仅按插件名解析（该 tab 自己的已选数据）
 */
export const fetchPluginsByCustomNames = (names: string[], tag?: string): Promise<RightClickPluginItem[]> => {
  return fetchYakScriptsByCustomNames(names, tag).then((list) => list.map(yakScriptToPluginItem))
}

/**
 * 按 tab 获取最新顺序的完整插件列表
 * - 有自定义顺序：按 RemotePluginGV.RightClickPluginsOrder 中的插件名顺序解析
 * - 无自定义顺序：有 tag 时默认取该 tag 前 N 个
 */
export const getOrderedRightClickYakScripts = (
  tabKey: ManageRightClickPluginsTabKey | string,
): Promise<YakScript[]> => {
  return getOrderedRightClickYakScriptsWithMeta(tabKey).then((res) => res.list)
}

/**
 * 按 tab 获取插件列表，并标记是否来自自定义缓存
 * fromCustom 为 true 表示该 tab 已被用户自定义过（含清空后的空列表）
 */
export const getOrderedRightClickYakScriptsWithMeta = (
  tabKey: ManageRightClickPluginsTabKey | string,
): Promise<{ list: YakScript[]; fromCustom: boolean }> => {
  const tag = getGroupTabByKey(tabKey)?.tag
  return getRemoteValue(RemotePluginGV.RightClickPluginsOrder)
    .then((val) => {
      let customCache: RightClickPluginsOrderCache = {}
      try {
        customCache = val ? JSON.parse(val) : {}
      } catch (error) {
        customCache = {}
      }
      if (!customCache || typeof customCache !== 'object') customCache = {}

      const customNames = customCache[tabKey]
      if (Array.isArray(customNames)) {
        return fetchYakScriptsByCustomNames(customNames.slice(0, UpperLimit), tag).then((list) => ({
          list,
          fromCustom: true,
        }))
      }
      return fetchDefaultYakScriptsByTag(tag).then((list) => ({ list, fromCustom: false }))
    })
    .catch(() => fetchDefaultYakScriptsByTag(tag).then((list) => ({ list, fromCustom: false })))
}
