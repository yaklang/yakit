import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { previewOpenFilesStore } from '../usePreviewOpenFiles'

describe('previewOpenFilesStore（按 pageId 隔离）', () => {
  beforeEach(() => {
    previewOpenFilesStore.clearAll()
  })
  afterEach(() => {
    previewOpenFilesStore.clearAll()
  })

  it('path/name 未变时不 notify', () => {
    const listener = vi.fn()
    const unsubscribe = previewOpenFilesStore.subscribe(listener)

    const files = [{ path: '/a.js', name: 'a.js' }]
    previewOpenFilesStore.setPreviewOpenFiles('page-a', files)
    expect(listener).toHaveBeenCalledTimes(1)
    expect(previewOpenFilesStore.getSnapshot('page-a')).toEqual(files)

    previewOpenFilesStore.setPreviewOpenFiles('page-a', [{ path: '/a.js', name: 'a.js' }])
    expect(listener).toHaveBeenCalledTimes(1)

    unsubscribe()
  })

  it('path 或 name 变化时 notify', () => {
    const listener = vi.fn()
    const unsubscribe = previewOpenFilesStore.subscribe(listener)

    previewOpenFilesStore.setPreviewOpenFiles('page-a', [{ path: '/a.js', name: 'a.js' }])
    previewOpenFilesStore.setPreviewOpenFiles('page-a', [{ path: '/a.js', name: 'renamed.js' }])
    expect(listener).toHaveBeenCalledTimes(2)
    expect(previewOpenFilesStore.getSnapshot('page-a')[0].name).toBe('renamed.js')

    previewOpenFilesStore.setPreviewOpenFiles('page-a', [{ path: '/b.js', name: 'renamed.js' }])
    expect(listener).toHaveBeenCalledTimes(3)

    unsubscribe()
  })

  it('多 page 互不影响：写入 B 不覆盖 A；清理 B 不清空 A', () => {
    const filesA = [{ path: '/a.js', name: 'a.js' }]
    const filesB = [{ path: '/b.js', name: 'b.js' }]
    previewOpenFilesStore.setPreviewOpenFiles('page-a', filesA)
    previewOpenFilesStore.setPreviewOpenFiles('page-b', filesB)

    expect(previewOpenFilesStore.getSnapshot('page-a')).toEqual(filesA)
    expect(previewOpenFilesStore.getSnapshot('page-b')).toEqual(filesB)

    previewOpenFilesStore.clear('page-b')
    expect(previewOpenFilesStore.getSnapshot('page-a')).toEqual(filesA)
    expect(previewOpenFilesStore.getSnapshot('page-b')).toEqual([])
  })

  it('无 pageId 时落入默认键，与显式 page 隔离', () => {
    previewOpenFilesStore.setPreviewOpenFiles(undefined, [{ path: '/d.js', name: 'd.js' }])
    previewOpenFilesStore.setPreviewOpenFiles('page-a', [{ path: '/a.js', name: 'a.js' }])
    expect(previewOpenFilesStore.getSnapshot()).toEqual([{ path: '/d.js', name: 'd.js' }])
    expect(previewOpenFilesStore.getSnapshot('page-a')).toEqual([{ path: '/a.js', name: 'a.js' }])
    previewOpenFilesStore.clear()
    expect(previewOpenFilesStore.getSnapshot()).toEqual([])
    expect(previewOpenFilesStore.getSnapshot('page-a')).toEqual([{ path: '/a.js', name: 'a.js' }])
  })
})
