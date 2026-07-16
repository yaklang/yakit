import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import { LocalEngine } from '../index'
import type { LocalEngineProps, LocalEngineLinkFuncProps } from '../LocalEngineType'
import {
  grpcCheckAllowSecretLocal,
  grpcFetchBuildInYakVersion,
  grpcFetchLatestYakitVersion,
  grpcFetchLocalYakitVersion,
  grpcFetchLocalYakVersion,
  grpcFetchLocalYakVersionHash,
  grpcFetchSpecifiedYakVersionHash,
} from '../../../grpc'
import { getLocalValue } from '@/utils/kv'
import { SystemInfo } from '../../../utils'
import { isEnpriTraceAgent, isCommunityYakit, FetchSoftwareVersion } from '@/utils/envfile'
import { yakitEngine } from '@/utils/electronBridge'

// ========== Mock 所有外部依赖 ==========
vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({
    t: (key: string) => key,
    i18n: {
      language: 'zh',
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

vi.mock('../../../utils', () => ({
  SystemInfo: { isDev: false },
}))

vi.mock('../../../grpc', () => ({
  grpcCheckAllowSecretLocal: vi.fn(),
  grpcFetchBuildInYakVersion: vi.fn(),
  grpcFetchLatestYakitVersion: vi.fn(),
  grpcFetchLocalYakitVersion: vi.fn(),
  grpcFetchLocalYakVersion: vi.fn(),
  grpcFetchLocalYakVersionHash: vi.fn(),
  grpcFetchSpecifiedYakVersionHash: vi.fn(),
}))

vi.mock('@/utils/logCollection', () => ({
  debugToPrintLog: vi.fn(),
}))

vi.mock('@/utils/envfile', () => ({
  FetchSoftwareVersion: vi.fn(() => 'yakit'),
  getReleaseEditionName: vi.fn(() => 'Yakit'),
  isCommunityYakit: vi.fn(() => true),
  isEnpriTraceAgent: vi.fn(() => false),
}))

vi.mock('@/utils/notification', () => ({
  yakitNotify: vi.fn(),
}))

vi.mock('@/utils/kv', () => ({
  getLocalValue: vi.fn(),
}))

vi.mock('@/enums/yakitGV', () => ({
  LocalGVS: {
    NoAutobootLatestVersionCheck: 'no-autoboot-latest-version-check',
    NoYakVersionCheck: 'no-yak-version-check',
    YakitCESoftwareBasics: 'YakitCE-SoftwareBasics',
  },
}))

vi.mock('../../UpdateYakitHint', () => ({
  UpdateYakitHint: () => null,
}))

vi.mock('@/utils/electronBridge', () => ({
  yakitEngine: {
    onStartUpEngineMessage: vi.fn(() => vi.fn()),
  },
}))

describe('LocalEngine Component', () => {
  let props: LocalEngineProps
  let ref: React.RefObject<LocalEngineLinkFuncProps>
  let systemInfoDevSpy: any
  let isEnpriTraceAgentSpy: any
  let isCommunityYakitSpy: any

  beforeEach(() => {
    props = {
      setLog: vi.fn(),
      onLinkEngine: vi.fn(),
      yakitStatus: '',
      setYakitStatus: vi.fn(),
      buildInEngineVersion: '',
      setRestartLoading: vi.fn(),
      yakitUpdate: false,
      setYakitUpdate: vi.fn(),
    }
    ref = { current: null }

    vi.clearAllMocks()

    // 通用 mock 默认值（确保大多数测试走无更新分支）
    // 注意：默认让 YakitCE-SoftwareBasics 返回 true，避免阻塞引擎连接
    ;(getLocalValue as any).mockImplementation((key: string) => {
      if (key === 'YakitCE-SoftwareBasics') return Promise.resolve(true)
      return Promise.resolve(false)
    })
    ;(grpcCheckAllowSecretLocal as any).mockResolvedValue({
      ok: true,
      status: 'success',
      json: { port: 9011, secret: 'test-secret', version: '1.4.7-beta1' },
    })
    ;(grpcFetchLocalYakitVersion as any).mockResolvedValue('1.4.7-0429')
    ;(grpcFetchLatestYakitVersion as any).mockResolvedValue('1.4.7-0429') // 默认相同版本
    ;(grpcFetchLocalYakVersion as any).mockResolvedValue('1.4.7-beta1')
    ;(grpcFetchBuildInYakVersion as any).mockResolvedValue('1.4.7-beta1')
    ;(grpcFetchLocalYakVersionHash as any).mockResolvedValue(['hash123'])
    ;(grpcFetchSpecifiedYakVersionHash as any).mockResolvedValue('hash123')
    ;(yakitEngine.onStartUpEngineMessage as any).mockReturnValue(() => {})

    systemInfoDevSpy = vi.spyOn(SystemInfo, 'isDev', 'get')
    isEnpriTraceAgentSpy = vi.spyOn({ isEnpriTraceAgent }, 'isEnpriTraceAgent')
    isCommunityYakitSpy = vi.spyOn({ isCommunityYakit }, 'isCommunityYakit')
  })

  afterEach(() => {
    systemInfoDevSpy.mockRestore()
    isEnpriTraceAgentSpy.mockRestore()
    isCommunityYakitSpy.mockRestore()
  })

  const renderComponent = () => render(<LocalEngine ref={ref} {...props} />)

  // 辅助函数：等待 ref 可用并调用 init
  const initEngine = async (port = 9011) => {
    await waitFor(() => expect(ref.current).toBeDefined())
    await ref.current!.init(port)
  }

  const startLinkEngine = async () => {
    await waitFor(
      () => {
        expect(props.onLinkEngine).toHaveBeenCalled()
      },
      { timeout: 2000 },
    )
  }

  describe('引擎连接基础流程', () => {
    it('应成功连接引擎并跳过版本检查（开发模式）', async () => {
      systemInfoDevSpy.mockReturnValue(true)
      renderComponent()
      await initEngine()

      await waitFor(() => {
        expect(grpcCheckAllowSecretLocal).toHaveBeenCalledWith({
          port: 9011,
          softwareVersion: FetchSoftwareVersion(),
        })
      })

      await startLinkEngine()
    })

    it('应正确处理连接超时', async () => {
      ;(grpcCheckAllowSecretLocal as any).mockResolvedValue({
        ok: false,
        status: 'timeout',
      })
      renderComponent()
      await initEngine()

      await waitFor(() => {
        expect(props.setYakitStatus).toHaveBeenCalledWith('check_timeout')
      })
    })

    it('应正确处理旧版本引擎', async () => {
      ;(grpcCheckAllowSecretLocal as any).mockResolvedValue({
        ok: false,
        status: 'old_version',
      })
      renderComponent()
      await initEngine()

      await waitFor(() => {
        expect(props.setYakitStatus).toHaveBeenCalledWith('old_version')
      })
    })

    it('应正确处理端口被占用', async () => {
      ;(grpcCheckAllowSecretLocal as any).mockResolvedValue({
        ok: false,
        status: 'port_occupied',
      })
      renderComponent()
      await initEngine()

      await waitFor(() => {
        expect(props.setYakitStatus).toHaveBeenCalledWith('port_occupied_prev')
      })
    })

    it('应正确处理杀软拦截', async () => {
      ;(grpcCheckAllowSecretLocal as any).mockResolvedValue({
        ok: false,
        status: 'antivirus_blocked',
      })
      renderComponent()
      await initEngine()

      await waitFor(() => {
        expect(props.setYakitStatus).toHaveBeenCalledWith('antivirus_blocked')
      })
    })

    it('应正确处理引擎连接问题', async () => {
      ;(grpcCheckAllowSecretLocal as any).mockResolvedValue({
        ok: false,
        status: 'build_yak_error',
      })
      renderComponent()
      await initEngine()

      await waitFor(() => {
        expect(props.setYakitStatus).toHaveBeenCalledWith('skipAgreement_Install')
      })
    })

    it('应正确处理数据库错误', async () => {
      ;(grpcCheckAllowSecretLocal as any).mockResolvedValue({
        ok: false,
        status: 'database_error',
      })
      renderComponent()
      await initEngine()

      await waitFor(() => {
        expect(props.setYakitStatus).toHaveBeenCalledWith('database_error')
      })
    })

    it('应正确处理其他未知错误', async () => {
      ;(grpcCheckAllowSecretLocal as any).mockResolvedValue({
        ok: false,
        status: 'unknown',
        message: 'something wrong',
      })
      renderComponent()
      await initEngine()

      await waitFor(() => {
        expect(props.setYakitStatus).toHaveBeenCalledWith('allow-secret-error')
      })
    })

    it('当 yakitStatus 为 break 时应阻止后续检查', async () => {
      props.yakitStatus = 'break'
      renderComponent()
      await initEngine()

      expect(grpcCheckAllowSecretLocal).not.toHaveBeenCalled()
    })
  })

  describe('Yakit 版本更新检查', () => {
    it('SE 版本不检查 Yakit 更新，直接检查引擎版本', async () => {
      isEnpriTraceAgentSpy.mockReturnValue(true)
      renderComponent()
      await initEngine()

      await waitFor(() => {
        expect(grpcFetchLocalYakitVersion).not.toHaveBeenCalled()
        expect(grpcFetchLatestYakitVersion).not.toHaveBeenCalled()
      })

      await waitFor(() => {
        expect(grpcFetchBuildInYakVersion).toHaveBeenCalled()
      })

      await waitFor(() => {
        expect(grpcFetchLocalYakVersionHash).toHaveBeenCalled()
        expect(grpcFetchSpecifiedYakVersionHash).toHaveBeenCalled()
      })

      await startLinkEngine()
    })

    it('当有 Yakit 新版本时应提示更新，且不执行引擎检查', async () => {
      ;(grpcFetchLocalYakitVersion as any).mockResolvedValue('1.4.7-0429')
      ;(grpcFetchLatestYakitVersion as any).mockResolvedValue('1.4.7-0509')
      renderComponent()
      await initEngine()

      await waitFor(() => {
        expect(props.setYakitStatus).toHaveBeenCalledWith('update_yakit')
      })

      // 引擎检查相关函数不应被调用
      expect(grpcFetchBuildInYakVersion).not.toHaveBeenCalled()
      expect(grpcFetchLocalYakVersionHash).not.toHaveBeenCalled()
      expect(grpcFetchSpecifiedYakVersionHash).not.toHaveBeenCalled()
      expect(props.onLinkEngine).not.toHaveBeenCalled()
    })

    it('当无 Yakit 新版本时应继续检查引擎版本，并最终连接引擎', async () => {
      renderComponent()
      await initEngine()

      await waitFor(() => {
        expect(grpcFetchBuildInYakVersion).toHaveBeenCalled()
      })

      await waitFor(() => {
        expect(grpcFetchLocalYakVersionHash).toHaveBeenCalled()
        expect(grpcFetchSpecifiedYakVersionHash).toHaveBeenCalled()
      })

      await startLinkEngine()

      expect(props.setYakitStatus).not.toHaveBeenCalledWith('update_yakit')
    })

    it('当用户关闭自动检查时应跳过 Yakit 更新检查，但引擎检查仍正常执行', async () => {
      ;(getLocalValue as any).mockResolvedValue(true) // 跳过 Yakit 检查
      renderComponent()
      await initEngine()

      await waitFor(() => {
        expect(grpcFetchBuildInYakVersion).toHaveBeenCalled()
      })
      await waitFor(() => {
        expect(grpcFetchLocalYakVersionHash).toHaveBeenCalled()
        expect(grpcFetchSpecifiedYakVersionHash).toHaveBeenCalled()
      })

      await startLinkEngine()

      expect(props.setYakitStatus).not.toHaveBeenCalledWith('update_yakit')
      expect(grpcFetchLocalYakitVersion).not.toHaveBeenCalled()
      expect(grpcFetchLatestYakitVersion).not.toHaveBeenCalled()
    })

    it('获取 Yakit 版本超时应继续流程，引擎检查仍会执行并连接', async () => {
      ;(grpcFetchLocalYakitVersion as any).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve('1.4.7-0429'), 100)),
      )
      ;(grpcFetchLatestYakitVersion as any).mockImplementation(
        () => new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 10)),
      )
      renderComponent()
      await initEngine()

      await waitFor(() => {
        expect(grpcFetchBuildInYakVersion).toHaveBeenCalled()
      })

      await waitFor(() => {
        expect(grpcFetchLocalYakVersionHash).toHaveBeenCalled()
        expect(grpcFetchSpecifiedYakVersionHash).toHaveBeenCalled()
      })

      await startLinkEngine()

      expect(props.setYakitStatus).not.toHaveBeenCalledWith('update_yakit')
    })
  })

  describe('引擎版本更新检查', () => {
    it('当内置引擎版本高于当前时提示更新', async () => {
      ;(grpcFetchLocalYakVersion as any).mockResolvedValue('1.4.7-beta1')
      ;(grpcFetchBuildInYakVersion as any).mockResolvedValue('1.4.7-beta2')
      renderComponent()
      await initEngine()

      await waitFor(() => {
        expect(props.setYakitStatus).toHaveBeenCalledWith('update_yak')
      })
    })

    it('当引擎版本相同时跳过更新并校验来源', async () => {
      renderComponent()
      await initEngine()

      await startLinkEngine()

      expect(props.setYakitStatus).not.toHaveBeenCalledWith('update_yak')
    })

    it('当 NoYakVersionCheck 为 true 时只检查引擎来源不检查版本高低', async () => {
      ;(getLocalValue as any).mockImplementation((key: string) => {
        if (key === 'no-yak-version-check') return Promise.resolve(true)
        if (key === 'YakitCE-SoftwareBasics') return Promise.resolve(true) // 关键修复：避免进入软件基础设置
        return Promise.resolve(false)
      })
      ;(grpcFetchLocalYakVersion as any).mockResolvedValue('1.4.7-beta1')
      ;(grpcFetchBuildInYakVersion as any).mockResolvedValue('1.4.7-beta2')
      renderComponent()
      await initEngine()

      await startLinkEngine()

      expect(props.setYakitStatus).not.toHaveBeenCalledWith('update_yak')
    })
  })

  describe('引擎来源校验', () => {
    it('当本地 hash 匹配线上 hash 时来源正确，继续连接', async () => {
      renderComponent()
      await initEngine()

      await startLinkEngine()
    })

    it('当本地 hash 不匹配线上 hash 时仍继续连接', async () => {
      ;(grpcFetchLocalYakVersionHash as any).mockResolvedValue(['hash456'])
      ;(grpcFetchSpecifiedYakVersionHash as any).mockResolvedValue('hash123')
      renderComponent()
      await initEngine()

      await startLinkEngine()
    })

    it('当获取 hash 超时或失败时仍继续连接', async () => {
      ;(grpcFetchSpecifiedYakVersionHash as any).mockImplementation(
        () => new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 10)),
      )
      renderComponent()
      await initEngine()

      await startLinkEngine()
    })
  })
})
