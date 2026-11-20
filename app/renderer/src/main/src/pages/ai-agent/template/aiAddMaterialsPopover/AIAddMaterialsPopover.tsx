import { useContext, useRef, useState } from 'react'
import type { FC } from 'react'
import { useMemoizedFn } from 'ahooks'
import classNames from 'classnames'
import { YakitPopover } from '@/components/yakitUI/YakitPopover/YakitPopover'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { HistoryAIReActChatContext } from '@/components/historyAIReActChat/context'
import { handleOpenFileSystemDialog } from '@/utils/fileSystemDialog'
import { yakitNotify } from '@/utils/notification'
import type { AIMentionCommandParams } from '../../components/aiMilkdownInput/aiMilkdownMention/aiMentionPlugin'
import { MAX_ATTACHMENTS_PER_BATCH } from '../type'
import MaterialAddedBrowsersPanel from './MaterialAddedBrowsersPanel/MaterialAddedBrowsersPanel'
import MaterialCapabilitiesPanel from './MaterialCapabilitiesPanel/MaterialCapabilitiesPanel'
import MaterialAttachmentList from './materialAttachmentList/MaterialAttachmentList'
import MaterialCategoryPicker from './materialCategoryPicker/MaterialCategoryPicker'
import MaterialMenu from './materialMenu/MaterialMenu'
import { getAddedBrowsers, getMaterialMenuItems, getMaterialSummaryGroups } from './materialPanelData'
import MaterialSummary from './materialSummary/MaterialSummary'
import type { MaterialSummaryGroup } from './materialSummary/type'
import type { AIAddMaterialsPopoverProps, MaterialMenuItem, MaterialPanel } from './type'
import styles from './AIAddMaterialsPopover.module.scss'

const AIAddMaterialsPopover: FC<AIAddMaterialsPopoverProps> = ({
  children,
  showScenarioCapabilities,
  initialEnabledCapabilities,
  onEnabledCapabilitiesChange,
  onShortcut,
  onAdd,
  onRemove,
  mentions,
  resourceIds,
  selectedResourceIds,
  filterMode,
}) => {
  const { t } = useI18nNamespaces(['aiAgent', 'yakitUi'])
  const sidebarChat = useContext(HistoryAIReActChatContext)
  const [open, setOpen] = useState(false)
  const anchorRef = useRef<HTMLElement>(null)
  const [picker, setPicker] = useState<{ category: MaterialPanel; fromMenu: boolean }>()
  // 缓存技能、工具和知识库的简介，供资料摘要和「已添加」列表使用。
  const [descriptions, setDescriptions] = useState<Record<string, string>>({})
  const attachments = mentions.filter((item) => item.mentionSource === 'attachment')
  const browsers = getAddedBrowsers(mentions)

  const getPopupContainer = (anchor: HTMLElement) => {
    anchorRef.current = anchor
    return anchor.ownerDocument.body
  }

  const syncPopupWidth = (popup: HTMLElement) => {
    const anchor = anchorRef.current
    if (anchor) popup.style.width = `${anchor.getBoundingClientRect().width}px`
  }

  const close = useMemoizedFn(() => {
    setOpen(false)
    setPicker(undefined)
  })

  const openSummaryCategory = (category: MaterialPanel) => {
    setPicker({ category, fromMenu: false })
    setOpen(true)
  }

  const addMaterial = useMemoizedFn((material: AIMentionCommandParams, description?: string) => {
    if (description) {
      setDescriptions((current) => ({ ...current, [`${material.mentionType}:${material.mentionId}`]: description }))
    }
    onAdd(material)
  })

  const addAttachments = useMemoizedFn(async (type: 'file' | 'folder') => {
    try {
      const isFolder = type === 'folder'
      const { filePaths } = await handleOpenFileSystemDialog({
        title: t(isFolder ? 'AIAddMaterialsPopover.addFolder' : 'AIAddMaterialsPopover.attachment'),
        properties: [isFolder ? 'openDirectory' : 'openFile', 'multiSelections'],
      })
      if (filePaths.length > MAX_ATTACHMENTS_PER_BATCH) {
        yakitNotify(
          'warning',
          t('AIAddMaterialsPopover.attachmentLimitExceeded', {
            count: filePaths.length,
            max: MAX_ATTACHMENTS_PER_BATCH,
          }),
        )
        return
      }
      for (const path of filePaths) {
        onAdd({ mentionType: type, mentionId: path, mentionName: path, mentionSource: 'attachment' })
      }
    } catch (error) {
      yakitNotify('error', t('AIAddMaterialsPopover.attachmentFailed', { error: String(error) }))
    }
  })

  const menu = getMaterialMenuItems({
    t,
    mentions,
    resourceIds,
    selectedResourceIds,
    browserCount: browsers.length,
    addAttachments,
    close,
  })
  const workspaceItems: MaterialMenuItem[] = [menu.risk, menu.flow, menu.fileSystem, menu.browser]
  const items: MaterialMenuItem[] = Object.values(menu)
  const isWorkspaceOnly = (item: MaterialMenuItem) => !!sidebarChat && workspaceItems.includes(item)
  const menuItems = items.filter((item) => !isWorkspaceOnly(item))
  const summaryGroups = getMaterialSummaryGroups({
    items: items.map((item) =>
      isWorkspaceOnly(item) ? { ...item, action: undefined, summaryAction: undefined } : item,
    ),
    t,
    mentions,
    descriptions,
    filterMode,
    attachmentCount: attachments.length,
    onRemove,
    openCategory: openSummaryCategory,
  })

  const renderPanel = () => {
    const category = picker?.category
    switch (category) {
      case 'forge':
      case 'tool':
      case 'knowledgeBase': {
        const { label, description, icon } = menu[category]
        return (
          <MaterialCategoryPicker
            title={label}
            description={description}
            icon={icon}
            onBack={picker?.fromMenu ? () => setPicker(undefined) : undefined}
            key={category}
            category={category}
            mentions={mentions}
            descriptions={descriptions}
            onAdd={addMaterial}
            onRemove={onRemove}
          />
        )
      }
      case 'attachments':
        return <MaterialAttachmentList attachments={attachments} onAdd={addAttachments} onRemove={onRemove} />
      case 'browser':
        return <MaterialAddedBrowsersPanel browsers={browsers} onRemove={onRemove} />
      default:
        return (
          <MaterialMenu
            items={menuItems}
            filterMode={filterMode}
            onOpenCategory={(category) => setPicker({ category, fromMenu: true })}
            onShortcut={(shortcut) => {
              close()
              onShortcut(shortcut)
            }}
          />
        )
    }
  }

  const renderPopover = (capabilities?: MaterialSummaryGroup) => {
    const groups = capabilities ? [capabilities, ...summaryGroups] : summaryGroups
    return (
      <YakitPopover
        trigger="click"
        placement="topLeft"
        arrow={false}
        open={open}
        onOpenChange={(next) => {
          if (!next) close()
        }}
        destroyOnHidden
        classNames={{ root: styles.popover, body: styles.body }}
        getPopupContainer={getPopupContainer}
        onPopupAlign={syncPopupWidth}
        content={
          <section
            aria-label={t('AIChatTextarea.addMaterials')}
            role="dialog"
            className={classNames(styles.content, {
              [styles['picker-content']]: picker && picker.category !== 'attachments' && picker.category !== 'browser',
            })}
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
          >
            {renderPanel()}
          </section>
        }
      >
        {children({
          open,
          menuOpen: open && (!picker || picker.fromMenu),
          toggle: () => (open ? close() : setOpen(true)),
          summary: groups.length ? <MaterialSummary groups={groups} onOpen={close} /> : undefined,
        })}
      </YakitPopover>
    )
  }

  if (!showScenarioCapabilities) return renderPopover()

  return (
    <MaterialCapabilitiesPanel
      initialEnabledCapabilities={initialEnabledCapabilities}
      onEnabledCapabilitiesChange={onEnabledCapabilitiesChange}
    >
      {renderPopover}
    </MaterialCapabilitiesPanel>
  )
}

export default AIAddMaterialsPopover
