export interface MentionPointerModifiers {
  ctrlKey?: boolean
  metaKey?: boolean
  shiftKey?: boolean
}

/**
 * Ctrl/Cmd 切换单项，Shift 按锚点选中一段。
 * 返回 null 表示普通点击，调用方应立即提交这一项。
 */
export const resolveMentionPointerSelect = (params: {
  orderedKeys: string[]
  checkedKeys: string[]
  anchorKey?: string
  clickedKey: string
  modifiers: MentionPointerModifiers
}): { checkedKeys: string[]; anchorKey: string } | null => {
  const { orderedKeys, checkedKeys, clickedKey, modifiers } = params
  const toggle = !!(modifiers.ctrlKey || modifiers.metaKey) && !modifiers.shiftKey
  const range = !!modifiers.shiftKey
  if (!toggle && !range) return null

  const inOrder = (keys: string[]) => {
    const picked = new Set(keys)
    return orderedKeys.filter((key) => picked.has(key))
  }

  if (toggle) {
    const next = checkedKeys.includes(clickedKey)
      ? checkedKeys.filter((key) => key !== clickedKey)
      : [...checkedKeys, clickedKey]
    return { checkedKeys: inOrder(next), anchorKey: clickedKey }
  }

  const anchor = params.anchorKey && orderedKeys.includes(params.anchorKey) ? params.anchorKey : clickedKey
  const start = orderedKeys.indexOf(anchor)
  const end = orderedKeys.indexOf(clickedKey)
  if (start < 0 || end < 0) return { checkedKeys: [clickedKey], anchorKey: clickedKey }
  const [from, to] = start <= end ? [start, end] : [end, start]
  const rangeKeys = orderedKeys.slice(from, to + 1)
  const next = modifiers.ctrlKey || modifiers.metaKey ? [...checkedKeys, ...rangeKeys] : rangeKeys
  return { checkedKeys: inOrder(next), anchorKey: anchor }
}
