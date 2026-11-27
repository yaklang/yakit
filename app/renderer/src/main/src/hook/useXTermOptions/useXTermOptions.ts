import { useTheme, type Theme } from '../useTheme'
import { useCreation, useMemoizedFn } from 'ahooks'
import { getAllYakitColorVars } from '@/utils/yakitColorVars'
import { defaultTerminalOptions } from '@/components/yakitUI/YakitXterm/terminalOptions'

const DEFAULT_XTERM_BACKGROUND = '--Colors-Use-Neutral-Bg'

const applyYakitXtermTheme = (terminal, fun, theme: Theme, backgroundColorVar?: string) => {
  requestAnimationFrame(() => {
    fun(terminal, getXtermTheme(theme, backgroundColorVar))
  })
}

export const getXtermTheme = (theme?: Theme, backgroundColorVar = DEFAULT_XTERM_BACKGROUND) => {
  const vars = getAllYakitColorVars(theme)
  return {
    foreground: vars['--Colors-Use-Neutral-Text-1-Title'],
    background: vars[backgroundColorVar] ?? vars[DEFAULT_XTERM_BACKGROUND],

    cursor: vars['--Colors-Use-Main-Primary'],
    cursorAccent: vars['--Colors-Use-Neutral-Bg'],

    selectionBackground: vars['--Colors-Use-Main-Focus'],
    selectionForeground: vars['--Colors-Use-Neutral-Text-1-Title'],
    selectionInactiveBackground: vars['--Colors-Use-Neutral-Disable'],

    black: vars['--Colors-Use-Neutral-Bg'],
    red: vars['--Colors-Use-Error-Primary'],
    green: vars['--yakit-colors-Green-80'],
    yellow: vars['--yakit-colors-Orange-80'],
    blue: vars['--yakit-colors-Blue-80'],
    magenta: vars['--yakit-colors-Magenta-80'],
    cyan: vars['--yakit-colors-Lake-blue-80'],
    white: vars['--Colors-Use-Neutral-Text-1-Title'],

    brightBlack: vars['--Colors-Use-Neutral-Disable'],
    brightRed: vars['--yakit-colors-Error-80'],
    brightGreen: vars['--yakit-colors-Green-100'],
    brightYellow: vars['--yakit-colors-Orange-100'],
    brightBlue: vars['--yakit-colors-Blue-100'],
    brightMagenta: vars['--yakit-colors-Magenta-100'],
    brightCyan: vars['--yakit-colors-Lake-blue-100'],
    brightWhite: vars['--Colors-Use-Neutral-Text-1-Title'],

    extendedAnsi: [
      vars['--Colors-Use-Neutral-Bg'],
      vars['--Colors-Use-Neutral-Bg-Hover'],
      vars['--Colors-Use-Neutral-Disable'],
      vars['--Colors-Use-Neutral-Border'],

      vars['--yakit-colors-Blue-80'],
      vars['--yakit-colors-Green-80'],
      vars['--yakit-colors-Orange-80'],
      vars['--yakit-colors-Error-80'],

      vars['--yakit-colors-Blue-100'],
      vars['--yakit-colors-Magenta-80'],
      vars['--yakit-colors-Lake-blue-80'],
      vars['--yakit-colors-Green-100'],

      vars['--yakit-colors-Orange-100'],
      vars['--yakit-colors-Error-100'],
      vars['--Colors-Use-Blue-Primary'],
      vars['--Colors-Use-Main-Primary'],
    ],
  }
}
interface UseXTermOptionsParams {
  getTerminal: () => any
  delay?: number
  /** 默认使用主窗口的 --Colors-Use-Neutral-Bg，Link 连接页可传 --Colors-Use-Basic-Background */
  backgroundColorVar?: string
}
export const useXTermOptions = (params: UseXTermOptionsParams) => {
  const { getTerminal, delay = 0, backgroundColorVar } = params
  const { theme: themeGlobal } = useTheme()

  const onOption = useMemoizedFn((terminal, theme) => {
    terminal.options.theme = theme
  })

  const onSetOption = useMemoizedFn((terminal, theme) => {
    terminal.setOption('theme', theme)
  })

  const handleSetOptions = useMemoizedFn(() => {
    const terminal = getTerminal()
    if (terminal) {
      if (terminal.options) {
        applyYakitXtermTheme(terminal, onOption, themeGlobal, backgroundColorVar)
      } else if (terminal.setOption) {
        applyYakitXtermTheme(terminal, onSetOption, themeGlobal, backgroundColorVar)
      }
    }
  })

  const terminalOptions = useCreation(() => {
    const option = {
      ...defaultTerminalOptions,
      theme: { ...getXtermTheme(themeGlobal, backgroundColorVar) },
    }
    if (delay) {
      setTimeout(() => {
        handleSetOptions()
      }, delay)
    } else {
      handleSetOptions()
    }
    return option
  }, [themeGlobal, delay, backgroundColorVar])

  return terminalOptions
}
