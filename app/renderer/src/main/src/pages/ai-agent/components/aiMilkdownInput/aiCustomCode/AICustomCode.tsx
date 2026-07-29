import React from 'react'
import { AICustomCodeProps } from './type'
import { useNodeViewContext } from '@prosemirror-adapter/react'
import styles from './AICustomCode.module.scss'
import { CopyComponents } from '@/components/yakitUI/YakitTag/YakitTag'
export const AICustomCode: React.FC<AICustomCodeProps> = React.memo((props) => {
  const { node, contentRef } = useNodeViewContext()
  return (
    <div className={styles['pre-wrapper']}>
      <div className={styles['code-wrapper']} ref={contentRef} />
      <div className={styles['copy-btn']}>
        <CopyComponents copyText={node?.textContent || ''} className={styles['copy-icon']} />
      </div>
    </div>
  )
})
