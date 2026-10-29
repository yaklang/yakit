import { ipcRendererMock } from '@/pages/ai-re-act/hooks/__test__/setupElectron'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import PublicMenu from '../PublicMenu'
import styles from '../PublicMenu.module.scss'

const edition = vi.hoisted(() => ({ memfit: true }))
vi.mock('@/utils/envfile', () => ({
  isMemfit: () => edition.memfit,
  isCommunityYakit: () => !edition.memfit,
}))
vi.mock('@/routes/newRoute', () => ({
  ResidentPluginName: { SubDomainCollection: 'sub', BasicCrawler: 'crawler', DirectoryScanning: 'directory' },
  InvalidFirstMenuItem: [],
  InvalidPageMenuItem: [],
  PublicCommonPlugins: [],
  databaseConvertData: () => [],
  getPublicRouteMenu: () => ['AI', '插件', '数据库'].map((label) => ({ label, children: [] })),
  getSecurityExpertLeftMenu: () => [],
}))
vi.mock('@/store', () => ({ useStore: () => ({ userInfo: {} }) }))
vi.mock('@/store/publicMenu', () => ({ usePluginToId: () => ({ setNewPluginToId: vi.fn() }) }))
vi.mock('@/store/softMode', () => ({
  useSoftMode: () => ({ softMode: 'classic' }),
  YakitModeEnum: { SecurityExpert: 'expert' },
}))
vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({ t: (key: string) => key, i18nRefresh: 0 }),
}))
vi.mock('@/utils/kv', () => ({ getRemoteValue: vi.fn().mockResolvedValue('{}'), setRemoteValue: vi.fn() }))
vi.mock('@/utils/notification', () => ({ yakitNotify: vi.fn() }))
vi.mock('@/utils/tool', () => ({ JSONParseLog: JSON.parse }))
vi.mock('@/pages/pluginHub/utils/grpc', () => ({ grpcFetchLocalPluginDetail: vi.fn() }))
vi.mock('@/pages/hacker/httpHacker', () => ({ toMITMHacker: vi.fn() }))
vi.mock('@/components/managementTab', () => ({ ManagementTab: () => null }))
vi.mock('@/components/yakitUI/YakitButton/YakitButton', () => ({ YakitButton: () => null }))
vi.mock('@/components/yakitUI/YakitPopover/YakitPopover', () => ({ YakitPopover: () => null }))
vi.mock('@/components/yakitUI/YakitMenu/YakitMenu', () => ({ YakitMenu: () => null }))
vi.mock('@/components/yakitUI/YakitModal/YakitModalConfirm', () => ({ YakitModalConfirm: vi.fn() }))
vi.mock('../ExtraMenu', () => ({ ExtraMenu: () => null, OrdinaryMenu: () => null }))
vi.mock('../MenuMode', () => ({ MenuMode: () => null }))
vi.mock('../MenuCodec', () => ({ MenuCodec: () => <div data-testid="codec-content" /> }))
vi.mock('../MenuDNSLog', () => ({ MenuDNSLog: () => <div data-testid="dnslog-content" /> }))
vi.mock('../MenuPlugin', () => ({ MenuPlugin: () => <div data-testid="plugin-content" /> }))

const renderMenu = async () => {
  await act(async () => {
    render(<PublicMenu defaultExpand onMenuSelect={vi.fn()} setRouteToLabel={vi.fn()} />)
  })
}

const expectTool = (active: 'codec' | 'dnslog') => {
  for (const tool of ['codec', 'dnslog']) {
    expect(screen.getByTestId(`${tool}-content`).parentElement).toHaveClass(
      styles[tool === active ? 'tool-nohidden-container' : 'tool-hidden-container'],
    )
  }
  expect(screen.getByTestId('codec-content').closest(`.${styles['tool-body']}`)).not.toBeNull()
}

describe('PublicMenu 工具区域', () => {
  beforeEach(() => {
    edition.memfit = true
    vi.useFakeTimers()
    ipcRendererMock.invoke.mockResolvedValue({ Data: [] })
  })
  afterEach(() => {
    cleanup()
    vi.clearAllTimers()
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('Memfit 展开菜单默认显示 Codec，支持切换 DNSLog 和切回', async () => {
    await renderMenu()
    expectTool('codec')
    fireEvent.click(screen.getByText('YakitRoute.DNSLog'))
    expectTool('dnslog')
    fireEvent.click(screen.getByText('YakitRoute.Codec'))
    expectTool('codec')
  })

  it('Memfit 切换三个主菜单后工具区域保持显示，不显示常用插件面板', async () => {
    await renderMenu()
    fireEvent.click(screen.getByText('YakitRoute.DNSLog'))
    for (const menu of ['插件', '数据库', 'AI']) {
      fireEvent.click(screen.getByText(menu))
      expectTool('dnslog')
      expect(screen.queryByTestId('plugin-content')).not.toBeInTheDocument()
    }
  })

  it('非 Memfit 插件菜单保留常用插件面板并隐藏工具区域', async () => {
    edition.memfit = false
    await renderMenu()
    expectTool('codec')
    fireEvent.click(screen.getByText('插件'))
    expect(screen.getByTestId('plugin-content')).toBeInTheDocument()
    expect(screen.getByTestId('codec-content').closest(`.${styles['hide-tool-body']}`)).not.toBeNull()
    fireEvent.click(screen.getByText('数据库'))
    expectTool('codec')
    expect(screen.queryByTestId('plugin-content')).not.toBeInTheDocument()
  })
})
