import { useEffect, useRef, useState } from 'react'
import { Form } from 'antd'
import { useGetState, useMemoizedFn } from 'ahooks'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitAutoComplete, defYakitAutoCompleteRef } from '@/components/yakitUI/YakitAutoComplete/YakitAutoComplete'
import type { YakitAutoCompleteRefProps } from '@/components/yakitUI/YakitAutoComplete/YakitAutoCompleteType'
import { getRemoteValue, setRemoteValue } from '@/utils/kv'
import { getRemoteConfigBaseUrlGV, getRemoteHttpSettingGV } from '@/utils/envfile'
import { JSONParseLog } from '@/utils/tool'
import { loginOut } from '@/utils/login'
import { failed, success } from '@/utils/notification'
import { useStore } from '@/store'
import { CacheDropDownGV } from '@/yakitGV'
import emiter from '@/utils/eventBus/eventBus'
import { useUploadInfoByEnpriTrace } from '@/components/layout/utils'
import useAIGlobalConfig from '@/pages/ai-re-act/hooks/useAIGlobalConfig'
import { yakitApp, yakitAuth, yakitCodec, yakitProfile, yakitShell, yakitUILayout } from '@/services/electronBridge'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import styles from './GeneralSettings.module.scss'

interface PluginSourceProfile {
  BaseUrl: string
  Proxy: string
  user_name: string
  pwd: string
}

const formatSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + units[i]
}

export const GeneralSettings: React.FC = () => {
  const { t } = useI18nNamespaces(['setting', 'components', 'yakitUi'])
  const [form] = Form.useForm()
  const { userInfo } = useStore()
  const [uploadProjectEvent] = useUploadInfoByEnpriTrace()
  const [, aiGlobalConfigEvent] = useAIGlobalConfig()

  const [workspacePath, setWorkspacePath] = useState('')
  const [usedSpace, setUsedSpace] = useState('')
  const [calculating, setCalculating] = useState(false)
  const [defaultHttpUrl, setDefaultHttpUrl] = useState('')
  const [_, setFormValue, getFormValue] = useGetState<PluginSourceProfile>({
    BaseUrl: '',
    Proxy: '',
    user_name: '',
    pwd: '',
  })
  const savingRef = useRef(false)

  const httpHistoryRef = useRef<YakitAutoCompleteRefProps>({ ...defYakitAutoCompleteRef })
  const httpProxyRef = useRef<YakitAutoCompleteRefProps>({ ...defYakitAutoCompleteRef })

  useEffect(() => {
    yakitApp
      .getYakitHomeConfig()
      .then(async (config) => {
        const home = config.currentHome || config.YAKIT_HOME || ''
        setWorkspacePath(home)
        if (!home) return
        setCalculating(true)
        try {
          const size = await yakitApp.getDirSize(home)
          setUsedSpace(formatSize(size))
        } catch (_) {
          setUsedSpace(formatSize(0))
        } finally {
          setCalculating(false)
        }
      })
      .catch(() => {})
  }, [])

  const applyPluginSource = useMemoizedFn((value: Partial<PluginSourceProfile>) => {
    const next: PluginSourceProfile = {
      BaseUrl: value.BaseUrl || '',
      Proxy: value.Proxy || '',
      user_name: value.user_name || '',
      pwd: value.pwd || '',
    }
    setDefaultHttpUrl(next.BaseUrl)
    form.setFieldsValue(next)
    setFormValue(next)
  })

  const getHttpSetting = useMemoizedFn(() => {
    getRemoteValue(getRemoteHttpSettingGV()).then((setting) => {
      if (!setting) {
        yakitProfile
          .getOnlineProfile({})
          .then((data: any) => {
            applyPluginSource({
              BaseUrl: data.BaseUrl || '',
              Proxy: data.Proxy || '',
              user_name: data.user_name || '',
              pwd: data.pwd || data.Password || '',
            })
          })
          .catch(() => {})
        return
      }
      const value = JSONParseLog(setting, { page: 'GeneralSettings', fun: 'getHttpSetting' })
      if (value?.pwd && value.pwd.length > 0) {
        yakitCodec
          .run({ Type: 'base64-decode', Text: value.pwd, Params: [], ScriptName: '' })
          .then((res) => {
            applyPluginSource({ ...value, pwd: res.Result })
          })
          .catch(() => {
            applyPluginSource(value)
          })
        return
      }
      applyPluginSource(value)
    })
  })

  useEffect(() => {
    getHttpSetting()
  }, [])

  useEffect(() => {
    const cleanup = yakitAuth.onBaseUrlStatus(() => {
      emiter.emit('onSwitchPrivateDomain', '')
    })
    return () => {
      cleanup()
    }
  }, [])

  const onOpenDirectory = useMemoizedFn(() => {
    if (!workspacePath) return
    yakitShell.openSpecifiedFile(workspacePath).catch(() => {})
  })

  const addHttpHistoryList = useMemoizedFn((url: string) => {
    httpHistoryRef.current?.onSetRemoteValues(url)
  })
  const addProxyList = useMemoizedFn((url: string) => {
    httpProxyRef.current?.onSetRemoteValues(url)
  })

  const syncLoginOut = async () => {
    try {
      await loginOut(userInfo)
    } catch (error) {}
  }

  const judgeUrl = () => [
    {
      validator: (_, value) => {
        const re = /http(s)?:\/\/([\w-]+\.)+[\w-]+(\/[\w- .\/?%&=]*)?/
        if (!value) return Promise.resolve()
        if (/\s/.test(value)) {
          return Promise.reject(t('ConfigPrivateDomain.privateDomainHasSpace'))
        } else if (re.test(value)) {
          return Promise.resolve()
        } else {
          return Promise.reject(t('ConfigPrivateDomain.enterValidPrivateDomain'))
        }
      },
    },
  ]

  const onFinish = useMemoizedFn((v: PluginSourceProfile) => {
    const BaseUrl = v.BaseUrl.endsWith('/') ? v.BaseUrl.slice(0, -1) : v.BaseUrl
    const values = {
      ...getFormValue(),
      ...v,
      IsCompany: false,
      BaseUrl,
      Proxy: v.Proxy || '',
    }
    const prev = getFormValue()
    if (values.BaseUrl === prev.BaseUrl && values.Proxy === (prev.Proxy || '')) return
    if (savingRef.current) return
    savingRef.current = true

    yakitProfile
      .setOnlineProfile({
        ...values,
      })
      .then(() => {
        addHttpHistoryList(values.BaseUrl)
        addProxyList(values.Proxy)
        setFormValue(values)
        yakitUILayout.requestSignOut()
        success(t('ConfigPrivateDomain.privateDomainSetSuccess'))
        syncLoginOut()
        yakitAuth.editBaseUrl(values.BaseUrl).catch((err) => {
          failed(t('ConfigPrivateDomain.privateDomainSetFailed', { error: String(err) }))
        })
        if (values.pwd) {
          yakitCodec
            .run({ Type: 'base64', Text: values.pwd, Params: [], ScriptName: '' })
            .then((res) => {
              setRemoteValue(getRemoteHttpSettingGV(), JSON.stringify({ ...values, pwd: res.Result }))
            })
            .catch(() => {})
        } else {
          setRemoteValue(getRemoteHttpSettingGV(), JSON.stringify(values))
        }
        uploadProjectEvent
          .startUpload({
            isAutoUploadProject: true,
            isUpdateGlobalConfig: false,
          })
          .then(async (systemConfig) => {
            if (systemConfig?.length) {
              await aiGlobalConfigEvent.getAIGlobalConfigAfterLogin(systemConfig)
            }
          })
      })
      .catch((e: any) => {
        failed(t('ConfigPrivateDomain.privateDomainSetFailed', { error: String(e) }))
      })
      .finally(() => {
        savingRef.current = false
      })
  })

  const persistPluginSource = useMemoizedFn(() => {
    form
      .validateFields()
      .then((v) => onFinish(v))
      .catch(() => {})
  })

  return (
    <div className={styles['general']}>
      <div className={styles['general-section']}>
        <div className={styles['section-head']}>
          <div className={styles['section-title']}>{t('SettingsPage.general.workspace')}</div>
          <div className={styles['section-actions']}>
            {(calculating || usedSpace) && (
              <span className={styles['used-space']}>
                {calculating
                  ? t('SettingsPage.general.calculating')
                  : t('SettingsPage.general.usedSpace', { size: usedSpace })}
              </span>
            )}
            <YakitButton type="text" size="small" onClick={onOpenDirectory}>
              {t('SettingsPage.general.openDirectory')}
            </YakitButton>
          </div>
        </div>
        <div className={styles['workspace-path']} title={workspacePath}>
          {workspacePath}
        </div>
      </div>

      <div className={styles['general-section']}>
        <div className={styles['section-title']}>{t('SettingsPage.general.pluginSource')}</div>
        <Form form={form} size="small" onFinish={onFinish}>
          <div className={styles['list-panel']}>
            <div className={styles['setting-row']}>
              <div className={styles['setting-row-text']}>
                <div className={styles['setting-row-title']}>{t('SettingsPage.general.privateDomain')}</div>
                <div className={styles['setting-row-desc']}>{t('SettingsPage.general.required')}</div>
              </div>
              <Form.Item
                name="BaseUrl"
                className={styles['setting-row-input']}
                rules={[{ required: true, message: t('YakitForm.requiredField') }, ...judgeUrl()]}
              >
                <YakitAutoComplete
                  ref={httpHistoryRef}
                  cacheHistoryDataKey={getRemoteConfigBaseUrlGV()}
                  initValue={defaultHttpUrl}
                  placeholder={t('ConfigPrivateDomain.enterPrivateDomain')}
                  onBlur={persistPluginSource}
                  onSelect={persistPluginSource}
                />
              </Form.Item>
            </div>
            <div className={styles['setting-row']}>
              <div className={styles['setting-row-text']}>
                <div className={styles['setting-row-title']}>{t('SettingsPage.general.setProxy')}</div>
                <div className={styles['setting-row-desc']}>{t('SettingsPage.general.proxyHint')}</div>
              </div>
              <Form.Item name="Proxy" className={styles['setting-row-input']}>
                <YakitAutoComplete
                  ref={httpProxyRef}
                  cacheHistoryDataKey={CacheDropDownGV.ConfigProxy}
                  placeholder={t('ConfigPrivateDomain.setProxy')}
                  onBlur={persistPluginSource}
                  onSelect={persistPluginSource}
                />
              </Form.Item>
            </div>
          </div>
        </Form>
      </div>
    </div>
  )
}
