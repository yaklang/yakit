import { useState } from 'react'
import { Tooltip } from 'antd'
import type { FC } from 'react'
import classNames from 'classnames'
import {
  LightningBoltOutlined,
  PuzzleOutlined,
  BookOpenTextOutlined,
  AddPayloadOutlined,
  ArrowUpRightOutlined,
  ChevronLeftOutlined,
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
  const [selectedGroupKey, setSelectedGroupKey] = useState<string>()
  const selectedGroup = group.rows.find((row) => row.group?.key === selectedGroupKey)?.group
  const { title, count, icon, rows, onAdd, headerAction } = selectedGroup ?? group
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
        {selectedGroup && (
          <YakitButton
            type="text2"
            aria-label={group.title}
            icon={<ChevronLeftOutlined size={14} />}
            onClick={() => setSelectedGroupKey(undefined)}
          />
        )}
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
            onClearCategory,
            selection,
            onEdit,
            group: nestedGroup,
          }) => {
            const openRow = nestedGroup
              ? () => setSelectedGroupKey(nestedGroup.key)
              : onOpenRow
                ? () => navigate(onOpenRow)
                : undefined
            const checked = selection?.checked ?? !!onRemove
            const onToggle = selection?.onChange ?? onRemove
            return (
              <li
                key={rowKey}
                className={classNames(styles['row'], {
                  [styles['removable']]: checked && onToggle,
                  [styles['clickable']]: openRow && !onRemove,
                })}
                onClick={openRow && !onRemove ? openRow : undefined}
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
                {group.allowCategoryRemoval && !selectedGroup && onClearCategory && (
                  <YakitButton
                    type="text2"
                    className={styles['clear-category']}
                    aria-label={`${t('YakitButton.delete')} ${name}`}
                    icon={<XOutlined size={12} />}
                    onClick={(event) => {
                      event.stopPropagation()
                      onClearCategory()
                    }}
                  />
                )}
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
                ) : openRow ? (
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

const icons = {
  capabilities: LightningBoltOutlined,
  forge: PuzzleOutlined,
  knowledgeBase: BookOpenTextOutlined,
  other: AddPayloadOutlined,
}

const MaterialSummary: FC<MaterialSummaryProps> = ({ groups, onOpen }) => {
  const { t } = useI18nNamespaces(['aiAgent'])
  const [active, setActive] = useState<string>()
  const close = () => setActive(undefined)

  return groups.map((group) => {
    const { key, count } = group
    const showMaterialsTag = group.rows.some(
      ({ group: category }) => category?.key === 'forge' || category?.key === 'knowledgeBase',
    )
    const label = showMaterialsTag ? t('AIChatTextarea.materials') : group.label
    const Icon = icons[key as keyof typeof icons]
    const icon = Icon ? <Icon size={14} /> : group.icon
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
        classNames={{ root: classNames(styles['popover'], { [styles['compact']]: !group.icon }), body: styles['body'] }}
        content={<MaterialSummaryPanel key={active === key ? 'open' : 'closed'} group={group} onClose={close} />}
      >
        <div
          data-ai-summary-tag
          data-category={key}
          data-merged-categories={showMaterialsTag || undefined}
          className={styles['summary-tag']}
          title={label + ' · ' + count}
        >
          <Tooltip title={label + ' · ' + count} trigger={['hover', 'focus']}>
            <button
              type="button"
              className={styles['summary-open']}
              aria-haspopup="dialog"
              aria-expanded={active === key}
              aria-label={label + ' ' + count}
            >
              {icon && (
                <span className={styles['summary-icon']} aria-hidden="true">
                  {icon}
                </span>
              )}
              <span data-ai-summary-label>{label} · </span>
              <span>{count}</span>
            </button>
          </Tooltip>
          {group.onRemove && (
            <button
              type="button"
              className={styles['summary-close']}
              aria-label={label + ' ×'}
              onClick={(event) => {
                event.stopPropagation()
                close()
                group.onRemove?.()
              }}
            >
              <XOutlined size={12} />
            </button>
          )}
        </div>
      </YakitPopover>
    )
  })
}

export default MaterialSummary
