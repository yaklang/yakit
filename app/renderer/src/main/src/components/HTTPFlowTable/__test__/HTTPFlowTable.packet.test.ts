import { describe, expect, it, vi } from 'vitest'
import type { HTTPFlow } from '../HTTPFlowTable.constants'
import { hydrateHTTPFlowRequest, hydrateHTTPFlowRequests } from '../HTTPFlowTable.packet'

const flow = (id: number, request = new Uint8Array()): HTTPFlow =>
  ({
    Id: id,
    Request: request,
    Response: new Uint8Array(),
  }) as HTTPFlow

describe('HTTP flow request packet hydration', () => {
  it('does not query details when the list row already contains a request', async () => {
    const existing = flow(1, new Uint8Array([1]))
    const fetchById = vi.fn()

    await expect(hydrateHTTPFlowRequest(existing, fetchById)).resolves.toBe(existing)
    expect(fetchById).not.toHaveBeenCalled()
  })

  it('loads a projected request by id and preserves list-only metadata', async () => {
    const projected = { ...flow(2), cellClassName: 'selected' }
    const fetchById = vi.fn(async () => ({ ...flow(2, new Uint8Array([2, 3])), Method: 'POST' }))

    await expect(hydrateHTTPFlowRequest(projected, fetchById)).resolves.toMatchObject({
      Id: 2,
      Method: 'POST',
      Request: new Uint8Array([2, 3]),
      cellClassName: 'selected',
    })
    expect(fetchById).toHaveBeenCalledWith(2)
  })

  it('coalesces concurrent detail queries for the same projected row', async () => {
    let resolveDetail: (value: HTTPFlow) => void = () => undefined
    const fetchById = vi.fn(
      () =>
        new Promise<HTTPFlow>((resolve) => {
          resolveDetail = resolve
        }),
    )

    const first = hydrateHTTPFlowRequest(flow(3), fetchById)
    const second = hydrateHTTPFlowRequest(flow(3), fetchById)
    resolveDetail(flow(3, new Uint8Array([3])))

    const [firstResult, secondResult] = await Promise.all([first, second])
    expect(firstResult.Request).toEqual(new Uint8Array([3]))
    expect(secondResult).toBe(firstResult)
    expect(fetchById).toHaveBeenCalledTimes(1)
  })

  it('hydrates only missing packets and retains batch order', async () => {
    const fetchById = vi.fn(async (id: number) => flow(id, new Uint8Array([id])))
    const loaded = flow(4, new Uint8Array([4]))

    const result = await hydrateHTTPFlowRequests([loaded, flow(5)], fetchById)

    expect(result.map((item) => item.Id)).toEqual([4, 5])
    expect(result[0]).toBe(loaded)
    expect(result[1].Request).toEqual(new Uint8Array([5]))
    expect(fetchById).toHaveBeenCalledTimes(1)
    expect(fetchById).toHaveBeenCalledWith(5)
  })

  it('rejects an invalid detail response instead of invoking an action without a packet', async () => {
    await expect(hydrateHTTPFlowRequest(flow(6), async () => flow(7, new Uint8Array([7])))).rejects.toThrow(
      'does not match',
    )
    await expect(hydrateHTTPFlowRequest(flow(8), async () => flow(8))).rejects.toThrow('has no request packet')
  })
})
