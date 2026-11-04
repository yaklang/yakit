import type { TFunction } from '@/i18n/useI18nNamespaces'
export type ProbeFeedback = 'running' | 'supported' | 'unsupported' | 'failed' | 'timeout' | 'saveFailed'
export const probeFeedbackText = (t: TFunction, status: ProbeFeedback, efforts: string[] = []) =>
  status === 'supported'
    ? `${t('BatchModel.probeSupported')} ${efforts.join(' / ')}`
    : t(`BatchModel.probe${status[0].toUpperCase()}${status.slice(1)}`)
