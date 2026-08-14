const { ipcRenderer } = window.require('electron')

/** 脱敏展示 ApiKey */
export const maskApiKey = (apiKey: string) => {
  if (!apiKey) return ''
  if (apiKey.length <= 8) return apiKey
  return `${apiKey.slice(0, 4)}...${apiKey.slice(-4)}`
}

/** 将指定 ApiKey 写入本地引擎 */
export const grpcUpdateApiKey = (apiKey: string) => {
  return ipcRenderer.invoke('UpdateApiKey', { ApiKey: apiKey })
}
