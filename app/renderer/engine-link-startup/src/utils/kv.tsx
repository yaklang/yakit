import { ipc } from '../services/ipc'

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
  return ipc.invoke('grpc', 'SetKey', { Key: k, Value: v, TTL: ttl })
}
