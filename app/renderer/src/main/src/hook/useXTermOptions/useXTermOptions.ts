import {useTheme} from "../useTheme"
import {useCreation, useMemoizedFn} from "ahooks"
import {getAllYakitColorVars} from "@/utils/monacoSpec/theme"
import {defaultTerminalOptions} from "@/components/yakitUI/YakitXterm/YakitXterm"

export const getXtermTheme = () => {
    const vars = getAllYakitColorVars()
    return {
        foreground: vars["--Colors-Use-Neutral-Text-1-Title"],
        background: vars["--Colors-Use-Neutral-Bg"],

        cursor: vars["--Colors-Use-Main-Primary"],
        cursorAccent: vars["--Colors-Use-Neutral-Bg"],

        selectionBackground: vars["--Colors-Use-Main-Focus"],
        selectionForeground: vars["--Colors-Use-Neutral-Text-1-Title"],
        selectionInactiveBackground: vars["--Colors-Use-Neutral-Disable"],

        black: vars["--Colors-Use-Neutral-Bg"],
        red: vars["--Colors-Use-Error-Primary"],
        green: vars["--yakit-colors-Green-80"],
        yellow: vars["--yakit-colors-Orange-80"],
        blue: vars["--yakit-colors-Blue-80"],
        magenta: vars["--yakit-colors-Magenta-80"],
        cyan: vars["--yakit-colors-Lake-blue-80"],
        white: vars["--Colors-Use-Neutral-Text-1-Title"],

        brightBlack: vars["--Colors-Use-Neutral-Disable"],
        brightRed: vars["--yakit-colors-Error-80"],
        brightGreen: vars["--yakit-colors-Green-100"],
        brightYellow: vars["--yakit-colors-Orange-100"],
        brightBlue: vars["--yakit-colors-Blue-100"],
        brightMagenta: vars["--yakit-colors-Magenta-100"],
        brightCyan: vars["--yakit-colors-Lake-blue-100"],
        brightWhite: vars["--Colors-Use-Neutral-Text-1-Title"],

        extendedAnsi: [
            vars["--Colors-Use-Neutral-Bg"],
            vars["--Colors-Use-Neutral-Bg-Hover"],
            vars["--Colors-Use-Neutral-Disable"],
            vars["--Colors-Use-Neutral-Border"],

            vars["--yakit-colors-Blue-80"],
            vars["--yakit-colors-Green-80"],
            vars["--yakit-colors-Orange-80"],
            vars["--yakit-colors-Error-80"],

            vars["--yakit-colors-Blue-100"],
            vars["--yakit-colors-Magenta-80"],
            vars["--yakit-colors-Lake-blue-80"],
            vars["--yakit-colors-Green-100"],

            vars["--yakit-colors-Orange-100"],
            vars["--yakit-colors-Error-100"],
            vars["--Colors-Use-Blue-Primary"],
            vars["--Colors-Use-Main-Primary"]
        ]
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
            ...defaultTerminalOptions,
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
