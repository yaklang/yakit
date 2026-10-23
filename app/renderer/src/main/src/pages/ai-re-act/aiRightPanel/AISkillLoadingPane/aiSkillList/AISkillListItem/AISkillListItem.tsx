import type { FC } from 'react'
import { lazy, Suspense, useState } from 'react'
import { Tooltip } from 'antd'
import { PlusOutlined } from '@yakit-libs/yakit-ui-icons/outline'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitPopover } from '@/components/yakitUI/YakitPopover/YakitPopover'
import { YakitSpin } from '@/components/yakitUI/YakitSpin/YakitSpin'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import type { AISkillListItemProps } from './type'
import styles from './AISkillListItem.module.scss'

const AISkillDetails = lazy(() => import('../AISkillDetails/AISkillDetails'))

const AISkillListItem: FC<AISkillListItemProps> = ({ source, skill, loadState, onAdd, addLoading, addingSkill }) => {
  const { t } = useI18nNamespaces(['aiAgent', 'yakitUi'])
  const [open, setOpen] = useState(false)

  const renderExtra = () => {
    const tokenCount =
      loadState === 'loaded' ? (
        <Tooltip title={t('AISkillLoadingPane.contextSize')}>
          <span className={styles['token-count']}>{skill.token_count ?? '—'}</span>
        </Tooltip>
      ) : null

    switch (source) {
      case 'task-details':
        return tokenCount
      case 'right-panel':
        if (loadState === 'metadata') {
          return (
            <Tooltip title={t('YakitButton.add')}>
              <YakitButton
                type="text2"
                size="small"
                className={styles['add-button']}
                aria-label={t('YakitButton.add')}
                icon={<PlusOutlined />}
                loading={addLoading && addingSkill === skill.name}
                disabled={addLoading}
                onClick={() => onAdd?.(skill.name)}
              />
            </Tooltip>
          )
        }
        return tokenCount
      default:
        return null
    }
  }

  return (
    <YakitPopover
      trigger="hover"
      placement="right"
      destroyOnHidden
      fresh
      open={open}
      onOpenChange={setOpen}
      classNames={{ root: styles['popover'] }}
      content={
        <Suspense
          fallback={
            <div className={styles['preview-loading']}>
              <YakitSpin spinning />
            </div>
          }
        >
          {open && <AISkillDetails key={skill.name} source={source} name={skill.name} />}
        </Suspense>
      }
    >
      <div className={styles['row']}>
        <div className={styles['item']} role="listitem">
          <div className={styles['item-header']}>
            <span className={styles['name']} title={skill.name}>
              {skill.name}
            </span>
            {renderExtra()}
          </div>
          <div className={styles['description']} title={skill.description}>
            {skill.description}
          </div>
        </div>
      </div>
    </YakitPopover>
  )
}

export default AISkillListItem
