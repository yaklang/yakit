import type { FC } from 'react'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { BrowserInstanceCard } from '../BrowserInstancesPanel'
import type { BrowserMaterialListProps } from './type'
import styles from './BrowserMaterialList.module.scss'

const BrowserMaterialList: FC<BrowserMaterialListProps> = ({ items, onRemove }) => {
  const { t } = useI18nNamespaces(['yakitUi'])
  return (
    <div className={styles.list}>
      {items.length ? (
        items.map(({ instance, removal, option }) => (
          <div
            key={instance.id}
            id={option?.id}
            role={option ? 'option' : undefined}
            aria-selected={option?.active}
            onClick={option?.onSelect}
            className={styles.item}
          >
            <BrowserInstanceCard
              instance={instance}
              removal={removal && onRemove ? { ...removal, onRemove: () => onRemove(instance.id) } : undefined}
              variant="material"
            />
          </div>
        ))
      ) : (
        <div className={styles.empty}>{t('YakitEmpty.noData')}</div>
      )}
    </div>
  )
}

export default BrowserMaterialList
