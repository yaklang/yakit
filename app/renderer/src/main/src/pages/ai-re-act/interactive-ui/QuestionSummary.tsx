import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import type { AIChatQSDataTypeEnum, AIChatQSData } from '../hooks/aiRender'
import { globalSessionEngine } from '../hooks/ChatMultiSessionController'
import { questionAnswers, questionText, formAnswerText, type QuestionDraft } from './types'
import styles from './interactive.module.scss'

export function QuestionSummary({
  item,
  readOnly = false,
}: {
  item: Extract<AIChatQSData, { type: AIChatQSDataTypeEnum.UI_QUESTION }>
  readOnly?: boolean
}) {
  const { t } = useI18nNamespaces(['aiAgent'])
  const { request } = item.data
  const draft = item.uiState as QuestionDraft | undefined
  const outcome = request.state === 'submitted' ? 'submitted' : draft?.outcome || request.state
  const canAnswer = outcome === 'pending' || outcome === 'expired'
  const status =
    outcome === 'submitted'
      ? t('InteractiveUI.answered')
      : outcome === 'cancelled'
        ? t('InteractiveUI.cancelled')
        : outcome === 'skipped'
          ? t('InteractiveUI.skipped')
          : outcome === 'expired'
            ? t('InteractiveUI.expired')
            : request.mode === 'blocking'
              ? t('InteractiveUI.waiting')
              : t('InteractiveUI.continuing')
  const answers = request.answers || (draft ? questionAnswers(request, draft) : [])
  return (
    <section className={styles.card} aria-label={t('InteractiveUI.questionRegion')}>
      <div className={styles.toolbar}>
        <strong>{status}</strong>
        {canAnswer && !readOnly && (
          <YakitButton type="text2" size="small" onClick={() => globalSessionEngine.openQuestion(item)}>
            {t('InteractiveUI.expand')}
          </YakitButton>
        )}
      </div>
      {outcome === 'submitted' && request.form ? (
        <div className={styles.questionSummary}>
          {formAnswerText(request.form, request.values || draft?.values || {})}
        </div>
      ) : outcome === 'submitted' && answers.length > 0 ? (
        <div className={styles.questionSummary}>{questionText(request, answers)}</div>
      ) : (
        <div className={styles.secondary}>
          {request.form?.title || (request.questions || []).map((question) => question.title).join(' / ')}
        </div>
      )}
    </section>
  )
}
