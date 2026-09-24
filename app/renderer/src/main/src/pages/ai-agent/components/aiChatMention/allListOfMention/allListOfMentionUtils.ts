import { AIMentionTabsEnum } from '../../../defaultConstant'

export type AllMentionSectionDef = {
  value: AIMentionTabsEnum
  label: string
}

export type AllMentionFlatItemData = {
  rowKey: string
  section: AIMentionTabsEnum
  id: string
  name: string
}

export type AllMentionSectionLists = {
  forgeList: Array<{ Id: string | number; ForgeVerboseName?: string; ForgeName?: string }>
  toolList: Array<{ ID: string | number; VerboseName?: string; Name?: string }>
  knowledgeList: Array<{ ID: string | number; KnowledgeBaseName?: string }>
  focusList: Array<{ Name?: string; VerboseNameZh?: string }>
  browserList: Array<{ id: string; name: string }>
}

/** 按展示名做前端二次收紧；空关键词原样返回 */
export function filterByDisplayNameIncludes<T>(items: T[], getName: (item: T) => string, keyWord: string): T[] {
  const keyword = keyWord.trim().toLowerCase()
  if (!keyword) return items
  return items.filter((item) => getName(item).toLowerCase().includes(keyword))
}

/**
 * 关键词异步刷新竞态：请求序号已过期或组件已卸载时，应丢弃本次结果（不写 state / 不回调父组件）。
 */
export function shouldDiscardStaleResult(seq: number, currentSeq: number, mounted: boolean): boolean {
  return seq !== currentSeq || !mounted
}

/**
 * 与知识库 Tab 一致：占位项恒定置顶，仅过滤真实知识库。
 * 占位项与真实库的 ID 类型可能不同（string vs number），故分两个泛型。
 */
export function buildMentionKnowledgeList<
  TPlaceholder extends { KnowledgeBaseName?: string },
  TBase extends { KnowledgeBaseName?: string },
>(placeholder: TPlaceholder, bases: TBase[], keyWord: string): Array<TPlaceholder | TBase> {
  const filtered = filterByDisplayNameIncludes(bases, (it) => it?.KnowledgeBaseName || '', keyWord)
  return [placeholder, ...filtered]
}

/** All 视图分区拼装：无条目的分区剔除 */
export function buildAllMentionSections(
  sections: AllMentionSectionDef[],
  lists: AllMentionSectionLists,
): Array<AllMentionSectionDef & { items: AllMentionFlatItemData[] }> {
  return sections
    .map((section) => {
      let items: AllMentionFlatItemData[] = []
      switch (section.value) {
        case AIMentionTabsEnum.Forge_Name:
          items = lists.forgeList.map((item) => ({
            rowKey: `all-forge-${item.Id}`,
            section: section.value,
            id: `${item.Id}`,
            name: item.ForgeVerboseName || item.ForgeName || '',
          }))
          break
        case AIMentionTabsEnum.Browser:
          items = lists.browserList.map((item) => ({
            rowKey: `all-browser-${item.id}`,
            section: section.value,
            id: item.id,
            name: item.name,
          }))
          break
        case AIMentionTabsEnum.Tool:
          items = lists.toolList.map((item) => ({
            rowKey: `all-tool-${item.ID}`,
            section: section.value,
            id: `${item.ID}`,
            name: item.VerboseName || item.Name || '',
          }))
          break
        case AIMentionTabsEnum.KnowledgeBase:
          items = lists.knowledgeList.map((item) => ({
            rowKey: `all-kb-${item.ID}`,
            section: section.value,
            id: `${item.ID}`,
            name: item.KnowledgeBaseName || '',
          }))
          break
        case AIMentionTabsEnum.FocusMode:
          items = lists.focusList.map((item) => ({
            rowKey: `all-focus-${item.Name}`,
            section: section.value,
            id: `${item.Name || ''}`,
            name: item.VerboseNameZh || item.Name || '',
          }))
          break
        default:
          break
      }
      return { ...section, items }
    })
    .filter((section) => section.items.length > 0)
}
