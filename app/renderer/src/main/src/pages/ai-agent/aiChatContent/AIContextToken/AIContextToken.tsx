import type { FC, memo } from 'react'
import ContextPressurePanel from './ContextPressurePanel'
import ContextCostPanel from './ContextCostPanel'
import ContextTokenSummary from './ContextTokenSummary'
import ContextDetailPopover from './ContextDetailPopover'
import { YakitButtonProp } from '@/components/yakitUI/YakitButton/YakitButton'
import styles from '../AIChatContent.module.scss'

const AIContextToken: FC<{
  /** 仅展示详情 icon（嵌入 AI 侧栏 header 使用） */
  iconOnly?: boolean
  /** 详情 icon 对应 YakitButton 的 props */
  buttonProps?: Omit<YakitButtonProp, 'icon' | 'children'>
}> = ({ iconOnly, buttonProps }) => {
  return (
    <>
      {!iconOnly && <ContextPressurePanel />}
      {!iconOnly && <ContextCostPanel />}
      {!iconOnly && <ContextTokenSummary />}
      <ContextDetailPopover buttonProps={buttonProps} />
      {!iconOnly && <div className={styles['divider-style']} />}
    </>
  )
}

export default memo(AIContextToken)
