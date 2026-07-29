import { useMemo } from 'react'
import type { ColorHex } from '@yakit-libs/color'
import { GetMainColor } from '@/utils/envfile'
import { getYakitColorVars } from '@/utils/yakitColorVars'
import { useTheme } from '../useTheme'

function useGetColorsByTheme() {
  const { theme } = useTheme()

  return useMemo(() => getYakitColorVars(theme, GetMainColor(theme) as ColorHex), [theme])
}

export default useGetColorsByTheme
