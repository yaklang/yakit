declare module '@yakit-libs/color/preview' {
  import type { ThemeMode } from '@yakit-libs/color'

  export function getColors(mode: ThemeMode): Record<string, string>
}
