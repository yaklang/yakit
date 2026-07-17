import { useTranslation } from 'react-i18next'
import { useMemoizedFn } from 'ahooks'

type KeyOrKeys = string | string[]
export type TFunction = (keys: KeyOrKeys, options?: any) => any

export function useI18nNamespaces(namespaces: string[]) {
  const { i18n } = useTranslation(namespaces)

  const t: TFunction = useMemoizedFn((keys, options?: any) => {
    const keyList = Array.isArray(keys) ? keys : [keys]

    for (const key of keyList) {
      for (const ns of namespaces) {
        const temp = i18n.t(key, { ...options, ns })
        if (i18n.exists(key, { ns })) {
          return temp
        }
      }
    }
    return options?.defaultValue ?? keyList[keyList.length - 1]
  })

  return { t, i18n, isAllReady: true }
}
