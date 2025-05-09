import {YakitKeyBoard} from "../keyboard"
import {ShortcutKeyEventInfo} from "../type"

export enum GlobalShortcutKey {
    /** 截图 */
    Screenshot = "screenshot"
}

export const globalShortcutKeyEvents: Record<GlobalShortcutKey, ShortcutKeyEventInfo> = {
    screenshot: {
        name: "截图",
        keys: [YakitKeyBoard.Meta, YakitKeyBoard.Alt, YakitKeyBoard.KEY_B],
    }
}
