import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NotepadMenu } from '../NotepadMenu'
import { openLatestOrNewNotepad } from '../utils'

const edition = vi.hoisted(() => ({ ee: false, agent: false }))

vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({ t: (key: string) => key, i18nRefresh: 0 }),
}))

vi.mock('@/utils/envfile', () => ({
  isEnpriTrace: () => edition.ee,
  isEnpriTraceAgent: () => edition.agent,
  isIRify: () => false,
}))

vi.mock('../utils', () => ({
  getNotepadNameByEditionMulLang: () => '记事本',
  getNotepadManage: () => '记事本管理',
  getNotepadAdd: () => '新建记事本',
  openLatestOrNewNotepad: vi.fn(),
}))

describe('NotepadMenu', () => {
  beforeEach(() => {
    edition.ee = false
    edition.agent = false
    vi.mocked(openLatestOrNewNotepad).mockClear()
  })

  it('简易企业版不展示记事本入口', () => {
    edition.agent = true
    const { container } = render(<NotepadMenu />)
    expect(container).toBeEmptyDOMElement()
  })

  it('社区版点击图标会打开最近记事本', () => {
    const { container } = render(<NotepadMenu />)
    const icon = container.querySelector('svg')
    expect(icon).toBeTruthy()
    fireEvent.click(icon as SVGElement)
    expect(openLatestOrNewNotepad).toHaveBeenCalled()
  })

  it('企业版点击图标不会直接打开，而是弹出菜单', () => {
    edition.ee = true
    const { container } = render(<NotepadMenu />)
    const icon = container.querySelector('svg')
    fireEvent.click(icon as SVGElement)
    expect(openLatestOrNewNotepad).not.toHaveBeenCalled()
    expect(screen.getByText('记事本管理')).toBeInTheDocument()
    expect(screen.getByText('新建记事本')).toBeInTheDocument()
  })
})
