import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { runTableMaskVariant, waitForTableMaskFixture } from '../../drivers/table-virtual-fixed-right.driver.mjs'

const artifactsDir = process.env.YAKIT_E2E_ARTIFACTS_DIR

const saveResult = async (result) => {
  if (!artifactsDir) throw new Error('YAKIT_E2E_ARTIFACTS_DIR is required')
  const directory = path.join(artifactsDir, 'table-virtual-fixed-right')
  await mkdir(directory, { recursive: true })
  await writeFile(path.join(directory, `${result.scenario}.json`), `${JSON.stringify(result, null, 2)}\n`)
}

const expectProductionPass = (result) => {
  expect(result.runs).toHaveLength(20)
  expect(result.fixedChildBackgroundContract.pass).toBe(true)
  expect(result.fixedChildBackgroundContract.parentTop).toBe('0px')
  expect(result.anchors.failures).toEqual({ 0: 0, 0.5: 0, 0.8: 0 })
  expect(result.failures).toBe(0)
  expect(result.status).toBe('PASS')
}

describe('TableVirtualResize fixed-right paint mask', () => {
  before(async () => {
    await waitForTableMaskFixture()
  })

  it('keeps the production fixed-right column opaque with unique IDs and a row key', async () => {
    const result = await runTableMaskVariant({
      scenario: 'a-unique-row-key-top-zero',
      variant: 'production',
      dataset: 'unique',
      identity: 'row-key',
    })
    await saveResult(result)
    expectProductionPass(result)
  })

  it('keeps the production fixed-right column opaque with duplicate IDs and a row key', async () => {
    const result = await runTableMaskVariant({
      scenario: 'b-duplicate-row-key-top-zero',
      variant: 'production',
      dataset: 'duplicate',
      identity: 'row-key',
    })
    await saveResult(result)
    expectProductionPass(result)
  })

  it('reproduces duplicate renderKey identity mismatch with the production top inset', async () => {
    const result = await runTableMaskVariant({
      scenario: 'c-duplicate-identity-reversal-top-zero',
      variant: 'production',
      dataset: 'duplicate',
      identity: 'render-key',
    })
    await saveResult(result)

    expect(result.runs).toHaveLength(20)
    expect(result.fixedChildBackgroundContract.pass).toBe(true)
    expect(result.fixedChildBackgroundContract.parentTop).toBe('0px')
    expect(result.failures).toBeGreaterThanOrEqual(5)
    expect(result.runs.filter(({ geometryFailure }) => geometryFailure).length).toBeGreaterThanOrEqual(5)
    expect(result.status).toBe('REPRODUCED')
  })

  it('records the no-top non-causal control without using it for fix attribution', async () => {
    const result = await runTableMaskVariant({
      scenario: 'd-duplicate-row-key-no-top-non-causal-control',
      variant: 'no-top-control',
      dataset: 'duplicate',
      identity: 'row-key',
    })
    await saveResult(result)
    expect(result.runs).toHaveLength(20)
    expect(result.fixedChildBackgroundContract.pass).toBe(true)
    expect(result.fixedChildBackgroundContract.parentTop).toBe('auto')
  })
})
