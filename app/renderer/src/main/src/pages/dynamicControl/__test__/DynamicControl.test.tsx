import type React from 'react'
import type * as Ahooks from 'ahooks'
import type { ControlAdminPage as ControlAdminPageComponent } from '../DynamicControl'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

const { failed, networkApi } = vi.hoisted(() => ({
  failed: vi.fn(),
  networkApi: vi.fn(),
}))

vi.mock('@/services/fetch', () => ({ NetWorkApi: networkApi }))
vi.mock('@/utils/notification', () => ({ failed, warn: vi.fn() }))
vi.mock('@/components/yakitUI/YakitSpin/YakitSpin', () => ({
  YakitSpin: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))
vi.mock('@/components/yakitUI/YakitDatePicker/YakitDatePicker', () => ({
  YakitDatePicker: { RangePicker: () => null },
}))
vi.mock('@/components/yakitUI/YakitInput/YakitInput', () => ({
  YakitInput: {
    Search: ({ value, onChange, onSearch }: any) => (
      <div>
        <input aria-label="用户名" value={value} onChange={onChange} />
        <button onClick={onSearch}>搜索</button>
      </div>
    ),
  },
}))
vi.mock('@/components/yakitUI/YakitMenu/YakitMenu', () => ({
  YakitMenu: ({ data, onClick }: any) => (
    <div>
      {data.map(({ key, label }: any) => (
        <button key={key} onClick={() => onClick({ key })}>
          {label}
        </button>
      ))}
    </div>
  ),
}))
vi.mock('../VirtualTable', () => ({
  VirtualTable: ({ columns, loadMoreData }: any) => (
    <div>
      <button onClick={loadMoreData}>加载更多</button>
      {columns.find(({ dataIndex }: any) => dataIndex === 'status')?.filterProps?.filterRender()}
    </div>
  ),
}))
vi.mock('ahooks', async (importOriginal) => {
  const actual = await importOriginal<typeof Ahooks>()
  return {
    ...actual,
    useDebounceFn: (fn: (...args: any[]) => unknown) => ({ run: fn }),
  }
})

let ControlAdminPage: typeof ControlAdminPageComponent

const remoteResponse = (page: number, total = 45) => ({
  data: [],
  pagemeta: { page, limit: 20, total },
})

describe('ControlAdminPage remote/list 请求', () => {
  beforeAll(async () => {
    Object.defineProperty(window, 'require', {
      configurable: true,
      value: vi.fn(() => ({ ipcRenderer: { invoke: vi.fn() } })),
    })
    ;({ ControlAdminPage } = await import('../DynamicControl'))
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('首屏使用 POST 默认分页，筛选时重置第一页，加载更多时请求下一页', async () => {
    networkApi
      .mockResolvedValueOnce(remoteResponse(1))
      .mockResolvedValueOnce(remoteResponse(2))
      .mockResolvedValueOnce(remoteResponse(1))
      .mockResolvedValueOnce(remoteResponse(1))

    render(<ControlAdminPage />)

    await waitFor(() => expect(networkApi).toHaveBeenCalledTimes(1))
    expect(networkApi).toHaveBeenNthCalledWith(1, {
      method: 'post',
      url: 'remote/list',
      data: {
        limit: 20,
        order: 'desc',
        order_by: 'updated_at',
        page: 1,
        user_name: '',
      },
    })

    await waitFor(() => expect(screen.getByText('45')).toBeInTheDocument())
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '加载更多' }))
    })

    await waitFor(() => expect(networkApi).toHaveBeenCalledTimes(2))
    expect(networkApi).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        method: 'post',
        url: 'remote/list',
        data: expect.objectContaining({ page: 2, limit: 20, user_name: '' }),
      }),
    )

    fireEvent.change(screen.getByRole('textbox', { name: '用户名' }), { target: { value: 'alice' } })
    fireEvent.click(screen.getByRole('button', { name: '搜索' }))

    await waitFor(() => expect(networkApi).toHaveBeenCalledTimes(3))
    expect(networkApi).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        method: 'post',
        url: 'remote/list',
        data: expect.objectContaining({ page: 1, limit: 20, user_name: 'alice' }),
      }),
    )

    fireEvent.click(screen.getByRole('button', { name: '远程中' }))

    await waitFor(() => expect(networkApi).toHaveBeenCalledTimes(4))
    expect(networkApi).toHaveBeenNthCalledWith(
      4,
      expect.objectContaining({
        method: 'post',
        url: 'remote/list',
        data: expect.objectContaining({ page: 1, status: 'true', user_name: 'alice' }),
      }),
    )
  })

  it('remote/list 请求失败时展示错误提示', async () => {
    networkApi.mockRejectedValueOnce(new Error('offline'))

    render(<ControlAdminPage />)

    await waitFor(() => expect(failed).toHaveBeenCalledWith('获取远程管理列表失败：Error: offline'))
  })
})
