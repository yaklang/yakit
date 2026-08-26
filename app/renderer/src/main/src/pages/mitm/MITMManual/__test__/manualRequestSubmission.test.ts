import { describe, expect, it } from 'vitest'
import { resolveManualRequestSubmitAction } from '../manualRequestSubmission'

describe('resolveManualRequestSubmitAction', () => {
  it.each([
    { requestChanged: false, hasReplacement: false, expected: 'forward' },
    { requestChanged: true, hasReplacement: false, expected: 'send-packet' },
    { requestChanged: false, hasReplacement: true, expected: 'send-packet' },
    { requestChanged: true, hasReplacement: true, expected: 'send-packet' },
  ] as const)(
    'changed=$requestChanged replacement=$hasReplacement -> $expected',
    ({ requestChanged, hasReplacement, expected }) => {
      expect(resolveManualRequestSubmitAction(requestChanged, hasReplacement)).toBe(expected)
    },
  )
})
