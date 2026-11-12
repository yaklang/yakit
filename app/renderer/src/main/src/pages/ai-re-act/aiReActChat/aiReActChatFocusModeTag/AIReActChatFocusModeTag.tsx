import type { FC } from 'react'
import { useStore } from 'zustand'
import { YakitTag } from '@/components/yakitUI/YakitTag/YakitTag'
import { useCurrentStore } from '@/pages/ai-re-act/hooks/useCurrentDataBySession'
import styles from './AIReActChatFocusModeTag.module.scss'

const AIReActChatFocusModeTag: FC = () => {
  const store = useCurrentStore()
  const focusMode = useStore(store, (state) => state.focusMode)

  if (!focusMode) return null

  return (
    <YakitTag fullRadius={true} className={styles['focus-mode']}>
      场景:<span className={styles['text']}>{focusMode}</span>
    </YakitTag>
  )
}

export default AIReActChatFocusModeTag
