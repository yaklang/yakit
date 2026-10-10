import '../../../pages/ai-re-act/hooks/__test__/setupElectron'
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ipcRendererMock, resetIpcMocks } from '../../../pages/ai-re-act/hooks/__test__/setupElectron'
import { useEETaskNotificationHook } from '../useEETaskNotificationHook'
import { apiFetchMessageRead } from '../utils'
import type { API } from '@/services/swagger/resposeType'

vi.mock('@/store', () => ({
  useStore: () => ({ userInfo: { isLogin: true } }),
}))

vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({ t: (key: string) => key }),
}))

vi.mock('@/utils/envfile', () => ({
  isEnpriTrace: () => true,
}))

vi.mock('@/utils/notification', () => ({
  yakitNotify: vi.fn(),
}))

vi.mock('@/pages/softwareSettings/projectUtils', () => ({
  getEnvTypeByProjects: () => 'project',
}))

vi.mock('../utils', () => ({
  apiFetchMessageRead: vi.fn().mockResolvedValue(true),
  apiFetchQueryAllTask: vi.fn().mockResolvedValue({ data: [] }),
}))

describe('useEETaskNotificationHook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetIpcMocks()
    ipcRendererMock.invoke.mockImplementation((channel: string) => {
      if (channel === 'GetProjects') return Promise.resolve({ Projects: [] })
      if (channel === 'NewProject') return Promise.resolve({})
      return Promise.resolve(undefined)
    })
  })

  it('does not mark a new task read until the user confirms and project import succeeds', async () => {
    const task = {
      id: 1,
      hash: 'new-task-hash',
      status: 1,
      upPluginType: 'task',
      taskName: 'pending project',
      subTaskId: 'sub-task-id',
    } as API.MessageLogDetail
    const { result } = renderHook(() => useEETaskNotificationHook({}))

    act(() => result.current[3].startT({ item: task }))

    await waitFor(() => expect(result.current[1].visible).toBe(true))
    expect(apiFetchMessageRead).not.toHaveBeenCalled()

    await act(async () => result.current[3].sureT())

    expect(ipcRendererMock.invoke).toHaveBeenCalledWith(
      'NewProject',
      expect.objectContaining({ ProjectName: 'pending project', OnlineSubTaskID: 'sub-task-id' }),
    )
    expect(apiFetchMessageRead).toHaveBeenCalledExactlyOnceWith({
      isAll: false,
      hash: 'new-task-hash',
    })
  })
})
