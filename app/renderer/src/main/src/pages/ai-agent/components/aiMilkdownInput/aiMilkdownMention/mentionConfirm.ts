import type { AIChatMentionSelectEntry } from '../../aiChatMention/type'
import type { AIMentionCommandParams } from './aiMentionPlugin'

export const toMentionCommandParams = (item: AIChatMentionSelectEntry): AIMentionCommandParams => ({
  mentionType: item.type,
  mentionId: item.value?.id || '0',
  mentionName: item.value?.name || '',
  name: item.value?.originalName,
  mentionSource: item.value?.mentionSource,
  knowledgeIndex: item.value?.knowledgeIndex,
})

const isForgeTemplate = (item: AIChatMentionSelectEntry) =>
  item.type === 'forge' && (item.value?.forgeType === 'yak' || item.value?.forgeType === 'config')

export const shouldStartPlanForMentions = (items: AIChatMentionSelectEntry[], enablePlan: boolean) =>
  !enablePlan && items.some(isForgeTemplate)

/** 多选确认：普通提及批量插入（命令会删掉 @query），场景只记录最后一项。 */
export const planMentionConfirm = (items: AIChatMentionSelectEntry[]) => {
  const mentions = items
    .filter((item) => item.type !== 'focusMode')
    .map(toMentionCommandParams)
    .filter((item) => item.mentionName.trim())
  const focusItem = [...items].reverse().find((item) => item.type === 'focusMode')
  return {
    mentions,
    focus: focusItem ? toMentionCommandParams(focusItem) : undefined,
    // 已有批量插入时 @query 已经删掉，再删光标前一个字符会吃掉刚插入的空格。
    removeTrigger: mentions.length === 0 && !!focusItem,
  }
}
