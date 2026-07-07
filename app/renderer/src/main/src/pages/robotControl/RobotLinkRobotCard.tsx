import React, { useEffect, useState } from 'react'
import { useInterval, useMemoizedFn } from 'ahooks'
import classNames from 'classnames'
import { OutlineLinkoutIcon, OutlineQrcodeIcon, OutlineRefreshIcon } from '@/assets/icon/outline'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { RobotBoundPanel, RobotLinkInfo } from './RobotBoundPanel'
import { RobotChannelType } from './RobotControl'
import { RobotQrCodePlaceholder } from './RobotQrCodePlaceholder'
import styles from './RobotControl.module.scss'

const QR_REFRESH_SECONDS = 3

export interface RobotLinkRobotCardProps {
  channel?: RobotChannelType
  /** @name 绑定信息，有值时展示已绑定 UI */
  linkInfo?: RobotLinkInfo
  /** @name 绑定状态变更回调 */
  onLinkInfoChange?: (info?: RobotLinkInfo) => void
}

export const RobotLinkRobotCard: React.FC<RobotLinkRobotCardProps> = (props) => {
  const { channel, linkInfo, onLinkInfoChange } = props
  const { t } = useI18nNamespaces(['layout'])
  const [scanVisible, setScanVisible] = useState(false)
  const [countdown, setCountdown] = useState(QR_REFRESH_SECONDS)
  const [qrToken, setQrToken] = useState<string>('')

  const isBound = !!linkInfo

  const refreshQrCode = useMemoizedFn(async () => {
    // TODO: 调用接口获取二维码，轮询扫码状态；绑定成功后 onLinkInfoChange(接口数据)
    setQrToken(`placeholder-${Date.now()}`)
    setCountdown(QR_REFRESH_SECONDS)
  })

  const onScanCode = useMemoizedFn(() => {
    if (!scanVisible) {
      setScanVisible(true)
      return
    }
    refreshQrCode()
  })

  const onUnbind = useMemoizedFn(() => {
    // TODO: 调用解绑接口
    onLinkInfoChange?.(undefined)
    setScanVisible(false)
  })

  const onRefreshLink = useMemoizedFn(() => {
    // TODO: 调用接口刷新绑定信息
  })

  useEffect(() => {
    if (scanVisible && !isBound) {
      refreshQrCode()
    }
  }, [scanVisible, isBound, refreshQrCode])

  useInterval(
    () => {
      setCountdown((prev) => {
        if (prev <= 1) {
          refreshQrCode()
          return QR_REFRESH_SECONDS
        }
        return prev - 1
      })
    },
    scanVisible && !isBound ? 1000 : undefined,
  )

  const scanTipKey = channel === 'dingtalk' ? 'RobotControl.scanDingtalkTip' : 'RobotControl.scanFeishuTip'
  const channelLabel = channel ? t(`RobotControl.channel.${channel}`) : ''

  const renderHeaderActions = () => {
    if (isBound) {
      return (
        <div className={styles['robot-link-actions']}>
          <YakitButton type="outline2" icon={<OutlineLinkoutIcon />} onClick={onUnbind}>
            {t('RobotControl.unbind')}
          </YakitButton>
          <YakitButton type="outline2" icon={<OutlineRefreshIcon />} onClick={onRefreshLink} />
        </div>
      )
    }
    return (
      <YakitButton type="outline2" icon={<OutlineQrcodeIcon />} onClick={onScanCode}>
        {t('RobotControl.scanCode')}
      </YakitButton>
    )
  }

  return (
    <div className={classNames(styles['robot-detail-card'])}>
      <div className={styles['robot-link-card-header-main']}>
        <div className={styles['robot-detail-card-content']}>
          <div className={styles['robot-detail-card-title']}>{t('RobotControl.linkRobot')}</div>
          <div className={styles['robot-detail-card-desc']}>{t('RobotControl.linkRobotDesc')}</div>
        </div>
        {renderHeaderActions()}
      </div>

      {isBound && linkInfo ? (
        <RobotBoundPanel linkInfo={linkInfo} channelLabel={channelLabel} />
      ) : (
        scanVisible && (
          <div className={styles['robot-scan-panel']} key={qrToken}>
            <RobotQrCodePlaceholder value={qrToken} />
            <div className={styles['robot-scan-info']}>
              <div className={styles['robot-scan-tip']}>{t(scanTipKey)}</div>
              <div className={styles['robot-scan-status']}>
                {t('RobotControl.waitingScanPrefix')}
                <span className={styles['robot-scan-countdown']}>{countdown}s</span>
                {t('RobotControl.waitingScanSuffix')}
              </div>
            </div>
          </div>
        )
      )}
    </div>
  )
}
