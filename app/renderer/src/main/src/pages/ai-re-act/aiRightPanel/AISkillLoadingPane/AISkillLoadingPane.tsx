import type React from 'react'
import { memo, useEffect, useRef, useState } from 'react'
import { useStore } from 'zustand'
import { Tooltip } from 'antd'
import { useCreation, useInViewport, useMemoizedFn, useUpdateEffect } from 'ahooks'
import { PlusOutlined, RefreshOutlined } from '@yakit-libs/yakit-ui-icons/outline'
import { RollingLoadList } from '@/components/RollingLoadList/RollingLoadList'
import { YakitEmpty } from '@/components/yakitUI/YakitEmpty/YakitEmpty'
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
import { OutlineArrowsTransferDownIcon, OutlineArrowsTransferUpIcon, OutlineArrowsUpDownIcon } from './icon'
import styles from './AISkillLoadingPane.module.scss'

export const AISkillLoadingPane: React.FC<{
  loadState: 'loaded' | 'metadata'
  onTotalChange?: (total: number) => void
}> = memo(({ loadState, onTotalChange }) => {
  const { t } = useI18nNamespaces(['aiAgent', 'yakitUi'])
  const store = useCurrentStore()
  const sessionId = useCurrentSessionId()
  const { onSend } = useAIAgentDispatcher()
  const { loading: refreshLoading, markSending } = useSyncLoadingState()
  const { loading: addLoading, markSending: markAdding } = useSyncLoadingState()
  const [addingSkill, setAddingSkill] = useState('')
  const taskId = useStore(store, (state) => state.currentChatStatus.questionID)
  const taskData = useCurrentTaskData(taskId)
  const [keyword, setKeyword] = useState('')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>()
  const sortTitle = t(
    {
      asc: 'AISkillLoadingPane.sortByTokensAscending',
      desc: 'AISkillLoadingPane.sortByTokensDescending',
      default: 'AISkillLoadingPane.sortByTokens',
    }[sortOrder || 'default'],
  )

  const contentRef = useRef<HTMLDivElement>(null)
  const [inViewport] = useInViewport(contentRef)

  const listRef = useRef<HTMLDivElement>(null)
  const [recalculation, setRecalculation] = useState(false)

  const list = useCreation(() => {
    const query = keyword.trim().toLowerCase()
    const skills = [...(taskData?.skills.fixed || []), ...(taskData?.skills.dynamic || [])].filter(
      (skill) =>
        skill.skill_load_state === loadState &&
        (!query || skill.name.toLowerCase().includes(query) || skill.description.toLowerCase().includes(query)),
    )
    if (sortOrder) {
      skills.sort((a, b) => ((a.token_count ?? 0) - (b.token_count ?? 0)) * (sortOrder === 'asc' ? 1 : -1))
    }
    return skills
  }, [taskId, taskData?.uuid, loadState, keyword, sortOrder])

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

  const onAddSkill = useMemoizedFn((name: string) => {
    const syncId = `skill-load-${randomString(16)}`
    setAddingSkill(name)
    markAdding(syncId)
    onSend({
      token: sessionId,
      type: '',
      params: {
        IsSyncMessage: true,
        SyncType: AIInputEventSyncTypeEnum.SYNC_TYPE_LOAD_SKILL,
        SyncID: syncId,
        SyncJsonInput: JSON.stringify({ skill_names: [name] }),
      },
    })
  })

  useEffect(() => {
    if (inViewport && !addLoading) onRefresh()
  }, [inViewport, sessionId, addLoading, onRefresh])

  // 虚拟列表会缓存相同数量的行；快照更新时也需刷新 Token 数量和描述。
  useUpdateEffect(() => {
    setRecalculation((previous) => !previous)
  }, [list])
  const renderSortIcon = () => {
    switch (sortOrder) {
      case 'asc':
        return <OutlineArrowsTransferUpIcon style={{ color: 'var(--Colors-Use-Main-Primary)' }} />
      case 'desc':
        return <OutlineArrowsTransferDownIcon style={{ color: 'var(--Colors-Use-Main-Primary)' }} />
      default:
        return <OutlineArrowsUpDownIcon style={{ color: 'var(--Colors-Use-Neutral-Text-4-Help-text)' }} />
    }
  }
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
        <Tooltip title={sortTitle}>
          <YakitButton
            type="text2"
            aria-label={sortTitle}
            icon={renderSortIcon()}
            onClick={() => setSortOrder(sortOrder === undefined ? 'asc' : sortOrder === 'asc' ? 'desc' : undefined)}
          />
        </Tooltip>
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
      <div className={styles['list']} ref={listRef} role="list">
        {list.length ? (
          <RollingLoadList
            key={`${taskId}:${loadState}:${keyword}`}
            data={list}
            rowKey="name"
            defItemHeight={58}
            classNameRow={styles['row']}
            targetRef={listRef}
            recalculation={recalculation}
            loadMoreData={() => undefined}
            page={0}
            hasMore={false}
            loading={false}
            renderRow={(skill) => (
              <div className={styles['item']} role="listitem">
                <div className={styles['item-header']}>
                  <span className={styles['name']} title={skill.name}>
                    {skill.name}
                  </span>
                  {loadState === 'metadata' ? (
                    <Tooltip title={t('YakitButton.add')}>
                      <YakitButton
                        type="text2"
                        size="small"
                        className={styles['add-button']}
                        aria-label={t('YakitButton.add')}
                        icon={<PlusOutlined />}
                        loading={addLoading && addingSkill === skill.name}
                        disabled={addLoading}
                        onClick={() => onAddSkill(skill.name)}
                      />
                    </Tooltip>
                  ) : (
                    <Tooltip title={t('AISkillLoadingPane.contextSize')}>
                      <span className={styles['token-count']}>{skill.token_count ?? '—'}</span>
                    </Tooltip>
                  )}
                </div>
                <div className={styles['description']} title={skill.description}>
                  {skill.description}
                </div>
              </div>
            )}
          />
        ) : (
          <YakitEmpty />
        )}
      </div>
    </div>
  )
})
