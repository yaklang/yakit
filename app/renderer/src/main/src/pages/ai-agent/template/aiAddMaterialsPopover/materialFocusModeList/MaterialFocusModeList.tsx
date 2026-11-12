import { useEffect, useRef, useState } from 'react'
import type { FC } from 'react'
import { useRequest } from 'ahooks'
import { CheckCircleOutlined } from '@yakit-libs/yakit-ui-icons/outline'
import { YakitSpin } from '@/components/yakitUI/YakitSpin/YakitSpin'
import { YakitTag } from '@/components/yakitUI/YakitTag/YakitTag'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { grpcQueryAIFocus } from '../../../grpc'
import type { ResourceFilterValue } from '../../../resourceFilter'
import { useMentionRowsKeyboard } from '../../../components/aiChatMention/hooks/useMentionRowsKeyboard'
import { matchesMentionKeyword, sceneMentionRow } from '../../../components/aiChatMention/mentionListData'
import type { MentionListControls } from '../../../components/aiChatMention/type'
import MaterialListPanel from '../materialListPanel/MaterialListPanel'
import type { MaterialPanelHeader, SelectedFocusMode } from '../type'
import styles from '../materialCategoryPicker/MaterialCategoryPicker.module.scss'

interface MaterialFocusModeListProps extends MaterialPanelHeader {
  selectedId?: string
  onChange: (focusMode?: SelectedFocusMode) => void
}

interface FocusModeOptionsProps {
  query: string
  keyword?: string
  selectedId?: string
  filterValue?: ResourceFilterValue
  keyboard?: Pick<MentionListControls, 'getContainer' | 'keyboardEnabled'>
  onSelect: (focusMode: SelectedFocusMode) => void
  onTotalChange?: (total: number) => void
}

const getNoKeyboardTarget = () => null

export const FocusModeOptions: FC<FocusModeOptionsProps> = ({
  query,
  keyword,
  selectedId,
  filterValue = 'all',
  keyboard,
  onSelect,
  onTotalChange,
}) => {
  const { t, i18n } = useI18nNamespaces(['aiAgent', 'yakitUi'])
  const scrollRef = useRef<HTMLDivElement>(null)
  const { data, loading, run } = useRequest(() => grpcQueryAIFocus(), { manual: true })
  useEffect(() => {
    if (filterValue === 'all') run()
  }, [keyword, filterValue])

  const isChinese = i18n.language === 'zh' || i18n.language === 'zh-TW'
  const available = data?.Data ?? []
  const selected = available.find((item) => item.Name === selectedId)
  const scenes = filterValue === 'added' ? (selectedId ? [selected ?? { Name: selectedId }] : []) : available
  const search = (filterValue === 'added' ? query : (keyword ?? query)).trim().toLowerCase()
  const rows = scenes
    .map((item) => sceneMentionRow(item, isChinese, selectedId))
    .filter((row) => matchesMentionKeyword(row, search))
  const spinning = loading && filterValue === 'all'
  useEffect(() => onTotalChange?.(rows.length), [rows.length, onTotalChange])

  const rowProps = useMentionRowsKeyboard(
    scrollRef,
    spinning ? [] : rows,
    {
      getContainer: keyboard?.getContainer ?? getNoKeyboardTarget,
      keyboardEnabled: !!keyboard && keyboard.keyboardEnabled !== false,
      onSelect: (_, row) => onSelect({ id: row.id, label: row.row.name ?? row.name }),
    },
    query,
  )

  return (
    <div className={styles['scenario-list']} ref={scrollRef} role={keyboard ? 'listbox' : undefined}>
      {spinning ? (
        <YakitSpin />
      ) : rows.length ? (
        rows.map((row) => {
          const { id, active, onSelect: select } = rowProps(row)
          const { name = row.name, description, current } = row.row
          return (
            <div
              key={id}
              id={id}
              role={keyboard ? 'option' : 'button'}
              tabIndex={keyboard ? undefined : 0}
              className={styles['scenario-row']}
              aria-label={name}
              aria-pressed={keyboard ? undefined : current}
              aria-selected={keyboard ? active : undefined}
              onClick={select}
              onKeyDown={(event) => {
                if (keyboard) return
                if (event.key !== 'Enter' && event.key !== ' ') return
                event.preventDefault()
                if (!event.repeat) select()
              }}
            >
              <span className={styles.name} title={name}>
                {name}
              </span>
              <span className={styles.description} title={description}>
                {description || (isChinese ? t('YakitEmpty.noDescription') : undefined)}
              </span>
              {current && (
                <YakitTag
                  className={styles['scenario-current']}
                  size="small"
                  color="success"
                  border={false}
                  fullRadius
                  icon={<CheckCircleOutlined size={12} color="currentColor" />}
                >
                  {t('AIAddMaterialsPopover.currentScenario')}
                </YakitTag>
              )}
            </div>
          )
        })
      ) : (
        <div className={styles.empty}>{t('YakitEmpty.noData')}</div>
      )}
    </div>
  )
}

const MaterialFocusModeList: FC<MaterialFocusModeListProps> = ({ selectedId, onChange, ...header }) => {
  const [search, setSearch] = useState('')
  return (
    <MaterialListPanel {...header} search={search} onSearchChange={setSearch} variant="scenario">
      <FocusModeOptions
        query={search}
        selectedId={selectedId}
        onSelect={(item) => onChange(item.id === selectedId ? undefined : item)}
      />
    </MaterialListPanel>
  )
}

export default MaterialFocusModeList
