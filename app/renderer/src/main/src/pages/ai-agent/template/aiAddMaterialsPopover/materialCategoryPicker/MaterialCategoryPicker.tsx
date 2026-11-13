import { useEffect, useRef, useState } from 'react'
import type { FC } from 'react'
import { useMemoizedFn, useUpdateEffect } from 'ahooks'
import {
  BookOpenTextOutlined,
  CheckCheckOutlined,
  PlusSmOutlined,
  PuzzleOutlined,
  Wrench1Outlined,
  XOutlined,
} from '@yakit-libs/yakit-ui-icons/outline'
import { RollingLoadList } from '@/components/RollingLoadList/RollingLoadList'
import type { RollingLoadListRef } from '@/components/RollingLoadList/RollingLoadList'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitSpin } from '@/components/yakitUI/YakitSpin/YakitSpin'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { targetIcon } from '@/pages/KnowledgeBase/utils'
import type { ResourceFilterValue } from '../../../resourceFilter'
import { useMentionRowsKeyboard } from '../../../components/aiChatMention/hooks/useMentionRowsKeyboard'
import type { MentionListControls, ResourceMentionRow } from '../../../components/aiChatMention/type'
import type { AIMentionCommandParams } from '../../../components/aiMilkdownInput/aiMilkdownMention/aiMentionPlugin'
import MaterialListPanel from '../materialListPanel/MaterialListPanel'
import type { MaterialCategory, MaterialOption, MaterialPanelHeader } from '../type'
import { ALL_KNOWLEDGE_BASES, useMaterialCatalog } from './useMaterialCatalog'
import styles from './MaterialCategoryPicker.module.scss'

const OPTION_HEIGHT = 29
const optionIcons = { forge: PuzzleOutlined, tool: Wrench1Outlined, knowledgeBase: BookOpenTextOutlined }

interface MaterialCategoryPickerProps extends MaterialPanelHeader {
  /** 当前列表的资料类型，支持技能、工具和知识库。 */
  category: Exclude<MaterialCategory, 'focusMode'>
  mentions: AIMentionCommandParams[]
  /** 按「资料类型:ID」保存的描述，目录数据没有描述时用于回填。 */
  descriptions: Record<string, string>
  /** 添加资料时调用，可一并保存该条目的描述。 */
  onAdd: (material: AIMentionCommandParams, description?: string) => void
  /** 取消已添加资料时调用。 */
  onRemove: (material: AIMentionCommandParams) => void
}

interface MaterialCatalogListProps
  extends
    Pick<MaterialCategoryPickerProps, 'category'>,
    Partial<Pick<MaterialCategoryPickerProps, 'descriptions' | 'onAdd' | 'onRemove'>> {
  /** 当前会话已添加的资料，用于判断添加状态并生成「已添加」列表。 */
  mentions: AIMentionCommandParams[]
  /** 搜索框输入的原始关键词。 */
  search: string
  /** 当前筛选项，all 为「全部」，added 为「已添加」。 */
  filterValue: ResourceFilterValue
  /** @ 弹窗的键盘监听目标、启用状态和选中回调。 */
  keyboard?: MentionListControls
  /** 当前筛选结果的总数变化时通知外层，用于更新计数。 */
  onTotalChange?: (total: number) => void
}

const EMPTY_DESCRIPTIONS: Record<string, string> = {}

const indexAddedMaterials = (mentions: AIMentionCommandParams[], category: MaterialCategory) => {
  const addedById = new Map<string, AIMentionCommandParams>()
  for (const mention of mentions) {
    if (mention.mentionType !== category) continue
    if (mention.lock || !addedById.has(mention.mentionId)) addedById.set(mention.mentionId, mention)
  }
  return addedById
}

// 以已添加的引用为准生成列表，优先用目录数据补齐展示信息，缺失时回退到引用和已保存的描述。
const getAddedOptions = (
  addedById: ReadonlyMap<string, AIMentionCommandParams>,
  catalog: MaterialOption[],
  descriptions: Record<string, string>,
): MaterialOption[] => {
  const catalogById = new Map(catalog.map((item) => [item.id, item]))
  return Array.from(addedById.values(), (mention) => {
    const item = catalogById.get(mention.mentionId)
    return {
      id: mention.mentionId,
      name: item?.name ?? mention.mentionName,
      description: item?.description || descriptions[`${mention.mentionType}:${mention.mentionId}`],
      originalName: item?.originalName ?? mention.name,
      knowledgeIndex: mention.knowledgeIndex ?? item?.knowledgeIndex,
    }
  })
}

// 本地搜索匹配展示名、描述和原始名称。keepAllKnowledge 为 true 时始终保留「@所有知识库」入口。
const filterOptions = (options: MaterialOption[], query: string, keepAllKnowledge: boolean) =>
  options.filter(
    ({ id, name, description, originalName }) =>
      (keepAllKnowledge && id === ALL_KNOWLEDGE_BASES) ||
      name.toLowerCase().includes(query) ||
      description?.toLowerCase().includes(query) ||
      originalName?.toLowerCase().includes(query),
  )

export const MaterialCatalogList: FC<MaterialCatalogListProps> = ({
  category,
  mentions,
  descriptions = EMPTY_DESCRIPTIONS,
  search,
  filterValue,
  keyboard,
  onTotalChange,
  onAdd,
  onRemove,
}) => {
  const { t, i18n } = useI18nNamespaces(['aiAgent', 'yakitUi'])
  const listRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const setRollingListRef = useMemoizedFn((list: RollingLoadListRef | null) => {
    scrollRef.current = list?.containerRef?.current ?? null
  })
  const [recalculateList, setRecalculateList] = useState(false)
  const {
    catalog,
    searchKnowledgeOptions,
    total,
    searchLocally,
    keyword,
    page,
    loading,
    loadingMore,
    hasMore,
    loadMore,
  } = useMaterialCatalog(category, search, filterValue)
  const OptionIcon = optionIcons[category]

  useUpdateEffect(() => {
    if (searchLocally) setRecalculateList((previous) => !previous)
  }, [catalog, mentions])

  const addedById = indexAddedMaterials(mentions, category)
  const options = filterValue === 'added' ? getAddedOptions(addedById, catalog, descriptions) : catalog
  const query = search.trim().toLowerCase()
  const getVisibleOptions = () => {
    if (!searchLocally || !query) return options
    if (category === 'knowledgeBase' && keyboard && filterValue === 'all') {
      return searchKnowledgeOptions(query)
    }
    return filterOptions(options, query, !keyboard)
  }
  const visibleOptions = getVisibleOptions()
  const listKey = `${filterValue}:${searchLocally ? query : keyword}`
  const keyboardRows =
    keyboard && !loading
      ? visibleOptions.map(
          (item): ResourceMentionRow => ({
            ...item,
            name: item.id === ALL_KNOWLEDGE_BASES ? ALL_KNOWLEDGE_BASES : item.name,
            type: category,
            row: { kind: category },
          }),
        )
      : []
  const keyboardRowsById = new Map(keyboardRows.map((item) => [item.id, item]))
  const rowProps = useMentionRowsKeyboard(scrollRef, keyboardRows, keyboard, listKey, OPTION_HEIGHT)
  const displayedTotal = searchLocally ? visibleOptions.length : total
  useEffect(() => onTotalChange?.(displayedTotal), [displayedTotal, onTotalChange])

  const renderOption = (item: MaterialOption) => {
    const keyboardRow = keyboardRowsById.get(item.id)
    if (keyboard && !keyboardRow) return null

    const added = addedById.get(item.id)
    const selected = !!added
    const locked = added?.lock
    const option = keyboardRow ? rowProps(keyboardRow) : undefined
    const { knowledgeIndex } = item
    const KnowledgeIcon = knowledgeIndex === undefined ? undefined : targetIcon(knowledgeIndex)
    const material = {
      mentionType: category,
      mentionId: item.id,
      mentionName: item.name,
      name: item.originalName,
      knowledgeIndex,
    }
    return (
      <div
        key={item.id}
        className={styles.row}
        id={option?.id}
        role={option ? 'option' : undefined}
        aria-selected={option?.active}
        onClick={option?.onSelect}
      >
        <div className={styles['row-content']}>
          {KnowledgeIcon ? (
            <KnowledgeIcon className={styles['knowledge-icon']} />
          ) : (
            <OptionIcon size={16} color="var(--Colors-Use-Neutral-Text-2-Primary)" />
          )}
          <span className={styles.name} title={item.name}>
            {item.name}
          </span>
          <span className={styles.description} title={item.description}>
            {item.description}
          </span>
        </div>
        {onAdd && onRemove && (
          <div className={styles.actions}>
            <YakitButton
              type="text2"
              className={styles.action}
              icon={selected ? undefined : <PlusSmOutlined size={16} />}
              aria-label={`${t(selected ? 'YakitButton.cancel' : 'YakitButton.add')} ${item.name}`}
              aria-pressed={selected}
              disabled={locked}
              onClick={() => (selected ? onRemove(material) : onAdd(material, item.description))}
            >
              {selected ? (
                <span className={styles['selected-action']}>
                  <CheckCheckOutlined size={16} className={styles.check} />
                  {!locked && (
                    <span className={styles.remove}>
                      <XOutlined size={16} color="currentColor" svgProps={{ style: { color: 'inherit' } }} />
                      {t('YakitButton.cancel')}
                    </span>
                  )}
                </span>
              ) : (
                t('YakitButton.add')
              )}
            </YakitButton>
          </div>
        )}
      </div>
    )
  }

  return (
    <div ref={listRef} className={styles['virtual-list']} role={keyboard ? 'listbox' : undefined}>
      {loading ? (
        <YakitSpin />
      ) : visibleOptions.length ? (
        <RollingLoadList<MaterialOption>
          key={category === 'tool' ? `${listKey}:${i18n.language}` : listKey}
          ref={keyboard ? setRollingListRef : undefined}
          targetRef={listRef}
          data={visibleOptions}
          rowKey="id"
          renderRow={renderOption}
          loadMoreData={loadMore}
          hasMore={hasMore}
          loading={loadingMore}
          page={page}
          defItemHeight={OPTION_HEIGHT}
          recalculation={recalculateList}
          classNameList={styles['virtual-scroll']}
          classNameRow={styles['virtual-row']}
        />
      ) : (
        <div className={styles.empty}>{t('YakitEmpty.noData')}</div>
      )}
    </div>
  )
}

const MaterialCategoryPicker: FC<MaterialCategoryPickerProps> = ({
  category,
  mentions,
  descriptions,
  onAdd,
  onRemove,
  ...header
}) => {
  const [search, setSearch] = useState('')
  const [filterValue, setFilterValue] = useState<ResourceFilterValue>('all')
  return (
    <MaterialListPanel
      {...header}
      search={search}
      onSearchChange={setSearch}
      filter={{ value: filterValue, onChange: setFilterValue }}
    >
      <MaterialCatalogList
        category={category}
        mentions={mentions}
        descriptions={descriptions}
        search={search}
        filterValue={filterValue}
        onAdd={onAdd}
        onRemove={onRemove}
      />
    </MaterialListPanel>
  )
}

export default MaterialCategoryPicker
