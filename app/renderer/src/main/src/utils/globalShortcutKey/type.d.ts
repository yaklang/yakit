import {YakitRoute} from "@/enums/yakitRoute"
import {YakitKeyBoard} from "./keyboard"

export interface ShortcutKeyEventInfo {
    name: string
    keys: YakitKeyBoard[]
}
