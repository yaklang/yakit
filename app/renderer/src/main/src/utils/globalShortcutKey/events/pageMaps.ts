import {
    getGlobalShortcutKeyEvents,
    getStorageGlobalShortcutKeyEvents,
    setStorageGlobalShortcutKeyEvents
} from "./global"
import {
    getPluginHubShortcutKeyEvents,
    getStoragePluginHubShortcutKeyEvents,
    setStoragePluginHubShortcutKeyEvents
} from "./page/pluginHub"
import {YakitRoute} from "@/enums/yakitRoute"
import {
    getAuditCodeShortcutKeyEvents,
    getStorageAuditCodeShortcutKeyEvents,
    setStorageAuditCodeShortcutKeyEvents
} from "./page/yakRunnerAuditCode"
import {
    getStorageYakRunnerShortcutKeyEvents,
    getYakRunnerShortcutKeyEvents,
    setStorageYakRunnerShortcutKeyEvents
} from "./page/yakRunner"
import {
    getAddYakitScriptShortcutKeyEvents,
    getStorageAddYakitScriptShortcutKeyEvents,
    setStorageAddYakitScriptShortcutKeyEvents
} from "./page/addYakitScript"
import {
    getStorageYakitScriptFocusShortcutKeyEvents,
    getYakitScriptFocusShortcutKeyEvents,
    setStorageYakitScriptFocusShortcutKeyEvents
} from "./focus/yakitScriptFocus"
import {
    getChatCSShortcutKeyEvents,
    getStorageChatCSShortcutKeyEvents,
    setStorageChatCSShortcutKeyEvents
} from "./page/chatCS"
import {PRODUCT_RELEASE_EDITION} from "@/utils/envfile"

export interface ShortcutKeyEventInfo {
    name: string
    keys: string[]
    /** 单个快捷键显示范围（Yakit? IRify? ...） */
    scopeShow?: PRODUCT_RELEASE_EDITION[]
}
interface PageToEventInfo {
    /** 获取快捷键事件集合 */
    getEvents: () => Record<string, ShortcutKeyEventInfo>
    /** 获取用户缓存的快捷键事件集合 */
    getStorage: () => void
    /** 缓存用户自定义的快捷键 */
    setStorage: (events: Record<string, ShortcutKeyEventInfo>) => void

    /** 非页面快捷键出现的场景（Yakit? IRify? ...） 无限制则默认显示*/
    scopeShow?: PRODUCT_RELEASE_EDITION[]
}

/** 可配置快捷键的页面 */
export enum ShortcutKeyPage {
    // 全局快捷键
    Global = "global",

    /* 页面快捷键 */
    // 插件仓库
    PluginHub = YakitRoute.Plugin_Hub,

    // 新建插件
    AddYakitScript = YakitRoute.AddYakitScript,
    // 代码审计
    YakRunner_Audit_Code = YakitRoute.YakRunner_Audit_Code,
    // YakRunner
    YakRunner = YakitRoute.YakScript,
    // ChatCS
    ChatCS = "chat-cs",

    /* 焦点快捷键（焦点与页面属于同级绑定） */
    // 插件相关焦点事件
    YakitScriptFocus = "yakit-script-focus"
}
export type ShortcutKeyPageName = `${ShortcutKeyPage}`

const {Yakit, EnpriTrace,IRify} = PRODUCT_RELEASE_EDITION
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
        setStorage: setStoragePluginHubShortcutKeyEvents,
        scopeShow: [Yakit, EnpriTrace]
    },
    "add-yakit-script": {
        getEvents: getAddYakitScriptShortcutKeyEvents,
        getStorage: getStorageAddYakitScriptShortcutKeyEvents,
        setStorage: setStorageAddYakitScriptShortcutKeyEvents,
        scopeShow: [Yakit, EnpriTrace]
    },
    "yakrunner-audit-code": {
        getEvents: getAuditCodeShortcutKeyEvents,
        getStorage: getStorageAuditCodeShortcutKeyEvents,
        setStorage: setStorageAuditCodeShortcutKeyEvents,
        scopeShow: [IRify]
    },
    yakScript: {
        getEvents: getYakRunnerShortcutKeyEvents,
        getStorage: getStorageYakRunnerShortcutKeyEvents,
        setStorage: setStorageYakRunnerShortcutKeyEvents,
        scopeShow: [IRify]
    },
    "chat-cs": {
        getEvents: getChatCSShortcutKeyEvents,
        getStorage: getStorageChatCSShortcutKeyEvents,
        setStorage: setStorageChatCSShortcutKeyEvents,
        scopeShow: [Yakit, EnpriTrace]
    },
    "yakit-script-focus": {
        getEvents: getYakitScriptFocusShortcutKeyEvents,
        getStorage: getStorageYakitScriptFocusShortcutKeyEvents,
        setStorage: setStorageYakitScriptFocusShortcutKeyEvents,
        scopeShow: [Yakit, EnpriTrace]
    }
}
