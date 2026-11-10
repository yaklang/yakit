import { useState } from 'react'
import type { FC } from 'react'
import { useRequest } from 'ahooks'
import { CheckCircleOutlined } from '@yakit-libs/yakit-ui-icons/outline'
import { YakitSpin } from '@/components/yakitUI/YakitSpin/YakitSpin'
import { YakitTag } from '@/components/yakitUI/YakitTag/YakitTag'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { grpcQueryAIFocus } from '../../../grpc'
import MaterialListPanel from '../materialListPanel/MaterialListPanel'
import type { MaterialPanelHeader, SelectedFocusMode } from '../type'
import styles from '../materialCategoryPicker/MaterialCategoryPicker.module.scss'

interface MaterialFocusModeListProps extends MaterialPanelHeader {
  selectedId?: string
  onChange: (focusMode?: SelectedFocusMode) => void
}

const MaterialFocusModeList: FC<MaterialFocusModeListProps> = ({ selectedId, onChange, ...header }) => {
  const { t, i18n } = useI18nNamespaces(['aiAgent', 'yakitUi'])
  const [search, setSearch] = useState('')
  const { data, loading } = useRequest(() => grpcQueryAIFocus())
  const isChinese = i18n.language === 'zh' || i18n.language === 'zh-TW'
  const options = (data?.Data ?? []).map((item) => ({
    id: item.Name,
    label: isChinese ? item.VerboseNameZh || item.Name : item.Name,
    description: isChinese ? item.DescriptionZh || item.Description || t('YakitEmpty.noDescription') : item.Description,
  }))
  const query = search.trim().toLowerCase()
  const visibleOptions = options.filter((item) =>
    [item.label, item.id, item.description].some((value) => value?.toLowerCase().includes(query)),
  )

  return (
    <MaterialListPanel {...header} search={search} onSearchChange={setSearch} variant="scenario">
      <div className={styles['scenario-list']}>
        {visibleOptions.map(({ id, label, description }) => {
          const selected = selectedId === id
          const toggleSelection = () => onChange(selected ? undefined : { id, label })
          return (
            <div
              key={id}
              role="button"
              tabIndex={0}
              className={styles['scenario-row']}
              aria-label={label}
              aria-pressed={selected}
              onClick={toggleSelection}
              onKeyDown={(event) => {
                if (event.key !== 'Enter' && event.key !== ' ') return
                event.preventDefault()
                if (!event.repeat) toggleSelection()
              }}
            >
              <span className={styles.name} title={label}>
                {label}
              </span>
              <span className={styles.description} title={description}>
                {description}
              </span>
              {selected && (
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
        })}
        {loading && <YakitSpin />}
      </div>
      {!loading && !visibleOptions.length && <div className={styles.empty}>{t('YakitEmpty.noData')}</div>}
    </MaterialListPanel>
  )
}

export default MaterialFocusModeList
