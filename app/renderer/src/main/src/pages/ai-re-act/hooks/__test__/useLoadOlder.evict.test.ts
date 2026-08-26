import { describe, it, expect } from 'vitest'
import { collectEvictableContentTokens } from '../contentEvict'
import { AIChatQSDataTypeEnum } from '../aiRender'

describe('collectEvictableContentTokens', () => {
  const makeContents = () => {
    const contents = new Map<string, any>()
    contents.set('hot-stream', {
      id: 'hot-stream',
      type: AIChatQSDataTypeEnum.STREAM,
      stageSettled: false,
    })
    contents.set('settled', {
      id: 'settled',
      type: AIChatQSDataTypeEnum.THOUGHT,
      stageSettled: true,
    })
    contents.set('legacy', {
      id: 'legacy',
      type: AIChatQSDataTypeEnum.QUESTION,
    })
    contents.set('visible', {
      id: 'visible',
      type: AIChatQSDataTypeEnum.RESULT,
      stageSettled: true,
    })
    return contents
  }

  it('skips entire evict when session execute', () => {
    const keep = new Set<string>()
    expect(collectEvictableContentTokens(makeContents(), keep, true)).toEqual([])
  })

  it('keeps stageSettled false and keep-set; evicts settled and legacy missing field', () => {
    const keep = new Set(['visible'])
    const toEvict = collectEvictableContentTokens(makeContents(), keep, false)
    expect(toEvict.sort()).toEqual(['legacy', 'settled'])
  })
})
