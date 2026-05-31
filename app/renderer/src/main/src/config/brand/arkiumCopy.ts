import type { TFunction } from '@/i18n/useI18nNamespaces'
import { isArkiumEdition } from './featureFlags'

/**
 * Arkium 模式下返回 product 命名空间文案，否则走原有 i18n key。
 * 仅用于用户可见 label，不改内部 key / IPC / route。
 */
export const getArkiumActionLabel = (
  t: TFunction,
  defaultKey: string,
  arkiumKey: string,
  defaultNs?: string | readonly string[],
): string => {
  if (isArkiumEdition()) {
    return t(arkiumKey, { ns: 'product' })
  }
  if (defaultNs) {
    return t(defaultKey, { ns: defaultNs as string })
  }
  return t(defaultKey)
}
