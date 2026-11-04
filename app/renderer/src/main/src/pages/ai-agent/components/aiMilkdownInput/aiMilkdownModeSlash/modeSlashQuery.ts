import {
  createTriggerQueryReg,
  extractTriggerFilterKeyword,
  getTriggerQueryDeleteRange,
  triggerTextBeforeCursor,
  type TextBetweenDoc,
} from '../triggerQuery'

/** `/` 仅在行首或空白后视为模式触发（排除 URL path、`http://` 等）。 */
export const MODE_SLASH_QUERY_REG = createTriggerQueryReg('/')

const MODE_SLASH_TEXT_BEFORE_LIMIT = 64

/** 从编辑器 slash content / 光标前文中提取 / 后的筛选词。 */
export function extractModeSlashFilterKeyword(content: string | null | undefined): string | null {
  return extractTriggerFilterKeyword(MODE_SLASH_QUERY_REG, content)
}

/** 计算选中模式项时应删除的 `/query` 区间 `[from, to)`。 */
export function getModeSlashQueryDeleteRange(
  cursorFrom: number,
  textBefore: string,
): { from: number; to: number } | null {
  return getTriggerQueryDeleteRange(MODE_SLASH_QUERY_REG, cursorFrom, textBefore)
}

export function modeSlashTextBeforeCursor(doc: TextBetweenDoc, cursorFrom: number): string {
  return triggerTextBeforeCursor(doc, cursorFrom, MODE_SLASH_TEXT_BEFORE_LIMIT)
}
