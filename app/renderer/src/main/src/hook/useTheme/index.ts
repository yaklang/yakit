import {useEffect, useState} from "react"

export type Theme = "light" | "dark"

export function useTheme() {
    const [theme, setThemeState] = useState<Theme>(() => {
        return (localStorage.getItem("theme") as Theme) || "light"
    })

    const setTheme = (next: Theme) => {
        setThemeState(next)
        document.documentElement.setAttribute("data-theme", next)
        localStorage.setItem("theme", next)
    }

    useEffect(() => {
        document.documentElement.setAttribute("data-theme", theme)
    }, [theme])

    return {theme, setTheme}
}
