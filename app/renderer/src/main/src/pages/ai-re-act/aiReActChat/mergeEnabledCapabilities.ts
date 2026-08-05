import type { AIEnabledCapability } from '../hooks/grpcApi'

/** 合并启动能力并按 Type/Name 去重，避免覆盖设置中已有的工具或插件。 */
export const mergeEnabledCapabilities = (
  ...groups: Array<AIEnabledCapability[] | undefined>
): AIEnabledCapability[] => {
  const result: AIEnabledCapability[] = []
  const seen = new Set<string>()

  groups.flat().forEach((capability) => {
    if (!capability?.Name || !capability.Type) return
    const key = `${capability.Type}:${capability.Name}`
    if (seen.has(key)) return
    seen.add(key)
    result.push(capability)
  })

  return result
}
