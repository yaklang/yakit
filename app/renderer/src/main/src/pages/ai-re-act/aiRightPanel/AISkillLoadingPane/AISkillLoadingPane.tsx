import type React from 'react'
import { memo, useEffect, useRef, useState } from 'react'
import { useStore } from 'zustand'
import { Tooltip } from 'antd'
import { useCreation, useInViewport, useMemoizedFn } from 'ahooks'
import { RefreshOutlined } from '@yakit-libs/yakit-ui-icons/outline'
import { YakitInput } from '@/components/yakitUI/YakitInput/YakitInput'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import useAIAgentDispatcher from '@/pages/ai-agent/useContext/useDispatcher'
import { randomString } from '@/utils/randomUtil'
import { useCurrentStore } from '../../hooks/useCurrentDataBySession'
import useCurrentTaskData from '../../hooks/useCurrentTaskData/useCurrentTaskData'
import useCurrentSessionId from '../../hooks/useCurrentSessionId'
import { useSyncLoadingState } from '../../hooks/useSyncLoadingState'
import { AIInputEventSyncTypeEnum } from '../../hooks/grpcApi'
import { AISkillList } from './aiSkillList/AISkillList'
import { AISkillSortButton } from './aiSkillSortButton/AISkillSortButton'
import { useSkillLoading } from './useSkillLoading'
import { getSkillList } from './utils'
import type { AISkillLoadingPaneProps, AISkillSortOrder } from './type'
import styles from './AISkillLoadingPane.module.scss'

export const AISkillLoadingPane: React.FC<AISkillLoadingPaneProps> = memo(({ loadState, onTotalChange }) => {
  const { t } = useI18nNamespaces(['aiAgent', 'yakitUi'])
  const store = useCurrentStore()
  const sessionId = useCurrentSessionId()
  const { onSend } = useAIAgentDispatcher()
  const { loading: refreshLoading, markSending } = useSyncLoadingState()
  const { addLoading, addingSkill, onAddSkill } = useSkillLoading()
  const taskId = useStore(store, (state) => state.currentChatStatus.questionID)
  const taskData = useCurrentTaskData(taskId)
  const [keyword, setKeyword] = useState('')
  const [sortOrder, setSortOrder] = useState<AISkillSortOrder>()

  const contentRef = useRef<HTMLDivElement>(null)
  const [inViewport] = useInViewport(contentRef)

  const list = useCreation(
    () => getSkillList({ skills: taskData?.skills, loadState, keyword, sortOrder }),
    [taskId, taskData?.uuid, loadState, keyword, sortOrder],
  )

  useEffect(() => {
    onTotalChange?.(list.length)
  }, [list.length, onTotalChange])

  const onRefresh = useMemoizedFn(() => {
    const syncId = randomString(8)
    markSending(syncId)
    onSend({
      token: sessionId,
      type: '',
      params: {
        IsSyncMessage: true,
        SyncType: AIInputEventSyncTypeEnum.SYNC_TYPE_SESSION_SNAPSHOT_SYNC,
        SyncID: syncId,
      },
    })
  })

  useEffect(() => {
    if (inViewport && !addLoading) onRefresh()
  }, [inViewport, sessionId, addLoading, onRefresh])

  return (
    <div className={styles['content']} ref={contentRef}>
      <div className={styles['toolbar']}>
        <YakitInput.Search
          wrapperClassName={styles['search']}
          placeholder={t('AISkillLoadingPane.searchPlaceholder')}
          aria-label={t('AISkillLoadingPane.searchPlaceholder')}
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          onSearch={setKeyword}
          size="large"
        />
        {loadState === 'loaded' && <AISkillSortButton sortOrder={sortOrder} onChange={setSortOrder} />}
        <Tooltip title={t('YakitButton.refresh')}>
          <YakitButton
            type="text2"
            aria-label={t('YakitButton.refresh')}
            icon={<RefreshOutlined />}
            loading={refreshLoading}
            disabled={refreshLoading}
            onClick={onRefresh}
          />
        </Tooltip>
      </div>
      <AISkillList
        key={`${taskId}:${loadState}:${keyword}`}
        data={list}
        loadState={loadState}
        onAdd={onAddSkill}
        addLoading={addLoading}
        addingSkill={addingSkill}
      />
    </div>
  )
})
