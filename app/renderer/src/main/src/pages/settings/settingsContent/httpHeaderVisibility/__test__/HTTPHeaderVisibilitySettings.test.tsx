import type { editor } from 'monaco-editor'
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { HTTPHeaderVisibilitySettings } from '../HTTPHeaderVisibilitySettings'
import { useEditorHeaderVisibility, type HeaderRole } from '@/store/editorHeaderVisibility'
import { DEFAULT_HIDDEN_HTTP_HEADERS } from '@/utils/hiddenHTTPHeaders'
import { useHiddenHTTPHeaders } from '@/utils/useHiddenHTTPHeaders'
import { FuzzerRemoteGV } from '@/enums/fuzzer'

const mocks = vi.hoisted(() => ({ read: vi.fn(), write: vi.fn(), failed: vi.fn(), notify: vi.fn() }))
vi.mock('@/utils/kv', () => ({ getRemoteValue: mocks.read, setRemoteValue: mocks.write }))
vi.mock('@/utils/notification', () => ({ yakitFailed: mocks.failed, yakitNotify: mocks.notify }))
vi.mock('@yakit-libs/yakit-ui-icons/outline', () => ({ TrashOutlined: () => null }))
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
const persistedSettings = () => JSON.parse(saved.get(FuzzerRemoteGV.WebFuzzerHeaderVisibility)!)
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
  const subscribe = () => ({ dispose: vi.fn() })
  const instance = {
    getModel: () => model,
    getContribution: () => undefined,
    setHiddenAreas: hiddenAreas,
    onDidChangeModelContent: subscribe,
    onDidChangeModel: subscribe,
    onDidDispose: subscribe,
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
const save = async () => {
  const calls = mocks.notify.mock.calls.length
  fireEvent.click(screen.getByRole('button', { name: 'save' }))
  await waitFor(() => expect(mocks.notify).toHaveBeenCalledTimes(calls + 1))
  expect(mocks.notify).toHaveBeenLastCalledWith('success', 'saved')
}

describe.each<HeaderRole>(['request', 'response'])('%s 全局 HTTP 头部隐藏设置', (role) => {
  it('新增名称去除首尾空格并转小写；保存后隐藏匹配头部，正文和原始报文保持完整', async () => {
    useEditorHeaderVisibility.setState({ hidden: { request: true, response: true } })
    const live = preview(role)
    const panel = (await open())[role]
    fireEvent.change(panel.getByRole('textbox'), { target: { value: ' X-Custom ' } })
    fireEvent.click(panel.getByRole('button', { name: 'add' }))
    expect(panel.getByText('x-custom')).toBeInTheDocument()
    expect(mocks.write).not.toHaveBeenCalled()
    await save()
    expect(persistedSettings()[role].headers).toEqual([...DEFAULT_HIDDEN_HTTP_HEADERS[role], 'x-custom'])
    expect(persistedSettings()[role].hidden).toBe(true)
    expect(live.hiddenAreas).toHaveBeenLastCalledWith([range(2, 3)], expect.any(Object))
    expect(preview(role).hiddenAreas).toHaveBeenLastCalledWith([range(2, 3)], expect.any(Object))
    expect(
      Array.from({ length: live.model.getLineCount() }, (_, n) => live.model.getLineContent(n + 1)).join('\n'),
    ).toBe(live.packet)
    expect(panel.getByRole('textbox')).toHaveValue('')
  })

  it('删除头部只影响该侧隐藏列表，保存后该头部重新显示', async () => {
    useEditorHeaderVisibility.setState({ hidden: { request: true, response: true } })
    const live = preview(role)
    const other = role === 'request' ? 'response' : 'request'
    const otherLive = preview(other)
    const panel = (await open())[role]
    expect(live.hiddenAreas).toHaveBeenLastCalledWith([range(2)], expect.any(Object))
    fireEvent.click(panel.getByRole('button', { name: `Remove ${baseHeader[role]}` }))
    expect(panel.queryByText(baseHeader[role])).not.toBeInTheDocument()
    await save()
    expect(persistedSettings()[role].headers).toEqual(
      DEFAULT_HIDDEN_HTTP_HEADERS[role].filter((name) => name !== baseHeader[role]),
    )
    expect(live.hiddenAreas).toHaveBeenLastCalledWith([], expect.any(Object))
    expect(useEditorHeaderVisibility.getState().headers[other]).toEqual(DEFAULT_HIDDEN_HTTP_HEADERS[other])
    expect(otherLive.hiddenAreas).toHaveBeenLastCalledWith([range(2)], expect.any(Object))
  })

  it('清空会保存空列表，不自动回填默认值，也不隐藏任何头部', async () => {
    useEditorHeaderVisibility.setState({ hidden: { request: true, response: true } })
    const live = preview(role)
    const panel = (await open())[role]
    fireEvent.change(panel.getByRole('textbox'), { target: { value: 'X-Pending' } })
    fireEvent.click(panel.getByRole('button', { name: 'clear' }))
    expect(panel.getByRole('textbox')).toHaveValue('')
    await save()
    expect(persistedSettings()[role].headers).toEqual([])
    expect(persistedSettings()[role].hidden).toBe(true)
    expect(live.hiddenAreas).toHaveBeenLastCalledWith([], expect.any(Object))
    cleanup()
    const reopened = (await open())[role]
    expect(reopened.getByText('empty')).toBeInTheDocument()
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
    fireEvent.change(panel.getByRole('textbox'), { target: { value: 'bad:header' } })
    fireEvent.click(panel.getByRole('button', { name: 'add' }))
    expect(panel.getByRole('alert')).toHaveTextContent('invalidName')
    fireEvent.click(panel.getByRole('button', { name: 'restoreDefaults' }))
    expect(panel.queryByRole('alert')).not.toBeInTheDocument()
    expect(panel.getByRole('textbox')).toHaveValue('')
    expect(panel.getAllByRole('button', { name: /^Remove / })).toHaveLength(DEFAULT_HIDDEN_HTTP_HEADERS[role].length)
    await save()
    expect(persistedSettings()[role].headers).toEqual(DEFAULT_HIDDEN_HTTP_HEADERS[role])
    expect(persistedSettings()[role].hidden).toBe(true)
    expect(live.hiddenAreas).toHaveBeenLastCalledWith([range(2)], expect.any(Object))
    expect(useEditorHeaderVisibility.getState().headers[other]).toEqual(['x-custom'])
    expect(useEditorHeaderVisibility.getState().hidden[other]).toBe(true)
  })
})

describe('全局设置的提交、丢弃和失败处理', () => {
  it('工具栏切换隐藏状态时，未保存的表单修改不会被覆盖', async () => {
    const { response, unmount } = await open()
    await act(async () => {
      await useEditorHeaderVisibility.getState().toggle('response')
    })
    fireEvent.click(response.getByRole('button', { name: 'Remove server' }))
    await act(async () => {
      await useEditorHeaderVisibility.getState().toggle('response')
    })
    expect(response.queryByText('server')).not.toBeInTheDocument()
    unmount()
    const reopened = (await open()).response
    expect(reopened.getByText('server')).toBeInTheDocument()
  })

  it.each<HeaderRole>(['request', 'response'])('%s 保存名单时保留草稿期间切换的隐藏状态', async (role) => {
    const page = await open()
    const panel = page[role]
    fireEvent.change(panel.getByRole('textbox'), { target: { value: 'X-Live' } })
    fireEvent.click(panel.getByRole('button', { name: 'add' }))
    await act(async () => {
      await useEditorHeaderVisibility.getState().toggle(role)
    })
    expect(useEditorHeaderVisibility.getState().hidden[role]).toBe(true)
    await save()
    expect(persistedSettings()[role].hidden).toBe(true)
    expect(persistedSettings()[role].headers).toContain('x-live')
    expect(useEditorHeaderVisibility.getState().hidden[role]).toBe(true)
  })

  it.each<HeaderRole>(['request', 'response'])(
    '%s 未保存就关闭：丢弃新增、删除、输入与错误，不写入存储或影响编辑器',
    async (role) => {
      const live = preview(role)
      const page = await open()
      const panel = page[role]
      expect(screen.queryByRole('button', { name: 'cancel' })).not.toBeInTheDocument()
      fireEvent.change(panel.getByRole('textbox'), { target: { value: 'X-Draft' } })
      fireEvent.click(panel.getByRole('button', { name: 'add' }))
      fireEvent.click(panel.getByRole('button', { name: `Remove ${baseHeader[role]}` }))
      fireEvent.change(panel.getByRole('textbox'), { target: { value: 'Bad: header' } })
      fireEvent.click(panel.getByRole('button', { name: 'add' }))
      expect(panel.getByRole('alert')).toHaveTextContent('invalidName')
      page.unmount()
      const reopened = (await open())[role]
      expect(reopened.queryByText('x-draft')).not.toBeInTheDocument()
      expect(reopened.getByText(baseHeader[role])).toBeInTheDocument()
      expect(reopened.getByRole('textbox')).toHaveValue('')
      expect(reopened.queryByRole('alert')).not.toBeInTheDocument()
      expect(mocks.write).not.toHaveBeenCalled()
      expect(useEditorHeaderVisibility.getState().headers[role]).toEqual(DEFAULT_HIDDEN_HTTP_HEADERS[role])
      expect(useEditorHeaderVisibility.getState().hidden[role]).toBe(false)
      expect(live.hiddenAreas).not.toHaveBeenCalled()
    },
  )

  it('只有点击保存才提交；之后清空或恢复默认但未保存，重新打开仍显示上次提交的配置', async () => {
    const page = await open()
    fireEvent.change(page.request.getByRole('textbox'), { target: { value: 'X-Saved' } })
    fireEvent.click(page.request.getByRole('button', { name: 'add' }))
    expect(mocks.write).not.toHaveBeenCalled()
    await save()
    const writesAfterSave = mocks.write.mock.calls.length
    const stored = new Map(saved)
    fireEvent.click(page.request.getByRole('button', { name: 'clear' }))
    fireEvent.click(page.request.getByRole('button', { name: 'restoreDefaults' }))
    expect(page.request.queryByText('x-saved')).not.toBeInTheDocument()
    page.unmount()
    const reopened = (await open()).request
    expect(reopened.getByText('x-saved')).toBeInTheDocument()
    expect(mocks.write).toHaveBeenCalledTimes(writesAfterSave)
    expect(saved).toEqual(stored)
  })

  it('大小写不同的同名头部不能重复新增；非法名称阻止保存', async () => {
    const { request } = await open()
    fireEvent.change(request.getByRole('textbox'), { target: { value: ' ACCEPT ' } })
    fireEvent.click(request.getByRole('button', { name: 'add' }))
    expect(request.getByRole('alert')).toHaveTextContent('duplicateName')
    expect(request.getAllByRole('button', { name: 'Remove accept' })).toHaveLength(1)
    fireEvent.change(request.getByRole('textbox'), { target: { value: 'Bad: header' } })
    fireEvent.click(screen.getByRole('button', { name: 'save' }))
    expect(request.getByRole('alert')).toHaveTextContent('invalidName')
    expect(mocks.write).not.toHaveBeenCalled()
  })

  it('保存包含尚未点击新增的合法输入；失败保留草稿，重试成功后才更新配置', async () => {
    const { request } = await open()
    mocks.write.mockRejectedValueOnce(new Error('save failed'))
    fireEvent.change(request.getByRole('textbox'), { target: { value: 'X-Pending' } })
    fireEvent.click(screen.getByRole('button', { name: 'save' }))
    await waitFor(() => expect(mocks.failed).toHaveBeenCalled())
    expect(mocks.notify).not.toHaveBeenCalled()
    expect(request.getByRole('textbox')).toHaveValue('X-Pending')
    expect(useEditorHeaderVisibility.getState().headers.request).not.toContain('x-pending')
    expect(screen.getByRole('button', { name: 'save' })).toBeEnabled()
    await save()
    expect(persistedSettings().request.headers).toEqual([...DEFAULT_HIDDEN_HTTP_HEADERS.request, 'x-pending'])
    expect(request.getByRole('textbox')).toHaveValue('')
    expect(request.getByText('x-pending')).toBeInTheDocument()
  })

  it('加载失败时禁止保存，重试加载成功后才允许编辑', async () => {
    useEditorHeaderVisibility.setState({ ready: { request: false, response: false } })
    render(<HTTPHeaderVisibilitySettings />)
    await screen.findByRole('button', { name: 'retry' })
    expect(screen.getByRole('button', { name: 'save' })).toBeDisabled()
    useEditorHeaderVisibility.setState({ ready: { request: true, response: true } })
    fireEvent.click(screen.getByRole('button', { name: 'retry' }))
    await screen.findByRole('region', { name: 'request' })
    expect(screen.getByRole('button', { name: 'save' })).toBeEnabled()
  })
})
