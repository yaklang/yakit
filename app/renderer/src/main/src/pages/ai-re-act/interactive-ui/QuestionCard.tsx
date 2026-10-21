import type React from 'react'
import { useEffect, useRef, useState } from 'react'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitInput } from '@/components/yakitUI/YakitInput/YakitInput'
import { YakitCheckbox } from '@/components/yakitUI/YakitCheckbox/YakitCheckbox'
import { YakitRadioButtons } from '@/components/yakitUI/YakitRadioButtons/YakitRadioButtons'
import { YakitAlert } from '@/components/yakitUI/YakitAlert/YakitAlert'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import type { AIChatQSData } from '../hooks/aiRender'
import type { AIChatQSDataTypeEnum } from '../hooks/aiRender'
import { globalSessionEngine } from '../hooks/ChatMultiSessionController'
import { emptyAnswer, questionAnswers, questionText, type QuestionDraft } from './types'
import styles from './interactive.module.scss'

export function QuestionCard({ item }: { item: Extract<AIChatQSData, { type: AIChatQSDataTypeEnum.UI_QUESTION }> }) {
  const { request, sessionId } = item.data
  const { t } = useI18nNamespaces(['aiAgent'])
  const [draft, setDraft] = useState<QuestionDraft>(
    () =>
      (item.uiState as QuestionDraft) || {
        answers: {},
        page: 0,
        collapsed: request.state !== 'pending',
        touched: request.touched,
      },
  )
  const current = useRef(draft)
  const composing = useRef(false)
  const compositionEndedAt = useRef<number | null>(null)
  const submitting = useRef(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [now, setNow] = useState(() => Date.now())
  const submitted = request.state === 'submitted' || draft.outcome === 'submitted'
  const outcome = submitted ? 'submitted' : draft.outcome || request.state
  const save = (next: QuestionDraft) => {
    current.current = next
    item.uiState = next
    setDraft(next)
    globalSessionEngine.persistUIState(sessionId, item, next)
  }
  const control = (operation: string) =>
    globalSessionEngine.sendUIInteraction(sessionId, {
      IsSyncMessage: true,
      SyncType: 'ui_interaction',
      SyncJsonInput: JSON.stringify({ requestId: request.id, operation }),
    })
  const touch = () => {
    if (current.current.touched || request.touched || submitted) return
    save({ ...current.current, touched: true })
    void control('touch').catch((reason) => setError(String(reason)))
  }
  useEffect(() => {
    if (request.state === 'expired' && !current.current.touched && !request.touched) {
      save({ ...current.current, collapsed: true })
    }
  }, [request.state])
  useEffect(() => {
    // A persisted local touch is retried after reconnect; it never restarts a timer.
    if (draft.touched && !request.touched && !submitted) {
      void control('touch').catch((reason) => setError(String(reason)))
    }
  }, [request, submitted])
  useEffect(() => {
    if (!request.deadline || draft.touched || request.touched || outcome !== 'pending') return
    let expired = false
    const tick = () => {
      setNow(Date.now())
      if (!expired && Date.now() >= request.deadline! && !current.current.touched) {
        expired = true
        save({ ...current.current, collapsed: true })
        void control('expire').catch((reason) => setError(String(reason)))
      }
    }
    tick()
    const timer = setInterval(tick, 1000)
    return () => clearInterval(timer)
  }, [request.deadline, outcome, request.touched, draft.touched])
  const page = Math.min(draft.page, request.questions.length - 1)
  const q = request.questions[page]
  if (!q) return null
  const answer = draft.answers[q.id] || emptyAnswer(q.id)
  const updateAnswer = (next: typeof answer) =>
    save({
      ...current.current,
      submissionId: undefined,
      answers: { ...current.current.answers, [q.id]: next },
    })
  const choose = (id: string) => {
    if (submitted || busy) return
    touch()
    const selected = q.multiple
      ? answer.selected.includes(id)
        ? answer.selected.filter((value) => value !== id)
        : [...answer.selected, id]
      : [id]
    updateAnswer({ ...answer, selected, skipped: false })
  }
  const submit = async (next = current.current) => {
    if (submitting.current || submitted || current.current.outcome === 'submitted') return
    submitting.current = true
    setBusy(true)
    setError('')
    const id = next.submissionId || crypto.randomUUID()
    save({ ...next, submissionId: id })
    const answers = questionAnswers(request, next)
    const text = questionText(request, answers)
    try {
      await globalSessionEngine.sendUIInteraction(
        sessionId,
        {
          IsFreeInput: true,
          FreeInput: text,
          UserInteraction: JSON.stringify({ id, source: 'questionnaire', requestId: request.id, answers }),
        },
        id,
      )
      save({
        ...current.current,
        answers: Object.fromEntries(answers.map((answer) => [answer.questionId, answer])),
        collapsed: true,
        outcome: text ? 'submitted' : 'skipped',
      })
    } catch (reason) {
      setError(String(reason))
    } finally {
      submitting.current = false
      setBusy(false)
    }
  }
  const skip = () => {
    if (submitted || submitting.current) return
    const next = {
      ...current.current,
      submissionId: undefined,
      answers: { ...current.current.answers, [q.id]: { ...emptyAnswer(q.id), skipped: true } },
    }
    if (page < request.questions.length - 1) save({ ...next, page: page + 1 })
    else void submit(next)
  }
  const nextPage = () => {
    if (submitted || submitting.current) return
    if (page < request.questions.length - 1) save({ ...current.current, page: page + 1 })
    else void submit()
  }
  const onKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    touch()
    if (composing.current || event.nativeEvent.isComposing || event.keyCode === 229) return
    if (
      event.key === 'Enter' &&
      compositionEndedAt.current !== null &&
      event.timeStamp - compositionEndedAt.current < 50
    ) {
      event.preventDefault()
      return
    }
    if (event.key === 'Escape') {
      event.preventDefault()
      save({ ...current.current, collapsed: true })
      return
    }
    if (draft.collapsed || submitted) return
    const target = event.target as HTMLInputElement
    const typing =
      target.isContentEditable ||
      /^(TEXTAREA|SELECT)$/.test(target.tagName) ||
      (target.tagName === 'INPUT' && !['radio', 'checkbox'].includes(target.type))
    // Native buttons keep their own keyboard action (collapse, previous, skip).
    if (event.key === 'Enter' && target.closest('button')) return
    if (event.key === 'Enter' && !event.shiftKey && !busy) {
      event.preventDefault()
      nextPage()
    } else if (!typing && !busy) {
      if (/^[0-9]$/.test(event.key)) {
        event.preventDefault()
        const option = q.options[(Number(event.key) + 9) % 10]
        if (option) choose(option.id)
      } else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault()
        save({
          ...current.current,
          page: Math.max(0, Math.min(request.questions.length - 1, page + (event.key === 'ArrowLeft' ? -1 : 1))),
        })
      } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        event.preventDefault()
        const options = Array.from(
          event.currentTarget.querySelectorAll<HTMLInputElement>('input[type="radio"], input[type="checkbox"]'),
        )
        const index = options.indexOf(document.activeElement as HTMLInputElement)
        options[
          index < 0
            ? event.key === 'ArrowUp'
              ? options.length - 1
              : 0
            : (index + (event.key === 'ArrowUp' ? -1 : 1) + options.length) % options.length
        ]?.focus()
      }
    }
  }
  const optionLabel = (option: (typeof q.options)[number], index: number) => (
    <span className={styles.optionContent}>
      <span>
        {(index + 1) % 10}. {option.label}
        {option.recommended && t('InteractiveUI.recommended')}
      </span>
      {option.description && <span className={styles.secondary}>{option.description}</span>}
    </span>
  )
  const status =
    outcome === 'submitted'
      ? t('InteractiveUI.answered')
      : outcome === 'skipped'
        ? t('InteractiveUI.skipped')
        : outcome === 'cancelled'
          ? t('InteractiveUI.cancelled')
          : outcome === 'expired'
            ? t('InteractiveUI.expired')
            : request.mode === 'blocking'
              ? t('InteractiveUI.waiting')
              : t('InteractiveUI.continuing')
  return (
    <section
      className={styles.card}
      aria-label={t('InteractiveUI.questionRegion')}
      onPointerDownCapture={touch}
      onFocusCapture={touch}
      onKeyDown={onKeyDown}
    >
      <div className={styles.toolbar}>
        <strong>{status}</strong>
        {!draft.touched && !request.touched && request.deadline && outcome === 'pending' ? (
          <span className={styles.secondary} aria-live="polite">
            {t('InteractiveUI.countdown', { seconds: Math.max(0, Math.ceil((request.deadline - now) / 1000)) })}
          </span>
        ) : null}
        <YakitButton
          type="text2"
          size="small"
          onClick={() => save({ ...current.current, collapsed: !draft.collapsed })}
        >
          {draft.collapsed
            ? submitted
              ? t('InteractiveUI.viewAnswers')
              : t('InteractiveUI.expand')
            : t('InteractiveUI.collapse')}
        </YakitButton>
      </div>
      {error && !submitted && <YakitAlert type="error" message={error} />}
      {!draft.collapsed && submitted && (
        <dl className={styles.answers}>
          {request.questions.map((question, index) => {
            const accepted =
              request.answers?.find((value) => value.questionId === question.id) || draft.answers[question.id]
            const parts = accepted?.skipped
              ? []
              : [
                  ...(accepted?.selected || []).map(
                    (id) => question.options.find((option) => option.id === id)?.label || '',
                  ),
                  accepted?.text || '',
                ].filter(Boolean)
            return (
              <div key={question.id}>
                <dt>
                  {index + 1}. {question.title}
                </dt>
                <dd>
                  {accepted ? parts.join('；') || t('InteractiveUI.unselected') : t('InteractiveUI.answerInHistory')}
                </dd>
              </div>
            )
          })}
        </dl>
      )}
      {!draft.collapsed && !submitted && (
        <>
          <div className={styles.toolbar}>
            <strong>{q.title}</strong>
            <span>
              {page + 1} / {request.questions.length}
            </span>
          </div>
          <p className={styles.prompt}>{q.prompt}</p>
          <div className={styles.secondary}>{q.multiple ? t('InteractiveUI.multiple') : t('InteractiveUI.single')}</div>
          {q.multiple ? (
            <div role="group" aria-label={q.title} className={styles.options}>
              {q.options.map((option, index) => (
                <YakitCheckbox
                  key={option.id}
                  wrapperClassName={`${styles.option} ${answer.selected.includes(option.id) ? styles.selected : ''}`}
                  checked={answer.selected.includes(option.id)}
                  disabled={busy}
                  onChange={() => choose(option.id)}
                >
                  {optionLabel(option, index)}
                </YakitCheckbox>
              ))}
            </div>
          ) : (
            <YakitRadioButtons
              wrapClassName={styles.options}
              className={styles.radioOptions}
              aria-label={q.title}
              value={answer.selected[0]}
              disabled={busy}
              options={q.options.map((option, index) => ({ value: option.id, label: optionLabel(option, index) }))}
              onChange={(event) => choose(event.target.value)}
            />
          )}
          {q.allowFreeText && (
            <YakitInput.TextArea
              wrapperClassName={styles.freeText}
              aria-label={t('InteractiveUI.ownAnswer')}
              placeholder={t('InteractiveUI.answerPlaceholder')}
              autoSize={{ minRows: 2, maxRows: 5 }}
              isShowResize={false}
              value={answer.text}
              disabled={busy || submitted}
              onCompositionStart={() => {
                composing.current = true
                touch()
              }}
              onCompositionEnd={(event) => {
                composing.current = false
                compositionEndedAt.current = event.timeStamp
              }}
              onChange={(event) => {
                touch()
                updateAnswer({ ...answer, text: event.target.value, skipped: false })
              }}
            />
          )}
          <div className={styles.actions}>
            <YakitButton
              type="outline2"
              disabled={page === 0 || busy}
              onClick={() => save({ ...current.current, page: page - 1 })}
            >
              {t('InteractiveUI.previous')}
            </YakitButton>
            <YakitButton type="text2" disabled={busy} onClick={skip}>
              {t('InteractiveUI.skipQuestion')}
            </YakitButton>
            {request.mode === 'blocking' && request.state === 'pending' && (
              <YakitButton
                type="text2"
                disabled={busy}
                onClick={() => {
                  void control('cancel')
                    .then(() => save({ ...current.current, collapsed: true, outcome: 'cancelled' }))
                    .catch((reason) => setError(String(reason)))
                }}
              >
                {t('InteractiveUI.cancelWait')}
              </YakitButton>
            )}
            <YakitButton type="primary" loading={busy} onClick={nextPage}>
              {page === request.questions.length - 1 ? t('InteractiveUI.submit') : t('InteractiveUI.next')}
            </YakitButton>
          </div>
        </>
      )}
      {draft.collapsed && outcome === 'expired' && (
        <div className={styles.secondary}>{t('InteractiveUI.expiredHint')}</div>
      )}
    </section>
  )
}
