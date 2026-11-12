import type { KnowledgeBaseItem } from '@/pages/KnowledgeBase/hooks/useKnowledgeBase'
import { getPathBaseName } from '@/utils/str'
import { getToolDisplayName } from '../../aiToolList/toolDisplayName'
import type { AIFileMaterialData } from '../../type/aiChat'
import type { AIFocus, AIForge } from '../../type/forge'
import type { AITool } from '../../type/aiTool'
import { browserInstanceMentionName } from '../../browserInstances/browserInstanceStore'
import type { AIBrowserInstance } from '../../browserInstances/browserInstanceStore'
import type { BrowserMentionRow, MentionRow, ResourceMentionRow } from './type'

/** 在引用名称、展示名称、描述和原名中匹配已转为小写的关键词。 */
export const matchesMentionKeyword = (row: MentionRow, keyword: string) =>
  [row.name, row.row.name, row.row.description, row.originalName].some((value) =>
    value?.toLowerCase().includes(keyword),
  )

/** 技能优先显示别名，同时保留原名供搜索和引用。 */
export const skillMentionRow = (item: AIForge): ResourceMentionRow => ({
  type: 'forge',
  id: String(item.Id),
  name: item.ForgeVerboseName || item.ForgeName,
  originalName: item.ForgeName,
  row: { kind: 'forge', description: item.Description },
})

/** 工具通过 ID 标识，按界面语言显示工具名，同时保留引用原名。 */
export const toolMentionRow = (item: AITool, language: string): ResourceMentionRow => ({
  type: 'tool',
  id: String(item.ID),
  name: getToolDisplayName(item.VerboseNameI18n, language, item.VerboseName || item.Name),
  originalName: item.Name,
  row: { kind: 'tool', description: item.Description },
})

/** 按 ID 查找知识库在完整目录中的位置，让筛选前后的图标一致。 */
export const knowledgeMentionRow = (item: KnowledgeBaseItem, catalog: KnowledgeBaseItem[]): ResourceMentionRow => {
  const knowledgeIndex = catalog.findIndex((entry) => String(entry.ID) === String(item.ID))
  return {
    type: 'knowledgeBase',
    id: String(item.ID),
    name: item.KnowledgeBaseName,
    row: {
      kind: 'knowledgeBase',
      description: item.KnowledgeBaseDescription || item.Description,
      knowledgeIndex: knowledgeIndex < 0 ? undefined : knowledgeIndex,
    },
  }
}

/** 列表展示文件或目录的末级名称，引用保留完整路径，并标记附件来源。 */
export const fileMentionRow = (item: AIFileMaterialData, attachment = false): ResourceMentionRow => ({
  type: item.isFolder ? 'folder' : 'file',
  id: item.path,
  name: item.path,
  mentionSource: attachment ? 'attachment' : undefined,
  row: {
    kind: item.isFolder ? 'folder' : 'file',
    name: getPathBaseName(item.name || item.path),
  },
})

/** 引用使用浏览器实例标识，列表优先展示当前页面的标题和 URL。 */
export const browserMentionRow = (instance: AIBrowserInstance): BrowserMentionRow => ({
  type: 'browser',
  id: instance.id,
  name: browserInstanceMentionName(instance),
  instance,
  row: {
    kind: 'browser',
    name: instance.tab?.title || instance.name,
    description: instance.tab?.url || (instance.online ? undefined : instance.origin),
  },
})

/** 中文界面优先展示场景的中文名称和描述，按场景原名判断是否为当前场景。 */
export const sceneMentionRow = (
  item: Pick<AIFocus, 'Name'> & Partial<AIFocus>,
  chinese: boolean,
  current?: string,
): ResourceMentionRow => ({
  type: 'focusMode',
  id: item.Name,
  name: item.Name,
  row: {
    kind: 'focusMode',
    name: (chinese && item.VerboseNameZh) || item.Name,
    description: (chinese && item.DescriptionZh) || item.Description,
    current: item.Name === current,
  },
})
