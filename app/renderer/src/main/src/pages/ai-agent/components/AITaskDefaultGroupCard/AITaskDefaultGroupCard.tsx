import {
  type ChatTaskDefaultGroup,
  type ReActChatElement,
  type ReActChatTaskElementSub,
} from '@/pages/ai-re-act/hooks/aiRender'
import { type FC, useEffect, useMemo, useState } from 'react'
import classNames from 'classnames'
import { OutlineInformationcircleIcon } from '@/assets/icon/outline'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import styles from './AITaskDefaultGroupCard.module.scss'
import ConcurrentStreamCardActions from '../ConcurrentStreamCard/ConcurrentStreamCardActions/ConcurrentStreamCardActions'
import { useBoolean, useCreation } from 'ahooks'
import { formatTimestamp } from '@/utils/timeUtil'
import { useConcurrentStreamRefreshListener } from '../ConcurrentStreamCard/concurrentStream/useConcurrentStreamRefreshListener'
import AITaskDefaultGroupContent from './AITaskDefaultGroupContent'
import { useCurrentStore, useCurrentRawData } from '@/pages/ai-re-act/hooks/useCurrentDataBySession'
import { useStore } from 'zustand'

const AITaskDefaultGroupCard: FC<{
  elements: ReActChatTaskElementSub[]
  session: string
  token: string
  chatType: ReActChatElement['chatType']
  hasNext?: boolean
  isChildWindow?: boolean
  onRefresh?: () => void
}> = ({ elements, session, token, chatType, hasNext, isChildWindow, onRefresh }) => {
  const { t } = useI18nNamespaces(['aiAgent'])
  const [expand, { toggle: expandToggle, setFalse: collapseExpand }] = useBoolean(true)
  const [contentFocused, setContentFocused] = useState(false)

  const store = useCurrentStore()
  const renderNum = useStore(store, (state) => state.items[token].renderNum)
  const rawData = useCurrentRawData()

  const raw = useCreation(() => {
    if (!rawData) return null
    const itemData = rawData.contents.get(token)
    if (!itemData) return null
    return { ...itemData } as ChatTaskDefaultGroup
  }, [renderNum])

  const framePayload = useMemo(
    () => ({
      session,
      token,
      chatType,
      elements,
      taskName: t('ConcurrentStreamCard.systemInfo'),
    }),
    [chatType, elements, session, t, token],
  )

  useEffect(() => {
    if (isChildWindow || !hasNext) return
    collapseExpand()
  }, [collapseExpand, hasNext, isChildWindow])

  useConcurrentStreamRefreshListener(framePayload, session, token, chatType, !isChildWindow)

  return (
    <div
      className={classNames(styles['ai-task-default-group-card'], {
        [styles['expand']]: contentFocused,
        [styles['child-window-card']]: isChildWindow,
      })}
    >
      <div className={styles['ai-task-default-group-card-title']} onClick={isChildWindow ? undefined : expandToggle}>
        <div className={styles['ai-task-default-group-card-title-left']}>
          <span className={styles['icon']}>
            <OutlineInformationcircleIcon />
          </span>
          <span className={styles['text']}>{t('ConcurrentStreamCard.systemInfo')}</span>
          {raw?.Timestamp ? <span className={styles['time']}>{formatTimestamp(raw.Timestamp)}</span> : null}
        </div>
        <div className={styles['ai-task-default-group-card-title-right']} onClick={(e) => e.stopPropagation()}>
          <ConcurrentStreamCardActions
            isChildWindow={isChildWindow}
            expand={expand}
            onExpandToggle={expandToggle}
            onRefresh={onRefresh}
            framePayload={framePayload}
            showContinueTask={false}
            showCancelTask={false}
            showDetails={false}
          />
        </div>
      </div>
      {expand ? (
        <AITaskDefaultGroupContent
          elements={elements}
          session={session}
          // chatType={chatType}
          // hasNext={hasNext}
          isChildWindow={isChildWindow}
          onContentFocusChange={setContentFocused}
        />
      ) : null}
    </div>
  )
}

export default AITaskDefaultGroupCard
