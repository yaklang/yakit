import type { AIOutputI18n } from '@/pages/ai-re-act/hooks/grpcApi'

export const getToolDisplayName = (name: AIOutputI18n | undefined, language: string, fallback: string) => {
  const localizedName = language.toLowerCase().startsWith('zh') ? name?.Zh || name?.En : name?.En || name?.Zh
  return localizedName || fallback
}
