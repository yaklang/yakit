import type { MaterialSummaryGroup } from './materialSummary/type'

/**
 * 构建紧凑布局的资料标签。调用方在开启 Goal 或子 Agent 时传入 mergeCategories=true，
 * 将技能和知识库作为「其他资料」的子分类。渲染层发现这些子分类时才显示「资料」文案。
 */
export const groupNarrowMaterials = (
  groups: MaterialSummaryGroup[],
  otherLabel: string,
  otherTitle: string,
  mergeCategories = true,
): MaterialSummaryGroup[] => {
  if (!groups.length) return groups
  if (!mergeCategories) {
    // 保留独立标签，仅将「其他资料」的删除入口移到弹层内的分类行。
    return groups.map((group) =>
      group.key === 'other' ? { ...group, allowCategoryRemoval: true, onRemove: undefined } : group,
    )
  }
  const categories = groups.filter((group) => group.key === 'forge' || group.key === 'knowledgeBase')
  const other = groups.find((group) => group.key === 'other')
  return [
    {
      ...other,
      allowCategoryRemoval: true,
      onRemove: undefined,
      key: 'other',
      label: otherLabel,
      title: otherTitle,
      // 累加各分类已有的资料数量；只有技能或知识库时，「其他资料」的起始数量为 0。
      count: categories.reduce((total, group) => total + group.count, other?.count ?? 0),
      rows: [
        ...categories.map((group) => ({
          key: group.key,
          name: group.label,
          icon: group.icon,
          count: group.count,
          // 点击分类行可展开原分组；行内 × 复用该分组的删除回调，只清除该类可移除的资料。
          group,
          onClearCategory: group.onRemove,
        })),
        ...(other?.rows ?? []),
      ],
    },
  ]
}
