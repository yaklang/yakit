import { parseResourceReferenceIds } from '../../components/aiMilkdownInput/aiMilkdownResourceReference/resourceReferenceIds'
import groupBy from 'lodash/groupBy'
import {
  BookOpenTextOutlined,
  BoxOutlined,
  ChromeOutlined,
  FolderOpenOutlined,
  PaperClipOutlined,
  PuzzleOutlined,
} from '@yakit-libs/yakit-ui-icons/outline'
import type { TFunction } from '@/i18n/useI18nNamespaces'
import emiter from '@/utils/eventBus/eventBus'
import { targetIcon } from '@/pages/KnowledgeBase/utils'
import {
  ColorsFileSystemIcon,
  ColorsFlowIcon,
  ColorsKnowledgeBaseIcon,
  ColorsRiskIcon,
  ColorsSkillIcon,
  ColorsToolIcon,
} from '../../aiChatWelcome/icon'
import { AIAgentTabListEnum, AIMentionTabsEnum, AITabsEnum } from '../../defaultConstant'
import { showAIAgentSidebarTab } from '../../aiAgentTabNavigation'
import { MAX_ATTACHMENTS_PER_BATCH } from '../type'
import type { MaterialSummaryGroup, MaterialSummaryRow } from './materialSummary/type'
import type { AIAddMaterialsPopoverProps, MaterialMenuItem, MaterialPanel } from './type'

interface MaterialMenuOptions extends Pick<
  AIAddMaterialsPopoverProps,
  'mentions' | 'resourceIds' | 'selectedResourceIds'
> {
  t: TFunction
  attachmentCount: number
  browserCount: number
  currentFocusMode?: string
  addAttachments: (type: 'file' | 'folder') => void
  close: () => void
}

/** 生成各类资料的菜单配置，包括文案、图标、已添加数量和点击行为。 */
export const getMaterialMenuItems = ({
  mentions,
  resourceIds,
  selectedResourceIds,
  t,
  attachmentCount,
  browserCount,
  currentFocusMode,
  addAttachments,
  close,
}: MaterialMenuOptions) => {
  const countMentions = (type: string) => mentions.filter((item) => item.mentionType === type).length

  const openWorkspaceTab = (key: AITabsEnum) => {
    close()
    emiter.emit('switchAIActTab', JSON.stringify({ key }))
  }

  const getResourceMenu = (type: keyof typeof resourceIds) => {
    const isHttp = type === 'http'
    const key = isHttp ? AITabsEnum.HTTP : AITabsEnum.Risk
    const selected = selectedResourceIds[type]
    return {
      action: () => openWorkspaceTab(key),
      summaryAction: selected.length
        ? () => {
            close()
            const filter = isHttp ? { showSelectedHttpFlows: true } : { showSelectedRisks: true }
            emiter.emit('switchAIActTab', JSON.stringify({ key, ...filter }))
          }
        : undefined,
      external: true,
      count: parseResourceReferenceIds([...resourceIds[type], ...selected]).length,
    }
  }

  const openSidebarTab = (active: AIAgentTabListEnum) => {
    close()
    showAIAgentSidebarTab(active)
  }

  return {
    attachments: {
      label: t('AIAddMaterialsPopover.attachment'),
      description: t('AIAddMaterialsPopover.attachmentHint', { max: MAX_ATTACHMENTS_PER_BATCH }),
      icon: <PaperClipOutlined size={16} />,
      action: () => addAttachments('file'),
    },
    addFolder: {
      label: t('AIAddMaterialsPopover.addFolder'),
      description: t('AIAddMaterialsPopover.attachmentHint', { max: MAX_ATTACHMENTS_PER_BATCH }),
      icon: <FolderOpenOutlined size={16} />,
      action: () => addAttachments('folder'),
    },
    risk: {
      label: t('AIAddMaterialsPopover.risk'),
      description: t('AIAddMaterialsPopover.riskHint'),
      icon: <ColorsRiskIcon />,
      ...getResourceMenu('risk'),
    },
    flow: {
      label: t('AIAddMaterialsPopover.flow'),
      description: t('AIAddMaterialsPopover.flowHint'),
      icon: <ColorsFlowIcon />,
      ...getResourceMenu('http'),
    },
    forge: {
      label: t('AIMentionTabs.skill'),
      description: t('AIAddMaterialsPopover.skillHint'),
      icon: <ColorsSkillIcon />,
      tab: AIMentionTabsEnum.Forge_Name,
      category: 'forge',
    },
    knowledgeBase: {
      label: t('AIMentionTabs.knowledgeBase'),
      description: t('AIAddMaterialsPopover.knowledgeHint'),
      icon: <ColorsKnowledgeBaseIcon />,
      tab: AIMentionTabsEnum.KnowledgeBase,
      category: 'knowledgeBase',
    },
    tool: {
      label: t('AIMentionTabs.tool'),
      description: t('AIAddMaterialsPopover.toolHint'),
      icon: <ColorsToolIcon />,
      tab: AIMentionTabsEnum.Tool,
      category: 'tool',
      count: countMentions('tool'),
    },
    fileSystem: {
      label: t('AIMentionTabs.fileSystem'),
      description: t('AIAddMaterialsPopover.fileSystemHint'),
      icon: <ColorsFileSystemIcon />,
      tab: AIMentionTabsEnum.File_System,
      action: () => openSidebarTab(AIAgentTabListEnum.File),
      external: true,
      count: countMentions('file') + countMentions('folder') - attachmentCount,
    },
    browser: {
      label: t('AIMentionTabs.browser'),
      description: t('AIAddMaterialsPopover.browserHint'),
      icon: <ChromeOutlined size={16} />,
      tab: AIMentionTabsEnum.Browser,
      action: () => openSidebarTab(AIAgentTabListEnum.Browser),
      external: true,
      count: browserCount,
      summaryPanel: 'browser',
    },
    focusMode: {
      label: t('AiAgengt.focusMode'),
      description: t('AIAddMaterialsPopover.sceneHint'),
      icon: <BoxOutlined size={16} />,
      tab: AIMentionTabsEnum.FocusMode,
      category: 'focusMode',
      current: currentFocusMode,
      count: currentFocusMode ? 1 : 0,
    },
  } satisfies Record<string, MaterialMenuItem>
}

interface MaterialSummaryOptions extends Pick<AIAddMaterialsPopoverProps, 'mentions' | 'onRemove' | 'filterMode'> {
  items: MaterialMenuItem[]
  t: TFunction
  descriptions: Record<string, string>
  attachmentCount: number
  openCategory: (category: MaterialPanel) => void
}

/** 生成「已添加资料」的分组徽标和展开明细。 */
export const getMaterialSummaryGroups = ({
  items,
  mentions,
  onRemove,
  filterMode,
  t,
  descriptions,
  attachmentCount,
  openCategory,
}: MaterialSummaryOptions): MaterialSummaryGroup[] => {
  const groups = items.flatMap<MaterialSummaryGroup>(({ category, tab, label, icon }) => {
    if (category !== 'forge' && category !== 'knowledgeBase') return []
    const entries = mentions.filter((mention) => mention.mentionType === category)
    if (!entries.length) return []
    const forgeNames = new Map(entries.filter((entry) => entry.name).map((entry) => [entry.mentionId, entry.name]))
    const entryGroups =
      category === 'forge'
        ? Object.values(
            groupBy(
              entries,
              (entry) => `forge:${forgeNames.get(entry.mentionId) || entry.mentionName || entry.mentionId}`,
            ),
          )
        : entries.map((entry) => [entry])
    return [
      {
        key: category,
        label,
        icon,
        title: t(
          category === 'forge' ? 'AIAddMaterialsPopover.addedSkills' : 'AIAddMaterialsPopover.addedKnowledgeBases',
        ),
        count: entryGroups.length,
        onAdd: tab && filterMode?.includes(tab) ? undefined : () => openCategory(category),
        rows: entryGroups.map(([entry, ...duplicates], index) => {
          const KnowledgeIcon =
            entry.knowledgeIndex === undefined ? BookOpenTextOutlined : targetIcon(entry.knowledgeIndex)
          return {
            key: `${entry.mentionId}:${index}`,
            name: entry.mentionName,
            icon: category === 'forge' ? <PuzzleOutlined size={16} /> : <KnowledgeIcon size={16} />,
            description: descriptions[`${category}:${entry.mentionId}`],
            onRemove:
              entry.lock || duplicates.some((duplicate) => duplicate.lock)
                ? undefined
                : () => {
                    onRemove(entry)
                    duplicates.forEach(onRemove)
                  },
          }
        }),
      },
    ]
  })
  const otherRows = items.flatMap<MaterialSummaryRow>(
    ({ label, icon, count, action, summaryAction, category, tab, current, summaryPanel }) =>
      count && count > 0
        ? [
            {
              key: label,
              name: label,
              icon,
              count,
              hideCount: category === 'focusMode',
              description: current,
              onOpen:
                tab && filterMode?.includes(tab)
                  ? undefined
                  : summaryPanel
                    ? () => openCategory(summaryPanel)
                    : (summaryAction ?? action ?? (category ? () => openCategory(category) : undefined)),
            },
          ]
        : [],
  )
  if (attachmentCount) {
    otherRows.unshift({
      key: 'attachments',
      name: t('AIAddMaterialsPopover.attachments'),
      icon: <PaperClipOutlined size={16} />,
      count: attachmentCount,
      onOpen: () => openCategory('attachments'),
    })
  }
  if (otherRows.length) {
    groups.push({
      key: 'other',
      label: t('AIChatTextarea.otherMaterials'),
      title: t('AIAddMaterialsPopover.addedOtherMaterials'),
      count: otherRows.reduce((total, row) => total + (row.count ?? 0), 0),
      rows: otherRows,
    })
  }
  return groups
}

export const getAddedBrowsers = (mentions: AIAddMaterialsPopoverProps['mentions']) => {
  const browsers = new Map<string, AIAddMaterialsPopoverProps['mentions'][number]>()
  for (const mention of mentions) {
    if (mention.mentionType !== 'browser') continue
    if (mention.lock || !browsers.has(mention.mentionId)) browsers.set(mention.mentionId, mention)
  }
  return Array.from(browsers.values())
}
