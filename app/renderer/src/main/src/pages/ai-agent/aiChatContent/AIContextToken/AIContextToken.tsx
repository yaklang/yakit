import { type FC, memo } from 'react'
import ContextTokenSummary from './ContextTokenSummary'
import styles from '../AIChatContent.module.scss'

const AIContextToken: FC<{
  /** 仅展示详情 icon（嵌入 AI 侧栏 header 使用） */
  iconOnly?: boolean
}> = ({ iconOnly }) => {
  return (
    <>
      {!iconOnly && <ContextTokenSummary />}
      {!iconOnly && <div className={styles['divider-style']} />}
    </>
  )
}

export default memo(AIContextToken)
