import type React from 'react'
import { memo, useState } from 'react'
import styles from './HistoryTaskTree.module.scss'
import { OutlineChevrondownIcon } from '@/assets/icon/outline'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { useCasualConcurrentTaskList } from './useHasTaskTree'
import { AITree } from '../../aiTree/AITree'

export const SubAgentList: React.FC = memo(() => {
  const { t } = useI18nNamespaces(['aiAgent'])
  const casualConcurrentTaskList = useCasualConcurrentTaskList()
  const [expanded, setExpanded] = useState(true)

  if (casualConcurrentTaskList.length === 0) return null

  return (
    <div className={styles['section']}>
      <div className={styles['section-title']} onClick={() => setExpanded((p) => !p)}>
        <OutlineChevrondownIcon style={{ transform: expanded ? 'rotate(0deg)' : 'rotate(-90deg)' }} />
        <span>{t('HistoryTaskTree.subAgent')}</span>
      </div>
      {expanded && (
        <div className={styles['section-body']}>
          <AITree tasks={casualConcurrentTaskList} taskType="current" className={styles['tree-wrapper']} />
        </div>
      )}
    </div>
  )
})
