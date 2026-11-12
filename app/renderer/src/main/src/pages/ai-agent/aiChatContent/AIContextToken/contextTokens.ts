export const formatContextTokens = (tokens: number) =>
  tokens >= 1000 * 1024
    ? `${Math.round((tokens / (1000 * 1024)) * 10) / 10}M`
    : `${Math.round((tokens / 1024) * 10) / 10}K`
