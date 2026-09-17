import { registerMainMethod } from './ipc/index'

import fs from 'node:fs'
import { getLocalCachePath, getExtraLocalCachePath } from './filePath'
type CacheType = 'cache' | 'extraCache'
type CacheEntry = { key: string; value: unknown }
function cacheKey(key: unknown): string {
  if (typeof key !== 'string') throw new Error('Cache key must be a string')
  return key
}
function parseCache(text: string): CacheEntry[] {
  const entries: unknown = JSON.parse(text)
  if (!Array.isArray(entries)) throw new Error('Invalid cache file')
  return entries.filter(
    (entry): entry is CacheEntry => !!entry && typeof entry === 'object' && typeof entry.key === 'string',
  )
}

/** 缓存数据存放变量 */
const kvCache = new Map<string, unknown>()
/** 扩展缓存数据存放变量 */
const extraKVCache = new Map<string, unknown>()

/**
 * 将缓存数据写入本地文件系统内
 * @param {"cache"|"extraCache"} type 缓存数据类型
 * @param {string} value 缓存数据
 */
const syncLocalCacheFile = (type: CacheType, value: string) => {
  const filePath = type === 'cache' ? getLocalCachePath() : getExtraLocalCachePath()

  try {
    fs.unlinkSync(filePath)
  } catch (e) {
    console.info(`unlinkSync${type === 'extraCache' ? ' extra' : ''} local cache failed: ${e}`, e)
  }
  fs.writeFileSync(filePath, Buffer.from(value, 'utf8'))
}

const localCacheState = {
  cacheChanged: false,
  extraCacheChanged: false,
  cacheInitialized: false,
  extraCacheInitialized: false,
  writingFile: false,
}
function getLocalCacheValue(key: string) {
  return kvCache.get(key)
}
function getExtraLocalCacheValue(key: string) {
  return extraKVCache.get(key)
}
function setLocalCache(key: string, value: unknown) {
  if (value === kvCache.get(key)) {
    return
  }
  kvCache.set(key, value)
  localCacheState.cacheChanged = true
}
function deleteLocalCache(key: string) {
  if (!kvCache.has(key)) {
    return
  }
  kvCache.delete(key)
  localCacheState.cacheChanged = true
}
function setExtraLocalCache(key: string, value: unknown) {
  if (value === extraKVCache.get(key)) {
    return
  }
  extraKVCache.set(key, value)
  localCacheState.extraCacheChanged = true
}
/**
 * 退出时的缓存
 */
function setCloeseExtraLocalCache(key: string, value: unknown) {
  extraKVCache.set(key, value)
  return new Promise<void>((resolve, reject) => {
    try {
      localCacheState.writingFile = true
      const cache = extraKVCache
      const value: CacheEntry[] = []
      cache.forEach((v, k) => {
        value.push({ key: k, value: v })
      })
      value.sort((a, b) => `${a.key}`.localeCompare(`${b.key}`))
      syncLocalCacheFile('extraCache', JSON.stringify(value))
    } catch (e) {
      console.info(e)
    } finally {
      localCacheState.writingFile = false
      resolve()
    }
  })
}
/**
 * 写操作定时器
 * @param {"cache"|"extraCache"} type
 */
const writeTimer = (type: CacheType) => {
  if (type === 'cache') {
    if (!localCacheState.cacheChanged) {
      return
    } else {
      localCacheState.cacheChanged = false
    }
  } else if (type === 'extraCache') {
    if (!localCacheState.extraCacheChanged) {
      return
    } else {
      localCacheState.extraCacheChanged = false
    }
  }
  syncCacheToFile(type)
}

/** 获取缓存数据 */
const initLocalCache = (callback?: () => void) => {
  if (localCacheState.cacheInitialized) {
    return
  }
  localCacheState.cacheInitialized = true

  kvCache.clear()
  kvCache.set('*description*', '该文件内缓存数据如需手动修改，请在关闭 Yakit 之后进行操作')

  try {
    /** 处理文件不存在的情况 */
    if (fs.existsSync(getLocalCachePath())) {
      const data = fs.readFileSync(getLocalCachePath())

      /** 预防用户直接删除文件内的数据，从而导致的JSON处理异常 */
      const cache = data.toString() ? data.toString() : `[]`
      parseCache(cache).forEach((i) => {
        if (i['key']) {
          kvCache.set(i['key'], i['value'])
        }
      })
    }
    if (callback) callback()
  } catch (e) {
    console.info('读取本地缓存数据错误', e)
  } finally {
    setInterval(() => writeTimer('cache'), 3000)
  }
}
/** 获取扩展缓存数据 */
const initExtraLocalCache = (callback?: () => void) => {
  if (localCacheState.extraCacheInitialized) {
    return
  }
  localCacheState.extraCacheInitialized = true

  extraKVCache.clear()
  kvCache.set('*description*', '该文件内缓存数据如需手动修改，请在关闭 Yakit 之后进行操作')

  try {
    if (fs.existsSync(getExtraLocalCachePath())) {
      const data = fs.readFileSync(getExtraLocalCachePath())
      if (!data) {
        console.info('Extra Local Cache Empty!')
      }

      /** 预防用户直接删除文件内的数据，从而导致的JSON处理异常 */
      const cache = data.toString() ? data.toString() : `[]`
      parseCache(cache).forEach((i) => {
        if (i['key']) {
          extraKVCache.set(i['key'], i['value'])
        }
      })
    }
    if (callback) callback()
  } catch (e) {
    console.info('读取本地扩展缓存数据错误', e)
  } finally {
    setInterval(() => writeTimer('extraCache'), 3000)
  }
}

/**
 * 强制进行写操作
 * @param {"cache"|"extraCache"} type 缓存数据类型
 */
const syncCacheToFile = (type: CacheType, propagateError = false) => {
  try {
    localCacheState.writingFile = true
    const cache = type === 'cache' ? kvCache : extraKVCache

    const value: CacheEntry[] = []
    cache.forEach((v, k) => {
      value.push({ key: k, value: v })
    })
    value.sort((a, b) => `${a.key}`.localeCompare(`${b.key}`))
    syncLocalCacheFile(type, JSON.stringify(value))
  } catch (e) {
    if (propagateError) throw e
    console.info(e)
  } finally {
    localCacheState.writingFile = false
  }
}

export function registerCache() {
  const shared = ['main', 'link'] as const
  registerMainMethod('fetch-local-cache', (key) => getLocalCacheValue(cacheKey(key)), shared)
  registerMainMethod('set-local-cache', ({ key, value }) => setLocalCache(cacheKey(key), value), shared)
  registerMainMethod('manual-write-file', (type) => {
    if (type !== 'cache' && type !== 'extraCache') throw new Error('Invalid cache type')
    syncCacheToFile(type, true)
  })
  registerMainMethod('fetch-extra-cache', (key) => getExtraLocalCacheValue(cacheKey(key)))
  registerMainMethod('set-extra-cache', ({ key, value }) => setExtraLocalCache(cacheKey(key), value))
}

export {
  getExtraLocalCacheValue,
  setExtraLocalCache,
  setCloeseExtraLocalCache,
  getLocalCacheValue,
  setLocalCache,
  deleteLocalCache,
  initLocalCache,
  initExtraLocalCache,
}
