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
    const [theme, setThemeState] = useState<Theme>(() => (localStorage.getItem("theme") as Theme) || "light")

    const setTheme = (next: Theme) => {
        setThemeState(next)
        document.documentElement.setAttribute("data-theme", next)
        localStorage.setItem("theme", next)
    }

    useEffect(() => {
        document.documentElement.setAttribute("data-theme", theme)
    }, [theme])

    return <ThemeContext.Provider value={{theme, setTheme}}>{children}</ThemeContext.Provider>
}

export const useTheme = () => useContext(ThemeContext)
