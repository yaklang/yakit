import { describe, expect, it, vi } from 'vitest'
import { getVirtualTableReactRowKey } from '../TableVirtualResize'

vi.hoisted(() => {
  const values = new Map<string, string>()
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      clear: () => values.clear(),
      getItem: (key: string) => values.get(key) ?? null,
      key: (index: number) => [...values.keys()][index] ?? null,
      get length() {
        return values.size
      },
      removeItem: (key: string) => values.delete(key),
      setItem: (key: string, value: string) => values.set(key, value),
    } satisfies Storage,
  })
})

describe('TableVirtualResize React row keys', () => {
  it('falls back to the existing renderKey value when getRowKey is not provided', () => {
    expect(getVirtualTableReactRowKey({ ID: 42 }, 3, 'ID')).toBe(42)
  })

  it('preserves a valid zero key from either key source', () => {
    expect(getVirtualTableReactRowKey({ ID: 0 }, 3, 'ID')).toBe(0)
    expect(getVirtualTableReactRowKey({ ID: 42 }, 3, 'ID', () => 0)).toBe(0)
  })

  it('uses getRowKey only for React identity without changing the record business ID', () => {
    const record = { ID: 42, HiddenIndex: 'hidden-42' }
    const getRowKey = vi.fn((item: typeof record) => item.HiddenIndex)

    expect(getVirtualTableReactRowKey(record, 7, 'ID', getRowKey)).toBe('hidden-42')
    expect(getRowKey).toHaveBeenCalledWith(record, 7)
    expect(record.ID).toBe(42)
  })

  it('uses the virtual item index only when neither key source resolves', () => {
    expect(getVirtualTableReactRowKey({}, 7, 'ID')).toBe(7)
    expect(getVirtualTableReactRowKey({ ID: 42 }, 7, 'ID', () => undefined as never)).toBe(42)
  })
})
