type QuestionMode = 'async' | 'blocking'

export function questionStatusLabel(outcome: string, mode: QuestionMode, t: (key: string) => string) {
  if (outcome === 'submitted') return t('InteractiveUI.answered')
  if (outcome === 'skipped') return t('InteractiveUI.skipped')
  if (outcome === 'cancelled') return t('InteractiveUI.cancelled')
  if (outcome === 'expired') return t('InteractiveUI.expired')
  return mode === 'blocking' ? t('InteractiveUI.waiting') : t('InteractiveUI.continuing')
}
