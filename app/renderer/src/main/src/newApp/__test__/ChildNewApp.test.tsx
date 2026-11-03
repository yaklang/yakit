import { act, cleanup, render, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defaultUserInfo } from '@/pages/userInfoDefaults'
import type { UserInfoProps } from '@/store'

const ipc = vi.hoisted(() => {
  const handlers: Record<string, Array<(...args: unknown[]) => void>> = {}
  return {
    handlers,
    invoke: vi.fn(),
    send: vi.fn(),
    on: vi.fn((channel: string, callback: (...args: unknown[]) => void) => {
      handlers[channel] = handlers[channel] || []
      handlers[channel].push(callback)
    }),
    removeListener: vi.fn((channel: string, callback: (...args: unknown[]) => void) => {
      handlers[channel] = (handlers[channel] || []).filter((item) => item !== callback)
    }),
    removeAllListeners: vi.fn(),
    emit(channel: string, ...args: unknown[]) {
      ;(handlers[channel] || []).slice().forEach((callback) => callback(...args))
    },
    reset() {
      Object.keys(handlers).forEach((channel) => delete handlers[channel])
      this.invoke.mockReset()
      this.send.mockReset()
      this.on.mockClear()
      this.removeListener.mockClear()
      this.removeAllListeners.mockClear()
    },
  }
})

vi.mock('@/components/BaseTitleBar', () => ({ default: () => null }))

const loggedIn: UserInfoProps = {
  ...defaultUserInfo,
  isLogin: true,
  platform: 'company',
  companyName: 'Admin',
  role: 'admin',
  user_id: 1,
  token: 'token-1',
}

async function loadChild() {
  vi.resetModules()
  window.require = ((moduleName: string) => {
    if (moduleName === 'electron') return { ipcRenderer: ipc }
    throw new Error(moduleName)
  }) as typeof window.require
  const [{ default: ChildNewApp }, { useStore }] = await Promise.all([import('../ChildNewApp'), import('@/store')])
  useStore.setState({ userInfo: { ...defaultUserInfo } })
  return { ChildNewApp, useStore }
}

beforeEach(() => {
  ipc.reset()
  cleanup()
})

describe('ChildNewApp login state', () => {
  it('writes the main-process session into the store when the child opens', async () => {
    ipc.invoke.mockResolvedValue(loggedIn)
    const { ChildNewApp, useStore } = await loadChild()
    render(<ChildNewApp />)

    await waitFor(() => expect(useStore.getState().userInfo).toEqual(loggedIn))
    expect(ipc.invoke).toHaveBeenCalledWith('get-login-user-info', {})
  })

  it('keeps a later sign-in when the first session query resolves afterwards', async () => {
    let resolveInfo: (info: UserInfoProps) => void = () => {}
    ipc.invoke.mockReturnValue(
      new Promise((resolve) => {
        resolveInfo = resolve
      }),
    )
    const { ChildNewApp, useStore } = await loadChild()
    render(<ChildNewApp />)
    const fresh = { ...loggedIn, token: 'fresh-token' }

    await act(async () => {
      ipc.emit('fetch-signin-token', {}, fresh)
    })
    expect(useStore.getState().userInfo).toEqual(fresh)

    await act(async () => {
      resolveInfo({ ...loggedIn, token: 'stale-token' })
    })
    expect(useStore.getState().userInfo).toEqual(fresh)
  })

  it('resets to the logged-out user on logout and ignores an older session query', async () => {
    let resolveInfo: (info: UserInfoProps) => void = () => {}
    ipc.invoke.mockReturnValue(
      new Promise((resolve) => {
        resolveInfo = resolve
      }),
    )
    const { ChildNewApp, useStore } = await loadChild()
    render(<ChildNewApp />)
    const fresh = { ...loggedIn, token: 'fresh-token' }

    await act(async () => {
      ipc.emit('fetch-signin-token', {}, fresh)
    })
    expect(useStore.getState().userInfo).toEqual(fresh)

    await act(async () => {
      ipc.emit('login-out')
    })
    expect(useStore.getState().userInfo).toEqual(defaultUserInfo)

    await act(async () => {
      resolveInfo(loggedIn)
    })
    expect(useStore.getState().userInfo).toEqual(defaultUserInfo)
  })

  it('stops applying login events after the child unmounts', async () => {
    ipc.invoke.mockResolvedValue(loggedIn)
    const { ChildNewApp, useStore } = await loadChild()
    const view = render(<ChildNewApp />)
    await waitFor(() => expect(useStore.getState().userInfo).toEqual(loggedIn))

    view.unmount()
    await act(async () => {
      ipc.emit('login-out')
      ipc.emit('fetch-signin-token', {}, { ...loggedIn, token: 'next-token' })
    })

    expect(useStore.getState().userInfo).toEqual(loggedIn)
    expect(ipc.removeListener).toHaveBeenCalledWith('fetch-signin-token', expect.any(Function))
    expect(ipc.removeListener).toHaveBeenCalledWith('login-out', expect.any(Function))
  })
})
