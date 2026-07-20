import { type FC, memo, useEffect, useState } from 'react'
import classNames from 'classnames'
import styles from './AITaskDefaultGroupCard.module.scss'
import { useBoolean, useCreation } from 'ahooks'
import AITaskDefaultGroupContent from './AITaskDefaultGroupContent'
import { useCurrentStore, useCurrentRawData } from '@/pages/ai-re-act/hooks/useCurrentDataBySession'
import { useStore } from 'zustand'
import AITaskDefaultGroupCardHeard from './aiTaskDefaultGroupCardHeard/AITaskDefaultGroupCardHeard'
import { AITaskDefaultGroupCardHeardWrapperProps, AITaskDefaultGroupCardListWrapperProps } from './type'

const AITaskDefaultGroupCard: FC<{
  token: string
}> = memo(({ token }) => {
  const [expand, { toggle: expandToggle, setFalse: collapseExpand }] = useBoolean(true)
  const [contentFocused, setContentFocused] = useState(false)

  useEffect(() => {
    collapseExpand()
  }, [collapseExpand])

  return (
    <div
      className={classNames(styles['ai-task-default-group-card'], {
        [styles['expand']]: contentFocused,
        // [styles['child-window-card']]: false,
      })}
    >
      <AITaskDefaultGroupCardHeardWrapper expand={expand} token={token} expandToggle={expandToggle} />

      {expand ? <AITaskDefaultGroupCardListWrapper token={token} setContentFocused={setContentFocused} /> : null}
    </div>
  )
})

export default AITaskDefaultGroupCard

const AITaskDefaultGroupCardListWrapper: FC<AITaskDefaultGroupCardListWrapperProps> = memo((props) => {
  const { token, setContentFocused } = props
  const store = useCurrentStore()
  const childrenTokens = useStore(store, (state) => state.tasks[token]?.childrenTokens || [])

  return (
    <AITaskDefaultGroupContent
      childrenTokens={childrenTokens}
      isChildWindow={false}
      onContentFocusChange={setContentFocused}
    />
  )
})

const AITaskDefaultGroupCardHeardWrapper: FC<AITaskDefaultGroupCardHeardWrapperProps> = memo((props) => {
  const { token, expandToggle, expand } = props
  const store = useCurrentStore()
  const renderNum = useStore(store, (state) => state.tasks[token]?.renderNum)
  const rawData = useCurrentRawData()
  const timeStamp = useCreation(() => {
    if (!rawData) return 0
    const itemData = rawData.contents.get(token)
    if (!itemData) return 0
    return itemData.Timestamp || 0
  }, [renderNum])
  return (
    <AITaskDefaultGroupCardHeard
      isChildWindow={false}
      expandToggle={expandToggle}
      timeStamp={timeStamp}
      expand={expand}
      token={token}
    />
  )
})
