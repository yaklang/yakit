import { describe, expect, it } from 'vitest'
import {
  BROWSER_AUTHORIZATION_ANALYSIS_FORGE,
  BROWSER_AUTHORIZATION_ANALYSIS_TOOLS,
  browserAuthorizationAIStartPolicy,
  browserAuthorizationAnalysisCopy,
  browserAuthorizationDefaultQuery,
  browserAuthorizationVerdictLabel,
} from '../browserAuthorizationPresentation'

describe('browser authorization presentation', () => {
  it('starts the dedicated in-memory authorization Forge without filesystem fallbacks', () => {
    const toolNames: readonly string[] = BROWSER_AUTHORIZATION_ANALYSIS_TOOLS
    expect(BROWSER_AUTHORIZATION_ANALYSIS_FORGE).toBe('browser_authorization_analysis')
    expect(toolNames).toHaveLength(14)
    expect(toolNames).toContain('authorization.evidence.inspect')
    expect(toolNames).toContain('authorization.evidence.validate')
    expect(toolNames).toContain('authorization.review.submit')
    expect(toolNames).toContain('authorization.verdict.reconcile')
    expect(toolNames).not.toContain('authorization.result.inspect')
    expect(toolNames).not.toContain('bash')
    expect(toolNames).not.toContain('read_file')
    expect(browserAuthorizationAIStartPolicy()).toEqual(
      expect.objectContaining({
        ForgeName: 'browser_authorization_analysis',
        EnableSystemFileSystemOperator: false,
        EnableAISearchTool: false,
        IncludeSuggestedToolNames: [...BROWSER_AUTHORIZATION_ANALYSIS_TOOLS],
      }),
    )
  })

  it.each([
    ['horizontal', 'confirmed', '已确认跨身份数据访问'],
    ['horizontal', 'likely', '观察到跨身份响应吻合'],
    ['horizontal', 'protected', '横向交叉访问已阻断'],
    ['horizontal', 'invalid-controls', '水平正常对照无效'],
    ['horizontal', 'inconclusive', '水平结果不可判定'],
    ['vertical', 'confirmed', '已确认低权限操作生效'],
    ['vertical', 'likely', '低权限操作可能被接受'],
    ['vertical', 'protected', '低权限特权操作已阻断'],
    ['vertical', 'invalid-controls', '纵向控制请求无效'],
    ['vertical', 'inconclusive', '纵向结果不可判定'],
  ] as const)('labels %s %s verdict by mode', (mode, verdict, expected) => {
    expect(browserAuthorizationVerdictLabel(mode, verdict)).toBe(expected)
  })

  it('describes the horizontal four-case matrix', () => {
    const copy = browserAuthorizationAnalysisCopy({
      mode: 'horizontal',
      planId: 'plan-horizontal',
      requestBudget: 4,
    })

    expect(copy.query).toContain('固定四项矩阵')
    expect(copy.query).toContain('固定四项授权矩阵')
    expect(copy.query).not.toContain('纵向权限')
    expect(copy.showQS).toBe('分析水平授权矩阵')
  })

  it('describes an exact vertical five-case plan without horizontal copy', () => {
    const copy = browserAuthorizationAnalysisCopy({
      mode: 'vertical',
      planId: 'plan-vertical',
      requestBudget: 5,
    })

    expect(copy.query).toContain('5 项纵向计划')
    expect(copy.query).toContain('后置状态证据')
    expect(copy.query).not.toContain('四项矩阵')
    expect(copy.showQS).toBe('分析纵向权限计划')
  })

  it('keeps an uncompiled vertical workspace budget-neutral', () => {
    const copy = browserAuthorizationAnalysisCopy({ mode: 'vertical' })

    expect(copy.query).toContain('三项或五项纵向计划')
    expect(copy.query).toContain('是否绑定后置状态请求')
    expect(browserAuthorizationDefaultQuery('vertical')).toContain('三项或五项纵向计划')
    expect(browserAuthorizationDefaultQuery('vertical')).toContain('先盲审')
  })

  it('directs horizontal execution analysis to existing evidence without resending', () => {
    const copy = browserAuthorizationAnalysisCopy({
      mode: 'horizontal',
      planId: 'plan-horizontal',
      executionId: 'execution-horizontal',
      requestBudget: 4,
    })

    expect(copy.query).toContain('execution-horizontal')
    expect(copy.query).toContain('Evidence Bundle')
    expect(copy.query).toContain('A→B 与 B-own')
    expect(copy.query).toContain('B→A 与 A-own')
    expect(copy.query).toContain('盲审')
    expect(copy.query).toContain('不可变的独立判断')
    expect(copy.query).toContain('不要重复发送请求')
  })

  it('directs vertical execution analysis to response and post-state evidence', () => {
    const copy = browserAuthorizationAnalysisCopy({
      mode: 'vertical',
      planId: 'plan-vertical',
      executionId: 'execution-vertical',
      requestBudget: 5,
    })

    expect(copy.query).toContain('execution-vertical')
    expect(copy.query).toContain('Evidence Bundle')
    expect(copy.query).toContain('前后状态差异')
    expect(copy.query).toContain('盲审')
    expect(copy.query).toContain('不要重复发送请求')
  })
})
