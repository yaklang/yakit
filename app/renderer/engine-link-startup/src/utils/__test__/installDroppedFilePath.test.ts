import { describe, expect, it, vi } from 'vitest'
import { installDroppedFilePath } from '../installDroppedFilePath'

describe('installDroppedFilePath', () => {
  it('does not replace a path that is already defined', () => {
    class File {
      get path() {
        return 'kept'
      }
    }
    installDroppedFilePath(File, () => 'replaced')
    expect(new File().path).toBe('kept')
  })

  it('does nothing when the bridge reader is missing', () => {
    class File {}
    installDroppedFilePath(File)
    expect(Object.prototype.hasOwnProperty.call(File.prototype, 'path')).toBe(false)
  })

  it('returns an empty string when the bridge returns empty or throws', () => {
    class Empty {
      declare path: string
    }
    installDroppedFilePath(Empty, () => '')
    expect(new Empty().path).toBe('')

    class Broken {
      declare path: string
    }
    installDroppedFilePath(Broken, () => {
      throw new Error('bridge failed')
    })
    expect(new Broken().path).toBe('')
  })

  it('reads a dropped file path from the bridge', () => {
    class File {
      declare path: string
    }
    const readPath = vi.fn(() => 'C:/selected.txt')
    installDroppedFilePath(File, readPath)
    const selected = new File()
    expect(selected.path).toBe('C:/selected.txt')
    expect(readPath).toHaveBeenCalledWith(selected)
  })
})
