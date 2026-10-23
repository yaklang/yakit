import type React from 'react'
import { memo, useEffect, useRef, useState } from 'react'
import { useStore } from 'zustand'
import { Tooltip } from 'antd'
import { useCreation, useInViewport, useMemoizedFn } from 'ahooks'
import { RefreshOutlined } from '@yakit-libs/yakit-ui-icons/outline'
import { YakitInput } from '@/components/yakitUI/YakitInput/YakitInput'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitSpin } from '@/components/yakitUI/YakitSpin/YakitSpin'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import useAIAgentDispatcher from '@/pages/ai-agent/useContext/useDispatcher'
import { randomString } from '@/utils/randomUtil'
import { useCurrentRawData, useCurrentStore } from '../../hooks/useCurrentDataBySession'
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
  const rawData = useCurrentRawData()
  const sessionId = useCurrentSessionId()
  const { onSend } = useAIAgentDispatcher()
  const { loading: loadedLoading, markSending: markLoadedSending } = useSyncLoadingState()
  const { loading: availableLoading, markSending: markAvailableSending } = useSyncLoadingState()
  const refreshLoading = loadedLoading || availableLoading
  const { addLoading, addingSkill, onAddSkill } = useSkillLoading()
  const skillsUpdate = useStore(store, (state) => state.skillsUpdate)
  const [keyword, setKeyword] = useState('')
  const [sortOrder, setSortOrder] = useState<AISkillSortOrder>()

  const contentRef = useRef<HTMLDivElement>(null)
  const [inViewport] = useInViewport(contentRef)

  const list = useCreation(
    () => getSkillList({ skills: rawData.skills, loadState, keyword, sortOrder }),
    [skillsUpdate, loadState, keyword, sortOrder],
  )

  useEffect(() => {
    onTotalChange?.(list.length)
  }, [list.length, onTotalChange])

  const onRefresh = useMemoizedFn(() => {
    if (!sessionId) return
    const loadedSyncId = randomString(8)
    markLoadedSending(loadedSyncId)
    onSend({
      token: sessionId,
      type: '',
      params: {
        IsSyncMessage: true,
        SyncType: AIInputEventSyncTypeEnum.SYNC_TYPE_SKILL_LOADED,
        SyncID: loadedSyncId,
      },
    })
    const availableSyncId = randomString(8)
    markAvailableSending(availableSyncId)
    onSend({
      token: sessionId,
      type: '',
      params: {
        IsSyncMessage: true,
        SyncType: AIInputEventSyncTypeEnum.SYNC_TYPE_SKILL_AVAILABLE,
        SyncID: availableSyncId,
        SyncJsonInput: JSON.stringify({ page: 1 }),
      },
    })
  })

  useEffect(() => {
    if (inViewport && !addLoading) onRefresh()
  }, [inViewport, addLoading])

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
            onClick={() => {
              rawData.skillDetails.clear()
              onRefresh()
            }}
          />
        </Tooltip>
      </div>
      <YakitSpin spinning={refreshLoading} wrapperClassName={styles['list-spin']}>
        <AISkillList
          source="right-panel"
          key={`${sessionId}:${loadState}:${keyword}`}
          data={list}
          loadState={loadState}
          onAdd={onAddSkill}
          addLoading={addLoading}
          addingSkill={addingSkill}
        />
      </YakitSpin>
    </div>
  )
})
