import {
    getGlobalShortcutKeyEvents,
    getStorageGlobalShortcutKeyEvents,
    setStorageGlobalShortcutKeyEvents
} from "./global"
import {
    getPluginHubShortcutKeyEvents,
    getStoragePluginHubShortcutKeyEvents,
    setStoragePluginHubShortcutKeyEvents
} from "./pluginHub"
import {YakitRoute} from "@/enums/yakitRoute"

export interface ShortcutKeyEventInfo {
    name: string
    keys: string[]
}
interface PageToEventInfo {
    /** 获取快捷键事件集合 */
    getEvents: () => Record<string, ShortcutKeyEventInfo>
    /** 获取用户缓存的快捷键事件集合 */
    getStorage: () => void
    /** 缓存用户自定义的快捷键 */
    setStorage: (events: Record<string, ShortcutKeyEventInfo>) => void
}

/** 可配置快捷键的页面 */
export enum ShortcutKeyPage {
    // 全局快捷键
    Global = "global",

    // 页面快捷键`

    // 插件仓库
    PluginHub = YakitRoute.Plugin_Hub
}
export type ShortcutKeyPageName = `${ShortcutKeyPage}`

/** 存放全局和所有页面的快捷键映射事件集合 */
export const pageEventMaps: Record<ShortcutKeyPage, PageToEventInfo> = {
    global: {
        getEvents: getGlobalShortcutKeyEvents,
        getStorage: getStorageGlobalShortcutKeyEvents,
        setStorage: setStorageGlobalShortcutKeyEvents
    },
    "plugin-hub": {
        getEvents: getPluginHubShortcutKeyEvents,
        getStorage: getStoragePluginHubShortcutKeyEvents,
        setStorage: setStoragePluginHubShortcutKeyEvents
    }
}
