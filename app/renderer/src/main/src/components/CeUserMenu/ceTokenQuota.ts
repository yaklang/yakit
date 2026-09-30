export type TokenQuotaLike = {
  tokenUsed?: number
  tokenLimit?: number
  tokenLimitEnable?: boolean
}

/** 计算 token 使用百分比 */
export const getTokenPercent = (apiKeysInfo: TokenQuotaLike) => {
  const { tokenUsed = 0, tokenLimit = 0 } = apiKeysInfo || {}
  if (tokenUsed > 0 && tokenLimit > 0) {
    return Math.min(100, Math.floor((tokenUsed / tokenLimit) * 100))
  }
  return 0
}

/** 计算 token 限额（单位：M） */
export const getTokenLimit = (apiKeysInfo: TokenQuotaLike) => {
  if (apiKeysInfo?.tokenLimit && apiKeysInfo.tokenLimit > 0) {
    return Math.round(apiKeysInfo.tokenLimit / 1000 / 1000)
  }
  return 0
}

/** 计算已用 token（单位：M） */
export const getTokenUsed = (apiKeysInfo: TokenQuotaLike) => {
  if (apiKeysInfo?.tokenUsed && apiKeysInfo.tokenUsed > 0) {
    return (apiKeysInfo.tokenUsed / 1000 / 1000).toFixed(2)
  }
  return 0
}

/** 余额（元）：1 元 = 10M Token */
export const getBalanceYuanText = (apiKeysInfo: TokenQuotaLike) => {
  const tokenUsed = getTokenUsed(apiKeysInfo)
  const tokenLimit = getTokenLimit(apiKeysInfo)
  const usedNum = typeof tokenUsed === 'number' ? tokenUsed : Number(tokenUsed)
  const tokenBalanceM = Math.max(0, tokenLimit - (Number.isFinite(usedNum) ? usedNum : 0))
  const yuan = Math.round((tokenBalanceM / 10) * 100) / 100
  return Number.isInteger(yuan) ? String(yuan) : yuan.toFixed(2).replace(/\.?0+$/, '')
}

/** 计算剩余 token（单位：M） */
export const getTokenRemaining = (apiKeysInfo: TokenQuotaLike) => {
  const tokenUsed = getTokenUsed(apiKeysInfo)
  const tokenLimit = getTokenLimit(apiKeysInfo)
  const usedNum = typeof tokenUsed === 'number' ? tokenUsed : Number(tokenUsed)
  const remaining = Math.max(0, tokenLimit - (Number.isFinite(usedNum) ? usedNum : 0))
  // 与 getTokenUsed 一致：有小数时保留两位
  if (Number.isInteger(remaining)) return remaining
  return remaining.toFixed(2)
}

/** 计算 token 剩余百分比 */
export const getTokenRemainingPercent = (apiKeysInfo: TokenQuotaLike) => {
  const tokenLimit = getTokenLimit(apiKeysInfo)
  if (!(tokenLimit > 0)) return 0
  const tokenUsed = getTokenUsed(apiKeysInfo)
  const usedNum = typeof tokenUsed === 'number' ? tokenUsed : Number(tokenUsed)
  const remaining = Math.max(0, tokenLimit - (Number.isFinite(usedNum) ? usedNum : 0))
  return Math.min(100, Math.max(0, (remaining / tokenLimit) * 100))
}
