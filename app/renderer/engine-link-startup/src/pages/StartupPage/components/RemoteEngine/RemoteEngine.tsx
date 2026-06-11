import classNames from 'classnames'
import { PEMExampleProps, RemoteEngineProps, RemoteLinkInfo, YakitAuthInfo } from './RemoteEngineType'
import React, { useEffect, useState } from 'react'
import { getLocalValue, setLocalValue } from '@/utils/kv'
import { LocalGVS } from '@/enums/yakitGV'
import { useMemoizedFn } from 'ahooks'
import { getReleaseEditionName } from '@/utils/envfile'
import { YakitInput } from '@/components/yakitUI/YakitInput/YakitInput'
import { YakitPopover } from '@/components/yakitUI/YakitPopover/YakitPopover'
import { CopyComponents } from '@/components/yakitUI/YakitTag/YakitTag'
import { YakitSpin } from '@/components/yakitUI/YakitSpin/YakitSpin'
import { YakitSelect } from '@/components/yakitUI/YakitSelect/YakitSelect'
import { Divider, Form } from 'antd'
import { YakitSwitch } from '@/components/yakitUI/YakitSwitch/YakitSwitch'
import {
  OutlineArrowcirclerightIcon,
  OutlineExitIcon,
  OutlineQuestionmarkcircleIcon,
  OutlineXIcon,
} from '@/assets/outline'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { EngineModeVerbose } from '../../utils'
import { Editor } from '@/components/Editor'
import { yakitApp, yakitEngine, yakitShell } from '@/utils/electronBridge'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import styles from './RemoteEngine.module.scss'

const DefaultRemoteLink: RemoteLinkInfo = {
  allowSave: false,
  host: '127.0.0.1',
  port: '8087',
  tls: false,
}

export const RemoteEngine: React.FC<RemoteEngineProps> = React.memo((props) => {
  const { loading, setLoading, onSubmit, onSwitchLocalEngine } = props
  const { t, i18n } = useI18nNamespaces(['link'])

  /** 远程主机参数 */
  const [remote, setRemote] = useState<RemoteLinkInfo>({ ...DefaultRemoteLink })
  /** 是否进入检查状态 */
  const [isCheck, setIsCheck] = useState<boolean>(false)

  const [auths, setAuths] = useState<YakitAuthInfo[]>([])

  const [showSTL, setShowSTL] = useState<boolean>(false)
  const [showAllow, setShowAllow] = useState<boolean>(false)

  useEffect(() => {
    yakitEngine
      .getRemoteAuthAll()
      .then((e: YakitAuthInfo[]) => {
        setAuths(
          e.map((item) => {
            item.tls = !!item.tls
            return item
          }),
        )
      })
      .catch(() => {})

    getLocalValue(LocalGVS.YaklangRemoteEngineCredential).then((result: RemoteLinkInfo) => {
      try {
        if (!result?.host || !result?.port) {
          return
        }
        setRemote({ ...result })
      } catch (e) {}
    })
  }, [])

  const onSelectHistory = useMemoizedFn((name: string) => {
    const info = auths.find((item) => item.name === name)
    if (!info || !info.host || !info.port) return

    const remoteInfo: RemoteLinkInfo = {
      allowSave: true,
      linkName: info.name,
      host: info.host,
      port: `${info.port === 0 ? 0 : info.port || ''}`,
      tls: info.tls,
      caPem: info.caPem,
      password: info.password,
    }
    setRemote(remoteInfo)
  })

  const submit = useMemoizedFn(() => {
    setIsCheck(true)
    if (!remote.host) return
    if (!remote.port) return
    if (remote.tls && !remote.caPem) return
    if (remote.allowSave && !remote.linkName) return

    setLoading(true)
    if (remote.allowSave) {
      const params: YakitAuthInfo = {
        name: remote.linkName || `${remote.host}:${remote.port}`,
        host: remote.host,
        port: +remote.port || 0,
        tls: remote.tls,
        caPem: remote.caPem || '',
        password: remote.password || '',
      }
      const index = auths.findIndex((item) => item.host === params.host && item.port === params.port)
      if (index === -1) setAuths((arr) => arr.concat([params]))
      yakitEngine
        .saveRemoteAuth({ ...params })
        .then(() => {})
        .catch(() => {})
    }

    setLocalValue(LocalGVS.YaklangRemoteEngineCredential, { ...remote })
    onSubmit({ ...remote })
  })

  // 返回到软件初始化界面
  const handleSwitchLocalEngine = useMemoizedFn(() => {
    setRemote({ ...DefaultRemoteLink })
    setIsCheck(false)
    onSwitchLocalEngine()
  })

  // 删除指定远程历史记录
  const delRemoteHistoryItem = useMemoizedFn((authItem: YakitAuthInfo) => {
    setAuths((prev) => prev.filter((item) => item.name !== authItem.name))
    yakitEngine
      .removeRemoteAuth(authItem.name)
      .then(() => {})
      .catch(() => {})
  })

  return (
    <div className={styles['remote-engine-wrapper']}>
      <YakitSpin spinning={loading}>
        <div className={styles['remote-yaklang-engine-body']}>
          <div className={styles['remote-title']}>{t('RemoteEngine.remote_mode')}</div>
          <div className={styles['remote-history']}>
            <div className={styles['select-title']} style={{ width: i18n.language === 'en' ? 180 : 80 }}>
              {t('RemoteEngine.connection_history')}
            </div>
            <YakitSelect
              wrapperClassName={styles['select-style']}
              placeholder={t('RemoteEngine.select_placeholder')}
              onSelect={onSelectHistory}
              size="middle"
              optionLabelProp="value"
              allowClear
              options={auths.map((item) => {
                return {
                  label: (
                    <div className={styles['remote-history-label-wrapper']}>
                      <div className={styles['remote-history-label']}>{item.name}</div>
                      <OutlineXIcon
                        className={styles['option-item-close']}
                        onClick={(e) => {
                          e.stopPropagation()
                          delRemoteHistoryItem(item)
                        }}
                      />
                    </div>
                  ),
                  value: item.name,
                }
              })}
            ></YakitSelect>
          </div>
          <div className={styles['divider-line']}></div>
          <div className={styles['remote-info']}>
            <Form colon={false} requiredMark={false} layout="vertical">
              <div className={styles['form-item-inline']}>
                <Form.Item
                  label={
                    <div className={styles.requiredLabel}>
                      Yak gRPC {t('RemoteEngine.grpc_host_label')}
                      <span className={styles.redStar}>*</span>
                    </div>
                  }
                  required={true}
                  style={{ flex: 1 }}
                >
                  <YakitInput
                    className={classNames({
                      [styles['error-border']]: isCheck && !remote.host,
                    })}
                    value={remote.host}
                    onChange={(e) => setRemote({ ...remote, host: e.target.value })}
                  />
                </Form.Item>

                <Form.Item
                  label={
                    <div className={styles.requiredLabel}>
                      Yak gRPC {t('RemoteEngine.grpc_port_label')}
                      <span className={styles.redStar}>*</span>
                    </div>
                  }
                  required={true}
                  style={{ flex: 1 }}
                >
                  <YakitInput
                    className={classNames({
                      [styles['error-border']]: isCheck && !remote.port,
                    })}
                    value={remote.port}
                    onChange={(e) => setRemote({ ...remote, port: e.target.value })}
                  />
                </Form.Item>
              </div>

              <Form.Item label={t('RemoteEngine.enable_tls')}>
                <YakitSwitch size="middle" checked={remote.tls} onChange={(tls) => setRemote({ ...remote, tls })} />
              </Form.Item>
              {remote.tls && (
                <>
                  <Form.Item
                    label={
                      <div className={styles['pem-title']}>
                        {t('RemoteEngine.grpc_root_ca_pem')}
                        <span className={styles.redStar}>*</span>{' '}
                        <PEMExample setShow={setShowSTL}>
                          <OutlineQuestionmarkcircleIcon
                            className={showSTL ? styles['icon-show-style'] : styles['icon-style']}
                          />
                        </PEMExample>
                        :
                      </div>
                    }
                    required={true}
                  >
                    <div
                      className={classNames(styles['pem-content'], {
                        [styles['error-border']]: isCheck && !remote.caPem,
                      })}
                    >
                      <Editor
                        language={'pem'}
                        value={remote.caPem}
                        onSetValue={(caPem) => setRemote({ ...remote, caPem })}
                      />
                    </div>
                  </Form.Item>
                  <Form.Item label={t('RemoteEngine.password')}>
                    <YakitInput
                      className={styles['input-style']}
                      value={remote.password}
                      onChange={(e) => setRemote({ ...remote, password: e.target.value })}
                    />
                  </Form.Item>
                </>
              )}
              <Form.Item
                label={
                  <div className={styles['pem-title']}>
                    {t('RemoteEngine.save_as_history')}{' '}
                    <PEMHint setShow={setShowAllow}>
                      <OutlineQuestionmarkcircleIcon
                        className={classNames(styles['icon-style'], {
                          [styles['icon-show-style']]: showAllow,
                        })}
                      />
                    </PEMHint>
                    :
                  </div>
                }
              >
                <YakitSwitch
                  size="middle"
                  checked={remote.allowSave}
                  onChange={(allowSave: boolean) => setRemote({ ...remote, allowSave })}
                />
              </Form.Item>
              {remote.allowSave && (
                <Form.Item
                  label={
                    <div className={styles.requiredLabel}>
                      {t('RemoteEngine.link_name')}
                      <span className={styles.redStar}>*</span>
                    </div>
                  }
                  required={true}
                  help={t('RemoteEngine.link_name_help')}
                >
                  <YakitInput
                    className={classNames(styles['input-style'], {
                      [styles['error-border']]: isCheck && !remote.linkName,
                    })}
                    value={remote.linkName}
                    onChange={(e) => setRemote({ ...remote, linkName: e.target.value })}
                  />
                </Form.Item>
              )}
              <Form.Item label="">
                <YakitButton size="large" onClick={submit} className={styles['btn-style']}>
                  {t('RemoteEngine.start_connect')}
                </YakitButton>
              </Form.Item>
            </Form>
          </div>
          <div className={styles['footer-btn']}>
            <span className={styles['exit-btn']} onClick={() => yakitApp.closeWindow()}>
              <OutlineExitIcon className={styles['exit-icon']} />
              {t('RemoteEngine.exit')}
            </span>
            <Divider type="vertical"></Divider>
            <span
              className={classNames(styles['go-local'], {
                [styles['go-local-disable']]: loading,
              })}
              onClick={() => {
                if (loading) return
                handleSwitchLocalEngine()
              }}
            >
              {EngineModeVerbose('local')}
              <OutlineArrowcirclerightIcon className={styles['arrow-circle-right-icon']} />
            </span>
          </div>
        </div>
      </YakitSpin>
    </div>
  )
})

/** PEM证书示例 */
const PemPlaceHolder = `-----BEGIN CERTIFICATE-----
MIIDDjCCAfagAwIBAgIQdtJUoUlZeG+SAmgFo8TjpzANBgkqhkiG9w0BAQsFADAg
MR4wHAYDVQQDExVZYWtpdCBUZWFtU2VydmVyIFJvb3QwIBcNOTkxMjMxMTYwMDAw
WhgPMjEyMDA3MjkxMzIxMjJaMCAxHjAcBgNVBAMTFVlha2l0IFRlYW1TZXJ2ZXIg
Um9vdDCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBAMBs74NyAc38Srpy
j/rxFP4IICXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXZweuZ/nfV2
yj/9ECvP495b863Dxj/Lc+OfUO7sUILi7fRH3h201JFAqdQ0vtDsHwJI6HrLExst
hyKdO7gFPvht5orIXE5a4GLotoV1m1zh+T19NwZPGR7dkHN9U9WPlrPosl4lFNUI
EiGjjTexoYYfEpp8ROSLLTBRIio8zTzOW1TgNUeGDhjpD4Guys1YMaLX3nzbX6az
YkImVaZYkXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXZlocoTjglw2
P4XpcL0CAwEAAaXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXEB/wQFMAMBAf8w
HQYDVR0OBBYEFFdzdAPrxAja7GXXXXXXXXXXXXXXXXXXXXqGSIb3DQEBCwUAA4IB
AQCdc9dS0E0m4HLwUCCKAXXXXXXXXXXXXXXXXXXXXXXX1222222222oJ2iU3dzd6
PAXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXae5a11129ateQEHPJ0JhdlsbqQ
FyTuYOijovSFVNuLuFj3WHrFOp5gY7Pl0V7lPHSiOAjVG4mg8PGGKivwyyv23nw+
Mx5C8WSoRFWx5H0afXDHptF4rq5bI/djg04VM5ibI5GJ3i1EybBpbGj3rRBY+sF9
FRmP2Nx+zifhMNe300xfHzqNeN3D+Uix6+GOkBoYI65KNPGqwi8uy9HlJVx3Jkht
WOG+9PGLcr4IRJx5LUEZ5FB1
-----END CERTIFICATE-----`

/** @name PEM示例弹窗 */
const PEMExample: React.FC<PEMExampleProps> = React.memo((props) => {
  const { children, setShow } = props
  const { t } = useI18nNamespaces(['link'])

  const content = (
    <div className={classNames(styles['pem-example'], styles['pem-wrapper'])}>
      <div className={styles['title-style']}>{t('RemoteEngine.pem_format_required')}</div>
      {t('RemoteEngine.pem_tls_hint_prefix')} <div className={styles['content-code']}>yak grpc --tls</div>
      {t('RemoteEngine.pem_tls_hint_suffix')}
      <br />
      {t('RemoteEngine.pem_example_intro')}
      <br />
      <div className={styles['code-pem']}>
        <Editor language="plaintext" readOnly={true} value={PemPlaceHolder} />
      </div>
    </div>
  )

  return (
    <YakitPopover
      classNames={{ root: styles['pem-example-popover'] }}
      content={content}
      onOpenChange={(visible) => {
        if (setShow) setShow(visible)
      }}
    >
      {children}
    </YakitPopover>
  )
})
/** @name PEM说明弹窗 */
const PEMHint: React.FC<PEMExampleProps> = React.memo((props) => {
  const { children, setShow } = props
  const { t } = useI18nNamespaces(['link'])

  const [remotePath, setRemotePath] = useState<string>('')
  useEffect(() => {
    yakitShell
      .getRemoteFilePath()
      .then((path: string) => {
        setRemotePath(path)
      })
      .catch(() => {})
  }, [])

  const openFile = () => {
    yakitShell.openRemoteLink()
  }

  const content = (
    <div className={classNames(styles['pem-hint'], styles['pem-wrapper'])}>
      {t('RemoteEngine.history_not_uploaded', { name: getReleaseEditionName() })}
      <br />
      {t('RemoteEngine.find_remote_login_locally')}
      <br />
      <div className={styles['path-wrapper']}>
        <div className={styles['link-wrapper']}>
          <div className={classNames(styles['copt-text'], 'yakit-content-single-ellipsis')} title={remotePath}>
            {remotePath}
          </div>
          <CopyComponents className={styles['copy-icon']} copyText={remotePath} />
        </div>
        <div className={styles['link-open']} onClick={openFile}>
          {t('RemoteEngine.open_remote_info_storage')}
        </div>
      </div>
    </div>
  )

  return (
    <YakitPopover
      classNames={{ root: styles['pem-example-popover'] }}
      content={content}
      onOpenChange={(visible) => {
        if (setShow) setShow(visible)
      }}
    >
      {children}
    </YakitPopover>
  )
})
