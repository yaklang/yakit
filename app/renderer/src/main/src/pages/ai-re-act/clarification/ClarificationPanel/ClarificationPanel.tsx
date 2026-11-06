import { useStore } from 'zustand'
import { useCurrentRawData, useCurrentStore } from '../../hooks/useCurrentDataBySession'
import { AIChatQSDataTypeEnum } from '../../hooks/aiRender'
import { QuestionCard } from '../QuestionCard/QuestionCard'
import styles from './ClarificationPanel.module.scss'

export function ClarificationPanel() {
  const store = useCurrentStore()
  const rawData = useCurrentRawData()
  const tokens = useStore(store, (state) => state.questionPanelTokens)
  useStore(store, (state) => state.questionPanelRevision)
  const item = rawData.contents.get(tokens?.[0])
  if (item?.type !== AIChatQSDataTypeEnum.UI_QUESTION) return null
  return (
    <div className={styles.questionDock}>
      <div className={styles.questionPanel}>
        <QuestionCard
          key={item.id}
          item={item}
          floating
          queueCount={tokens.length}
          onCycleQueue={
            tokens.length > 1
              ? () => store.getState().updateState({ questionPanelTokens: [...tokens.slice(1), tokens[0]] })
              : undefined
          }
        />
      </div>
    </div>
  )
}
