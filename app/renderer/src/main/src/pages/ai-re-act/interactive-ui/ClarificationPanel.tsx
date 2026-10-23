import { useStore } from 'zustand'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { useCurrentRawData, useCurrentStore } from '../hooks/useCurrentDataBySession'
import { AIChatQSDataTypeEnum } from '../hooks/aiRender'
import { QuestionCard } from './QuestionCard'
import reviewStyles from '@/pages/ai-agent/aiAgentChat/AIAgentChat.module.scss'
import styles from './interactive.module.scss'

export function ClarificationPanel() {
  const { t } = useI18nNamespaces(['aiAgent'])
  const store = useCurrentStore()
  const rawData = useCurrentRawData()
  const tokens = useStore(store, (state) => state.questionPanelTokens)
  useStore(store, (state) => state.questionPanelRevision)
  const item = rawData.contents.get(tokens?.[0])
  if (item?.type !== AIChatQSDataTypeEnum.UI_QUESTION) return null
  return (
    <div className={reviewStyles['review-box']}>
      <div className={`${reviewStyles['review-border-shadow']} ${styles.questionPanel}`}>
        <div className={reviewStyles['review-wrapper']}>
          {tokens.length > 1 && (
            <div className={styles.toolbar}>
              <span>
                {t('InteractiveUI.questionRegion')} 1 / {tokens.length}
              </span>
              <YakitButton
                type="text2"
                size="small"
                onClick={() => store.getState().updateState({ questionPanelTokens: [...tokens.slice(1), tokens[0]] })}
              >
                {t('InteractiveUI.nextRequest')}
              </YakitButton>
            </div>
          )}
          <QuestionCard key={item.id} item={item} floating />
        </div>
      </div>
    </div>
  )
}
