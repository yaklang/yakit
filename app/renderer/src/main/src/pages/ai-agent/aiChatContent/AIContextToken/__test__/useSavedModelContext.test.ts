import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useSavedModelContext } from '../useSavedModelContext'

const request = vi.hoisted(() => vi.fn())
vi.mock('../modelContextApi', () => ({ requestModelContext: request }))
const context = (model: string, threshold = 200 * 1000) => ({
  provider: 'test',
  model,
  threshold_tokens: threshold,
  context_tokens: 500 * 1000,
  minimum_threshold_tokens: 100 * 1000,
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
  beforeEach(() => {
    request.mockReset()
  })

  it('ignores a late read after selecting another model, with no default 500K flash', async () => {
    const first = deferred(),
      second = deferred()
    request.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
    const view = renderHook(
      ({ model }) => useSavedModelContext({ provider: 'test', model, context_key: 'service-a' }, true),
      {
        initialProps: { model: 'first' },
      },
    )
    view.rerender({ model: 'second' })
    expect(view.result.current.context).toBeUndefined()
    await act(async () => second.resolve(context('second', 300 * 1000)))
    await act(async () => first.resolve(context('first')))
    expect(view.result.current.context?.model).toBe('second')
    expect(view.result.current.context?.threshold_tokens).toBe(300 * 1000)
  })

  it('a late save cannot overwrite the newly selected model or permit duplicate saves', async () => {
    const save = deferred()
    request
      .mockResolvedValueOnce(context('first'))
      .mockReturnValueOnce(save.promise)
      .mockResolvedValueOnce(context('second'))
    const view = renderHook(
      ({ model }) => useSavedModelContext({ provider: 'test', model, context_key: 'service-a' }, true),
      {
        initialProps: { model: 'first' },
      },
    )
    await waitFor(() => expect(view.result.current.loading).toBe(false))
    act(() => {
      expect(view.result.current.save(600 * 1000)).toBe(true)
      expect(view.result.current.save(700 * 1000)).toBe(false)
    })
    view.rerender({ model: 'second' })
    expect(view.result.current.context).toBeUndefined()
    await waitFor(() => expect(view.result.current.context?.model).toBe('second'))
    await act(async () => save.resolve(context('first', 600 * 1000)))
    expect(view.result.current.context?.model).toBe('second')
    expect(view.result.current.context?.threshold_tokens).toBe(200 * 1000)
    expect(request).toHaveBeenCalledTimes(3)
  })

  it('isolates two services with the same provider and model while a read is in flight', async () => {
    const first = deferred(),
      second = deferred()
    request.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
    const view = renderHook(
      ({ key }) => useSavedModelContext({ provider: 'test', model: 'same', context_key: key }, true),
      {
        initialProps: { key: 'service-a' },
      },
    )
    view.rerender({ key: 'service-b' })
    expect(view.result.current.context).toBeUndefined()
    await act(async () => second.resolve(context('same', 400000)))
    await act(async () => first.resolve(context('same', 100000)))
    expect(view.result.current.context?.threshold_tokens).toBe(400000)
  })

  it('does not guess the service identity from historical provider/model names', () => {
    const view = renderHook(() => useSavedModelContext({ provider: 'test', model: 'same' }, true))
    expect(request).not.toHaveBeenCalled()
    expect(view.result.current.save(100000)).toBe(false)
  })

  it('does not invent a context budget when an old engine lacks the RPC', async () => {
    request.mockRejectedValue(new Error('UNIMPLEMENTED'))
    const { result } = renderHook(() =>
      useSavedModelContext({ provider: 'test', model: 'first', context_key: 'service-a' }, true),
    )
    await waitFor(() => expect(result.current.error).toContain('UNIMPLEMENTED'))
    expect(result.current.context).toBeUndefined()
    expect(result.current.save(200 * 1000)).toBe(false)
  })
})
