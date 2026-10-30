import '@/pages/ai-re-act/hooks/__test__/setupElectron'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { YakitRoute } from '@/enums/yakitRoute'
import { YakitModeEnum } from '@/store/softMode'
import { getPublicRouteMenu, ResidentPluginName, YakitRouteToPageInfo } from '@/routes/newRoute'
import type { PublicRouteMenuProps } from '@/routes/newRoute'
import { MenuMode } from '../MenuMode'
import { MemfitMemoryIcon } from '../memfitMenuIcon'
import styles from '../MenuMode.module.scss'

const edition = vi.hoisted(() => ({ current: 'memfit' }))

vi.mock('@/utils/envfile', () => ({
  isMemfit: () => edition.current === 'memfit',
  isIRify: () => edition.current === 'irify',
  isYakit: () => edition.current === 'yakit',
  isCommunityYakit: () => edition.current === 'yakit',
  isCommunityEdition: () => true,
  isEnpriTraceAgent: () => false,
  isEnpriTrace: () => false,
}))

vi.mock('@/pages/layout/NotepadMenu/utils', () => ({
  getNotepadManage: () => '记事本管理',
  getNotepadNameByEditionMulLang: () => '记事本',
}))

vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({ t: (key: string) => key, i18n: { language: 'zh' } }),
}))

vi.mock('@/store/httpFlow', () => ({
  useHttpFlowStore: () => ({ resetCompareData: vi.fn() }),
}))

const aiRoutes = [
  YakitRoute.AI_Agent,
  YakitRoute.AI_REPOSITORY,
  YakitRoute.AI_Memory,
  YakitRoute.AI_Tool,
  YakitRoute.AI_Forge,
]

const pluginToId = {
  [ResidentPluginName.SubDomainCollection]: 0,
  [ResidentPluginName.BasicCrawler]: 0,
  [ResidentPluginName.DirectoryScanning]: 0,
}

describe('Memfit 公共菜单', () => {
  beforeEach(() => {
    edition.current = 'memfit'
  })
  afterEach(cleanup)

  it('AI 子菜单按设计顺序分组，插件仓库保留自身子入口', () => {
    const menus: PublicRouteMenuProps[] = getPublicRouteMenu(undefined)
    expect(menus.map((item) => item.page)).toEqual([undefined, undefined, undefined])
    expect(menus[0]).toMatchObject({ label: 'AI', labelUi: 'YakitRoute.ai' })
    expect(menus[1]).toMatchObject({ label: '插件', labelUi: 'YakitRoute.plugin' })
    expect(menus[0].children?.map((item) => item.page)).toEqual(aiRoutes)
    expect(menus[1].children).toEqual([{ page: YakitRoute.Plugin_Hub, ...YakitRouteToPageInfo[YakitRoute.Plugin_Hub] }])
    for (const child of menus[0].children ?? []) {
      expect(child).toEqual({ page: child.page, ...YakitRouteToPageInfo[child.page!] })
      expect(child.children).toBeUndefined()
    }
  })

  it('展开 AI 分组展示五个本地图标，点击依次打开对应路由', () => {
    const menu = getPublicRouteMenu(undefined)[0]
    const onMenuSelect = vi.fn()
    const { container } = render(<MenuMode mode={menu.label} pluginToId={pluginToId} onMenuSelect={onMenuSelect} />)
    const wrapper = container.firstElementChild!
    expect(wrapper.children).toHaveLength(3)
    expect(wrapper.children[0]).toHaveClass(styles['vertical-menu-wrapper'])
    expect(wrapper.children[1]).toHaveClass(styles['divider-style'])
    expect(wrapper.children[2]).toHaveClass(styles['multiple-vertical-menu-wrapper'])
    expect(wrapper.children[2].children).toHaveLength(4)
    const icons = container.querySelectorAll('.anticon > svg')
    expect(icons).toHaveLength(5)
    expect(Array.from(icons, (icon) => icon.getAttribute('width'))).toEqual(['44', '32', '32', '32', '32'])
    for (const icon of icons) {
      expect(icon.querySelector('path')).not.toBeNull()
      expect(icon.querySelector('use, image')).toBeNull()
      expect(icon.querySelector('[fill="var(--Colors-Use-Main-Primary)"]')).not.toBeNull()
      for (const element of icon.querySelectorAll('[fill], [stroke]')) {
        for (const attribute of ['fill', 'stroke']) {
          const color = element.getAttribute(attribute)
          if (color) expect(color).toMatch(/^(none|var\(--Colors-Use-.+\))$/)
        }
      }
    }
    for (const route of aiRoutes) {
      fireEvent.click(screen.getByText(YakitRouteToPageInfo[route].labelUi!))
    }
    expect(onMenuSelect.mock.calls).toEqual(aiRoutes.map((route) => [{ route }]))
  })

  it('记忆库图标重复渲染时各自使用独立的透明度蒙版', () => {
    const { container } = render(
      <>
        <MemfitMemoryIcon />
        <MemfitMemoryIcon />
      </>,
    )
    const masks = Array.from(container.querySelectorAll('mask'))
    expect(masks).toHaveLength(4)
    expect(new Set(masks.map((mask) => mask.id)).size).toBe(4)
    for (const mask of masks) {
      expect(mask).toHaveStyle({ maskType: 'alpha' })
      expect(mask.closest('svg')?.querySelector(`[mask="url(#${mask.id})"]`)).not.toBeNull()
    }
  })

  it.each(['memfit', 'yakit'])('%s 插件仓库使用设计稿的 44px 商店图标', (current) => {
    edition.current = current
    const onMenuSelect = vi.fn()
    const { container } = render(<MenuMode mode="插件" pluginToId={pluginToId} onMenuSelect={onMenuSelect} />)
    const icon = container.querySelector('svg')!
    expect(icon).toHaveAttribute('width', '44')
    expect(icon).toHaveAttribute('height', '44')
    expect(icon.querySelectorAll('path')).toHaveLength(11)
    expect(icon.querySelector('[fill="var(--Colors-Use-Main-Primary)"]')).not.toBeNull()
    expect(icon.querySelector('[fill="var(--Colors-Use-Main-Border)"]')).not.toBeNull()
    expect(icon.querySelector('image, use')).toBeNull()
    fireEvent.click(screen.getByText('YakitRoute.pluginHub'))
    expect(onMenuSelect).toHaveBeenCalledExactlyOnceWith({ route: YakitRoute.Plugin_Hub })
  })

  it('展开插件仓库只有插件入口，不显示批量执行', () => {
    const menu = getPublicRouteMenu(undefined)[1]
    const onMenuSelect = vi.fn()
    render(<MenuMode mode={menu.label} pluginToId={pluginToId} onMenuSelect={onMenuSelect} />)
    fireEvent.click(screen.getByText(YakitRouteToPageInfo[YakitRoute.Plugin_Hub].labelUi!))
    expect(onMenuSelect).toHaveBeenCalledExactlyOnceWith({ route: YakitRoute.Plugin_Hub })
    expect(screen.queryByText('YakitRoute.batchExecute')).not.toBeInTheDocument()
  })

  it('非 Memfit 插件菜单保留插件仓库、分隔线和批量执行', () => {
    edition.current = 'yakit'
    const onMenuSelect = vi.fn()
    const { container } = render(<MenuMode mode="插件" pluginToId={pluginToId} onMenuSelect={onMenuSelect} />)
    expect(container.firstElementChild?.children).toHaveLength(3)
    fireEvent.click(screen.getByText('YakitRoute.pluginHub'))
    fireEvent.click(screen.getByText('YakitRoute.batchExecute'))
    expect(onMenuSelect.mock.calls).toEqual([
      [{ route: YakitRoute.Plugin_Hub }],
      [{ route: YakitRoute.BatchExecutorPage }],
    ])
  })

  it('数据库菜单保留既有入口和顺序', () => {
    const menu = getPublicRouteMenu(undefined)[2]
    expect(menu.children?.map((item) => item.page)).toEqual([
      YakitRoute.DB_HTTPHistory,
      YakitRoute.DB_Report,
      YakitRoute.DB_Risk,
      YakitRoute.DB_Ports,
      YakitRoute.DB_Domain,
      YakitRoute.FingerprintManage,
      YakitRoute.DB_CVE,
    ])
  })

  it('Yakit 保留原有主菜单，不展示 Memfit 的 AI 展开菜单', () => {
    edition.current = 'yakit'
    expect(getPublicRouteMenu(YakitModeEnum.Classic)[0].label).toBe('渗透测试')
    render(<MenuMode mode="AI" pluginToId={pluginToId} onMenuSelect={vi.fn()} />)
    expect(screen.queryByText('YakitRoute.AIAgent')).not.toBeInTheDocument()
    expect(screen.queryByText('YakitRoute.ai-repository')).not.toBeInTheDocument()
    expect(screen.queryByText('YakitRoute.ai-memory')).not.toBeInTheDocument()
  })

  it('IRify 仍使用代码审计及报告菜单', () => {
    edition.current = 'irify'
    const menus = getPublicRouteMenu(undefined)
    expect(menus.map((item) => item.label)).toEqual(['代码审计', '数据库'])
    expect(menus[1].children?.map((item) => item.page)).toEqual([YakitRoute.DB_Report])
  })
})
