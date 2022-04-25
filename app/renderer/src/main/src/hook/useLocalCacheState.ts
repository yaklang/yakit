import {useRef, useEffect} from "react"
import {useGetState} from "ahooks"
import {clearTimeout} from "timers"

const {ipcRenderer} = window.require("electron")

export default function useLocalCacheState(keyword: string) {
    const [cache, setCache, getCache] = useGetState<string>()

    const time = useRef<any>(null)

    useEffect(() => {
        ipcRenderer
            .invoke("get-value", keyword)
            .then((res: any) => setCache(res))
            .catch(() => {})

        return () => {
            ipcRenderer.invoke("set-value", keyword, getCache())
        }
    }, [])

    const setLocalCache = (value?: string) => {
        if (time.current) {
            clearTimeout(time.current)
            time.current = null
        }
        time.current = setTimeout(() => {
            setCache(value)
            ipcRenderer.invoke("set-value", keyword, value)
        }, 1000)
    }

    const getLocalCache = () => {
        return getCache()
    }

    return [cache, {setLocalCache, getLocalCache}] as const
}
