import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { GuideFooter } from '../GuideFooter'

vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({ t: (key: string) => key, i18n: { language: 'zh' } }),
}))
vi.mock('@/components/yakitUI/YakitButton/YakitButton', () => ({
  YakitButton: ({ children, onClick }: { children?: React.ReactNode; onClick?: () => void }) => (
    <button type="button" onClick={onClick}>
      {children}
    </button>
  ),
}))

describe('GuideFooter', () => {
  it('mp4 源渲染 video', () => {
    render(<GuideFooter stopList={[{ title: '知识库可用性诊断', description: 'desc', images: '/guide/first.mp4' }]} />)
    const video = document.querySelector('video')
    expect(video).toBeTruthy()
    expect(video?.getAttribute('src')).toBe('/guide/first.mp4')
    expect(document.querySelector('img')).toBeNull()
  })

  it('png 源渲染 img', () => {
    render(<GuideFooter stopList={[{ title: '模型限免', description: 'desc', images: '/whats-new-1.png' }]} />)
    const img = document.querySelector('img')
    expect(img).toBeTruthy()
    expect(img?.getAttribute('src')).toBe('/whats-new-1.png')
    expect(document.querySelector('video')).toBeNull()
  })

  it('finishText 覆盖默认开始文案', () => {
    render(<GuideFooter finishText="知道了" stopList={[{ title: '模型限免', description: 'desc' }]} />)
    expect(screen.getByRole('button', { name: '知道了' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'GuideFooter.start' })).toBeNull()
  })

  it('未传 finishText 时使用默认开始文案', () => {
    render(<GuideFooter stopList={[{ title: '知识库可用性诊断', description: 'desc' }]} />)
    expect(screen.getByRole('button', { name: 'GuideFooter.start' })).toBeTruthy()
  })
})
