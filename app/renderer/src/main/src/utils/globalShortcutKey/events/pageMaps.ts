import {YakitRoute} from "@/enums/yakitRoute"
import {globalShortcutKeyEvents} from "./global"
import {PluginHubShortcutKeyEvents} from "./pluginHub"
import {ShortcutKeyEventInfo} from "../type"

/** 存放全局和所有页面的快捷键映射事件集合 */
// 这里应该是 YakitRoute | "global" 的联合类型，但是因为TS的报错问题，只能先写成 string，后续记得调整回来
export const pageEventMaps: Record<string, Record<string, ShortcutKeyEventInfo>> = {
    global: globalShortcutKeyEvents,
    "plugin-hub": PluginHubShortcutKeyEvents
}
