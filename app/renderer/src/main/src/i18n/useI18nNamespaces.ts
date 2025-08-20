import {useEffect, useRef, useState} from "react"
import i18n from "./i18n"
import {useTranslation} from "react-i18next"
import {useMemoizedFn} from "ahooks"
import {useCampare} from "@/hook/useCompare/useCompare"

type Vars = Record<string, string | number | boolean>
type KeyOrKeys = string | string[]

export function useI18nNamespaces(namespaces: string[]) {
    const {t: tOriginal} = useTranslation(namespaces)
    const [_, setTick] = useState<boolean>(false) // 强制刷新用
    const isAllReady = namespaces.every((ns) => i18n.hasResourceBundle(i18n.language, ns))
    const lastLngRef = useRef(i18n.language)
    const cache = useRef<Record<string, string>>({})

    if (lastLngRef.current !== i18n.language) {
        lastLngRef.current = i18n.language
        cache.current = {}
    }

    const nsArrayCom = useCampare(namespaces)
    useEffect(() => {
        const handlerLanguageChanged = (lng: string) => {
            cache.current = {}
            const toLoad = namespaces.filter((ns) => !i18n.hasResourceBundle(lng, ns))
            if (toLoad.length > 0) {
                i18n.loadNamespaces(toLoad).then(() => {
                    setTick((prev) => !prev)
                })
            } else {
                setTick((prev) => !prev)
            }
        }
        i18n.on("languageChanged", handlerLanguageChanged)
        return () => i18n.off("languageChanged", handlerLanguageChanged)
    }, [nsArrayCom])

    const t = useMemoizedFn((keys: KeyOrKeys, vars?: Vars, defaultValue?: string): string => {
        const keyList = Array.isArray(keys) ? keys : [keys]
        const cacheKey = vars ? null : keyList.join("|") + (defaultValue ?? "")
        if (cacheKey && cache.current[cacheKey]) {
            return cache.current[cacheKey]
        }

        let fallback = defaultValue ?? keyList[keyList.length - 1]
        let text: string | undefined = fallback
        let found = false

        for (const key of keyList) {
            for (const ns of namespaces) {
                if (!i18n.hasResourceBundle(i18n.language, ns)) continue
                const temp = tOriginal(key, {ns})
                if (i18n.exists(key, {ns})) {
                    text = String(temp)
                    found = true
                    break
                }
            }
            if (found) break
        }

        let strText: string = typeof text === "string" ? text : String(text ?? fallback)

        if (vars) {
            Object.keys(vars).forEach((k) => {
                const regex = new RegExp(`{${k}}`, "g")
                strText = strText.replace(regex, String(vars[k]))
            })
        }

        if (cacheKey) {
            cache.current[cacheKey] = strText
        }

        return strText
    })

    return {t, i18n, isAllReady}
}
