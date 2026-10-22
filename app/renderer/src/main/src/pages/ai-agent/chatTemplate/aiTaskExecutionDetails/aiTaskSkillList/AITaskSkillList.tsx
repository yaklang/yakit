import { useState } from 'react'
import type { FC } from 'react'
import { useCreation, useMemoizedFn, useUpdateEffect } from 'ahooks'
import { YakitRadioButtons } from '@/components/yakitUI/YakitRadioButtons/YakitRadioButtons'
import { YakitTag } from '@/components/yakitUI/YakitTag/YakitTag'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { AIInputEventSyncTypeEnum } from '@/pages/ai-re-act/hooks/grpcApi'
import useCurrentSessionId from '@/pages/ai-re-act/hooks/useCurrentSessionId'
import { AISkillList } from '@/pages/ai-re-act/aiRightPanel/AISkillLoadingPane/aiSkillList/AISkillList'
import { AISkillSortButton } from '@/pages/ai-re-act/aiRightPanel/AISkillLoadingPane/aiSkillSortButton/AISkillSortButton'
import { getSkillList } from '@/pages/ai-re-act/aiRightPanel/AISkillLoadingPane/utils'
import { useSkillLoading } from '@/pages/ai-re-act/aiRightPanel/AISkillLoadingPane/useSkillLoading'
import { randomString } from '@/utils/randomUtil'
import useAIAgentDispatcher from '@/pages/ai-agent/useContext/useDispatcher'
import type { AITaskSkillListProps } from './type'
import styles from './AITaskSkillList.module.scss'

export const AITaskSkillList: FC<AITaskSkillListProps> = ({ skills, taskId }) => {
  const { t } = useI18nNamespaces(['aiAgent'])
  const sessionId = useCurrentSessionId()
  const { onSend } = useAIAgentDispatcher()
  const [loadState, setLoadState] = useState<'loaded' | 'metadata'>('loaded')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>()
  const { addLoading, addingSkill, onAddSkill } = useSkillLoading()
  const data = useCreation(() => getSkillList({ skills, loadState, sortOrder }), [skills, loadState, sortOrder])

  const onRefresh = useMemoizedFn(() => {
    onSend({
      token: sessionId,
      type: '',
      params: {
        IsSyncMessage: true,
        SyncType: AIInputEventSyncTypeEnum.SYNC_TYPE_TASK_SNAPSHOT,
        SyncID: randomString(8),
        SyncJsonInput: JSON.stringify({ task_id: taskId }),
      },
    })
  })

  useUpdateEffect(() => {
    if (!addLoading) onRefresh()
  }, [addLoading])

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
        <AISkillList
          key={`${taskId}-${loadState}`}
          data={data}
          loadState={loadState}
          onAdd={onAddSkill}
          addLoading={addLoading}
          addingSkill={addingSkill}
        />
      </div>
    </div>
  )
}
