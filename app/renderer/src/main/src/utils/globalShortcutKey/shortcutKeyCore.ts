import { SystemInfo } from '@/constants/hardware'
import {
  KeyboardToKeyTableMaps,
  keyToSameUIMaps,
  macKeyToUIMaps,
  NumpadKeyTableMaps,
  windowsKeyToUIMaps,
} from './keyMaps'
import { YakitKeyMod } from './keyboard'

// #region 备用方案，通过正则寻找物理按键的逻辑按键值
// TODO: 如果后面使用期间，出现键盘事件明显的卡顿，则使用这个区域里的备用方案进行按键映射
const handleEscapeRegExp = (string: string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
const handleFindKeyboardByValue = (jsonStr, value) => {
  const escapedValue = handleEscapeRegExp(value)
  const regex = new RegExp(`"([^"]+)":\\s*\\[[^\\]]*"${escapedValue}"[^\\]]*\\]`, 'g')
  const match = regex.exec(jsonStr)
  return match ? match[1] : null
}
// #endregion

/** 缓存本次 yakit 打开后的按键 */
const cacheKeyboardToKey: Record<string, string> = {}
/** 将输入的物理按键输出成逻辑按键值 */
const handleKeyboardToKey = (keyboard: KeyboardEvent): string | null => {
  const { key, code } = keyboard
  if (cacheKeyboardToKey[code]) return cacheKeyboardToKey[code]
  if (cacheKeyboardToKey[`${code}-${key}`]) return cacheKeyboardToKey[`${code}-${key}`]

  // 解析是否为部分需要转换的物理按键集合
  const convertCodeValue = NumpadKeyTableMaps[`${code}-${key}`]
  const isConvert = !!convertCodeValue

  // 键盘映射表的键集合
  const keys = Object.keys(KeyboardToKeyTableMaps)
  let hitValue: string | null = null

  for (const el of keys) {
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
  const { altKey, ctrlKey, metaKey, shiftKey } = event

  const key = handleKeyboardToKey(event)

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
      return SystemInfo.system === 'Darwin' ? YakitKeyMod.Meta : YakitKeyMod.Control
    }
    return item
  })

  newArr.sort((a, b) => {
    const priority = { Control: 1, Shift: 2, Alt: 3, Meta: 4 }
    const aPriority = priority[a] ?? 5
    const bPriority = priority[b] ?? 5
    return aPriority - bPriority
  })
  return newArr
}

/** 将输入的物理按键转换成键盘信息展示(自动区分了系统) */
export const convertKeyboardToUIKey = (inputKeys: string[]): string | null => {
  const inputs = sortKeysCombination(inputKeys)
  const funcKeys = SystemInfo.system === 'Darwin' ? macKeyToUIMaps : windowsKeyToUIMaps
  const outputKeys = inputs.map((item) => keyToSameUIMaps[item] || funcKeys[item] || item)
  return outputKeys.join(SystemInfo.system === 'Darwin' ? ' ' : '+')
}
