import { describe, expect, it } from 'vitest'
import {
  applyDigitalEmployeeRoleToTags,
  createDigitalEmployeeRoleTag,
  getDigitalEmployeeRoleId,
  getVisibleAgentTags,
} from '../roleAssignment'

describe('digital employee role assignment', () => {
  it('stores and resolves one stable role marker without exposing it as a capability tag', () => {
    const tags = applyDigitalEmployeeRoleToTags(['威胁检测'], 'threat-analyst')

    expect(tags).toEqual(['威胁检测', createDigitalEmployeeRoleTag('threat-analyst')])
    expect(getDigitalEmployeeRoleId({ Tag: tags })).toBe('threat-analyst')
    expect(getVisibleAgentTags(tags)).toEqual(['威胁检测'])
  })

  it('replaces an old role marker and rejects unknown roles', () => {
    expect(
      applyDigitalEmployeeRoleToTags(['能力', createDigitalEmployeeRoleTag('threat-analyst')], 'incident-responder'),
    ).toEqual(['能力', createDigitalEmployeeRoleTag('incident-responder')])
    expect(getDigitalEmployeeRoleId({ Tag: [createDigitalEmployeeRoleTag('unknown-role')] })).toBeUndefined()
  })
})
