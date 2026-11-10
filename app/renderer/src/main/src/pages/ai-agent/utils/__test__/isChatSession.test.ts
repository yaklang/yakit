import { describe, expect, it } from 'vitest'
import type { AISession } from '../../type/aiChat'
import { isChatSession } from '../isChatSession'

describe('isChatSession', () => {
  it('未提供会话时返回 false', () => {
    expect(isChatSession(undefined)).toBe(false)
  })

  it.each([
    { SessionID: '', isDraftSession: undefined, expected: false },
    { SessionID: '', isDraftSession: false, expected: false },
    { SessionID: '', isDraftSession: true, expected: false },
    { SessionID: 'session', isDraftSession: true, expected: false },
    { SessionID: 'session', isDraftSession: false, expected: true },
    { SessionID: 'session', isDraftSession: undefined, expected: true },
  ])(
    'SessionID=$SessionID，isDraftSession=$isDraftSession 时返回 $expected',
    ({ SessionID, isDraftSession, expected }) => {
      expect(isChatSession({ SessionID, isDraftSession } as AISession)).toBe(expected)
    },
  )
})
