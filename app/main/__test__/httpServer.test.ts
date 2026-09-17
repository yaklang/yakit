import { beforeEach, describe, expect, it, vi } from 'vitest'

const fixture = vi.hoisted(() => ({ request: vi.fn(), use: vi.fn() }))
vi.mock('axios', () => ({
  default: {
    create: () => ({ request: fixture.request, interceptors: { request: { use: fixture.use } } }),
    isCancel: (error: unknown) => !!error && typeof error === 'object' && '__CANCEL__' in error,
    isAxiosError: (error: unknown) => !!error && typeof error === 'object' && 'isAxiosError' in error,
  },
}))
vi.mock('../logFile', () => ({ printLogOutputFile: vi.fn() }))
import { httpApi, service } from '../httpServer'

beforeEach(() => {
  fixture.request.mockReset()
})

describe('local HTTP service response contract', () => {
  it('keeps successful HTTP status and response data', async () => {
    fixture.request.mockResolvedValue({ status: 200, data: { items: [1] } })
    await expect(service({ url: 'items', method: 'get' })).resolves.toEqual({ code: 200, data: { items: [1] } })
  })

  it('keeps authentication failures as resolved business data', async () => {
    fixture.request.mockRejectedValue({ isAxiosError: true, response: { status: 401, data: { message: 'token过期' } } })
    await expect(service({ url: 'private', method: 'get' })).resolves.toMatchObject({ code: 401, message: 'token过期' })
  })

  it('rejects connection errors without losing the original error', async () => {
    const error = Object.assign(new Error('socket closed'), { isAxiosError: true, code: 'ECONNRESET' })
    fixture.request.mockRejectedValue(error)
    await expect(httpApi({ url: 'items', method: 'post', data: {} })).rejects.toBe(error)
    expect(fixture.request).toHaveBeenCalledOnce()
  })
})
