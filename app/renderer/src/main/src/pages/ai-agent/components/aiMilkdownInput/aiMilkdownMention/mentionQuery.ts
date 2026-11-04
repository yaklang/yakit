import {
  createTriggerQueryReg,
  extractTriggerFilterKeyword,
  getTriggerQueryDeleteRange,
  triggerTextBeforeCursor,
  type TextBetweenDoc,
} from '../triggerQuery'

/** `@` 仅在行首或空白后视为 mention 触发（排除邮箱 `a@b.com`、URL 内 `@` 等）。 */
export const MENTION_QUERY_REG = createTriggerQueryReg('@')

const MENTION_TEXT_BEFORE_LIMIT = 500

/** 从编辑器 slash content / 光标前文中提取 @ 后的筛选词。 */
export function extractMentionFilterKeyword(content: string | null | undefined): string | null {
  return extractTriggerFilterKeyword(MENTION_QUERY_REG, content)
}

/** 计算选中 mention 时应删除的 `@query` 区间 `[from, to)`。 */
export function getMentionQueryDeleteRange(
  cursorFrom: number,
  textBefore: string,
): { from: number; to: number } | null {
  return getTriggerQueryDeleteRange(MENTION_QUERY_REG, cursorFrom, textBefore)
}

export function mentionTextBeforeCursor(doc: TextBetweenDoc, cursorFrom: number): string {
  return triggerTextBeforeCursor(doc, cursorFrom, MENTION_TEXT_BEFORE_LIMIT)
}
