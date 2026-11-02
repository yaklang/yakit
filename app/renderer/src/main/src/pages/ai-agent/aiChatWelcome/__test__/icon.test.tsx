import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  ColorsFileSystemIcon,
  ColorsFlowIcon,
  ColorsKnowledgeBaseIcon,
  ColorsRiskIcon,
  ColorsSkillIcon,
  ColorsToolIcon,
} from '../icon'

const icons = [
  ['risk', ColorsRiskIcon],
  ['flow', ColorsFlowIcon],
  ['file-system', ColorsFileSystemIcon],
  ['knowledge-base', ColorsKnowledgeBaseIcon],
  ['skill', ColorsSkillIcon],
  ['tool', ColorsToolIcon],
] as const

afterEach(cleanup)

describe('AIChatWelcome icons', () => {
  it.each(icons)('%s preserves the design size and forwards icon props', (name, Component) => {
    const onClick = vi.fn()
    render(<Component aria-label={name} className="welcome-icon" style={{ marginRight: 8 }} onClick={onClick} />)

    const icon = screen.getByRole('img', { name })
    expect(icon).toHaveClass('welcome-icon')
    expect(icon).toHaveStyle({ marginRight: '8px' })
    const svg = icon.querySelector('svg')!
    expect(svg).toHaveAttribute('width', '40')
    expect(svg).toHaveAttribute('height', '40')
    expect(svg).toHaveAttribute('viewBox', '0 0 40 40')
    expect(svg.querySelector('path')).not.toBeNull()

    fireEvent.click(icon)
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('isolates gradients, masks and filters when multiple instances share a document', () => {
    const { container } = render(
      <>
        {icons.map(([name, Component]) => (
          <div key={name}>
            <Component />
            <Component />
          </div>
        ))}
      </>,
    )

    const ids = Array.from(container.querySelectorAll('[id]'), (element) => element.id)
    expect(new Set(ids).size).toBe(ids.length)

    for (const svg of container.querySelectorAll('svg')) {
      const localIds = new Set(Array.from(svg.querySelectorAll('[id]'), (element) => element.id))
      for (const element of svg.querySelectorAll('*')) {
        for (const attribute of element.attributes) {
          for (const reference of attribute.value.matchAll(/url\(#([^)]+)\)/g)) {
            expect(localIds.has(reference[1])).toBe(true)
          }
          if (attribute.name === 'href') {
            expect(localIds.has(attribute.value.slice(1))).toBe(true)
          }
        }
      }
    }
  })
})
