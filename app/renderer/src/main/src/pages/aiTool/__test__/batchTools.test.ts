import { describe, expect, it, vi } from 'vitest'
import '../../ai-re-act/hooks/__test__/setupElectron'
import { collectAIToolExportNames } from '../batchTools'
const tool = (ID: number) => ({ ID, Name: `tool-${ID}` }) as any
describe('matching tool export resolution', () => {
  it('reads all server pages, deduplicates and applies exclusions without exporting an empty filter', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce({ Tools: [tool(1), tool(2)], Total: 3 })
      .mockResolvedValueOnce({ Tools: [tool(2), tool(3)], Total: 3 })
    expect(await collectAIToolExportNames(fetch, { Query: 'needle', OnlyFavorites: true }, new Set([2]))).toEqual([
      'tool-1',
      'tool-3',
    ])
    expect(fetch.mock.calls.map((call) => call[0].Pagination.Page)).toEqual([1, 2])
    expect(fetch.mock.calls.every((call) => call[0].Query === 'needle' && call[0].OnlyFavorites)).toBe(true)
  })
  it('returns empty for zero matches and rejects incomplete or repeated pages', async () => {
    expect(
      await collectAIToolExportNames(vi.fn().mockResolvedValue({ Tools: [], Total: 0 }), {
        Query: '',
        OnlyFavorites: false,
      }),
    ).toEqual([])
    await expect(
      collectAIToolExportNames(vi.fn().mockResolvedValue({ Tools: [tool(1)], Total: 9 }), {
        Query: '',
        OnlyFavorites: false,
      }),
    ).rejects.toThrow('Incomplete')
  })
  it('propagates page failures rather than exporting partial selection', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce({ Tools: [tool(1)], Total: 2 })
      .mockRejectedValueOnce(new Error('denied'))
    await expect(collectAIToolExportNames(fetch, { Query: 'x', OnlyFavorites: false })).rejects.toThrow('denied')
  })
})
