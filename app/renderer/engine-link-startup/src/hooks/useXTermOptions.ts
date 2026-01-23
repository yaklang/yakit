import {getAllYakitColorVars} from "@/utils/theme"
import {useCreation, useMemoizedFn} from "ahooks"
import {useTheme} from "./useTheme"

export const getXtermTheme = () => {
    const vars = getAllYakitColorVars()
    return {
        foreground: vars["--Colors-Use-Neutral-Text-3-Secondary"],
        background: vars["--Colors-Use-Basic-Background"],
        cursor: vars["--Colors-Use-Neutral-Text-3-Secondary"],
        black: vars["--Colors-Use-Basic-Black"],
        brightBlack: vars["--yakit-colors-Neutral-100"],
        red: vars["--yakit-colors-Error-80"],
        brightRed: vars["--yakit-colors-Error-60"],
        green: vars["--yakit-colors-Green-80"],
        brightGreen: vars["--yakit-colors-Green-60"],
        yellow: vars["--yakit-colors-Yellow-80"],
        brightYellow: vars["--yakit-colors-Yellow-60"],
        blue: vars["--yakit-colors-Blue-80"],
        brightBlue: vars["--yakit-colors-Blue-60"],
        magenta: vars["--yakit-colors-Magenta-80"],
        brightMagenta: vars["--yakit-colors-Magenta-60"],
        cyan: vars["--yakit-colors-Cyan-80"],
        brightCyan: vars["--yakit-colors-Cyan-60"],
        white: vars["--yakit-colors-Orange-50"],
        brightWhite: vars["--yakit-colors-Neutral-0"]
    }
}
interface UseXTermOptionsParams {
    getTerminal: () => any
    delay?: number
}
export const useXTermOptions = (params: UseXTermOptionsParams) => {
    const {getTerminal, delay = 0} = params
    const {theme: themeGlobal} = useTheme()

    const handleSetOptions = useMemoizedFn(() => {
        const terminal = getTerminal()
        if (terminal) {
            if (terminal.options) {
                terminal.options.theme = getXtermTheme()
            } else if (terminal.setOption) {
                terminal.setOption("theme", getXtermTheme())
            }
        }
    })

    const terminalOptions = useCreation(() => {
        const option = {
            ...{
                fontFamily: '"Courier New", Courier, monospace',
                convertEol: true
            },
            theme: {...getXtermTheme()}
        }
        if (delay) {
            setTimeout(() => {
                handleSetOptions()
            }, delay)
        } else {
            handleSetOptions()
        }
        return option
    }, [themeGlobal, delay])

    return terminalOptions
}
