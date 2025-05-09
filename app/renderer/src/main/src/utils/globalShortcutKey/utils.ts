import {SystemInfo} from "@/constants/hardware"
import {KeyboardToKeyTableMaps, macKeyToUIMaps, NumpadKeyTableMaps, windowsKeyToUIMaps} from "./keyMaps"
import {YakitKeyMod} from "./keyboard"
import {YakitRoute} from "@/enums/yakitRoute"
import emiter from "../eventBus/eventBus"
import {pageEventMaps} from "./events/pageMaps"
import cloneDeep from "lodash/cloneDeep"

// #region 备用方案，通过正则寻找物理按键的逻辑按键值
// TODO: 如果后面使用期间，出现键盘事件明显的卡顿，则使用这个区域里的备用方案进行按键映射
const handleEscapeRegExp = (string: string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}
const handleFindKeyboardByValue = (jsonStr, value) => {
    const escapedValue = handleEscapeRegExp(value)
    const regex = new RegExp(`"([^"]+)":\\s*\\[[^\\]]*"${escapedValue}"[^\\]]*\\]`, "g")
    const match = regex.exec(jsonStr)
    return match ? match[1] : null
}
// #endregion

/** 缓存本次 yakit 打开后的按键 */
const cacheKeyboardToKey: Record<string, string> = {}
/** 将输入的物理按键输出成逻辑按键值 */
const handleKeyboardToKey = (keyboard: KeyboardEvent): string | null => {
    const {key, code} = keyboard
    if (cacheKeyboardToKey[code]) return cacheKeyboardToKey[code]
    if (cacheKeyboardToKey[`${code}-${key}`]) return cacheKeyboardToKey[`${code}-${key}`]

    // 解析是否为部分需要转换的物理按键集合
    const convertCodeValue = NumpadKeyTableMaps[`${code}-${key}`]
    const isConvert = !!convertCodeValue

    // 键盘映射表的键集合
    const keys = Object.keys(KeyboardToKeyTableMaps)
    let hitValue: string | null = null

    for (let el of keys) {
        const keyValue = KeyboardToKeyTableMaps[el]
        if (keyValue.includes(convertCodeValue || code)) {
            hitValue = el
            cacheKeyboardToKey[isConvert ? `${code}-${key}` : code] = el
            break
        }
    }

    return hitValue
}

/** 将键盘事件转换成按键组合信息 */
const convertKeyEventToKeyCombination = (event: KeyboardEvent): string[] | null => {
    const {altKey, ctrlKey, metaKey, shiftKey} = event

    let key = handleKeyboardToKey(event)

    if (key) {
        const keys: string[] = []
        ctrlKey && keys.push(YakitKeyMod.Control)
        shiftKey && keys.push(YakitKeyMod.Shift)
        altKey && keys.push(YakitKeyMod.Alt)
        metaKey && keys.push(YakitKeyMod.Meta)
        if (!keys.includes(key)) keys.push(key)
        return keys
    }
    return null
}

/** 将输入的物理按键转换成键盘信息展示(自动区分了系统) */
export const convertKeyboardToUIKey = (inputKeys: string[]): string | null => {
    const funcKeys = SystemInfo.system === "Darwin" ? macKeyToUIMaps : windowsKeyToUIMaps
    const outputKeys = inputKeys.map((item) => funcKeys[item] || item)
    return outputKeys.join(SystemInfo.system === "Darwin" ? " " : "+")
}

// #region 全局快捷键逻辑
/** 当前显示的页面 */
let currentPageHandler: YakitRoute | null = null
/** 注册页面快捷键监听事件 */
export const registerShortcutKeyHandle = (page: YakitRoute) => {
    currentPageHandler = page
}
/** 注销页面快捷键监听事件 */
export const unregisterShortcutKeyHandle = (page: YakitRoute) => {
    if (currentPageHandler === page) currentPageHandler = null
}

/** 是否激活了快捷键设置页面 */
let isActiveShortcutKeyPage = false
/** 注册页面快捷键监听事件 */
export const setIsActiveShortcutKeyPage = (flag: boolean) => {
    isActiveShortcutKeyPage = flag
}
const getIsActiveShortcutKeyPage = () => {
    return isActiveShortcutKeyPage
}

/** 解析快捷键是否有对应的快捷键事件 */
const parseShortcutKeyEvent = (keys: string[]): string | null => {
    const keyToEvents = pageEventMaps[currentPageHandler || "global"]
    if (!keyToEvents) return null

    const eventKeys = Object.keys(keyToEvents)
    const triggerKeys = cloneDeep(keys).sort().join("")
    for (let key of eventKeys) {
        const info = keyToEvents[key]
        const infoKeys = cloneDeep(info.keys).sort().join("")
        if (infoKeys === triggerKeys) {
            return key
        }
    }

    return null
}

const handleShortcutKey = (ev: KeyboardEvent) => {
    const keys = convertKeyEventToKeyCombination(ev)
    if (!keys) return
    console.log("keys", keys, getIsActiveShortcutKeyPage())

    if (getIsActiveShortcutKeyPage()) {
        console.log(111, `setShortcutKey(${keys.join("|")})`)
        emiter.emit("onGlobalShortcutKey", `setShortcutKey(${keys.join("|")})`)
        return
    } else {
        const eventName = parseShortcutKeyEvent(keys)
        if (!eventName) return
        emiter.emit("onGlobalShortcutKey", eventName)
        return
    }
}
/** 启动全局快捷键监听事件 */
export const startShortcutKeyMonitor = () => {
    document.addEventListener("keydown", handleShortcutKey)
}
// #endregion
