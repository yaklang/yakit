import React, { useEffect, useMemo, useState } from 'react'
import { Form, Upload } from 'antd'
import { useMemoizedFn } from 'ahooks'
import { info, yakitFailed, yakitNotify } from '@/utils/notification'
import { showYakitModal } from '@/components/yakitUI/YakitModal/YakitModalConfirm'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitInput } from '@/components/yakitUI/YakitInput/YakitInput'
import { YakitSpin } from '@/components/yakitUI/YakitSpin/YakitSpin'
import { InformationCircleIcon, RemoveIcon } from '@/assets/newIcon'
import classNames from 'classnames'
import { getRemoteValue, setRemoteValue } from './kv'
import { RemoteGV } from '@/yakitGV'
import styles from './ConfigSystemProxy.module.scss'
import emiter from './eventBus/eventBus'
import { APINoRequestFunc } from '@/apiUtils/type'
import { JSONParseLog } from './tool'
import { yakitHost } from '@/services/electronBridge'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import i18n from '@/i18n/i18n'

const tOriginal = i18n.getFixedT(null, 'utils')

export interface ConfigSystemProxyProp {
  defaultProxy?: string
  onClose: () => void
}

export interface GetSystemProxyResult {
  CurrentProxy: string
  Enable: boolean
}
export const apiGetSystemProxy: APINoRequestFunc<GetSystemProxyResult> = (hiddenError) => {
  return new Promise(async (resolve, reject) => {
    yakitHost
      .getSystemProxy()
      .then(resolve)
      .catch((e) => {
        if (!hiddenError)
          yakitNotify('error', tOriginal('ConfigSystemProxy.getSystemProxyFailed', { error: String(e) }))
        reject(e)
      })
  })
}

export const ConfigSystemProxy: React.FC<ConfigSystemProxyProp> = (props) => {
  const { defaultProxy, onClose } = props
  const { t, i18n } = useI18nNamespaces(['utils', 'yakitUi'])
  const [proxy, setProxy] = useState(defaultProxy ? defaultProxy : '127.0.0.1:8083')
  const [loading, setLoading] = useState(false)
  const [current, setCurrent] = useState<{
    Enable: boolean
    CurrentProxy: string
  }>({ Enable: false, CurrentProxy: '' })

  const enable = useMemo(() => {
    if (!current.Enable) return false
    if (current.CurrentProxy === proxy) return true
    return false
  }, [proxy, current])

  const update = useMemoizedFn(() => {
    setLoading(true)
    apiGetSystemProxy()
      .then((req: { CurrentProxy: string; Enable: boolean }) => {
        setCurrent(req)
        setProxy(req.CurrentProxy ? req.CurrentProxy : '127.0.0.1:8083')
      })
      .catch((e) => {
        // failed(`获取代理失败: ${e}`)
      })
      .finally(() => setTimeout(() => setLoading(false), 300))
  })
  useEffect(() => {
    update()
  }, [])

  const onSetSystemProxy = useMemoizedFn(() => {
    yakitHost
      .setSystemProxy({
        HttpProxy: proxy,
        Enable: !enable,
      })
      .then((e) => {
        info(t('ConfigSystemProxy.setSystemProxySuccess'))
        onClose()
        emiter.emit('onRefConfigSystemProxy', '')
      })
      .catch((err) => {
        yakitFailed(t('ConfigSystemProxy.setSystemProxyFailed', { error: String(err) }))
      })
  })
  return (
    <YakitSpin spinning={loading}>
      <div className={styles['config-system-proxy']}>
        <div className={styles['config-system-proxy-heard']}>
          <div className={styles['config-system-proxy-title']}>{t('ConfigSystemProxy.configSystemProxy')}</div>
          <RemoveIcon className={styles['close-icon']} onClick={() => onClose()} />
        </div>
        <div
          className={classNames(styles['config-system-proxy-status-success'], {
            [styles['config-system-proxy-status-danger']]: !current.Enable,
          })}
        >
          {t('ConfigSystemProxy.currentSystemProxyStatus')}
          <span>{current.Enable ? t('ConfigSystemProxy.enabled') : t('ConfigSystemProxy.disabled')}</span>
        </div>
        <Form layout="vertical" style={{ padding: '0 24px 24px' }}>
          <Form.Item
            label={t('ConfigSystemProxy.systemProxy')}
            help={t('ConfigSystemProxy.oneClickConfig')}
            tooltip={{
              title: t('ConfigSystemProxy.proxyHint'),
              icon: <InformationCircleIcon />,
            }}
          >
            <YakitInput
              addonBefore={proxy.includes('://') ? undefined : 'http(s)://'}
              value={proxy}
              onChange={(e) => {
                setProxy(e.target.value)
              }}
              placeholder={'127.0.0.1:8083'}
              size="large"
            />
          </Form.Item>
          <div className={styles['config-system-proxy-btns']}>
            <YakitButton type="outline2" size="large" onClick={() => onClose()}>
              {t('YakitButton.cancel')}
            </YakitButton>
            <YakitButton colors={enable ? 'danger' : 'primary'} size="large" onClick={() => onSetSystemProxy()}>
              {enable ? t('YakitButton.deactivated') : t('YakitButton.enable')}
            </YakitButton>
          </div>
        </Form>
      </div>
    </YakitSpin>
  )
}

export const showConfigSystemProxyForm = (addr?: string) => {
  const m = showYakitModal({
    title: null,
    width: 450,
    footer: null,
    closable: false,
    centered: true,
    hiddenHeader: true,
    content: (
      <>
        <ConfigSystemProxy
          defaultProxy={addr}
          onClose={() => {
            m.destroy()
          }}
        />
      </>
    ),
  })
}

interface ConfigChromePathProp {
  onClose: () => void
  submitAlreadyChromePath: (v: boolean) => void
}

export const ConfigChromePath: React.FC<ConfigChromePathProp> = (props) => {
  const { onClose, submitAlreadyChromePath } = props
  const { t, i18n } = useI18nNamespaces(['utils', 'yakitUi'])
  const [loading, setLoading] = useState<boolean>(true)
  const [chromePath, setChromePath] = useState<string>()

  useEffect(() => {
    getRemoteValue(RemoteGV.GlobalChromePath).then((setting) => {
      setLoading(false)
      if (!setting) return
      const values: string = JSONParseLog(setting, { page: 'ConfigSystemProxy' })
      setChromePath(values)
    })
  }, [])

  const onSetChromePath = useMemoizedFn(() => {
    setRemoteValue(RemoteGV.GlobalChromePath, JSON.stringify(chromePath))
    if (chromePath && chromePath.length > 0) {
      submitAlreadyChromePath(true)
    } else {
      submitAlreadyChromePath(false)
    }
    info(t('ConfigSystemProxy.setChromeStartPathSuccess'))
    onClose()
  })

  return (
    <YakitSpin spinning={loading}>
      <div className={styles['config-system-proxy']}>
        <div className={styles['config-system-proxy-heard']}>
          <div className={styles['config-system-proxy-title']}>{t('ConfigSystemProxy.chromeStartPath')}</div>
          <RemoveIcon className={styles['close-icon']} onClick={() => onClose()} />
        </div>
        <div className={classNames(styles['config-system-proxy-status-success'])}>
          {t('ConfigSystemProxy.chromeStartPathHint')}
        </div>
        <Form layout="horizontal" style={{ padding: '0 24px 24px' }}>
          <Form.Item label={t('ConfigSystemProxy.startPath')}>
            <YakitInput
              value={chromePath}
              placeholder={t('ConfigSystemProxy.selectStartPath')}
              size="large"
              onChange={(e) => setChromePath(e.target.value)}
            />
            <Upload
              multiple={false}
              maxCount={1}
              showUploadList={false}
              beforeUpload={(f) => {
                const file_name = f.name
                // @ts-ignore
                const path: string = f?.path || ''
                if (path.length > 0) {
                  setChromePath(path)
                }
                return false
              }}
            >
              <div className={styles['config-select-path']}>{t('ConfigSystemProxy.selectStartPath')}</div>
            </Upload>
          </Form.Item>
          <div className={styles['config-system-proxy-btns']}>
            <YakitButton type="outline2" size="large" onClick={() => onClose()}>
              {t('YakitButton.cancel')}
            </YakitButton>
            <YakitButton type={'primary'} size="large" onClick={() => onSetChromePath()}>
              {t('YakitButton.ok')}
            </YakitButton>
          </div>
        </Form>
      </div>
    </YakitSpin>
  )
}
export const showConfigChromePathForm = (fun) => {
  const m = showYakitModal({
    title: null,
    width: 450,
    footer: null,
    closable: false,
    centered: true,
    hiddenHeader: true,
    content: (
      <>
        <ConfigChromePath
          onClose={() => {
            m.destroy()
          }}
          submitAlreadyChromePath={fun}
        />
      </>
    ),
  })
}
