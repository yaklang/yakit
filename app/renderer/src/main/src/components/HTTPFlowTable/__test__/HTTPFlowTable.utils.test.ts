import { describe, expect, it } from 'vitest'
import {
  buildHTTPFlowProjectKey,
  buildHTTPFlowColorTags,
  buildHTTPFlowTableAdvancedQuery,
  buildLegacyHTTPFlowTableFilterConfig,
  buildRuleSummaryList,
  filterHTTPFlowsByFavoriteAndTags,
  findHTTPFlowSelectionIndex,
  getClassNameData,
  hasActiveHTTPFlowTableFilterConfig,
  isHTTPFlowTableActive,
  mergeRuleSummaryItems,
  normalizeHTTPFlowTotal,
  patchHTTPFlowTags,
  parseMITMLogResetSignal,
  safeParseHTTPFlowTableCache,
  shouldClearMITMResetBoundary,
  selectHTTPFlowTableResizeAction,
  shouldUseHTTPFlowMetadataOnlyQuery,
  splitHTTPFlowTableShieldData,
  uniqStrings,
} from '@/components/HTTPFlowTable/HTTPFlowTable.utils'
import type { HTTPFlow } from '@/components/HTTPFlowTable/HTTPFlowTable.constants'

describe('normalizeHTTPFlowTotal', () => {
  it('normalizes proto-loader int64 strings before they enter numeric table state', () => {
    expect(normalizeHTTPFlowTotal('6085')).toBe(6085)
    expect(normalizeHTTPFlowTotal(6170)).toBe(6170)
  })

  it('rejects malformed or unsafe totals instead of displaying a concatenated value', () => {
    expect(normalizeHTTPFlowTotal('60858546822155656571112106457874364745564464544564545446568565564678855764')).toBe(0)
    expect(normalizeHTTPFlowTotal('invalid')).toBe(0)
    expect(normalizeHTTPFlowTotal(-1)).toBe(0)
  })
})

describe('parseMITMLogResetSignal', () => {
  it('decodes the reset boundary envelope', () => {
    expect(parseMITMLogResetSignal('{"version":"v2","resetAtUnixSeconds":123}')).toEqual({
      version: 'v2',
      resetAtUnixSeconds: 123,
    })
  })

  it('accepts the legacy version-only event', () => {
    expect(parseMITMLogResetSignal('v2')).toEqual({ version: 'v2' })
  })
})

describe('MITM reset project boundary', () => {
  it('treats a destructive database generation change as a new ID namespace', () => {
    const oldProject = buildHTTPFlowProjectKey('project-a', 7)
    const recreatedProject = buildHTTPFlowProjectKey('project-a', 8)

    expect(shouldClearMITMResetBoundary(6512, oldProject, recreatedProject)).toBe(true)
    expect(shouldClearMITMResetBoundary(6512, oldProject, oldProject)).toBe(false)
  })

  it('does not guess when backend project identity is unavailable', () => {
    expect(buildHTTPFlowProjectKey('project-a', 0)).toBe('')
    expect(shouldClearMITMResetBoundary(6512, '', 'project-a:8')).toBe(false)
  })
})

describe('HTTP flow hidden-table policy', () => {
  it('keeps an ordinary hidden History table idle by default', () => {
    expect(isHTTPFlowTableActive(false, false, 'History')).toBe(false)
    expect(shouldUseHTTPFlowMetadataOnlyQuery(false, false, 'History')).toBe(false)
  })

  it('honors explicit History background refresh without transporting packet bodies', () => {
    expect(isHTTPFlowTableActive(false, true, 'History')).toBe(true)
    expect(shouldUseHTTPFlowMetadataOnlyQuery(false, true, 'History')).toBe(true)
  })

  it('never turns hidden MITM into a background table through the History setting', () => {
    expect(isHTTPFlowTableActive(false, true, 'MITM')).toBe(false)
    expect(shouldUseHTTPFlowMetadataOnlyQuery(false, true, 'MITM')).toBe(false)
  })
})

describe('HTTP flow table layout bootstrap', () => {
  it('bootstraps when the first usable height arrives', () => {
    expect(selectHTTPFlowTableResizeAction(undefined, 640, true, true)).toBe('bootstrap')
    expect(selectHTTPFlowTableResizeAction(0, 640, false, true)).toBe('bootstrap')
  })

  it('does not bootstrap a hidden table', () => {
    expect(selectHTTPFlowTableResizeAction(undefined, 640, true, false)).toBe('none')
  })

  it('reconciles instead of resetting after the packet detail is collapsed', () => {
    expect(selectHTTPFlowTableResizeAction(640, 720, true, true)).toBe('reconcile')
    expect(selectHTTPFlowTableResizeAction(640, 720, false, true)).toBe('none')
    expect(selectHTTPFlowTableResizeAction(640, 600, true, true)).toBe('none')
  })
})

describe('getClassNameData', () => {
  it('preserves the array and row identity when the derived color class is unchanged', () => {
    const row = { Id: 1, Tags: '' } as HTTPFlow
    const rows = [row]

    expect(getClassNameData(rows)).toBe(rows)
    expect(getClassNameData(rows)[0]).toBe(row)
  })

  it('copies only rows whose derived color class changed', () => {
    const unchanged = { Id: 1, Tags: '' } as HTTPFlow
    const changed = { Id: 2, Tags: 'YAKIT_COLOR_RED' } as HTTPFlow
    const rows = [unchanged, changed]
    const result = getClassNameData(rows)

    expect(result).not.toBe(rows)
    expect(result[0]).toBe(unchanged)
    expect(result[1]).not.toBe(changed)
    expect(result[1].cellClassName).toBe('table-cell-bg-red')
  })
})

describe('HTTP flow color tags', () => {
  it('replaces an existing color case-insensitively and preserves ordinary tags', () => {
    expect(buildHTTPFlowColorTags('manual|yakit_color_red|important', 'blue')).toEqual([
      'manual',
      'important',
      'YAKIT_COLOR_BLUE',
    ])
  })

  it('removes only color tags', () => {
    expect(buildHTTPFlowColorTags('manual|YAKIT_COLOR_GREEN|important')).toEqual(['manual', 'important'])
  })

  it('patches by database ID without changing rows that share an empty hash', () => {
    const first = { Id: 1, Hash: '', Tags: '' } as HTTPFlow
    const second = { Id: 2, Hash: '', Tags: '' } as HTTPFlow
    const rows = [first, second]
    const result = patchHTTPFlowTags(rows, [{ Id: 2, Hash: '', Tags: 'YAKIT_COLOR_RED' }])

    expect(result).not.toBe(rows)
    expect(result[0]).toBe(first)
    expect(result[1]).toEqual({
      ...second,
      Tags: 'YAKIT_COLOR_RED',
      cellClassName: 'table-cell-bg-red',
    })
  })

  it('clears the derived row class when a color is removed', () => {
    const result = patchHTTPFlowTags(
      [{ Id: 1, Tags: 'manual|YAKIT_COLOR_RED', cellClassName: 'table-cell-bg-red' } as HTTPFlow],
      [{ Id: 1, Tags: 'manual' }],
    )

    expect(result[0].Tags).toBe('manual')
    expect(result[0].cellClassName).toBeUndefined()
  })
})

describe('HTTP flow current-row reconciliation', () => {
  it('restores the selected row by stable ID and hash after a visibility refresh', () => {
    const selected = { Id: 7, Hash: 'same-flow' } as HTTPFlow
    const rows = [
      { Id: 8, Hash: 'newer' },
      { Id: 7, Hash: 'same-flow' },
    ] as HTTPFlow[]

    expect(findHTTPFlowSelectionIndex(rows, selected)).toBe(1)
  })

  it('rejects an ID collision from a different project', () => {
    const selected = { Id: 7, Hash: 'old-project' } as HTTPFlow
    const rows = [{ Id: 7, Hash: 'new-project' }] as HTTPFlow[]

    expect(findHTTPFlowSelectionIndex(rows, selected)).toBe(-1)
  })
})

describe('filterHTTPFlowsByFavoriteAndTags', () => {
  it('preserves the input array when no client-side filter is active', () => {
    const rows = [{ Id: 1 }] as HTTPFlow[]

    expect(filterHTTPFlowsByFavoriteAndTags(rows, [], false)).toBe(rows)
  })
})

const defaultFilterConfig: Parameters<typeof hasActiveHTTPFlowTableFilterConfig>[0] = {
  filterMode: 'shield',
  shield: {
    hostName: [] as string[],
    urlPath: [] as string[],
    fileSuffix: [] as string[],
    searchContentType: [] as string[],
    excludeKeywords: [] as string[],
    statusCode: '',
  },
  show: {
    hostName: [] as string[],
    urlPath: [] as string[],
    fileSuffix: [] as string[],
    searchContentType: [] as string[],
  },
}

describe('safeParseHTTPFlowTableCache', () => {
  it('parses valid json values', () => {
    expect(safeParseHTTPFlowTableCache('{"a":1}')).toEqual({ a: 1 })
  })

  it('returns undefined for invalid json values', () => {
    expect(safeParseHTTPFlowTableCache('{bad json')).toBeUndefined()
  })
})

describe('buildLegacyHTTPFlowTableFilterConfig', () => {
  it('builds a shield config from legacy cache values', () => {
    expect(
      buildLegacyHTTPFlowTableFilterConfig(defaultFilterConfig, {
        filterMode: 'shield',
        hostName: '["example.com"]',
        urlPath: '["/api"]',
        fileSuffix: '["js"]',
        searchContentType: 'html,json',
        excludeKeywords: '["token"]',
        statusCode: '404',
      }),
    ).toEqual({
      filterMode: 'shield',
      shield: {
        hostName: ['example.com'],
        urlPath: ['/api'],
        fileSuffix: ['js'],
        searchContentType: ['html', 'json'],
        excludeKeywords: ['token'],
        statusCode: '404',
      },
      show: defaultFilterConfig.show,
    })
  })

  it('builds a show config from legacy cache values', () => {
    expect(
      buildLegacyHTTPFlowTableFilterConfig(defaultFilterConfig, {
        filterMode: 'show',
        hostName: '["example.com"]',
        urlPath: '["/api"]',
        fileSuffix: '["js"]',
        searchContentType: 'html,json',
      }),
    ).toEqual({
      filterMode: 'show',
      shield: defaultFilterConfig.shield,
      show: {
        hostName: ['example.com'],
        urlPath: ['/api'],
        fileSuffix: ['js'],
        searchContentType: ['html', 'json'],
      },
    })
  })
})

describe('buildHTTPFlowTableAdvancedQuery', () => {
  it('maps the filter config and merges shield hosts without duplicates', () => {
    const filterConfig = {
      ...defaultFilterConfig,
      shield: {
        ...defaultFilterConfig.shield,
        hostName: ['shield-host'],
        searchContentType: ['html'],
        excludeKeywords: ['token'],
        statusCode: '500',
      },
      show: {
        ...defaultFilterConfig.show,
        hostName: ['show-host'],
        urlPath: ['/api'],
        fileSuffix: ['js'],
        searchContentType: ['json'],
      },
    }

    expect(buildHTTPFlowTableAdvancedQuery(filterConfig, ['shield-host', 'other-host'])).toEqual({
      SearchContentType: 'json',
      ExcludeContentType: ['html'],
      HostnameFilter: ['show-host'],
      ExcludeInUrl: ['shield-host', 'other-host'],
      IncludePath: ['/api'],
      ExcludePath: [],
      IncludeSuffix: ['js'],
      ExcludeSuffix: [],
      ExcludeKeywords: ['token'],
      ExcludeStatusCode: '500',
    })
  })
})

describe('hasActiveHTTPFlowTableFilterConfig', () => {
  it('returns false for the default config', () => {
    expect(hasActiveHTTPFlowTableFilterConfig(defaultFilterConfig)).toBe(false)
  })

  it('returns true when any field becomes active', () => {
    expect(
      hasActiveHTTPFlowTableFilterConfig({
        ...defaultFilterConfig,
        show: {
          ...defaultFilterConfig.show,
          hostName: ['example.com'],
        },
      }),
    ).toBe(true)
  })
})

describe('splitHTTPFlowTableShieldData', () => {
  it('splits mixed shield items into ids and hosts', () => {
    expect(splitHTTPFlowTableShieldData(['example.com', 10, 'test.local', 20])).toEqual({
      shieldIds: [10, 20],
      shieldHosts: ['example.com', 'test.local'],
    })
  })

  it('returns empty groups for empty input', () => {
    expect(splitHTTPFlowTableShieldData([])).toEqual({
      shieldIds: [],
      shieldHosts: [],
    })
  })
})

describe('shared rule-data helpers remain exported from the unified utils file', () => {
  it('deduplicates strings', () => {
    expect(uniqStrings(['a', 'a', 'b'])).toEqual(['a', 'b'])
  })

  it('merges rule summary items by RowKey', () => {
    const prev = buildRuleSummaryList([
      {
        RuleVerbose: 'rule-A',
        DisplayData: 'v1',
        HitCount: 1,
        LatestUpdatedAt: 0,
        SampleTraceIds: ['t1'],
      },
    ])
    const next = buildRuleSummaryList([
      {
        RuleVerbose: 'rule-A',
        DisplayData: 'v1',
        HitCount: 3,
        LatestUpdatedAt: 0,
        SampleTraceIds: ['t2'],
      },
    ])

    expect(mergeRuleSummaryItems(prev, next)[0].TraceCount).toBe(3)
  })
})
