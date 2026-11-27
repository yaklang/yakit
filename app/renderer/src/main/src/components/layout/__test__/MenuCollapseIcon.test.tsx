import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MenuCollapseIcon } from '../MenuCollapseIcon'

const OPEN_BARS = 'M2.5 3.333 H17.5 M2.5 16.667 H17.5'
const COLLAPSED_BARS = 'M2.5 3.333 H17.5 M2.5 8.333 H17.5'
const OPEN_ARROW = 'M10 7.5 L10 14.167 M8.333 9.323 L10 7.5 L11.667 9.323'
const COLLAPSED_ARROW = 'M10 10.833 L10 17.5 M8.333 15.833 L10 17.5 L11.667 15.833'

const pathDs = (container: HTMLElement) =>
  Array.from(container.querySelectorAll('path')).map((path) => path.getAttribute('d'))

describe('MenuCollapseIcon', () => {
  it('defaults to the open (menu visible) shape', () => {
    const { container } = render(<MenuCollapseIcon />)
    expect(container.querySelector('svg')).not.toHaveAttribute('data-collapsed')
    expect(pathDs(container)).toEqual([OPEN_BARS, OPEN_ARROW])
  })

  it('marks the collapsed shape used when the menu is hidden', () => {
    const { container } = render(<MenuCollapseIcon collapsed />)
    expect(container.querySelector('svg')).toHaveAttribute('data-collapsed', 'true')
    expect(pathDs(container)).toEqual([COLLAPSED_BARS, COLLAPSED_ARROW])
  })
})
