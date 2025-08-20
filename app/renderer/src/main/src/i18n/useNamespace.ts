import {useEffect, useState} from "react"
import i18n from "./i18n"
import {useTranslation} from "react-i18next"

type ReadyMap = Record<string, boolean>
type Vars = Record<string, string | number | boolean>

export function useNamespace(namespaces: string | string[]) {
    const nsArray = Array.isArray(namespaces) ? namespaces : [namespaces]
    const {t: tOriginal} = useTranslation(nsArray)

    // namespace 加载状态
    const [readyMap, setReadyMap] = useState<ReadyMap>(() =>
        Object.fromEntries(nsArray.map((ns) => [ns, i18n.hasResourceBundle(i18n.language, ns)]))
    )

    useEffect(() => {
        const lng = i18n.language
        // 每次语言变化都重新计算加载状态
        setReadyMap(Object.fromEntries(nsArray.map((ns) => [ns, i18n.hasResourceBundle(lng, ns)])))
        
        const toLoad = nsArray.filter((ns) => !i18n.hasResourceBundle(lng, ns))

        if (toLoad.length > 0) {
            i18n.loadNamespaces(toLoad).then(() => {
                setReadyMap((prev) => {
                    const updated: ReadyMap = {...prev}
                    toLoad.forEach((ns) => (updated[ns] = true))
                    return updated
                })
            })
        }
    }, [i18n.language, nsArray.join(",")])

    // 封装 t，自动查找 key 所在的 namespace
    const t = (key: string, vars?: Vars, defaultValue?: string) => {
        let text: string = defaultValue ?? key

        for (const ns of nsArray) {
            if (i18n.hasResourceBundle(i18n.language, ns)) {
                const temp = tOriginal(key, {defaultValue, ns})
                if (temp !== key) {
                    text = temp
                    break
                }
            }
        }

        // 占位符替换
        if (vars) {
            Object.keys(vars).forEach((k) => {
                text = text.replace(new RegExp(`{${k}}`, "g"), String(vars[k]))
            })
        }

        return text
    }

    const isAllReady = nsArray.every((ns) => readyMap[ns])

    return {t, i18n, readyMap, isAllReady}
}
