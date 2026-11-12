import { useRef, useState } from 'react'
import { Tooltip } from 'antd'
import { CameraOutlined } from '@yakit-libs/yakit-ui-icons/outline'
import LoadingOutlined from '@ant-design/icons/lib/icons/LoadingOutlined'
import classNames from 'classnames'
import { yakitScreenshot } from '@/services/electronBridge'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { failed, yakitNotify } from '@/utils/notification'
import { YakitButton } from '../yakitUI/YakitButton/YakitButton'
import styles from './funcDomain.module.scss'

export const ScreenshotButton = () => {
  const { t } = useI18nNamespaces(['layout'])
  const [capturing, setCapturing] = useState(false)
  const busy = useRef(false)

  const onCapture = async () => {
    if (busy.current) return
    busy.current = true
    setCapturing(true)
    try {
      // Paint the hidden tooltip before capturing the visible page.
      await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
      const result = await yakitScreenshot.captureAndSave()
      yakitNotify('success', {
        message: t('Screenshot.saved'),
        description: result.path,
        actions: (
          <YakitButton
            type="text"
            onClick={() => yakitScreenshot.openDirectory().catch((error) => failed(String(error)))}
          >
            {t('Screenshot.openDirectory')}
          </YakitButton>
        ),
      })
    } catch (error) {
      failed(t('Screenshot.failed', { error: String(error) }))
    } finally {
      busy.current = false
      setCapturing(false)
    }
  }

  return (
    <Tooltip
      placement="bottom"
      title={t('Screenshot.capture')}
      open={capturing ? false : undefined}
      styles={{ root: capturing ? { display: 'none' } : undefined }}
    >
      <button
        type="button"
        className={classNames(styles['ui-op-btn-wrapper'], styles['screenshot-button'])}
        aria-label={t('Screenshot.capture')}
        aria-busy={capturing}
        disabled={capturing}
        onClick={onCapture}
      >
        <span className={styles['op-btn-body']}>
          {capturing ? (
            <LoadingOutlined className={styles['icon-hover-style']} />
          ) : (
            <CameraOutlined className={styles['icon-style']} size={20} />
          )}
        </span>
      </button>
    </Tooltip>
  )
}
