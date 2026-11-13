import { useContext, useState } from 'react'
import type { FC } from 'react'
import { useMemoizedFn, useRequest, useUpdateEffect } from 'ahooks'
import classNames from 'classnames'
import { YakitPopover } from '@/components/yakitUI/YakitPopover/YakitPopover'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { HistoryAIReActChatContext } from '@/components/historyAIReActChat/context'
import { isIRify } from '@/utils/envfile'
import { handleOpenFileSystemDialog } from '@/utils/fileSystemDialog'
import { yakitNotify } from '@/utils/notification'
import { AIMentionTabsEnum } from '../../defaultConstant'
import { grpcQueryAIFocus } from '../../grpc'
import { sceneMentionRow } from '../../components/aiChatMention/mentionListData'
import type { AIMentionCommandParams } from '../../components/aiMilkdownInput/aiMilkdownMention/aiMentionPlugin'
import { MAX_ATTACHMENTS_PER_BATCH } from '../type'
import MaterialAttachmentList from './materialAttachmentList/MaterialAttachmentList'
import MaterialAddedBrowsersPanel from './MaterialAddedBrowsersPanel/MaterialAddedBrowsersPanel'
import MaterialCapabilitiesPanel from './MaterialCapabilitiesPanel/MaterialCapabilitiesPanel'
import MaterialCategoryPicker from './materialCategoryPicker/MaterialCategoryPicker'
import MaterialFocusModeList from './materialFocusModeList/MaterialFocusModeList'
import MaterialMenu from './materialMenu/MaterialMenu'
import { getAddedBrowsers, getMaterialMenuItems, getMaterialSummaryGroups } from './materialPanelData'
import MaterialSummary from './materialSummary/MaterialSummary'
import type { MaterialSummaryGroup } from './materialSummary/type'
import type { AIAddMaterialsPopoverProps, MaterialMenuItem, MaterialPanel, SelectedFocusMode } from './type'
import styles from './AIAddMaterialsPopover.module.scss'

const AIAddMaterialsPopover: FC<AIAddMaterialsPopoverProps> = ({
  children,
  showScenarioCapabilities,
  onEnabledCapabilitiesChange,
  onAdd,
  onRemove,
  mentions,
  resourceIds,
  selectedResourceIds,
  focusMode,
  onFocusModeChange,
  filterMode: filteredTabs,
}) => {
  const { t, i18n } = useI18nNamespaces(['aiAgent', 'yakitUi'])
  const sidebarChat = useContext(HistoryAIReActChatContext)
  const fixedFocusMode = sidebarChat?.focusModeLoop
  const hideSceneInSummary = isIRify()
  const filterMode = fixedFocusMode ? [...(filteredTabs ?? []), AIMentionTabsEnum.FocusMode] : filteredTabs
  const { data: scenarios } = useRequest(() => grpcQueryAIFocus(undefined, true), {
    ready: !!fixedFocusMode && !hideSceneInSummary,
  })
  const [open, setOpen] = useState(false)
  const [picker, setPicker] = useState<{ category: MaterialPanel; fromMenu: boolean }>()
  const [selectedFocusLabel, setSelectedFocusLabel] = useState<SelectedFocusMode>()
  // 缓存技能、工具和知识库的简介，供资料摘要和「已添加」列表使用。
  const [descriptions, setDescriptions] = useState<Record<string, string>>({})
  const attachments = mentions.filter((item) => item.mentionType === 'file' && item.mentionSource === 'attachment')
  const browsers = getAddedBrowsers(mentions)

  useUpdateEffect(() => {
    setSelectedFocusLabel((current) => (current?.id === focusMode ? current : undefined))
  }, [focusMode])

  const close = useMemoizedFn(() => {
    setOpen(false)
    setPicker(undefined)
  })

  const openCategory = (category: MaterialPanel) => {
    setPicker({ category, fromMenu: false })
    setOpen(true)
  }

  const addMaterial = useMemoizedFn((material: AIMentionCommandParams, description?: string) => {
    if (description) {
      setDescriptions((current) => ({ ...current, [`${material.mentionType}:${material.mentionId}`]: description }))
    }
    onAdd(material)
  })

  const addAttachments = useMemoizedFn(async () => {
    try {
      const { filePaths } = await handleOpenFileSystemDialog({
        title: t('AIAddMaterialsPopover.attachment'),
        properties: ['openFile', 'multiSelections'],
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
        onAdd({ mentionType: 'file', mentionId: path, mentionName: path, mentionSource: 'attachment' })
      }
    } catch (error) {
      yakitNotify('error', t('AIAddMaterialsPopover.attachmentFailed', { error: String(error) }))
    }
  })

  const fixedScene = scenarios?.Data?.find(({ Name }) => Name === fixedFocusMode)
  const fixedSceneLabel = fixedScene
    ? sceneMentionRow(fixedScene, ['zh', 'zh-TW'].includes(i18n.language)).row.name
    : fixedFocusMode
  const selectedSceneLabel = selectedFocusLabel?.id === focusMode ? selectedFocusLabel?.label : focusMode
  const menu = getMaterialMenuItems({
    t,
    mentions,
    resourceIds,
    selectedResourceIds,
    attachmentCount: attachments.length,
    browserCount: browsers.length,
    currentFocusMode: fixedSceneLabel || selectedSceneLabel,
    addAttachments,
    close,
  })
  const workspaceItems: MaterialMenuItem[] = [menu.risk, menu.flow, menu.fileSystem]
  const items: MaterialMenuItem[] = Object.values(menu)
  const isWorkspaceOnly = (item: MaterialMenuItem) => !!sidebarChat && workspaceItems.includes(item)
  const menuItems = items.filter((item) => item !== menu.browser && !isWorkspaceOnly(item))
  const summaryItems = items.flatMap((item) => {
    if (hideSceneInSummary && item === menu.focusMode) return []
    return [isWorkspaceOnly(item) ? { ...item, action: undefined, summaryAction: undefined } : item]
  })
  const summaryGroups = getMaterialSummaryGroups({
    items: summaryItems,
    t,
    mentions,
    descriptions,
    filterMode,
    attachmentCount: attachments.length,
    onRemove,
    openCategory,
  })

  const getPanelHeader = (category: MaterialPanel) => {
    const { label: title, description, icon } = menu[category]
    return { title, description, icon, onBack: picker?.fromMenu ? () => setPicker(undefined) : undefined }
  }

  const renderPanel = () => {
    const category = fixedFocusMode && picker?.category === 'focusMode' ? undefined : picker?.category
    switch (category) {
      case 'forge':
      case 'tool':
      case 'knowledgeBase':
        return (
          <MaterialCategoryPicker
            {...getPanelHeader(category)}
            key={category}
            category={category}
            mentions={mentions}
            descriptions={descriptions}
            onAdd={addMaterial}
            onRemove={onRemove}
          />
        )
      case 'focusMode':
        return (
          <MaterialFocusModeList
            {...getPanelHeader(category)}
            selectedId={focusMode}
            onChange={(next) => {
              setSelectedFocusLabel(next)
              onFocusModeChange(next?.id)
              if (next) close()
            }}
          />
        )
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
        getPopupContainer={(anchor) => anchor.parentElement ?? document.body}
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
        {children(
          open,
          () => (open ? close() : setOpen(true)),
          groups.length ? <MaterialSummary groups={groups} onOpen={close} /> : null,
          open && (!picker || picker.fromMenu),
        )}
      </YakitPopover>
    )
  }

  if (!showScenarioCapabilities) return renderPopover()

  return (
    <MaterialCapabilitiesPanel onEnabledCapabilitiesChange={onEnabledCapabilitiesChange}>
      {renderPopover}
    </MaterialCapabilitiesPanel>
  )
}

export default AIAddMaterialsPopover
