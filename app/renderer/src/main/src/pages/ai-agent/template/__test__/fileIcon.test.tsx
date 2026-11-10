import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { FileExcelIcon, FilePdfIcon, FilePptIcon, FileUnknownIcon, FileWordIcon } from '../fileIcon'

const icons = [
  ['Unknown', FileUnknownIcon],
  ['PPT', FilePptIcon],
  ['Excel', FileExcelIcon],
  ['PDF', FilePdfIcon],
  ['Word', FileWordIcon],
] as const

afterEach(cleanup)

describe('file icons', () => {
  it.each(icons)('%s 保留设计尺寸并转发图标属性', (name, Component) => {
    const onClick = vi.fn()
    render(<Component aria-label={name} className="file-icon" style={{ opacity: 0.8 }} onClick={onClick} />)
    const icon = screen.getByRole('img', { name })
    expect(icon).toHaveClass('file-icon')
    expect(icon).toHaveStyle({ opacity: 0.8 })
    const svg = icon.querySelector('svg')!
    expect(svg).toHaveAttribute('viewBox', '0 0 48 48')
    expect(svg).toHaveAttribute('width', '48')
    expect(svg).toHaveAttribute('height', '48')
    fireEvent.click(icon)
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('同类图标重复显示时，裁剪路径不会相互引用', () => {
    const { container } = render(
      <>
        {icons.flatMap(([name, Component]) => [
          <Component key={`${name}-first`} />,
          <Component key={`${name}-second`} />,
        ])}
      </>,
    )
    const ids = Array.from(container.querySelectorAll('[id]'), (element) => element.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const svg of container.querySelectorAll('svg')) {
      const clipId = svg.querySelector('clipPath')!.id
      expect(svg.querySelector('g')).toHaveAttribute('clip-path', `url(#${clipId})`)
    }
  })
})
