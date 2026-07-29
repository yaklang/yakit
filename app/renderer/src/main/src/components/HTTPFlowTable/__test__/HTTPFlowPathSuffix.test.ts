import { describe, expect, it } from 'vitest'
import {
  buildHTTPFlowSuffixOptions,
  getHTTPFlowPathSuffixValue,
  normalizeHTTPFlowPathSuffix,
} from '../HTTPFlowPathSuffix'

describe('HTTPFlowPathSuffix', () => {
  it('normalizes a valid suffix and strips the leading dot', () => {
    expect(normalizeHTTPFlowPathSuffix('.js')).toBe('js')
    expect(normalizeHTTPFlowPathSuffix('json')).toBe('json')
  })

  it('rejects malformed suffix values from backend aggregation', () => {
    expect(normalizeHTTPFlowPathSuffix('.com&app=2021&size=w240')).toBe('')
    expect(normalizeHTTPFlowPathSuffix('.png!cc_216x216')).toBe('png')
  })

  it('prefers a valid PathSuffix field and falls back to parsing Path', () => {
    expect(getHTTPFlowPathSuffixValue('/static/app.js?version=1', '.js')).toBe('js')
    expect(getHTTPFlowPathSuffixValue('/item/assets/428.png!cc_216x216', '')).toBe('png')
  })

  it('does not treat embedded urls in path payloads as file suffixes', () => {
    expect(
      getHTTPFlowPathSuffixValue(
        '/search/src=https://imgsrc.baidu.com/forum&app=2021&size=w240&n=0&g=0n&fmt=auto',
        '.com&app=2021&size=w240&n=0&g=0n&fmt=auto',
      ),
    ).toBe('')
  })

  it('filters invalid suffix options from field group response', () => {
    expect(
      buildHTTPFlowSuffixOptions([
        { Value: '.js', Total: 2 },
        { Value: '.com&app=2021&size=w240', Total: 1 },
        { Value: '.png!cc_216x216', Total: 1 },
      ]),
    ).toEqual([
      { label: 'js', value: 'js' },
      { label: 'png', value: 'png' },
    ])
  })
})
