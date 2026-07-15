import { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useMemoizedFn, useDeepCompareEffect, useDebounceEffect } from 'ahooks'
import { I18nNamespace } from './namespaces'

export type Lange = 'zh' | 'zh-TW' | 'en'
const SUPPORTED_LANGS: Lange[] = ['zh', 'zh-TW', 'en']
export const normalizeLang = (lang?: string): Lange => {
  return SUPPORTED_LANGS.includes(lang as Lange) ? (lang as Lange) : 'zh'
}

type KeyOrKeys = string | string[]
export type TFunction = (keys: KeyOrKeys, options?: any) => any

export function useI18nNamespaces(namespaces: I18nNamespace[]) {
  const { i18n } = useTranslation(namespaces)
  const [i18nTick, setI18nTick] = useState(0)
  const loadingRef = useRef(false)
  const [i18nRefresh, setI18nRefresh] = useState(0)

  const loadMissing = useMemoizedFn(async (lng: string) => {
    if (loadingRef.current) return
    loadingRef.current = true
    try {
      const toLoad = namespaces.filter((ns) => !i18n.hasResourceBundle(lng, ns))
      if (toLoad.length) {
        await i18n.loadNamespaces(toLoad)
        setI18nTick((prev) => prev + 1)
      }
    } finally {
      loadingRef.current = false
    }
  })

  useDeepCompareEffect(() => {
    if (i18n.language) loadMissing(i18n.language)
    const handler = (lng: string) => loadMissing(lng)
    i18n.on('languageChanged', handler)
    return () => i18n.off('languageChanged', handler)
  }, [namespaces, i18n])

  const isAllReady = i18n.language ? namespaces.every((ns) => i18n.hasResourceBundle(i18n.language, ns)) : false

  const t: TFunction = useMemoizedFn((keys, options) => {
    const keyArray = Array.isArray(keys) ? keys : [keys]
    const result = i18n.t(keyArray, { ns: namespaces, ...options, defaultValue: undefined })
    const lastKey = keyArray[keyArray.length - 1]

    if (result === lastKey) {
      // 仅在资源未完全就绪且语言已初始化时尝试补加载
      if (i18n.language && !isAllReady) {
        loadMissing(i18n.language)
      }
      return options?.defaultValue ?? lastKey
    }
    return result
  })

  // 监听 i18nTick 和 i18n.language 的变化
  useDebounceEffect(
    () => {
      setI18nRefresh((v) => v + 1)
    },
    [i18nTick, i18n.language],
    {
      wait: 500,
    },
  )

  return { t, i18n, isAllReady, i18nRefresh }
}
