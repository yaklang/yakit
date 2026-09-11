import type { YakitStatusType } from './types'

// Recovery is chosen at the IPC boundary, while the failing stage is still known.
// Unknown check errors must never be retried with credentials that do not exist yet.
export function engineFailureStatus(status: string, stage: 'check' | 'start'): YakitStatusType | null {
  if (status === 'cancelled') return null
  if (status === 'port_occupied') return 'port_occupied_prev'
  if (status === 'port_denied' || status === 'endpoint_unreachable') return status
  if (status === 'database_error') return 'database_error'
  if (status === 'protocol_error') return 'check_error'
  if (stage === 'check') {
    if (status === 'old_version') return 'old_version'
    if (status === 'timeout' || status === 'call_error') return 'check_timeout'
    if (status === 'build_yak_error' || status === 'dial_error') return status
    if (status === 'antivirus_blocked') return status
    return 'check_error'
  }
  return 'start_timeout'
}

export function engineFailureMessage(
  result: {
    status?: string
    message?: string
    engineEvent?: { reasonI18n?: { zh?: string; en?: string; 'zh-TW'?: string } | null }
  },
  language: string,
  fallback: string,
  translate?: (key: string, options?: { defaultValue: string }) => string,
): string {
  const labels = result.engineEvent?.reasonI18n
  const localized = language.startsWith('en') ? labels?.en : language === 'zh-TW' ? labels?.['zh-TW'] : labels?.zh
  if (typeof localized === 'string' && localized.trim()) return localized
  // Legacy engines and main-process failures may only supply Chinese diagnostics.
  // Preserve those details in the logs, but use translated recovery advice in the UI.
  if (language === 'zh' && result.message) return result.message
  const statuses = [
    'port_occupied',
    'port_denied',
    'endpoint_unreachable',
    'database_error',
    'build_yak_error',
    'engine_init_failed',
    'dial_error',
    'call_error',
    'timeout',
    'antivirus_blocked',
    'old_version',
    'protocol_error',
    'process_error',
    'engine_exited',
  ]
  if (result.status && statuses.includes(result.status) && translate) {
    return translate(`EngineFailure.${result.status}`, { defaultValue: fallback })
  }
  return fallback
}
