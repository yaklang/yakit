import type { RJSFSchema } from '@rjsf/utils'
import type { QuestionAnswer, QuestionDraft, QuestionForm, QuestionRequest } from './types'

export const UI_PROTOCOL = 'memfit.ui/1'

export function isQuestionnaireSubmission(userInteraction?: string): boolean {
  try {
    return JSON.parse(userInteraction || '').source === 'questionnaire'
  } catch {
    return false
  }
}

export const emptyAnswer = (questionId: string): QuestionAnswer => ({ questionId, selected: [], text: '' })

export function questionAnswers(request: QuestionRequest, draft: QuestionDraft): QuestionAnswer[] {
  return (request.questions || []).map((q) => draft.answers[q.id] || emptyAnswer(q.id))
}

function choiceAnswerLines(request: QuestionRequest, answers: QuestionAnswer[]) {
  return (request.questions || []).map((q, index) => {
    const a = answers.find((answer) => answer.questionId === q.id)
    const parts = a?.skipped
      ? []
      : [
          ...(a?.selected || []).map((id) => q.options.find((option) => option.id === id)?.label || ''),
          q.allowFreeText ? a?.text.trim() || '' : '',
        ].filter(Boolean)
    const summary = `${q.title}（${q.prompt}）：${parts.join('；') || '未选择'}`
    return {
      text: `${index + 1}. ${summary}`,
      summary,
      answered: parts.length > 0,
    }
  })
}

export function questionText(request: QuestionRequest, answers: QuestionAnswer[]): string {
  const lines = choiceAnswerLines(request, answers)
  return lines.some((line) => line.answered) ? `对追问的回答：\n${lines.map((line) => line.text).join('\n')}` : ''
}

function formValueLines(form: QuestionForm, values: Record<string, unknown>): string[] {
  const fields = form.schema.properties || {}
  const order = [
    ...(form.fieldOrder || []),
    ...Object.keys(fields)
      .filter((key) => !form.fieldOrder?.includes(key))
      .sort(),
  ]
  return order.map((key) => {
    const field = fields[key] as RJSFSchema
    const value = values[key]
    return `${field.title || key}：${value === undefined ? '未填写' : typeof value === 'string' ? value : JSON.stringify(value)}`
  })
}

export function formAnswerText(form: QuestionForm, values: Record<string, unknown>): string {
  return `对追问的回答：${form.title}\n${formValueLines(form, values).join('\n')}`
}

export function questionSummaryLines(
  request: QuestionRequest,
  answers: QuestionAnswer[],
  values: Record<string, unknown> = {},
): string[] {
  if (request.form) return formValueLines(request.form, values)
  if (!answers.length) return []
  const lines = choiceAnswerLines(request, answers)
  return lines.some((line) => line.answered) ? lines.map((line) => line.summary) : []
}
