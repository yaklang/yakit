import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import YakitStripedProgress from '../YakitStripedProgress/YakitStripedProgress'

describe('YakitStripedProgress', () => {
  it('支持调用方指定进度和颜色', () => {
    const { container } = render(<YakitStripedProgress percent={25} color="red" label="Context" />)
    expect(screen.getByRole('progressbar', { name: 'Context' })).toHaveAttribute('aria-valuenow', '25')
    expect(container.querySelector('[style]')).toHaveStyle({ width: '25%', background: 'red' })
  })

  it.each([
    [125, 100],
    [-10, 0],
  ])('将越界进度 %s 限制在可见范围', (percent, expected) => {
    render(<YakitStripedProgress percent={percent} label="Context" valueText={`${percent}%`} />)
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', String(expected))
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuetext', `${percent}%`)
  })

  it('未知进度不报告已用 0%', () => {
    render(<YakitStripedProgress label="Context" />)
    expect(screen.getByRole('progressbar')).not.toHaveAttribute('aria-valuenow')
  })
})
