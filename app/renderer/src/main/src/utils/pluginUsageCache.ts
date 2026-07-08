import { getRemoteValue, setRemoteValue } from '@/utils/kv'
import { RemoteGV } from '@/yakitGV'

type Item = { count: number; lastUsedAt: number; id?: number; headImg?: string }
type Cache = Record<string, Item>
const { ipcRenderer } = window.require('electron')

export const getPluginUsageCache = async (): Promise<Cache> => {
  try {
    const raw = await getRemoteValue(RemoteGV.PluginUsageRecords)
    return raw ? (JSON.parse(raw) as Cache) : {}
  } catch {
    return {}
  }
}

export const recordPluginUsage = async (name: string, extra?: Pick<Item, 'id' | 'headImg'>) => {
  // name.startsWith('Get*') 属于下载插件
  if (!name || name.startsWith('Get*')) return
  const data = await getPluginUsageCache()
  const prev = data[name] || { count: 0, lastUsedAt: 0 }
  let detail = { id: extra?.id ?? prev.id, headImg: extra?.headImg ?? prev.headImg }
  if (!detail.id || !detail.headImg) {
    try {
      const res = await ipcRenderer.invoke('QueryYakScriptByNames', { YakScriptName: [name] })
      const script = (res?.Data || [])[0]
      if (script) {
        detail = {
          id: detail.id || script.Id,
          headImg: detail.headImg || script.HeadImg,
        }
      }
    } catch {}
  }
  data[name] = {
    count: prev.count + 1,
    lastUsedAt: Date.now(),
    id: detail.id,
    headImg: detail.headImg,
  }
  await setRemoteValue(RemoteGV.PluginUsageRecords, JSON.stringify(data))
}

export const sortPluginsByUsage = <T extends { ScriptName: string }>(list: T[], usage: Cache) => {
  if (!Object.keys(usage).length) return list
  return [...list].sort((a, b) => (usage[b.ScriptName]?.count || 0) - (usage[a.ScriptName]?.count || 0))
}
