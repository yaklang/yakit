import type React from 'react'
import { useEffect, useState } from 'react'
import { Modal } from 'antd'
import { ExclamationCircleOutlined, GithubOutlined, RightOutlined, WechatOutlined } from '@ant-design/icons'
import { failed } from '@/utils/notification'
import './Login.scss'
import { NetWorkApi } from '@/services/fetch'
import { ConfigPrivateDomain } from '@/components/ConfigPrivateDomain/ConfigPrivateDomain'
import { isEnterpriseEdition } from '@/utils/envfile'
import { apiDownloadPluginMine } from './plugins/utils'
import { YakitModalConfirm } from '@/components/yakitUI/YakitModal/YakitModalConfirm'
import { YakitModal } from '@/components/yakitUI/YakitModal/YakitModal'
import { YakitSpin } from '@/components/yakitUI/YakitSpin/YakitSpin'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { yakitAuth } from '@/services/electronBridge'

export interface LoginProp {
  visible: boolean
  onCancel: () => any
}

interface LoginParamsProp {
  source: string
}

const Login: React.FC<LoginProp> = (props) => {
  const { t, i18n } = useI18nNamespaces(['core'])
  const [loading, setLoading] = useState<boolean>(false)
  const fetchLogin = (type: string) => {
    setLoading(true)
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
        failed(t('Login.loginError', { error: err }))
      })
      .finally(() => {
        setTimeout(() => setLoading(false), 200)
      })
  }
  // 全局监听登录状态
  useEffect(() => {
    if (isEnterpriseEdition()) return
    const cleanup = yakitAuth.onSignInData((res: any) => {
      const { ok, info } = res
      if (ok) {
        const m = YakitModalConfirm({
          type: 'white',
          title: (modalT) => modalT('Login.dataSync'),
          icon: <ExclamationCircleOutlined />,
          content: (modalT) => modalT('Login.syncDataConfirm'),
          onOk() {
            apiDownloadPluginMine()
            setTimeout(() => setLoading(false), 200)
            props.onCancel()
            m.destroy()
          },
          onCancel() {
            setTimeout(() => setLoading(false), 200)
            props.onCancel()
            m.destroy()
          },
        })
      } else {
        failed(info)
        setTimeout(() => setLoading(false), 200)
        props.onCancel()
      }
    })
    return () => {
      cleanup()
    }
  }, [])
  if (isEnterpriseEdition()) {
    return (
      <YakitModal
        open={props.visible}
        title=""
        type="white"
        footer={null}
        headerStyle={{ position: 'absolute', top: 0, right: 0, width: 'auto', zIndex: 1 }}
        bodyStyle={{ padding: 0 }}
        maskClosable={false}
        destroyOnHidden={true}
        width={i18n.language.startsWith('zh') ? 500 : 650}
        onCancel={props.onCancel}
      >
        <ConfigPrivateDomain onClose={props.onCancel} enterpriseLogin={true} />
      </YakitModal>
    )
  }
  return (
    <Modal
      open={props.visible}
      keyboard={false}
      closable={false}
      footer={null}
      onCancel={() => props.onCancel()}
      styles={{ body: { padding: 0 } }}
      width={409}
      style={{ top: '25%' }}
    >
      <YakitSpin spinning={loading}>
        <div className="login-type-body">
          <h2 className="login-text">{t('Login.login')}</h2>
          <div className="login-icon-body">
            {/*<div className='login-icon' onClick={() => githubAuth()}>*/}
            <div className="login-icon" onClick={() => fetchLogin('github')}>
              <div className="login-icon-text">
                <GithubOutlined className="type-icon" />
                {t('Login.loginWithGithub')}
              </div>
              <RightOutlined className="icon-right" />
            </div>
            <div className="login-icon" onClick={() => fetchLogin('wechat')}>
              <div className="login-icon-text">
                <WechatOutlined className="type-icon icon-wx" />
                {t('Login.loginWithWechat')}
              </div>
              <RightOutlined className="icon-right" />
            </div>
          </div>
        </div>
      </YakitSpin>
    </Modal>
  )
}

export default Login
