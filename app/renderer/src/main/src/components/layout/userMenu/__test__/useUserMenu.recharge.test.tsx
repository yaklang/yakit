import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useUserMenu } from '../useUserMenu'
import emiter from '@/utils/eventBus/eventBus'

const { userInfo } = vi.hoisted(() => ({ userInfo: { isLogin: false } }))

vi.mock('@/store', () => ({
  useStore: () => ({ userInfo, setStoreUserInfo: vi.fn() }),
  useYakitDynamicStatus: () => ({ dynamicStatus: {} }),
}))
vi.mock('@/utils/login', () => ({ loginOut: vi.fn() }))
vi.mock('@/utils/notification', () => ({ success: vi.fn(), yakitFailed: vi.fn() }))
vi.mock('@/services/fetch', () => ({ NetWorkApi: vi.fn().mockResolvedValue({ ok: false }) }))
vi.mock('@/components/CeUserMenu/CeUserMenu', () => ({ CeUserInfo: () => null }))
vi.mock('@/i18n/useI18nNamespaces', () => ({ useI18nNamespaces: () => ({ t: (key: string) => key }) }))
vi.mock('@/utils/envfile', () => ({
  isCommunityEdition: () => true,
  isEnpriTraceAgent: () => false,
  isEnpriTraceIRify: () => false,
  isIRify: () => false,
}))
vi.mock('@/services/electronBridge', () => ({
  yakitEngine: {},
  yakitNetwork: {},
  yakitUILayout: {
    onSignOutRequested: () => vi.fn(),
    onResetPassword: () => vi.fn(),
  },
}))
vi.mock('@/utils/imControl', () => ({
  cancelIMControlState: vi.fn(),
  onIMControlStateData: vi.fn(),
  onIMControlStateEnd: vi.fn(),
  onIMControlStateError: vi.fn(),
  subscribeIMControlState: vi.fn(),
}))

const renderMenu = () =>
  renderHook(() => useUserMenu({ isEngineLink: false, dynamicConnect: false, avatarColor: { current: '' } }))

beforeEach(() => {
  userInfo.isLogin = false
})

describe('通知充值入口', () => {
  it('已登录时直接打开充值', () => {
    userInfo.isLogin = true
    const { result } = renderMenu()
    act(() => emiter.emit('onOpenRecharge', ''))
    expect(result.current.rechargeVisible).toBe(true)
    expect(result.current.loginShow).toBe(false)
  })

  it('未登录时弹出登录，登录成功后继续充值', () => {
    const { result, rerender } = renderMenu()
    act(() => emiter.emit('onOpenRecharge', ''))
    expect(result.current.loginShow).toBe(true)
    expect(result.current.rechargeVisible).toBe(false)

    userInfo.isLogin = true
    rerender()
    expect(result.current.loginShow).toBe(false)
    expect(result.current.rechargeVisible).toBe(true)

    act(() => result.current.setRechargeVisible(false))
    expect(result.current.rechargeVisible).toBe(false)
  })

  it('取消登录后，后续普通登录不会意外打开充值', () => {
    const { result, rerender } = renderMenu()
    act(() => emiter.emit('onOpenRecharge', ''))
    act(() => result.current.setLoginShow(false))
    userInfo.isLogin = true
    rerender()
    expect(result.current.rechargeVisible).toBe(false)
  })

  it('取消登录后再次点击充值，仍需等待登录成功', () => {
    const { result, rerender } = renderMenu()
    act(() => emiter.emit('onOpenRecharge', ''))
    act(() => result.current.setLoginShow(false))
    expect(result.current.rechargeVisible).toBe(false)

    act(() => emiter.emit('onOpenRecharge', ''))
    rerender()
    expect(result.current.loginShow).toBe(true)
    expect(result.current.rechargeVisible).toBe(false)

    userInfo.isLogin = true
    rerender()
    expect(result.current.loginShow).toBe(false)
    expect(result.current.rechargeVisible).toBe(true)
  })

  it('登录状态变化后再次点击充值会使用最新状态', () => {
    const { result, rerender } = renderMenu()
    userInfo.isLogin = true
    rerender()
    act(() => emiter.emit('onOpenRecharge', ''))
    expect(result.current.rechargeVisible).toBe(true)
    expect(result.current.loginShow).toBe(false)
  })

  it('卸载时移除充值事件监听', () => {
    const { unmount } = renderMenu()
    expect(emiter.all.get('onOpenRecharge')).toHaveLength(1)
    unmount()
    expect(emiter.all.get('onOpenRecharge')).toHaveLength(0)
  })
})
