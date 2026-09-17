import { ipc } from '@/services/ipc'

export const setLocalValue = (k: string, value: unknown) => {
  return ipc.invoke('local', 'set-local-cache', { key: k, value })
}

export const getLocalValue = (k: string) => {
  return ipc.invoke('local', 'fetch-local-cache', k)
}

// 这是从引擎内获取存储
export const getRemoteValue = (k: string) => {
  return ipc.invoke('grpc', 'GetKey', { Key: k }).then((data) => data.Value)
}

export const setRemoteValue = (k: string, v: string) => {
  return ipc.invoke('grpc', 'SetKey', { Key: k, Value: v })
}

export const setRemoteValueTTL = (k: string, v: string, ttl: number) => {
  return ipc.invoke('grpc', 'SetKey', { Key: k, Value: v, TTL: parseInt(`${ttl}`) })
}

// 根据不同项目区分从引擎内获取存储
export const getRemoteProjectValue = (k: string) => {
  return ipc.invoke('grpc', 'GetProjectKey', { Key: k }).then((data) => data.Value)
}

export const setRemoteProjectValue = (k: string, v: string) => {
  return ipc.invoke('grpc', 'SetProjectKey', { Key: k, Value: v })
}

/** 远端存储值是字符串，JSON 对象必须显式解析。 */
export async function getRemoteObject(key: string): Promise<Record<string, unknown>> {
  try {
    const value: unknown = JSON.parse(await getRemoteValue(key))
    if (value && typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>
  } catch {}
  return {}
}
