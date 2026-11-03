import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CodeGV } from '@/yakitGV'
import { getRemoteValue, setRemoteValue } from '@/utils/kv'
import { yakitFailed } from '@/utils/notification'
import { useMenuHeight } from '../menuHeight'

vi.mock('@/utils/kv', () => ({ getRemoteValue: vi.fn(), setRemoteValue: vi.fn() }))
vi.mock('@/utils/notification', () => ({ yakitFailed: vi.fn() }))

describe('菜单布局状态', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    useMenuHeight.getState().toggleMenuVisibility.cancel()
    vi.resetAllMocks()
    vi.mocked(getRemoteValue).mockResolvedValue('')
    vi.mocked(setRemoteValue).mockResolvedValue(undefined)
    useMenuHeight.setState({
      menuBodyHeight: { firstTabMenuBodyHeight: 0 },
      isMenuVisible: true,
      isMenuVisibilityLoading: false,
    })
  })

  afterEach(() => {
    useMenuHeight.getState().toggleMenuVisibility.cancel()
    vi.useRealTimers()
  })

  it('切换菜单显隐写入缓存并保留已测量的高度', async () => {
    useMenuHeight.getState().updateMenuBodyHeight({ firstTabMenuBodyHeight: 400 })
    await useMenuHeight.getState().toggleMenuVisibility()
    expect(useMenuHeight.getState().isMenuVisible).toBe(false)
    expect(setRemoteValue).toHaveBeenNthCalledWith(1, CodeGV.MenuVisible, 'false')
    expect(useMenuHeight.getState().menuBodyHeight.firstTabMenuBodyHeight).toBe(400)
    vi.advanceTimersByTime(500)
    expect(setRemoteValue).toHaveBeenCalledTimes(1)
    await useMenuHeight.getState().toggleMenuVisibility()
    expect(useMenuHeight.getState().isMenuVisible).toBe(true)
    expect(setRemoteValue).toHaveBeenNthCalledWith(2, CodeGV.MenuVisible, 'true')
    expect(useMenuHeight.getState().menuBodyHeight.firstTabMenuBodyHeight).toBe(400)
  })

  it('首次点击立即执行，连续点击停止 500ms 后执行尾部调用', () => {
    const toggle = useMenuHeight.getState().toggleMenuVisibility
    toggle()
    expect(useMenuHeight.getState().isMenuVisible).toBe(false)
    expect(setRemoteValue).toHaveBeenCalledExactlyOnceWith(CodeGV.MenuVisible, 'false')

    vi.advanceTimersByTime(400)
    toggle()
    vi.advanceTimersByTime(499)
    expect(useMenuHeight.getState().isMenuVisible).toBe(false)
    expect(setRemoteValue).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(1)
    expect(useMenuHeight.getState().isMenuVisible).toBe(true)
    expect(setRemoteValue).toHaveBeenNthCalledWith(2, CodeGV.MenuVisible, 'true')
    vi.advanceTimersByTime(500)
    toggle()
    expect(useMenuHeight.getState().isMenuVisible).toBe(false)
    expect(setRemoteValue).toHaveBeenNthCalledWith(3, CodeGV.MenuVisible, 'false')
  })

  it('菜单隐藏时更新高度不会重新显示菜单', () => {
    useMenuHeight.getState().toggleMenuVisibility()
    useMenuHeight.getState().updateMenuBodyHeight({ firstTabMenuBodyHeight: 360 })
    expect(useMenuHeight.getState().isMenuVisible).toBe(false)
    expect(useMenuHeight.getState().menuBodyHeight.firstTabMenuBodyHeight).toBe(360)
  })

  it.each([
    ['false', false],
    ['true', true],
    ['', true],
    ['invalid', true],
  ] as const)('从缓存 %s 恢复菜单显隐为 %s', async (cached, expected) => {
    vi.mocked(getRemoteValue).mockResolvedValue(cached)
    useMenuHeight.getState().updateMenuBodyHeight({ firstTabMenuBodyHeight: 400 })

    await useMenuHeight.getState().initMenuVisibility()

    expect(getRemoteValue).toHaveBeenCalledExactlyOnceWith(CodeGV.MenuVisible)
    expect(useMenuHeight.getState().isMenuVisible).toBe(expected)
    expect(useMenuHeight.getState().menuBodyHeight.firstTabMenuBodyHeight).toBe(400)
    expect(setRemoteValue).not.toHaveBeenCalled()
  })

  it('重叠初始化复用同一个请求，完成前禁止切换菜单', async () => {
    let resolveCache!: (value: string) => void
    vi.mocked(getRemoteValue).mockReturnValueOnce(
      new Promise<string>((resolve) => {
        resolveCache = resolve
      }),
    )
    const first = useMenuHeight.getState().initMenuVisibility()
    const second = useMenuHeight.getState().initMenuVisibility()

    expect(first).toBe(second)
    expect(getRemoteValue).toHaveBeenCalledExactlyOnceWith(CodeGV.MenuVisible)
    expect(useMenuHeight.getState().isMenuVisibilityLoading).toBe(true)
    useMenuHeight.getState().toggleMenuVisibility()
    expect(useMenuHeight.getState().isMenuVisible).toBe(true)
    expect(setRemoteValue).not.toHaveBeenCalled()

    resolveCache('false')
    await Promise.all([first, second])

    expect(useMenuHeight.getState().isMenuVisible).toBe(false)
    expect(useMenuHeight.getState().isMenuVisibilityLoading).toBe(false)
    vi.advanceTimersByTime(500)
    useMenuHeight.getState().toggleMenuVisibility()
    expect(useMenuHeight.getState().isMenuVisible).toBe(true)
    expect(setRemoteValue).toHaveBeenCalledExactlyOnceWith(CodeGV.MenuVisible, 'true')
  })

  it('初始化完成后再次初始化会重新读取缓存', async () => {
    vi.mocked(getRemoteValue).mockResolvedValueOnce('false').mockResolvedValueOnce('true')

    await useMenuHeight.getState().initMenuVisibility()
    expect(useMenuHeight.getState().isMenuVisible).toBe(false)
    await useMenuHeight.getState().initMenuVisibility()

    expect(getRemoteValue).toHaveBeenCalledTimes(2)
    expect(useMenuHeight.getState().isMenuVisible).toBe(true)
    expect(useMenuHeight.getState().isMenuVisibilityLoading).toBe(false)
  })

  it.each([true, false])('读取缓存失败时保留显隐状态 %s、解除 loading 并允许切换和重试', async (visible) => {
    const error = new Error('read failed')
    vi.mocked(getRemoteValue).mockRejectedValueOnce(error)
    useMenuHeight.setState({ isMenuVisible: visible })

    await useMenuHeight.getState().initMenuVisibility()

    expect(useMenuHeight.getState().isMenuVisible).toBe(visible)
    expect(useMenuHeight.getState().isMenuVisibilityLoading).toBe(false)
    expect(yakitFailed).toHaveBeenCalledExactlyOnceWith(String(error))
    useMenuHeight.getState().toggleMenuVisibility()
    expect(useMenuHeight.getState().isMenuVisible).toBe(!visible)
    expect(setRemoteValue).toHaveBeenCalledExactlyOnceWith(CodeGV.MenuVisible, String(!visible))
    await useMenuHeight.getState().initMenuVisibility()
    expect(getRemoteValue).toHaveBeenCalledTimes(2)
    expect(useMenuHeight.getState().isMenuVisible).toBe(true)
    expect(useMenuHeight.getState().isMenuVisibilityLoading).toBe(false)
  })

  it('写入缓存失败时仍切换菜单并提示错误', async () => {
    const error = new Error('write failed')
    vi.mocked(setRemoteValue).mockRejectedValue(error)

    await useMenuHeight.getState().toggleMenuVisibility()

    expect(useMenuHeight.getState().isMenuVisible).toBe(false)
    expect(yakitFailed).toHaveBeenCalledExactlyOnceWith(String(error))
  })
})
