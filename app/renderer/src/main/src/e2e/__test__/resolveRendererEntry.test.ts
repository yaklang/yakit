import { describe, expect, it } from 'vitest'
import {
  APP_RENDERER_ENTRY,
  E2E_FIXTURE_PROTOCOL_VERSION,
  resolveRendererEntry,
  TABLE_VIRTUAL_FIXED_RIGHT_RENDERER_ENTRY,
} from '../resolveRendererEntry'

const startupCapability = {
  name: TABLE_VIRTUAL_FIXED_RIGHT_RENDERER_ENTRY,
  protocolVersion: E2E_FIXTURE_PROTOCOL_VERSION,
}

describe('resolveRendererEntry', () => {
  it.each([
    ['query only', TABLE_VIRTUAL_FIXED_RIGHT_RENDERER_ENTRY, null],
    ['capability only', null, startupCapability],
    ['mismatched fixture name', 'another-fixture', startupCapability],
    [
      'mismatched capability name',
      TABLE_VIRTUAL_FIXED_RIGHT_RENDERER_ENTRY,
      { ...startupCapability, name: 'another-fixture' },
    ],
    [
      'mismatched protocol version',
      TABLE_VIRTUAL_FIXED_RIGHT_RENDERER_ENTRY,
      { ...startupCapability, protocolVersion: E2E_FIXTURE_PROTOCOL_VERSION + 1 },
    ],
  ])('returns the app for %s', (_caseName, queryFixture, capability) => {
    expect(
      resolveRendererEntry({
        queryFixture,
        startupCapability: capability,
      }),
    ).toBe(APP_RENDERER_ENTRY)
  })

  it('returns the fixture only when query and startup capability match', () => {
    expect(
      resolveRendererEntry({
        queryFixture: TABLE_VIRTUAL_FIXED_RIGHT_RENDERER_ENTRY,
        startupCapability,
      }),
    ).toBe(TABLE_VIRTUAL_FIXED_RIGHT_RENDERER_ENTRY)
  })
})
