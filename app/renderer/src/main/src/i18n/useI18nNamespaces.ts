import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMemoizedFn } from 'ahooks'
import { useCampare } from '@/hook/useCompare/useCompare'

type KeyOrKeys = string | string[]
export type TFunction = (keys: KeyOrKeys, options?: any) => any

export function useI18nNamespaces(namespaces: string[]) {
  const { i18n } = useTranslation(namespaces)
  const [, setTick] = useState(0) // 强制刷新用
  const isAllReady = namespaces.every((ns) => i18n.hasResourceBundle(i18n.language, ns))

  const nsArrayCom = useCampare(namespaces)
  useEffect(() => {
    const handlerLanguageChanged = async (lng: string) => {
      const toLoad = namespaces.filter((ns) => !i18n.hasResourceBundle(lng, ns))
      if (toLoad.length > 0) {
        try {
          await i18n.loadNamespaces(toLoad)
        } catch (error) {}
      }
      setTick((prev) => prev + 1)
    }
    i18n.on('languageChanged', handlerLanguageChanged)
    return () => i18n.off('languageChanged', handlerLanguageChanged)
  }, [nsArrayCom, i18n])

  const t: TFunction = useMemoizedFn((keys, options?: any) => {
    const keyList = Array.isArray(keys) ? keys : [keys]

    for (const key of keyList) {
      for (const ns of namespaces) {
        if (!i18n.hasResourceBundle(i18n.language, ns)) continue
        const temp = i18n.t(key, { ...options, ns })
        if (i18n.exists(key, { ns })) {
          return temp
        }
      }
    }
    return options?.defaultValue ?? keyList[keyList.length - 1]
  })

  return { t, i18n, isAllReady }
}
