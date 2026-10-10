import { describe, expect, it } from 'vitest'
import { ENTERPRISE_DEFAULT_PRIVATE_DOMAIN, resolvePrivateDomainDefault } from '../privateDomainDefault'

describe('resolvePrivateDomainDefault', () => {
  it('企业登录无已存配置时使用企业默认私有域', () => {
    expect(resolvePrivateDomainDefault(undefined, true)).toBe(ENTERPRISE_DEFAULT_PRIVATE_DOMAIN)
    expect(resolvePrivateDomainDefault('', true)).toBe(ENTERPRISE_DEFAULT_PRIVATE_DOMAIN)
  })

  it('企业登录将旧公共默认域迁移为企业默认私有域', () => {
    expect(resolvePrivateDomainDefault('https://www.yaklang.com', true)).toBe(ENTERPRISE_DEFAULT_PRIVATE_DOMAIN)
    expect(resolvePrivateDomainDefault('https://www.yaklang.com/', true)).toBe(ENTERPRISE_DEFAULT_PRIVATE_DOMAIN)
  })

  it('企业登录保留用户已保存的自定义私有域', () => {
    expect(resolvePrivateDomainDefault('https://enterprise.example.com/', true)).toBe('https://enterprise.example.com/')
  })

  it('非企业登录不注入企业默认私有域', () => {
    expect(resolvePrivateDomainDefault(undefined, false)).toBe('')
    expect(resolvePrivateDomainDefault('https://www.yaklang.com', false)).toBe('https://www.yaklang.com')
  })
})
