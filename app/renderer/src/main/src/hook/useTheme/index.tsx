import {getLocalValue, setLocalValue} from "@/utils/kv"
import {createContext, useContext, useEffect, useState} from "react"

export type Theme = "light" | "dark"

const ThemeContext = createContext<{
    theme: Theme
    setTheme: (t: Theme) => void
}>({
    theme: "light",
    setTheme: () => {}
})

export const ThemeProvider = ({children}: {children: React.ReactNode}) => {
    const [theme, setThemeState] = useState<Theme>("light") // 默认值为 light

    const setTheme = (next: Theme) => {
        setThemeState(next)
        document.documentElement.setAttribute("data-theme", next)
        setLocalValue("theme", next)
        localStorage.setItem("theme", next)
    }

    useEffect(() => {
        // 异步加载本地 theme
        getLocalValue("theme")
            .then((t) => {
                const loadedTheme = (t as Theme | undefined) ?? "light"
                setThemeState(loadedTheme)
                document.documentElement.setAttribute("data-theme", loadedTheme)
            })
            .catch(() => {
                setThemeState("light")
                document.documentElement.setAttribute("data-theme", "light")
            })
    }, [])

    return <ThemeContext.Provider value={{theme, setTheme}}>{children}</ThemeContext.Provider>
}

export const useTheme = () => useContext(ThemeContext)
