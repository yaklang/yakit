import type { FC } from 'react'
import { useEffect, useRef, useState } from 'react'
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
import { AIInputEventSyncTypeEnum, AISkillLoadStateEnum } from '../../hooks/grpcApi'
import { DEFAULT_SKILL_PAGE_SIZE } from '../../hooks/defaultConstant'
import { AISkillList } from './aiSkillList/AISkillList'
import { AISkillSortButton } from './aiSkillSortButton/AISkillSortButton'
import { useSkillLoading } from './useSkillLoading'
import { getSkillList } from './utils'
import type { AISkillLoadingPaneProps, AISkillSortOrder } from './type'
import styles from './AISkillLoadingPane.module.scss'

export const AISkillLoadingPane: FC<AISkillLoadingPaneProps> = ({ loadState, onTotalChange }) => {
  const isLoaded = loadState === AISkillLoadStateEnum.Loaded
  const { t } = useI18nNamespaces(['aiAgent', 'yakitUi'])
  const store = useCurrentStore()
  const rawData = useCurrentRawData()
  const sessionId = useCurrentSessionId()
  const { onSend } = useAIAgentDispatcher()
  const { loading: loadedLoading, markSending: markLoadedSending } = useSyncLoadingState()
  const { loading: availableLoading, markSending: markAvailableSending } = useSyncLoadingState()
  const refreshLoading = isLoaded ? loadedLoading : availableLoading
  const { addLoading, addingSkill, onAddSkill } = useSkillLoading()
  const loadedSkillsUpdate = useStore(store, (state) => state.loadedSkillsUpdate)
  const availableSkillsUpdate = useStore(store, (state) => state.availableSkillsUpdate)
  const sendBlocked = useStore(store, (state) => state.initLoading || state.grpcLoadMoreLoading)
  const [keyword, setKeyword] = useState('')
  const [sortOrder, setSortOrder] = useState<AISkillSortOrder>()
  const query = keyword.trim()

  const contentRef = useRef<HTMLDivElement>(null)
  const waitingAvailableDataRef = useRef(false)
  const requestedQueryRef = useRef('')
  const loadMorePendingRef = useRef(false)
  const [inViewport] = useInViewport(contentRef)
  const skillGroup = isLoaded ? rawData.loadedSkills : rawData.availableSkills

  const list = useCreation(
    () =>
      isLoaded
        ? getSkillList({
            skills: skillGroup.skills,
            keyword,
            sortOrder,
          })
        : skillGroup.skills,
    [loadedSkillsUpdate, availableSkillsUpdate, sessionId, skillGroup, isLoaded, keyword, sortOrder],
  )

  useEffect(() => {
    onTotalChange?.(skillGroup.total)
  }, [skillGroup.total, onTotalChange])

  useEffect(() => {
    waitingAvailableDataRef.current = false
  }, [availableSkillsUpdate, sessionId])

  useEffect(() => {
    requestedQueryRef.current = ''
    loadMorePendingRef.current = false
  }, [sessionId])

  const requestAvailablePage = useMemoizedFn((page: number) => {
    const syncId = randomString(8)
    const sent = onSend({
      token: sessionId,
      type: '',
      params: {
        IsSyncMessage: true,
        SyncType: AIInputEventSyncTypeEnum.SYNC_TYPE_SKILL_AVAILABLE,
        SyncID: syncId,
        SyncJsonInput: JSON.stringify({ page, page_size: DEFAULT_SKILL_PAGE_SIZE, query }),
      },
    })
    if (!sent) return false
    waitingAvailableDataRef.current = true
    requestedQueryRef.current = query
    markAvailableSending(syncId)
    return true
  })

  const onLoadMore = useMemoizedFn(() => {
    const { page, has_more } = rawData.availableSkills
    const queryChanged = query !== requestedQueryRef.current
    if (!sessionId || (!queryChanged && !has_more)) return
    if (sendBlocked || availableLoading || addLoading) {
      loadMorePendingRef.current = true
      return
    }
    // 等待请求页的数据更新，SyncID 回执不代表分页数据已到达。
    if (waitingAvailableDataRef.current) return
    loadMorePendingRef.current = !requestAvailablePage(queryChanged ? 1 : page + 1)
  })

  const onRefresh = useMemoizedFn(() => {
    if (!sessionId || refreshLoading) return
    if (!isLoaded) {
      if (requestAvailablePage(1)) loadMorePendingRef.current = false
      return
    }
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
  })

  useEffect(() => {
    if (inViewport && !addLoading) onRefresh()
  }, [inViewport, addLoading, sessionId, isLoaded])

  useEffect(() => {
    if (isLoaded || sendBlocked || availableLoading || addLoading) return
    if (loadMorePendingRef.current || query !== requestedQueryRef.current) onLoadMore()
  }, [sendBlocked, availableLoading, addLoading, availableSkillsUpdate, sessionId, isLoaded, keyword])

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
        {isLoaded && <AISkillSortButton sortOrder={sortOrder} onChange={setSortOrder} />}
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
          onEndReached={isLoaded ? undefined : onLoadMore}
        />
      </YakitSpin>
    </div>
  )
}
