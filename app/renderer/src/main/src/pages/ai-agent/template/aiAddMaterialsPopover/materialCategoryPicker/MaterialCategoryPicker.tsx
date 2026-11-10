import { useRef, useState } from 'react'
import type { FC } from 'react'
import { useUpdateEffect } from 'ahooks'
import {
  BookOpenTextOutlined,
  CheckCheckOutlined,
  PlusSmOutlined,
  PuzzleOutlined,
  Wrench1Outlined,
  XOutlined,
} from '@yakit-libs/yakit-ui-icons/outline'
import { RollingLoadList } from '@/components/RollingLoadList/RollingLoadList'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitSpin } from '@/components/yakitUI/YakitSpin/YakitSpin'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import type { AIMentionCommandParams } from '../../../components/aiMilkdownInput/aiMilkdownMention/aiMentionPlugin'
import MaterialListPanel from '../materialListPanel/MaterialListPanel'
import type { MaterialCategory, MaterialOption, MaterialPanelHeader } from '../type'
import ForgeItem from './forgeItem/ForgeItem'
import { ALL_KNOWLEDGE_BASES, useMaterialCatalog } from './useMaterialCatalog'
import styles from './MaterialCategoryPicker.module.scss'

const OPTION_HEIGHT = 29
const optionIcons = { forge: PuzzleOutlined, tool: Wrench1Outlined, knowledgeBase: BookOpenTextOutlined }

interface MaterialCategoryPickerProps extends MaterialPanelHeader {
  category: Exclude<MaterialCategory, 'focusMode'>
  mentions: AIMentionCommandParams[]
  descriptions: Record<string, string>
  onAdd: (material: AIMentionCommandParams, description?: string) => void
  onRemove: (material: AIMentionCommandParams) => void
}

const indexAddedMaterials = (mentions: AIMentionCommandParams[], category: MaterialCategory) => {
  const addedById = new Map<string, AIMentionCommandParams>()
  for (const mention of mentions) {
    if (mention.mentionType !== category) continue
    if (mention.lock || !addedById.has(mention.mentionId)) addedById.set(mention.mentionId, mention)
  }
  return addedById
}

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
      forgeName: item?.forgeName ?? mention.forgeName,
    }
  })
}

const filterOptions = (options: MaterialOption[], query: string) =>
  options.filter(
    ({ id, name, description }) =>
      id === ALL_KNOWLEDGE_BASES || name?.toLowerCase().includes(query) || description?.toLowerCase().includes(query),
  )

const MaterialCategoryPicker: FC<MaterialCategoryPickerProps> = ({
  category,
  mentions,
  descriptions,
  onAdd,
  onRemove,
  ...header
}) => {
  const { t } = useI18nNamespaces(['aiAgent', 'yakitUi'])
  const listRef = useRef<HTMLDivElement>(null)
  const [recalculateList, setRecalculateList] = useState(false)
  const [search, setSearch] = useState('')
  const [addedOnly, setAddedOnly] = useState(false)
  const { catalog, searchLocally, keyword, page, loading, loadingMore, hasMore, loadMore } = useMaterialCatalog(
    category,
    search,
    addedOnly,
  )
  const OptionIcon = optionIcons[category]

  useUpdateEffect(() => {
    if (searchLocally) setRecalculateList((previous) => !previous)
  }, [catalog, mentions])

  const addedById = indexAddedMaterials(mentions, category)
  const options = addedOnly ? getAddedOptions(addedById, catalog, descriptions) : catalog
  const query = search.trim().toLowerCase()
  const visibleOptions = searchLocally && query ? filterOptions(options, query) : options

  const renderOption = (item: MaterialOption) => {
    const added = addedById.get(item.id)
    const selected = !!added
    const locked = added?.lock
    const material = {
      mentionType: category,
      mentionId: item.id,
      mentionName: item.name,
      forgeName: item.forgeName,
    }
    const row = (
      <div key={item.id} className={styles.row}>
        <div className={styles['row-content']}>
          <OptionIcon size={16} color="var(--Colors-Use-Neutral-Text-2-Primary)" />
          <span className={styles.name} title={item.name}>
            {item.name}
          </span>
          <span className={styles.description} title={item.description}>
            {item.description}
          </span>
        </div>
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
      </div>
    )
    if (category !== 'forge') return row

    return (
      <ForgeItem key={item.id} skillName={item.forgeName || item.name}>
        {row}
      </ForgeItem>
    )
  }

  return (
    <MaterialListPanel
      {...header}
      search={search}
      onSearchChange={setSearch}
      filter={{ addedOnly, onChange: setAddedOnly }}
    >
      {loading ? (
        <YakitSpin />
      ) : visibleOptions.length ? (
        <div ref={listRef} className={styles['virtual-list']}>
          <RollingLoadList<MaterialOption>
            key={`${addedOnly ? 'added' : 'all'}:${searchLocally ? query : keyword}`}
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
        </div>
      ) : (
        <div className={styles.empty}>{t('YakitEmpty.noData')}</div>
      )}
    </MaterialListPanel>
  )
}

export default MaterialCategoryPicker
