import type { Risk } from '../schema'

export const isShowCodeScanDetail = (selectItem: Risk) => {
  const { ResultID, SyntaxFlowVariable, ProgramName } = selectItem
  if (ResultID && SyntaxFlowVariable && ProgramName) {
    return true
  }
  return false
}
