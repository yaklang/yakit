import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, render, waitFor } from '@testing-library/react'
import { YaklangEngineWatchDog } from '../index'
import type { YaklangEngineWatchDogProps } from '../index'
import emiter from '@/utils/eventBus/eventBus'
import { yakitEngine } from '@/utils/electronBridge'
import { grpcStartLocalEngine, isEngineConnectionAlive } from '../../../grpc'
import { toEngineHandshakeName } from '@/utils/envfile'
import type { YaklangEngineMode } from '@/pages/StartupPage/types'
import { yakitNotify } from '@/utils/notification'
import enLink from '../../../../../locales/en/link.json'
import zhLink from '../../../../../locales/zh/link.json'
import zhTWLink from '../../../../../locales/zh-TW/link.json'

const locale = vi.hoisted(() => ({ language: 'zh' as 'en' | 'zh' | 'zh-TW' }))

// Mock 外部依赖
vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({
    t: (key: string) =>
      key === 'EngineFailure.dial_error'
        ? { en: enLink, zh: zhLink, 'zh-TW': zhTWLink }[locale.language].EngineFailure.dial_error
        : key,
    i18n: {
      language: locale.language,
      hasResourceBundle: () => true,
      loadNamespaces: vi.fn(async () => undefined),
      on: vi.fn(),
      off: vi.fn(),
      t: (key: string) => key,
      exists: () => true,
      changeLanguage: vi.fn(async () => undefined),
    },
    isAllReady: true,
  }),
}))

vi.mock('@/utils/eventBus/eventBus', () => ({
  default: {
    on: vi.fn(),
    off: vi.fn(),
  },
}))

vi.mock('@/utils/electronBridge', () => ({
  yakitEngine: {
    connectYaklangEngine: vi.fn(),
  },
}))

vi.mock('../../../grpc', () => ({
  grpcStartLocalEngine: vi.fn(),
  isEngineConnectionAlive: vi.fn(),
}))

vi.mock('../../../utils', () => ({
  outputToWelcomeConsole: vi.fn(),
}))

vi.mock('@/utils/logCollection', () => ({
  debugToPrintLog: vi.fn(),
}))

vi.mock('@/utils/notification', () => ({
  yakitNotify: vi.fn(),
}))

vi.mock('@/utils/envfile', () => ({
  __PLATFORM__: 'yakit',
  FetchSoftwareVersion: vi.fn(() => 'yakit'),
  isEnpriTraceAgent: vi.fn(() => false),
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
  let triggerEngineTest: () => void

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
      yakitStatus: '',
      setYakitStatus: vi.fn(),
      setCheckLog: vi.fn(),
      onReady: vi.fn(),
      onFailed: vi.fn(),
      onKeepaliveShouldChange: vi.fn(),
    }

    vi.clearAllMocks()
    locale.language = 'zh'
    vi.mocked(yakitEngine.connectYaklangEngine).mockRejectedValue(new Error('fail'))
    vi.mocked(grpcStartLocalEngine).mockResolvedValue({ ok: true, status: 'success', message: '' })
    vi.mocked(emiter.on).mockImplementation((event: any, callback) => {
      if (event === 'startAndCreateEngineProcess') {
        triggerEngineTest = callback as () => void
      }
      return emiter
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('engineTest - 引擎连接测试（由 startAndCreateEngineProcess 事件触发）', () => {
    it('当 credential.Mode 为空时，应直接返回，不调用连接', () => {
      props.credential.Mode = '' as YaklangEngineMode
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
          expect(grpcStartLocalEngine).toHaveBeenCalledWith(
            expect.objectContaining({
              port: 9011,
              password: 'test-password',
              version: 'yakit',
              isEnpriTraceAgent: false,
              softwareVersion: 'yakit',
            }),
          )
        },
        { timeout: 2000 },
      )
    })

    it('启动本地引擎时，应将 yakitEE 映射为 enterprise 传给引擎', async () => {
      vi.mocked(toEngineHandshakeName).mockReturnValueOnce('enterprise')
      render(<YaklangEngineWatchDog {...props} />)
      triggerEngineTest()

      await waitFor(
        () => {
          expect(grpcStartLocalEngine).toHaveBeenCalledWith(
            expect.objectContaining({
              version: 'enterprise',
            }),
          )
        },
        { timeout: 2000 },
      )
    })

    it.each([
      ['en', enLink.EngineFailure.dial_error],
      ['zh', zhLink.EngineFailure.dial_error],
      ['zh-TW', zhTWLink.EngineFailure.dial_error],
    ] as const)('remote failures use %s recovery text without raw IPC details', async (language, expected) => {
      locale.language = language
      props.credential.Mode = 'remote'
      render(<YaklangEngineWatchDog {...props} />)
      for (const detail of ['引擎连接超时', '引擎认证失败 private-ipc-detail']) {
        vi.mocked(yakitEngine.connectYaklangEngine).mockRejectedValueOnce(new Error(detail))
        await act(async () => triggerEngineTest())
        expect(yakitNotify).toHaveBeenLastCalledWith('error', expected)
      }
      expect(grpcStartLocalEngine).not.toHaveBeenCalled()
      expect(props.onKeepaliveShouldChange).not.toHaveBeenCalled()
    })

    it('连接失败且 mode = "remote" 时，不自动启动本地引擎', async () => {
      props.credential.Mode = 'remote'
      render(<YaklangEngineWatchDog {...props} />)
      triggerEngineTest()

      expect(grpcStartLocalEngine).not.toHaveBeenCalled()
    })
  })

  describe('自动启动本地引擎', () => {
    it('启动成功时，应调用 onKeepaliveShouldChange(true)', async () => {
      render(<YaklangEngineWatchDog {...props} />)
      triggerEngineTest()

      await waitFor(
        () => {
          expect(props.onKeepaliveShouldChange).toHaveBeenCalledWith(true)
        },
        { timeout: 2000 },
      )
    })

    it('启动失败时，不调用 onKeepaliveShouldChange', async () => {
      vi.mocked(grpcStartLocalEngine).mockResolvedValue({ ok: false, status: 'error', message: '' })
      render(<YaklangEngineWatchDog {...props} />)
      triggerEngineTest()

      expect(props.onKeepaliveShouldChange).not.toHaveBeenCalled()
    })
  })

  describe('并发与取消', () => {
    it('连续点击启动只发出一次连接和启动请求', async () => {
      let finish!: () => void
      vi.mocked(yakitEngine.connectYaklangEngine).mockImplementationOnce(
        () =>
          new Promise((_resolve, reject) => {
            finish = () => reject(new Error('offline'))
          }),
      )
      render(<YaklangEngineWatchDog {...props} />)
      triggerEngineTest()
      triggerEngineTest()
      await act(async () => finish())
      expect(yakitEngine.connectYaklangEngine).toHaveBeenCalledOnce()
      expect(grpcStartLocalEngine).toHaveBeenCalledOnce()
    })

    it.each(['unmount', 'break', 'credential'])('%s 后旧连接失败不能启动子进程', async (operation) => {
      let finish!: () => void
      vi.mocked(yakitEngine.connectYaklangEngine).mockImplementationOnce(
        () =>
          new Promise((_resolve, reject) => {
            finish = () => reject(new Error('late'))
          }),
      )
      const view = render(<YaklangEngineWatchDog {...props} />)
      triggerEngineTest()
      if (operation === 'unmount') view.unmount()
      else
        view.rerender(
          <YaklangEngineWatchDog
            {...props}
            {...(operation === 'break'
              ? { yakitStatus: 'break' }
              : { credential: { ...props.credential, Port: 9012 } })}
          />,
        )
      await act(async () => finish())
      expect(grpcStartLocalEngine).not.toHaveBeenCalled()
      expect(props.onKeepaliveShouldChange).not.toHaveBeenCalled()
    })

    it('cancelled 不显示失败；Windows 端口拒绝保留换端口操作', async () => {
      vi.mocked(grpcStartLocalEngine).mockResolvedValueOnce({ ok: false, status: 'cancelled', message: '' })
      render(<YaklangEngineWatchDog {...props} />)
      await act(async () => triggerEngineTest())
      expect(props.setYakitStatus).not.toHaveBeenCalled()
      vi.mocked(grpcStartLocalEngine).mockResolvedValueOnce({ ok: false, status: 'port_denied', message: 'denied' })
      await act(async () => triggerEngineTest())
      expect(props.setYakitStatus).toHaveBeenCalledWith('port_denied')
    })

    it('保活取消后到达的成功响应不应进入主界面', async () => {
      let finish!: () => void
      vi.mocked(isEngineConnectionAlive).mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finish = () => resolve(true)
          }),
      )
      const view = render(<YaklangEngineWatchDog {...props} keepalive />)
      view.rerender(<YaklangEngineWatchDog {...props} keepalive={false} />)
      await act(async () => finish())
      expect(props.onReady).not.toHaveBeenCalled()
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
      vi.mocked(isEngineConnectionAlive).mockResolvedValue(undefined)
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
