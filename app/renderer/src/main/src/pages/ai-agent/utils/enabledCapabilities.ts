import type { AIEnabledCapability } from '@/pages/ai-re-act/hooks/grpcApi'

/** 按 Type+Name 去重并保留首次出现顺序，避免不同能力类型的同名项互相覆盖。 */
export const mergeAIEnabledCapabilities = (
  ...groups: Array<AIEnabledCapability[] | undefined>
): AIEnabledCapability[] => {
  const result: AIEnabledCapability[] = []
  const seen = new Set<string>()

  groups
    .flatMap((group) => group || [])
    .forEach((capability) => {
      const name = capability.Name?.trim()
      const type = capability.Type?.trim()
      if (!name || !type) return

      const identity = `${type}:${name}`
      if (seen.has(identity)) return
      seen.add(identity)
      result.push({ Name: name, Type: type })
    })

  return result
}
