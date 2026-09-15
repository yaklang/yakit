import { createRef } from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
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

describe('GlobalConfigEmbeddedForm', () => {
  it('渲染 DNS / TLS / 其它定位区块，并展示提交按钮', () => {
    render(
      <GlobalConfigEmbeddedForm
        t={(key) => key}
        params={params}
        setParams={vi.fn()}
        format={1}
        setFormat={vi.fn()}
        onCertificate={vi.fn()}
        cerFormRef={createRef()}
        certificateList={null}
        appConfigs={[]}
        onAddApp={vi.fn()}
        onEditApp={vi.fn()}
        onRemoveApp={vi.fn()}
        aiBlock={<div>ai-block</div>}
        codeBlock={<div>code-block</div>}
        chromePath=""
        setChromePath={vi.fn()}
        hideRules={false}
        endpointsCount={0}
        routesCount={0}
        onClickDownstreamProxy={vi.fn()}
        onOpenAuth={vi.fn()}
        pprofFileAutoAnalyze={false}
        setPprofFileAutoAnalyze={vi.fn()}
        secondaryTabsNum={100}
        setSecondaryTabsNum={vi.fn()}
        limitLogNum={200}
        setLimitLogNum={vi.fn()}
        onLimitLogNumEnter={vi.fn()}
        performanceTips={false}
        setPerformanceTips={vi.fn()}
        closeConfirmEnabled
        setCloseConfirmEnabled={vi.fn()}
        isDelPrivatePlugin={false}
        setIsDelPrivatePlugin={vi.fn()}
        netInterfaceList={[]}
        resetConfig={vi.fn()}
        submit={vi.fn()}
      />,
    )
    expect(document.querySelector('[data-settings-section="dns"]')).toBeTruthy()
    expect(document.querySelector('[data-settings-section="tls"]')).toBeTruthy()
    expect(screen.getByText('ai-block')).toBeInTheDocument()
    expect(screen.getByText('code-block')).toBeInTheDocument()
    expect(screen.getByText('SettingsPage.item.global-config')).toBeInTheDocument()
  })
})
