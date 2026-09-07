type KnowledgeTableIdentityRecord = {
  ID: unknown
  HiddenIndex: unknown
}

type KnowledgeTableIdentityIssue = 'INVALID_HIDDEN_INDEX' | 'DUPLICATE_HIDDEN_INDEX' | 'DUPLICATE_INTERACTION_ID'

export const KNOWLEDGE_TABLE_IDENTITY_DRIFT_STATUS = 'UNVERIFIED' as const

export interface KnowledgeTableIdentitySnapshot<T extends KnowledgeTableIdentityRecord> {
  driftStatus: typeof KNOWLEDGE_TABLE_IDENTITY_DRIFT_STATUS
  getIssues: (record: T) => readonly KnowledgeTableIdentityIssue[]
  getReactKey: (record: T, index: number) => string
  isAmbiguous: (record: T) => boolean
}

const isValidHiddenIndex = (hiddenIndex: unknown): hiddenIndex is string =>
  typeof hiddenIndex === 'string' && hiddenIndex.trim().length > 0

export const validateKnowledgeTableIdentitySnapshot = <T extends KnowledgeTableIdentityRecord>(
  records: readonly T[],
): KnowledgeTableIdentitySnapshot<T> => {
  const hiddenIndexCounts = new Map<string, number>()
  const interactionIdCounts = new Map<unknown, number>()

  records.forEach((record) => {
    if (isValidHiddenIndex(record.HiddenIndex)) {
      hiddenIndexCounts.set(record.HiddenIndex, (hiddenIndexCounts.get(record.HiddenIndex) ?? 0) + 1)
    }
    interactionIdCounts.set(record.ID, (interactionIdCounts.get(record.ID) ?? 0) + 1)
  })

  const getIssues = (record: T): readonly KnowledgeTableIdentityIssue[] => {
    const issues: KnowledgeTableIdentityIssue[] = []
    if (!isValidHiddenIndex(record.HiddenIndex)) {
      issues.push('INVALID_HIDDEN_INDEX')
    } else if ((hiddenIndexCounts.get(record.HiddenIndex) ?? 0) > 1) {
      issues.push('DUPLICATE_HIDDEN_INDEX')
    }
    if ((interactionIdCounts.get(record.ID) ?? 0) > 1) {
      issues.push('DUPLICATE_INTERACTION_ID')
    }
    return issues
  }

  return {
    driftStatus: KNOWLEDGE_TABLE_IDENTITY_DRIFT_STATUS,
    getIssues,
    getReactKey: (record, index) => {
      if (isValidHiddenIndex(record.HiddenIndex) && (hiddenIndexCounts.get(record.HiddenIndex) ?? 0) === 1) {
        return record.HiddenIndex
      }
      return `knowledge-table-identity-diagnostic-${index}`
    },
    isAmbiguous: (record) => getIssues(record).length > 0,
  }
}
