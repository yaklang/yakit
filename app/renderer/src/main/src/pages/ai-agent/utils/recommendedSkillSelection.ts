import type { AIReActRecommendedSkill } from '@/pages/ai-re-act/hooks/grpcApi'

interface CachedRecommendedSkill {
  Name: string
  Type: string
}

const capabilityKey = ({ Type, Name }: CachedRecommendedSkill) => `${Type}:${Name}`

export const serializeRecommendedSkillSelection = (skills: AIReActRecommendedSkill[]): string => {
  return JSON.stringify(skills.map(({ Name, Type }) => ({ Name, Type })))
}

/** 从持久缓存恢复仍在后端推荐列表中的 Skill；首次使用默认选择第一项。 */
export const restoreRecommendedSkillSelection = (
  availableSkills: AIReActRecommendedSkill[],
  cachedValue: string,
): AIReActRecommendedSkill[] => {
  if (!cachedValue) return availableSkills.slice(0, 1)

  try {
    const cached = JSON.parse(cachedValue)
    if (!Array.isArray(cached)) return availableSkills.slice(0, 1)
    if (cached.length === 0) return []

    const cachedKeys = new Set(
      cached
        .filter(
          (item): item is CachedRecommendedSkill =>
            typeof item?.Name === 'string' &&
            !!item.Name.trim() &&
            typeof item?.Type === 'string' &&
            !!item.Type.trim(),
        )
        .map(capabilityKey),
    )
    const restored = availableSkills.filter((skill) => cachedKeys.has(capabilityKey(skill)))
    return restored.length > 0 ? restored : availableSkills.slice(0, 1)
  } catch {
    return availableSkills.slice(0, 1)
  }
}
