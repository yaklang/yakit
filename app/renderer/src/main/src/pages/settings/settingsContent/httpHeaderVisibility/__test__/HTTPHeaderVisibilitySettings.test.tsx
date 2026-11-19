import type { editor } from 'monaco-editor'
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { HTTPHeaderVisibilitySettings } from '../HTTPHeaderVisibilitySettings'
import { useEditorHeaderVisibility, type HeaderRole } from '@/store/editorHeaderVisibility'
import { DEFAULT_HIDDEN_HTTP_HEADERS } from '@/utils/hiddenHTTPHeaders'
import { useHiddenHTTPHeaders } from '@/utils/useHiddenHTTPHeaders'
import { FuzzerRemoteGV } from '@/enums/fuzzer'

const mocks = vi.hoisted(() => ({ read: vi.fn(), write: vi.fn(), failed: vi.fn() }))
vi.mock('@/utils/kv', () => ({ getRemoteValue: mocks.read, setRemoteValue: mocks.write }))
vi.mock('@/utils/notification', () => ({ yakitFailed: mocks.failed }))
vi.mock('@yakit-libs/yakit-ui-icons/outline', () => ({
  PlusOutlined: () => null,
  RefreshOutlined: () => null,
  TrashOutlined: () => null,
}))
vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      const name = key.split('.').pop()
      if (name === 'remove') return `Remove ${params?.header}`
      if (name === 'newHeader') return `New ${params?.role}`
      if (name === 'count') return `${params?.count} headers`
      return name
    },
  }),
}))
vi.mock('@/components/yakitUI/YakitButton/YakitButton', () => ({
  YakitButton: ({ size, type, icon, loading, disabled, ...props }) => (
    <button disabled={disabled || loading} {...props} />
  ),
}))
vi.mock('@/components/yakitUI/YakitInput/YakitInput', () => ({
  YakitInput: ({ onPressEnter, ...props }) => (
    <input {...props} onKeyDown={(event) => event.key === 'Enter' && onPressEnter()} />
  ),
}))
vi.mock('@/components/yakitUI/YakitSpin/YakitSpin', () => ({ YakitSpin: () => <span role="status">Loading</span> }))

const saved = new Map<string, string>()
const persistedSettings = () => JSON.parse(saved.get(FuzzerRemoteGV.HTTPHeaderVisibility)!)
const baseHeader = { request: 'accept', response: 'server' }

// Keep the real settings component, store, normalization and editor hiding hook together.
// Only the external persistence boundary and Monaco's view API are replaced.
const preview = (role: HeaderRole) => {
  const packet =
    role === 'request'
      ? 'GET / HTTP/1.1\nAccept: */*\nX-Custom: value\nHost: example.com\n\nX-Custom: body'
      : 'HTTP/1.1 200 OK\nServer: example\nX-Custom: value\nContent-Type: text/plain\n\nX-Custom: body'
  const model = {
    getLineCount: () => packet.split('\n').length,
    getLineContent: (n: number) => packet.split('\n')[n - 1],
  }
  const hiddenAreas = vi.fn()
  const instance = {
    getModel: () => model,
    setHiddenAreas: hiddenAreas,
    getContribution: () => undefined,
    onDidChangeModelContent: () => ({ dispose: vi.fn() }),
    onDidChangeModel: () => ({ dispose: vi.fn() }),
    onDidDispose: () => ({ dispose: vi.fn() }),
  }
  const importedRequestHidden = useEditorHeaderVisibility.getState().hidden.request
  renderHook(() => {
    const responseHidden = useEditorHeaderVisibility((state) => state.hidden.response)
    const hidden = role === 'request' ? importedRequestHidden : responseHidden
    const headers = useEditorHeaderVisibility((state) => state.headers[role])
    useHiddenHTTPHeaders(instance as unknown as editor.IStandaloneCodeEditor, hidden, role === 'response', headers)
  })
  return { hiddenAreas, packet, model }
}
const range = (start: number, end = start) => ({
  startLineNumber: start,
  startColumn: 1,
  endLineNumber: end,
  endColumn: 1,
})

beforeEach(async () => {
  vi.clearAllMocks()
  saved.clear()
  mocks.write.mockReset().mockImplementation(async (key: string, value: string) => {
    saved.set(key, value)
  })
  useEditorHeaderVisibility.setState({
    hidden: { request: false, response: false },
    headers: { ...DEFAULT_HIDDEN_HTTP_HEADERS },
    ready: { request: true, response: true },
    initialize: async () => {},
  })
  await useEditorHeaderVisibility.getState().saveSettings({
    request: { hidden: false, headers: DEFAULT_HIDDEN_HTTP_HEADERS.request },
    response: { hidden: false, headers: DEFAULT_HIDDEN_HTTP_HEADERS.response },
  })
  saved.clear()
  vi.clearAllMocks()
})
afterEach(cleanup)

const open = async () => {
  const view = render(<HTTPHeaderVisibilitySettings />)
  await screen.findByRole('region', { name: 'request' })
  return {
    ...view,
    request: within(screen.getByRole('region', { name: 'request' })),
    response: within(screen.getByRole('region', { name: 'response' })),
  }
}

describe.each<HeaderRole>(['request', 'response'])('%s 全局 HTTP 头部隐藏设置', (role) => {
  it('新增名称去除首尾空格并转小写，改动立即写入并隐藏匹配头部', async () => {
    useEditorHeaderVisibility.setState({ hidden: { request: true, response: true } })
    const live = preview(role)
    const panel = (await open())[role]
    fireEvent.click(panel.getByRole('button', { name: 'add' }))
    fireEvent.change(panel.getByRole('textbox'), { target: { value: ' X-Custom ' } })
    fireEvent.keyDown(panel.getByRole('textbox'), { key: 'Enter' })
    await waitFor(() =>
      expect(persistedSettings()[role].headers).toEqual(['x-custom', ...DEFAULT_HIDDEN_HTTP_HEADERS[role]]),
    )
    expect(persistedSettings()[role].hidden).toBe(true)
    expect(panel.getByText('x-custom')).toBeInTheDocument()
    expect(live.hiddenAreas).toHaveBeenLastCalledWith([range(2, 3)], expect.any(Object))
    expect(preview(role).hiddenAreas).toHaveBeenLastCalledWith([range(2, 3)], expect.any(Object))
    expect(
      Array.from({ length: live.model.getLineCount() }, (_, n) => live.model.getLineContent(n + 1)).join('\n'),
    ).toBe(live.packet)
    expect(panel.queryByRole('textbox')).toBeNull()
  })

  it('删除头部立即生效，且只影响该侧隐藏列表', async () => {
    useEditorHeaderVisibility.setState({ hidden: { request: true, response: true } })
    const live = preview(role)
    const other = role === 'request' ? 'response' : 'request'
    const otherLive = preview(other)
    const panel = (await open())[role]
    expect(live.hiddenAreas).toHaveBeenLastCalledWith([range(2)], expect.any(Object))
    fireEvent.click(panel.getByRole('button', { name: `Remove ${baseHeader[role]}` }))
    await waitFor(() =>
      expect(persistedSettings()[role].headers).toEqual(
        DEFAULT_HIDDEN_HTTP_HEADERS[role].filter((name) => name !== baseHeader[role]),
      ),
    )
    expect(panel.queryByText(baseHeader[role])).not.toBeInTheDocument()
    expect(live.hiddenAreas).toHaveBeenLastCalledWith([], expect.any(Object))
    expect(useEditorHeaderVisibility.getState().headers[other]).toEqual(DEFAULT_HIDDEN_HTTP_HEADERS[other])
    expect(otherLive.hiddenAreas).toHaveBeenLastCalledWith([range(2)], expect.any(Object))
  })

  it('清空会立即保存空列表，不自动回填默认值，也不隐藏任何头部', async () => {
    useEditorHeaderVisibility.setState({ hidden: { request: true, response: true } })
    const live = preview(role)
    const panel = (await open())[role]
    fireEvent.click(panel.getByRole('button', { name: 'clear' }))
    await waitFor(() => expect(persistedSettings()[role].headers).toEqual([]))
    expect(persistedSettings()[role].hidden).toBe(true)
    expect(live.hiddenAreas).toHaveBeenLastCalledWith([], expect.any(Object))
    cleanup()
    const reopened = (await open())[role]
    expect(reopened.getByText('noData')).toBeInTheDocument()
    expect(reopened.queryAllByRole('button', { name: /^Remove / })).toHaveLength(0)
  })

  it('恢复默认只重置该侧完整预置列表，保留当前隐藏状态，清理输入及错误，不改变另一侧', async () => {
    const other = role === 'request' ? 'response' : 'request'
    useEditorHeaderVisibility.setState({
      hidden: { request: true, response: true },
      headers: { request: ['x-custom'], response: ['x-custom'] },
    })
    const live = preview(role)
    const panel = (await open())[role]
    fireEvent.click(panel.getByRole('button', { name: 'add' }))
    fireEvent.change(panel.getByRole('textbox'), { target: { value: 'bad:header' } })
    fireEvent.keyDown(panel.getByRole('textbox'), { key: 'Enter' })
    expect(panel.getByRole('alert')).toHaveTextContent('invalidName')
    fireEvent.click(panel.getByRole('button', { name: 'restoreDefaults' }))
    expect(panel.queryByRole('alert')).not.toBeInTheDocument()
    expect(panel.queryByRole('textbox')).toBeNull()
    await waitFor(() => expect(persistedSettings()[role].headers).toEqual(DEFAULT_HIDDEN_HTTP_HEADERS[role]))
    expect(persistedSettings()[role].hidden).toBe(true)
    expect(panel.getAllByRole('button', { name: /^Remove / })).toHaveLength(DEFAULT_HIDDEN_HTTP_HEADERS[role].length)
    expect(live.hiddenAreas).toHaveBeenLastCalledWith([range(2)], expect.any(Object))
    expect(useEditorHeaderVisibility.getState().headers[other]).toEqual(['x-custom'])
    expect(useEditorHeaderVisibility.getState().hidden[other]).toBe(true)
  })
})

describe('全局设置的即时保存与失败处理', () => {
  it('设置页不提供保存按钮，列表改动即时写入，工具栏切换不会覆盖名单', async () => {
    const page = await open()
    expect(screen.queryByRole('button', { name: 'save' })).toBeNull()
    fireEvent.click(page.request.getByRole('button', { name: 'add' }))
    fireEvent.change(page.request.getByRole('textbox'), { target: { value: 'X-Live' } })
    fireEvent.keyDown(page.request.getByRole('textbox'), { key: 'Enter' })
    await waitFor(() => expect(persistedSettings().request.headers).toContain('x-live'))
    await act(async () => {
      await useEditorHeaderVisibility.getState().toggle('response')
    })
    expect(persistedSettings().response.hidden).toBe(true)
    expect(useEditorHeaderVisibility.getState().headers.request).toContain('x-live')
  })

  it('新增输入框失焦时也会提交', async () => {
    const { request } = await open()
    const addButton = request.getByRole('button', { name: 'add' })
    fireEvent.mouseDown(addButton)
    fireEvent.click(addButton)
    fireEvent.change(request.getByRole('textbox'), { target: { value: 'X-Blur' } })
    fireEvent.blur(request.getByRole('textbox'))
    await waitFor(() =>
      expect(persistedSettings().request.headers).toEqual(['x-blur', ...DEFAULT_HIDDEN_HTTP_HEADERS.request]),
    )
    expect(request.queryByRole('textbox')).toBeNull()
  })

  it('大小写不同的同名头部不能重复新增；非法名称不写入', async () => {
    const { request } = await open()
    fireEvent.click(request.getByRole('button', { name: 'add' }))
    fireEvent.change(request.getByRole('textbox'), { target: { value: ' ACCEPT ' } })
    fireEvent.keyDown(request.getByRole('textbox'), { key: 'Enter' })
    expect(request.getByRole('alert')).toHaveTextContent('duplicateName')
    expect(request.getAllByRole('button', { name: 'Remove accept' })).toHaveLength(1)
    expect(mocks.write).not.toHaveBeenCalled()
    fireEvent.change(request.getByRole('textbox'), { target: { value: 'Bad: header' } })
    fireEvent.keyDown(request.getByRole('textbox'), { key: 'Enter' })
    expect(request.getByRole('alert')).toHaveTextContent('invalidName')
    expect(mocks.write).not.toHaveBeenCalled()
  })

  it('写入失败时保留输入和原列表，重试成功后即时生效', async () => {
    const { request } = await open()
    mocks.write.mockRejectedValueOnce(new Error('save failed'))
    fireEvent.click(request.getByRole('button', { name: 'add' }))
    fireEvent.change(request.getByRole('textbox'), { target: { value: 'X-Pending' } })
    fireEvent.keyDown(request.getByRole('textbox'), { key: 'Enter' })
    await waitFor(() => expect(mocks.failed).toHaveBeenCalled())
    expect(request.getByRole('textbox')).toHaveValue('X-Pending')
    expect(useEditorHeaderVisibility.getState().headers.request).not.toContain('x-pending')
    fireEvent.keyDown(request.getByRole('textbox'), { key: 'Enter' })
    await waitFor(() =>
      expect(persistedSettings().request.headers).toEqual(['x-pending', ...DEFAULT_HIDDEN_HTTP_HEADERS.request]),
    )
    expect(request.queryByRole('textbox')).toBeNull()
    expect(request.getByText('x-pending')).toBeInTheDocument()
  })

  it('加载失败后可重试，成功后直接显示列表', async () => {
    useEditorHeaderVisibility.setState({ ready: { request: false, response: false } })
    render(<HTTPHeaderVisibilitySettings />)
    await screen.findByRole('button', { name: 'retry' })
    expect(screen.queryByRole('region', { name: 'request' })).toBeNull()
    useEditorHeaderVisibility.setState({ ready: { request: true, response: true } })
    fireEvent.click(screen.getByRole('button', { name: 'retry' }))
    await screen.findByRole('region', { name: 'request' })
    expect(screen.queryByRole('button', { name: 'save' })).toBeNull()
  })
})
