import { useState } from 'react'
import type { FC } from 'react'
import classNames from 'classnames'
import { FilterOutlined, ReplyOutlined, SearchOutlined } from '@yakit-libs/yakit-ui-icons/outline'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitDropdownMenu } from '@/components/yakitUI/YakitDropdownMenu/YakitDropdownMenu'
import { YakitInput } from '@/components/yakitUI/YakitInput/YakitInput'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import type { MaterialListPanelProps } from './type'
import styles from '../AIAddMaterialsPopover.module.scss'

const MaterialListPanel: FC<MaterialListPanelProps> = ({
  title,
  description,
  icon,
  onBack,
  headerAction,
  search,
  onSearchChange,
  filter,
  variant,
  children,
}) => {
  const { t } = useI18nNamespaces(['aiAgent', 'yakitUi'])
  const [filterOpen, setFilterOpen] = useState(false)
  const isAttachmentPanel = variant === 'attachments'

  return (
    <>
      <header className={classNames(styles.header, { [styles['attachment-header']]: isAttachmentPanel })}>
        <span className={styles.icon} aria-hidden="true">
          {icon}
        </span>
        <span className={styles.title}>{title}</span>
        <span className={styles.description}>{description}</span>
        {onBack && (
          <YakitButton type="text2" icon={<ReplyOutlined />} iconPosition="end" onClick={onBack}>
            <span className={styles.title}>{t('YakitButton.back')}</span>
          </YakitButton>
        )}
        {headerAction}
      </header>
      {onSearchChange && (
        <div
          className={classNames(styles.search, {
            [styles['filter-search']]: filter,
            [styles['scenario-search']]: variant === 'scenario',
            [styles['attachment-search']]: isAttachmentPanel,
          })}
        >
          {filter && (
            <>
              <YakitDropdownMenu
                dropdown={{
                  trigger: ['click'],
                  placement: 'bottomLeft',
                  open: filterOpen,
                  onOpenChange: setFilterOpen,
                  getPopupContainer: (trigger) => trigger.parentElement ?? document.body,
                }}
                menu={{
                  data: [
                    { key: 'all', label: t('AIMentionTabs.all') },
                    { key: 'added', label: t('YakitButton.added') },
                  ],
                  selectedKeys: [filter.addedOnly ? 'added' : 'all'],
                  onClick: ({ key }) => {
                    filter.onChange(key === 'added')
                    setFilterOpen(false)
                  },
                }}
              >
                <YakitButton
                  type="text2"
                  style={{ border: 0 }}
                  icon={<FilterOutlined size={16} color="var(--Colors-Use-Neutral-Text-3-Secondary)" />}
                  aria-haspopup="menu"
                  aria-expanded={filterOpen}
                >
                  {t(filter.addedOnly ? 'YakitButton.added' : 'AIMentionTabs.all')}
                </YakitButton>
              </YakitDropdownMenu>
              <span className={styles['filter-divider']} aria-hidden="true" />
            </>
          )}
          <YakitInput
            variant="borderless"
            prefix={<SearchOutlined size={16} color={isAttachmentPanel ? undefined : 'currentColor'} />}
            aria-label={t('YakitInput.search')}
            placeholder={t('AIAddMaterialsPopover.searchMaterials')}
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            autoFocus={!isAttachmentPanel}
          />
        </div>
      )}
      {children}
    </>
  )
}

export default MaterialListPanel
