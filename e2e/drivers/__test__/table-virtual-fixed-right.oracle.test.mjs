import { describe, expect, it } from 'vitest'
import {
  compareTableIdentityTuples,
  createTableIdentityDigest,
} from '../../fixtures/table-virtual/table-virtual-oracle.mjs'

const manifest = [
  { ordinal: 40, ID: 7, HiddenIndex: 'hidden-40', immutableLabel: 'fixture-40' },
  { ordinal: 41, ID: 7, HiddenIndex: 'hidden-41', immutableLabel: 'fixture-41' },
]

const tupleFor = (record) => ({
  ordinal: record.ordinal,
  digest: createTableIdentityDigest(record),
})

describe('table virtual fixed-right semantic oracle', () => {
  it('accepts independently produced expected, sentinel, fixed and action tuples for the same record', () => {
    const expected = tupleFor(manifest[0])
    const result = compareTableIdentityTuples({
      expected,
      sentinel: tupleFor({ ...manifest[0] }),
      fixed: tupleFor({ ...manifest[0] }),
      action: tupleFor({ ...manifest[0] }),
    })

    expect(result).toMatchObject({ pass: true, mismatches: [] })
  })

  it('rejects a fault-injected fixed tuple even when sentinel and geometry can remain aligned', () => {
    const expected = tupleFor(manifest[0])
    const result = compareTableIdentityTuples({
      expected,
      sentinel: tupleFor(manifest[0]),
      fixed: tupleFor(manifest[1]),
      action: tupleFor(manifest[0]),
    })

    expect(result.pass).toBe(false)
    expect(result.mismatches).toEqual([expect.objectContaining({ source: 'fixed', kind: 'identity-mismatch' })])
  })

  it('rejects a fault-injected action tuple independently of the rendered fixed tuple', () => {
    const expected = tupleFor(manifest[0])
    const result = compareTableIdentityTuples({
      expected,
      sentinel: tupleFor(manifest[0]),
      fixed: tupleFor(manifest[0]),
      action: tupleFor(manifest[1]),
    })

    expect(result.pass).toBe(false)
    expect(result.mismatches).toEqual([expect.objectContaining({ source: 'action', kind: 'identity-mismatch' })])
  })

  it('rejects a missing source tuple instead of inferring it from a sibling DOM position', () => {
    const result = compareTableIdentityTuples({
      expected: tupleFor(manifest[0]),
      sentinel: tupleFor(manifest[0]),
      fixed: undefined,
      action: tupleFor(manifest[0]),
    })

    expect(result.pass).toBe(false)
    expect(result.mismatches).toEqual([expect.objectContaining({ source: 'fixed', kind: 'missing' })])
  })

  it('does not expose raw identity fields in comparison output', () => {
    const result = compareTableIdentityTuples({
      expected: tupleFor(manifest[0]),
      sentinel: tupleFor(manifest[0]),
      fixed: tupleFor(manifest[1]),
      action: tupleFor(manifest[0]),
    })
    const serialized = JSON.stringify(result)

    expect(serialized).not.toContain('HiddenIndex')
    expect(serialized).not.toContain('hidden-40')
    expect(serialized).not.toContain('hidden-41')
    expect(serialized).not.toContain('fixture-40')
  })
})
