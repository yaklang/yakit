import { useStore } from 'zustand'
import { useCurrentRawData, useCurrentStore } from '../../hooks/useCurrentDataBySession'
import { AIChatQSDataTypeEnum, type AIChatQSData } from '../../hooks/aiRender'
import type { QuestionDraft } from '../../interactive-ui/types'
import { QuestionCard } from '../QuestionCard/QuestionCard'
import type { QuestionQueueItem } from '../QuestionQueue/QuestionQueue'
import styles from './ClarificationPanel.module.scss'

function isQueuedQuestion(item: AIChatQSData | undefined): item is QuestionQueueItem {
  if (item?.type !== AIChatQSDataTypeEnum.UI_QUESTION) return false
  const draft = item.uiState as QuestionDraft | undefined
  const outcome = item.data.request.state === 'submitted' ? 'submitted' : draft?.outcome || item.data.request.state
  return outcome === 'pending' || (outcome === 'expired' && !!draft?.touched)
}

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
