import { lazy, Suspense, useState } from 'react'
import type { FC } from 'react'
import classNames from 'classnames'
import { ArrowUpRightOutlined, CheckCheckOutlined, XOutlined } from '@yakit-libs/yakit-ui-icons/outline'
import { YakitPopover } from '@/components/yakitUI/YakitPopover/YakitPopover'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitSpin } from '@/components/yakitUI/YakitSpin/YakitSpin'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import type { MaterialSummaryProps } from './type'
import styles from './MaterialSummary.module.scss'

const AISkillDetails = lazy(
  () => import('@/pages/ai-re-act/aiRightPanel/AISkillLoadingPane/aiSkillList/AISkillDetails/AISkillDetails'),
)

const MaterialSummary: FC<MaterialSummaryProps> = ({ groups, onOpen }) => {
  const { t } = useI18nNamespaces(['aiAgent', 'yakitUi'])
  const [active, setActive] = useState<string>()
  const [previewSkillKey, setPreviewSkillKey] = useState<string>()

  const navigate = (action: () => void) => {
    setActive(undefined)
    setPreviewSkillKey(undefined)
    action()
  }

  return groups.map(({ key, label, title, count, icon, rows, onAdd }) => (
    <YakitPopover
      key={key}
      placement="topLeft"
      arrow={false}
      trigger="click"
      open={active === key}
      onOpenChange={(open) => {
        setPreviewSkillKey(undefined)
        if (open) onOpen()
        setActive((current) => (open ? key : current === key ? undefined : current))
      }}
      destroyOnHidden
      classNames={{ root: classNames(styles['popover'], { [styles['compact']]: !icon }), body: styles['body'] }}
      content={
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
                skillName,
                count: rowCount,
                hideCount,
                onOpen: onOpenRow,
                onRemove,
              }) => {
                const row = (
                  <li
                    key={rowKey}
                    className={classNames(styles['row'], {
                      [styles['removable']]: onRemove,
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
                    {onRemove ? (
                      <YakitButton
                        type="text2"
                        className={styles['remove-action']}
                        aria-label={`${t('YakitButton.cancel')} ${name}`}
                        onClick={() => {
                          setPreviewSkillKey(undefined)
                          if (rows.length === 1) setActive(undefined)
                          onRemove()
                        }}
                      >
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
                      </YakitButton>
                    ) : onOpenRow ? (
                      <YakitButton
                        type="text2"
                        size="small"
                        aria-label={name}
                        icon={<ArrowUpRightOutlined size={12} />}
                      />
                    ) : rowCount === undefined ? (
                      <CheckCheckOutlined size={16} color="currentColor" className={styles['check']} />
                    ) : null}
                  </li>
                )
                if (!skillName) return row
                const previewKey = `${key}:${rowKey}`
                const previewOpen = previewSkillKey === previewKey
                return (
                  <YakitPopover
                    key={rowKey}
                    trigger="hover"
                    destroyOnHidden
                    fresh
                    open={previewOpen}
                    onOpenChange={(open) => {
                      if (open) setPreviewSkillKey(previewKey)
                      else setPreviewSkillKey((current) => (current === previewKey ? undefined : current))
                    }}
                    classNames={{ root: styles['skill-popover'] }}
                    content={
                      <Suspense fallback={<YakitSpin spinning />}>
                        {previewOpen && <AISkillDetails key={skillName} source="task-details" name={skillName} />}
                      </Suspense>
                    }
                  >
                    {row}
                  </YakitPopover>
                )
              },
            )}
          </ul>
        </section>
      }
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
  ))
}

export default MaterialSummary
