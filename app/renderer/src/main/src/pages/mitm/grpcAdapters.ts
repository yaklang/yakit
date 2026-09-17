import type { GrpcOutput } from '@/services/ipc'
import { int64ToSafeNumber } from '@/utils/int64'
import type { MITMContentReplacerRule } from './MITMRule/MITMRuleType'

export function mitmRuleForUI(value: GrpcOutput<'GetCurrentRules'>['Rules'][number]): MITMContentReplacerRule {
  return {
    ...value,
    Id: value.Index,
    RegexpGroups: value.RegexpGroups.map(int64ToSafeNumber),
    ExtraCookies: value.ExtraCookies.map((cookie) => ({
      ...cookie,
      Expires: int64ToSafeNumber(cookie.Expires),
      MaxAge: int64ToSafeNumber(cookie.MaxAge),
      SameSiteMode:
        cookie.SameSiteMode === 'strict'
          ? 'strict'
          : cookie.SameSiteMode === 'lax'
            ? 'lax'
            : cookie.SameSiteMode === 'none'
              ? 'none'
              : 'default',
    })),
  }
}

export function mitmRulesForUI(value: GrpcOutput<'GetCurrentRules'>) {
  return { ...value, Rules: value.Rules.map(mitmRuleForUI) }
}

export function queriedMitmRulesForUI(value: GrpcOutput<'QueryMITMReplacerRules'>) {
  return { ...value, Rules: { Rules: (value.Rules?.Rules ?? []).map(mitmRuleForUI) } }
}

export function mitmFilterForUI(
  value: GrpcOutput<'GetMITMFilter'>['FilterData'],
): import('./MITMServerStartForm/MITMFilters').MITMFilterData {
  const project = (
    items: NonNullable<typeof value>['IncludeHostnames'] = [],
  ): import('./MITMServerStartForm/MITMFilters').FilterDataItem[] =>
    items.map((item) => {
      const MatcherType = item.MatcherType
      if (
        MatcherType !== 'word' &&
        MatcherType !== 'regexp' &&
        MatcherType !== 'glob' &&
        MatcherType !== 'mime' &&
        MatcherType !== 'suffix'
      )
        throw new Error(`Unknown MITM filter matcher: ${MatcherType}`)
      return { ...item, MatcherType }
    })
  return {
    IncludeHostnames: project(value?.IncludeHostnames),
    ExcludeHostnames: project(value?.ExcludeHostnames),
    IncludeSuffix: project(value?.IncludeSuffix),
    ExcludeSuffix: project(value?.ExcludeSuffix),
    IncludeUri: project(value?.IncludeUri),
    ExcludeUri: project(value?.ExcludeUri),
    ExcludeMethods: project(value?.ExcludeMethods),
    ExcludeMIME: project(value?.ExcludeMIME),
    FilterBundledStaticJS: value?.FilterBundledStaticJS ?? false,
  }
}

function traceForUI(value: GrpcOutput<'MITM'>['traceInfo']): import('./MITMPage').TraceInfo {
  return {
    AvailableDNSServers: value?.AvailableDNSServers ?? [],
    DurationMs: int64ToSafeNumber(value?.DurationMs ?? '0'),
    DNSDurationMs: int64ToSafeNumber(value?.DNSDurationMs ?? '0'),
    ConnDurationMs: int64ToSafeNumber(value?.ConnDurationMs ?? '0'),
    TotalDurationMs: int64ToSafeNumber(value?.TotalDurationMs ?? '0'),
  }
}

export function mitmHijackedForUI(
  value: GrpcOutput<'MITM'> | GrpcOutput<'MITMV2'>,
): import('./MITMHacker/utils').ClientMITMHijackedResponse {
  if ('request' in value)
    return {
      ...value,
      FilterData: mitmFilterForUI(value.FilterData),
      replacers: value.replacers.map(mitmRuleForUI),
      traceInfo: traceForUI(value.traceInfo),
    }
  const action = value.ManualHijackListAction
  if (action !== 'add' && action !== 'delete' && action !== 'update' && action !== 'reload')
    throw new Error(`Unknown MITM hijack action: ${action}`)
  return {
    ...value,
    ManualHijackListAction: action,
    FilterData: mitmFilterForUI(value.FilterData),
    Replacers: value.Replacers.map(mitmRuleForUI),
    ManualHijackList: value.ManualHijackList.map((item) => {
      const Status = item.Status
      if (
        Status !== 'hijacking request' &&
        Status !== 'hijacking response' &&
        Status !== 'wait hijack' &&
        Status !== 'hijacking ws'
      )
        throw new Error(`Unknown MITM hijack status: ${Status}`)
      return { ...item, Status, manualHijackListAction: action, TraceInfo: traceForUI(item.TraceInfo) }
    }),
  }
}
