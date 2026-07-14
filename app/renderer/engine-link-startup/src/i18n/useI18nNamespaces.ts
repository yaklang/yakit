import { useCallback, useEffect, useMemo, useRef, useSyncExternalStore } from 'react'
import { useMemoizedFn } from 'ahooks'
import { useTranslation } from 'react-i18next'
import i18nInstance from './i18n'
import { I18nNamespace } from './namespaces'

export type Lange = 'zh' | 'zh-TW' | 'en'
const SUPPORTED_LANGS: Lange[] = ['zh', 'zh-TW', 'en']
export const normalizeLang = (lang?: Lange): Lange => {
  return SUPPORTED_LANGS.includes(lang) ? lang : 'zh'
}

export type TFunction = (key: string, options?: any) => any

/** 命名空间加载完成后，合并通知的防抖间隔（ms） */
const NS_REFRESH_DEBOUNCE_MS = 500

/**
 * useI18nNamespaces
 *
 * 在 react-i18next 之上补两件事：
 * 1. 按需加载缺失的 namespace（多组件共用时全局去重）
 * 2. 提供 i18nRefresh，供表格列 / key={i18nRefresh} 等「缓存了文案」的场景主动失效
 *
 * i18nRefresh 刷新策略：
 * - 语言真正切换 → langVersion +1 → 所有 hook 的 snapshot 变化 → 全量刷新
 * - 某 ns 加载完成 → 只抬该 ns 的 version → 仅订阅了该 ns 的组件重渲
 *
 */

// ---------------------------------------------------------------------------
// i18nRefresh 外部 store（模块单例）
// ---------------------------------------------------------------------------

let langVersion = 0
/** 上一次已用于 bump 的语言，用于忽略同语言的 languageChanged */
let lastEmittedLang = i18nInstance.language || ''
const nsVersions: Record<string, number> = {}
const refreshListeners = new Set<() => void>()

let nsRefreshTimer: ReturnType<typeof setTimeout> | null = null
/** 防抖窗口内待合并抬升的 namespace */
const pendingNs = new Set<string>()

function emitRefresh() {
  refreshListeners.forEach((listener) => listener())
}

function subscribeRefresh(listener: () => void) {
  refreshListeners.add(listener)
  return () => {
    refreshListeners.delete(listener)
  }
}

/**
 * 生成当前 hook 实例的 refresh snapshot。
 * useSyncExternalStore 会在通知后对比 snapshot：未订阅到变化的 ns 时字符串不变 → 跳过重渲。
 */
function getRefreshSnapshot(namespaces: I18nNamespace[]) {
  const nsPart = [...namespaces]
    .sort()
    .map((ns) => `${ns}:${nsVersions[ns] || 0}`)
    .join('|')
  return `${langVersion}#${nsPart}`
}

/** 某 ns 资源就绪：防抖合并后抬 nsVersions，再通知订阅者 */
function scheduleNamespaceRefresh(ns: I18nNamespace) {
  pendingNs.add(ns)
  if (nsRefreshTimer) clearTimeout(nsRefreshTimer)
  nsRefreshTimer = setTimeout(() => {
    nsRefreshTimer = null
    const namespaces = Array.from(pendingNs)
    pendingNs.clear()
    namespaces.forEach((name) => {
      nsVersions[name] = (nsVersions[name] || 0) + 1
    })
    emitRefresh()
  }, NS_REFRESH_DEBOUNCE_MS)
}

/**
 * 语言真正切换时才抬 langVersion。
 * 启动时常见两次 languageChanged：init(lng) + UILayout changeLanguage(savedLang)，
 * 若 savedLang 与 init 相同，第二次必须忽略。
 */
function bumpLangVersion(lng: string) {
  if (!lng || lng === lastEmittedLang) return

  if (nsRefreshTimer) {
    clearTimeout(nsRefreshTimer)
    nsRefreshTimer = null
  }
  pendingNs.clear()

  lastEmittedLang = lng
  langVersion += 1
  emitRefresh()
}

// 模块级只绑定一次（含 HMR 防护）
const LANG_REFRESH_BOUND_KEY = '__yakitI18nRefreshBound'
if (!(i18nInstance as any)[LANG_REFRESH_BOUND_KEY]) {
  ;(i18nInstance as any)[LANG_REFRESH_BOUND_KEY] = true
  lastEmittedLang = i18nInstance.language || lastEmittedLang
  i18nInstance.on('languageChanged', bumpLangVersion)
}

// ---------------------------------------------------------------------------
// namespace 加载（全局按 lng::ns 去重）
// ---------------------------------------------------------------------------

const pendingLoads = new Map<string, Promise<void>>()

function loadNamespaceOnce(lng: string, ns: I18nNamespace) {
  if (i18nInstance.hasResourceBundle(lng, ns)) {
    return Promise.resolve()
  }

  const cacheKey = `${lng}::${ns}`
  // 如果正在加载中，返回现有的 Promise
  const inflight = pendingLoads.get(cacheKey)
  if (inflight) return inflight

  const task = i18nInstance
    .loadNamespaces(ns)
    .then(() => {
      if (i18nInstance.hasResourceBundle(lng, ns)) {
        scheduleNamespaceRefresh(ns)
      }
    })
    .finally(() => {
      pendingLoads.delete(cacheKey)
    })

  pendingLoads.set(cacheKey, task)
  return task
}

// ---------------------------------------------------------------------------
// hooks
// ---------------------------------------------------------------------------

/** 订阅与本 hook namespaces 相关的 i18nRefresh */
function useScopedI18nRefresh(namespaces: I18nNamespace[]) {
  const nsRef = useRef(namespaces)
  nsRef.current = namespaces

  const getSnapshot = useCallback(() => getRefreshSnapshot(nsRef.current), [])

  return useSyncExternalStore(subscribeRefresh, getSnapshot)
}

/**
 * @param namespaces 本组件需要的 i18n 命名空间
 * @returns
 * - t: 翻译函数（miss 时会尝试补加载）
 * - i18n: i18next 实例
 * - isAllReady: 当前语言下 namespaces 是否都已加载
 * - i18nRefresh: 变化时需重算「缓存了文案」的派生数据（列配置、menu 等）
 */
export function useI18nNamespaces(namespaces: I18nNamespace[]) {
  const { i18n } = useTranslation(namespaces)
  const i18nRefresh = useScopedI18nRefresh(namespaces)

  // 使用 ref 跟踪是否已经触发过加载，避免重复触发
  const loadTriggeredRef = useRef<Set<string>>(new Set())
  // 组件是否已挂载
  const mountedRef = useRef(true)

  // 使用字符串化来稳定依赖
  const namespacesKey = useMemo(() => [...namespaces].sort().join(','), [namespaces])

  const isAllReady = useMemo(() => {
    if (!i18n.language) return false
    return namespaces.every((ns) => i18n.hasResourceBundle(i18n.language, ns))
  }, [i18n.language, namespacesKey])

  // 当 namespaces 变化时，重置加载标记
  useEffect(() => {
    loadTriggeredRef.current.clear()
  }, [namespacesKey])

  // 组件卸载标记
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const loadMissing = useMemoizedFn(async (lng: string) => {
    if (!lng || !mountedRef.current) return
    // 找出需要加载的 namespace
    const toLoad = namespaces.filter((ns) => !i18n.hasResourceBundle(lng, ns))
    if (!toLoad.length) return

    // 生成加载标识，防止同一个组件实例重复触发
    const loadKey = `${lng}::${toLoad.sort().join(',')}`
    if (loadTriggeredRef.current.has(loadKey)) {
      return
    }
    loadTriggeredRef.current.add(loadKey)
    try {
      await Promise.all(toLoad.map((ns) => loadNamespaceOnce(lng, ns)))
    } catch (error) {
      // 加载失败时移除标记，允许重试
      loadTriggeredRef.current.delete(loadKey)
    }
  })

  const t: TFunction = useMemoizedFn((key, options) => {
    // 检查翻译是否存在
    const hit = i18n.exists(key, { ns: namespaces })
    if (hit) {
      return i18n.t(key, { ns: namespaces, ...options, defaultValue: undefined })
    }

    // 翻译不存在时，使用微任务异步触发加载，避免在渲染期间触发状态更新
    if (i18n.language && !isAllReady && mountedRef.current) {
      // 使用 queueMicrotask 延迟执行，避免在当前渲染周期触发更新
      queueMicrotask(() => {
        if (mountedRef.current) {
          loadMissing(i18n.language)
        }
      })
    }

    return options?.defaultValue ?? key
  })

  return { t, i18n, isAllReady, i18nRefresh }
}
