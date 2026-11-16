import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AIColorful } from '@yakit-libs/yakit-ui-icons/colorful'
import { AtOutlined } from '@yakit-libs/yakit-ui-icons/outline'

afterEach(cleanup)

describe('template icons', () => {
  it.each([
    ['AI', AIColorful],
    ['At', AtOutlined],
  ] as const)('%s preserves the design size and forwards icon props', (name, Component) => {
    const onClick = vi.fn()
    render(<Component aria-label={name} className="template-icon" style={{ color: '#353639' }} onClick={onClick} />)

    const icon = screen.getByRole('img', { name })
    expect(icon).toHaveClass('template-icon')
    expect(icon).toHaveStyle({ color: '#353639' })
    const svg = icon.querySelector('svg')!
    expect(svg).toHaveAttribute('width', '24')
    expect(svg).toHaveAttribute('height', '24')
    expect(svg).toHaveAttribute('viewBox', '0 0 24 24')

    fireEvent.click(icon)
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('keeps gradient references local to each AI icon instance', () => {
    const { container } = render(
      <>
        <AIColorful />
        <AIColorful />
      </>,
    )

    const ids = Array.from(container.querySelectorAll('linearGradient[id]'), (element) => element.id)
    expect(ids).toHaveLength(6)
    expect(new Set(ids).size).toBe(ids.length)

    for (const svg of container.querySelectorAll('svg')) {
      const localIds = new Set(Array.from(svg.querySelectorAll('linearGradient[id]'), (element) => element.id))
      const paths = svg.querySelectorAll('path')
      expect(paths).toHaveLength(3)
      for (const path of paths) {
        const reference = path.getAttribute('stroke') ?? path.getAttribute('fill')
        expect(localIds.has(reference!.slice(5, -1))).toBe(true)
      }
    }
  })

  it('lets the At icon inherit its stroke color', () => {
    const { container } = render(<AtOutlined />)
    expect(container.querySelector('path')).toHaveAttribute('stroke', 'currentColor')
  })
})
