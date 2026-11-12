import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useSavedModelContext } from '../useSavedModelContext'

const request = vi.hoisted(() => vi.fn())
vi.mock('../modelContextApi', () => ({ requestModelContext: request }))
const context = (model: string, threshold = 200 * 1024) => ({
  provider: 'test',
  model,
  threshold_tokens: threshold,
  context_tokens: 500 * 1024,
  minimum_threshold_tokens: 100 * 1024,
  prompt_tokens: 0,
  source: 'manual' as const,
  pending: false,
  too_small: false,
})
const deferred = () => {
  let resolve!: (value: ReturnType<typeof context>) => void
  const promise = new Promise<ReturnType<typeof context>>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

describe('saved model budgets', () => {
  beforeEach(() => { request.mockReset() })

  it('ignores a late read after selecting another model, with no default 500K flash', async () => {
    const first = deferred(),
      second = deferred()
    request.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
    const view = renderHook(({ model }) => useSavedModelContext({ provider: 'test', model }, true), {
      initialProps: { model: 'first' },
    })
    view.rerender({ model: 'second' })
    expect(view.result.current.context).toBeUndefined()
    await act(async () => second.resolve(context('second', 300 * 1024)))
    await act(async () => first.resolve(context('first')))
    expect(view.result.current.context?.model).toBe('second')
    expect(view.result.current.context?.threshold_tokens).toBe(300 * 1024)
  })

  it('a late save cannot overwrite the newly selected model or permit duplicate saves', async () => {
    const save = deferred()
    request
      .mockResolvedValueOnce(context('first'))
      .mockReturnValueOnce(save.promise)
      .mockResolvedValueOnce(context('second'))
    const view = renderHook(({ model }) => useSavedModelContext({ provider: 'test', model }, true), {
      initialProps: { model: 'first' },
    })
    await waitFor(() => expect(view.result.current.loading).toBe(false))
    act(() => {
      expect(view.result.current.save(600 * 1024)).toBe(true)
      expect(view.result.current.save(700 * 1024)).toBe(false)
    })
    view.rerender({ model: 'second' })
    expect(view.result.current.context).toBeUndefined()
    await waitFor(() => expect(view.result.current.context?.model).toBe('second'))
    await act(async () => save.resolve(context('first', 600 * 1024)))
    expect(view.result.current.context?.model).toBe('second')
    expect(view.result.current.context?.threshold_tokens).toBe(200 * 1024)
    expect(request).toHaveBeenCalledTimes(3)
  })

  it('does not invent a context budget when an old engine lacks the RPC', async () => {
    request.mockRejectedValue(new Error('UNIMPLEMENTED'))
    const { result } = renderHook(() => useSavedModelContext({ provider: 'test', model: 'first' }, true))
    await waitFor(() => expect(result.current.error).toContain('UNIMPLEMENTED'))
    expect(result.current.context).toBeUndefined()
    expect(result.current.save(200 * 1024)).toBe(false)
  })
})
