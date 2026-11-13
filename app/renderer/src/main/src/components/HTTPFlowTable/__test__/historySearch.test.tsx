import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import type { ComponentProps, ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({ t: (key: string) => key, i18n: { language: 'zh' } }),
}))
vi.mock('@/utils/envfile', () => ({ getReleaseEditionName: () => 'Yakit' }))
vi.mock('@/components/yakitUI/YakitButton/YakitButton', () => ({
  YakitButton: ({ children }: { children?: ReactNode }) => <button type="button">{children}</button>,
}))
vi.mock('@/components/yakitUI/YakitPopover/YakitPopover', () => ({
  YakitPopover: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
}))
vi.mock('@yakit-libs/yakit-ui-icons/outline', () => ({
  QuestionMarkCircleOutlined: () => null,
  SearchOutlined: () => null,
}))
vi.mock('@/components/YakitCombinationSearch/YakitCombinationSearch', () => ({
  YakitCombinationSearch: (props: {
    valueBeforeOption: string
    onSelectBeforeOption: (value: string) => void
    addonBeforeOption?: { label: string; value: string }[]
    inputSearchModuleTypeProps: {
      value: string
      onChange: (event: { target: { value: string } }) => void
      onSearch: () => void
      onBlur?: () => void
    }
  }) => (
    <div>
      <select
        aria-label="search-type"
        value={props.valueBeforeOption}
        onChange={(event) => props.onSelectBeforeOption(event.target.value)}
      >
        {(props.addonBeforeOption || []).map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>
      <input
        aria-label="search-input"
        value={props.inputSearchModuleTypeProps.value}
        onChange={props.inputSearchModuleTypeProps.onChange}
        onBlur={props.inputSearchModuleTypeProps.onBlur}
      />
      <button type="button" onClick={() => props.inputSearchModuleTypeProps.onSearch()}>
        search
      </button>
    </div>
  ),
}))

import HistorySearch from '../components/historySearch'
import {
  getFullRange,
  mergeIncludeIds,
  parseIncludeIds,
  shouldIgnoreEmptyKeywordIdSearch,
} from '../HTTPFlowTable.utils'

const options = [
  { label: '关键字', value: 'all' },
  { label: '请求', value: 'request' },
  { label: '响应', value: 'response' },
  { label: 'ID', value: 'id' },
]

const renderSearch = (props?: Partial<ComponentProps<typeof HistorySearch>>) => {
  const handleSearch = vi.fn()
  const onEnterIdSearch = vi.fn()
  const onLeaveIdSearch = vi.fn()
  render(
    <HistorySearch
      showPopoverSearch={false}
      addonBeforeOption={options}
      handleSearch={handleSearch}
      onEnterIdSearch={onEnterIdSearch}
      onLeaveIdSearch={onLeaveIdSearch}
      {...props}
    />,
  )
  return { handleSearch, onEnterIdSearch, onLeaveIdSearch }
}

const changeType = (value: string) => {
  fireEvent.change(screen.getByLabelText('search-type'), { target: { value } })
}

const flushSearch = async () => {
  await act(async () => {
    vi.advanceTimersByTime(300)
  })
}

describe('HistorySearch type switch', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  it('keeps the text and searches again when switching among keyword, request and response', async () => {
    const { handleSearch, onEnterIdSearch, onLeaveIdSearch } = renderSearch()
    fireEvent.change(screen.getByLabelText('search-input'), { target: { value: 'login' } })

    changeType('request')
    await flushSearch()

    expect(screen.getByLabelText('search-input')).toHaveValue('login')
    expect(handleSearch).toHaveBeenCalledWith('login', 'request')
    expect(onEnterIdSearch).not.toHaveBeenCalled()
    expect(onLeaveIdSearch).not.toHaveBeenCalled()
  })

  it('clears the keyword condition without searching ids when switching to ID', async () => {
    const { handleSearch, onEnterIdSearch, onLeaveIdSearch } = renderSearch()
    fireEvent.change(screen.getByLabelText('search-input'), { target: { value: 'login' } })

    changeType('id')
    await flushSearch()

    expect(screen.getByLabelText('search-input')).toHaveValue('')
    expect(onEnterIdSearch).toHaveBeenCalledTimes(1)
    expect(onLeaveIdSearch).not.toHaveBeenCalled()
    expect(handleSearch).not.toHaveBeenCalled()
  })

  it('searches the empty input and drops keyword ids when leaving ID', async () => {
    const { handleSearch, onEnterIdSearch, onLeaveIdSearch } = renderSearch()
    changeType('id')
    fireEvent.change(screen.getByLabelText('search-input'), { target: { value: '1,2' } })

    changeType('response')
    await flushSearch()

    expect(screen.getByLabelText('search-input')).toHaveValue('')
    expect(onLeaveIdSearch).toHaveBeenCalledTimes(1)
    expect(onEnterIdSearch).toHaveBeenCalledTimes(1)
    expect(handleSearch).toHaveBeenCalledWith('', 'response')
  })

  it('cancels a pending keyword search when switching to ID', async () => {
    const { handleSearch, onEnterIdSearch } = renderSearch()
    fireEvent.change(screen.getByLabelText('search-input'), { target: { value: 'login' } })
    fireEvent.click(screen.getByRole('button', { name: 'search' }))

    changeType('id')
    await flushSearch()

    expect(onEnterIdSearch).toHaveBeenCalledTimes(1)
    expect(handleSearch).not.toHaveBeenCalled()
  })

  it('cancels a pending ID search when leaving ID', async () => {
    const { handleSearch, onLeaveIdSearch } = renderSearch()
    changeType('id')
    fireEvent.change(screen.getByLabelText('search-input'), { target: { value: '1,2' } })
    fireEvent.click(screen.getByRole('button', { name: 'search' }))

    changeType('response')
    await flushSearch()

    expect(onLeaveIdSearch).toHaveBeenCalledTimes(1)
    expect(handleSearch).not.toHaveBeenCalledWith('1,2', 'id')
    expect(handleSearch).toHaveBeenCalledTimes(1)
    expect(handleSearch).toHaveBeenCalledWith('', 'response')
  })

  it('sends an id search only after the user searches in ID mode', async () => {
    const { handleSearch } = renderSearch()
    changeType('id')
    fireEvent.change(screen.getByLabelText('search-input'), { target: { value: '3,4' } })
    fireEvent.click(screen.getByRole('button', { name: 'search' }))
    await flushSearch()

    expect(handleSearch).toHaveBeenCalledWith('3,4', 'id')
  })

  it('keeps the selected type and ID condition after the search box remounts', async () => {
    const handleSearch = vi.fn()
    const onLeaveIdSearch = vi.fn()
    const Harness = ({ epoch }: { epoch: number }) => {
      const [searchType, setSearchType] = useState<'all' | 'request' | 'response' | 'id'>('id')
      const [keywordIds, setKeywordIds] = useState('12')
      return (
        <div>
          <span data-testid="keyword-ids">{keywordIds}</span>
          <HistorySearch
            key={epoch}
            showPopoverSearch={false}
            addonBeforeOption={options}
            searchType={searchType}
            setSearchType={setSearchType}
            searchVal="12"
            handleSearch={handleSearch}
            onLeaveIdSearch={() => {
              onLeaveIdSearch()
              setKeywordIds('')
            }}
          />
        </div>
      )
    }
    const view = render(<Harness epoch={0} />)
    expect(screen.getByLabelText('search-type')).toHaveValue('id')

    view.rerender(<Harness epoch={1} />)

    expect(screen.getByLabelText('search-type')).toHaveValue('id')
    expect(screen.getByTestId('keyword-ids')).toHaveTextContent('12')
    expect(onLeaveIdSearch).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'search' }))
    await flushSearch()
    expect(handleSearch).toHaveBeenCalledWith('12', 'id')
  })

  it('keeps the nearby range when an empty ID input blurs, and clears it when the tag closes', async () => {
    const nearby = getFullRange(12)
    const Harness = () => {
      const [viewAttachId, setViewAttachId] = useState(12)
      const [includeId, setIncludeId] = useState<(number | string)[] | undefined>(nearby)
      const [keywordIds, setKeywordIds] = useState('')
      const [searchType, setSearchType] = useState<'all' | 'request' | 'response' | 'id'>('id')
      const [searchVal, setSearchVal] = useState('')
      return (
        <div>
          <output aria-label="查询序号">{(includeId || []).join(',')}</output>
          {viewAttachId > 0 && (
            <button
              type="button"
              onClick={() => {
                setViewAttachId(0)
                setIncludeId([])
              }}
            >
              查看附近数据包
            </button>
          )}
          <HistorySearch
            showPopoverSearch={false}
            addonBeforeOption={options}
            searchType={searchType}
            setSearchType={setSearchType}
            searchVal={searchVal}
            setSearchVal={setSearchVal}
            handleSearch={(value, type) => {
              if (type !== 'id') return
              if (shouldIgnoreEmptyKeywordIdSearch(value, keywordIds, viewAttachId)) return
              setKeywordIds(value)
              const next = mergeIncludeIds([], parseIncludeIds(value))
              if (viewAttachId) setViewAttachId(0)
              setIncludeId(next.length ? next : undefined)
            }}
          />
        </div>
      )
    }
    render(<Harness />)
    expect(screen.getByRole('button', { name: '查看附近数据包' })).toBeInTheDocument()
    expect(screen.getByLabelText('查询序号')).toHaveTextContent(nearby.join(','))

    fireEvent.blur(screen.getByLabelText('search-input'))
    await flushSearch()

    expect(screen.getByRole('button', { name: '查看附近数据包' })).toBeInTheDocument()
    expect(screen.getByLabelText('查询序号')).toHaveTextContent(nearby.join(','))

    fireEvent.click(screen.getByRole('button', { name: '查看附近数据包' }))
    expect(screen.queryByRole('button', { name: '查看附近数据包' })).not.toBeInTheDocument()
    expect(screen.getByLabelText('查询序号')).toHaveTextContent('')
  })
})
