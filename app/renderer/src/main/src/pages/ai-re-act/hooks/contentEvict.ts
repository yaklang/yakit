import type { AIChatQSData } from './aiRender'

/**
 * 空闲会话视窗淘汰：keep 内、或 stageSettled===false 的热数据不删。
 * execute 中整表跳过。
 */
export const collectEvictableContentTokens = (
  contents: Map<string, AIChatQSData>,
  keep: Set<string>,
  execute: boolean,
): string[] => {
  if (execute) return []
  const toEvict: string[] = []
  for (const [token, content] of contents) {
    if (keep.has(token)) continue
    if (content.stageSettled === false) continue
    toEvict.push(token)
  }
  return toEvict
}
