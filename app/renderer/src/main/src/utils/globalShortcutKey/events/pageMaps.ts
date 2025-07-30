import {
    getGlobalShortcutKeyEvents,
    getStorageGlobalShortcutKeyEvents,
    resetGlobalShortcutKeyEvents,
    setStorageGlobalShortcutKeyEvents
} from "./global"
import {
    getHttpFuzzerShortcutKeyEvents,
    getStorageHttpFuzzerShortcutKeyEvents,
    resetHttpFuzzerShortcutKeyEvents,
    setStorageHttpFuzzerShortcutKeyEvents
} from "./page/httpFuzzer"
import {
    getPluginHubShortcutKeyEvents,
    getStoragePluginHubShortcutKeyEvents,
    resetPluginHubShortcutKeyEvents,
    setStoragePluginHubShortcutKeyEvents
} from "./page/pluginHub"
import {YakitRoute} from "@/enums/yakitRoute"
import {
    getAuditCodeShortcutKeyEvents,
    getStorageAuditCodeShortcutKeyEvents,
    resetAuditCodeShortcutKeyEvents,
    setStorageAuditCodeShortcutKeyEvents
} from "./page/yakRunnerAuditCode"
import {
    getStorageYakRunnerShortcutKeyEvents,
    getYakRunnerShortcutKeyEvents,
    resetYakRunnerShortcutKeyEvents,
    setStorageYakRunnerShortcutKeyEvents
} from "./page/yakRunner"
import {
    getStorageYakitMultipleShortcutKeyEvents,
    getYakitMultipleShortcutKeyEvents,
    resetYakitMultipleShortcutKeyEvents,
    setStorageYakitMultipleShortcutKeyEvents
} from "./multiple/yakitMultiple"
import {
    getChatCSShortcutKeyEvents,
    getStorageChatCSShortcutKeyEvents,
    resetChatCSShortcutKeyEvents,
    setStorageChatCSShortcutKeyEvents
} from "./page/chatCS"
import {PRODUCT_RELEASE_EDITION} from "@/utils/envfile"
import { getStorageYakEditorShortcutKeyEvents, getYakEditorShortcutKeyEvents, resetYakEditorShortcutKeyEvents, setStorageYakEditorShortcutKeyEvents } from "./page/yakEditor"

export interface ShortcutKeyEventInfo {
    name: string
    keys: string[]
    /** 单个快捷键显示范围（Yakit? IRify? ...） */
    scopeShow?: PRODUCT_RELEASE_EDITION[]
}
interface PageToEventInfo {
    /** 获取快捷键事件集合 */
    getEvents: () => Record<string, ShortcutKeyEventInfo>
    /** 重置快捷键 */
    resetEvents: () => void
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
    // WebFuzzer
    HTTPFuzzer = YakitRoute.HTTPFuzzer,
    // 插件仓库
    PluginHub = YakitRoute.Plugin_Hub,

    // 代码审计
    YakRunner_Audit_Code = YakitRoute.YakRunner_Audit_Code,
    // YakRunner
    YakRunner = YakitRoute.YakScript,
    // ChatCS
    ChatCS = "chat-cs",
    // 编辑器
    YakEditor = "yak-editor",

    // 多页面快捷键（多页面与页面属于同级绑定）
    YakitMultiple = "yakit-multiple"
}
export type ShortcutKeyPageName = `${ShortcutKeyPage}`

const {Yakit, EnpriTrace, IRify} = PRODUCT_RELEASE_EDITION
/** 存放全局和所有页面的快捷键映射事件集合 */
export const pageEventMaps: Record<`${ShortcutKeyPage}`, PageToEventInfo> = {
    global: {
        getEvents: getGlobalShortcutKeyEvents,
        resetEvents: resetGlobalShortcutKeyEvents,
        getStorage: getStorageGlobalShortcutKeyEvents,
        setStorage: setStorageGlobalShortcutKeyEvents
    },
    httpFuzzer: {
        getEvents: getHttpFuzzerShortcutKeyEvents,
        resetEvents: resetHttpFuzzerShortcutKeyEvents,
        getStorage: getStorageHttpFuzzerShortcutKeyEvents,
        setStorage: setStorageHttpFuzzerShortcutKeyEvents,
        scopeShow: [Yakit, EnpriTrace]
    },
    "plugin-hub": {
        getEvents: getPluginHubShortcutKeyEvents,
        resetEvents: resetPluginHubShortcutKeyEvents,
        getStorage: getStoragePluginHubShortcutKeyEvents,
        setStorage: setStoragePluginHubShortcutKeyEvents,
        scopeShow: [Yakit, EnpriTrace]
    },
    "yakrunner-audit-code": {
        getEvents: getAuditCodeShortcutKeyEvents,
        resetEvents: resetAuditCodeShortcutKeyEvents,
        getStorage: getStorageAuditCodeShortcutKeyEvents,
        setStorage: setStorageAuditCodeShortcutKeyEvents,
        scopeShow: [IRify]
    },
    yakScript: {
        getEvents: getYakRunnerShortcutKeyEvents,
        resetEvents: resetYakRunnerShortcutKeyEvents,
        getStorage: getStorageYakRunnerShortcutKeyEvents,
        setStorage: setStorageYakRunnerShortcutKeyEvents
        // scopeShow: [IRify]
    },
    "chat-cs": {
        getEvents: getChatCSShortcutKeyEvents,
        resetEvents: resetChatCSShortcutKeyEvents,
        getStorage: getStorageChatCSShortcutKeyEvents,
        setStorage: setStorageChatCSShortcutKeyEvents,
        scopeShow: [Yakit, EnpriTrace]
    },
    "yak-editor": {
        getEvents: getYakEditorShortcutKeyEvents,
        resetEvents: resetYakEditorShortcutKeyEvents,
        getStorage: getStorageYakEditorShortcutKeyEvents,
        setStorage: setStorageYakEditorShortcutKeyEvents,
        scopeShow: [Yakit, EnpriTrace]
    },
    "yakit-multiple": {
        getEvents: getYakitMultipleShortcutKeyEvents,
        resetEvents: resetYakitMultipleShortcutKeyEvents,
        getStorage: getStorageYakitMultipleShortcutKeyEvents,
        setStorage: setStorageYakitMultipleShortcutKeyEvents,
        scopeShow: [Yakit, EnpriTrace]
    }
}
