import { describe, expect, it } from 'vitest'
import taskbarUtils from '../handlers/windowsChromeTaskbarUtils'

const { getTaskbarIconPresetFileName, makeAppUserModelId, normalizeChromeFlags, quoteWindowsArgument } = taskbarUtils

describe('windowsChromeTaskbarUtils', () => {
  it('quotes Windows arguments using CommandLineToArgvW escaping rules', () => {
    expect(quoteWindowsArgument('plain')).toBe('plain')
    expect(quoteWindowsArgument('C:\\profile with spaces\\')).toBe('"C:\\profile with spaces\\\\"')
    expect(quoteWindowsArgument('a"b')).toBe('"a\\"b"')
    expect(quoteWindowsArgument('')).toBe('""')
  })

  it('creates a stable and bounded AppUserModelID for each profile', () => {
    const first = makeAppUserModelId('/tmp/profile-a')
    expect(first).toBe(makeAppUserModelId('/tmp/profile-a'))
    expect(first).not.toBe(makeAppUserModelId('/tmp/profile-b'))
    expect(first).toMatch(/^io\.yaklang\.yakit\.chrome\.[a-f0-9]{32}$/u)
    expect(first.length).toBeLessThanOrEqual(128)
  })

  it('maps only supported built-in taskbar icon presets', () => {
    expect(getTaskbarIconPresetFileName()).toBeNull()
    expect(getTaskbarIconPresetFileName('knowledge-cat')).toBe('knowledge-cat.ico')
    expect(getTaskbarIconPresetFileName('knowledge-skeleton')).toBe('knowledge-skeleton.ico')
    expect(() => getTaskbarIconPresetFileName('../unexpected')).toThrow('Unknown taskbar icon preset')
  })

  it('filters profile ownership flags from renderer-provided arguments', () => {
    expect(
      normalizeChromeFlags([
        { parameterName: '--ignore-certificate-errors', variableValues: '' },
        { parameterName: '--host-resolver-rules', variableValues: 'MAP example.test 127.0.0.1' },
        { parameterName: '--user-data-dir=C:\\other' },
        { parameterName: '--profile-directory', variableValues: 'Profile 2' },
        { parameterName: '--disabled', disabled: true },
        { parameterName: 'not-a-switch' },
      ]),
    ).toEqual(['--ignore-certificate-errors', '--host-resolver-rules=MAP example.test 127.0.0.1'])
  })
})
