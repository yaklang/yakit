import type { YakitStatusType } from './types'

// Recovery is chosen at the IPC boundary, while the failing stage is still known.
// Unknown check errors must never be retried with credentials that do not exist yet.
export function engineFailureStatus(status: string, stage: 'check' | 'start'): YakitStatusType | null {
  if (status === 'cancelled') return null
  if (status === 'port_occupied') return 'port_occupied_prev'
  if (status === 'port_denied') return 'port_denied'
  if (status === 'database_error') return 'database_error'
  if (status === 'protocol_error') return 'check_error'
  if (stage === 'check') {
    if (status === 'old_version') return 'old_version'
    if (status === 'timeout' || status === 'call_error') return 'check_timeout'
    if (status === 'build_yak_error' || status === 'dial_error') return status
    if (status === 'antivirus_blocked' || status === 'endpoint_unreachable') return status
    return 'check_error'
  }
  return 'start_timeout'
}

export function engineFailureMessage(
  result: { message?: string; engineEvent?: { reasonI18n?: { zh?: string; en?: string; 'zh-TW'?: string } | null } },
  language: string,
  fallback: string,
): string {
  const labels = result.engineEvent?.reasonI18n
  const localized = language.startsWith('en')
    ? labels?.en
    : language === 'zh-TW'
      ? labels?.['zh-TW'] || labels?.zh
      : labels?.zh
  return (typeof localized === 'string' && localized) || result.message || fallback
}
