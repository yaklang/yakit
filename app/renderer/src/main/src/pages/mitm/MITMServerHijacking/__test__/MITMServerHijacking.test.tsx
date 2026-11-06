import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import React, { useState } from 'react'
import { MITMServerHijacking } from '../MITMServerHijacking'
import { grpcMITMSetDownstreamProxy } from '../../MITMHacker/utils'
import { setRemoteValue } from '@/utils/kv'
import { yakitNotify } from '@/utils/notification'
import type { TipPart } from '@/pages/mitm/MITMPage'
import type * as MITMContextModule from '../../Context/MITMContext'
import type * as MITMHackerUtilsModule from '../../MITMHacker/utils'
import type * as ProxyConfigUtilModule from '@/utils/proxyConfigUtil'

const hoisted = vi.hoisted(() => {
  const captured: { mitmServerProps: Record<string, unknown> } = { mitmServerProps: {} }
  const proxyTestEcho: { value: string[] } = { value: [] }
  const proxyOptions: {
    list: { label: string; tagLabel?: string; value: string; disabled?: boolean }[]
  } = {
    list: [
      { label: '代理节点: http://10.0.0.1:1', tagLabel: '代理节点: http://10.0.0.1:1', value: 'ep-1' },
      {
        label: '代理节点: http://10.0.0.2:2 (已禁用)',
        tagLabel: '代理节点: http://10.0.0.2:2 (已禁用)',
        value: 'ep-2',
        disabled: true,
      },
    ],
  }
  const checkProxyEndpoints = vi.fn()
  return { captured, proxyTestEcho, proxyOptions, checkProxyEndpoints }
})

vi.mock('@/pages/mitm/MITMPage', () => ({
  MITMServer: (props: Record<string, unknown>) => {
    hoisted.captured.mitmServerProps = props
    return <div data-testid="mitm-server" />
  },
}))

vi.mock('../../Context/MITMContext', async (importOriginal) => {
  const actual = await importOriginal<typeof MITMContextModule>()
  return {
    ...actual,
    default: React.createContext({ mitmStore: { version: 7 } }),
  }
})

vi.mock('../../MITMHacker/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof MITMHackerUtilsModule>()
  return {
    ...actual,
    grpcMITMEnablePluginMode: vi.fn().mockResolvedValue(undefined),
    grpcMITMFilterWebsocket: vi.fn().mockResolvedValue(undefined),
    grpcMITMHotPort: vi.fn().mockResolvedValue(undefined),
    grpcMITMSetDownstreamProxy: vi.fn().mockResolvedValue(undefined),
    grpcMITMGetFilter: vi.fn().mockResolvedValue({}),
    grpcMITMSetDisableSystemProxy: vi.fn().mockResolvedValue(undefined),
    grpcMITMStopCall: vi.fn().mockResolvedValue(undefined),
    grpcMITMRemoveHook: vi.fn().mockResolvedValue(undefined),
  }
})

vi.mock('@/hook/useProxy', () => ({
  useProxy: () => ({
    proxyRouteOptions: hoisted.proxyOptions.list,
    getProxyValue: (selection: string[]) => ({
      proxyEndpoints: selection.filter((item) => !item.startsWith('route')).join(','),
      ProxyRuleIds: selection.filter((item) => item.startsWith('route')).join(','),
    }),
    checkProxyEndpoints: hoisted.checkProxyEndpoints,
    comparePointUrl: (key: string) => key,
    proxyConfig: { Endpoints: [], Routes: [] },
  }),
}))

vi.mock('@/utils/kv', () => ({
  setRemoteValue: vi.fn().mockResolvedValue(undefined),
  getRemoteValue: vi.fn().mockResolvedValue(''),
}))

vi.mock('@/utils/notification', () => ({
  info: vi.fn(),
  yakitNotify: vi.fn(),
  yakitFailed: vi.fn(),
}))

vi.mock('@/utils/ConfigSystemProxy', () => ({
  apiGetSystemProxy: vi.fn().mockResolvedValue({ Enable: false, CurrentProxy: '' }),
}))

vi.mock('@/utils/proxyConfigUtil', async (importOriginal) => {
  const actual = await importOriginal<typeof ProxyConfigUtilModule>()
  return { ...actual, checkProxyVersion: vi.fn().mockResolvedValue(true) }
})

vi.mock('@/components/configNetwork/ProxyRulesConfig', () => ({
  default: () => <div data-testid="proxy-rules-config" />,
  ProxyTest: (props: { onEchoNode?: (proxy: string[]) => void; btnDisabled?: boolean }) => (
    <button
      data-testid="proxy-test-btn"
      disabled={props.btnDisabled}
      onClick={() => props.onEchoNode?.(hoisted.proxyTestEcho.value)}
    >
      proxy-test
    </button>
  ),
}))

vi.mock('@/pages/mitm/MITMChromeLauncher', () => ({ default: () => <div /> }))

vi.mock('../../MITMAdvancedConfig', () => ({
  loadAdvancedConfig: vi.fn().mockResolvedValue({}),
  updateAdvancedConfig: vi.fn(),
}))

vi.mock('../../MITMServerStartForm/MITMFiltersModal', () => ({
  default: () => null,
  getMitmHijackFilter: () => false,
}))

vi.mock('../../MITMServerStartForm/MITMCertificateDownloadModal', () => ({ default: () => null }))

vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({ t: (key: string) => key, i18n: { language: 'zh' }, i18nRefresh: 0 }),
}))

// 导入链（MITMServerStartForm 等）会带上 yakEditor，其顶层 setTimeout 调 ipcRenderer.invoke
// 会炸掉测试环境；与 fuzzer 既有测试同法置空（本用例不渲染编辑器）
vi.mock('@/utils/monacoSpec/yakEditor', () => ({}))

// 导入链经 AIGlobalLoading 带上 lottie-web，其模块初始化探测 canvas 2d（jsdom 无 canvas）会崩；置空（本用例不渲染动画）
vi.mock('lottie-web', () => ({}))

const Host: React.FC<{ tipParts: TipPart[]; str: string }> = ({ tipParts: initTips, str: initStr }) => {
  const [tipParts, setTipParts] = useState<TipPart[]>(initTips)
  const [downstreamProxyStr, setDownstreamProxyStr] = useState(initStr)
  return (
    <MITMServerHijacking
      host="127.0.0.1"
      port={8083}
      showPort={['8083']}
      disableCACertPage={false}
      status="hijacked"
      setStatus={vi.fn()}
      autoForward={'log' as never}
      setAutoForward={vi.fn() as never}
      setVisible={vi.fn()}
      tipParts={tipParts}
      setTipParts={setTipParts}
      downstreamProxyStr={downstreamProxyStr}
      setDownstreamProxyStr={setDownstreamProxyStr}
      isHasParams={false}
      onIsHasParams={vi.fn()}
      showPluginHistoryList={[]}
      setShowPluginHistoryList={vi.fn()}
      tempShowPluginHistory=""
      setTempShowPluginHistory={vi.fn()}
      pluginStreamInfo={{}}
      showPluginStream=""
      setShowPluginStream={vi.fn()}
      hasPluginsStreamUpdate={false}
      pluginOutputRef={{ current: null } as unknown as React.RefObject<HTMLDivElement>}
    />
  )
}

const openPanel = async () => {
  fireEvent.click(screen.getByText('AgentConfigModal.proxy_configuration'))
  await waitFor(() => {
    expect(document.querySelector('.ant-popover')).toBeTruthy()
  })
}

const getDownstreamSwitch = () => Array.from(document.querySelectorAll('.ant-popover .ant-switch'))[0] as HTMLElement

describe('MITMServerHijacking 下游代理面板', () => {
  beforeAll(() => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    )
  })

  beforeEach(() => {
    vi.clearAllMocks()
    hoisted.captured.mitmServerProps = {}
    hoisted.proxyTestEcho.value = []
  })

  it('开关未生效（无 tag）时传给 MITMServer 空串，生效时传原值', async () => {
    const { unmount } = render(<Host tipParts={[]} str="http://127.0.0.1:8888" />)
    await waitFor(() => expect(screen.getByTestId('mitm-server')).toBeInTheDocument())
    expect(hoisted.captured.mitmServerProps.downstreamProxyStr).toBe('')

    unmount()
    render(<Host tipParts={[{ key: 'downstreamProxy', value: 'http://127.0.0.1:8888' }]} str="http://127.0.0.1:8888" />)
    await waitFor(() => expect(screen.getByTestId('mitm-server')).toBeInTheDocument())
    expect(hoisted.captured.mitmServerProps.downstreamProxyStr).toBe('http://127.0.0.1:8888')
  })

  it('地址为空时开启开关被拦截且提示必填', async () => {
    render(<Host tipParts={[]} str="" />)
    await openPanel()
    fireEvent.click(getDownstreamSwitch())
    await waitFor(() => {
      expect(screen.getByText('ProxyConfig.valid_proxy_address_tip')).toBeInTheDocument()
    })
    expect(grpcMITMSetDownstreamProxy).not.toHaveBeenCalled()
    // 未生成下游代理 tag（区分于面板 label，label 不带冒号）
    expect(screen.queryByText(/downstream_agent:/)).toBeNull()
  })

  it('非法地址开启开关被拦截且不下发', async () => {
    render(<Host tipParts={[]} str="not-a-proxy" />)
    await openPanel()
    fireEvent.click(getDownstreamSwitch())
    await waitFor(() => {
      expect(screen.getByText('ProxyConfig.valid_proxy_address_tip')).toBeInTheDocument()
    })
    expect(grpcMITMSetDownstreamProxy).not.toHaveBeenCalled()
  })

  it('合法地址开启开关后下发代理并生成 tag', async () => {
    render(<Host tipParts={[]} str="http://127.0.0.1:8888" />)
    await openPanel()
    fireEvent.click(getDownstreamSwitch())
    await waitFor(() => {
      expect(grpcMITMSetDownstreamProxy).toHaveBeenCalledWith({
        downstreamProxy: 'http://127.0.0.1:8888',
        downstreamProxyRuleId: '',
        version: 7,
      })
    })
    expect(screen.getByText('ProxyConfig.downstream_agent: http://127.0.0.1:8888')).toBeInTheDocument()
    expect(hoisted.captured.mitmServerProps.downstreamProxyStr).toBe('http://127.0.0.1:8888')
    expect(hoisted.checkProxyEndpoints).toHaveBeenCalledWith(['http://127.0.0.1:8888'])
  })

  it('输入地址失焦只保存草稿，不新增代理节点', async () => {
    render(<Host tipParts={[]} str="" />)
    await openPanel()
    const input = document.querySelector('.ant-popover .ant-select-selection-search-input') as HTMLInputElement
    expect(input).toBeTruthy()
    fireEvent.change(input, { target: { value: 'http://127.0.0.1:9999' } })
    fireEvent.blur(input)
    await waitFor(() => {
      expect(setRemoteValue).toHaveBeenCalledWith(expect.any(String), 'http://127.0.0.1:9999')
    })
    expect(hoisted.checkProxyEndpoints).not.toHaveBeenCalled()
    expect(grpcMITMSetDownstreamProxy).not.toHaveBeenCalled()
  })

  it('ProxyTest 回填保存草稿且多值收敛为最后一个', async () => {
    hoisted.proxyTestEcho.value = ['http://127.0.0.1:1111', 'http://127.0.0.1:2222']
    render(<Host tipParts={[]} str="" />)
    await openPanel()
    fireEvent.click(screen.getByTestId('proxy-test-btn'))
    await waitFor(() => {
      expect(setRemoteValue).toHaveBeenCalledWith(expect.any(String), 'http://127.0.0.1:2222')
    })
    expect(hoisted.checkProxyEndpoints).not.toHaveBeenCalled()
    fireEvent.click(getDownstreamSwitch())
    await waitFor(() => {
      expect(grpcMITMSetDownstreamProxy).toHaveBeenCalledWith({
        downstreamProxy: 'http://127.0.0.1:2222',
        downstreamProxyRuleId: '',
        version: 7,
      })
    })
  })

  it('关闭开关清空引擎并移除 tag，草稿保留且下游拿到空串', async () => {
    render(<Host tipParts={[{ key: 'downstreamProxy', value: 'http://127.0.0.1:8888' }]} str="http://127.0.0.1:8888" />)
    await openPanel()
    const switchBtn = getDownstreamSwitch()
    expect(switchBtn.classList.contains('ant-switch-checked')).toBe(true)
    fireEvent.click(switchBtn)
    await waitFor(() => {
      expect(grpcMITMSetDownstreamProxy).toHaveBeenCalledWith({
        downstreamProxy: '',
        downstreamProxyRuleId: '',
        version: 7,
      })
    })
    // tag 移除、发送链路拿空串、输入草稿仍在
    await waitFor(() => {
      expect(hoisted.captured.mitmServerProps.downstreamProxyStr).toBe('')
    })
    expect(screen.queryByText('ProxyConfig.downstream_agent: http://127.0.0.1:8888')).toBeNull()
    expect(screen.getByText('http://127.0.0.1:8888')).toBeInTheDocument()
    expect(setRemoteValue).not.toHaveBeenCalledWith(expect.any(String), '')
  })

  it('选中已禁用选项时开启仅告警仍下发', async () => {
    render(<Host tipParts={[]} str="ep-2" />)
    await openPanel()
    fireEvent.click(getDownstreamSwitch())
    await waitFor(() => {
      expect(yakitNotify).toHaveBeenCalledWith('warning', 'ProxyConfig.select_disabled_tip')
    })
    expect(grpcMITMSetDownstreamProxy).toHaveBeenCalled()
  })

  it('关闭 tag 等价关闭开关：清引擎并移除 tag', async () => {
    render(<Host tipParts={[{ key: 'downstreamProxy', value: 'http://x:1' }]} str="http://x:1" />)
    const closeIcon = document.querySelector('.ant-tag-close-icon') as HTMLElement
    expect(closeIcon).toBeTruthy()
    fireEvent.click(closeIcon)
    await waitFor(() => {
      expect(grpcMITMSetDownstreamProxy).toHaveBeenCalledWith({
        downstreamProxy: '',
        downstreamProxyRuleId: '',
        version: 7,
      })
    })
    expect(screen.queryByText(/downstream_agent/)).toBeNull()
    expect(hoisted.captured.mitmServerProps.downstreamProxyStr).toBe('')
  })
})
