import type { MutableRefObject, ReactNode } from 'react'
import { Slider, Upload } from 'antd'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitInput } from '@/components/yakitUI/YakitInput/YakitInput'
import { YakitInputNumber } from '@/components/yakitUI/YakitInputNumber/YakitInputNumber'
import { YakitPopconfirm } from '@/components/yakitUI/YakitPopconfirm/YakitPopconfirm'
import { YakitRadioButtons } from '@/components/yakitUI/YakitRadioButtons/YakitRadioButtons'
import { YakitSelect } from '@/components/yakitUI/YakitSelect/YakitSelect'
import { YakitSwitch } from '@/components/yakitUI/YakitSwitch/YakitSwitch'
import {
  CogOutlined,
  PencilAltOutlined,
  PlusOutlined,
  TrashOutlined,
  RotateCcwOutlined,
} from '@yakit-libs/yakit-ui-icons/outline'
import type { SelectOptionProps } from '@/pages/fuzzer/HTTPFuzzerPage'
import type { TFunction } from '@/i18n/useI18nNamespaces'
import { getReleaseEditionName } from '@/utils/envfile'
import type { GlobalNetworkConfig, ThirdPartyApplicationConfig } from '@/components/configNetwork/ConfigNetworkPage'
import { InputCertificateForm } from '@/pages/mitm/MITMServerStartForm/MITMAddTLS'
import classNames from 'classnames'
import styles from './GlobalConfigSettings.module.scss'

interface SettingRowProps {
  title: ReactNode
  desc?: ReactNode
  top?: boolean
  wide?: boolean
  stack?: boolean
  children: ReactNode
}

const SettingRow: React.FC<SettingRowProps> = (props) => {
  const { title, desc, top, wide, stack, children } = props
  return (
    <div
      className={classNames(styles['setting-row'], {
        [styles['setting-row-top']]: top,
        [styles['setting-row-stack']]: stack,
      })}
    >
      <div className={styles['setting-row-text']}>
        <div className={styles['setting-row-title']}>{title}</div>
        {desc ? <div className={styles['setting-row-desc']}>{desc}</div> : null}
      </div>
      <div className={classNames(styles['setting-row-control'], { [styles['setting-row-control-wide']]: wide })}>
        {children}
      </div>
    </div>
  )
}

export interface GlobalConfigEmbeddedFormProps {
  t: TFunction
  params: GlobalNetworkConfig
  setParams: (next: GlobalNetworkConfig) => void
  format: 1 | 2
  setFormat: (v: 1 | 2) => void
  onCertificate: (file: any) => boolean | void
  cerFormRef: MutableRefObject<any>
  certificateList: ReactNode
  appConfigs: ThirdPartyApplicationConfig[]
  onAddApp: () => void
  onEditApp: (item: ThirdPartyApplicationConfig) => void
  onRemoveApp: (item: ThirdPartyApplicationConfig) => void
  aiBlock: ReactNode
  codeBlock: ReactNode
  chromePath: string
  setChromePath: (v: string) => void
  hideRules: boolean
  endpointsCount: number
  routesCount: number
  onClickDownstreamProxy: () => void
  onOpenAuth: () => void
  pprofFileAutoAnalyze: boolean
  setPprofFileAutoAnalyze: (v: boolean) => void
  secondaryTabsNum: number | string
  setSecondaryTabsNum: (v: number | string) => void
  limitLogNum: number | string
  setLimitLogNum: (v: number | string) => void
  onLimitLogNumEnter: () => void
  performanceTips: boolean
  setPerformanceTips: (v: boolean) => void
  closeConfirmEnabled: boolean
  setCloseConfirmEnabled: (v: boolean) => void
  isDelPrivatePlugin: boolean
  setIsDelPrivatePlugin: (v: boolean) => void
  netInterfaceList: SelectOptionProps[]
  resetConfig: () => void
  submit: () => void
}

export const GlobalConfigEmbeddedForm: React.FC<GlobalConfigEmbeddedFormProps> = (props) => {
  const {
    t,
    params,
    setParams,
    format,
    setFormat,
    onCertificate,
    cerFormRef,
    certificateList,
    appConfigs,
    onAddApp,
    onEditApp,
    onRemoveApp,
    aiBlock,
    codeBlock,
    chromePath,
    setChromePath,
    hideRules,
    endpointsCount,
    routesCount,
    onClickDownstreamProxy,
    onOpenAuth,
    pprofFileAutoAnalyze,
    setPprofFileAutoAnalyze,
    secondaryTabsNum,
    setSecondaryTabsNum,
    limitLogNum,
    setLimitLogNum,
    onLimitLogNumEnter,
    performanceTips,
    setPerformanceTips,
    closeConfirmEnabled,
    setCloseConfirmEnabled,
    isDelPrivatePlugin,
    setIsDelPrivatePlugin,
    netInterfaceList,
    resetConfig,
    submit,
  } = props
  const soft = getReleaseEditionName()

  const clampMaxContent = () => {
    let value = parseInt(params.MaxContentLength + '' || '0', 10)
    if (!value || value === 0) value = 10
    else if (value > 50) value = 50
    setParams({ ...params, MaxContentLength: value })
  }

  const clampSecondaryTabs = () => {
    let value = parseInt(secondaryTabsNum + '' || '0', 10)
    if (!value || value === 0) value = 100
    setSecondaryTabsNum(value)
  }

  return (
    <div className={styles['global-config']}>
      <div className={styles['page-head']}>
        <div className={styles['page-title']}>{t('SettingsPage.item.global-config')}</div>
        <div className={styles['page-actions']}>
          <YakitPopconfirm title={t('ConfigNetworkPage.confirmResetConfig')} onConfirm={resetConfig} placement="top">
            <YakitButton type="outline1" colors="danger" icon={<RotateCcwOutlined color="currentColor" />}>
              {t('ConfigNetworkPage.reset')}
            </YakitButton>
          </YakitPopconfirm>
          <YakitButton type="primary" onClick={() => submit()}>
            {t('ConfigNetworkPage.updateGlobalConfig')}
          </YakitButton>
        </div>
      </div>

      <div className={styles['section']}>
        <div className={styles['section-title']}>{t('ConfigNetworkPage.dnsConfig')}</div>
        <div className={styles['list-panel']}>
          <SettingRow title={t('ConfigNetworkPage.disableSystemDNS')}>
            <YakitSwitch
              checked={params.DisableSystemDNS}
              onChange={(DisableSystemDNS) => setParams({ ...params, DisableSystemDNS })}
            />
          </SettingRow>
          <SettingRow title={t('ConfigNetworkPage.enableTCPDNS')}>
            <YakitSwitch
              checked={params.DNSFallbackTCP}
              onChange={(DNSFallbackTCP) => setParams({ ...params, DNSFallbackTCP })}
            />
          </SettingRow>
          <SettingRow title={t('ConfigNetworkPage.enableDoHAntiPollution')}>
            <YakitSwitch
              checked={params.DNSFallbackDoH}
              onChange={(DNSFallbackDoH) => setParams({ ...params, DNSFallbackDoH })}
            />
          </SettingRow>
          <SettingRow title={t('ConfigNetworkPage.backupDNS')} stack>
            <YakitSelect
              mode="tags"
              value={params.CustomDNSServers}
              onChange={(value) => setParams({ ...params, CustomDNSServers: value })}
            />
          </SettingRow>
          {params.DNSFallbackDoH && (
            <SettingRow title={t('ConfigNetworkPage.backupDoH')} wide>
              <YakitSelect
                mode="tags"
                value={params.CustomDoHServers}
                onChange={(value) => setParams({ ...params, CustomDoHServers: value })}
              />
            </SettingRow>
          )}
        </div>
      </div>

      <div className={styles['section']}>
        <div className={styles['section-title']}>{t('ConfigNetworkPage.tlsClientConfig')}</div>
        <div className={styles['list-panel']}>
          <SettingRow title={t('ConfigNetworkPage.selectFormat')}>
            <YakitRadioButtons
              size="small"
              value={format}
              onChange={(e) => setFormat(e.target.value)}
              buttonStyle="solid"
              options={[
                { value: 1, label: t('ConfigNetworkPage.p12Format') },
                { value: 2, label: t('ConfigNetworkPage.pemFormat') },
              ]}
            />
          </SettingRow>
          <SettingRow title={t('ConfigNetworkPage.addCertificate')} top>
            <div className={styles['control-stack-end']}>
              {format === 1 && (
                <Upload
                  accept=".p12,.pfx"
                  multiple={false}
                  maxCount={1}
                  showUploadList={false}
                  beforeUpload={(file) => onCertificate(file)}
                >
                  <YakitButton type="outline2">{t('ConfigNetworkPage.addTlsClientCertificate')}</YakitButton>
                </Upload>
              )}
              {format === 2 && (
                <InputCertificateForm
                  ref={cerFormRef}
                  isShowCerName={false}
                  formProps={{
                    labelCol: { span: 8 },
                    wrapperCol: { span: 16 },
                    style: { width: '100%', marginBottom: 0 },
                  }}
                />
              )}
              {certificateList}
            </div>
          </SettingRow>
          <SettingRow title={t('ConfigNetworkPage.clientTlsVersionSupport')} wide>
            <Slider
              className={styles['slider']}
              range
              dots
              value={[params.MinTlsVersion, params.MaxTlsVersion]}
              onChange={(value) => {
                if (value.length === 2) {
                  setParams({ ...params, MinTlsVersion: value[0], MaxTlsVersion: value[1] })
                }
              }}
              min={0x300}
              max={0x304}
              tooltip={{
                formatter: (value) => {
                  switch (value) {
                    case 0x300:
                      return 'SSLv3'
                    case 0x301:
                      return 'TLS 1.0'
                    case 0x302:
                      return 'TLS 1.1'
                    case 0x303:
                      return 'TLS 1.2'
                    case 0x304:
                      return 'TLS 1.3'
                    default:
                      return value
                  }
                },
              }}
            />
          </SettingRow>
        </div>
      </div>

      <div className={styles['section']}>
        <div className={styles['section-head']}>
          <div className={styles['section-title']}>{t('ConfigNetworkPage.thirdPartyAppConfig')}</div>
          {!!appConfigs.length && (
            <YakitButton type="text" onClick={onAddApp} icon={<PlusOutlined color="currentColor" />}>
              {t('YakitButton.add')}
            </YakitButton>
          )}
        </div>
        <div className={styles['list-panel']}>
          {appConfigs.length ? (
            appConfigs.map((item) => (
              <div key={item.Type} className={styles['entry-row']}>
                <div className={styles['entry-name']}>{item.Type}</div>
                <div className={styles['entry-actions']}>
                  <YakitButton
                    type="text2"
                    size="small"
                    icon={<PencilAltOutlined color="currentColor" />}
                    onClick={() => onEditApp(item)}
                  />
                  <YakitButton
                    type="text2"
                    size="small"
                    icon={<TrashOutlined color="currentColor" />}
                    onClick={() => onRemoveApp(item)}
                  />
                </div>
              </div>
            ))
          ) : (
            <div className={styles['entry-empty']}>
              <YakitButton type="text" onClick={onAddApp} icon={<PlusOutlined color="currentColor" />}>
                {t('YakitButton.add')}
              </YakitButton>
            </div>
          )}
        </div>
      </div>

      <div className={styles['ai-slot']}>{aiBlock}</div>

      <div className={styles['code-slot']}>{codeBlock}</div>

      <div className={styles['section']}>
        <div className={styles['section-title']}>{t('ConfigNetworkPage.otherConfig')}</div>
        <div className={styles['list-panel']}>
          <SettingRow title={t('ConfigNetworkPage.httpAuthGlobalConfig')} wide>
            <div className={styles['form-rule']} onClick={onOpenAuth}>
              <div className={styles['form-rule-text']}>
                {t('ConfigNetworkPage.existingAuthConfig', {
                  count: params.AuthInfos.filter((item) => !item.Forbidden).length,
                })}
              </div>
              <div className={styles['form-rule-icon']}>
                <CogOutlined size={16} color="currentColor" />
              </div>
            </div>
          </SettingRow>
          <SettingRow
            title={t('ConfigNetworkPage.disableIP')}
            desc={t('ConfigNetworkPage.disableIPTip', { soft })}
            wide
          >
            <YakitSelect
              mode="tags"
              value={params.DisallowIPAddress}
              onChange={(value) => setParams({ ...params, DisallowIPAddress: value })}
            />
          </SettingRow>
          <SettingRow
            title={t('ConfigNetworkPage.disableDomain')}
            desc={t('ConfigNetworkPage.disableDomainTip', { soft })}
            wide
          >
            <YakitSelect
              mode="tags"
              value={params.DisallowDomain}
              onChange={(value) => setParams({ ...params, DisallowDomain: value })}
            />
          </SettingRow>
          <SettingRow
            title={t('ConfigNetworkPage.pluginScanWhitelist')}
            desc={t('ConfigNetworkPage.pluginScanWhitelistTip')}
            wide
          >
            <YakitSelect
              mode="tags"
              value={params.IncludePluginScanURIs}
              onChange={(value) => setParams({ ...params, IncludePluginScanURIs: value })}
            />
          </SettingRow>
          <SettingRow
            title={t('ConfigNetworkPage.pluginScanBlacklist')}
            desc={t('ConfigNetworkPage.pluginScanBlacklistTip')}
            wide
          >
            <YakitSelect
              mode="tags"
              value={params.ExcludePluginScanURIs}
              onChange={(value) => setParams({ ...params, ExcludePluginScanURIs: value })}
            />
          </SettingRow>
          <SettingRow title={t('ConfigNetworkPage.globalProxy')} wide>
            <YakitInput
              allowClear
              value={params.GlobalProxy.join(',')}
              onChange={(e) => setParams({ ...params, GlobalProxy: e.target.value.split(',') })}
            />
          </SettingRow>
          <SettingRow title={t('ConfigNetworkPage.pluginExecTimeout')}>
            <YakitInputNumber
              size="small"
              value={params.CallPluginTimeout}
              onChange={(e) => setParams({ ...params, CallPluginTimeout: e as number })}
              min={1}
            />
          </SettingRow>
          <SettingRow title={t('ConfigNetworkPage.noConfigLaunchPath')} wide>
            <div className={styles['path-row']}>
              <YakitInput
                value={chromePath}
                placeholder={t('ConfigNetworkPage.selectLaunchPath')}
                onChange={(e) => setChromePath(e.target.value)}
              />
              <Upload
                multiple={false}
                maxCount={1}
                showUploadList={false}
                beforeUpload={(f) => {
                  const path: string = f?.path || ''
                  if (path.length > 0) setChromePath(path)
                  return false
                }}
              >
                <span className={styles['path-link']}>{t('ConfigNetworkPage.selectPath')}</span>
              </Upload>
            </div>
          </SettingRow>
          <SettingRow title={t('ConfigNetworkPage.systemProxy')} desc={t('ConfigNetworkPage.systemProxyTip')}>
            <YakitSwitch
              checked={params.EnableSystemProxyFromEnv}
              onChange={(EnableSystemProxyFromEnv) => setParams({ ...params, EnableSystemProxyFromEnv })}
            />
          </SettingRow>
          <SettingRow title={t(hideRules ? 'AgentConfigModal.proxy_configuration' : 'ProxyConfig.title')} wide>
            <div className={styles['form-rule']} onClick={onClickDownstreamProxy}>
              <div className={styles['form-rule-text']}>
                {`${t('ProxyConfig.recordPointsCount', { i: endpointsCount })}${
                  !hideRules ? `,${t('ProxyConfig.recordRoutesCount', { i: routesCount })}` : ''
                }`}
              </div>
              <div className={styles['form-rule-icon']}>
                <CogOutlined size={16} color="currentColor" />
              </div>
            </div>
          </SettingRow>
          <SettingRow title={t('ConfigNetworkPage.saveHTTPFlow')} desc={t('ConfigNetworkPage.saveHTTPFlowTip')}>
            <YakitSwitch
              checked={!params.SkipSaveHTTPFlow}
              onChange={(val) => setParams({ ...params, SkipSaveHTTPFlow: !val })}
            />
          </SettingRow>
          <SettingRow title={t('ConfigNetworkPage.dbSyncStorage')} desc={t('ConfigNetworkPage.dbSyncStorageTip')}>
            <YakitSwitch checked={params.DbSaveSync} onChange={(val) => setParams({ ...params, DbSaveSync: val })} />
          </SettingRow>
          <SettingRow title={t('ConfigNetworkPage.dumpPacketSize')} desc={t('ConfigNetworkPage.dumpPacketSizeTip')}>
            <YakitInput
              wrapperClassName={styles['compact-input']}
              suffix="M"
              value={params.MaxContentLength}
              onChange={(e) => {
                let value = e.target.value.replace(/\D/g, '')
                if (value.length > 1 && value.startsWith('0')) value = value.replace(/^0+/, '')
                setParams({ ...params, MaxContentLength: value })
              }}
              onPressEnter={clampMaxContent}
              onBlur={clampMaxContent}
            />
          </SettingRow>
          <SettingRow
            title={t('ConfigNetworkPage.autoPerformanceSampling')}
            desc={t('ConfigNetworkPage.autoPerformanceSamplingTip')}
          >
            <YakitSwitch checked={pprofFileAutoAnalyze} onChange={setPprofFileAutoAnalyze} />
          </SettingRow>
          <SettingRow title={t('ConfigNetworkPage.secondaryTabsNum')}>
            <YakitInput
              wrapperClassName={styles['compact-input']}
              value={secondaryTabsNum}
              onChange={(e) => {
                let value = e.target.value.replace(/\D/g, '')
                if (value.length > 1 && value.startsWith('0')) value = value.replace(/^0+/, '')
                setSecondaryTabsNum(value)
              }}
              onPressEnter={clampSecondaryTabs}
              onBlur={clampSecondaryTabs}
            />
          </SettingRow>
          <SettingRow title={t('ConfigNetworkPage.pluginLogCount')}>
            <YakitInput
              wrapperClassName={styles['compact-input']}
              value={limitLogNum}
              onChange={(e) => {
                let value = e.target.value.replace(/\D/g, '')
                if (value.length > 1 && value.startsWith('0')) value = value.replace(/^0+/, '')
                setLimitLogNum(value)
              }}
              onPressEnter={onLimitLogNumEnter}
              onBlur={onLimitLogNumEnter}
            />
          </SettingRow>
          <SettingRow title={t('ConfigNetworkPage.performance')} desc={t('ConfigNetworkPage.performanceTip')}>
            <YakitSwitch checked={performanceTips} onChange={setPerformanceTips} />
          </SettingRow>
          <SettingRow title={t('ConfigNetworkPage.closeConfirm')}>
            <YakitSwitch checked={closeConfirmEnabled} onChange={setCloseConfirmEnabled} />
          </SettingRow>
        </div>
      </div>

      <div className={styles['section']}>
        <div className={styles['section-title']}>{t('ConfigNetworkPage.synScanNicConfig')}</div>
        <div className={styles['list-panel']}>
          <SettingRow title={t('ConfigNetworkPage.nic')} desc={t('ConfigNetworkPage.nicTip')} wide>
            <YakitSelect
              options={netInterfaceList}
              placeholder={t('YakitSelect.pleaseSelect')}
              value={params.SynScanNetInterface}
              onChange={(netInterface) => setParams({ ...params, SynScanNetInterface: netInterface })}
            />
          </SettingRow>
        </div>
      </div>

      <div className={styles['section']}>
        <div className={styles['section-title']}>{t('ConfigNetworkPage.privacyConfig')}</div>
        <div className={styles['list-panel']}>
          <SettingRow
            title={t('ConfigNetworkPage.deletePrivatePluginsOnLogout')}
            desc={t('ConfigNetworkPage.deletePrivatePluginsOnLogoutTip')}
          >
            <YakitSwitch checked={isDelPrivatePlugin} onChange={setIsDelPrivatePlugin} />
          </SettingRow>
        </div>
      </div>
    </div>
  )
}
