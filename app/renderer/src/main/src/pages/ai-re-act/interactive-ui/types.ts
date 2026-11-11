import type { RJSFSchema } from '@rjsf/utils'

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
export interface QuestionForm {
  title: string
  schema: RJSFSchema
  fieldOrder?: string[]
  initial?: Record<string, unknown>
}
export interface QuestionRequest {
  id: string
  taskId: string
  mode: 'async' | 'blocking'
  questions?: UserQuestion[]
  form?: QuestionForm
  values?: Record<string, unknown>
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
  source: 'questionnaire'
  requestId: string
  answers?: QuestionAnswer[]
  values?: Record<string, unknown>
}
export interface QuestionDraft {
  answers: Record<string, QuestionAnswer>
  values?: Record<string, unknown>
  page: number
  collapsed: boolean
  touched: boolean
  submissionId?: string
  outcome?: 'submitted' | 'skipped' | 'cancelled'
}
