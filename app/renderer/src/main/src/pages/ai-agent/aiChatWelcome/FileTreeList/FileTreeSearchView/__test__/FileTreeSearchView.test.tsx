import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import FileTreeSearchView from '../FileTreeSearchView'
import { FileTreeSearchScope } from '../constants'

const { invoke, emit, aiPaths, openedPaths, setSearchResponse, pendingSearches, setHoldSearch } = vi.hoisted(() => {
  const pathRelation = (pathA: string, pathB: string) => {
    const norm = (p: string) => p.replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase()
    const a = norm(pathA)
    const b = norm(pathB)
    if (a === b) return 0
    if (b.startsWith(`${a}/`)) return 1
    if (a.startsWith(`${b}/`)) return 2
    return 3
  }
  const defaultSearchResponse = {
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
  }
  let searchResponse: { Resources: unknown[] } = defaultSearchResponse
  let holdSearch = false
  const pendingSearches: Array<(value: { Resources: unknown[] }) => void> = []
  const setSearchResponse = (next: { Resources: unknown[] }) => {
    searchResponse = next
  }
  type InvokeParams =
    | { pathA?: string; pathB?: string }
    | {
        Method?: string
        Url?: { Schema?: string; Path?: string; Query?: { Key: string; Value: string }[] }
      }

  const invoke = vi.fn(async (channel: string, params?: InvokeParams) => {
    if (channel === 'fetch-path-contains-relation') {
      const relationParams = params as { pathA?: string; pathB?: string } | undefined
      return pathRelation(relationParams?.pathA || '', relationParams?.pathB || '')
    }
    if (holdSearch && channel === 'RequestYakURL') {
      return new Promise<{ Resources: unknown[] }>((resolve) => {
        pendingSearches.push(resolve)
      })
    }
    return searchResponse
  })
  Object.defineProperty(window, 'require', {
    configurable: true,
    value: () => ({ ipcRenderer: { invoke } }),
  })
  return {
    invoke,
    emit: vi.fn(),
    aiPaths: [{ path: 'ai-output', isFolder: true }],
    openedPaths: [{ path: 'opened-file.txt', isFolder: false }],
    pendingSearches,
    setHoldSearch: (next: boolean) => {
      holdSearch = next
    },
    setSearchResponse: (next?: { Resources: unknown[] }) => setSearchResponse(next ?? defaultSearchResponse),
  }
})

type RequestYakURLParams = {
  Method?: string
  Url?: { Schema?: string; Path?: string; Query?: { Key: string; Value: string }[] }
}

const getRequestYakURLParams = (calls: unknown[][]) =>
  calls.filter((call) => call[0] === 'RequestYakURL').map((call) => call[1] as RequestYakURLParams | undefined)

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
    menu: {
      data?: { key: string; label: string; children?: { key: string; label: string }[] }[]
      onClick?: (info: { key: string }) => void
    }
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
            {item.children?.length ? (
              <ul data-testid={`file-tree-search-scope-submenu-${item.key}`}>
                {item.children.map((child) => (
                  <li key={child.key}>
                    <button type="button" onClick={() => menu.onClick?.({ key: child.key })}>
                      {child.label}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
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
  setSearchResponse()
  setHoldSearch(false)
  pendingSearches.splice(0)
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
    expect(within(menu).getByText('FileTreeSystem.aiArtifacts')).toBeInTheDocument()
    expect(within(menu).getByText('FileTreeSystem.myOpenedFiles')).toBeInTheDocument()

    selectScope('FileTreeSystem.aiArtifacts')
    expect(trigger).toHaveAttribute('title', 'FileTreeSystem.aiArtifacts')
  })

  it('初始未搜索时不展示空态插画，结果区留白', () => {
    render(<FileTreeSearchView />)
    expect(screen.queryByText('FileTreeSearch.emptyHint')).not.toBeInTheDocument()
    expect(screen.queryByText('FileTreeSearch.emptyNoResult')).not.toBeInTheDocument()
    expect(screen.getByTestId('file-tree-search-results')).toBeInTheDocument()
    expect(screen.queryByTestId('file-tree-search-view-result-total')).not.toBeInTheDocument()
  })

  it('搜索后按文件展示命中行并高亮命中片段，点击命中行打开文件预览', async () => {
    const setSelected = vi.fn()
    render(<FileTreeSearchView setSelected={setSelected} />)

    searchByEnter('hello')

    const item = await screen.findByTestId('file-tree-search-result-item')
    expect(item).toBeInTheDocument()
    expect(screen.getByText('demo.txt')).toBeInTheDocument()
    expect(screen.getByTestId('file-tree-search-result-count')).toHaveTextContent('3')
    expect(screen.getByTestId('file-tree-search-view-result-total')).toHaveTextContent('3')
    expect(screen.getByText('9')).toBeInTheDocument()
    // 3 处命中分别高亮：line3 的 hello/foo 与 line9 的 foo（用 testid，避免 CI 下 scss stub 无 class）
    expect(item.querySelectorAll('[data-testid="file-tree-search-result-hit"]')).toHaveLength(3)

    fireEvent.click(screen.getByTestId('file-tree-search-result-toggle'))
    expect(screen.queryByTestId('file-tree-search-result-line')).not.toBeInTheDocument()
    fireEvent.click(screen.getByTestId('file-tree-search-result-toggle'))
    expect(screen.getAllByTestId('file-tree-search-result-line').length).toBeGreaterThan(0)

    // 范围=全部时，AI 文件夹与用户文件夹根路径各发起一次 op=search
    await waitFor(() => {
      const paramsList = getRequestYakURLParams(invoke.mock.calls)
      expect(paramsList).toHaveLength(2)
      expect(paramsList[0]).toEqual(
        expect.objectContaining({
          Method: 'GET',
          Url: expect.objectContaining({
            Schema: 'file',
            Query: expect.arrayContaining([
              { Key: 'op', Value: 'search' },
              { Key: 'keyword', Value: 'hello' },
              { Key: 'global', Value: 'true' },
            ]),
          }),
        }),
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

    selectScope('FileTreeSystem.myOpenedFiles')
    searchByEnter('foo')

    await waitFor(() => {
      const paramsList = getRequestYakURLParams(invoke.mock.calls)
      expect(paramsList).toHaveLength(1)
      expect(paramsList[0]?.Url?.Path).toBe('opened-file.txt')
    })
  })

  it('仅打开一个文件时「我打开的文件」无二级菜单', () => {
    render(<FileTreeSearchView />)
    expect(screen.queryByTestId('file-tree-search-scope-submenu-user')).not.toBeInTheDocument()
  })

  it('打开多个文件时「我打开的文件」有二级菜单，点子项只搜该路径', async () => {
    openedPaths.splice(
      0,
      openedPaths.length,
      { path: 'a/foo.txt', isFolder: false },
      { path: 'b/bar.txt', isFolder: false },
    )
    render(<FileTreeSearchView />)

    const submenu = screen.getByTestId('file-tree-search-scope-submenu-user')
    expect(within(submenu).getByText('foo.txt')).toBeInTheDocument()
    expect(within(submenu).getByText('bar.txt')).toBeInTheDocument()

    fireEvent.click(within(submenu).getByText('foo.txt'))
    expect(screen.getByTestId('file-tree-search-scope')).toHaveAttribute('title', 'foo.txt')

    searchByEnter('foo')
    await waitFor(() => {
      const paramsList = getRequestYakURLParams(invoke.mock.calls)
      expect(paramsList).toHaveLength(1)
      expect(paramsList[0]?.Url?.Path).toBe('a/foo.txt')
    })
  })

  it('preset 进入时按新范围搜索，不受面板关闭前工具栏所选范围影响', async () => {
    const { rerender } = render(<FileTreeSearchView active={false} />)
    selectScope('FileTreeSystem.aiArtifacts')
    expect(screen.getByTestId('file-tree-search-scope')).toHaveAttribute('title', 'FileTreeSystem.aiArtifacts')

    // 关闭后再以「我打开的文件」单路径 preset 进入
    rerender(
      <FileTreeSearchView active scopePreset={FileTreeSearchScope.UserFolder} scopePathPreset="opened-file.txt" />,
    )
    await waitFor(() =>
      expect(screen.getByTestId('file-tree-search-scope')).toHaveAttribute('title', 'opened-file.txt'),
    )

    searchByEnter('foo')
    await waitFor(() => {
      const paramsList = getRequestYakURLParams(invoke.mock.calls)
      expect(paramsList).toHaveLength(1)
      expect(paramsList[0]?.Url?.Path).toBe('opened-file.txt')
    })
  })

  it('有结果后工具栏切范围自动按新范围重搜', async () => {
    render(<FileTreeSearchView />)
    searchByEnter('hello')
    await waitFor(() => expect(getRequestYakURLParams(invoke.mock.calls)).toHaveLength(2))
    await waitFor(() => expect(screen.getAllByTestId('file-tree-search-result-item')).toHaveLength(1))

    const callsAfterFirst = getRequestYakURLParams(invoke.mock.calls).length
    selectScope('FileTreeSystem.aiArtifacts')
    expect(screen.getByTestId('file-tree-search-scope')).toHaveAttribute('title', 'FileTreeSystem.aiArtifacts')

    await waitFor(() => {
      const paramsList = getRequestYakURLParams(invoke.mock.calls)
      expect(paramsList.length).toBe(callsAfterFirst + 1)
      expect(paramsList[paramsList.length - 1]?.Url?.Path).toBe('ai-output')
    })
  })

  it('正则模式下请求携带 regex=true', async () => {
    render(<FileTreeSearchView />)

    fireEvent.change(screen.getByTestId('file-tree-search-type'), { target: { value: 'regexp' } })
    searchByEnter('foo.*bar')

    await waitFor(() => {
      const params = getRequestYakURLParams(invoke.mock.calls)[0]
      expect(params?.Url?.Query).toEqual(expect.arrayContaining([{ Key: 'regex', Value: 'true' }]))
    })
  })

  it('搜索结果为空时展示无结果空态', async () => {
    setSearchResponse({ Resources: [] })
    render(<FileTreeSearchView />)

    searchByEnter('nothing')

    await waitFor(() => expect(screen.getByText('FileTreeSearch.emptyNoResult')).toBeInTheDocument())
    expect(screen.getByTestId('file-tree-search-view-result-total')).toHaveTextContent('0')
  })

  it('加载中隐藏命中总数 Tag，结束后再显示', async () => {
    setHoldSearch(true)
    setSearchResponse({
      Resources: [
        {
          ResourceName: 'demo.txt',
          Path: 'ai-output/demo.txt',
          Extra: [
            {
              Key: 'search_result',
              Value: JSON.stringify({
                match_count: 2,
                results: [{ line: 1, text: 'hello', matches: [{ start_column: 1, end_column: 6 }] }],
              }),
            },
          ],
        },
      ],
    })

    render(<FileTreeSearchView />)
    selectScope('FileTreeSystem.aiArtifacts')
    searchByEnter('hello')

    await waitFor(() => expect(screen.getByTestId('file-tree-search-loading')).toBeInTheDocument())
    expect(screen.queryByTestId('file-tree-search-view-result-total')).not.toBeInTheDocument()
    expect(pendingSearches).toHaveLength(1)

    const resolveSearch = pendingSearches[0]
    setHoldSearch(false)
    await act(async () => {
      resolveSearch?.({
        Resources: [
          {
            ResourceName: 'demo.txt',
            Path: 'ai-output/demo.txt',
            Extra: [
              {
                Key: 'search_result',
                Value: JSON.stringify({
                  match_count: 2,
                  results: [{ line: 1, text: 'hello', matches: [{ start_column: 1, end_column: 6 }] }],
                }),
              },
            ],
          },
        ],
      })
    })

    await waitFor(() => {
      expect(screen.queryByTestId('file-tree-search-loading')).not.toBeInTheDocument()
      expect(screen.getByTestId('file-tree-search-view-result-total')).toHaveTextContent('2')
    })
  })

  it('ai/用户文件夹无结果时展示范围下拉，选全部后切范围并重搜', async () => {
    setSearchResponse({ Resources: [] })
    render(<FileTreeSearchView />)

    selectScope('FileTreeSystem.aiArtifacts')
    await waitFor(() =>
      expect(screen.getByTestId('file-tree-search-scope')).toHaveAttribute('title', 'FileTreeSystem.aiArtifacts'),
    )
    searchByEnter('nothing')

    const emptyScope = await screen.findByTestId('file-tree-search-empty-scope')
    expect(screen.getByTestId('file-tree-search-all')).toBeInTheDocument()
    expect(screen.queryByText('FileTreeSearch.emptyNoResult')).not.toBeInTheDocument()
    expect(within(emptyScope).getByText('FileTreeSearch.all')).toBeInTheDocument()
    expect(within(emptyScope).getByText('FileTreeSystem.myOpenedFiles')).toBeInTheDocument()
    expect(within(emptyScope).getByText('FileTreeSystem.aiArtifacts')).toBeInTheDocument()

    const callsBefore = getRequestYakURLParams(invoke.mock.calls).length
    fireEvent.click(within(emptyScope).getByText('FileTreeSearch.all'))

    await waitFor(() => {
      expect(screen.getByTestId('file-tree-search-scope')).toHaveAttribute('title', 'FileTreeSearch.all')
      const paramsList = getRequestYakURLParams(invoke.mock.calls)
      expect(paramsList.length).toBe(callsBefore + 2)
      expect(paramsList.slice(-2).map((params) => params?.Url?.Path)).toEqual(
        expect.arrayContaining(['ai-output', 'opened-file.txt']),
      )
    })
  })

  it('同一文件在多个根路径重复命中时只展示一次', async () => {
    render(<FileTreeSearchView />)

    searchByEnter('hello')

    await waitFor(() => expect(getRequestYakURLParams(invoke.mock.calls)).toHaveLength(2))
    await waitFor(() => expect(screen.getAllByTestId('file-tree-search-result-item')).toHaveLength(1))
  })

  it('当前范围无可搜索路径时不发起请求', async () => {
    aiPaths.splice(0)
    openedPaths.splice(0)
    render(<FileTreeSearchView />)

    searchByEnter('hello')

    await waitFor(() => expect(screen.queryByTestId('file-tree-search-loading')).not.toBeInTheDocument())
    expect(getRequestYakURLParams(invoke.mock.calls)).toHaveLength(0)
    expect(screen.queryByText('FileTreeSearch.emptyHint')).not.toBeInTheDocument()
  })

  it('用户文件夹无路径或无结果时也展示范围下拉', async () => {
    openedPaths.splice(0)
    render(<FileTreeSearchView />)

    selectScope('FileTreeSystem.myOpenedFiles')
    searchByEnter('nothing')

    const emptyScope = await screen.findByTestId('file-tree-search-empty-scope')
    expect(screen.getByTestId('file-tree-search-all')).toBeInTheDocument()
    expect(within(emptyScope).getByText('FileTreeSearch.all')).toBeInTheDocument()
    expect(getRequestYakURLParams(invoke.mock.calls)).toHaveLength(0)
  })
})
