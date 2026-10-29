import { describe, expect, it, vi } from 'vitest'
import { revealSearchHitOnEditor } from '../revealSearchHit'

const payload = (path: string, lineNumber = 3, column = 1) => JSON.stringify({ path, lineNumber, column })

describe('revealSearchHitOnEditor', () => {
  it('路径一致时滚动到命中行列', () => {
    const revealPositionInCenter = vi.fn()
    revealSearchHitOnEditor({ revealPositionInCenter }, '/tmp/a.txt', payload('/tmp/a.txt', 9, 4))
    expect(revealPositionInCenter).toHaveBeenCalledWith({ lineNumber: 9, column: 4 })
  })

  it('路径不一致或编辑器未就绪时不滚动', () => {
    const revealPositionInCenter = vi.fn()
    revealSearchHitOnEditor({ revealPositionInCenter }, '/tmp/a.txt', payload('/tmp/b.txt'))
    revealSearchHitOnEditor(undefined, '/tmp/a.txt', payload('/tmp/a.txt'))
    expect(revealPositionInCenter).not.toHaveBeenCalled()
  })

  it('非法 payload 不抛错也不滚动', () => {
    const revealPositionInCenter = vi.fn()
    revealSearchHitOnEditor({ revealPositionInCenter }, '/tmp/a.txt', '{')
    revealSearchHitOnEditor({ revealPositionInCenter }, '/tmp/a.txt', JSON.stringify({ path: '/tmp/a.txt' }))
    expect(revealPositionInCenter).not.toHaveBeenCalled()
  })
})
