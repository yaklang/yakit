import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useEeSystemConfig, useStore } from '@/store'
import type { UserInfoProps } from '@/store'
import { useUploadInfoByEnpriTrace } from '../utils'

const mocks = vi.hoisted(() => ({
  netWorkApi: vi.fn(),
  aboutLoginUpload: vi.fn(),
  loginHTTPFlowsToOnline: vi.fn(),
  updateGlobalNetworkConfig: vi.fn(),
}))

vi.mock('@/services/fetch', () => ({ NetWorkApi: mocks.netWorkApi }))
vi.mock('@/utils/envfile', () => ({ isEnpriTrace: () => true }))
vi.mock('@/utils/login', () => ({
  aboutLoginUpload: mocks.aboutLoginUpload,
  loginHTTPFlowsToOnline: mocks.loginHTTPFlowsToOnline,
}))
vi.mock('@/pages/spaceEngine/utils', () => ({ apiUpdateGlobalNetworkConfig: mocks.updateGlobalNetworkConfig }))
vi.mock('@/utils/notification', () => ({ yakitNotify: vi.fn() }))
vi.mock('@/i18n/i18n', () => ({ default: { getFixedT: () => (key: string) => key } }))

const loggedOutUserInfo = (): UserInfoProps => ({
  isLogin: false,
  platform: null,
  githubName: null,
  githubHeadImg: null,
  wechatName: null,
  wechatHeadImg: null,
  qqName: null,
  qqHeadImg: null,
  companyName: null,
  companyHeadImg: null,
  role: null,
  user_id: null,
  token: '',
})

describe('useUploadInfoByEnpriTrace 登录态读取', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useStore.getState().setStoreUserInfo(loggedOutUserInfo())
    useEeSystemConfig.setState({ eeSystemConfig: [] })
  })

  it('登录写入 store 后重渲染前调用 startUpload，配置拉取与数据同步使用最新 token', async () => {
    mocks.netWorkApi.mockResolvedValue({ data: [{ configName: 'syncData', isOpen: true, content: '' }] })
    const { result } = renderHook(() => useUploadInfoByEnpriTrace())
    // startUpload 取自未登录那次渲染，模拟登录回调在组件重渲染前同步调用的时序
    const startUpload = result.current[0].startUpload

    await act(async () => {
      useStore.getState().setStoreUserInfo({ ...loggedOutUserInfo(), isLogin: true, token: 'fresh-login-token' })
      await startUpload({ isUploadSyncData: true })
    })

    expect(mocks.netWorkApi).toHaveBeenCalledWith({ method: 'get', url: 'system/config' })
    expect(useEeSystemConfig.getState().eeSystemConfig).toEqual([{ configName: 'syncData', isOpen: true, content: '' }])
    expect(mocks.aboutLoginUpload).toHaveBeenCalledWith('fresh-login-token')
    expect(mocks.loginHTTPFlowsToOnline).toHaveBeenCalledWith('fresh-login-token')
  })

  it('未登录时 startUpload 不拉取配置也不同步', async () => {
    const { result } = renderHook(() => useUploadInfoByEnpriTrace())

    const data = await act(() => result.current[0].startUpload({ isUploadSyncData: true }))

    expect(data).toBeUndefined()
    expect(mocks.netWorkApi).not.toHaveBeenCalled()
    expect(mocks.aboutLoginUpload).not.toHaveBeenCalled()
  })
})
