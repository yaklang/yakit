import type { FC } from 'react'
import { ArrowUpRightOutlined } from '@yakit-libs/yakit-ui-icons/outline'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitTag } from '@/components/yakitUI/YakitTag/YakitTag'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import type { AIAddMaterialsPopoverProps, MaterialCategory, MaterialMenuItem } from '../type'
import styles from '../AIAddMaterialsPopover.module.scss'

interface MaterialMenuProps {
  items: MaterialMenuItem[]
  filterMode?: AIAddMaterialsPopoverProps['filterMode']
  onOpenCategory: (category: MaterialCategory) => void
}

const MaterialMenu: FC<MaterialMenuProps> = ({ items, filterMode, onOpenCategory }) => {
  const { t } = useI18nNamespaces(['aiAgent'])

  return (
    <>
      <header className={`${styles.header} ${styles['menu-header']}`}>
        <span className={styles['title']}>{t('AIChatTextarea.addMaterials')}</span>
        <span className={styles['description']}>{t('AIAddMaterialsPopover.contextHint')}</span>
      </header>
      {items.map(({ label, description, icon, action, external, tab, current, category }) =>
        tab && filterMode?.includes(tab) ? null : (
          <YakitButton
            type="text2"
            key={label}
            className={styles['item']}
            onClick={action ?? (() => category && onOpenCategory(category))}
          >
            <span className={styles['icon']} aria-hidden="true">
              {icon}
            </span>
            <span className={styles['item-title']}>{label}</span>
            <span className={styles['description']}>{description}</span>
            {external && <ArrowUpRightOutlined size={16} className={styles['external']} />}
            {current && (
              <YakitTag
                className={styles['current']}
                size="small"
                color="success"
                border={false}
                fullRadius
                title={current}
              >
                <span className={styles['current-prefix']}>{t('AIAddMaterialsPopover.current')}</span>
                <span className={styles['current-name']}>{current}</span>
              </YakitTag>
            )}
          </YakitButton>
        ),
      )}
    </>
  )
}

export default MaterialMenu
