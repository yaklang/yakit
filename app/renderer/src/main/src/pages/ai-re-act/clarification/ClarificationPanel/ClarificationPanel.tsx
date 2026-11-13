import { useStore } from 'zustand'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitTag } from '@/components/yakitUI/YakitTag/YakitTag'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { useCurrentRawData, useCurrentStore } from '../../hooks/useCurrentDataBySession'
import { AIChatQSDataTypeEnum } from '../../hooks/aiRender'
import { isQueuedQuestion } from '../../interactive-ui/questionPanel'
import { QuestionCard } from '../QuestionCard/QuestionCard'
import { QuestionQueue } from '../QuestionQueue/QuestionQueue'
import styles from './ClarificationPanel.module.scss'

export function ClarificationPanel() {
  const store = useCurrentStore()
  const rawData = useCurrentRawData()
  const { t } = useI18nNamespaces(['aiAgent'])
  const tokens = useStore(store, (state) => state.questionPanelTokens) || []
  useStore(store, (state) => state.questionPanelRevision)
  const queueItems = tokens.map((token) => rawData.contents.get(token)).filter(isQueuedQuestion)
  const selectQueue = (id: string) => {
    store.getState().updateState({
      questionPanelTokens: [id, ...tokens.filter((token) => token !== id)],
    })
  }
  const refreshQueue = () => {
    const next = tokens.filter((token) => isQueuedQuestion(rawData.contents.get(token)))
    for (const [id, data] of rawData.contents) {
      if (isQueuedQuestion(data) && !next.includes(id)) next.push(id)
    }
    store.getState().updateState({
      questionPanelTokens: next,
      questionPanelRevision: (store.getState().questionPanelRevision || 0) + 1,
    })
  }
  const item = rawData.contents.get(tokens[0])
  if (item?.type === AIChatQSDataTypeEnum.UI_QUESTION) {
    return (
      <div className={styles.questionDock}>
        <div className={styles.questionPanel}>
          <QuestionCard
            key={item.id}
            item={item}
            floating
            queueCount={queueItems.length}
            queueItems={queueItems}
            onSelectQueue={selectQueue}
            onRefreshQueue={refreshQueue}
          />
        </div>
      </div>
    )
  }
  if (!tokens.length) return null
  return (
    <div className={styles.questionDock}>
      <div className={styles.questionPanel}>
        <QuestionQueue items={queueItems} currentId={tokens[0]} onSelect={selectQueue} onRefresh={refreshQueue}>
          <YakitButton type="text" size="small">
            {t('InteractiveUI.questionQueue')}
            <YakitTag size="small" fullRadius>
              {queueItems.length}
            </YakitTag>
          </YakitButton>
        </QuestionQueue>
      </div>
    </div>
  )
}
