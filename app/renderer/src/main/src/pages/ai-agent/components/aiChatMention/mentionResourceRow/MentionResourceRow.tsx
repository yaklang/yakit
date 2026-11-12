import type { FC, ReactNode } from 'react'
import classNames from 'classnames'
import {
  BookOpenTextOutlined,
  FolderOpenOutlined,
  PuzzleOutlined,
  Wrench2Outlined,
} from '@yakit-libs/yakit-ui-icons/outline'
import { YakitTag } from '@/components/yakitUI/YakitTag/YakitTag'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { targetIcon } from '@/pages/KnowledgeBase/utils'
import { getFileIconByName, KeyToIcon } from '@/pages/yakRunner/FileTree/icon'
import type { MentionResourceRowProps } from './type'
import styles from './MentionResourceRow.module.scss'

const renderResourceIcon = ({
  kind,
  name,
  knowledgeIndex,
}: Pick<MentionResourceRowProps, 'kind' | 'name' | 'knowledgeIndex'>): ReactNode => {
  switch (kind) {
    case 'forge':
      return <PuzzleOutlined size={16} color="currentColor" />
    case 'tool':
      return <Wrench2Outlined size={16} color="currentColor" />
    case 'knowledgeBase': {
      const Icon = knowledgeIndex === undefined ? BookOpenTextOutlined : targetIcon(knowledgeIndex)
      return <Icon className={styles.icon} />
    }
    case 'folder':
      return <FolderOpenOutlined size={16} color="currentColor" />
    case 'file':
      return <img className={styles.icon} src={KeyToIcon[getFileIconByName(name)].iconPath} alt="" />
    case 'focusMode':
      return null
  }
}

const MentionResourceRow: FC<MentionResourceRowProps> = ({
  id,
  kind,
  name,
  description,
  knowledgeIndex,
  current,
  active,
  onSelect,
}) => {
  const { t } = useI18nNamespaces(['aiAgent'])

  return (
    <div
      id={id}
      role="option"
      aria-selected={!!active}
      className={classNames(styles.row, {
        [styles.active]: active,
        [styles.file]: kind === 'file' || kind === 'folder',
        [styles.scenario]: kind === 'focusMode',
      })}
      onClick={onSelect}
    >
      <span className={styles.content}>
        {renderResourceIcon({ kind, name, knowledgeIndex })}
        <span className={styles.content}>
          <span className={styles.name} title={name}>
            {name}
          </span>
          {description && (
            <span className={styles.description} title={description}>
              {description}
            </span>
          )}
          {current && (
            <YakitTag className={styles.current} size="small" color="success" border={false} fullRadius>
              {t('AIAddMaterialsPopover.currentScenario')}
            </YakitTag>
          )}
        </span>
      </span>
    </div>
  )
}

export default MentionResourceRow
