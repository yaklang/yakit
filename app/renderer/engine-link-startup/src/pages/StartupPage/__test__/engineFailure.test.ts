import { describe, expect, it } from 'vitest'
import { engineFailureMessage, engineFailureStatus } from '../engineFailure'
import zh from '../../../locales/zh/link.json'
import en from '../../../locales/en/link.json'
import zhTW from '../../../locales/zh-TW/link.json'

describe('localized engine recovery advice', () => {
  it.each([
    ['en', en],
    ['en-US', en],
    ['zh-TW', zhTW],
  ] as const)('uses %s recovery advice for every legacy failure without localized engine data', (language, locale) => {
    const messages: Record<string, string> = locale.EngineFailure
    const translate = (key: string) => messages[key.replace('EngineFailure.', '')]
    for (const [status, expected] of Object.entries(messages)) {
      expect(engineFailureMessage({ status, message: '旧引擎中文错误' }, language, 'fallback', translate)).toBe(
        expected,
      )
    }
  })

  it('prefers localized structured engine details', () => {
    expect(
      engineFailureMessage({ engineEvent: { reasonI18n: { en: 'Specific engine error' } } }, 'en', 'fallback'),
    ).toBe('Specific engine error')
  })

  it('does not leak Chinese fallback text into another locale or use an arbitrary status as a key', () => {
    expect(
      engineFailureMessage({ message: '中文错误', engineEvent: { reasonI18n: { zh: '中文原因' } } }, 'en', 'Retry'),
    ).toBe('Retry')
    expect(engineFailureMessage({ message: '中文错误' }, 'zh-TW', '請重試')).toBe('請重試')
    expect(engineFailureMessage({ status: '__proto__', message: '中文错误' }, 'en', 'Retry', () => 'unsafe')).toBe(
      'Retry',
    )
  })

  it('preserves detailed Chinese diagnostics for Chinese users', () => {
    expect(engineFailureMessage({ message: '退出码 2，请查看日志' }, 'zh', '失败')).toBe('退出码 2，请查看日志')
  })

  it('has migration and authenticated-switch guidance in all three locales', () => {
    for (const locale of [zh, en, zhTW]) {
      expect(locale.LocalEngine.migration_wait_hint).toContain('180')
      expect(locale.UIEngineList.authenticated_switch_required.length).toBeGreaterThan(20)
    }
  })
})

describe('engineFailureStatus', () => {
  it.each([
    ['cancelled', null],
    ['port_occupied', 'port_occupied_prev'],
    ['port_denied', 'port_denied'],
    ['endpoint_unreachable', 'endpoint_unreachable'],
    ['database_error', 'database_error'],
    ['protocol_error', 'check_error'],
    ['old_version', 'old_version'],
    ['timeout', 'check_timeout'],
    ['call_error', 'check_timeout'],
    ['build_yak_error', 'build_yak_error'],
    ['dial_error', 'dial_error'],
    ['antivirus_blocked', 'antivirus_blocked'],
    ['unknownReason', 'check_error'],
    ['engine_exited', 'check_error'],
    ['engine_init_failed', 'check_error'],
    ['process_error', 'check_error'],
  ] as const)('check %s maps to %s', (status, expected) => {
    expect(engineFailureStatus(status, 'check')).toBe(expected)
  })

  it.each([
    ['cancelled', null],
    ['port_occupied', 'port_occupied_prev'],
    ['port_denied', 'port_denied'],
    ['endpoint_unreachable', 'endpoint_unreachable'],
    ['database_error', 'database_error'],
    ['protocol_error', 'check_error'],
    ['timeout', 'start_timeout'],
    ['call_error', 'start_timeout'],
    ['dial_error', 'start_timeout'],
    ['engine_exited', 'engine_exited'],
    ['engine_init_failed', 'engine_init_failed'],
    ['engine_failed', 'engine_failed'],
  ] as const)('start %s maps to %s', (status, expected) => {
    expect(engineFailureStatus(status, 'start')).toBe(expected)
  })
})
