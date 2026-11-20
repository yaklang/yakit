import { useMemo } from 'react'
import { fetchEnv } from '@/utils/envfile'
import { useTheme } from '@/hook/useTheme'

import YakitLightEmpty from '@/assets/EmptyImage/YakitLightEmpty.png'
import YakitDarkEmpty from '@/assets/EmptyImage/YakitDarkEmpty.png'
import IrifyLightEmpty from '@/assets/EmptyImage/IrifyLightEmpty.png'
import IrifyDarkEmpty from '@/assets/EmptyImage/IrifyDarkEmpty.png'
import MemfitLightEmpty from '@/assets/EmptyImage/MemfitLightEmpty.png'
import MemfitDarkEmpty from '@/assets/EmptyImage/MemfitDarkEmpty.png'

const yakitMap = { light: YakitLightEmpty, dark: YakitDarkEmpty }
const irifyMap = { light: IrifyLightEmpty, dark: IrifyDarkEmpty }
const memfitMap = { light: MemfitLightEmpty, dark: MemfitDarkEmpty }

/**
 * Link 启动页会用到 YakitSelect / YakitEmpty 的通用空状态，
 * 但不需要主窗口的 network / server / power / search / screenRecording 五类图。
 * 这里只保留 6 张通用 Empty 图，避免其余 30 张 PNG 进入 pages/link。
 */
export const useEmptyImage = () => {
  const { theme } = useTheme()
  const env = fetchEnv()

  return useMemo(() => {
    switch (env) {
      case 'irify':
      case 'irifyEE':
        return irifyMap[theme] ?? yakitMap.light
      case 'memfit':
        return memfitMap[theme] ?? yakitMap.light
      default:
        return yakitMap[theme] ?? yakitMap.light
    }
  }, [theme, env])
}
