export type ThemeMode = 'light' | 'dark'

export function generateNeutralSemanticColors(mode?: ThemeMode): Record<string, string>
export function generateBasicSemanticColors(mode?: ThemeMode): Record<string, string>
export function generateSemanticColors(colorName: string, mode?: ThemeMode): Record<string, string>
export function generateTagSemanticColors(colorName: string, mode?: ThemeMode): Record<string, string>
export function generateStatusSemanticColors(mode?: ThemeMode): Record<string, string>
export function generateAllSemanticColors(mode?: ThemeMode): Record<string, string>
