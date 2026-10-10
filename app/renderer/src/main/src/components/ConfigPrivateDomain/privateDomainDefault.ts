export const ENTERPRISE_DEFAULT_PRIVATE_DOMAIN = 'https://vip.yaklang.com'

const LEGACY_ENTERPRISE_DEFAULT_PRIVATE_DOMAIN = 'https://www.yaklang.com'

const normalizePrivateDomain = (value: string) => value.trim().replace(/\/+$/, '')

export const resolvePrivateDomainDefault = (storedBaseUrl: unknown, enterpriseLogin: boolean): string => {
  if (typeof storedBaseUrl !== 'string') {
    return enterpriseLogin ? ENTERPRISE_DEFAULT_PRIVATE_DOMAIN : ''
  }

  if (!enterpriseLogin) return storedBaseUrl

  const normalizedBaseUrl = normalizePrivateDomain(storedBaseUrl)
  if (!normalizedBaseUrl || normalizedBaseUrl === LEGACY_ENTERPRISE_DEFAULT_PRIVATE_DOMAIN) {
    return ENTERPRISE_DEFAULT_PRIVATE_DOMAIN
  }

  return storedBaseUrl
}
