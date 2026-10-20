import React, { useEffect, useRef, useState } from 'react'
import { Button, Alert } from 'antd'
import type { AIChatQSData } from '../hooks/aiRender'
import { AIChatQSDataTypeEnum } from '../hooks/aiRender'
import { globalSessionEngine } from '../hooks/ChatMultiSessionController'
import { emptyAnswer, questionAnswers, questionText, type QuestionDraft } from './types'
import styles from './interactive.module.scss'

export function QuestionCard({ item }: { item: Extract<AIChatQSData, { type: AIChatQSDataTypeEnum.UI_QUESTION }> }) {
  const { request, sessionId } = item.data
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
  const compositionEndedAt = useRef(0)
  const submitting = useRef(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [now, setNow] = useState(Date.now())
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
    if (current.current.touched || request.touched || request.state === 'submitted') return
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
    if (draft.touched && !request.touched && request.state !== 'submitted') {
      void control('touch').catch((reason) => setError(String(reason)))
    }
  }, [request])
  useEffect(() => {
    if (!request.deadline || draft.touched || request.touched || request.state !== 'pending') return
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
  }, [request.deadline, request.state, request.touched, draft.touched])
  const page = Math.min(draft.page, request.questions.length - 1)
  const q = request.questions[page]
  if (!q) return null
  const answer = draft.answers[q.id] || emptyAnswer(q.id)
  const submitted = request.state === 'submitted'
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
    if (submitting.current || submitted) return
    submitting.current = true
    setBusy(true)
    setError('')
    const id = next.submissionId || crypto.randomUUID()
    save({ ...next, submissionId: id })
    const answers = questionAnswers(request, next)
    try {
      await globalSessionEngine.sendUIInteraction(
        sessionId,
        {
          IsFreeInput: true,
          FreeInput: questionText(request, answers),
          UserInteraction: JSON.stringify({ id, source: 'questionnaire', requestId: request.id, answers }),
        },
        id,
      )
      save({ ...current.current, collapsed: true })
    } catch (reason) {
      setError(String(reason))
    } finally {
      submitting.current = false
      setBusy(false)
    }
  }
  const skip = () => {
    const next = {
      ...current.current,
      submissionId: undefined,
      answers: { ...current.current.answers, [q.id]: { ...emptyAnswer(q.id), skipped: true } },
    }
    if (page < request.questions.length - 1) save({ ...next, page: page + 1 })
    else void submit(next)
  }
  const nextPage = () => {
    if (page < request.questions.length - 1) save({ ...current.current, page: page + 1 })
    else void submit()
  }
  const onKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    touch()
    if (composing.current || event.nativeEvent.isComposing || event.keyCode === 229) return
    if (event.key === 'Enter' && Date.now() - compositionEndedAt.current < 50) {
      event.preventDefault()
      return
    }
    if (event.key === 'Escape') {
      event.preventDefault()
      save({ ...current.current, collapsed: true })
      return
    }
    if (draft.collapsed || submitted) return
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test((event.target as HTMLElement).tagName)
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
        const options = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[data-option]'))
        const index = options.indexOf(document.activeElement as HTMLButtonElement)
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
  return (
    <section
      className={styles.card}
      aria-label="模型追问"
      onPointerDownCapture={touch}
      onFocusCapture={touch}
      onKeyDown={onKeyDown}
    >
      <div className={styles.toolbar}>
        <strong>
          {submitted ? '已回答' : request.mode === 'blocking' ? '需要你的回答才能继续' : '任务继续进行，你可以随时回答'}
        </strong>
        {!draft.touched && !request.touched && request.deadline && request.state === 'pending' ? (
          <span aria-live="polite">{Math.max(0, Math.ceil((request.deadline - now) / 1000))} 秒后自动跳过</span>
        ) : null}
        <Button size="small" onClick={() => save({ ...current.current, collapsed: !draft.collapsed })}>
          {draft.collapsed ? '展开问题' : '收起'}
        </Button>
      </div>
      {error && <Alert type="error" message={error} />}
      {!draft.collapsed && (
        <>
          <div className={styles.toolbar}>
            <strong>{q.title}</strong>
            <span>
              {page + 1} / {request.questions.length}
            </span>
          </div>
          <p>{q.prompt}</p>
          <small>{q.multiple ? '可多选' : '单选'}</small>
          <div role={q.multiple ? 'group' : 'radiogroup'} aria-label={q.title} className={styles.options}>
            {q.options.map((option, index) => (
              <button
                key={option.id}
                data-option
                role={q.multiple ? 'checkbox' : 'radio'}
                aria-checked={answer.selected.includes(option.id)}
                disabled={busy || submitted}
                onClick={() => choose(option.id)}
                className={styles.option}
              >
                <span>
                  <span
                    aria-hidden="true"
                    className={`${styles.selection} ${q.multiple ? styles.checkbox : styles.radio}`}
                  >
                    {answer.selected.includes(option.id) ? (q.multiple ? '✓' : '●') : ''}
                  </span>
                  {(index + 1) % 10}. {option.label}
                  {option.recommended && '（推荐）'}
                </span>
                {option.description && <small>{option.description}</small>}
              </button>
            ))}
          </div>
          {q.allowFreeText && (
            <textarea
              aria-label="自己的答案"
              placeholder="也可以直接描述你的答案"
              value={answer.text}
              disabled={busy || submitted}
              onCompositionStart={() => {
                composing.current = true
                touch()
              }}
              onCompositionEnd={() => {
                composing.current = false
                compositionEndedAt.current = Date.now()
              }}
              onChange={(event) => {
                touch()
                updateAnswer({ ...answer, text: event.target.value, skipped: false })
              }}
            />
          )}
          <div className={styles.toolbar}>
            <Button disabled={page === 0 || busy} onClick={() => save({ ...current.current, page: page - 1 })}>
              上一题
            </Button>
            <Button disabled={submitted || busy} onClick={skip}>
              跳过此题
            </Button>
            {request.mode === 'blocking' && request.state === 'pending' && (
              <Button
                disabled={busy}
                onClick={() => {
                  void control('cancel')
                    .then(() => save({ ...current.current, collapsed: true }))
                    .catch((reason) => setError(String(reason)))
                }}
              >
                取消等待
              </Button>
            )}
            <Button type="primary" loading={busy} disabled={submitted} onClick={nextPage}>
              {page === request.questions.length - 1 ? '提交' : '下一题'}
            </Button>
          </div>
        </>
      )}
      {draft.collapsed && request.state === 'expired' && <small>已自动跳过，展开后仍可补答。</small>}
    </section>
  )
}
