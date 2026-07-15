import { getRemoteValue, setRemoteValue } from '@/utils/kv'
import { RemoteGV } from '@/yakitGV'

type Item = { count: number; lastUsedAt: number; id: number; headImg: string }
type Cache = Record<string, Item>

export const getPluginUsageCache = async (): Promise<Cache> => {
  try {
    const raw = await getRemoteValue(RemoteGV.PluginUsageRecords)
    return raw ? (JSON.parse(raw) as Cache) : {}
  } catch {
    return {}
  }
}

export const recordPluginUsage = async (name: string, extra: { id: number; headImg: string }) => {
  // name.startsWith('Get*') 属于下载插件
  if (!name || name.startsWith('Get*')) return
  const data = await getPluginUsageCache()
  const prev = data[name]
  data[name] = {
    count: (prev?.count || 0) + 1,
    lastUsedAt: Date.now(),
    id: extra.id,
    headImg: extra.headImg,
  }
  await setRemoteValue(RemoteGV.PluginUsageRecords, JSON.stringify(data))
}

export const sortPluginsByUsage = <T extends { ScriptName: string }>(list: T[], usage: Cache) => {
  if (!Object.keys(usage).length) return list
  return [...list].sort((a, b) => (usage[b.ScriptName]?.count || 0) - (usage[a.ScriptName]?.count || 0))
}
