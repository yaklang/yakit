import { type FC, memo, useEffect, useState } from 'react'
import classNames from 'classnames'
import styles from './AITaskDefaultGroupCard.module.scss'
import { useBoolean } from 'ahooks'
import AITaskDefaultGroupContent from './AITaskDefaultGroupContent'
import AITaskDefaultGroupCardHeard from './aiTaskDefaultGroupCardHeard/AITaskDefaultGroupCardHeard'

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
      })}
    >
      <AITaskDefaultGroupCardHeard expand={expand} expandToggle={expandToggle} token={token} />

      {expand ? <AITaskDefaultGroupContent token={token} onContentFocusChange={setContentFocused} /> : null}
    </div>
  )
})

export default AITaskDefaultGroupCard
