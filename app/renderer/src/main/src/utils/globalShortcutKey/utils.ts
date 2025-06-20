import {SystemInfo} from "@/constants/hardware"
import {KeyboardToKeyTableMaps, macKeyToUIMaps, NumpadKeyTableMaps, windowsKeyToUIMaps} from "./keyMaps"
import {YakitKeyMod} from "./keyboard"
import emiter from "../eventBus/eventBus"
import {pageEventMaps, ShortcutKeyPageName} from "./events/pageMaps"

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
export const convertKeyEventToKeyCombination = (event: KeyboardEvent): string[] | null => {
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

/** 将UI按键按照逻辑内循序进行排序后输出 */
export const sortKeysCombination = (keys: string[]): string[] => {
    const newArr = keys.map((item) => {
        if (item === YakitKeyMod.CtrlCmd) {
            return SystemInfo.system === "Darwin" ? YakitKeyMod.Meta : YakitKeyMod.Control
        }
        return item
    })

    newArr.sort((a, b) => {
        const priority = {Control: 1, Shift: 2, Alt: 3, Meta: 4}
        const aPriority = priority[a] ?? 5
        const bPriority = priority[b] ?? 5
        return aPriority - bPriority
    })
    return newArr
}

/** 将输入的物理按键转换成键盘信息展示(自动区分了系统) */
export const convertKeyboardToUIKey = (inputKeys: string[]): string | null => {
    const inputs = sortKeysCombination(inputKeys)
    const funcKeys = SystemInfo.system === "Darwin" ? macKeyToUIMaps : windowsKeyToUIMaps
    const outputKeys = inputs.map((item) => funcKeys[item] || item)
    return outputKeys.join(SystemInfo.system === "Darwin" ? " " : "+")
}

// #region 全局快捷键逻辑
/** 当前显示的页面 */
let currentPageHandler: ShortcutKeyPageName | null = null
/** 注册页面快捷键监听事件 */
export const registerShortcutKeyHandle = (page: ShortcutKeyPageName) => {
    currentPageHandler = page
}
/** 注销页面快捷键监听事件(多页面事件由于异步互相影响不参与注销) */
export const unregisterShortcutKeyHandle = (page: ShortcutKeyPageName) => {
    if (currentPageHandler === page) currentPageHandler = null
}
/** 当前聚焦的页面 */
let currentFocus: string | null = null
/** 注册聚焦监听事件 */
export const registerShortcutFocusHandle = (page: string) => {
    currentFocus = page
}
/** 注销聚焦监听事件 */
export const unregisterShortcutFocusHandle = (page: string) => {
    if (currentFocus === page) currentFocus = null
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
export const parseShortcutKeyEvent = (keys: string[]): string | null => {
    try {
        const triggerKeys = sortKeysCombination(keys).join("")
        const pageKeyInfo = pageEventMaps[currentPageHandler || "global"]

        if (!pageKeyInfo) return null
        const pageEvents = pageKeyInfo.getEvents()
        const pageEventKeys = Object.keys(pageEvents)
        for (let item of pageEventKeys) {
            const pageKeys = sortKeysCombination(pageEvents[item].keys).join("")
            if (pageKeys === triggerKeys) {
                return item
            }
        }

        if (currentPageHandler && currentPageHandler !== "global") {
            const globalKeyInfo = pageEventMaps.global
            if (!globalKeyInfo) return null
            const globalEvents = globalKeyInfo.getEvents()
            const globalEventKeys = Object.keys(globalEvents)
            for (let item of globalEventKeys) {
                const globalKeys = sortKeysCombination(globalEvents[item].keys).join("")
                if (globalKeys === triggerKeys) {
                    return item
                }
            }
        }
    } catch (error) {}

    return null
}

export const handleShortcutKey = (ev: KeyboardEvent) => {
    const keys = convertKeyEventToKeyCombination(ev)
    if (!keys) return
    if (getIsActiveShortcutKeyPage()) {
        emiter.emit("onGlobalShortcutKey", `setShortcutKey(${keys.join("|")})`)
        return
    } else {
        const eventName = parseShortcutKeyEvent(keys)
        if (!eventName) return
        emiter.emit(
            "onGlobalShortcutKey",
            JSON.stringify({
                eventName,
                currentFocus
            })
        )
        return
    }
}

/** 启动全局快捷键监听事件 */
export const startShortcutKeyMonitor = () => {
    document.addEventListener("keydown", handleShortcutKey)
}

/** 移除全局快捷键监听事件 */
export const stopShortcutKeyMonitor = () => {
    document.removeEventListener("keydown", handleShortcutKey)
}

// #endregion
