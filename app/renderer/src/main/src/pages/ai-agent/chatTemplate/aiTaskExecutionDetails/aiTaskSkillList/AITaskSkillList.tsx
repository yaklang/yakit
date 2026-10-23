import { useState } from 'react'
import type { FC } from 'react'
import { useCreation } from 'ahooks'
import { YakitRadioButtons } from '@/components/yakitUI/YakitRadioButtons/YakitRadioButtons'
import { YakitTag } from '@/components/yakitUI/YakitTag/YakitTag'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { AISkillList } from '@/pages/ai-re-act/aiRightPanel/AISkillLoadingPane/aiSkillList/AISkillList'
import { AISkillSortButton } from '@/pages/ai-re-act/aiRightPanel/AISkillLoadingPane/aiSkillSortButton/AISkillSortButton'
import { getSkillList } from '@/pages/ai-re-act/aiRightPanel/AISkillLoadingPane/utils'
import type { AITaskSkillListProps } from './type'
import styles from './AITaskSkillList.module.scss'

export const AITaskSkillList: FC<AITaskSkillListProps> = ({ skills, taskId }) => {
  const { t } = useI18nNamespaces(['aiAgent'])
  const [loadState, setLoadState] = useState<'loaded' | 'metadata'>('loaded')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>()
  const data = useCreation(
    () => getSkillList({ skills: [...(skills?.fixed || []), ...(skills?.dynamic || [])], loadState, sortOrder }),
    [skills, loadState, sortOrder],
  )

  return (
    <div className={styles['skill-card-body']}>
      <div className={styles['skill-card-header']}>
        <div className={styles['plugin-group-title']}>
          <YakitRadioButtons
            buttonStyle="solid"
            value={loadState}
            onChange={(event) => setLoadState(event.target.value)}
            options={[
              { label: t('AISkillLoadingPane.loaded'), value: 'loaded' },
              { label: t('AISkillLoadingPane.available'), value: 'metadata' },
            ]}
          />
          <YakitTag border={false} fullRadius size="small">
            {data.length}
          </YakitTag>
        </div>
        {loadState === 'loaded' && <AISkillSortButton sortOrder={sortOrder} onChange={setSortOrder} />}
      </div>
      <div className={styles['skill-card-list']}>
        <AISkillList source="task-details" key={`${taskId}-${loadState}`} data={data} loadState={loadState} />
      </div>
    </div>
  )
}
