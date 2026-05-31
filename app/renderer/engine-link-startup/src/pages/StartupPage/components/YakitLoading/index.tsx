import React, { useEffect, useMemo, useState } from 'react'
import { Checkbox, Divider, Form, Tooltip } from 'antd'
import { getLocalValue, setLocalValue } from '@/utils/kv'
import { OutlineArrowcirclerightIcon, OutlineExitIcon, OutlineQuestionmarkcircleIcon } from '@/assets/outline'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitInput } from '@/components/yakitUI/YakitInput/YakitInput'
import { LoadingClickExtra, ModalIsTop, System, YakitStatusType, YaklangEngineMode } from '../../types'
import { useDebounceEffect, useMemoizedFn } from 'ahooks'
import { AgreementContentModal } from '../AgreementContentModal'
import { LocalGVS } from '@/enums/yakitGV'
import { grpcOpenYaklangPath } from '../../grpc'
import { openABSFileLocated } from '@/utils/openWebsite'
import { YakitDropdownMenu } from '@/components/yakitUI/YakitDropdownMenu/YakitDropdownMenu'
import { YakitSpin } from '@/components/yakitUI/YakitSpin/YakitSpin'
import { SoftwareBasics, SoftwareBasicsProps } from '../SoftwareBasics'
import { yakitApp } from '@/utils/electronBridge'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'

import classNames from 'classnames'
import styles from './YakitLoading.module.scss'
export interface YakitLoadingProp extends SoftwareBasicsProps {
  /** loading 文案 */
  yakitLoadingTip: string
  /** 界面暂时无法操作 */
  disableYakitLoading: boolean

  isTop: ModalIsTop
  setIsTop: (top: ModalIsTop) => void

  /** 操作系统 */
  system: System
  /** 内置引擎版本号 */
  buildInEngineVersion: string
  /** yakit模式 */
  yakitStatus: YakitStatusType
  /** 引擎模式 */
  engineMode: YaklangEngineMode

  /** 软件检查日志 */
  checkLog: string[]

  /** 手动重连引擎时的按钮loading */
  restartLoading: boolean

  /** 数据库修复失败时，数据库路径 */
  dbPath: string[]

  /** 当前连接端口号 */
  port: number

  /** 倒计时秒数 */
  countdown?: number

  btnClickCallback: (type: YaklangEngineMode | YakitStatusType, extra?: LoadingClickExtra) => void
}

export const YakitLoading: React.FC<YakitLoadingProp> = (props) => {
  const {
    yakitLoadingTip,
    disableYakitLoading,
    isTop,
    setIsTop,
    system,
    buildInEngineVersion,
    yakitStatus,
    engineMode,
    restartLoading,
    btnClickCallback,
    checkLog,
    dbPath,
    port,
    countdown = 0,
    softTheme,
    setSoftTheme,
    softMode,
    setSoftMode,
    softLang,
    setSoftLang,
  } = props

  const { t, i18n } = useI18nNamespaces(['startup'])

  const [form] = Form.useForm()
  /** 用户协议勾选状态 */
  const [agrCheck, setAgrCheck] = useState<boolean>(false)
  /** 执行一键安装功能时判断用户协议状态 */
  const [checkStatus, setCheckStatus] = useState<boolean>(false)
  /** 展示抖动动画 */
  const [isShake, setIsShake] = useState<boolean>(false)
  // 弹窗置顶
  const [agrShow, setAgrShow] = useState<boolean>(false)
  useEffect(() => {
    getLocalValue(LocalGVS.IsCheckedUserAgreement).then((val: boolean) => {
      setAgrCheck(val)
    })
  }, [])
  useDebounceEffect(
    () => {
      if (agrCheck) {
        setLocalValue(LocalGVS.IsCheckedUserAgreement, true)
      }
    },
    [agrCheck],
    { wait: 500 },
  )
  const agreement = useMemo(() => {
    return (
      <div
        className={classNames(styles['hint-right-agreement'], {
          [styles['agr-shake-animation']]: !agrCheck && isShake,
        })}
      >
        <Checkbox
          className={classNames(
            { [styles['agreement-checkbox']]: !(!agrCheck && checkStatus) },
            {
              [styles['agreement-danger-checkbox']]: !agrCheck && checkStatus,
            },
          )}
          checked={agrCheck}
          onChange={(e) => setAgrCheck(e.target.checked)}
        ></Checkbox>
        <span>
          {t('StartupLoading.agreePrefix')}{' '}
          <span
            className={styles['agreement-style']}
            onClick={(e) => {
              e.stopPropagation()
              setAgrShow(true)
              setIsTop(1)
            }}
          >
            {t('StartupLoading.termsOfService')}
          </span>{' '}
          {t('StartupLoading.agreeSuffix')}
        </span>
      </div>
    )
  }, [agrCheck, isShake, checkStatus, t])

  const judgmentAgreement = useMemoizedFn(() => {
    setCheckStatus(true)
    if (!agrCheck) {
      /** 抖动提示动画 */
      setIsShake(true)
      setTimeout(() => setIsShake(false), 1000)
      return false
    }
    return true
  })

  const btns = useMemo(() => {
    if (yakitStatus === 'install') {
      return (
        <>
          <YakitButton
            className={styles['btn-style']}
            size="large"
            loading={restartLoading}
            onClick={() => judgmentAgreement() && btnClickCallback('install')}
          >
            {t('StartupLoading.initEngine')}
          </YakitButton>

          <YakitButton
            className={styles['btn-style']}
            size="large"
            type="secondary2"
            loading={restartLoading}
            onClick={() => judgmentAgreement() && btnClickCallback('remote')}
          >
            {t('StartupLoading.remoteConnection')}
          </YakitButton>
        </>
      )
    }

    if (yakitStatus === 'installNetWork') {
      return (
        <>
          <YakitButton
            className={styles['btn-style']}
            size="large"
            loading={restartLoading}
            onClick={() => judgmentAgreement() && btnClickCallback('installNetWork')}
          >
            {t('StartupLoading.downloadEngine')}
          </YakitButton>

          <YakitButton
            className={styles['btn-style']}
            size="large"
            type="secondary2"
            loading={restartLoading}
            onClick={() => judgmentAgreement() && btnClickCallback('remote')}
          >
            {t('StartupLoading.remoteConnection')}
          </YakitButton>
        </>
      )
    }

    if (yakitStatus === 'check_timeout') {
      return (
        <>
          <YakitButton
            className={styles['btn-style']}
            size="large"
            loading={restartLoading}
            onClick={() => btnClickCallback('check_timeout')}
          >
            {t('StartupLoading.retry')}
          </YakitButton>
        </>
      )
    }

    if (yakitStatus === 'old_version') {
      return (
        <>
          {buildInEngineVersion ? (
            <YakitButton
              className={styles['btn-style']}
              size="large"
              loading={restartLoading}
              onClick={() => btnClickCallback('install')}
            >
              {t('StartupLoading.resetEngineVersion')}
            </YakitButton>
          ) : (
            <YakitButton
              className={styles['btn-style']}
              size="large"
              loading={restartLoading}
              onClick={() => btnClickCallback('installNetWork')}
            >
              {t('StartupLoading.downloadEngine')}
            </YakitButton>
          )}
        </>
      )
    }

    if (yakitStatus === 'port_occupied_prev') {
      return (
        <>
          <YakitButton
            className={styles['btn-style']}
            size="large"
            loading={restartLoading}
            onClick={() => btnClickCallback('port_occupied_prev', { killCurProcess: true })}
          >
            {t('StartupLoading.reconnect')}
          </YakitButton>
          <YakitButton
            className={styles['btn-style']}
            size="large"
            loading={restartLoading}
            type="secondary2"
            onClick={() => btnClickCallback('port_occupied_prev')}
          >
            {t('StartupLoading.switchPort')}
          </YakitButton>
        </>
      )
    }

    if (yakitStatus === 'port_occupied') {
      return (
        <>
          <YakitButton
            className={styles['btn-style']}
            size="large"
            loading={restartLoading}
            onClick={() => {
              form.validateFields().then((res) => {
                btnClickCallback('port_occupied', { port: res.newLinkport })
              })
            }}
          >
            {t('StartupLoading.connect')}
          </YakitButton>
        </>
      )
    }

    if (yakitStatus === 'allow-secret-error') {
      return (
        <>
          <YakitButton
            className={styles['btn-style']}
            size="large"
            loading={restartLoading}
            onClick={() => btnClickCallback('install')}
          >
            {t('StartupLoading.resetEngineVersion')}
          </YakitButton>
        </>
      )
    }

    if (yakitStatus === 'start_timeout') {
      return (
        <>
          <YakitButton
            className={styles['btn-style']}
            size="large"
            loading={restartLoading}
            onClick={() => btnClickCallback('start_timeout')}
          >
            {t('StartupLoading.retry')}
          </YakitButton>
        </>
      )
    }

    if (yakitStatus === 'skipAgreement_Install') {
      return (
        <>
          <YakitButton
            className={styles['btn-style']}
            size="large"
            loading={restartLoading}
            onClick={() => btnClickCallback('install')}
          >
            {t('StartupLoading.resetEngineVersion')}
          </YakitButton>
        </>
      )
    }

    if (yakitStatus === 'skipAgreement_InstallNetWork') {
      return (
        <>
          <YakitButton
            className={styles['btn-style']}
            size="large"
            loading={restartLoading}
            onClick={() => btnClickCallback('installNetWork')}
          >
            {t('StartupLoading.downloadEngine')}
          </YakitButton>
        </>
      )
    }

    if (yakitStatus === 'database_error') {
      return (
        <>
          <YakitButton
            className={styles['btn-style']}
            size="large"
            loading={restartLoading}
            onClick={() => btnClickCallback('database_error')}
          >
            {t('StartupLoading.fixDatabase')}
          </YakitButton>
        </>
      )
    }

    if (yakitStatus === 'fix_database_error') {
      return (
        <>
          <div
            className={styles['engine-help-wrapper']}
            onClick={() => {
              openABSFileLocated(dbPath[0])
            }}
          >
            {dbPath.join(',')}
            <Tooltip title={t('StartupLoading.fixDatabaseFolderTip')}>
              <OutlineQuestionmarkcircleIcon />
            </Tooltip>
          </div>
        </>
      )
    }

    if (yakitStatus === 'fix_database_timeout') {
      return (
        <>
          <YakitButton
            className={styles['btn-style']}
            size="large"
            loading={restartLoading}
            onClick={() => btnClickCallback('fix_database_timeout')}
          >
            {t('StartupLoading.retry')}
          </YakitButton>
        </>
      )
    }

    if (yakitStatus === 'update_yakit') {
      return (
        <>
          <YakitButton
            className={styles['btn-style']}
            size="large"
            loading={restartLoading}
            onClick={() => btnClickCallback('update_yakit', { downYakit: true })}
          >
            {t('StartupLoading.downloadUpdate')}
          </YakitButton>

          <YakitDropdownMenu
            menu={{
              data: [
                { key: 'ignoreThisTime', label: t('StartupLoading.ignoreThisTime') },
                { key: 'ignoreUpdates', label: t('StartupLoading.ignoreUpdates') },
              ],
              onClick: ({ key }) => {
                switch (key) {
                  case 'ignoreThisTime':
                    btnClickCallback('update_yakit', { ignoreYakit: 'ignoreThisTime' })
                    break
                  case 'ignoreUpdates':
                    btnClickCallback('update_yakit', { ignoreYakit: 'ignoreUpdates' })
                    break
                  default:
                    break
                }
              },
              menuWrapperClassName: styles['menuWrapper'],
              menuItemTitleClassName: styles['menuItemTitle'],
            }}
            dropdown={{
              trigger: ['click'],
              placement: 'bottom',
            }}
          >
            <YakitButton className={styles['btn-style']} size="large" type="secondary2" loading={restartLoading}>
              {t('StartupLoading.ignore')}
            </YakitButton>
          </YakitDropdownMenu>
        </>
      )
    }

    if (yakitStatus === 'update_yak') {
      return (
        <>
          <YakitButton
            className={styles['btn-style']}
            size="large"
            loading={restartLoading}
            onClick={() => btnClickCallback('update_yak', { downYak: true })}
          >
            {t('StartupLoading.install')}
          </YakitButton>

          <YakitButton
            className={styles['btn-style']}
            size="large"
            type="secondary2"
            loading={restartLoading}
            onClick={() => btnClickCallback('update_yak')}
          >
            {t('StartupLoading.ignore')}
          </YakitButton>
        </>
      )
    }

    if (yakitStatus === 'check_yak_version_error') {
      return (
        <>
          <YakitButton
            className={styles['btn-style']}
            size="large"
            loading={restartLoading}
            onClick={() => btnClickCallback('check_yak_version_error')}
          >
            {t('StartupLoading.manualConnectEngine')}
          </YakitButton>
        </>
      )
    }

    if (yakitStatus === 'softwareBasics') {
      return (
        <>
          <YakitButton
            className={styles['btn-style']}
            size="large"
            loading={restartLoading}
            onClick={() => btnClickCallback('softwareBasics')}
          >
            {t('StartupLoading.manualConnectEngine')}
          </YakitButton>
        </>
      )
    }

    if (yakitStatus === 'break') {
      return (
        <>
          <YakitButton
            className={styles['btn-style']}
            size="large"
            loading={restartLoading}
            onClick={() => btnClickCallback('break', { linkAgain: true })}
          >
            {t('StartupLoading.manualConnectEngine')}
          </YakitButton>
        </>
      )
    }

    if (yakitStatus === 'reclaimDatabaseSpace_success') {
      return (
        <>
          <YakitButton
            className={styles['btn-style']}
            size="large"
            loading={restartLoading}
            onClick={() => btnClickCallback('reclaimDatabaseSpace_success')}
          >
            {t('StartupLoading.manualConnectEngine')}
          </YakitButton>
        </>
      )
    }

    if (yakitStatus === 'reclaimDatabaseSpace_error') {
      return (
        <>
          <YakitButton
            className={styles['btn-style']}
            size="large"
            loading={restartLoading}
            onClick={() => btnClickCallback('reclaimDatabaseSpace_error')}
          >
            {t('StartupLoading.manualConnectEngine')}
          </YakitButton>
        </>
      )
    }

    if (yakitStatus === 'error') {
      return (
        <>
          <YakitButton
            className={styles['btn-style']}
            size="large"
            loading={restartLoading}
            onClick={() => btnClickCallback('error')}
          >
            {t('StartupLoading.manualConnectEngine')}
          </YakitButton>
        </>
      )
    }

    if (yakitStatus === 'link_countdown') {
      return (
        <>
          <YakitButton
            className={styles['btn-style']}
            size="large"
            type="primary"
            onClick={() => btnClickCallback('link_countdown', { enterNow: true })}
          >
            {t('StartupLoading.enterNow', { countdown })}
          </YakitButton>
          <YakitButton
            className={styles['btn-style']}
            size="large"
            type="secondary2"
            onClick={() => btnClickCallback('link_countdown')}
          >
            {t('StartupLoading.cancelConnection')}
          </YakitButton>
        </>
      )
    }

    return null
  }, [
    yakitStatus,
    restartLoading,
    engineMode,
    checkStatus,
    buildInEngineVersion,
    JSON.stringify(dbPath),
    countdown,
    t,
    i18n.language,
  ])

  const logError = useMemo(() => {
    if (!yakitStatus) {
      return false
    }
    const statusArr: YakitStatusType[] = [
      'check_timeout',
      'old_version',
      'skipAgreement_InstallNetWork',
      'skipAgreement_Install',
      'port_occupied_prev',
      'port_occupied',
      'database_error',
      'fix_database_timeout',
      'fix_database_error',
      'reclaimDatabaseSpace_error',
      'antivirus_blocked',
      'allow-secret-error',
      'check_yak_version_error',
      'start_timeout',
      'error',
      'break',
    ]
    return statusArr.includes(yakitStatus)
  }, [yakitStatus])
  const logSuccess = useMemo(() => {
    if (!yakitStatus) {
      return false
    }
    const statusArr: YakitStatusType[] = ['reclaimDatabaseSpace_success']
    return statusArr.includes(yakitStatus)
  }, [yakitStatus])

  useEffect(() => {
    form.setFieldsValue({ newLinkport: port })
  }, [port])

  const showAgreement = useMemo(() => {
    const statusArr: YakitStatusType[] = ['install', 'installNetWork']
    return statusArr.includes(yakitStatus)
  }, [yakitStatus])

  const showBreakBtn = useMemo(() => {
    const statusArr: YakitStatusType[] = ['link', 'ready']
    return !yakitStatus || statusArr.includes(yakitStatus)
  }, [yakitStatus])

  const showRemoteLinkBtn = useMemo(() => {
    const statusArr: YakitStatusType[] = ['link', 'ready', 'init', 'reclaimDatabaseSpace_start']
    return yakitStatus && !statusArr.includes(yakitStatus)
  }, [yakitStatus])

  return (
    <YakitSpin spinning={disableYakitLoading} tip={yakitLoadingTip}>
      <div className={styles['startup-loading-wrapper']}>
        {yakitStatus === 'softwareBasics' ? (
          <SoftwareBasics
            softTheme={softTheme}
            setSoftTheme={setSoftTheme}
            softMode={softMode}
            setSoftMode={setSoftMode}
            softLang={softLang}
            setSoftLang={setSoftLang}
          />
        ) : (
          <div
            className={classNames(styles['log-wrapper'], {
              [styles['log-default-color']]: !logError,
              [styles['log-error-color']]: logError,
              [styles['log-success-color']]: logSuccess,
            })}
          >
            <div className={styles['log-body']}>
              {yakitStatus === 'link_countdown' ? (
                <div className={styles['log-item']}>
                  {t('StartupLoading.connectionSuccessCountdown', { countdown })}
                </div>
              ) : yakitStatus === 'break' ? (
                <div className={styles['log-item']}>{t('StartupLoading.disconnectedManualConnect')}</div>
              ) : (
                checkLog.map((item, index, arr) => {
                  return (
                    <div key={item} className={styles['log-item']}>
                      {item}
                    </div>
                  )
                })
              )}
            </div>
          </div>
        )}
        <div className={styles['engine-log-btn']}>
          <Form
            form={form}
            requiredMark={false}
            colon={false}
            layout={'horizontal'}
            labelCol={{ span: 0 }}
            wrapperCol={{ span: 24 }}
            style={{ display: yakitStatus === 'port_occupied' ? 'block' : 'none' }}
          >
            <Form.Item
              label={''}
              rules={[
                { required: true, message: t('StartupLoading.portRequired') },
                {
                  pattern: /^(?:[1-9]\d{0,3}|[1-5]\d{4}|6[0-4]\d{3}|65[0-4]\d{2}|655[0-2]\d|6553[0-5])$/,
                  message: t('StartupLoading.portInvalid'),
                },
              ]}
              name={'newLinkport'}
            >
              <YakitInput placeholder={t('StartupLoading.switchPortPlaceholder')} disabled={restartLoading} />
            </Form.Item>
          </Form>
          {btns}
        </div>
        <div className={styles['footer-wrapper']}>
          <span className={styles['exit-btn']} onClick={() => yakitApp.closeWindow()}>
            <OutlineExitIcon className={styles['exit-icon']} />
            {t('StartupLoading.exit')}
          </span>
          {showAgreement ? (
            <>
              <Divider type="vertical"></Divider>
              {agreement}
            </>
          ) : (
            <div className={styles['footer-btn']}>
              {/* 倒计时状态时不显示底部按钮 */}
              {yakitStatus !== 'link_countdown' && (
                <>
                  <Divider type="vertical"></Divider>
                  <span className={styles['secondary-btn']} onClick={() => grpcOpenYaklangPath()}>
                    {t('StartupLoading.openEngineFiles')}
                  </span>
                  {/* 中断连接按钮：在空状态或连接状态成功 时显示 */}
                  {showBreakBtn && (
                    <>
                      <Divider type="vertical"></Divider>
                      <span
                        className={classNames(styles['primary-btn'])}
                        onClick={() => {
                          btnClickCallback('break')
                        }}
                      >
                        {t('StartupLoading.breakConnection')}
                      </span>
                    </>
                  )}
                  {/* 远程连接按钮：在非连接状态时显示 */}
                  {showRemoteLinkBtn && (
                    <>
                      <Divider type="vertical"></Divider>
                      <span
                        className={classNames(styles['primary-btn'], {
                          [styles['primary-btn-disable']]: restartLoading,
                        })}
                        onClick={() => {
                          if (restartLoading) {
                            return
                          }
                          btnClickCallback('remote')
                        }}
                      >
                        {t('StartupLoading.remoteConnection')}{' '}
                        <OutlineArrowcirclerightIcon className={styles['arrow-circle-right-icon']} />
                      </span>
                    </>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
      <AgreementContentModal
        isTop={isTop}
        setIsTop={setIsTop}
        system={system}
        visible={agrShow}
        setVisible={setAgrShow}
      />
    </YakitSpin>
  )
}
