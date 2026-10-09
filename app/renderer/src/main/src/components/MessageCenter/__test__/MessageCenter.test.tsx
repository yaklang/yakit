import '../../../pages/ai-re-act/hooks/__test__/setupElectron'
import type React from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { API } from '@/services/swagger/resposeType'
import { MessageCenterModal } from '../MessageCenter'

const mocks = vi.hoisted(() => ({
  queryWeb: vi.fn(),
  queryPlugin: vi.fn(),
  readWeb: vi.fn(),
  readPlugin: vi.fn(),
  failed: vi.fn(),
}))

vi.mock('../utils', () => ({
  apiFetchMessageClear: vi.fn(),
  apiFetchMessageRead: (...args: unknown[]) => mocks.readPlugin(...args),
  apiFetchQueryMessage: (...args: unknown[]) => mocks.queryPlugin(...args),
  apiFetchQueryWebMessage: (...args: unknown[]) => mocks.queryWeb(...args),
  apiFetchWebMessageClear: vi.fn(),
  apiFetchWebMessageRead: (...args: unknown[]) => mocks.readWeb(...args),
}))

vi.mock('@/utils/envfile', () => ({ isEnpriTrace: () => true }))
vi.mock('@/utils/notification', () => ({ failed: (...args: unknown[]) => mocks.failed(...args), yakitNotify: vi.fn() }))
vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({ t: (key: string) => key, i18nRefresh: false }),
}))
vi.mock('@/pages/plugins/funcTemplate', () => ({ AuthorImg: () => <span /> }))
vi.mock('@/pages/notepadManage/hook/useGoEditNotepad', () => ({ useGoEditNotepad: () => ({ goEditNotepad: vi.fn() }) }))
vi.mock('../useEETaskNotificationHook', () => ({
  useEETaskNotificationHook: () => [false, { visible: false }, { visible: false }, { startT: vi.fn() }],
}))
vi.mock('../WebMessageSyncButton', () => ({ WebMessageSyncButton: () => null }))
vi.mock('re-resizable', () => ({ Resizable: ({ children }: React.PropsWithChildren) => <div>{children}</div> }))
vi.mock('../../RollingLoadList/RollingLoadList', () => ({
  RollingLoadList: ({ data, renderRow }: { data: any[]; renderRow: (item: any, index: number) => React.ReactNode }) => (
    <div data-testid="message-list" data-state={JSON.stringify(data)}>
      {data.map(renderRow)}
    </div>
  ),
}))
vi.mock('../../yakitUI/YakitHint/YakitHint', () => ({ YakitHint: () => null }))
vi.mock('../../yakitUI/YakitButton/YakitButton', () => ({
  YakitButton: ({ children, onClick }: React.PropsWithChildren<{ onClick?: () => void }>) => (
    <button onClick={onClick}>{children}</button>
  ),
}))
vi.mock('../../yakitUI/YakitRadioButtons/YakitRadioButtons', () => ({
  YakitRadioButtons: ({ onChange }: { onChange: (event: { target: { value: string } }) => void }) => (
    <div>
      <button onClick={() => onChange({ target: { value: 'web' } })}>web-channel</button>
      <button onClick={() => onChange({ target: { value: 'plugin' } })}>plugin-channel</button>
    </div>
  ),
}))
vi.mock('../../yakitUI/YakitTabs/YakitTabs', () => {
  const YakitTabs = ({ children, onChange }: React.PropsWithChildren<{ onChange: (key: string) => void }>) => (
    <div>
      <button onClick={() => onChange('unread')}>unread-tab</button>
      <button onClick={() => onChange('all')}>all-tab</button>
      {children}
    </div>
  )
  YakitTabs.YakitTabPane = ({ children, tab }: React.PropsWithChildren<{ tab?: React.ReactNode }>) => (
    <div>
      {tab}
      {children}
    </div>
  )
  return { default: YakitTabs }
})

const response = (data: Array<Partial<API.MessageLogDetail>>, total = data.length) => ({
  pagemeta: { total },
  data,
})

const message = (hash: string, isRead = false): API.MessageLogDetail =>
  ({
    id: 1,
    hash,
    isRead,
    upPluginType: 'web',
    handlerUserName: hash,
    handlerHeadImag: '',
    handlerRole: '',
    created_at: 1,
    updated_at: 1,
    description: hash,
    scriptName: '',
    uuid: '',
    upPluginLogId: 0,
    status: 0,
  }) as API.MessageLogDetail

const deferred = <T,>() => {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

const currentState = () => JSON.parse(screen.getAllByTestId('message-list')[0].getAttribute('data-state') || '[]')

describe('MessageCenterModal request lifecycle', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mocks.readWeb.mockResolvedValue(true)
    mocks.readPlugin.mockResolvedValue(true)
  })

  it('ignores an old web response after switching to the plugin channel', async () => {
    const web = deferred<ReturnType<typeof response>>()
    mocks.queryWeb.mockReturnValueOnce(web.promise)
    mocks.queryPlugin.mockResolvedValueOnce(response([message('plugin')]))

    render(<MessageCenterModal visible={true} setVisible={vi.fn()} initialChannel="web" />)
    fireEvent.click(screen.getByRole('button', { name: 'plugin-channel' }))

    await waitFor(() => expect(currentState()).toEqual([expect.objectContaining({ hash: 'plugin' })]))
    await act(async () => web.resolve(response([message('web')], 4)))

    expect(currentState()).toEqual([expect.objectContaining({ hash: 'plugin' })])
  })

  it('ignores an old unread response after switching to the all tab', async () => {
    const unread = deferred<ReturnType<typeof response>>()
    mocks.queryWeb.mockReturnValueOnce(unread.promise).mockResolvedValueOnce(response([message('all-current', true)]))

    render(<MessageCenterModal visible={true} setVisible={vi.fn()} initialChannel="web" />)
    fireEvent.click(screen.getByRole('button', { name: 'all-tab' }))

    await waitFor(() => expect(currentState()).toEqual([expect.objectContaining({ hash: 'all-current' })]))
    await act(async () => unread.resolve(response([message('unread-old')], 4)))

    expect(currentState()).toEqual([expect.objectContaining({ hash: 'all-current' })])
  })

  it('does not report or write a pending request after unmount', async () => {
    const pending = deferred<ReturnType<typeof response>>()
    mocks.queryWeb.mockReturnValueOnce(pending.promise)
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const view = render(<MessageCenterModal visible={true} setVisible={vi.fn()} initialChannel="web" />)

    view.unmount()
    await act(async () => pending.resolve(response([message('late')])))

    expect(consoleError).not.toHaveBeenCalled()
    expect(mocks.failed).not.toHaveBeenCalled()
    consoleError.mockRestore()
  })
})

describe('MessageCenterModal web read state', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('marks a web message read in the all tab and decreases the unread count', async () => {
    const unreadMessage = message('web-unread')
    const read = deferred<boolean>()
    mocks.queryWeb
      .mockResolvedValueOnce(response([unreadMessage], 2))
      .mockResolvedValueOnce(response([unreadMessage], 2))
    mocks.readWeb.mockReturnValue(read.promise)

    render(<MessageCenterModal visible={true} setVisible={vi.fn()} initialChannel="web" />)
    await waitFor(() => expect(currentState()).toEqual([expect.objectContaining({ hash: 'web-unread' })]))
    fireEvent.click(screen.getByRole('button', { name: 'all-tab' }))
    await waitFor(() => expect(mocks.queryWeb).toHaveBeenCalledTimes(2))
    fireEvent.click(screen.getAllByText('web-unread')[0])
    fireEvent.click(screen.getAllByText('web-unread')[0])
    await act(async () => read.resolve(true))

    await waitFor(() => expect(currentState()).toEqual([expect.objectContaining({ hash: 'web-unread', isRead: true })]))
    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('ignores a web read callback after switching to the plugin channel', async () => {
    const read = deferred<boolean>()
    mocks.queryWeb.mockResolvedValueOnce(response([message('web-pending')], 2))
    mocks.queryPlugin.mockResolvedValueOnce(response([message('plugin-current')], 3))
    mocks.readWeb.mockReturnValueOnce(read.promise)

    render(<MessageCenterModal visible={true} setVisible={vi.fn()} initialChannel="web" />)
    await waitFor(() => expect(currentState()).toEqual([expect.objectContaining({ hash: 'web-pending' })]))
    fireEvent.click(screen.getAllByText('web-pending')[0])
    fireEvent.click(screen.getByRole('button', { name: 'plugin-channel' }))
    await waitFor(() => expect(currentState()).toEqual([expect.objectContaining({ hash: 'plugin-current' })]))
    await act(async () => read.resolve(true))

    expect(currentState()).toEqual([expect.objectContaining({ hash: 'plugin-current', isRead: false })])
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('keeps a web message unread when the read API reports failure', async () => {
    const unreadMessage = message('read-failed')
    mocks.queryWeb
      .mockResolvedValueOnce(response([unreadMessage], 2))
      .mockResolvedValueOnce(response([unreadMessage], 2))
    mocks.readWeb.mockResolvedValueOnce(false)

    render(<MessageCenterModal visible={true} setVisible={vi.fn()} initialChannel="web" />)
    await waitFor(() => expect(currentState()).toEqual([expect.objectContaining({ hash: 'read-failed' })]))
    fireEvent.click(screen.getByRole('button', { name: 'all-tab' }))
    await waitFor(() => expect(mocks.queryWeb).toHaveBeenCalledTimes(2))
    fireEvent.click(screen.getAllByText('read-failed')[0])

    await waitFor(() => expect(mocks.readWeb).toHaveBeenCalledTimes(1))
    expect(currentState()).toEqual([expect.objectContaining({ hash: 'read-failed', isRead: false })])
    expect(screen.getByText('2')).toBeInTheDocument()
  })
})
