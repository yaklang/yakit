import { describe, expect, it } from 'vitest'
import { deriveIMControlBadge } from '../status'

describe('deriveIMControlBadge', () => {
  it('hides the IM badge when user is not logged in', () => {
    expect(deriveIMControlBadge({ isLogin: false, status: { Running: true } })).toMatchObject({
      visible: false,
      state: 'hidden',
    })
  })

  it('shows idle when user is logged in but IM control is stopped', () => {
    expect(deriveIMControlBadge({ isLogin: true, status: { Running: false } })).toMatchObject({
      visible: true,
      state: 'idle',
      color: 'gray',
    })
  })

  it('shows running when every enabled platform is connected', () => {
    expect(
      deriveIMControlBadge({
        isLogin: true,
        status: {
          Running: true,
          Platforms: [
            { Platform: 'feishu', Connected: true, Message: 'ok' },
            { Platform: 'dingtalk', Connected: true, Message: 'ok' },
          ],
        },
      }),
    ).toMatchObject({
      visible: true,
      state: 'running',
      color: 'green',
    })
  })

  it('keeps the current running color while refreshing status', () => {
    expect(
      deriveIMControlBadge({
        isLogin: true,
        loading: true,
        status: {
          Running: true,
          Platforms: [{ Platform: 'feishu', Connected: true, Message: 'ok' }],
        },
      }),
    ).toMatchObject({
      visible: true,
      state: 'running',
      color: 'green',
    })
  })

  it('shows degraded when some platforms are connected and some failed', () => {
    expect(
      deriveIMControlBadge({
        isLogin: true,
        status: {
          Running: true,
          Platforms: [
            { Platform: 'feishu', Connected: true, Message: 'ok' },
            { Platform: 'dingtalk', Connected: false, Message: 'app_id invalid' },
          ],
        },
      }),
    ).toMatchObject({
      visible: true,
      state: 'degraded',
      color: 'yellow',
    })
  })

  it('shows error when runtime is running but no platform is connected', () => {
    expect(
      deriveIMControlBadge({
        isLogin: true,
        status: {
          Running: true,
          Platforms: [{ Platform: 'feishu', Connected: false, Message: 'app_id invalid' }],
        },
      }),
    ).toMatchObject({
      visible: true,
      state: 'error',
      color: 'red',
    })
  })
})
