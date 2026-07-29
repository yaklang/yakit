import { yakitCache } from './electronBridge'

export const setLocalValue = (k: string, value: any) => {
  yakitCache.setLocalCache(k, value).then(() => {})
}

export const getLocalValue = (k: string) => {
  return yakitCache.getLocalCache(k)
}

// 这是从引擎内获取存储
export const getRemoteValue = (k: string) => {
  return yakitCache.getRemoteKey(k)
}

export const setRemoteValue = (k: string, v: string) => {
  return yakitCache.setRemoteKey(k, v)
}

export const setRemoteValueTTL = (k: string, v: string, ttl: number) => {
  return yakitCache.setRemoteKeyWithTTL(k, v, parseInt(`${ttl}`))
}
