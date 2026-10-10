import '../../../../pages/ai-re-act/hooks/__test__/setupElectron'
import type React from 'react'
import { act, fireEvent, render, renderHook, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useUserMenu } from '../useUserMenu'
import emiter from '@/utils/eventBus/eventBus'
import Login from '@/pages/Login'

const { userInfo, edition, showModal } = vi.hoisted(() => ({
  userInfo: { isLogin: false, platform: '', role: '', companyHeadImg: '', companyName: '菜单测试用户' },
  edition: { enterprise: false, enpriTrace: false, agent: false, irify: false },
  showModal: vi.fn((_props: { modalAfterClose?: () => void }) => ({ destroy: vi.fn() })),
}))

vi.mock('@/store', () => ({
  useStore: () => ({ userInfo, setStoreUserInfo: vi.fn() }),
  useYakitDynamicStatus: () => ({ dynamicStatus: {} }),
}))
vi.mock('@/utils/login', () => ({ loginOut: vi.fn() }))
vi.mock('@/utils/notification', () => ({ success: vi.fn(), yakitFailed: vi.fn() }))
vi.mock('@/apiUtils/http', () => ({ httpDeleteOSSResource: vi.fn().mockResolvedValue(undefined) }))
vi.mock('@/pages/MainOperator', () => ({
  SetUserInfo: ({ userInfo }: { userInfo: { companyName: string } }) => <div>{userInfo.companyName}</div>,
}))
vi.mock('@/services/fetch', () => ({ NetWorkApi: vi.fn().mockResolvedValue({ ok: false }) }))
vi.mock('@/components/CeUserMenu/CeUserMenu', () => ({ CeUserInfo: () => null }))
vi.mock('@/components/ConfigPrivateDomain/ConfigPrivateDomain', () => ({
  ConfigPrivateDomain: ({ onClose }: { onClose: () => void }) => <button onClick={onClose}>关闭企业登录</button>,
}))
vi.mock('@/components/yakitUI/YakitModal/YakitModal', () => ({
  YakitModal: ({ open, children }: { open: boolean; children: React.ReactNode }) =>
    open ? <div role="dialog">{children}</div> : null,
}))
vi.mock('@/utils/showModal', () => ({ showModal }))
vi.mock('@/pages/plugins/utils', () => ({ apiDownloadPluginMine: vi.fn() }))
vi.mock('@/components/yakitUI/YakitModal/YakitModalConfirm', () => ({
  showYakitModal: showModal,
  YakitModalConfirm: vi.fn(),
}))
vi.mock('@/components/yakitUI/YakitSpin/YakitSpin', () => ({
  YakitSpin: ({ children }: { children: React.ReactNode }) => children,
}))
vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({ t: (key: string) => key, i18n: { language: 'zh-CN' } }),
}))
vi.mock('@/utils/envfile', () => ({
  isCommunityEdition: () => true,
  isEnterpriseEdition: () => edition.enterprise,
  isEnpriTrace: () => edition.enpriTrace,
  isEnpriTraceAgent: () => edition.agent,
  isEnpriTraceIRify: () => false,
  isIRify: () => edition.irify,
}))
vi.mock('@/services/electronBridge', () => ({
  yakitAuth: { onSignInData: () => vi.fn() },
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
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
  userInfo.isLogin = false
  userInfo.platform = ''
  userInfo.role = ''
  userInfo.companyHeadImg = ''
  edition.enterprise = false
  edition.enpriTrace = false
  edition.agent = false
  edition.irify = false
  showModal.mockClear()
})

describe('消息中心入口', () => {
  const expectMessageCenterAfterRobotControl = (
    menu: ReturnType<typeof renderMenu>['result']['current']['userMenu'],
  ) => {
    const keys = menu.flatMap((item) => {
      if (!item || typeof item !== 'object' || !('key' in item)) return []
      return [item.key]
    })
    expect(keys.filter((key) => key === 'message-center')).toHaveLength(1)
    expect(keys.indexOf('message-center')).toBe(keys.indexOf('robot-control') + 1)
  }

  it.each(['superAdmin', 'admin', 'operate', 'licenseAdmin', 'auditor', 'guest'])(
    '社区版 %s 角色在移动端控制后展示唯一消息中心入口',
    (role) => {
      userInfo.isLogin = true
      userInfo.platform = 'community'
      userInfo.role = role
      const { result } = renderMenu()
      expectMessageCenterAfterRobotControl(result.current.userMenu)
    },
  )

  it.each(['admin', 'superAdmin', 'auditor', 'operate'])('企业版 %s 角色在移动端控制后展示唯一消息中心入口', (role) => {
    userInfo.isLogin = true
    userInfo.platform = 'company'
    userInfo.role = role
    const { result } = renderMenu()
    expectMessageCenterAfterRobotControl(result.current.userMenu)
  })

  it('便携企业版管理员菜单也展示唯一消息中心入口', () => {
    userInfo.isLogin = true
    userInfo.platform = 'company'
    userInfo.role = 'admin'
    edition.agent = true
    const { result } = renderMenu()
    expectMessageCenterAfterRobotControl(result.current.userMenu)
  })

  it.each([
    { enterprise: false, channel: 'plugin' },
    { enterprise: true, channel: 'web' },
  ])('点击后关闭用户菜单并打开 $channel 频道', ({ enterprise, channel }) => {
    userInfo.isLogin = true
    edition.enpriTrace = enterprise
    const openMessageCenter = vi.fn()
    emiter.on('openAllMessageNotification', openMessageCenter)
    const { result, unmount } = renderMenu()

    act(() => {
      result.current.setCeUserMenuShow(true)
      result.current.setDynamicMenuOpen(true)
    })
    act(() => result.current.onUserMenuClick('message-center'))

    expect(result.current.ceUserMenuShow).toBe(false)
    expect(result.current.dynamicMenuOpen).toBe(false)
    expect(openMessageCenter).toHaveBeenCalledOnce()
    expect(openMessageCenter).toHaveBeenCalledWith(channel)

    unmount()
    emiter.off('openAllMessageNotification', openMessageCenter)
  })
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

  it('切换企业登录面板时保留充值意图，登录成功后继续充值', () => {
    edition.enterprise = true
    const { result, rerender } = renderMenu()
    act(() => emiter.emit('onOpenRecharge', ''))
    render(<Login visible={result.current.loginShow} onCancel={() => result.current.setLoginShow(false)} />)

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(result.current.loginShow).toBe(true)
    expect(result.current.rechargeVisible).toBe(false)

    userInfo.isLogin = true
    rerender()
    expect(result.current.loginShow).toBe(false)
    expect(result.current.rechargeVisible).toBe(true)

    fireEvent.click(screen.getByRole('button', { name: '关闭企业登录' }))
    expect(result.current.rechargeVisible).toBe(true)
  })

  it('关闭企业登录面板后清除充值意图，后续登录不打开充值', () => {
    edition.enterprise = true
    const { result, rerender } = renderMenu()
    act(() => emiter.emit('onOpenRecharge', ''))
    render(<Login visible={result.current.loginShow} onCancel={() => result.current.setLoginShow(false)} />)
    fireEvent.click(screen.getByRole('button', { name: '关闭企业登录' }))
    expect(result.current.loginShow).toBe(false)
    expect(result.current.rechargeVisible).toBe(false)

    userInfo.isLogin = true
    rerender()
    expect(result.current.rechargeVisible).toBe(false)
  })

  it('取消企业登录后再次点击充值，可以重新登录并继续充值', () => {
    edition.enterprise = true
    const { result, rerender } = renderMenu()
    act(() => emiter.emit('onOpenRecharge', ''))
    const { unmount } = render(
      <Login visible={result.current.loginShow} onCancel={() => result.current.setLoginShow(false)} />,
    )
    fireEvent.click(screen.getByRole('button', { name: '关闭企业登录' }))
    unmount()
    act(() => emiter.emit('onOpenRecharge', ''))
    render(<Login visible={result.current.loginShow} onCancel={() => result.current.setLoginShow(false)} />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(result.current.rechargeVisible).toBe(false)

    userInfo.isLogin = true
    rerender()
    expect(result.current.rechargeVisible).toBe(true)
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

  it('退出登录后充值监听使用最新状态，重复渲染不会累积监听', () => {
    userInfo.isLogin = true
    const { result, rerender, unmount } = renderMenu()
    act(() => emiter.emit('onOpenRecharge', ''))
    expect(result.current.rechargeVisible).toBe(true)
    act(() => result.current.setRechargeVisible(false))

    userInfo.isLogin = false
    rerender()
    rerender()
    expect(emiter.all.get('onOpenRecharge')).toHaveLength(1)
    act(() => emiter.emit('onOpenRecharge', ''))
    expect(result.current.loginShow).toBe(true)
    expect(result.current.rechargeVisible).toBe(false)

    unmount()
    expect(emiter.all.get('onOpenRecharge')).toHaveLength(0)
  })
})

describe('企业用户菜单首次展开', () => {
  it('首帧直接展示用户信息，不等待懒加载后再撑高菜单', () => {
    userInfo.isLogin = true
    userInfo.platform = 'company'
    userInfo.role = 'admin'
    const { result } = renderMenu()
    const item = result.current.userMenu.find((entry) => 'key' in entry && entry.key === 'user-info')
    if (!item || !('label' in item)) throw new Error('用户信息菜单缺失')
    render(<>{item.label}</>)
    expect(screen.getByText('菜单测试用户')).toBeInTheDocument()
  })
})

describe('头像登录生命周期', () => {
  it('企业登录结束后退出，再次点击头像可以重新打开登录框', () => {
    edition.enterprise = true
    const LoginEntry = () => {
      const menu = useUserMenu({ isEngineLink: false, dynamicConnect: false, avatarColor: { current: '' } })
      return (
        <>
          {!userInfo.isLogin && <button onClick={() => menu.setLoginShow(true)}>头像登录</button>}
          {menu.loginShow && <Login visible onCancel={() => menu.setLoginShow(false)} />}
        </>
      )
    }
    const { rerender } = render(<LoginEntry />)
    for (let attempt = 0; attempt < 2; attempt++) {
      fireEvent.click(screen.getByRole('button', { name: '头像登录' }))
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      userInfo.isLogin = true
      fireEvent.click(screen.getByRole('button', { name: '关闭企业登录' }))
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      userInfo.isLogin = false
      rerender(<LoginEntry />)
    }
    fireEvent.click(screen.getByRole('button', { name: '头像登录' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
})
