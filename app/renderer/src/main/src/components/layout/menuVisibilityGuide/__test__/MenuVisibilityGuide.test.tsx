import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LocalGVS } from '@/enums/localGlobal'
import { getLocalValue, setLocalValue } from '@/utils/kv'
import {
  MENU_VISIBILITY_GUIDE_HEADER_TARGET,
  MENU_VISIBILITY_GUIDE_TAB_ADD_TARGET,
  MenuVisibilityGuide,
} from '../MenuVisibilityGuide'

vi.mock('@/utils/kv', () => ({
  getLocalValue: vi.fn(),
  setLocalValue: vi.fn(),
}))
const edition = vi.hoisted(() => ({ current: 'memfit' }))

vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({ t: (key: string) => key }),
}))
vi.mock('@/utils/envfile', () => ({
  isMemfit: () => edition.current === 'memfit',
  isIRify: () => edition.current === 'irify',
  isYakit: () => edition.current === 'yakit',
}))
vi.mock('../image/menu-guide-step-1-irify.gif', () => ({ default: 'menu-guide-step-1-irify.gif' }))
vi.mock('../image/menu-guide-step-1-memfit.gif', () => ({ default: 'menu-guide-step-1-memfit.gif' }))
vi.mock('../image/menu-guide-step-1-yakit.gif', () => ({ default: 'menu-guide-step-1-yakit.gif' }))
vi.mock('../image/menu-guide-step-2-irify.gif', () => ({ default: 'menu-guide-step-2-irify.gif' }))
vi.mock('../image/menu-guide-step-2-memfit.gif', () => ({ default: 'menu-guide-step-2-memfit.gif' }))
vi.mock('../image/menu-guide-step-2-yakit.gif', () => ({ default: 'menu-guide-step-2-yakit.gif' }))

const renderGuide = () =>
  render(
    <>
      <div className={MENU_VISIBILITY_GUIDE_HEADER_TARGET}>header</div>
      <div className={MENU_VISIBILITY_GUIDE_TAB_ADD_TARGET}>tab-add</div>
      <MenuVisibilityGuide />
    </>,
  )

describe('菜单显隐引导', () => {
  beforeEach(() => {
    edition.current = 'memfit'
    vi.mocked(getLocalValue).mockResolvedValue('')
    vi.mocked(setLocalValue).mockReset()
  })
  afterEach(() => {
    cleanup()
  })

  it('未看过引导时展示第一步标题、描述和示意图', async () => {
    renderGuide()
    expect(await screen.findByText('UILayout.menuGuideStep1Title')).toBeInTheDocument()
    expect(screen.getByText('UILayout.menuGuideStep1Desc')).toBeInTheDocument()
    expect(document.querySelector('img')?.getAttribute('src')).toBe('menu-guide-step-1-memfit.gif')
    expect(screen.getByText('1/2')).toBeInTheDocument()
  })

  it.each([true, 'true'] as const)('已看过引导时不展示（%s）', async (seen) => {
    vi.mocked(getLocalValue).mockResolvedValue(seen)
    renderGuide()
    await act(async () => {
      await Promise.resolve()
    })
    expect(screen.queryByText('UILayout.menuGuideStep1Title')).not.toBeInTheDocument()
  })

  it('读取已读缓存失败时仍展示引导', async () => {
    vi.mocked(getLocalValue).mockRejectedValue(new Error('read failed'))
    renderGuide()
    expect(await screen.findByText('UILayout.menuGuideStep1Title')).toBeInTheDocument()
  })

  it('标签加号晚出现时仍连成两步', async () => {
    const Harness = ({ showAdd }: { showAdd: boolean }) => (
      <>
        <div className={MENU_VISIBILITY_GUIDE_HEADER_TARGET}>header</div>
        {showAdd ? <div className={MENU_VISIBILITY_GUIDE_TAB_ADD_TARGET}>tab-add</div> : null}
        <MenuVisibilityGuide />
      </>
    )
    const { rerender } = render(<Harness showAdd={false} />)
    expect(screen.queryByText('UILayout.menuGuideStep1Title')).not.toBeInTheDocument()
    rerender(<Harness showAdd={true} />)
    expect(await screen.findByText('UILayout.menuGuideStep1Title')).toBeInTheDocument()
    expect(screen.getByText('1/2')).toBeInTheDocument()
  })

  it.each([
    ['yakit', 'menu-guide-step-1-yakit.gif'],
    ['irify', 'menu-guide-step-1-irify.gif'],
    ['memfit', 'menu-guide-step-1-memfit.gif'],
  ] as const)('%s 第一步使用对应示意图', async (current, src) => {
    edition.current = current
    renderGuide()
    expect(await screen.findByText('UILayout.menuGuideStep1Title')).toBeInTheDocument()
    expect(document.querySelector('img')?.getAttribute('src')).toBe(src)
  })

  it('下一步进入第二步，开始体验后写入已读缓存', async () => {
    renderGuide()
    fireEvent.click(await screen.findByRole('button', { name: 'YakitButton.next' }))
    expect(await screen.findByText('UILayout.menuGuideStep2Title')).toBeInTheDocument()
    expect(document.querySelector('img')?.getAttribute('src')).toBe('menu-guide-step-2-memfit.gif')
    expect(screen.getByText('2/2')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'YakitButton.prev' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'UILayout.menuGuideStart' }))
    await waitFor(() => expect(setLocalValue).toHaveBeenCalledWith(LocalGVS.MenuVisibilityGuideSeen, true))
    expect(screen.queryByText('UILayout.menuGuideStep2Title')).not.toBeInTheDocument()
  })
})
