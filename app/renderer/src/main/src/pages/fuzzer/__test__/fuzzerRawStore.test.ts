import { describe, expect, it } from 'vitest'
import { fuzzerRawStore, parkFuzzerRaw, fuzzerPageScope } from '../fuzzerRawStore'
import type { FuzzerResponse } from '../HTTPFuzzerPage'

const bytes = (values: number[]) => new Uint8Array(values)
const asArray = (value?: Uint8Array) => Array.from(value || [])

describe('fuzzerRawStore', () => {
  it('keeps an earlier response when a later packet does not include one', async () => {
    const scope = fuzzerPageScope('keep')
    await fuzzerRawStore.merge(scope, 'u1', bytes([1]), bytes([9]))
    await fuzzerRawStore.merge(scope, 'u1', bytes([2]), bytes([]))
    const body = await fuzzerRawStore.get('u1')
    expect(asArray(body?.request)).toEqual([2])
    expect(asArray(body?.response)).toEqual([9])
    await fuzzerRawStore.deleteScope(scope)
    expect(await fuzzerRawStore.get('u1')).toBeUndefined()
  })

  it('drops packets queued before a scope is cleared and keeps packets queued after', async () => {
    const scope = fuzzerPageScope('reset')
    const stale = fuzzerRawStore.merge(scope, 'old', bytes([1]), bytes([1]))
    const cleared = fuzzerRawStore.deleteScope(scope)
    const fresh = fuzzerRawStore.merge(scope, 'new', bytes([3]), bytes([4]))
    await Promise.all([stale, cleared, fresh])
    expect(await fuzzerRawStore.get('old')).toBeUndefined()
    expect(asArray((await fuzzerRawStore.get('new'))?.request)).toEqual([3])
    await fuzzerRawStore.deleteScope(scope)
  })

  it('removes the raw bytes from the row as soon as they are parked', async () => {
    const row = {
      UUID: 'row-1',
      RequestRaw: bytes([7]),
      ResponseRaw: bytes([8]),
    } as FuzzerResponse
    parkFuzzerRaw(fuzzerPageScope('row'), row)
    expect(row.RequestRaw).toHaveLength(0)
    expect(row.ResponseRaw).toHaveLength(0)
    const body = await fuzzerRawStore.get('row-1')
    expect(asArray(body?.request)).toEqual([7])
    expect(asArray(body?.response)).toEqual([8])
    await fuzzerRawStore.deleteScope(fuzzerPageScope('row'))
  })
})
