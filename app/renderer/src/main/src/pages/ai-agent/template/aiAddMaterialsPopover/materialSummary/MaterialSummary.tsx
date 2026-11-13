import { useState } from 'react'
import type { FC } from 'react'
import classNames from 'classnames'
import {
  ArrowUpRightOutlined,
  CheckCheckOutlined,
  PencilAltOutlined,
  PlusSmOutlined,
  XOutlined,
} from '@yakit-libs/yakit-ui-icons/outline'
import { YakitPopover } from '@/components/yakitUI/YakitPopover/YakitPopover'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import type { MaterialSummaryPanelProps, MaterialSummaryProps } from './type'
import styles from './MaterialSummary.module.scss'

export const MaterialSummaryPanel: FC<MaterialSummaryPanelProps> = ({ group, onClose }) => {
  const { title, count, icon, rows, onAdd, headerAction } = group
  const { t } = useI18nNamespaces(['aiAgent', 'yakitUi'])
  const navigate = (action: () => void) => {
    onClose()
    action()
  }

  return (
    <section
      role="dialog"
      aria-label={title}
      className={styles['details']}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <header className={styles['header']}>
        {icon && (
          <span className={styles['detail-icon']} aria-hidden="true">
            {icon}
          </span>
        )}
        <span className={styles['title']}>{title}</span>
        <span className={styles['detail-count']}>{count}</span>
        {headerAction && <div className={styles['header-action']}>{headerAction}</div>}
        {onAdd && (
          <YakitButton
            className={styles['add']}
            type="outline2"
            size="small"
            radius={true}
            icon={<ArrowUpRightOutlined size={12} />}
            iconPosition="end"
            onClick={() => navigate(onAdd)}
          >
            {t('AIAddMaterialsPopover.goToAdd')}
          </YakitButton>
        )}
      </header>
      <ul className={styles['list']}>
        {rows.map(
          ({
            key: rowKey,
            name,
            icon: rowIcon,
            description,
            count: rowCount,
            hideCount,
            onOpen: onOpenRow,
            onRemove,
            selection,
            onEdit,
          }) => {
            const checked = selection?.checked ?? !!onRemove
            const onToggle = selection?.onChange ?? onRemove
            return (
              <li
                key={rowKey}
                className={classNames(styles['row'], {
                  [styles['removable']]: checked && onToggle,
                  [styles['clickable']]: onOpenRow && !onRemove,
                })}
                onClick={onOpenRow && !onRemove ? () => navigate(onOpenRow) : undefined}
              >
                <span className={styles['detail-icon']} aria-hidden="true">
                  {rowIcon}
                </span>
                <span className={styles['name']} title={name}>
                  {name}
                </span>
                <span className={styles['description']} title={description}>
                  {description}
                </span>
                {!hideCount && rowCount !== undefined && <span className={styles['detail-count']}>{rowCount}</span>}
                {onToggle ? (
                  <YakitButton
                    type="text2"
                    className={styles['remove-action']}
                    aria-label={`${t(checked ? 'YakitButton.cancel' : 'YakitButton.add')} ${name}`}
                    aria-pressed={selection?.checked}
                    icon={checked ? undefined : <PlusSmOutlined size={16} />}
                    onClick={() => {
                      if (!selection && rows.length === 1) onClose()
                      onToggle()
                    }}
                  >
                    {checked && (
                      <>
                        <CheckCheckOutlined
                          size={16}
                          color="currentColor"
                          className={styles['check']}
                          svgProps={{ style: { color: 'inherit' } }}
                        />
                        <span className={styles['remove']}>
                          <XOutlined size={16} color="currentColor" svgProps={{ style: { color: 'inherit' } }} />
                          {t('YakitButton.cancel')}
                        </span>
                      </>
                    )}
                  </YakitButton>
                ) : onOpenRow ? (
                  <YakitButton type="text2" size="small" aria-label={name} icon={<ArrowUpRightOutlined size={12} />} />
                ) : rowCount === undefined ? (
                  <CheckCheckOutlined size={16} color="currentColor" className={styles['check']} />
                ) : null}
                {onEdit && (
                  <YakitButton
                    type="text2"
                    size="small"
                    icon={<PencilAltOutlined size={16} color="currentColor" />}
                    aria-label={`${t('YakitButton.edit')} ${name}`}
                    onClick={() => navigate(onEdit)}
                  />
                )}
              </li>
            )
          },
        )}
      </ul>
    </section>
  )
}

const MaterialSummary: FC<MaterialSummaryProps> = ({ groups, onOpen }) => {
  const [active, setActive] = useState<string>()
  const close = () => setActive(undefined)

  return groups.map((group) => {
    const { key, label, count, icon } = group
    return (
      <YakitPopover
        key={key}
        placement="topLeft"
        arrow={false}
        trigger="click"
        open={active === key}
        onOpenChange={(open) => {
          if (open) onOpen()
          setActive((current) => (open ? key : current === key ? undefined : current))
        }}
        destroyOnHidden
        classNames={{ root: classNames(styles['popover'], { [styles['compact']]: !icon }), body: styles['body'] }}
        content={<MaterialSummaryPanel key={active === key ? 'open' : 'closed'} group={group} onClose={close} />}
      >
        <YakitButton
          type="text2"
          className={classNames(styles['badge'], { [styles['with-icon']]: icon })}
          aria-haspopup="dialog"
          aria-expanded={active === key}
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        >
          {icon && (
            <span className={styles['badge-icon']} aria-hidden="true">
              {icon}
            </span>
          )}
          <span className={styles['badge-label']}>
            {label} <span className={styles['badge-count']}>{count}</span>
          </span>
        </YakitButton>
      </YakitPopover>
    )
  })
}

export default MaterialSummary
