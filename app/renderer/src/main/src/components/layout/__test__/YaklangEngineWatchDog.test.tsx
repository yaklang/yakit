import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import { YaklangEngineWatchDog } from '../YaklangEngineWatchDog'
import type { YaklangEngineWatchDogProps } from '../YaklangEngineWatchDog'
import emiter from '@/utils/eventBus/eventBus'
import { yakitEngine } from '@/services/electronBridge'
import { isEngineConnectionAlive } from '@/components/layout/WelcomeConsoleUtil'
import { fetchEnv, toEngineHandshakeName } from '@/utils/envfile'

vi.mock('@/utils/eventBus/eventBus', () => ({
  default: {
    on: vi.fn(),
    off: vi.fn(),
  },
}))

vi.mock('@/services/electronBridge', () => ({
  yakitEngine: {
    connectYaklangEngine: vi.fn(),
    isPortAvailable: vi.fn(),
    startLocalYaklangEngine: vi.fn(),
  },
}))

vi.mock('@/components/layout/WelcomeConsoleUtil', () => ({
  isEngineConnectionAlive: vi.fn(),
}))

vi.mock('@/utils/logCollection', () => ({
  debugToPrintLog: vi.fn(),
}))

vi.mock('@/utils/notification', () => ({
  failed: vi.fn(),
}))

vi.mock('@/utils/kv', () => ({
  setRemoteValue: vi.fn(),
}))

vi.mock('@/store', () => ({
  yakitDynamicStatus: () => ({
    dynamicStatus: {
      isDynamicStatus: false,
      isDynamicSelfStatus: false,
      baseUrl: '',
    },
    setDynamicStatus: vi.fn(),
  }),
}))

vi.mock('@/pages/dynamicControl/remoteOperation', () => ({
  remoteOperation: vi.fn(),
}))

vi.mock('@/utils/envfile', () => ({
  fetchEnv: vi.fn(() => 'yakit'),
  isEnpriTraceAgent: vi.fn(() => false),
  isIRify: vi.fn(() => false),
  getRemoteHttpSettingGV: vi.fn(() => 'http-setting'),
  toEngineHandshakeName: vi.fn((edition = 'yakit') => {
    switch (edition) {
      case 'yakitEE':
        return 'enterprise'
      case 'yakitSE':
        return 'simple-enterprise'
      case 'irifyEE':
        return 'irify-enterprise'
      default:
        return edition || 'yakit'
    }
  }),
}))

describe('YaklangEngineWatchDog 组件测试', () => {
  let props: YaklangEngineWatchDogProps
  let triggerEngineTest: (isDynamicControl?: boolean) => void

  beforeEach(() => {
    props = {
      credential: {
        Mode: 'local',
        Host: '127.0.0.1',
        Port: 9011,
        Password: 'test-password',
      },
      keepalive: false,
      engineLink: false,
      onReady: vi.fn(),
      onFailed: vi.fn(),
      onKeepaliveShouldChange: vi.fn(),
      failedCallback: vi.fn(),
    }

    vi.clearAllMocks()
    vi.mocked(fetchEnv).mockReturnValue('yakit')
    vi.mocked(yakitEngine.connectYaklangEngine).mockRejectedValue(new Error('fail'))
    vi.mocked(yakitEngine.isPortAvailable).mockResolvedValue(undefined)
    vi.mocked(yakitEngine.startLocalYaklangEngine).mockResolvedValue(undefined)
    vi.mocked(emiter.on).mockImplementation((event: any, callback) => {
      if (event === 'startAndCreateEngineProcess') {
        triggerEngineTest = callback as unknown as (isDynamicControl?: boolean) => void
      }
      return emiter
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('engineTest - 引擎连接测试（由 startAndCreateEngineProcess 事件触发）', () => {
    it('当 credential.Mode 为空时，应直接返回，不调用连接', () => {
      props.credential.Mode = undefined
      render(<YaklangEngineWatchDog {...props} />)
      triggerEngineTest()

      expect(yakitEngine.connectYaklangEngine).not.toHaveBeenCalled()
    })

    it('当 credential.Port <= 0 时，应直接返回, 不调用连接', () => {
      props.credential.Port = 0
      render(<YaklangEngineWatchDog {...props} />)
      triggerEngineTest()

      expect(yakitEngine.connectYaklangEngine).not.toHaveBeenCalled()
    })

    it('连接成功时，应调用 onKeepaliveShouldChange(true)', async () => {
      vi.mocked(yakitEngine.connectYaklangEngine).mockResolvedValue(undefined)
      render(<YaklangEngineWatchDog {...props} />)
      triggerEngineTest()

      await waitFor(() => {
        expect(props.onKeepaliveShouldChange).toHaveBeenCalledWith(true)
      })
    })

    it('连接失败且 mode = "local" 时，应触发自动启动本地引擎，并把版本映射为 Handshake 旧名', async () => {
      render(<YaklangEngineWatchDog {...props} />)
      triggerEngineTest()

      await waitFor(
        () => {
          expect(toEngineHandshakeName).toHaveBeenCalledWith('yakit')
          expect(yakitEngine.startLocalYaklangEngine).toHaveBeenCalledWith(
            expect.objectContaining({
              port: 9011,
              version: 'yakit',
              isEnpriTraceAgent: false,
              isIRify: false,
            }),
          )
        },
        { timeout: 2000 },
      )
    })

    it('启动本地引擎时，应将 yakitEE 映射为 enterprise 传给引擎', async () => {
      vi.mocked(fetchEnv).mockReturnValue('yakitEE')
      vi.mocked(toEngineHandshakeName).mockReturnValue('enterprise')
      render(<YaklangEngineWatchDog {...props} />)
      triggerEngineTest()

      await waitFor(
        () => {
          expect(toEngineHandshakeName).toHaveBeenCalledWith('yakitEE')
          expect(yakitEngine.startLocalYaklangEngine).toHaveBeenCalledWith(
            expect.objectContaining({
              version: 'enterprise',
            }),
          )
        },
        { timeout: 2000 },
      )
    })

    it('连接失败且 mode = "remote" 时，不自动启动本地引擎', async () => {
      props.credential.Mode = 'remote'
      render(<YaklangEngineWatchDog {...props} />)
      triggerEngineTest()

      expect(yakitEngine.startLocalYaklangEngine).not.toHaveBeenCalled()
      await waitFor(() => {
        expect(props.failedCallback).toHaveBeenCalledWith('remote-connect-failed')
      })
    })
  })

  describe('keepalive 探活逻辑', () => {
    it('当 keepalive 为 false 时，应直接调用 onFailed(100) 且不启动定时器', () => {
      render(<YaklangEngineWatchDog {...props} />)

      expect(props.onFailed).toHaveBeenCalledWith(100)
      expect(isEngineConnectionAlive).not.toHaveBeenCalled()
    })

    it('当 keepalive 为 true 且引擎连接存活时，应调用 onReady', async () => {
      props.keepalive = true
      vi.mocked(isEngineConnectionAlive).mockResolvedValue(true)
      render(<YaklangEngineWatchDog {...props} />)

      await waitFor(() => {
        expect(props.onReady).toHaveBeenCalled()
      })
    })

    it('当 keepalive 为 true 但引擎连接失败时，应调用 onFailed', async () => {
      props.keepalive = true
      vi.mocked(isEngineConnectionAlive).mockRejectedValue(new Error('fail'))
      render(<YaklangEngineWatchDog {...props} />)

      await waitFor(() => {
        expect(props.onFailed).toHaveBeenCalled()
      })
    })
  })
})
