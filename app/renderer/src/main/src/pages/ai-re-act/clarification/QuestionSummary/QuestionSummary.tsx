import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import type { AIChatQSDataTypeEnum, AIChatQSData } from '../../hooks/aiRender'
import { globalSessionEngine } from '../../hooks/ChatMultiSessionController'
import type { QuestionDraft } from '../../interactive-ui/types'
import { questionAnswers, questionSummaryLines } from '../../interactive-ui/utils'
import { questionStatusLabel } from '../questionStatus'
import styles from './QuestionSummary.module.scss'
import { CheckCircleOutlineIcon } from '@yakit-libs/yakit-ui-icons/oldicon'

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
  const status = questionStatusLabel(outcome, request.mode, t)
  const answers = request.answers || (draft ? questionAnswers(request, draft) : [])
  const summaryLines =
    outcome === 'submitted' ? questionSummaryLines(request, answers, request.values || draft?.values || {}) : []
  return (
    <section className={styles.card} aria-label={t('InteractiveUI.questionRegion')}>
      <div className={styles.body}>
        {outcome === 'submitted' && (
          <CheckCircleOutlineIcon className={styles.answeredIcon} color="currentColor" size={16} />
        )}
        <div className={styles.content}>
          <span className={styles.status}>{status}</span>
          {summaryLines.length > 0 ? (
            <ol className={styles.questionSummary}>
              {summaryLines.map((line, index) => (
                <li key={index}>{line}</li>
              ))}
            </ol>
          ) : (
            <div className={styles.secondary}>
              {request.form?.title || (request.questions || []).map((question) => question.title).join(' / ')}
            </div>
          )}
        </div>
        {canAnswer && !readOnly && (
          <YakitButton type="text2" size="small" onClick={() => globalSessionEngine.openQuestion(item)}>
            {t('InteractiveUI.expand')}
          </YakitButton>
        )}
      </div>
    </section>
  )
}
