import React, { useEffect, useRef, useState } from 'react'
import { useInterval, useMemoizedFn } from 'ahooks'
import classNames from 'classnames'
import { OutlineLinkoutIcon, OutlineQrcodeIcon, OutlineRefreshIcon } from '@/assets/icon/outline'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { yakitNotify } from '@/utils/notification'
import { RobotLinkInfo } from './RobotBoundPanel'
import { RobotChannelType } from './RobotControl'
import { RobotQrCodePlaceholder } from './RobotQrCodePlaceholder'
import {
  cancelIMOnboarding,
  IMBotConfigLike,
  IMPlatform,
  onIMOnboardingData,
  onIMOnboardingEnd,
  onIMOnboardingError,
  saveIMBot,
  startIMOnboarding,
} from './api'
import styles from './RobotControl.module.scss'

const QR_REFRESH_SECONDS = 600

export interface RobotLinkRobotCardProps {
  channel?: RobotChannelType
  bot?: IMBotConfigLike
  /** @name 绑定信息，有值时展示已绑定 UI */
  linkInfo?: RobotLinkInfo
  /** @name 绑定状态变更回调 */
  onLinkInfoChange?: (info?: RobotLinkInfo, bot?: IMBotConfigLike) => void
  /** @name 解绑成功回调 */
  onUnbound?: (platform?: IMPlatform) => void
}

export const RobotLinkRobotCard: React.FC<RobotLinkRobotCardProps> = (props) => {
  const { channel, bot, linkInfo, onLinkInfoChange, onUnbound } = props
  const { t } = useI18nNamespaces(['layout'])
  const [scanVisible, setScanVisible] = useState(false)
  const [countdown, setCountdown] = useState(QR_REFRESH_SECONDS)
  const [qrImage, setQrImage] = useState<string>('')
  const [scanStatus, setScanStatus] = useState('')
  const [onboarding, setOnboarding] = useState(false)
  const cleanupRef = useRef<(() => void)[]>([])
  const tokenRef = useRef('')

  const hasSavedCredentials = (value?: IMBotConfigLike) => {
    return !!value?.Platform && !!value?.AppId && !!value?.AppSecret
  }

  const isBound = hasSavedCredentials(bot) && !!linkInfo

  const isSupportedIMPlatform = (value?: RobotChannelType): value is IMPlatform => {
    return value === 'feishu' || value === 'dingtalk'
  }

  const cleanupOnboarding = useMemoizedFn((cancel = false) => {
    cleanupRef.current.forEach((fn) => fn())
    cleanupRef.current = []
    const token = tokenRef.current
    tokenRef.current = ''
    if (cancel && token) {
      cancelIMOnboarding(token).catch(() => {})
    }
  })

  const buildLinkInfo = useMemoizedFn((bot: IMBotConfigLike): RobotLinkInfo => {
    return {
      openId: bot.OwnerId || bot.AppId || bot.Platform,
      appId: bot.AppId,
      channel: bot.Platform as RobotChannelType,
      boundAt: bot.OwnerId ? '已绑定所有者' : '已保存凭据',
    }
  })

  const getQrImageValue = useMemoizedFn((ev: { QrImageBase64?: string; QrUrl?: string }) => {
    const base64 = ev.QrImageBase64 || ''
    if (base64.startsWith('data:image/')) return base64
    if (base64) return `data:image/png;base64,${base64}`
    return ev.QrUrl || ''
  })

  const refreshQrCode = useMemoizedFn(async () => {
    if (!isSupportedIMPlatform(channel)) {
      yakitNotify('error', '当前渠道暂不支持扫码绑定')
      return
    }
    cleanupOnboarding(true)
    const token = `im-ob-${channel}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    tokenRef.current = token
    setScanVisible(true)
    setOnboarding(true)
    setQrImage('')
    setCountdown(QR_REFRESH_SECONDS)
    setScanStatus('正在创建二维码...')

    const offData = onIMOnboardingData(token, async (ev) => {
      const state = ev?.State || ''
      const msg = ev?.Message || ''
      if (state === 'qr') {
        setQrImage(getQrImageValue(ev))
        setScanStatus(msg || '等待扫码确认')
      } else if (state === 'pending') {
        setScanStatus(msg || '等待扫码确认')
      } else if (state === 'success') {
        const bot = ev.Bot
        if (!bot) {
          setScanStatus('扫码成功，但未返回机器人凭据')
          setOnboarding(false)
          return
        }
        try {
          const botForSave = { ...bot, Enabled: bot.Enabled !== false }
          const saved = await saveIMBot(botForSave)
          const nextBot = saved?.Bot || botForSave
          onLinkInfoChange?.(buildLinkInfo(nextBot), nextBot)
          setScanVisible(false)
          setQrImage('')
          setScanStatus('')
          yakitNotify('success', '机器人绑定成功')
        } catch (e) {
          setScanStatus(`保存机器人失败：${e}`)
          yakitNotify('error', `保存机器人失败：${e}`)
        } finally {
          setOnboarding(false)
          cleanupOnboarding(false)
        }
      } else if (state === 'expired') {
        setScanStatus(msg || '二维码已过期，请刷新')
        setOnboarding(false)
        cleanupOnboarding(false)
      } else if (state === 'error') {
        setScanStatus(msg || '扫码绑定失败')
        setOnboarding(false)
        cleanupOnboarding(false)
      }
    })
    const offEnd = onIMOnboardingEnd(token, () => {
      setOnboarding(false)
      cleanupOnboarding(false)
    })
    const offErr = onIMOnboardingError(token, (err) => {
      setScanStatus(typeof err === 'string' ? err : (err as any)?.message || `${err}`)
      setOnboarding(false)
      cleanupOnboarding(false)
    })
    cleanupRef.current = [offData, offEnd, offErr]

    try {
      await startIMOnboarding(token, channel)
    } catch (e) {
      setScanStatus(`${e}`)
      setOnboarding(false)
      cleanupOnboarding(false)
    }
  })

  const onScanCode = useMemoizedFn(() => {
    refreshQrCode()
  })

  const onUnbind = useMemoizedFn(async () => {
    if (!isSupportedIMPlatform(channel)) return
    try {
      if (bot) {
        await saveIMBot(
          {
            ...bot,
            AppId: '',
            AppSecret: '',
            RobotSecret: '',
            OwnerId: '',
            Enabled: false,
          },
          { ClearOwnerId: true },
        )
      }
      onLinkInfoChange?.(undefined)
      onUnbound?.(channel)
      setScanVisible(false)
      yakitNotify('success', '机器人已解绑')
    } catch (e) {
      yakitNotify('error', `解绑机器人失败：${e}`)
    }
  })

  useEffect(() => () => cleanupOnboarding(true), [])

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
    scanVisible && !isBound && onboarding ? 1000 : undefined,
  )

  const scanTipKey = channel === 'dingtalk' ? 'RobotControl.scanDingtalkTip' : 'RobotControl.scanFeishuTip'

  const renderHeaderActions = () => {
    if (isBound) {
      return (
        <div className={styles['robot-link-actions']}>
          <span className={styles['robot-link-connected']}>
            <span className={styles['robot-link-connected-dot']} />
            <span>已绑定</span>
          </span>
          <YakitButton type="outline2" icon={<OutlineLinkoutIcon />} onClick={onUnbind}>
            {t('RobotControl.unbind')}
          </YakitButton>
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

      {!isBound && scanVisible && (
        <div className={styles['robot-scan-panel']}>
          <RobotQrCodePlaceholder value={qrImage} />
          <div className={styles['robot-scan-info']}>
            <div className={styles['robot-scan-tip']}>{t(scanTipKey)}</div>
            <div className={styles['robot-scan-status']}>
              {scanStatus || t('RobotControl.waitingScanPrefix')}
              {onboarding && (
                <>
                  {' '}
                  <span className={styles['robot-scan-countdown']}>{countdown}s</span>
                </>
              )}
            </div>
            <div className={styles['robot-scan-actions']}>
              <YakitButton type="outline2" size="small" icon={<OutlineRefreshIcon />} onClick={refreshQrCode}>
                刷新二维码
              </YakitButton>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
