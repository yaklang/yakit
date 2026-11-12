// Token counts use decimal units; stored values always remain integer tokens.
export const formatContextTokens = (tokens: number) => {
  const kilo = Math.round((tokens / 1000) * 10) / 10
  return kilo >= 1000 ? `${Math.round((tokens / 1_000_000) * 10) / 10}M` : `${kilo}K`
}
