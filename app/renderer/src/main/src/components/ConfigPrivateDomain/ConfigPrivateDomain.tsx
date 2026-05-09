import React, { useEffect, useState, useRef, useMemo } from 'react'
import { Form, Tooltip } from 'antd'
import './ConfigPrivateDomain.scss'
import { NetWorkApi } from '@/services/fetch'
import { failed, success } from '@/utils/notification'
import { loginOut } from '@/utils/login'
import { useMemoizedFn, useGetState } from 'ahooks'
import { getRemoteValue, setRemoteValue } from '@/utils/kv'
import { useStore } from '@/store'
import yakitImg from '@/assets/yakit.jpg'
import { API } from '@/services/swagger/resposeType'
import { YakitButton } from '../yakitUI/YakitButton/YakitButton'
import { YakitAutoComplete, defYakitAutoCompleteRef } from '../yakitUI/YakitAutoComplete/YakitAutoComplete'
import { YakitInput } from '../yakitUI/YakitInput/YakitInput'
import { InformationCircleIcon } from '@/assets/newIcon'
import { CacheDropDownGV } from '@/yakitGV'
import emiter from '@/utils/eventBus/eventBus'
import { YakitAutoCompleteRefProps } from '../yakitUI/YakitAutoComplete/YakitAutoCompleteType'
import { getRemoteConfigBaseUrlGV, getRemoteHttpSettingGV, isEnpriTrace } from '@/utils/envfile'
import { useUploadInfoByEnpriTrace } from '../layout/utils'
import { JSONParseLog } from '@/utils/tool'
import { yakitApp, yakitAuth, yakitCodec, yakitProfile, yakitUILayout } from '@/services/electronBridge'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { RightOutlined } from '@ant-design/icons'
import { LoginParamsProp } from '@/pages/Login'
import { YakitSpin } from '../yakitUI/YakitSpin/YakitSpin'

interface OnlineProfileProps {
  BaseUrl: string
  Proxy: string
  user_name: string
  pwd: string
}

const layout = {
  labelCol: { span: 7 },
  wrapperCol: { span: 17 },
}

interface ConfigPrivateDomainProps {
  onClose?: () => void
  onSuccee?: () => void
  // 是否为企业登录
  enterpriseLogin?: boolean | undefined
  // 是否展示跳过
  skipShow?: boolean
}

export const ConfigPrivateDomain: React.FC<ConfigPrivateDomainProps> = React.memo((props) => {
  const { onClose, onSuccee, enterpriseLogin = false, skipShow = false } = props
  const { t } = useI18nNamespaces(['components', 'yakitUi'])
  const [form] = Form.useForm()
  const [loading, setLoading] = useState<boolean>(false)
  const httpHistoryRef: React.MutableRefObject<YakitAutoCompleteRefProps> = useRef<YakitAutoCompleteRefProps>({
    ...defYakitAutoCompleteRef,
  })
  const [defaultHttpUrl, setDefaultHttpUrl] = useState<string>('')
  const httpProxyRef: React.MutableRefObject<YakitAutoCompleteRefProps> = useRef<YakitAutoCompleteRefProps>({
    ...defYakitAutoCompleteRef,
  })
  const [formValue, setFormValue, getFormValue] = useGetState<OnlineProfileProps>({
    BaseUrl: '',
    Proxy: '',
    user_name: '',
    pwd: '',
  })
  const [isShowSkip, setShowSkip] = useState<boolean>(false)
  const [isShowCCB, setShowCCB] = useState<boolean>(true)
  useEffect(() => {
    getHttpSetting()
  }, [])
  // 全局监听登录状态
  const { userInfo, setStoreUserInfo } = useStore()

  const syncLoginOut = async () => {
    try {
      await loginOut(userInfo)
    } catch (error) {}
  }
  // 企业登录
  const [uploadProjectEvent] = useUploadInfoByEnpriTrace()
  const loginUser = useMemoizedFn(() => {
    const { user_name, pwd } = getFormValue()
    NetWorkApi<API.UrmLoginRequest, API.UserData>({
      method: 'post',
      url: 'urm/login',
      data: {
        user_name: user_name.trim(),
        pwd,
      },
    })
      .then((res: API.UserData) => {
        yakitAuth.companySignIn({ ...res }).then((data) => {
          const user = {
            isLogin: true,
            platform: res.from_platform,
            githubName: res.from_platform === 'github' ? res.name : null,
            githubHeadImg: res.from_platform === 'github' ? res.head_img : null,
            wechatName: res.from_platform === 'wechat' ? res.name : null,
            wechatHeadImg: res.from_platform === 'wechat' ? res.head_img : null,
            qqName: res.from_platform === 'qq' ? res.name : null,
            qqHeadImg: res.from_platform === 'qq' ? res.head_img : null,
            companyName: ['company', 'ccb'].includes(res.from_platform) ? res.name : null,
            companyHeadImg: ['company', 'ccb'].includes(res.from_platform) ? res.head_img : null,
            role: res.role,
            user_id: res.user_id,
            token: res.token,
          }
          setStoreUserInfo(user)
          if (data?.next) {
            success(t('ConfigPrivateDomain.enterpriseLoginSuccess'))
            onClose && onClose()
            onSuccee && onSuccee()
            uploadProjectEvent.startUpload({
              isUploadSyncData: true,
              isUpdateGlobalConfig: enterpriseLogin,
            })
          }
          // 首次登录强制修改密码 非原生系统登录时不强制修改
          if (!res.loginTime && res.from_platform === 'company') {
            yakitAuth.requestPasswordReset()
          }
        })
      })
      .catch((err) => {
        setTimeout(() => setLoading(false), 300)
        failed(t('ConfigPrivateDomain.enterpriseLoginFailed', { error: String(err) }))
        if (typeof err === 'string' && skipShow && (err.includes('密码不正确') || err.includes('用户不存在'))) {
          return
        }
        setShowSkip(true)
      })
      .finally(() => {})
  })

  const onFinish = useMemoizedFn((v: OnlineProfileProps) => {
    setLoading(true)
    const BaseUrl = v.BaseUrl.endsWith('/') ? v.BaseUrl.slice(0, -1) : v.BaseUrl
    const values = {
      ...formValue,
      ...v,
      IsCompany: enterpriseLogin,
      BaseUrl,
    }
    yakitProfile
      .setOnlineProfile({
        ...values,
      })
      .then((data) => {
        addHttpHistoryList(values.BaseUrl)
        addProxyList(values.Proxy)
        setFormValue(values)
        if (!enterpriseLogin) {
          yakitUILayout.requestSignOut()
          success(t('ConfigPrivateDomain.privateDomainSetSuccess'))
          syncLoginOut()
          onClose && onClose()
        }
        yakitAuth.editBaseUrl(values.BaseUrl).catch((err) => {
          failed(t('ConfigPrivateDomain.privateDomainSetFailed', { error: String(err) }))
          setShowSkip(true)
        })
        if (v?.pwd) {
          // 加密
          yakitCodec
            .run({ Type: 'base64', Text: v.pwd, Params: [], ScriptName: '' })
            .then((res) => {
              setRemoteValue(getRemoteHttpSettingGV(), JSON.stringify({ ...values, pwd: res.Result }))
            })
            .catch(() => {})
        } else {
          setRemoteValue(getRemoteHttpSettingGV(), JSON.stringify(values))
        }

        uploadProjectEvent.startUpload({
          isUpdateGlobalConfig: enterpriseLogin,
        })
      })
      .catch((e: any) => {
        // !enterpriseLogin && setTimeout(() => setLoading(false), 300)
        failed(t('ConfigPrivateDomain.privateDomainSetFailed', { error: String(e) }))
      })
      .finally(() => {
        setTimeout(() => setLoading(false), 300)
      })
  })
  useEffect(() => {
    const cleanup = yakitAuth.onBaseUrlStatus((res: any) => {
      enterpriseLogin && loginUser()
      emiter.emit('onSwitchPrivateDomain', '') // 修改私有域成功后发送的信号
    })
    return () => {
      cleanup()
    }
  }, [])
  const addHttpHistoryList = useMemoizedFn((url) => {
    httpHistoryRef.current.onSetRemoteValues(url)
  })
  const getHttpSetting = useMemoizedFn(() => {
    getRemoteValue(getRemoteHttpSettingGV()).then((setting) => {
      if (!setting) return
      const value = JSONParseLog(setting, { page: 'ConfigPrivateDomain', fun: 'getHttpSetting' })
      setDefaultHttpUrl(value.BaseUrl)
      if (value?.pwd && value.pwd.length > 0) {
        // 解密
        yakitCodec
          .run({ Type: 'base64-decode', Text: value.pwd, Params: [], ScriptName: '' })
          .then((res) => {
            form.setFieldsValue({
              ...value,
              pwd: res.Result,
            })
            setFormValue({ ...value, pwd: res.Result })
          })
          .catch(() => {})
      } else {
        form.setFieldsValue({
          ...value,
        })
        setFormValue({ ...value })
      }
    })
  })
  /**@description 增加代理list历史 */
  const addProxyList = useMemoizedFn((url) => {
    httpProxyRef.current.onSetRemoteValues(url)
  })
  // 判断输入内容是否通过
  const judgePass = () => [
    {
      validator: (_, value) => {
        let re =
          /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[.<>?;:\[\]{}~!@#$%^&*()_+-="])[A-Za-z\d.<>?;:\[\]{}~!@#$%^&*()_+-="]{8,20}/
        if (re.test(value)) {
          return Promise.resolve()
        } else {
          return Promise.reject(t('ConfigPrivateDomain.passwordRules'))
        }
      },
    },
  ]
  // 判断是否为网址
  const judgeUrl = () => [
    {
      validator: (_, value) => {
        let re = /http(s)?:\/\/([\w-]+\.)+[\w-]+(\/[\w- .\/?%&=]*)?/
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

  const fetchLogin = (type: string) => {
    if (type === 'ccb') {
      form.validateFields().then((v) => {
        const BaseUrl = v.BaseUrl.endsWith('/') ? v.BaseUrl.slice(0, -1) : v.BaseUrl
        yakitProfile
          .setOnlineProfile({
            IsCompany: enterpriseLogin,
            BaseUrl,
          })
          .then(() => {
            yakitApp.syncEditBaseUrl(BaseUrl)
            addHttpHistoryList(BaseUrl)
            setLoading(true)
            // CCB 登录逻辑
            NetWorkApi<LoginParamsProp, string>({
              method: 'get',
              url: 'auth/from',
              params: {
                source: type,
              },
            })
              .then((res) => {
                if (res) yakitAuth.startUserSignIn({ url: res, type })
              })
              .catch((err) => {
                failed('登录错误:' + err)
              })
              .finally(() => {
                setTimeout(() => setLoading(false), 200)
              })
          })
      })
    }
  }

  // 登录成功
  const onLoginSuccess = useMemoizedFn(() => {
    success('企业登录成功')
    onClose && onClose()
    onSuccee && onSuccee()
    uploadProjectEvent.startUpload({
      isUploadSyncData: true,
      isUpdateGlobalConfig: enterpriseLogin,
    })
  })

  // 全局监听登录状态
  useEffect(() => {
    const cleanup = yakitAuth.onSignCCBInData((res: any) => {
      const { ok, info } = res
      if (ok) {
        onLoginSuccess()
      } else {
        failed(info)
      }
    })
    return () => {
      cleanup()
    }
  }, [])

  const loginContentDom = useMemo(() => {
    // 企业版登录
    if (enterpriseLogin) {
      return isShowCCB ? (
        <>
          <YakitSpin spinning={loading}>
            <div className="login-title-show">
              <div className="icon-box">
                <img src={yakitImg} className="type-icon-img" />
              </div>
              <div className="title-box">{t('ConfigPrivateDomain.enterpriseLogin')}</div>
            </div>
            <Form {...layout} form={form} size="small">
              <Form.Item
                name="BaseUrl"
                label={t('ConfigPrivateDomain.privateDomainAddress')}
                rules={[{ required: true, message: t('YakitForm.requiredField') }, ...judgeUrl()]}
              >
                <YakitAutoComplete
                  ref={httpHistoryRef}
                  cacheHistoryDataKey={getRemoteConfigBaseUrlGV()}
                  initValue={defaultHttpUrl}
                  placeholder={t('ConfigPrivateDomain.enterPrivateDomain')}
                  defaultOpen={!enterpriseLogin}
                />
              </Form.Item>
            </Form>
            <div className="login-switch-box">
              <div className="login-icon" onClick={() => fetchLogin('ccb')}>
                <div className="login-icon-text">{t('ConfigPrivateDomain.useCCBAccountLogin')}</div>
                <RightOutlined className="icon-right" />
              </div>
              <YakitButton
                size="max"
                type="outline2"
                onClick={() => {
                  setShowCCB(!isShowCCB)
                }}
              >
                {t('ConfigPrivateDomain.switchLoginMethod')}
              </YakitButton>
            </div>
          </YakitSpin>
        </>
      ) : (
        <>
          <div className="login-title-show">
            <div className="icon-box">
              <img src={yakitImg} className="type-icon-img" />
            </div>
            <div className="title-box">{t('ConfigPrivateDomain.enterpriseLogin')}</div>
          </div>
          <Form {...layout} form={form} name="control-hooks" onFinish={(v) => onFinish(v)} size="small">
            <Form.Item
              name="BaseUrl"
              label={t('ConfigPrivateDomain.privateDomainAddress')}
              rules={[{ required: true, message: t('YakitForm.requiredField') }, ...judgeUrl()]}
            >
              <YakitAutoComplete
                ref={httpHistoryRef}
                cacheHistoryDataKey={getRemoteConfigBaseUrlGV()}
                initValue={defaultHttpUrl}
                placeholder={t('ConfigPrivateDomain.enterPrivateDomain')}
                defaultOpen={!enterpriseLogin}
              />
            </Form.Item>
            <Form.Item
              name="user_name"
              label={t('ConfigPrivateDomain.username')}
              rules={[{ required: true, message: t('YakitForm.requiredField') }]}
            >
              <YakitInput placeholder={t('ConfigPrivateDomain.enterUsername')} allowClear />
            </Form.Item>
            <Form.Item
              name="pwd"
              label={t('ConfigPrivateDomain.password')}
              rules={[{ required: true, message: t('YakitForm.requiredField') }, ...judgePass()]}
            >
              <YakitInput.Password placeholder={t('ConfigPrivateDomain.enterPassword')} allowClear />
            </Form.Item>
            <Form.Item label={' '} colon={false} className="form-item-submit">
              {isShowSkip && (
                <YakitButton
                  style={{ width: 165, marginRight: 12 }}
                  onClick={() => {
                    onSuccee && onSuccee()
                  }}
                  size="large"
                >
                  {t('YakitButton.skip')}
                </YakitButton>
              )}
              <YakitButton
                size="large"
                type="primary"
                htmlType="submit"
                style={{ width: 165, marginLeft: isShowSkip ? 0 : 43 }}
                loading={loading}
              >
                {t('YakitButton.login')}
              </YakitButton>
            </Form.Item>
          </Form>
          <div className="login-switch-box">
            <YakitButton
              size="max"
              type="outline2"
              onClick={() => {
                setShowCCB(!isShowCCB)
              }}
            >
              {t('ConfigPrivateDomain.switchLoginMethod')}
            </YakitButton>
          </div>
        </>
      )
    } else {
      return (
        <Form {...layout} form={form} name="control-hooks" onFinish={(v) => onFinish(v)} size="small">
          <Form.Item
            name="BaseUrl"
            label={t('ConfigPrivateDomain.privateDomainAddress')}
            rules={[{ required: true, message: t('YakitForm.requiredField') }, ...judgeUrl()]}
          >
            <YakitAutoComplete
              ref={httpHistoryRef}
              cacheHistoryDataKey={getRemoteConfigBaseUrlGV()}
              initValue={defaultHttpUrl}
              placeholder={t('ConfigPrivateDomain.enterPrivateDomain')}
              defaultOpen={!enterpriseLogin}
            />
          </Form.Item>
          <Form.Item
            name="Proxy"
            label={
              <span className="form-label">
                {t('ConfigPrivateDomain.setProxy')}
                <Tooltip title={t('ConfigPrivateDomain.proxyHelp')} overlayStyle={{ width: 150 }}>
                  <InformationCircleIcon className="info-icon" />
                </Tooltip>
              </span>
            }
          >
            <YakitAutoComplete
              ref={httpProxyRef}
              cacheHistoryDataKey={CacheDropDownGV.ConfigProxy}
              placeholder={t('ConfigPrivateDomain.setProxy')}
            />
          </Form.Item>
          <div className="form-btns">
            <YakitButton type="outline2" onClick={(e) => onClose && onClose()}>
              {t('YakitButton.cancel')}
            </YakitButton>
            <YakitButton type="primary" htmlType="submit" loading={loading}>
              {t('YakitButton.ok')}
            </YakitButton>
          </div>
        </Form>
      )
    }
  }, [enterpriseLogin, defaultHttpUrl, form, isShowSkip, loading, isShowCCB, onClose, onFinish, onSuccee])

  return <div className="private-domain">{loginContentDom}</div>
})
