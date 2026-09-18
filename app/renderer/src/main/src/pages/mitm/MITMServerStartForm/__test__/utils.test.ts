import { describe, expect, it } from 'vitest'
import type { MITMFilterData } from '../MITMFilters'
import { buildNextMITMFilterData } from '../utils'

describe('buildNextMITMFilterData', () => {
  const makeBackendData = (): MITMFilterData => ({
    IncludeHostnames: [],
    ExcludeHostnames: [{ MatcherType: 'word', Group: ['old-host.com'], RuleName: undefined }],
    IncludeSuffix: [],
    ExcludeSuffix: [],
    IncludeUri: [],
    ExcludeUri: [{ MatcherType: 'word', Group: ['/old'], RuleName: undefined }],
    ExcludeMethods: [],
    ExcludeMIME: [],
    FilterBundledStaticJS: true,
  })

  it('appends URL to ExcludeUri and preserves other fields', () => {
    const next = buildNextMITMFilterData(makeBackendData(), 'excludeUri', '/new')
    expect(next.ExcludeUri).toHaveLength(1)
    expect(next.ExcludeUri[0].Group).toEqual(['/old', '/new'])
    expect(next.ExcludeHostnames?.[0].Group).toEqual(['old-host.com'])
    expect(next.FilterBundledStaticJS).toBe(true)
  })

  it('appends hostname to ExcludeHostnames and preserves other fields', () => {
    const next = buildNextMITMFilterData(makeBackendData(), 'excludeHostname', 'new-host.com')
    expect(next.ExcludeHostnames).toHaveLength(1)
    expect(next.ExcludeHostnames?.[0].Group).toEqual(['old-host.com', 'new-host.com'])
    expect(next.ExcludeUri?.[0].Group).toEqual(['/old'])
  })

  it('deduplicates when value already exists', () => {
    const next = buildNextMITMFilterData(makeBackendData(), 'excludeUri', '/old')
    expect(next.ExcludeUri[0].Group).toEqual(['/old'])
  })

  it('creates a new word matcher group when field was empty', () => {
    const data: MITMFilterData = { ...makeBackendData(), ExcludeUri: [] }
    const next = buildNextMITMFilterData(data, 'excludeUri', '/first')
    expect(next.ExcludeUri).toEqual([{ MatcherType: 'word', Group: ['/first'], RuleName: undefined }])
  })

  it('preserves advanced filter rules', () => {
    const data: MITMFilterData = {
      ...makeBackendData(),
      ExcludeUri: [
        { MatcherType: 'word', Group: ['/old'], RuleName: undefined },
        { MatcherType: 'regexp', Group: ['/regex-path'], RuleName: 'rule-1' },
      ],
    }
    const next = buildNextMITMFilterData(data, 'excludeUri', '/new')
    expect(next.ExcludeUri).toHaveLength(2)
    expect(next.ExcludeUri[0].Group).toEqual(['/old', '/new'])
    expect(next.ExcludeUri[1]).toEqual({ MatcherType: 'regexp', Group: ['/regex-path'], RuleName: 'rule-1' })
  })

  it('preserves include and other base filter fields', () => {
    const data: MITMFilterData = {
      ...makeBackendData(),
      IncludeHostnames: [{ MatcherType: 'word', Group: ['keep.com'], RuleName: undefined }],
      IncludeUri: [{ MatcherType: 'word', Group: ['/keep'], RuleName: undefined }],
      ExcludeMethods: [{ MatcherType: 'word', Group: ['OPTIONS'], RuleName: undefined }],
    }
    const next = buildNextMITMFilterData(data, 'excludeHostname', 'new-host.com')
    expect(next.IncludeHostnames?.[0].Group).toEqual(['keep.com'])
    expect(next.IncludeUri?.[0].Group).toEqual(['/keep'])
    expect(next.ExcludeMethods?.[0].Group).toEqual(['OPTIONS'])
  })
})
