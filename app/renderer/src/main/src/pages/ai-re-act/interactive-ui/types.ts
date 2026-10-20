export const UI_PROTOCOL = 'memfit.ui/1'

export interface QuestionOption {
  id: string
  label: string
  description?: string
  recommended?: boolean
}
export interface UserQuestion {
  id: string
  title: string
  prompt: string
  multiple: boolean
  allowFreeText: boolean
  options: QuestionOption[]
}
export interface QuestionRequest {
  id: string
  taskId: string
  mode: 'async' | 'blocking'
  questions: UserQuestion[]
  deadline?: number
  touched: boolean
  state: 'pending' | 'submitted' | 'skipped' | 'expired' | 'cancelled'
  /** Accepted answers recovered from the ordinary user-message receipt. */
  answers?: QuestionAnswer[]
}
export interface QuestionAnswer {
  questionId: string
  selected: string[]
  text: string
  skipped?: boolean
}
export interface UISubmission {
  id: string
  source: 'questionnaire' | 'component'
  requestId: string
  answers?: QuestionAnswer[]
  nodeId?: string
  values?: Record<string, unknown>
}
export interface QuestionDraft {
  answers: Record<string, QuestionAnswer>
  page: number
  collapsed: boolean
  touched: boolean
  submissionId?: string
  outcome?: 'submitted' | 'skipped' | 'cancelled'
}

export const emptyAnswer = (questionId: string): QuestionAnswer => ({ questionId, selected: [], text: '' })

export function questionAnswers(request: QuestionRequest, draft: QuestionDraft): QuestionAnswer[] {
  return request.questions.map((q) => draft.answers[q.id] || emptyAnswer(q.id))
}

export function questionText(request: QuestionRequest, answers: QuestionAnswer[]): string {
  const lines = request.questions.map((q, index) => {
    const a = answers.find((answer) => answer.questionId === q.id)
    const parts = a?.skipped
      ? []
      : [
          ...(a?.selected || []).map((id) => q.options.find((option) => option.id === id)?.label || ''),
          q.allowFreeText ? a?.text.trim() || '' : '',
        ].filter(Boolean)
    return {
      text: `${index + 1}. ${q.title}（${q.prompt}）：${parts.join('；') || '未选择'}`,
      answered: parts.length > 0,
    }
  })
  return lines.some((line) => line.answered) ? `对追问的回答：\n${lines.map((line) => line.text).join('\n')}` : ''
}
