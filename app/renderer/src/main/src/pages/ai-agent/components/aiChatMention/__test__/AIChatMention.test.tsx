import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type * as Ahooks from 'ahooks'
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useKnowledgeBase } from '@/pages/KnowledgeBase/hooks/useKnowledgeBase'
import type { KnowledgeBaseItem } from '@/pages/KnowledgeBase/hooks/useKnowledgeBase'
import emiter from '@/utils/eventBus/eventBus'
import { AIChatMention } from '../AIChatMention'
import { selectBrowserInstance, useBrowserInstances } from '../../../browserInstances/browserInstanceStore'
import type { AIBrowserInstance } from '../../../browserInstances/browserInstanceStore'
import type { AIFocus, AIForge } from '../../../type/forge'
import type { AITool } from '../../../type/aiTool'
import { grpcQueryAIFocus, grpcQueryAIForge, grpcQueryKnowledgeBase } from '../../../grpc'
import { grpcGetAIToolList } from '../../../aiToolList/utils'
import { SwitchAIAgentTabEventEnum } from '../../../defaultConstant'
import { loadRecentMentionResources } from '../recentListOfMention/recentListOfMentionData'
import { defaultFolder, useCustomFolder } from '../../aiFileSystemList/store/useCustomFolder'

vi.hoisted(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(private readonly onResize: ResizeObserverCallback) {}

      observe(target: Element) {
        this.onResize([{ target, contentRect: target.getBoundingClientRect() } as ResizeObserverEntry], this)
      }

      unobserve() {}
      disconnect() {}
    },
  )
})

vi.mock('ahooks', async (importOriginal) => ({
  ...(await importOriginal<typeof Ahooks>()),
  useInViewport: () => [true],
}))

const i18n = vi.hoisted(() => ({ language: 'en' }))

vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({ t: (key: string) => key, i18n }),
}))
vi.mock('@/pages/ai-re-act/hooks/useCurrentSessionId', () => ({ default: () => 'session-test' }))
vi.mock('@/pages/KnowledgeBase/utils', () => ({
  targetIcon: (index: number) => () => <span data-testid={`knowledge-icon-${index}`} />,
}))
vi.mock('../../../browserInstances/BrowserInstancesPanel', () => ({
  BrowserInstanceCard: ({ instance }: { instance: AIBrowserInstance }) => <span>{instance.name}</span>,
}))
vi.mock('../../../browserInstances/browserInstanceStore', () => ({
  useBrowserInstances: vi.fn(),
  browserInstanceMentionName: (instance: AIBrowserInstance) => instance.name,
  selectBrowserInstance: vi.fn(),
}))
vi.mock('../../aiFileSystemList/store/useCustomFolder', () => ({
  defaultFolder: vi.fn(),
  useCustomFolder: vi.fn(),
}))
vi.mock('../../aiFileSystemList/FileTreeSystemList/FileTreeSystemList', () => ({
  default: ({ path, searchQuery }: { path: string; searchQuery?: string }) => (
    <div role="tree" aria-label={path} data-search-query={searchQuery} />
  ),
}))
vi.mock('../../../grpc', () => ({
  grpcQueryAIForge: vi.fn(),
  grpcQueryKnowledgeBase: vi.fn(),
  grpcQueryAIFocus: vi.fn(),
}))
vi.mock('../../../aiToolList/utils', () => ({ grpcGetAIToolList: vi.fn() }))
vi.mock('../recentListOfMention/recentListOfMentionData', () => ({
  loadRecentMentionResources: vi.fn(),
}))
vi.mock('@/components/yakitUI/YakitDropdownMenu/YakitDropdownMenu', () => ({
  YakitDropdownMenu: ({
    menu,
    children,
  }: {
    menu: { onClick: (item: { key: string }) => void }
    children: React.ReactNode
  }) => (
    <>
      {children}
      <button onClick={() => menu.onClick({ key: 'added' })}>test-added-filter</button>
    </>
  ),
}))

const skill = (id: number, name: string): AIForge =>
  ({ Id: id, ForgeName: name, Description: `About ${name}` }) as AIForge

const browser = (id: string, name: string, online: boolean): AIBrowserInstance => ({
  id,
  name,
  online,
  running: online,
  installationId: id,
  client: 'Chrome',
  clientVersion: '',
  origin: '',
  createdAt: 0,
  lastSeenAt: 0,
})

const emptyBrowserState: ReturnType<typeof useBrowserInstances> = {
  instances: [],
  history: [],
  pending: [],
  selectedId: '',
  loading: false,
  error: '',
  historyError: '',
  autoApprovalErrors: {},
}

beforeEach(() => {
  i18n.language = 'en'
  vi.clearAllMocks()
  useKnowledgeBase.setState({ knowledgeBases: [] })
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(function (this: HTMLElement) {
    return this.classList.contains('container') ? 480 : 0
  })
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockImplementation(function (this: HTMLElement) {
    return this.classList.contains('container') ? 289 : 0
  })
  vi.mocked(useBrowserInstances).mockReturnValue(emptyBrowserState)
  vi.mocked(useCustomFolder).mockReturnValue([])
  vi.mocked(defaultFolder).mockResolvedValue(null)
  vi.mocked(loadRecentMentionResources).mockResolvedValue({
    attachments: [],
    files: [],
    knowledgeBases: [],
    tools: [],
    browsers: [],
    browserIDs: [],
    scenarios: [],
    skills: [skill(1, 'recent-summary'), skill(2, 'recent-translate')],
  })
  vi.mocked(grpcQueryAIForge).mockImplementation(async ({ Pagination, Filter }) => ({
    Data: Filter?.Keyword ? [skill(4, Filter?.Keyword)] : [skill(3, 'catalog-summary')],
    Pagination,
    Total: 1,
  }))
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

afterAll(() => vi.unstubAllGlobals())

describe('AIChatMention', () => {
  it('updates tool labels in recent results and the tool catalog when the language changes', async () => {
    const tool = {
      ID: 1,
      Name: 'query-tool',
      VerboseName: 'Legacy name',
      VerboseNameI18n: { Zh: '查询工具', En: 'Query Tool' },
    } as AITool
    const recent = await loadRecentMentionResources('session-test')
    vi.mocked(loadRecentMentionResources).mockResolvedValueOnce({ ...recent, tools: [tool] })
    vi.mocked(grpcGetAIToolList).mockImplementation(async ({ Pagination }) => ({ Tools: [tool], Pagination, Total: 1 }))
    const onSelect = vi.fn()
    const { rerender } = render(<AIChatMention onSelect={onSelect} />)

    expect(await screen.findByRole('option', { name: 'Query Tool' })).toBeInTheDocument()
    i18n.language = 'zh-TW'
    rerender(<AIChatMention onSelect={onSelect} />)
    expect(screen.getByRole('option', { name: '查询工具' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'AIMentionTabs.tool' }))
    expect(await screen.findByRole('option', { name: '查询工具' })).toBeInTheDocument()
    i18n.language = 'en'
    rerender(<AIChatMention onSelect={onSelect} />)
    fireEvent.click(await screen.findByRole('option', { name: 'Query Tool' }))
    expect(grpcGetAIToolList).toHaveBeenCalledTimes(1)
    expect(onSelect).toHaveBeenCalledWith('tool', expect.objectContaining({ originalName: 'query-tool' }))
  })

  it.each([
    ['fileSystem', 'file'],
    ['browser', 'browser'],
  ])('opens the %s sidebar from its empty state and shows only text for an empty search', async (tab, active) => {
    const label = 'AIAddMaterialsPopover.goToAdd'
    const emit = vi.spyOn(emiter, 'emit')
    const onClose = vi.fn()
    render(<AIChatMention onSelect={vi.fn()} onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: `AIMentionTabs.${tab}` }))
    expect(await screen.findByText('YakitEmpty.noData')).toBeInTheDocument()

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'missing' } })
    expect(screen.getByRole('status')).toHaveTextContent('AIMentionTabs.searchEmpty')
    expect(screen.queryByRole('button', { name: label })).not.toBeInTheDocument()

    fireEvent.change(screen.getByRole('textbox'), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: label }))
    expect(onClose).toHaveBeenCalledOnce()
    expect(emit).toHaveBeenCalledWith(
      'switchAIAgentTab',
      JSON.stringify({ type: SwitchAIAgentTabEventEnum.SET_TAB_ACTIVE, params: { active, show: true } }),
    )
  })

  it('searches visible browser names and page URLs without matching a hidden origin', () => {
    vi.mocked(useBrowserInstances).mockReturnValue({
      ...emptyBrowserState,
      instances: [
        { ...browser('browser-b', '浏览器 B', true), origin: 'chrome-extension://abc' },
        {
          ...browser('browser-c', '浏览器 C', true),
          tab: { id: 1, title: '文档', url: 'https://docs.test/guide' },
        },
      ],
    })
    render(<AIChatMention onSelect={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'AIMentionTabs.browser' }))
    const search = screen.getByRole('textbox')

    fireEvent.change(search, { target: { value: 'A' } })
    expect(screen.queryByRole('option')).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('AIMentionTabs.searchEmpty')

    fireEvent.change(search, { target: { value: 'B' } })
    expect(screen.getByRole('option', { name: '浏览器 B' })).toBeInTheDocument()
    fireEvent.change(search, { target: { value: 'guide' } })
    expect(screen.getByRole('option', { name: '浏览器 C' })).toBeInTheDocument()
  })

  it('moves the browser selection in both directions while the popup search has focus', () => {
    vi.mocked(useBrowserInstances).mockReturnValue({
      ...emptyBrowserState,
      instances: [browser('first', 'First browser', true), browser('second', 'Second browser', true)],
    })
    const editor = document.createElement('div')
    const onSelect = vi.fn()
    render(<AIChatMention onSelect={onSelect} keyboardTarget={() => editor} />)
    fireEvent.click(screen.getByRole('button', { name: 'AIMentionTabs.browser' }))
    const search = screen.getByRole('textbox')
    act(() => search.focus())
    const first = screen.getByRole('option', { name: 'First browser' })
    const second = screen.getByRole('option', { name: 'Second browser' })
    expect(first).toHaveAttribute('aria-selected', 'true')
    fireEvent.keyDown(search, { key: 'ArrowDown', keyCode: 40 })
    expect(second).toHaveAttribute('aria-selected', 'true')
    fireEvent.keyDown(search, { key: 'ArrowUp', keyCode: 38 })
    expect(first).toHaveAttribute('aria-selected', 'true')
    fireEvent.keyDown(search, { key: 'Enter', keyCode: 13 })
    expect(onSelect).toHaveBeenCalledWith('browser', expect.objectContaining({ id: 'first' }))
  })

  it('shows recent browser references and online browser choices with keyboard selection', async () => {
    const browsers = [
      browser('browser-1', 'First browser', true),
      browser('browser-2', 'Second browser', true),
      browser('browser-3', 'Offline browser', false),
    ]
    vi.mocked(useBrowserInstances).mockReturnValue({ ...emptyBrowserState, instances: browsers })
    const recent = await loadRecentMentionResources('session-test')
    vi.mocked(loadRecentMentionResources).mockResolvedValueOnce({
      ...recent,
      browserIDs: ['browser-2'],
    })
    const editor = document.createElement('div')
    const onSelect = vi.fn()
    render(<AIChatMention onSelect={onSelect} keyboardTarget={() => editor} />)
    expect(await screen.findByRole('option', { name: 'Second browser' })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'First browser' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'AIMentionTabs.browser' }))
    expect(screen.getByRole('option', { name: 'First browser' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.queryByRole('option', { name: 'Offline browser' })).not.toBeInTheDocument()
    fireEvent.keyDown(editor, { key: 'ArrowDown', keyCode: 40 })
    expect(screen.getByRole('option', { name: 'Second browser' })).toHaveAttribute('aria-selected', 'true')
    fireEvent.keyDown(editor, { key: 'Enter', keyCode: 13 })
    expect(selectBrowserInstance).toHaveBeenCalledWith('browser-2')
    expect(onSelect).toHaveBeenCalledWith('browser', expect.objectContaining({ id: 'browser-2' }))
  })

  it('keeps local search until the editor keyword or popup visibility changes', () => {
    const onSelect = vi.fn()
    const { rerender } = render(<AIChatMention onSelect={onSelect} filterKeyword="editor" />)
    const search = screen.getByRole('textbox')
    expect(search).toHaveValue('editor')

    fireEvent.change(search, { target: { value: 'local' } })
    rerender(<AIChatMention onSelect={onSelect} filterKeyword="editor" />)
    expect(search).toHaveValue('local')

    rerender(<AIChatMention onSelect={onSelect} filterKeyword="next" />)
    expect(search).toHaveValue('next')

    fireEvent.change(search, { target: { value: 'local again' } })
    rerender(<AIChatMention onSelect={onSelect} filterKeyword="next" visible={false} />)
    expect(search).toHaveValue('next')
    rerender(<AIChatMention onSelect={onSelect} filterKeyword="next" />)
    expect(search).toHaveValue('next')

    rerender(<AIChatMention onSelect={onSelect} />)
    expect(search).toHaveValue('')
  })

  it('keeps the file tree and searches already opened paths by filename', () => {
    vi.mocked(useCustomFolder).mockReturnValue([
      { path: '/notes/archive/readme.txt', isFolder: false },
      { path: '/docs/notes.md', isFolder: false },
    ])
    render(<AIChatMention onSelect={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'AIMentionTabs.fileSystem' }))
    expect(screen.getAllByRole('tree')).toHaveLength(2)
    expect(defaultFolder).not.toHaveBeenCalled()

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'NOTES' } })
    expect(screen.getByRole('tree')).toHaveAccessibleName('/docs/notes.md')

    fireEvent.change(screen.getByRole('textbox'), { target: { value: '' } })
    expect(screen.getAllByRole('tree')).toHaveLength(2)
  })

  it('passes the existing scene search to the default file tree when switching tabs', async () => {
    vi.mocked(defaultFolder).mockResolvedValue({ path: '/default/code', isFolder: true })
    vi.mocked(grpcQueryAIFocus).mockResolvedValue({ Data: [] })
    render(<AIChatMention onSelect={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'AiAgengt.focusMode' }))
    const search = screen.getByRole('textbox')
    fireEvent.change(search, { target: { value: 'S' } })
    fireEvent.click(screen.getByRole('button', { name: 'AIMentionTabs.fileSystem' }))
    expect(search).toHaveValue('S')
    expect(await screen.findByRole('tree', { name: '/default/code' })).toHaveAttribute('data-search-query', 's')
  })

  it('opens the first visible tab when the welcome composer hides recently added', async () => {
    render(<AIChatMention onSelect={vi.fn()} filterMode={['recent']} />)

    expect(screen.queryByRole('button', { name: 'AIMentionTabs.recent' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'AIMentionTabs.skill' })).toHaveAttribute(
      'data-mention-tab-active',
      'true',
    )
    expect(await screen.findByText('catalog-summary')).toBeInTheDocument()
    expect(loadRecentMentionResources).not.toHaveBeenCalled()
  })

  it('moves the active scene row with arrow keys and selects it with Enter', async () => {
    vi.mocked(grpcQueryAIFocus).mockResolvedValue({
      Data: [
        { Name: 'summarize', Description: 'Summarize the text' } as AIFocus,
        { Name: 'translate', Description: 'Translate the text' } as AIFocus,
      ],
    })
    const editor = document.createElement('div')
    const onSelect = vi.fn()
    render(<AIChatMention onSelect={onSelect} keyboardTarget={() => editor} />)
    fireEvent.click(screen.getByRole('button', { name: 'AiAgengt.focusMode' }))
    const first = await screen.findByRole('option', { name: 'summarize' })
    const second = screen.getByRole('option', { name: 'translate' })
    expect(first).toHaveAttribute('aria-selected', 'true')

    fireEvent.keyDown(editor, { key: 'ArrowDown', keyCode: 40 })
    expect(second).toHaveAttribute('aria-selected', 'true')
    fireEvent.keyDown(editor, { key: 'ArrowUp', keyCode: 38 })
    expect(first).toHaveAttribute('aria-selected', 'true')
    fireEvent.keyDown(editor, { key: 'Enter', keyCode: 13 })
    expect(onSelect).toHaveBeenCalledWith('focusMode', { id: 'summarize', name: 'summarize' })
  })

  it('searches recent results locally and switches tabs and rows with the editor keyboard', async () => {
    const editor = document.createElement('div')
    const onSelect = vi.fn()
    render(<AIChatMention keyboardTarget={() => editor} onSelect={onSelect} />)
    await screen.findByText('recent-summary')
    const recentList = screen.getByRole('listbox')
    expect(within(recentList).getByText('recent-summary')).toBeInTheDocument()
    expect(loadRecentMentionResources).toHaveBeenCalledExactlyOnceWith('session-test')

    fireEvent.keyDown(editor, { key: 'ArrowDown', keyCode: 40 })
    fireEvent.keyDown(editor, { key: 'Enter', keyCode: 13 })
    expect(onSelect).toHaveBeenCalledWith('forge', expect.objectContaining({ name: 'recent-translate' }))

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'summary' } })
    expect(within(recentList).getByText('recent-summary')).toBeInTheDocument()
    expect(within(recentList).queryByText('recent-translate')).toBeNull()
    expect(loadRecentMentionResources).toHaveBeenCalledTimes(1)

    fireEvent.keyDown(editor, { key: 'ArrowRight', keyCode: 39 })
    expect(screen.getByRole('button', { name: 'AIMentionTabs.skill' })).toHaveAttribute(
      'data-mention-tab-active',
      'true',
    )
    fireEvent.keyDown(editor, { key: 'ArrowLeft', keyCode: 37 })
    expect(screen.getByRole('button', { name: 'AIMentionTabs.recent' })).toHaveAttribute(
      'data-mention-tab-active',
      'true',
    )
  })

  it('moves focus from the clicked scene tab when switching tabs with the keyboard', () => {
    render(<AIChatMention onSelect={vi.fn()} />)
    const sceneTab = screen.getByRole('button', { name: 'AiAgengt.focusMode' })
    const browserTab = screen.getByRole('button', { name: 'AIMentionTabs.browser' })

    act(() => sceneTab.focus())
    fireEvent.click(sceneTab)
    fireEvent.keyDown(sceneTab, { key: 'ArrowLeft', keyCode: 37 })

    expect(sceneTab).not.toHaveAttribute('data-mention-tab-active')
    expect(browserTab).toHaveAttribute('data-mention-tab-active', 'true')
    expect(browserTab).toHaveFocus()

    const search = screen.getByRole('textbox')
    act(() => search.focus())
    fireEvent.keyDown(search, { key: 'ArrowRight', keyCode: 39 })
    expect(sceneTab).toHaveAttribute('data-mention-tab-active', 'true')
    expect(search).toHaveFocus()
  })

  it('switches tabs immediately on the first arrow press and debounces repeated presses', async () => {
    vi.useFakeTimers()
    try {
      const editor = document.createElement('div')
      render(<AIChatMention keyboardTarget={() => editor} onSelect={vi.fn()} />)
      const skillTab = screen.getByRole('button', { name: 'AIMentionTabs.skill' })
      const knowledgeTab = screen.getByRole('button', { name: 'AIMentionTabs.knowledgeBase' })

      fireEvent.keyDown(editor, { key: 'ArrowRight', keyCode: 39 })
      expect(skillTab).toHaveAttribute('data-mention-tab-active', 'true')
      expect(fireEvent.keyDown(editor, { key: 'ArrowRight', keyCode: 39 })).toBe(false)
      fireEvent.keyDown(editor, { key: 'ArrowRight', keyCode: 39 })

      await act(() => vi.advanceTimersByTimeAsync(99))
      expect(skillTab).toHaveAttribute('data-mention-tab-active', 'true')
      await act(() => vi.advanceTimersByTimeAsync(1))
      expect(knowledgeTab).toHaveAttribute('data-mention-tab-active', 'true')
    } finally {
      vi.useRealTimers()
    }
  })

  it('groups recent attachments and filesystem references before skills', async () => {
    const recent = await loadRecentMentionResources('session-test')
    const attachment = { path: '/docs/notes.pdf', isFolder: false }
    vi.mocked(loadRecentMentionResources).mockResolvedValueOnce({
      ...recent,
      attachments: [attachment],
      files: [attachment, { path: '/docs/reports', isFolder: true }],
    })
    const onSelect = vi.fn()
    render(<AIChatMention onSelect={onSelect} />)
    expect(screen.queryByRole('button', { name: 'AIAddMaterialsPopover.attachments' })).toBeNull()
    await screen.findByText('AIMentionTabs.files (2)')
    const options = within(screen.getByRole('listbox')).getAllByRole('option')
    expect(options.map((option) => option.querySelector('[title]')?.textContent)).toEqual([
      'notes.pdf',
      'reports',
      'recent-summary',
      'recent-translate',
    ])
    fireEvent.click(options[1])
    expect(onSelect).toHaveBeenCalledWith('folder', expect.objectContaining({ name: '/docs/reports' }))
  })

  it('shows five recent items per group and expands only the group requested', async () => {
    const recent = await loadRecentMentionResources('session-test')
    vi.mocked(loadRecentMentionResources).mockResolvedValueOnce({
      ...recent,
      files: Array.from({ length: 6 }, (_, index) => ({ path: `/docs/report-${index + 1}.txt`, isFolder: false })),
      skills: Array.from({ length: 5 }, (_, index) => skill(index + 1, `recent-skill-${index + 1}`)),
      scenarios: Array.from({ length: 6 }, (_, index) => ({ Name: `recent-scenario-${index + 1}` }) as AIFocus),
    })
    const onSelect = vi.fn()
    render(<AIChatMention onSelect={onSelect} />)
    const files = within((await screen.findByText('AIMentionTabs.files (6)')).closest('section')!)
    const skills = within(screen.getByText('AIMentionTabs.skill (5)').closest('section')!)
    const scenarios = within(screen.getByText('AiAgengt.focusMode (6)').closest('section')!)

    expect(files.getAllByRole('option')).toHaveLength(5)
    expect(scenarios.getAllByRole('option')).toHaveLength(5)
    expect(skills.queryByRole('button', { name: 'AIMentionTabs.viewMore' })).not.toBeInTheDocument()

    fireEvent.click(files.getByRole('button', { name: 'AIMentionTabs.viewMore' }))
    expect(files.getAllByRole('option')).toHaveLength(6)
    expect(files.queryByRole('button', { name: 'AIMentionTabs.viewMore' })).not.toBeInTheDocument()
    expect(scenarios.getAllByRole('option')).toHaveLength(5)
    fireEvent.click(files.getByRole('option', { name: 'report-6.txt' }))
    expect(onSelect).toHaveBeenCalledWith('file', expect.objectContaining({ name: '/docs/report-6.txt' }))

    fireEvent.click(scenarios.getByRole('button', { name: 'AIMentionTabs.viewMore' }))
    expect(scenarios.getAllByRole('option')).toHaveLength(6)
  })

  it('paginates tools in the shared list and preserves keyboard selection across pages', async () => {
    let finishPage!: () => void
    const nextPage = new Promise<void>((resolve) => {
      finishPage = resolve
    })
    vi.mocked(grpcGetAIToolList).mockImplementation(async ({ Pagination }) => {
      if (Pagination.Page === 2) await nextPage
      const Tools = Array.from({ length: Pagination.Page === 1 ? 20 : 1 }, (_, index) => {
        const id = (Pagination.Page - 1) * 20 + index + 1
        return { ID: id, Name: `tool-${id}`, VerboseName: `Tool ${id}` } as AITool
      })
      return { Tools, Pagination, Total: 21 }
    })
    const editor = document.createElement('div')
    const onSelect = vi.fn()
    render(<AIChatMention onSelect={onSelect} keyboardTarget={() => editor} />)
    fireEvent.click(screen.getByRole('button', { name: 'AIMentionTabs.tool' }))

    const first = await screen.findByRole('option', { name: 'Tool 1' })
    expect(first).toHaveAttribute('aria-selected', 'true')
    fireEvent.keyDown(editor, { key: 'ArrowDown', keyCode: 40 })
    expect(screen.getByRole('option', { name: 'Tool 2' })).toHaveAttribute('aria-selected', 'true')

    const scroller = first.closest<HTMLElement>('.container')!
    fireEvent.scroll(scroller, { target: { scrollTop: 290 } })
    expect(await within(scroller).findByRole('img', { name: 'loading' })).toBeInTheDocument()
    await act(async () => finishPage())
    expect(await screen.findByRole('option', { name: 'Tool 21' })).toBeInTheDocument()
    expect(within(scroller).getByText('YakitEmpty.noMoreData')).toBeInTheDocument()
    expect(vi.mocked(grpcGetAIToolList).mock.calls.map(([request]) => request.Pagination.Page)).toEqual([1, 2])

    fireEvent.scroll(scroller, { target: { scrollTop: 0 } })
    expect(await screen.findByRole('option', { name: 'Tool 2' })).toHaveAttribute('aria-selected', 'true')
    fireEvent.keyDown(editor, { key: 'ArrowUp', keyCode: 38 })
    fireEvent.keyDown(editor, { key: 'Enter', keyCode: 13 })
    expect(onSelect).toHaveBeenCalledWith(
      'tool',
      expect.objectContaining({ id: '1', name: 'Tool 1', originalName: 'tool-1' }),
    )
  })

  it('sends catalog keywords to the backend and filters already-added rows locally', async () => {
    render(
      <AIChatMention
        onSelect={vi.fn()}
        materials={[{ mentionType: 'forge', mentionId: '7', mentionName: 'draft-outline', name: 'draft-outline' }]}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'AIMentionTabs.skill' }))
    await screen.findByText('catalog-summary')

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'documents' } })
    await waitFor(() =>
      expect(grpcQueryAIForge).toHaveBeenLastCalledWith(
        expect.objectContaining({
          Filter: { Keyword: 'documents' },
        }),
      ),
    )
    expect(await screen.findByText('documents')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'test-added-filter' }))
    const remoteCalls = vi.mocked(grpcQueryAIForge).mock.calls.length
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'outline' } })
    expect(await screen.findByText('draft-outline')).toBeInTheDocument()
    await act(() => new Promise((resolve) => setTimeout(resolve, 250)))
    expect(grpcQueryAIForge).toHaveBeenCalledTimes(remoteCalls)
  })

  it('searches cached knowledge bases by name and keeps added knowledge bases separate', async () => {
    const candidates = ['FORGE_VECTOR_INDEX', 'AI_TOOL_VECTOR_INDEX'].map(
      (name, index) =>
        ({ ID: String(index + 1), KnowledgeBaseName: name, Description: 'default description' }) as KnowledgeBaseItem,
    )
    useKnowledgeBase.setState({ knowledgeBases: candidates })
    render(
      <AIChatMention
        onSelect={vi.fn()}
        materials={[{ mentionType: 'knowledgeBase', mentionId: '3', mentionName: 'Local reference' }]}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'AIMentionTabs.knowledgeBase' }))
    expect(await screen.findByText('FORGE_VECTOR_INDEX')).toBeInTheDocument()
    expect(screen.getByText('AI_TOOL_VECTOR_INDEX')).toBeInTheDocument()

    const search = screen.getByRole('textbox')
    fireEvent.change(search, { target: { value: 'p' } })
    expect(await screen.findByText('AIMentionTabs.allKnowledgeBase')).toBeInTheDocument()
    expect(screen.queryByText('FORGE_VECTOR_INDEX')).not.toBeInTheDocument()
    expect(screen.queryByText('AI_TOOL_VECTOR_INDEX')).not.toBeInTheDocument()

    fireEvent.change(search, { target: { value: 'tool' } })
    const toolIndex = await screen.findByRole('option', { name: /AI_TOOL_VECTOR_INDEX/ })
    expect(within(toolIndex).getByTestId('knowledge-icon-1')).toBeInTheDocument()

    fireEvent.change(search, { target: { value: 'forge' } })
    expect(await screen.findByText('FORGE_VECTOR_INDEX')).toBeInTheDocument()
    expect(screen.queryByText('AI_TOOL_VECTOR_INDEX')).not.toBeInTheDocument()

    act(() => {
      useKnowledgeBase.setState({
        knowledgeBases: [{ ...candidates[0], KnowledgeBaseName: 'FORGE_DOCS' }, candidates[1]],
      })
    })
    expect(await screen.findByText('FORGE_DOCS')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'test-added-filter' }))
    fireEvent.change(search, { target: { value: 'local' } })
    expect(await screen.findByText('Local reference')).toBeInTheDocument()
    expect(screen.queryByText('FORGE_DOCS')).not.toBeInTheDocument()
    expect(grpcQueryKnowledgeBase).not.toHaveBeenCalled()
  })
})
