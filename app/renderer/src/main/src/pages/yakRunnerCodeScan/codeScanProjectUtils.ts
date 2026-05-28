import { CodeScanPageInfoProps } from '@/store/pageInfo'
import { getGroupNamesTotal } from './utils'

/** Map SSA project language to syntaxflow rule group names shown in code scan UI. */
export const codeScanLanguageToGroupNames = (language?: string): string[] => {
  const key = (language || '').trim().toLowerCase()
  if (!key) {
    return ['general']
  }
  const map: Record<string, string[]> = {
    golang: ['golang', 'general'],
    go: ['golang', 'general'],
    java: ['java', 'general'],
    php: ['php', 'general'],
    python: ['python', 'general'],
    py: ['python', 'general'],
    js: ['js', 'general'],
    javascript: ['js', 'general'],
    ts: ['ts', 'general'],
    typescript: ['ts', 'general'],
    yak: ['yak', 'general'],
    yaklang: ['yak', 'general'],
    c: ['c', 'general'],
    general: ['general'],
  }
  const groups = map[key]
  if (groups) {
    return [...new Set(groups)]
  }
  return [...new Set([key, 'general'])]
}

export const applyCodeScanRuleGroupsByLanguage = async (
  language: string | undefined,
  prev: CodeScanPageInfoProps,
  setPageInfo: (v: CodeScanPageInfoProps) => void,
): Promise<void> => {
  const groupNames = codeScanLanguageToGroupNames(language)
  const selectTotal = await getGroupNamesTotal({ GroupNames: groupNames, Purpose: prev.Purpose })
  setPageInfo({
    ...prev,
    GroupNames: groupNames,
    Keyword: '',
    FilterLibRuleKind: '',
    RuleIds: [],
    selectTotal,
  })
}
