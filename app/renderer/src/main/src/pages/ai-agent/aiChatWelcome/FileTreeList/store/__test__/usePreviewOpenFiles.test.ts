import { describe, expect, it, vi } from 'vitest'
import { previewOpenFilesStore } from '../usePreviewOpenFiles'

describe('previewOpenFilesStore.setPreviewOpenFiles', () => {
  it('path/name 未变时不 notify', () => {
    previewOpenFilesStore.clear()
    const listener = vi.fn()
    const unsubscribe = previewOpenFilesStore.subscribe(listener)

    const files = [{ path: '/a.js', name: 'a.js' }]
    previewOpenFilesStore.setPreviewOpenFiles(files)
    expect(listener).toHaveBeenCalledTimes(1)
    expect(previewOpenFilesStore.getSnapshot()).toEqual(files)

    previewOpenFilesStore.setPreviewOpenFiles([{ path: '/a.js', name: 'a.js' }])
    expect(listener).toHaveBeenCalledTimes(1)

    unsubscribe()
    previewOpenFilesStore.clear()
  })

  it('path 或 name 变化时 notify', () => {
    previewOpenFilesStore.clear()
    const listener = vi.fn()
    const unsubscribe = previewOpenFilesStore.subscribe(listener)

    previewOpenFilesStore.setPreviewOpenFiles([{ path: '/a.js', name: 'a.js' }])
    previewOpenFilesStore.setPreviewOpenFiles([{ path: '/a.js', name: 'renamed.js' }])
    expect(listener).toHaveBeenCalledTimes(2)
    expect(previewOpenFilesStore.getSnapshot()[0].name).toBe('renamed.js')

    previewOpenFilesStore.setPreviewOpenFiles([{ path: '/b.js', name: 'renamed.js' }])
    expect(listener).toHaveBeenCalledTimes(3)

    unsubscribe()
    previewOpenFilesStore.clear()
  })
})
