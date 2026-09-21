/** 在消息和资源读入时，将旧字符串或数组统一为去重后的 ID 数组。 */
export const parseHttpFlowIds = (value: string | string[] = []): string[] => {
  const ids = typeof value === 'string' ? value.split(',') : value
  return [...new Set(ids.map((id) => id.trim()).filter(Boolean))]
}
