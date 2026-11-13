import { useContext, useRef, useState } from 'react'
import type { FC } from 'react'
import { useDebounce, useDebounceFn, useKeyPress, useMemoizedFn, useRequest, useUpdateLayoutEffect } from 'ahooks'
import { ChevronDownOutlined, SearchOutlined } from '@yakit-libs/yakit-ui-icons/outline'
import { YakitInput } from '@/components/yakitUI/YakitInput/YakitInput'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitDropdownMenu } from '@/components/yakitUI/YakitDropdownMenu/YakitDropdownMenu'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { HistoryAIReActChatContext } from '@/components/historyAIReActChat/context'
import useCurrentSessionId from '@/pages/ai-re-act/hooks/useCurrentSessionId'
import { AIMentionTabs, AIMentionTabsEnum } from '../../defaultConstant'
import { RESOURCE_FILTER_OPTIONS } from '../../resourceFilter'
import type { ResourceFilterValue } from '../../resourceFilter'
import { selectBrowserInstance, useBrowserInstances } from '../../browserInstances/browserInstanceStore'
import { MaterialCatalogList } from '../../template/aiAddMaterialsPopover/materialCategoryPicker/MaterialCategoryPicker'
import { FocusModeOptions } from '../../template/aiAddMaterialsPopover/materialFocusModeList/MaterialFocusModeList'
import { AIChatMentionTabs } from './aiChatMentionTabs/AIChatMentionTabs'
import { MentionBrowsers, MentionFileTree } from './MentionCategoryLists'
import RecentListOfMention from './recentListOfMention/RecentListOfMention'
import { loadRecentMentionResources } from './recentListOfMention/recentListOfMentionData'
import type { AIChatMentionProps } from './type'
import styles from './AIChatMention.module.scss'

export const AIChatMention: FC<AIChatMentionProps> = ({
  defaultActiveTab = AIMentionTabsEnum.Recent,
  filterMode,
  filterKeyword,
  keyboardTarget,
  onSelect,
  onClose,
  visible = true,
  materials = [],
  focusMode,
}) => {
  const { t } = useI18nNamespaces(['aiAgent', 'yakitUi'])
  const sidebarChat = useContext(HistoryAIReActChatContext)
  const sessionId = useCurrentSessionId()
  const {
    data: recentResult,
    loading: recentLoading,
    error: recentError,
  } = useRequest(async () => ({ sessionId, resources: await loadRecentMentionResources(sessionId) }), {
    ready: visible && !filterMode?.includes(AIMentionTabsEnum.Recent),
    refreshDeps: [sessionId],
  })
  const [activeKey, setActiveKey] = useState(defaultActiveTab)
  const [keyword, setKeyword] = useState(filterKeyword ?? '')
  const [filterValue, setFilterValue] = useState<ResourceFilterValue>('all')
  const [filterOpen, setFilterOpen] = useState(false)
  const [popupFocused, setPopupFocused] = useState(false)
  const [total, setTotal] = useState(0)
  const root = useRef<HTMLDivElement>(null)
  const query = keyword.trim().toLowerCase()
  const remoteKeyword = useDebounce(keyword.trim(), { wait: 200 })

  useUpdateLayoutEffect(() => {
    setKeyword(filterKeyword ?? '')
  }, [filterKeyword, visible])

  // 隐藏调用方通过 filterMode 指定的标签。侧栏隐藏文件系统，有预设专注模式的侧栏也隐藏场景选择。
  const availableTabs = AIMentionTabs.filter(
    ({ value }) =>
      !filterMode?.includes(value as AIMentionTabsEnum) &&
      !(sidebarChat && value === AIMentionTabsEnum.File_System) &&
      !(sidebarChat?.focusModeLoop && value === AIMentionTabsEnum.FocusMode),
  )
  const recent =
    !recentLoading && !recentError && recentResult?.sessionId === sessionId ? recentResult.resources : undefined
  const { instances } = useBrowserInstances(
    visible && !filterMode?.includes(AIMentionTabsEnum.Browser) && Boolean(recent?.browserIDs.length),
  )
  const recentBrowsers = recent ? instances.filter((item) => recent.browserIDs.includes(item.id)) : []
  const recentCounts: Partial<Record<string, number>> = recent
    ? {
        [AIMentionTabsEnum.File_System]: recent.files.length + recent.attachments.length,
        [AIMentionTabsEnum.Forge_Name]: recent.skills.length,
        [AIMentionTabsEnum.KnowledgeBase]: recent.knowledgeBases.length,
        [AIMentionTabsEnum.Tool]: recent.tools.length,
        [AIMentionTabsEnum.Browser]: recentBrowsers.length,
        [AIMentionTabsEnum.FocusMode]: recent.scenarios.length,
      }
    : {}
  const hasRecent = availableTabs.some(({ value }) => recentCounts[value])
  const tabs = hasRecent ? availableTabs : availableTabs.filter(({ value }) => value !== AIMentionTabsEnum.Recent)
  const active = tabs.some((tab) => tab.value === activeKey)
    ? activeKey
    : (tabs[0]?.value as AIMentionTabsEnum | undefined)
  const changeTab = (key: AIMentionTabsEnum) => {
    if (key === activeKey) return
    setActiveKey(key)
    setFilterValue('all')
    setFilterOpen(false)
    setTotal(0)
  }

  const getContainer = useMemoizedFn(() => (popupFocused ? root.current : keyboardTarget?.() || root.current))
  const switchTabByArrow = (step: -1 | 1) => {
    if (!visible || !active || filterOpen) return
    const index = tabs.findIndex((tab) => tab.value === active)
    const tab = tabs[index + step]
    if (tab) changeTab(tab.value as AIMentionTabsEnum)
  }
  const onLeftArrow = useDebounceFn(() => switchTabByArrow(-1), { wait: 100, leading: true }).run
  const onRightArrow = useDebounceFn(() => switchTabByArrow(1), { wait: 100, leading: true }).run

  const handleTabKeyPress = (event: KeyboardEvent) => {
    if (filterOpen) return
    event.preventDefault()
    event.stopPropagation()
    if (event.key === 'ArrowLeft') onLeftArrow()
    else onRightArrow()
  }

  useKeyPress(visible && active ? ['leftarrow', 'rightarrow'] : () => false, handleTabKeyPress, {
    target: getContainer,
    exactMatch: true,
    useCapture: true,
  })

  const pick = useMemoizedFn<AIChatMentionProps['onSelect']>((type, value) => {
    if (type === 'browser' && value) selectBrowserInstance(value.id)
    onSelect(type, value)
  })

  const controls = { getContainer, onSelect: pick, keyboardEnabled: !filterOpen }
  const catalog = {
    [AIMentionTabsEnum.Forge_Name]: 'forge',
    [AIMentionTabsEnum.Tool]: 'tool',
    [AIMentionTabsEnum.KnowledgeBase]: 'knowledgeBase',
  } as const
  const showFilter = active !== undefined && (active in catalog || active === AIMentionTabsEnum.FocusMode)

  const renderActiveList = () => {
    switch (active) {
      case AIMentionTabsEnum.Recent:
        return (
          recent && (
            <RecentListOfMention
              {...controls}
              query={query}
              tabs={tabs}
              data={{ ...recent, browsers: recentBrowsers }}
            />
          )
        )
      case AIMentionTabsEnum.Forge_Name:
      case AIMentionTabsEnum.Tool:
      case AIMentionTabsEnum.KnowledgeBase:
        return (
          <MaterialCatalogList
            key={catalog[active]}
            category={catalog[active]}
            mentions={materials}
            search={keyword}
            filterValue={filterValue}
            keyboard={controls}
            onTotalChange={setTotal}
          />
        )
      case AIMentionTabsEnum.File_System:
        return <MentionFileTree {...controls} query={query} onClose={onClose} />
      case AIMentionTabsEnum.FocusMode:
        return (
          <FocusModeOptions
            query={query}
            keyword={remoteKeyword}
            filterValue={filterValue}
            selectedId={focusMode}
            keyboard={controls}
            onTotalChange={setTotal}
            onSelect={({ id }) => pick('focusMode', { id, name: id })}
          />
        )
      case AIMentionTabsEnum.Browser:
        return <MentionBrowsers {...controls} query={query} onClose={onClose} />
      default:
        return null
    }
  }

  return (
    <div
      className={styles['ai-chat-mention']}
      ref={root}
      onFocusCapture={() => setPopupFocused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setPopupFocused(false)
      }}
      onClick={(event) => event.stopPropagation()}
    >
      <YakitInput
        className={styles.search}
        variant="borderless"
        prefix={<SearchOutlined size={16} color="currentColor" />}
        aria-label={t('YakitInput.search')}
        placeholder={t('AIMentionTabs.search')}
        value={keyword}
        onChange={(event) => setKeyword(event.target.value)}
      />
      {active && <AIChatMentionTabs tabs={tabs} activeKey={active} tabCounts={{}} onChange={changeTab} />}
      {showFilter && (
        <div className={styles['category-filter']}>
          <YakitDropdownMenu
            dropdown={{
              trigger: ['click'],
              open: filterOpen,
              onOpenChange: setFilterOpen,
              getPopupContainer: (trigger) => trigger.parentElement ?? document.body,
            }}
            menu={{
              data: Object.values(RESOURCE_FILTER_OPTIONS).map(({ label, value }) => ({ key: value, label: t(label) })),
              selectedKeys: [filterValue],
              onClick: ({ key }) => {
                const option = Object.values(RESOURCE_FILTER_OPTIONS).find(({ value }) => value === key)
                if (option) setFilterValue(option.value)
                setFilterOpen(false)
              },
            }}
          >
            <YakitButton
              type="text2"
              size="small"
              icon={<ChevronDownOutlined size={12} color="currentColor" />}
              iconPosition="end"
              aria-haspopup="menu"
              aria-expanded={filterOpen}
            >
              {t(RESOURCE_FILTER_OPTIONS[filterValue].label)}
            </YakitButton>
          </YakitDropdownMenu>
          <span className={styles.count}>{total}</span>
        </div>
      )}
      {visible && <div className={styles['list-body']}>{renderActiveList()}</div>}
    </div>
  )
}
