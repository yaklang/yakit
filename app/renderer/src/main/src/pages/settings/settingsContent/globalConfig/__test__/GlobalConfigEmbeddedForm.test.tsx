import { createRef, useState } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { GlobalNetworkConfig } from '@/components/configNetwork/ConfigNetworkPage'
import { GlobalConfigEmbeddedForm } from '../GlobalConfigEmbeddedForm'

vi.mock('@/pages/mitm/MITMServerStartForm/MITMAddTLS', () => ({
  InputCertificateForm: () => <div>cert-form</div>,
}))

vi.mock('@/utils/envfile', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>
  return {
    ...actual,
    getReleaseEditionName: () => 'Yakit',
  }
})

const params: GlobalNetworkConfig = {
  DisableSystemDNS: false,
  CustomDNSServers: [],
  DNSFallbackTCP: false,
  DNSFallbackDoH: false,
  CustomDoHServers: [],
  DisallowIPAddress: [],
  DisallowDomain: [],
  GlobalProxy: [],
  EnableSystemProxyFromEnv: false,
  SkipSaveHTTPFlow: false,
  AppConfigs: [],
  AiApiPriority: [],
  AuthInfos: [],
  SynScanNetInterface: '',
  ExcludePluginScanURIs: [],
  IncludePluginScanURIs: [],
  DbSaveSync: false,
  CallPluginTimeout: 5,
  MinTlsVersion: 0x0301,
  MaxTlsVersion: 0x0304,
  MaxContentLength: 10,
}

const baseProps = {
  t: (key: string) => key,
  params,
  setParams: vi.fn(),
  format: 1 as const,
  setFormat: vi.fn(),
  onCertificate: vi.fn(),
  cerFormRef: createRef<any>(),
  certificateList: null,
  appConfigs: [],
  onAddApp: vi.fn(),
  onEditApp: vi.fn(),
  onRemoveApp: vi.fn(),
  aiBlock: <div>ai-block</div>,
  codeBlock: <div>code-block</div>,
  chromePath: '',
  setChromePath: vi.fn(),
  hideRules: false,
  endpointsCount: 0,
  routesCount: 0,
  onClickDownstreamProxy: vi.fn(),
  onOpenAuth: vi.fn(),
  pprofFileAutoAnalyze: false,
  setPprofFileAutoAnalyze: vi.fn(),
  secondaryTabsNum: 100,
  setSecondaryTabsNum: vi.fn(),
  limitLogNum: 200,
  setLimitLogNum: vi.fn(),
  onLimitLogNumEnter: vi.fn(),
  performanceTips: false,
  setPerformanceTips: vi.fn(),
  closeConfirmEnabled: true,
  setCloseConfirmEnabled: vi.fn(),
  isDelPrivatePlugin: false,
  setIsDelPrivatePlugin: vi.fn(),
  netInterfaceList: [],
  resetConfig: vi.fn(),
  submit: vi.fn(),
}

describe('GlobalConfigEmbeddedForm', () => {
  afterEach(() => cleanup())

  it('渲染 DNS / TLS / 其它定位区块，并展示提交按钮', () => {
    render(<GlobalConfigEmbeddedForm {...baseProps} listInlinePacketSize={300} setListInlinePacketSize={vi.fn()} />)
    expect(document.querySelector('[data-settings-section="dns"]')).toBeTruthy()
    expect(document.querySelector('[data-settings-section="tls"]')).toBeTruthy()
    expect(screen.getByText('ai-block')).toBeInTheDocument()
    expect(screen.getByText('code-block')).toBeInTheDocument()
    expect(screen.getByText('SettingsPage.item.global-config')).toBeInTheDocument()
  })

  /** 用受控 state 渲染表单，返回输入框与最近一次收到的 set 值 */
  const renderControlled = (initial: number | string) => {
    let latest: number | string
    const Harness = () => {
      const [value, setValue] = useState<number | string>(initial)
      latest = value
      return <GlobalConfigEmbeddedForm {...baseProps} listInlinePacketSize={value} setListInlinePacketSize={setValue} />
    }
    render(<Harness />)
    const input = screen
      .getByText('ConfigNetworkPage.listInlinePacketSize')
      .parentElement?.parentElement?.querySelector('input') as HTMLInputElement
    return { input, getLatest: () => latest }
  }

  it('列表内联包大小：输入过滤非数字并去前导零，回传原始字符串', () => {
    const { input, getLatest } = renderControlled(300)
    fireEvent.change(input, { target: { value: '12a3' } })
    expect(getLatest()).toBe('123')
    fireEvent.change(input, { target: { value: '0045' } })
    expect(getLatest()).toBe('45')
    expect(input.value).toBe('45')
  })

  it.each([
    ['失焦', (el: HTMLInputElement) => fireEvent.blur(el)],
    [
      '回车',
      (el: HTMLInputElement) => {
        // rc-input 的 onPressEnter 带 Enter 防重复锁（keydown 上锁、keyup/blur 解锁），
        // 连续触发需补齐完整按键周期，否则第二次 Enter 会被吞
        fireEvent.keyDown(el, { key: 'Enter' })
        fireEvent.keyUp(el, { key: 'Enter' })
      },
    ],
  ])('列表内联包大小：%s时钳制到 0~500', (_trigger, blurOrEnter) => {
    const { input, getLatest } = renderControlled(300)
    // 上限：999 → 500
    fireEvent.change(input, { target: { value: '999' } })
    blurOrEnter(input)
    expect(getLatest()).toBe(500)
    // 清空输入 → 钳制为 0（允许 0=不带包）
    fireEvent.change(input, { target: { value: '' } })
    blurOrEnter(input)
    expect(getLatest()).toBe(0)
    // 合法边界 0 / 300 / 500 原样保留
    fireEvent.change(input, { target: { value: '0' } })
    blurOrEnter(input)
    expect(getLatest()).toBe(0)
    fireEvent.change(input, { target: { value: '300' } })
    blurOrEnter(input)
    expect(getLatest()).toBe(300)
    fireEvent.change(input, { target: { value: '500' } })
    blurOrEnter(input)
    expect(getLatest()).toBe(500)
    // 负号被过滤：-5 视作 5
    fireEvent.change(input, { target: { value: '-5' } })
    blurOrEnter(input)
    expect(getLatest()).toBe(5)
  })
})
