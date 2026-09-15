import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Form, Modal } from 'antd'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { yakitInfo, warn, failed, success, yakitNotify } from '@/utils/notification'
import { AutoSpin } from '@/components/AutoSpin'
import update from 'immutability-helper'
import { useCreation, useDebounceFn, useInViewport, useMemoizedFn } from 'ahooks'
import styles from './ConfigNetworkPage.module.scss'
import { YakitInput } from '../yakitUI/YakitInput/YakitInput'
import { YakitRadioButtons } from '../yakitUI/YakitRadioButtons/YakitRadioButtons'
import { StringToUint8Array, Uint8ArrayToString } from '@/utils/str'
import cloneDeep from 'lodash/cloneDeep'
import { RectangleFailIcon } from '@yakit-libs/yakit-ui-icons/oldicon/RectangleFailIcon'
import { RectangleSucceeIcon } from '@yakit-libs/yakit-ui-icons/oldicon/RectangleSucceeIcon'
import { UnionIcon } from '@yakit-libs/yakit-ui-icons/oldicon/UnionIcon'
import { showYakitModal } from '../yakitUI/YakitModal/YakitModalConfirm'
import classNames from 'classnames'
import { YakitSwitch } from '../yakitUI/YakitSwitch/YakitSwitch'
import { YakitDrawer } from '../yakitUI/YakitDrawer/YakitDrawer'
import { TableVirtualResize } from '../TableVirtualResize/TableVirtualResize'
import type { ColumnsTypeProps } from '../TableVirtualResize/TableVirtualResizeType'
import { YakitModal } from '../yakitUI/YakitModal/YakitModal'
import { YakitSelect } from '../yakitUI/YakitSelect/YakitSelect'
import ProxyRulesConfig from './ProxyRulesConfig'
import { v4 as uuidv4 } from 'uuid'
import { ExclamationCircleOutlined } from '@ant-design/icons'
import type { PcapMetadata } from '@/models/Traffic'
import type { SelectOptionProps } from '@/pages/fuzzer/HTTPFuzzerPage'
import type { KVPair } from '@/models/kv'
import { getLocalValue, getRemoteValue, setLocalValue, setRemoteValue } from '@/utils/kv'
import { LocalGVS } from '@/enums/localGlobal'
import { RemoteGV } from '@/yakitGV'
import { DragDropContext, Draggable, type DropResult, Droppable } from '@hello-pangea/dnd'
import NewThirdPartyApplicationConfig from './NewThirdPartyApplicationConfig'
import { GlobalConfigRemoteGV } from '@/enums/globalConfig'
import emiter from '@/utils/eventBus/eventBus'
import { CodeCustomize } from './CustomizeCode'
import { CogOutlined, TrashOutlined, BanOutlined, PencilAltOutlined } from '@yakit-libs/yakit-ui-icons/outline'
import { LIMIT_LOG_NUM_NAME, DEFAULT_LOG_LIMIT } from '@/defaultConstants/HoldGRPCStream'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { checkProxyVersion } from '@/utils/proxyConfigUtil'
import { useProxy } from '@/hook/useProxy'
import { handleAIConfig } from '@/pages/spaceEngine/utils'
import { isIRify } from '@/utils/envfile'
import { JSONParseLog } from '@/utils/tool'
import { getTipByType } from '@/pages/ai-agent/aiModelList/AIModelList'
import { AIModelPolicyOptions } from '@/pages/ai-agent/defaultConstant'
import useAIGlobalConfig from '@/pages/ai-re-act/hooks/useAIGlobalConfig'
import { setOpenPerformanceTips } from '@/utils/duplex/duplex'

import { GlobalConfigEmbeddedForm } from '@/pages/settings/settingsContent/globalConfig/GlobalConfigEmbeddedForm'
import gStyles from '@/pages/settings/settingsContent/globalConfig/GlobalConfigSettings.module.scss'
import { CheckCircleSolid, FigmaIcon2281144183Solid, LockClosedSolid, XSolid } from '@yakit-libs/yakit-ui-icons/solid'

export interface ConfigNetworkPageProp {}

export interface AuthInfo {
  AuthUsername: string
  AuthPassword: string
  AuthType: string
  Host: string
  Forbidden: boolean
}
export interface HandleAIConfigProps {
  AppConfigs: GlobalNetworkConfig['AppConfigs']
  AiApiPriority: GlobalNetworkConfig['AiApiPriority']
}
export interface GlobalNetworkConfig {
  DisableSystemDNS: boolean
  CustomDNSServers: string[]
  DNSFallbackTCP: boolean
  DNSFallbackDoH: boolean
  CustomDoHServers: string[]

  ClientCertificates?: ClientCertificates[]

  DisallowIPAddress: string[]
  DisallowDomain: string[]
  GlobalProxy: string[]
  EnableSystemProxyFromEnv: boolean
  SkipSaveHTTPFlow: boolean

  //
  AppConfigs: ThirdPartyApplicationConfig[]

  AiApiPriority: string[]

  AuthInfos: AuthInfo[]

  SynScanNetInterface: string

  ExcludePluginScanURIs: string[]
  IncludePluginScanURIs: string[]

  DbSaveSync: boolean

  CallPluginTimeout: number

  MinTlsVersion: number
  MaxTlsVersion: number
  MaxContentLength: number | string
}
export interface ThirdPartyApplicationConfig {
  //zoomeye / hunter / shodan / fofa / github / openai / token
  Type:
    | 'zoomeye'
    | 'hunter'
    | 'shodan'
    | 'fofa'
    | 'github'
    | 'openai'
    | 'skylark'
    | 'aliyun'
    | 'tencent'
    | 'quake'
    | string
  APIKey?: string
  UserIdentifier?: string
  UserSecret?: string
  Namespace?: string
  Domain?: string
  WebhookURL?: string
  ExtraParams?: KVPair[]
  Disabled?: boolean
  Proxy?: string
  NoHttps?: boolean
  APIType?: string
  BaseURL?: string
  Endpoint?: string
  EnableEndpoint?: boolean
  Headers?: KVPair[]
  /**为空，不传给后端 */
  MaxTokens?: number
  /**为空，不传给后端 */
  Temperature?: number
  /**为空，不传给后端 */
  TopP?: number
  /**为空，不传给后端 */
  TopK?: number
  /**为空，不传给后端 */
  FrequencyPenalty?: number
  /**为空，不传给后端 */
  ReasoningEffort?: string
}
type TenumBuffer = Uint8Array

export interface IsSetGlobalNetworkConfig {
  Pkcs12Bytes: Uint8Array
  Pkcs12Password?: Uint8Array
}

interface ClientCertificatePem {
  CrtPem: TenumBuffer
  KeyPem: TenumBuffer
  CaCertificates: TenumBuffer[]
  Host: string
}

interface ClientCertificatePfx {
  name: string
  Pkcs12Bytes: TenumBuffer
  Pkcs12Password: TenumBuffer
  password?: boolean
  Host?: string
  CrtPem?: TenumBuffer
  KeyPem?: TenumBuffer
  CaCertificates?: TenumBuffer[]
}

interface ClientCertificates {
  CrtPem: TenumBuffer
  KeyPem: TenumBuffer
  CaCertificates: TenumBuffer[]
  Pkcs12Bytes: TenumBuffer
  Pkcs12Password: TenumBuffer
  Host?: string
}

const { ipcRenderer } = window.require('electron')

export const defaultParams: GlobalNetworkConfig = {
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
  CallPluginTimeout: 60,
  MinTlsVersion: 0x300,
  MaxTlsVersion: 0x304,
  MaxContentLength: 10,
}

export const ConfigNetworkPage: React.FC<ConfigNetworkPageProp> = () => {
  const [params, setParams] = useState<GlobalNetworkConfig>(defaultParams)
  const [certificateParams, setCertificateParams] = useState<ClientCertificatePfx[]>()
  const currentIndex = useRef<number>(0)
  const [format, setFormat] = useState<1 | 2>(1)
  const cerFormRef = useRef<any>()
  const [loading, setLoading] = useState(false)
  const isShowLoading = useRef<boolean>(true)
  const [visible, setVisible] = useState<boolean>(false)
  const configRef = useRef<any>()
  const [inViewport] = useInViewport(configRef)
  const [netInterfaceList, setNetInterfaceList] = useState<SelectOptionProps[]>([]) // 代理代表
  const [proxyDrawerVisible, setProxyDrawerVisible] = useState(false)
  const { t, i18n } = useI18nNamespaces(['configNetwork', 'mitm', 'yakitUi', 'setting'])
  const {
    proxyConfig: { Routes = [], Endpoints = [] },
  } = useProxy()
  const originGlobalConfigRef = useRef<GlobalNetworkConfig>(cloneDeep(defaultParams))
  /** ---------- 是否删除私密插件逻辑 Start ---------- */
  const [isDelPrivatePlugin, setIsDelPrivatePlugin] = useState<boolean>(false)
  useEffect(() => {
    getLocalValue(LocalGVS.IsDeletePrivatePluginsOnLogout).then((v: boolean) => {
      setIsDelPrivatePlugin(!!v)
    })
  }, [])
  const onSetDelPrivatePlugin = useMemoizedFn(() => {
    setLocalValue(LocalGVS.IsDeletePrivatePluginsOnLogout, isDelPrivatePlugin)
  })
  const onResetDelPrivatePlugin = useMemoizedFn(() => {
    setLocalValue(LocalGVS.IsDeletePrivatePluginsOnLogout, false)
  })
  /** ---------- 私密插件逻辑 End ---------- */

  const update = useMemoizedFn(() => {
    isShowLoading.current && setLoading(true)
    isShowLoading.current = false
    // setParams(defaultParams)
    ipcRenderer.invoke('GetGlobalNetworkConfig', {}).then((rsp: GlobalNetworkConfig) => {
      const { ClientCertificates, SynScanNetInterface } = rsp
      ipcRenderer.invoke('GetPcapMetadata', {}).then((data: PcapMetadata) => {
        if (!data || !data.AvailablePcapDevices?.length) {
          return
        }
        const interfaceList = data.AvailablePcapDevices.filter((el) => el).map((item) => ({
          label: `${item.NetInterfaceName}-(${item.IP})`,
          value: item.Name,
        }))
        if (SynScanNetInterface.length === 0 && data?.DefaultPublicNetInterface) {
          setParams((v) => ({
            ...v,
            SynScanNetInterface: data.DefaultPublicNetInterface?.NetInterfaceName || '',
          }))
        }
        setNetInterfaceList(interfaceList)
      })
      if (Array.isArray(ClientCertificates) && ClientCertificates.length > 0) {
        const newArr = ClientCertificates.map((item, index) => {
          return { ...item, name: t('ConfigNetworkPage.certificateName', { index: index + 1 }) }
        })
        setCertificateParams(newArr)
        currentIndex.current = ClientCertificates.length
      } else {
        setCertificateParams([])
        currentIndex.current = 0
      }
      const value: GlobalNetworkConfig = {
        ...params,
        ...rsp,
        DisallowDomain: rsp.DisallowDomain.filter((item) => item),
        MaxContentLength: +rsp.MaxContentLength / (1024 * 1024) || 10,
      }
      originGlobalConfigRef.current = { ...value }
      setParams({ ...value })
      setLoading(false)
    })
  })
  useEffect(() => {
    update()
  }, [])

  const onCertificate = useMemoizedFn((file: any) => {
    if (!['application/x-pkcs12'].includes(file.type)) {
      warn(t('ConfigNetworkPage.onlySupportPkcs12'))
      return false
    }
    ipcRenderer
      .invoke('fetch-certificate-content', file.path)
      .then((res) => {
        currentIndex.current += 1

        // 验证证书是否需要密码
        ipcRenderer
          .invoke('ValidP12PassWord', {
            Pkcs12Bytes: res,
          } as IsSetGlobalNetworkConfig)
          .then((result: { IsSetPassWord: boolean }) => {
            if (result.IsSetPassWord) {
              setCertificateParams([
                ...(certificateParams || []),
                {
                  name: t('ConfigNetworkPage.certificateName', { index: currentIndex.current }),
                  Pkcs12Bytes: res,
                  Pkcs12Password: new Uint8Array(),
                },
              ])
            } else {
              // 需要密码
              setCertificateParams([
                ...(certificateParams || []),
                {
                  name: t('ConfigNetworkPage.certificateName', { index: currentIndex.current }),
                  Pkcs12Bytes: res,
                  Pkcs12Password: new Uint8Array(),
                  password: true,
                },
              ])
            }
          })
      })
      .catch((e) => {
        failed(t('ConfigNetworkPage.fetchCertificateContentFailed', { error: String(e) }))
      })
    return false
  })

  const ipcSubmit = useMemoizedFn((params: GlobalNetworkConfig, isNtml?: boolean) => {
    const realParams: GlobalNetworkConfig = {
      ...params,
      MaxContentLength: +params.MaxContentLength * 1024 * 1024,
    }
    ipcRenderer
      .invoke('SetGlobalNetworkConfig', realParams)
      .then(() => {
        cerFormRef.current?.resetFields()
        yakitInfo(t('ConfigNetworkPage.updateConfigSuccess'))
        update()
        if (isNtml) setVisible(false)
      })
      .catch((err) => {
        yakitNotify('error', err + '')
      })
  })

  const onNtmlSave = useMemoizedFn(() => {
    submit(true)
  })

  const [closeConfirmEnabled, setCloseConfirmEnabled] = useState(true)

  const onConfirmCloseConfirmEnabled = useMemoizedFn(async (value: boolean) => {
    try {
      await ipcRenderer.invoke('set-extra-cache', 'windows-close-flag', value)
      await ipcRenderer.invoke('manual-write-file', 'extraCache')
    } catch {}
  })

  useEffect(() => {
    if (!inViewport) return
    ipcRenderer
      .invoke('fetch-extra-cache', 'windows-close-flag')
      .then((flag) => {
        setCloseConfirmEnabled(flag !== false)
      })
      .catch(() => setCloseConfirmEnabled(true))
  }, [inViewport])

  const submit = useMemoizedFn((isNtml?: boolean) => {
    // 更新 隐私配置 数据
    onSetDelPrivatePlugin()

    // 更新 免配置启动路径
    onSetChromePath()

    // 更新 自动性能采样
    onSetPprofFileAutoAnalyze()

    // 更新 二级页签数量
    onSetSecondaryTabsNum()

    // 更新插件日志条数
    onSetLimitLogNum()

    // 更新性能提示
    onSetPerformanceTips()
    // 更新二次确认开关
    onConfirmCloseConfirmEnabled(closeConfirmEnabled)

    const newParams: GlobalNetworkConfig = {
      ...params,
      ClientCertificates: [],
    }
    if (
      Array.isArray(certificateParams) &&
      certificateParams.length > 0 &&
      certificateParams.filter((item) => item.password === true).length === certificateParams.length
    ) {
      warn(t('ConfigNetworkPage.invalidCertificate'))
      return
    } else {
      const certificate = (certificateParams || []).filter((item) => item.password !== true)
      const ClientCertificates = certificate.map((item) => {
        const {
          Pkcs12Bytes,
          Pkcs12Password,
          Host,
          CrtPem = new Uint8Array(),
          KeyPem = new Uint8Array(),
          CaCertificates = [],
        } = item
        if (Uint8ArrayToString(CrtPem) && Uint8ArrayToString(KeyPem)) {
          // pem 格式
          return {
            CrtPem,
            KeyPem,
            CaCertificates,
            Host,
            Pkcs12Bytes: new Uint8Array(),
            Pkcs12Password: new Uint8Array(),
          }
        } else {
          // p12/pfx 格式
          return {
            Pkcs12Bytes,
            Pkcs12Password,
            Host,
            CrtPem: new Uint8Array(),
            KeyPem: new Uint8Array(),
            CaCertificates: [],
          }
        }
      })
      newParams.ClientCertificates = ClientCertificates.length > 0 ? ClientCertificates : []
    }

    if (format === 1) {
      ipcSubmit(newParams, isNtml)
    } else {
      // 校验 pem 格式
      cerFormRef.current
        .validateFields()
        .then((values) => {
          if (values.CrtPem && values.KeyPem) {
            const obj: ClientCertificatePem = {
              CrtPem: StringToUint8Array(values.CrtPem),
              KeyPem: StringToUint8Array(values.KeyPem),
              CaCertificates:
                values.CaCertificates && values.CaCertificates.length > 0
                  ? [StringToUint8Array(values.CaCertificates)]
                  : [],
              Host: values.Host || '',
            }
            newParams.ClientCertificates = newParams.ClientCertificates?.concat({
              ...obj,
              Pkcs12Bytes: new Uint8Array(),
              Pkcs12Password: new Uint8Array(),
            })
          }
          ipcSubmit(newParams, isNtml)
        })
        .catch(() => {})
    }
  })

  const hostRef = useRef<string>('')
  const handleConfigureHost = (key: number, Host?: string) => {
    hostRef.current = Host || ''
    const m = showYakitModal({
      title: (modalT) => modalT('ConfigNetworkPage.inputHostTitle'),
      content: (modalT) => (
        <div style={{ paddingTop: 20 }}>
          <Form labelCol={{ span: 5 }} wrapperCol={{ span: 18 }} size={'small'}>
            <Form.Item label={modalT('ConfigNetworkPage.domain')} help={modalT('ConfigNetworkPage.domainHelp')}>
              <YakitInput
                defaultValue={hostRef.current}
                placeholder={modalT('ConfigNetworkPage.domainPlaceholder')}
                allowClear
                onChange={(e) => {
                  const { value } = e.target
                  hostRef.current = value
                }}
              />
            </Form.Item>
          </Form>
        </div>
      ),
      onCancel: () => {
        m.destroy()
      },
      onOkText: t('YakitButton.add'),
      onOk: () => {
        setCertificateParams((prev) => {
          if (Array.isArray(prev)) {
            prev[key].Host = hostRef.current
          }
          return prev?.slice()
        })
        m.destroy()
      },
      width: 400,
    })
  }

  const closeCard = useMemoizedFn((item: ClientCertificatePfx) => {
    if (Array.isArray(certificateParams)) {
      const cache: ClientCertificatePfx[] = certificateParams.filter((itemIn) => item.name !== itemIn.name)
      setCertificateParams(cache)
    }
  })

  const failCard = useMemoizedFn((item: ClientCertificatePfx, key: number) => {
    return (
      <div className={styles['certificate-card-item']} key={key}>
        <div className={classNames(styles['certificate-card'], styles['certificate-fail'])}>
          <div className={styles['decorate']}>
            <RectangleFailIcon />
          </div>
          <div className={styles['card-hide']}></div>
          <div className={styles['fail-main']}>
            <div className={styles['title']}>{item.name}</div>
            <LockClosedSolid color="#F6544A" size={24} />
            <div className={styles['content']}>{t('ConfigNetworkPage.undecrypted')}</div>
            <YakitButton
              type="outline2"
              onClick={() => {
                const m = showYakitModal({
                  title: (modalT) => modalT('ConfigNetworkPage.passwordUnlock'),
                  content: (modalT) => (
                    <div style={{ padding: 20 }}>
                      <YakitInput.Password
                        placeholder={modalT('ConfigNetworkPage.enterCertificatePassword')}
                        allowClear
                        onChange={(e) => {
                          const { value } = e.target
                          setCertificateParams((prev) => {
                            if (Array.isArray(prev)) {
                              prev[key].Pkcs12Password = value.length > 0 ? StringToUint8Array(value) : new Uint8Array()
                            }
                            return prev?.slice()
                          })
                        }}
                      />
                    </div>
                  ),
                  onCancel: () => {
                    m.destroy()
                  },
                  onOk: () => {
                    ipcRenderer
                      .invoke('ValidP12PassWord', {
                        Pkcs12Bytes: item.Pkcs12Bytes,
                        Pkcs12Password: item.Pkcs12Password,
                      } as IsSetGlobalNetworkConfig)
                      .then((result: { IsSetPassWord: boolean }) => {
                        if (result.IsSetPassWord) {
                          setCertificateParams((prev) => {
                            if (Array.isArray(prev)) {
                              prev[key].password = false
                            }
                            return prev?.slice()
                          })
                          m.destroy()
                        } else {
                          failed(t('ConfigNetworkPage.passwordError'))
                        }
                      })
                  },
                  width: 400,
                })
              }}
            >
              {t('ConfigNetworkPage.passwordUnlock')}
            </YakitButton>
          </div>
        </div>
        <div className={styles['certificate-card-item-footer']}>
          <CogOutlined
            className={styles['icon-cog']}
            onClick={() => {
              handleConfigureHost(key, item.Host)
            }}
            color="currentColor"
          />
          <TrashOutlined
            className={styles['icon-trash']}
            onClick={() => {
              closeCard(item)
            }}
            color="currentColor"
          />
        </div>
      </div>
    )
  })

  const succeeCard = useMemoizedFn((item: ClientCertificatePfx, key: number) => {
    return (
      <div className={styles['certificate-card-item']} key={key}>
        <div className={classNames(styles['certificate-card'], styles['certificate-succee'])}>
          <div className={styles['decorate']}>
            <RectangleSucceeIcon />
          </div>
          <div className={styles['union']}>
            <UnionIcon />
          </div>
          <div className={styles['card-hide']}></div>

          <div className={styles['success-main']}>
            <div className={styles['title']}>{item.name}</div>
            <CheckCircleSolid color="#56C991" size={24} />
            <div className={styles['content']}>{t('ConfigNetworkPage.available')}</div>
            <div className={styles['password']}>******</div>
          </div>
        </div>
        <div className={styles['certificate-card-item-footer']}>
          <CogOutlined
            className={styles['icon-cog']}
            onClick={() => {
              handleConfigureHost(key, item.Host)
            }}
            color="currentColor"
          />
          <TrashOutlined
            className={styles['icon-trash']}
            onClick={() => {
              closeCard(item)
            }}
            color="currentColor"
          />
        </div>
      </div>
    )
  })

  const certificateList = useMemo(() => {
    return (
      <div className={styles['certificate-box']}>
        {Array.isArray(certificateParams) &&
          certificateParams.map((item, index) => {
            if (item.password) return failCard(item, index)
            return succeeCard(item, index)
          })}
      </div>
    )
  }, [certificateParams])

  const [chromePath, setChromePath] = useState<string>('')
  useEffect(() => {
    getRemoteValue(RemoteGV.GlobalChromePath).then((setting) => {
      if (!setting) {
        ipcRenderer.invoke('GetChromePath').then((chromePath: string) => {
          setChromePath(chromePath)
          onSetChromePath(chromePath)
        })
      } else {
        const values: string = JSONParseLog(setting, { page: 'ConfigNetworkPage', fun: 'GlobalChromePath' })
        setChromePath(values)
      }
    })
  }, [])
  const onSetChromePath = useMemoizedFn((value?: string) => {
    const path = value || chromePath
    setRemoteValue(RemoteGV.GlobalChromePath, JSON.stringify(path)).then(() => {
      emiter.emit('onRefConfigChromePath', '')
    })
  })
  const onResetChromePath = useMemoizedFn(() => {
    let path = ''
    ipcRenderer
      .invoke('GetChromePath')
      .then((chromePath: string) => {
        path = chromePath
      })
      .finally(() => {
        setChromePath(path)
        setRemoteValue(RemoteGV.GlobalChromePath, JSON.stringify(path)).then(() => {
          emiter.emit('onRefConfigChromePath', '')
        })
      })
  })

  const [pprofFileAutoAnalyze, setPprofFileAutoAnalyze] = useState<boolean>(false)
  useEffect(() => {
    getRemoteValue(GlobalConfigRemoteGV.PProfFileAutoAnalyze).then((setting) => {
      setPprofFileAutoAnalyze(setting === 'true')
    })
  }, [])
  const onSetPprofFileAutoAnalyze = () => {
    setRemoteValue(GlobalConfigRemoteGV.PProfFileAutoAnalyze, pprofFileAutoAnalyze + '')
  }
  const onResetPprofFileAutoAnalyze = () => {
    setPprofFileAutoAnalyze(false)
    setRemoteValue(GlobalConfigRemoteGV.PProfFileAutoAnalyze, false + '')
  }

  const [secondaryTabsNum, setSecondaryTabsNum] = useState<number | string>(100)
  useEffect(() => {
    getRemoteValue(GlobalConfigRemoteGV.SecondaryTabsNum).then((set) => {
      if (set) {
        setSecondaryTabsNum(set)
      }
    })
  }, [])
  const onSetSecondaryTabsNum = () => {
    setRemoteValue(GlobalConfigRemoteGV.SecondaryTabsNum, secondaryTabsNum + '')
    emiter.emit('onUpdateSecondaryTabsNum', Number(secondaryTabsNum))
  }
  const onResetSecondaryTabsNum = () => {
    setSecondaryTabsNum(100)
    setRemoteValue(GlobalConfigRemoteGV.SecondaryTabsNum, 100 + '')
  }

  const [limitLogNum, setLimitLogNum] = useState<number | string>(DEFAULT_LOG_LIMIT)

  useEffect(() => {
    getRemoteValue(LIMIT_LOG_NUM_NAME).then((num) => {
      if (num) setLimitLogNum(Number(num))
    })
  }, [])

  const onSetLimitLogNum = useMemoizedFn(() => {
    const value = Number(limitLogNum)
    setRemoteValue(LIMIT_LOG_NUM_NAME, value + '')
    emiter.emit('onUpdateLimitLogNum', value)
  })

  const onResetLimitLogNum = useMemoizedFn(() => {
    setLimitLogNum(DEFAULT_LOG_LIMIT)
    setTimeout(() => {
      onSetLimitLogNum()
    }, 100)
  })

  const onLimitLogNumEnter = useMemoizedFn(() => {
    let value = parseInt(limitLogNum + '' || '0', 10)
    if (!value || value === 0) {
      value = 100
    }
    setLimitLogNum(value)
  })

  const onClickDownstreamProxy = useMemoizedFn(async () => {
    try {
      const versionValid = await checkProxyVersion()
      if (!versionValid) {
        return
      }
      setProxyDrawerVisible(true)
    } catch (error) {
      console.error('error:', error)
    }
  })
  const hideRules = useMemo(() => isIRify(), [])

  const [performanceTips, setPerformanceTips] = useState(false)
  useEffect(() => {
    getRemoteValue(GlobalConfigRemoteGV.PerformanceTips).then((setting) => {
      setPerformanceTips(setting === 'true')
    })
  }, [inViewport])
  const onSetPerformanceTips = () => {
    setOpenPerformanceTips(!performanceTips)
  }
  const onResetPerformanceTips = () => {
    setPerformanceTips(false)
    setOpenPerformanceTips(true)
  }

  const resetConfig = useMemoizedFn(() => {
    onResetDelPrivatePlugin()
    onResetChromePath()
    onResetPprofFileAutoAnalyze()
    onResetSecondaryTabsNum()
    onResetLimitLogNum()
    onResetPerformanceTips()
    setCloseConfirmEnabled(true)
    onConfirmCloseConfirmEnabled(true)
    ipcRenderer.invoke('ResetGlobalNetworkConfig', {}).then(() => {
      cerFormRef.current?.resetFields()
      update()
      yakitInfo(t('ConfigNetworkPage.resetConfigSuccess'))
    })
  })

  const onEditApp = useMemoizedFn((i: ThirdPartyApplicationConfig) => {
    const extraParamsArr = i.ExtraParams || []
    const extraParams = {}
    extraParamsArr.forEach((item) => {
      extraParams[item.Key] = item.Value
    })
    const m = showYakitModal({
      title: (modalT) => modalT('ConfigNetworkPage.editThirdPartyApp'),
      width: 600,
      closable: true,
      maskClosable: false,
      footer: null,
      content: (
        <NewThirdPartyApplicationConfig
          formValues={{
            Type: i.Type,
            ...extraParams,
          }}
          disabledType={true}
          onAdd={(data) => {
            setParams({
              ...params,
              AppConfigs: (params.AppConfigs || []).map((item) => {
                if (item.Type === data.Type) {
                  item = data
                }
                return { ...item }
              }),
            })
            setTimeout(() => submit(), 100)
            m.destroy()
          }}
          onCancel={() => m.destroy()}
        />
      ),
    })
  })

  const onRemoveApp = useMemoizedFn(async (i: ThirdPartyApplicationConfig) => {
    const newAppConfigs = (params.AppConfigs || []).filter((e) => i.Type !== e.Type)
    const newAiApiPriority = params.AiApiPriority.filter((ele) => ele !== i.Type)
    setParams({
      ...params,
      AppConfigs: newAppConfigs,
      AiApiPriority: newAiApiPriority,
    })
    setTimeout(() => submit(), 100)
  })

  const onAddApp = useMemoizedFn(() => {
    const m = showYakitModal({
      title: (modalT) => modalT('ConfigNetworkPage.addThirdPartyApp'),
      width: 600,
      footer: null,
      closable: true,
      maskClosable: false,
      content: (
        <NewThirdPartyApplicationConfig
          onAdd={(data) => {
            const newValue = handleAIConfig(
              {
                AppConfigs: params.AppConfigs,
                AiApiPriority: params.AiApiPriority,
              },
              data,
            )
            if (!newValue) {
              yakitNotify('error', t('ConfigNetworkPage.paramError'))
              return
            }
            setParams((perv) => ({ ...perv, ...newValue }))
            setTimeout(() => submit(), 100)
            m.destroy()
          }}
          onCancel={() => m.destroy()}
        />
      ),
    })
  })

  return (
    <>
      <div ref={configRef} className={styles['config-network-embedded']}>
        <AutoSpin spinning={loading} tip={t('ConfigNetworkPage.loading')}>
          {params && (
            <GlobalConfigEmbeddedForm
              t={t}
              params={params}
              setParams={setParams}
              format={format}
              setFormat={setFormat}
              onCertificate={onCertificate}
              cerFormRef={cerFormRef}
              certificateList={certificateList}
              appConfigs={params.AppConfigs || []}
              onAddApp={onAddApp}
              onEditApp={onEditApp}
              onRemoveApp={onRemoveApp}
              aiBlock={<AIModelGlobalConfig />}
              codeBlock={<CodeCustomize variant="settings" />}
              chromePath={chromePath}
              setChromePath={setChromePath}
              hideRules={hideRules}
              endpointsCount={Endpoints.length}
              routesCount={Routes.length}
              onClickDownstreamProxy={onClickDownstreamProxy}
              onOpenAuth={() => setVisible(true)}
              pprofFileAutoAnalyze={pprofFileAutoAnalyze}
              setPprofFileAutoAnalyze={setPprofFileAutoAnalyze}
              secondaryTabsNum={secondaryTabsNum}
              setSecondaryTabsNum={setSecondaryTabsNum}
              limitLogNum={limitLogNum}
              setLimitLogNum={setLimitLogNum}
              onLimitLogNumEnter={onLimitLogNumEnter}
              performanceTips={performanceTips}
              setPerformanceTips={setPerformanceTips}
              closeConfirmEnabled={closeConfirmEnabled}
              setCloseConfirmEnabled={setCloseConfirmEnabled}
              isDelPrivatePlugin={isDelPrivatePlugin}
              setIsDelPrivatePlugin={setIsDelPrivatePlugin}
              netInterfaceList={netInterfaceList}
              resetConfig={resetConfig}
              submit={submit}
            />
          )}
        </AutoSpin>
        <ProxyRulesConfig
          hideRules={hideRules}
          visible={proxyDrawerVisible}
          onClose={() => setProxyDrawerVisible(false)}
        />
      </div>
      {visible && (
        <NTMLConfig
          visible={visible && !!inViewport}
          setVisible={setVisible}
          params={params}
          setParams={setParams}
          onNtmlSave={onNtmlSave}
        />
      )}
    </>
  )
}

/**
 * 在全局配置得页面使用这个组件,组件得父元素得Form表单中没有使用自带得设置值,而是采用得state来控制
 */
const AIModelGlobalConfig: React.FC = React.memo(() => {
  const { t } = useI18nNamespaces(['aiAgent', 'yakitUi'])
  const refRef = useRef<HTMLDivElement>(null)
  const [inViewport = true] = useInViewport(refRef)

  const [aiGlobalConfigData, event] = useAIGlobalConfig()

  useEffect(() => {
    inViewport && event.onRefresh()
  }, [inViewport])
  const aiGlobalConfig = useCreation(() => aiGlobalConfigData.aiGlobalConfig, [aiGlobalConfigData.aiGlobalConfig])

  return (
    <div ref={refRef} className={gStyles['section']}>
      <div className={gStyles['section-title']}>{t('AIModelGlobalConfig.aiModelConfig')}</div>
      <div className={gStyles['list-panel']}>
        <div className={gStyles['setting-row']}>
          <div className={gStyles['setting-row-text']}>
            <div className={gStyles['setting-row-title']}>{t('AiAgengt.callingMode')}</div>
          </div>
          <div className={classNames(gStyles['setting-row-control'], gStyles['setting-row-control-fit'])}>
            <div className={gStyles['control-stack-end']}>
              <YakitRadioButtons
                buttonStyle="solid"
                options={AIModelPolicyOptions.map((item) => ({ ...item, label: t(item.label) }))}
                value={aiGlobalConfig.RoutingPolicy}
                onChange={(v) => event.setAIGlobalConfig({ RoutingPolicy: v.target.value })}
              />
              <div className={gStyles['setting-row-desc']}>{getTipByType(aiGlobalConfig.RoutingPolicy, t)}</div>
            </div>
          </div>
        </div>
        <div className={gStyles['setting-row']}>
          <div className={gStyles['setting-row-text']}>
            <div className={gStyles['setting-row-title']}>{t('AIModelGlobalConfig.disableFallback')}</div>
          </div>
          <div className={gStyles['setting-row-control']}>
            <YakitSwitch
              size="middle"
              checked={aiGlobalConfig.DisableFallback}
              onChange={(c) => event.setAIGlobalConfig({ DisableFallback: c })}
            />
          </div>
        </div>
      </div>
    </div>
  )
})

interface NTMLConfigProps {
  visible: boolean
  setVisible: (v: boolean) => void
  getContainer?: HTMLElement | (() => HTMLElement) | false
  params: GlobalNetworkConfig
  setParams: (v: GlobalNetworkConfig) => void
  onNtmlSave: () => void
}

interface DataProps extends AuthInfo {
  id: string
  Disabled: boolean
}

export const NTMLConfig: React.FC<NTMLConfigProps> = (props) => {
  const { visible, setVisible, getContainer, params, setParams, onNtmlSave } = props
  const { t, i18nRefresh } = useI18nNamespaces(['configNetwork', 'yakitUi'])
  const [data, setData] = useState<DataProps[]>([])
  const [isRefresh, setIsRefresh] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(false)
  const [currentItem, setCurrentItem] = useState<DataProps>()
  const [modalStatus, setModalStatus] = useState<boolean>(false)
  const [isEdit, setIsEdit] = useState<boolean>(false)
  // initData 初始数据 用于校验数据是否改变
  const initData = useRef<DataProps[]>([])

  useEffect(() => {
    const newData = params.AuthInfos.map((item) => ({ id: uuidv4(), Disabled: item.Forbidden, ...item }))
    initData.current = newData
    setData(newData)
  }, [params.AuthInfos])

  const onOk = useMemoizedFn(() => {
    const AuthInfos = data.map((item) => ({
      AuthUsername: item.AuthUsername,
      AuthPassword: item.AuthPassword,
      AuthType: item.AuthType,
      Host: item.Host,
      Forbidden: item.Forbidden,
    }))

    setParams({ ...params, AuthInfos })
    setTimeout(() => {
      onNtmlSave()
    }, 200)
  })

  const onClose = useMemoizedFn(() => {
    if (JSON.stringify(initData.current) !== JSON.stringify(data)) {
      Modal.confirm({
        title: t('YakitModal.friendlyReminder'),
        icon: <ExclamationCircleOutlined />,
        content: t('ConfigNetworkPage.saveHttpAuthAndClose'),
        okText: t('YakitButton.save'),
        cancelText: t('YakitButton.doNotSave'),
        closable: true,
        closeIcon: (
          <div
            onClick={(e) => {
              e.stopPropagation()
              Modal.destroyAll()
            }}
            className="modal-remove-icon"
          >
            <XSolid size={12} />
          </div>
        ),
        onOk: () => {
          onOk()
        },
        onCancel: () => {
          setVisible(false)
        },
        cancelButtonProps: { size: 'small', className: 'modal-cancel-button' },
        okButtonProps: { size: 'small', className: 'modal-ok-button' },
      })
    } else {
      setVisible(false)
    }
  })

  const onCreateAuthInfo = useMemoizedFn(() => {
    setModalStatus(true)
  })

  const onRowClick = useDebounceFn(
    (rowDate) => {
      setCurrentItem(rowDate)
    },
    { wait: 200 },
  ).run

  const onRemove = useMemoizedFn((rowDate: DataProps) => {
    const newData = data.filter((item) => item.id !== rowDate.id)
    setData(newData)
  })

  const onBan = useMemoizedFn((rowDate: DataProps) => {
    const newData: DataProps[] = data.map((item: DataProps) => {
      if (item.id === rowDate.id) {
        if (!rowDate.Disabled && rowDate.id === currentItem?.id) {
          setCurrentItem(undefined)
        }
        item = {
          ...rowDate,
          Disabled: !rowDate.Disabled,
          Forbidden: !rowDate.Disabled,
        }
      }
      return item
    })
    setData(newData)
  })

  const onOpenAddOrEdit = useMemoizedFn((rowDate?: DataProps) => {
    setModalStatus(true)
    setIsEdit(true)
    setCurrentItem(rowDate)
  })

  const columns: ColumnsTypeProps[] = useMemo<ColumnsTypeProps[]>(() => {
    return [
      {
        title: t('ConfigNetworkPage.executionOrder'),
        dataKey: 'Index',
        fixed: 'left',
        width: 130,
        render: (text: any, record: any, index: any) => <>{index + 1}</>,
      },
      {
        title: 'Host',
        dataKey: 'Host',
        width: 150,
      },
      {
        title: t('ConfigNetworkPage.username'),
        dataKey: 'AuthUsername',
        width: 150,
      },
      {
        title: t('ConfigNetworkPage.password'),
        dataKey: 'AuthPassword',
        width: 150,
        render: () => <>***</>,
      },
      {
        title: t('ConfigNetworkPage.authType'),
        dataKey: 'AuthType',
        // minWidth: 120
      },
      {
        title: t('YakitTable.action'),
        dataKey: 'action',
        fixed: 'right',
        width: 128,
        render: (_, record) => {
          return (
            <div className={styles['table-action-icon']}>
              <TrashOutlined
                size={16}
                className={styles['icon-trash']}
                onClick={(e) => {
                  e.stopPropagation()
                  onRemove(record)
                }}
              />
              <PencilAltOutlined
                size={16}
                className={classNames(styles['action-icon'], {
                  [styles['action-icon-edit-disabled']]: record.Disabled,
                })}
                onClick={(e) => {
                  e.stopPropagation()
                  onOpenAddOrEdit(record)
                }}
              />
              <BanOutlined
                size={16}
                className={classNames(styles['action-icon'], {
                  [styles['action-icon-ban-disabled']]: record.Disabled,
                })}
                onClick={(e) => {
                  e.stopPropagation()
                  onBan(record)
                }}
              />
            </div>
          )
        },
      },
    ]
  }, [i18nRefresh])

  const onMoveRow = useMemoizedFn((dragIndex: number, hoverIndex: number) => {
    setData((prevRules) =>
      update(prevRules, {
        $splice: [
          [dragIndex, 1],
          [hoverIndex, 0, prevRules[dragIndex]],
        ],
      }),
    )
  })

  const onMoveRowEnd = useMemoizedFn(() => {
    // setData((prevRules) => {
    //     const newRules = prevRules.map((item, index) => ({...item, Index: index + 1}))
    //     return [...newRules]
    // })
  })

  const onSubmit = useMemoizedFn((v: DataProps) => {
    if (isEdit) {
      const newData = data.map((item) => {
        if (item.id === v.id) {
          return v
        }
        return item
      })
      setData(newData)
      success(t('YakitNotification.editSuccess'))
    } else {
      success(t('YakitNotification.addSuccess'))
      setData([v, ...data])
    }
    setModalStatus(false)
    setIsEdit(false)
  })
  return (
    <>
      <YakitDrawer
        // placement='right'
        width="max(700px, 50%)"
        closable={false}
        onClose={() => onClose()}
        open={visible}
        getContainer={getContainer}
        // mask={false}
        maskClosable={false}
        // style={{height: visible ? heightDrawer : 0}}
        rootClassName={classNames(styles['ntlm-config-drawer'])}
        styles={{ wrapper: { boxShadow: '0px -2px 4px rgba(133, 137, 158, 0.2)' } }}
        title={
          <div className={styles['heard-title']}>
            <div className={styles['title']}>{t('ConfigNetworkPage.httpAuthGlobalConfig')}</div>
            <div className={styles['table-total']}>
              {t('ConfigNetworkPage.authConfigTotal', { count: params.AuthInfos.length })}
            </div>
          </div>
        }
        extra={
          <div className={styles['heard-right-operation']}>
            <YakitButton type="primary" className={styles['button-create']} onClick={() => onCreateAuthInfo()}>
              {t('YakitButton.add_new')}
            </YakitButton>
            <YakitButton type="primary" className={styles['button-save']} onClick={() => onOk()}>
              {t('YakitButton.save')}
            </YakitButton>
            <div onClick={() => onClose()} className={styles['icon-remove']}>
              <XSolid size={12} />
            </div>
          </div>
        }
      >
        <div className={styles['ntlm-config-table']}>
          <TableVirtualResize
            isRefresh={isRefresh}
            titleHeight={42}
            isShowTitle={false}
            renderKey="id"
            data={data}
            // rowSelection={{
            //     isAll: isAllSelect,
            //     type: "checkbox",
            //     selectedRowKeys,
            //     onSelectAll: onSelectAll,
            //     onChangeCheckboxSingle: onSelectChange
            // }}
            pagination={{
              total: data.length,
              limit: 20,
              page: 1,
              onChange: () => {},
            }}
            loading={loading}
            columns={columns}
            currentSelectItem={currentItem}
            onRowClick={onRowClick}
            onMoveRow={onMoveRow}
            enableDragSort={true}
            enableDrag={true}
            onMoveRowEnd={onMoveRowEnd}
          />
        </div>
      </YakitDrawer>
      {modalStatus && (
        <NTMLConfigModal
          modalStatus={modalStatus}
          onSubmit={onSubmit}
          onClose={() => {
            setModalStatus(false)
            setIsEdit(false)
          }}
          isEdit={isEdit}
          currentItem={currentItem}
        />
      )}
    </>
  )
}

interface NTMLConfigModalProps {
  onClose: () => void
  modalStatus: boolean
  onSubmit: (v: DataProps) => void
  isEdit: boolean
  currentItem?: DataProps
}

export const NTMLConfigModal: React.FC<NTMLConfigModalProps> = (props) => {
  const { onClose, modalStatus, onSubmit, isEdit, currentItem } = props
  const { t } = useI18nNamespaces(['configNetwork', 'yakitUi'])
  const [form] = Form.useForm()

  useEffect(() => {
    if (isEdit && currentItem) {
      const { Host, AuthUsername, AuthPassword, AuthType } = currentItem
      form.setFieldsValue({
        Host,
        AuthUsername,
        AuthPassword,
        AuthType,
      })
    }
  }, [])

  const onOk = useMemoizedFn(() => {
    form.validateFields().then((value: AuthInfo) => {
      if (isEdit && currentItem) {
        onSubmit({
          ...currentItem,
          ...value,
        })
      } else {
        onSubmit({
          id: uuidv4(),
          Disabled: false,
          ...value,
        })
      }
    })
  })
  // 判断是否为IP地址 或 域名
  const judgeUrl = () => [
    {
      validator: (_, value: string) => {
        // 正则表达式匹配IPv4地址
        const ipv4RegexWithPort =
          /^(25[0-5]|2[0-4][0-9]|[0-1]?[0-9]{1,2})(\.(25[0-5]|2[0-4][0-9]|[0-1]?[0-9]{1,2})){3}(:\d+)?$/
        // 正则表达式匹配域名（支持通配符域名）
        const domainRegex = /^(\*\.|\*\*\.)?([a-zA-Z0-9-]+\.){1,}[a-zA-Z]{2,}$/
        // 匹配 CIDR 表示的 IPv4 地址范围（包含端口号）
        const cidrRegexWithPort =
          /^(25[0-5]|2[0-4][0-9]|[0-1]?[0-9]{1,2})(\.(25[0-5]|2[0-4][0-9]|[0-1]?[0-9]{1,2})){3}\/([0-2]?[0-9]|3[0-2])(:\d+)?$/
        if (ipv4RegexWithPort.test(value) || domainRegex.test(value) || cidrRegexWithPort.test(value)) {
          return Promise.resolve()
        } else {
          return Promise.reject(t('ConfigNetworkPage.invalidHost'))
        }
      },
    },
  ]
  return (
    <YakitModal
      maskClosable={false}
      title={isEdit ? t('YakitButton.edit') : t('YakitButton.add_new')}
      open={modalStatus}
      onCancel={() => onClose()}
      closable
      okType="primary"
      width={480}
      onOk={() => onOk()}
      bodyStyle={{ padding: '24px 16px' }}
    >
      <Form form={form} labelCol={{ span: 5 }} wrapperCol={{ span: 16 }} className={styles['modal-from']}>
        <Form.Item
          label="Host"
          name="Host"
          rules={[{ required: true, message: t('YakitForm.requiredField') }, ...judgeUrl()]}
        >
          <YakitInput placeholder={t('YakitInput.please_enter')} />
        </Form.Item>
        <Form.Item
          label={t('ConfigNetworkPage.username')}
          name="AuthUsername"
          rules={[{ required: true, message: t('YakitForm.requiredField') }]}
        >
          <YakitInput placeholder={t('YakitInput.please_enter')} />
        </Form.Item>
        <Form.Item
          label={t('ConfigNetworkPage.password')}
          name="AuthPassword"
          rules={[{ required: true, message: t('YakitForm.requiredField') }]}
        >
          <YakitInput placeholder={t('YakitInput.please_enter')} />
        </Form.Item>
        <Form.Item
          label={t('ConfigNetworkPage.authType')}
          name="AuthType"
          rules={[{ required: true, message: t('YakitForm.requiredField') }]}
        >
          <YakitSelect placeholder={t('YakitSelect.pleaseSelect')}>
            <YakitSelect value="ntlm">ntlm</YakitSelect>
            <YakitSelect value="any">any</YakitSelect>
            <YakitSelect value="basic">basic</YakitSelect>
            <YakitSelect value="digest">digest</YakitSelect>
          </YakitSelect>
        </Form.Item>
      </Form>
    </YakitModal>
  )
}

interface SortDataProps {
  label: string
  value: string
}
interface AISortContentProps {
  onUpdate: (v: GlobalNetworkConfig['AppConfigs']) => void
  AiApiPriority: string[]
  appConfigs: GlobalNetworkConfig['AppConfigs']
}

const getItemStyle = (isDragging, draggableStyle) => {
  let transform: string = draggableStyle['transform'] || ''
  // console.log("transform---",transform,isDragging);
  if (isDragging) {
    // 使用正则表达式匹配 translate 函数中的两个参数
    const match = transform.match(/translate\((-?\d+)px, (-?\d+)px\)/)
    if (match) {
      // 提取匹配到的两个值，并将它们转换为数字
      const [value1, value2] = match.slice(1).map(Number)
      const modifiedString = transform.replace(/translate\((-?\d+)px, (-?\d+)px\)/, `translate(0px, ${value2}px)`)
      transform = modifiedString
    }
  }

  return {
    ...draggableStyle,
    transform,
  }
}

export const AISortContent: React.FC<AISortContentProps> = (props) => {
  const { onUpdate, AiApiPriority, appConfigs } = props
  const { t } = useI18nNamespaces(['configNetwork'])
  const [sortData, setSortData] = useState<GlobalNetworkConfig['AppConfigs']>([])

  useEffect(() => {
    const aiPriority = appConfigs.filter((item) => AiApiPriority.includes(item.Type))
    setSortData(aiPriority)
  }, [appConfigs, AiApiPriority])

  const onDragEnd = useMemoizedFn((result: DropResult) => {
    const { source, destination, draggableId } = result
    if (destination) {
      const newItems: GlobalNetworkConfig['AppConfigs'] = cloneDeep(sortData)
      const [removed] = newItems.splice(source.index, 1)
      newItems.splice(destination.index, 0, removed)
      setSortData([...newItems])
      onUpdate(newItems)
    }
  })

  return (
    <div className={styles['ai-sort-content']}>
      <div className={styles['ai-sort-describe']}>{t('ConfigNetworkPage.priorityTopDown')}</div>
      <div className={styles['menu-list']}>
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="droppable-payload" direction="vertical">
            {(provided) => (
              <div ref={provided.innerRef} {...provided.droppableProps}>
                {sortData.map((item, index) => {
                  return (
                    <Draggable key={item.Type} draggableId={item.Type} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          style={{
                            ...getItemStyle(snapshot.isDragging, provided.draggableProps.style),
                          }}
                        >
                          <div
                            className={classNames(styles['menu-list-item'], {
                              [styles['menu-list-item-drag']]: snapshot.isDragging,
                            })}
                          >
                            <div className={styles['menu-list-item-info']}>
                              <FigmaIcon2281144183Solid size={12} className={styles['drag-sort-icon']} />
                              <div className={styles['title']}>{item.Type}</div>
                            </div>
                          </div>

                          {/* <div className={styles['sort-item-box']}>
                                <div className={classNames(styles["sort-item"]) } key={item.value}>{item.label}</div>
                                </div> */}
                        </div>
                      )}
                    </Draggable>
                  )
                })}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </div>
    </div>
  )
}
