import type { MouseEvent, ReactNode } from 'react'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ModalCards from '../ModalCards'
import type { CardData } from '../ModalCards'

vi.mock('motion/react', async () => {
  const React = await import('react')
  const motion = new Proxy(
    {},
    {
      get: (_target, tag: string) => {
        type MotionTagProps = React.HTMLAttributes<HTMLElement> &
          React.ImgHTMLAttributes<HTMLImageElement> & {
            layoutId?: unknown
            initial?: unknown
            animate?: unknown
            exit?: unknown
            transition?: unknown
            whileTap?: unknown
            whileHover?: unknown
          }
        const Comp = React.forwardRef<HTMLElement, MotionTagProps>(function MotionTag(
          { children, onClick, className, style, role, 'aria-label': ariaLabel, tabIndex, alt, src, ...rest },
          ref,
        ) {
          const el =
            tag === 'img' ? 'img' : tag === 'button' ? 'button' : tag === 'h3' ? 'h3' : tag === 'p' ? 'p' : 'div'
          const extra = Object.fromEntries(
            Object.entries(rest).filter(
              ([key]) =>
                !['layoutId', 'initial', 'animate', 'exit', 'transition', 'whileTap', 'whileHover'].includes(key),
            ),
          )
          return React.createElement(
            el,
            {
              ref,
              onClick,
              className,
              style,
              role,
              'aria-label': ariaLabel,
              tabIndex,
              alt,
              src,
              'data-motion': tag,
              ...extra,
            },
            children,
          )
        })
        Comp.displayName = `motion.${tag}`
        return Comp
      },
    },
  )
  return {
    motion,
    AnimatePresence: ({ children }: { children?: React.ReactNode }) => children,
  }
})
vi.mock('../ModalCards.css', () => ({}))
vi.mock('@/components/yakitUI/YakitButton/YakitButton', () => ({
  YakitButton: ({
    children,
    onClick,
    disabled,
    'aria-label': ariaLabel,
  }: {
    children?: ReactNode
    onClick?: (e: MouseEvent<HTMLButtonElement>) => void
    disabled?: boolean
    'aria-label'?: string
  }) => (
    <button type="button" onClick={onClick} disabled={disabled} aria-label={ariaLabel}>
      {children}
    </button>
  ),
}))
vi.mock('@yakit-libs/yakit-ui-icons/outline', () => ({
  XOutlined: () => null,
}))

const cards: CardData[] = [
  { id: 'a', imageUrl: 'a.png', title: '卡片甲', description: '描述甲' },
  { id: 'b', imageUrl: 'b.png', title: '卡片乙', description: '描述乙' },
]

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

const flushMount = async () => {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
}

describe('ModalCards', () => {
  it('点击卡片后弹层展开', async () => {
    render(<ModalCards cards={cards} animationSpeed="none" />)
    await flushMount()
    fireEvent.click(screen.getByText('卡片甲'))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getAllByText('卡片甲').length).toBeGreaterThan(1)
    const backdrop = document.querySelector('.modal-backdrop') as HTMLElement
    expect(backdrop.getAttribute('style') || '').not.toContain('light-dark')
    expect(backdrop.style.getPropertyValue('--modal-gradient')).toBe('')
    expect(backdrop.style.getPropertyValue('--modal-backdrop-pos')).toBe('')
  })

  it('有步骤时展开成分步手册，知道了可关闭', async () => {
    const guideCards: CardData[] = [
      {
        id: 'guide',
        imageUrl: 'a.png',
        title: '越权测试',
        description: '简介',
        confirmLabel: '知道了',
        steps: [
          {
            title: '第一步：下载 YTray',
            items: [{ images: ['a.png'] }],
          },
        ],
      },
    ]
    render(<ModalCards cards={guideCards} animationSpeed="none" />)
    await flushMount()
    fireEvent.click(screen.getByText('越权测试'))
    expect(screen.getByText('第一步：下载 YTray')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '知道了' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('手册内可用上一个下一个切换场景，知道了在右侧关闭', async () => {
    const guideCards: CardData[] = [
      {
        id: 'a',
        imageUrl: 'a.png',
        title: '场景甲',
        description: '简介甲',
        confirmLabel: '知道了',
        steps: [{ title: '甲第一步', items: [{ images: ['a.png'] }] }],
      },
      {
        id: 'b',
        imageUrl: 'b.png',
        title: '场景乙',
        description: '简介乙',
        confirmLabel: '知道了',
        steps: [{ title: '乙第一步', items: [{ images: ['b.png'] }] }],
      },
    ]
    render(<ModalCards cards={guideCards} animationSpeed="none" prevLabel="上一个" nextLabel="下一个" />)
    await flushMount()
    fireEvent.click(screen.getByText('场景甲'))
    expect(screen.getByText('甲第一步')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '上一个' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: '下一个' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('乙第一步')).toBeInTheDocument()
    expect(screen.queryByText('甲第一步')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '下一个' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: '上一个' }))
    expect(screen.getByText('甲第一步')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '知道了' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('banner 点整条不展开，点页脚按钮才展开', async () => {
    const bannerCards: CardData[] = [
      {
        id: 'idor',
        imageUrl: 'a.png',
        title: '多账号越权测试',
        description: '简介',
        variant: 'banner',
        expandTrigger: 'footer',
        footer: <button type="button">阅读文档</button>,
        steps: [{ title: '第一步', items: [{ images: ['a.png'] }] }],
      },
    ]
    render(<ModalCards cards={bannerCards} animationSpeed="none" />)
    await flushMount()
    fireEvent.click(screen.getByText('多账号越权测试'))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '阅读文档' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('第一步')).toBeInTheDocument()
  })

  it('Escape 与关闭按钮可收起', async () => {
    render(<ModalCards cards={cards} animationSpeed="none" closeLabel="关闭" />)
    await flushMount()
    fireEvent.click(screen.getByText('卡片甲'))
    fireEvent.click(screen.getByRole('dialog').querySelector('button[aria-label="关闭"]') as HTMLButtonElement)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    fireEvent.click(screen.getByText('卡片甲'))
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
