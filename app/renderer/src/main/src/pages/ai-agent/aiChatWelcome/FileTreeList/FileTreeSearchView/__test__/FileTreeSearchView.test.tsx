import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import FileTreeSearchView from '../FileTreeSearchView'

const { invoke, emit, aiPaths, openedPaths } = vi.hoisted(() => {
  const invoke = vi.fn(
    async (
      _channel: string,
      _params: {
        Method: string
        Url: { Schema: string; Path: string; Query: { Key: string; Value: string }[] }
      },
    ) => ({
      Resources: [
        {
          ResourceType: '',
          VerboseType: '',
          ResourceName: 'demo.txt',
          VerboseName: 'demo.txt [10B]',
          Size: 10,
          SizeVerbose: '10B',
          ModifiedTimestamp: 0,
          Path: 'ai-output/demo.txt',
          YakURLVerbose: '',
          Url: null,
          HaveChildrenNodes: false,
          Extra: [
            {
              Key: 'search_result',
              Value: JSON.stringify({
                match_count: 3,
                results: [
                  {
                    line: 3,
                    text: 'hello world foo',
                    matches: [
                      { start_column: 1, end_column: 6 },
                      { start_column: 13, end_column: 16 },
                    ],
                  },
                  { line: 9, text: 'foo bar', matches: [{ start_column: 1, end_column: 4 }] },
                ],
              }),
            },
          ],
        },
      ],
    }),
  )
  Object.defineProperty(window, 'require', {
    configurable: true,
    value: () => ({ ipcRenderer: { invoke } }),
  })
  return {
    invoke,
    emit: vi.fn(),
    aiPaths: [{ path: 'ai-output', isFolder: true }],
    openedPaths: [{ path: 'opened-file.txt', isFolder: false }],
  }
})

vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({
    t: (key: string, options?: { count?: number }) => (options ? `${key}:${options.count}` : key),
  }),
}))
vi.mock('@/utils/eventBus/eventBus', () => ({ default: { emit } }))
vi.mock('@/utils/notification', () => ({ yakitNotify: vi.fn() }))
vi.mock('@/i18n/i18n', () => ({
  default: {
    getFixedT: () => (key: string, options?: { count?: number }) => (options ? `${key}:${options.count}` : key),
  },
}))
vi.mock('@/pages/ai-re-act/hooks/useCurrentDataBySession', () => ({ useCurrentStore: () => ({}) }))
vi.mock('zustand', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>()
  return {
    ...actual,
    useStore: (_store: unknown, selector: (state: { grpcFolders: unknown }) => unknown) =>
      selector({ grpcFolders: aiPaths }),
  }
})
vi.mock('../../../../components/aiFileSystemList/store/useCustomFolder', () => ({
  useCustomFolder: () => openedPaths,
}))

vi.mock('@/components/yakitUI/YakitDropdownMenu/YakitDropdownMenu', () => ({
  YakitDropdownMenu: ({
    menu,
    children,
  }: {
    menu: { data?: { key: string; label: string }[]; onClick?: (info: { key: string }) => void }
    children?: React.ReactNode
  }) => (
    <div data-testid="file-tree-search-scope-dropdown">
      {children}
      <ul data-testid="file-tree-search-scope-menu">
        {(menu.data || []).map((item) => (
          <li key={item.key}>
            <button type="button" onClick={() => menu.onClick?.({ key: item.key })}>
              {item.label}
            </button>
          </li>
        ))}
      </ul>
    </div>
  ),
}))

/** 避开 YakitCombinationSearch 非法 calc 在 jsdom 下抛错；只保留搜索栏交互契约 */
vi.mock('@/components/YakitCombinationSearch/YakitCombinationSearch', () => ({
  YakitCombinationSearch: (props: {
    valueBeforeOption?: string | number
    addonBeforeOption?: { label: string; value: string | number }[]
    onSelectBeforeOption?: (value: string) => void
    inputSearchModuleTypeProps?: {
      value?: string
      onChange?: (e: { target: { value: string } }) => void
      onSearch?: (value: string) => void
    }
  }) => {
    const options = props.addonBeforeOption || []
    const selected = options.find((item) => String(item.value) === String(props.valueBeforeOption))?.label || ''
    const keyword = props.inputSearchModuleTypeProps?.value ?? ''
    return (
      <div data-testid="file-tree-search-combination-mock">
        <select
          data-testid="file-tree-search-type"
          title={selected}
          value={props.valueBeforeOption}
          onChange={(e) => props.onSelectBeforeOption?.(e.target.value)}
        >
          {options.map((item) => (
            <option key={String(item.value)} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
        <input
          type="search"
          value={keyword}
          onChange={(e) => props.inputSearchModuleTypeProps?.onChange?.({ target: { value: e.target.value } })}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              props.inputSearchModuleTypeProps?.onSearch?.((e.currentTarget as HTMLInputElement).value)
            }
          }}
        />
      </div>
    )
  },
}))

const searchByEnter = (keyword: string) => {
  const input = screen.getByRole('searchbox')
  fireEvent.change(input, { target: { value: keyword } })
  fireEvent.keyDown(input, { key: 'Enter' })
}

const selectScope = (label: string) => {
  fireEvent.click(within(screen.getByTestId('file-tree-search-scope-menu')).getByText(label))
}

beforeEach(() => {
  vi.clearAllMocks()
  aiPaths.splice(0, aiPaths.length, { path: 'ai-output', isFolder: true })
  openedPaths.splice(0, openedPaths.length, { path: 'opened-file.txt', isFolder: false })
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('FileTreeSearchView', () => {
  it('展示组合搜索，左侧可选关键字 / 正则', () => {
    render(<FileTreeSearchView />)
    expect(screen.getByTestId('file-tree-search-view')).toBeInTheDocument()
    expect(screen.getByRole('searchbox')).toBeInTheDocument()

    const typeSelect = screen.getByTestId('file-tree-search-type')
    expect(typeSelect).toHaveAttribute('title', 'FileTreeSearch.keyword')
    expect(typeSelect.querySelectorAll('option')).toHaveLength(2)
    expect(typeSelect).toHaveTextContent('FileTreeSearch.keyword')
    expect(typeSelect).toHaveTextContent('FileTreeSearch.regexp')

    fireEvent.change(typeSelect, { target: { value: 'regexp' } })
    expect(typeSelect).toHaveAttribute('title', 'FileTreeSearch.regexp')
  })

  it('搜索栏下方可选择全部 / ai文件夹 / 用户文件夹', () => {
    render(<FileTreeSearchView />)
    const trigger = screen.getByTestId('file-tree-search-scope')
    expect(trigger).toHaveAttribute('title', 'FileTreeSearch.all')

    const menu = screen.getByTestId('file-tree-search-scope-menu')
    expect(within(menu).getByText('FileTreeSearch.all')).toBeInTheDocument()
    expect(within(menu).getByText('FileTreeSearch.aiFolder')).toBeInTheDocument()
    expect(within(menu).getByText('FileTreeSearch.userFolder')).toBeInTheDocument()

    selectScope('FileTreeSearch.aiFolder')
    expect(trigger).toHaveAttribute('title', 'FileTreeSearch.aiFolder')
  })

  it('初始未搜索时展示输入提示空态', () => {
    render(<FileTreeSearchView />)
    expect(screen.getByText('FileTreeSearch.emptyHint')).toBeInTheDocument()
  })

  it('搜索后按文件展示命中行并高亮命中片段，点击命中行打开文件预览', async () => {
    const setSelected = vi.fn()
    render(<FileTreeSearchView setSelected={setSelected} />)

    searchByEnter('hello')

    const item = await screen.findByTestId('file-tree-search-result-item')
    expect(item).toBeInTheDocument()
    expect(screen.getByText('demo.txt')).toBeInTheDocument()
    expect(screen.getByTestId('file-tree-search-result-count')).toHaveTextContent('3')
    expect(screen.getByText('9')).toBeInTheDocument()
    // 3 处命中分别高亮：line3 的 hello/foo 与 line9 的 foo（用 testid，避免 CI 下 scss stub 无 class）
    expect(item.querySelectorAll('[data-testid="file-tree-search-result-hit"]')).toHaveLength(3)

    fireEvent.click(screen.getByTestId('file-tree-search-result-toggle'))
    expect(screen.queryByTestId('file-tree-search-result-line')).not.toBeInTheDocument()
    fireEvent.click(screen.getByTestId('file-tree-search-result-toggle'))
    expect(screen.getAllByTestId('file-tree-search-result-line').length).toBeGreaterThan(0)

    // 范围=全部时，AI 文件夹与用户文件夹根路径各发起一次 op=search
    await waitFor(() => {
      const calls = invoke.mock.calls.filter(([channel]) => channel === 'RequestYakURL')
      expect(calls).toHaveLength(2)
      const params = calls[0][1]
      expect(params.Method).toBe('GET')
      expect(params.Url.Schema).toBe('file')
      expect(params.Url.Query).toEqual(
        expect.arrayContaining([
          { Key: 'op', Value: 'search' },
          { Key: 'keyword', Value: 'hello' },
          { Key: 'global', Value: 'true' },
        ]),
      )
    })

    fireEvent.click(item.querySelector('[data-testid="file-tree-search-result-line"]')!)
    expect(emit).toHaveBeenCalledWith(
      'switchAIActTab',
      JSON.stringify({
        key: 'file-preview',
        value: 'ai-output/demo.txt',
        highlights: [
          { startLineNumber: 3, startColumn: 1, endLineNumber: 3, endColumn: 6 },
          { startLineNumber: 3, startColumn: 13, endLineNumber: 3, endColumn: 16 },
        ],
      }),
    )
    expect(setSelected).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'ai-output/demo.txt', name: 'demo.txt', isFolder: false }),
    )
  })

  it('选择用户文件夹范围后仅搜索用户文件夹路径', async () => {
    render(<FileTreeSearchView />)

    selectScope('FileTreeSearch.userFolder')
    searchByEnter('foo')

    await waitFor(() => {
      const calls = invoke.mock.calls.filter(([channel]) => channel === 'RequestYakURL')
      expect(calls).toHaveLength(1)
      expect(calls[0][1].Url.Path).toBe('opened-file.txt')
    })
  })

  it('正则模式下请求携带 regex=true', async () => {
    render(<FileTreeSearchView />)

    fireEvent.change(screen.getByTestId('file-tree-search-type'), { target: { value: 'regexp' } })
    searchByEnter('foo.*bar')

    await waitFor(() => {
      const params = invoke.mock.calls.find(([channel]) => channel === 'RequestYakURL')?.[1]
      expect(params?.Url.Query).toEqual(expect.arrayContaining([{ Key: 'regex', Value: 'true' }]))
    })
  })

  it('搜索结果为空时展示无结果空态', async () => {
    invoke.mockImplementationOnce(async () => ({ Resources: [] }))
    invoke.mockImplementationOnce(async () => ({ Resources: [] }))
    render(<FileTreeSearchView />)

    searchByEnter('nothing')

    await waitFor(() => expect(screen.getByText('FileTreeSearch.emptyNoResult')).toBeInTheDocument())
  })

  it('ai/用户文件夹无结果时展示查询全部，点击后切到全部并重搜', async () => {
    // ai 范围 1 次 + 切到全部后 2 次，均无命中
    invoke
      .mockResolvedValueOnce({ Resources: [] })
      .mockResolvedValueOnce({ Resources: [] })
      .mockResolvedValueOnce({ Resources: [] })
    render(<FileTreeSearchView />)

    selectScope('FileTreeSearch.aiFolder')
    searchByEnter('nothing')

    await waitFor(() => expect(screen.getByTestId('file-tree-search-all')).toBeInTheDocument())
    expect(screen.queryByText('FileTreeSearch.emptyNoResult')).not.toBeInTheDocument()

    const callsBefore = invoke.mock.calls.filter(([channel]) => channel === 'RequestYakURL').length
    fireEvent.click(screen.getByTestId('file-tree-search-all'))

    await waitFor(() => {
      expect(screen.getByTestId('file-tree-search-scope')).toHaveAttribute('title', 'FileTreeSearch.all')
      const calls = invoke.mock.calls.filter(([channel]) => channel === 'RequestYakURL')
      expect(calls.length).toBe(callsBefore + 2)
      expect(calls.slice(-2).map(([, params]) => params.Url.Path)).toEqual(
        expect.arrayContaining(['ai-output', 'opened-file.txt']),
      )
    })
  })

  it('同一文件在多个根路径重复命中时只展示一次', async () => {
    render(<FileTreeSearchView />)

    searchByEnter('hello')

    await waitFor(() => expect(invoke.mock.calls.filter(([channel]) => channel === 'RequestYakURL')).toHaveLength(2))
    await waitFor(() => expect(screen.getAllByTestId('file-tree-search-result-item')).toHaveLength(1))
  })

  it('当前范围无可搜索路径时不发起请求', async () => {
    aiPaths.splice(0)
    openedPaths.splice(0)
    render(<FileTreeSearchView />)

    searchByEnter('hello')

    expect(invoke).not.toHaveBeenCalled()
    // 全部范围且无路径：仍提示空态文案
    expect(screen.getByText('FileTreeSearch.emptyHint')).toBeInTheDocument()
  })

  it('用户文件夹无路径或无结果时也展示查询全部', async () => {
    openedPaths.splice(0)
    render(<FileTreeSearchView />)

    selectScope('FileTreeSearch.userFolder')
    searchByEnter('nothing')

    await waitFor(() => expect(screen.getByTestId('file-tree-search-all')).toBeInTheDocument())
    expect(invoke).not.toHaveBeenCalled()
  })
})
