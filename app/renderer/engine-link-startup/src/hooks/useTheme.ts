import {create} from "zustand"
const {ipcRenderer} = window.require("electron")

export type Theme = "light" | "dark"
let ipcRegistered = false

function applyTheme(theme: Theme) {
    document.documentElement.setAttribute("data-theme", theme)
    localStorage.setItem("theme", theme)
}

export const useTheme = create<{
    theme: Theme
    setTheme: (theme: Theme) => void
}>((set) => {
    const initialTheme: Theme = (localStorage.getItem("theme") as Theme) || "light"
    applyTheme(initialTheme)

    if (!ipcRegistered) {
        ipcRenderer.on("theme-updated", (_e, theme: Theme) => {
            applyTheme(theme)
            set({theme})
        })
        ipcRegistered = true
    }

    return {
        theme: initialTheme,
        setTheme: (theme: Theme) => {
            applyTheme(theme)
            set({theme})
            ipcRenderer.invoke("set-theme", theme)
        }
    }
})
