import { useStore } from 'zustand'
import { useCurrentRawData, useCurrentStore } from '../../hooks/useCurrentDataBySession'
import { AIChatQSDataTypeEnum } from '../../hooks/aiRender'
import { isQueuedQuestion } from '../../interactive-ui/questionPanel'
import { QuestionCard } from '../QuestionCard/QuestionCard'
import styles from './ClarificationPanel.module.scss'

export function ClarificationPanel() {
  const store = useCurrentStore()
  const rawData = useCurrentRawData()
  const tokens = useStore(store, (state) => state.questionPanelTokens)
  useStore(store, (state) => state.questionPanelRevision)
  const item = rawData.contents.get(tokens?.[0])
  if (item?.type !== AIChatQSDataTypeEnum.UI_QUESTION) return null
  const queueItems = tokens.map((token) => rawData.contents.get(token)).filter(isQueuedQuestion)
  return (
    <div className={styles.questionDock}>
      <div className={styles.questionPanel}>
        <QuestionCard
          key={item.id}
          item={item}
          floating
          queueCount={tokens.length}
          queueItems={queueItems}
          onSelectQueue={(id) =>
            store.getState().updateState({
              questionPanelTokens: [id, ...tokens.filter((token) => token !== id)],
            })
          }
          onRefreshQueue={() => {
            const next = tokens.filter((token) => isQueuedQuestion(rawData.contents.get(token)))
            for (const [id, data] of rawData.contents) {
              if (isQueuedQuestion(data) && !next.includes(id)) next.push(id)
            }
            store.getState().updateState({
              questionPanelTokens: next,
              questionPanelRevision: (store.getState().questionPanelRevision || 0) + 1,
            })
          }}
        />
      </div>
    </div>
  )
}
