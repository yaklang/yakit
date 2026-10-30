import { describe, expect, it } from 'vitest'
import type { HTTPFlow } from '../HTTPFlowTable.constants'
import { mergeHTTPFlowDetailMark, resolveHTTPFlowMarkScope } from '../HTTPFlowMark.helpers'

describe('resolveHTTPFlowMarkScope', () => {
  it('uses explicit ids only for a partial selection', () => {
    const filter = { Keyword: 'example.com' }

    expect(resolveHTTPFlowMarkScope(false, [1, 2], filter)).toEqual({ ids: [1, 2], filter })
  })

  it('uses the current filter only for select-all', () => {
    const filter = { Keyword: 'example.com' }

    expect(resolveHTTPFlowMarkScope(true, [1, 2], filter)).toEqual({ ids: [], filter })
  })

  it('freezes explicit ids and filter values when opening the form', () => {
    const ids = [1, 2]
    const filter = { Keyword: 'example.com', Pagination: { Page: 1, Limit: 20 } }
    const scope = resolveHTTPFlowMarkScope(false, ids, filter)

    ids.push(3)
    filter.Keyword = 'changed.example.com'
    filter.Pagination.Page = 2

    expect(scope).toEqual({
      ids: [1, 2],
      filter: { Keyword: 'example.com', Pagination: { Page: 1, Limit: 20 } },
    })
  })
})

describe('mergeHTTPFlowDetailMark', () => {
  it('updates mark fields when the same selected flow receives new props', () => {
    const current = {
      Id: 7,
      RequestString: 'complete request',
      IssueType: 'SQL注入',
      Severity: '低危',
      Status: '待修复',
      StatusReason: 'old note',
    } as HTTPFlow
    const incoming = {
      Id: 7,
      IssueType: 'XSS',
      Severity: '高危',
      Status: '已修复',
      StatusReason: 'new note',
    } as HTTPFlow

    expect(mergeHTTPFlowDetailMark(current, incoming)).toEqual({
      ...current,
      IssueType: 'XSS',
      Severity: '高危',
      Status: '已修复',
      StatusReason: 'new note',
    })
  })

  it('preserves detail state for a different flow id', () => {
    const current = { Id: 7, IssueType: 'SQL注入' } as HTTPFlow
    const incoming = { Id: 8, IssueType: 'XSS' } as HTTPFlow

    expect(mergeHTTPFlowDetailMark(current, incoming)).toBe(current)
  })
})
