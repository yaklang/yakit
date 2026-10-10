import type { FieldName, FieldNameSelectItem, Fields } from './RiskTable'

export const getRiskFieldLabel = (field: Pick<FieldName, 'Name' | 'Verbose'>): string =>
  field.Verbose?.trim() || field.Name?.trim() || ''

/** 同名展示项合并计数，缺失展示名时按原始名称分别保留。 */
export const mergeFieldNames = (fields: Fields): FieldNameSelectItem[] => {
  const groups = new Map<string, FieldNameSelectItem>()
  for (const field of fields.Values || []) {
    const label = getRiskFieldLabel(field)
    if (!label) continue
    const existing = groups.get(label)
    if (existing) {
      existing.Total += field.Total
      existing.Names.push(field.Name)
      existing.Names.sort()
    } else {
      groups.set(label, { Total: field.Total, Verbose: label, Names: [field.Name] })
    }
  }
  return [...groups.values()]
}
