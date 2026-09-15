import type { Risk } from '../schema'

export const getDiscoveryTimeColumnFixed = (excludeColumnsKey: string[]): 'right' | undefined => {
  return excludeColumnsKey.includes('action') ? undefined : 'right'
}

export const isShowCodeScanDetail = (selectItem: Risk) => {
  const { ResultID, SyntaxFlowVariable, ProgramName } = selectItem
  if (ResultID && SyntaxFlowVariable && ProgramName) {
    return true
  }
  return false
}
