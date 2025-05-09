import {YakitKeyBoard} from "../keyboard"
import {ShortcutKeyEventInfo} from "../type"

export enum PluginHubShortcutKey {
    /** 新建插件 */
    NewPlugin = "newPlugin"
}

export const PluginHubShortcutKeyEvents: Record<PluginHubShortcutKey, ShortcutKeyEventInfo> = {
    newPlugin: {
        name: "新建插件",
        keys: [YakitKeyBoard.Meta, YakitKeyBoard.Alt, YakitKeyBoard.KEY_B]
    }
}
