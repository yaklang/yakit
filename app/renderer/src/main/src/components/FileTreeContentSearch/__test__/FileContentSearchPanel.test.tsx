import React from 'react'
import '../../../pages/ai-re-act/hooks/__test__/setupElectron'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { FileContentSearchPanel } from '../FileContentSearchPanel'
const mocks = vi.hoisted(() => ({
  options: {} as any,
  search: vi.fn(),
  cancel: vi.fn(),
  searchType: vi.fn(),
  keyword: vi.fn(),
}))
vi.mock('../hooks/useFileContentSearch', () => ({
  useFileContentSearch: (options: any) => {
    mocks.options = options
    return {
      searchType: 'keyword',
      setSearchType: mocks.searchType,
      keyword: 'needle',
      setKeyword: mocks.keyword,
      onSearch: mocks.search,
      onCancelSearch: mocks.cancel,
      loading: true,
      searched: true,
      results: [],
    }
  },
}))
vi.mock('@/i18n/useI18nNamespaces', () => ({ useI18nNamespaces: () => ({ t: (key: string) => key }) }))
vi.mock('@/components/yakitUI/YakitSelect/YakitSelect', () => ({
  YakitSelect: ({ options, onChange, wrapperStyle, ...props }: any) => (
    <select {...props} onChange={(e) => onChange(e.target.value)}>
      {options.map((o: any) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  ),
}))
vi.mock('@/components/yakitUI/YakitCheckbox/YakitCheckbox', () => ({
  YakitCheckbox: ({ children, wrapperClassName, ...props }: any) => (
    <label>
      <input type="checkbox" {...props} />
      {children}
    </label>
  ),
}))
vi.mock('@/components/yakitUI/YakitButton/YakitButton', () => ({
  YakitButton: ({ children, type, ...props }: any) => <button {...props}>{children}</button>,
}))
vi.mock('@/components/yakitUI/YakitInput/YakitInput', () => ({
  YakitInput: {
    Search: ({ value, onSearch, onChange, wrapperStyle, allowClear, ...props }: any) => (
      <input
        {...props}
        value={value}
        onChange={onChange}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onSearch(value)
        }}
      />
    ),
  },
}))
beforeEach(() => {
  vi.clearAllMocks()
})
afterEach(cleanup)
describe('file search panel controls', () => {
  it('uses the preview scope and case option and forwards matching mode changes', () => {
    const roots = [{ path: 'C:/allowed' }],
      openedFiles = [{ path: 'C:/allowed/a.txt' }]
    render(<FileContentSearchPanel roots={roots} openedFiles={openedFiles} onOpen={vi.fn()} />)
    expect(mocks.options.roots).toEqual(roots)
    fireEvent.change(screen.getByLabelText('BatchFiles.scope'), { target: { value: 'open' } })
    fireEvent.click(screen.getByRole('checkbox'))
    expect(mocks.options).toEqual({ roots: openedFiles, ignoreCase: true })
    fireEvent.change(screen.getByLabelText('BatchFiles.mode'), { target: { value: 'regexp' } })
    expect(mocks.searchType).toHaveBeenCalledWith('regexp')
  })
  it('submits on Enter and keeps cancellation reachable while a search is pending', () => {
    render(<FileContentSearchPanel roots={[]} openedFiles={[]} onOpen={vi.fn()} />)
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' })
    expect(mocks.search).toHaveBeenCalledWith('needle')
    fireEvent.click(screen.getByText('BatchFiles.cancel'))
    expect(mocks.cancel).toHaveBeenCalledTimes(1)
  })
})
