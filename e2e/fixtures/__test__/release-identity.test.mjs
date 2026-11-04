// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { assertPlan, assertReady, createPlan } from '../../../scripts/release/model.mjs'

const input = {
  editions: 'yakit,yakitEE',
  version: '1.4.9-1030',
  sha: 'a'.repeat(40),
  runId: '123',
  repository: 'yaklang/yakit',
  ref: 'v1.4.9-1030',
  refType: 'tag',
}

describe('formal release tag identity', () => {
  it.each([
    ['yakit', ''],
    ['yakitEE', ''],
    ['yakit,yakitEE', ''],
    ['irify', '-irify'],
    ['irifyEE', '-irify'],
    ['irify,irifyEE', '-irify'],
    ['memfit', '-memfit'],
  ])('accepts the canonical tag for %s', (editions, suffix) => {
    for (const version of ['1.4.9', '1.4.9-1030', '1.4.9-beta5']) {
      const plan = createPlan({ ...input, editions, version, ref: `v${version}${suffix}` })
      expect(assertPlan(plan)).toBe(plan)
    }
  })

  it.each([
    ['yakit', 'v1.4.9-1030-irify', '1.4.9-1030'],
    ['yakit,yakitEE', 'v1.4.9-1030-memfit', '1.4.9-1030'],
    ['irify', 'v1.4.9-1030', '1.4.9-1030'],
    ['irifyEE', 'v1.4.9-1030-memfit', '1.4.9-1030'],
    ['memfit', 'v1.4.9-1030-irify', '1.4.9-1030'],
    ['yakit,irify', 'v1.4.9-1030', '1.4.9-1030'],
    ['irify,memfit', 'v1.4.9-1030-irify', '1.4.9-1030'],
    ['yakit', '1.4.9-1030', '1.4.9-1030'],
    ['irify', '1.4.9-1030-irify', '1.4.9-1030'],
    ['memfit', '1.4.9-1030-memfit', '1.4.9-1030'],
    ['yakit', 'v1.4.9-render', '1.4.9-render'],
    ['yakit', 'v1.4.9-link-render', '1.4.9-link-render'],
    ['yakit', 'v1.4.9-1031', '1.4.9-1030'],
  ])('rejects edition %s on tag %s', (editions, ref, version) => {
    expect(() => createPlan({ ...input, editions, ref, version })).toThrow()
  })

  it('preserves mixed-edition branch rehearsals', () => {
    const plan = createPlan({
      ...input,
      editions: 'yakit,yakitEE,irify,irifyEE,memfit',
      ref: 'codex/release-rehearsal',
      refType: 'branch',
    })
    expect(plan.tag).toBeNull()
    expect(plan.targets).toHaveLength(50)
    expect(assertPlan(plan)).toBe(plan)
  })

  it('rejects an existing candidate retagged to another product before finalization', () => {
    const plan = createPlan(input)
    const prepared = plan.targets.map((target) => ({
      target: target.id,
      sha: plan.sha,
      version: plan.version,
      sha256: 'b'.repeat(64),
    }))
    expect(assertReady(plan, prepared).prepared).toEqual(prepared)
    plan.tag = `${plan.tag}-irify`
    expect(() => assertPlan(plan)).toThrow()
    expect(() => assertReady(plan, prepared)).toThrow()
  })
})
