import { ipc } from '@/services/ipc'
import type React from 'react'
import { useEffect, useRef, useState } from 'react'
import { Progress } from 'antd'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { useGetState, useMemoizedFn } from 'ahooks'
import { randomString } from '@/utils/randomUtil'
import { yakitFailed } from '@/utils/notification'
import { Uint8ArrayToString } from '@/utils/str'
import { ScreenRecorderList } from '@/pages/screenRecorder/ScreenRecorderList'
import { YakitEmpty } from '@/components/yakitUI/YakitEmpty/YakitEmpty'
import styles from './ScreenRecorderPage.module.scss'
import { YakitHint } from '@/components/yakitUI/YakitHint/YakitHint'
import { YakitSpin } from '@/components/yakitUI/YakitSpin/YakitSpin'
import { YakitRoute } from '@/enums/yakitRoute'
import { useEmptyImage } from '@/hook/useResultEmpty/SearchEmpty'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'

import { CloudDownloadOutlined } from '@yakit-libs/yakit-ui-icons/outline'
import { CloudDownloadSolid } from '@yakit-libs/yakit-ui-icons/solid'

export interface ScreenRecorderPageProp {}

export const ScreenRecorderPage: React.FC<ScreenRecorderPageProp> = (props) => {
  const screcorderEmptyImageTarget = useEmptyImage('screenRecording')
  const { t } = useI18nNamespaces(['screenRecorder'])

  const [available, setAvailable] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(false)
  const [loading, setLoading] = useState(false)
  const [installVisible, setInstallVisible] = useState<boolean>(false)

  const init = () => {
    setLoading(true)
    ipc
      .invoke('grpc', 'IsScrecorderReady', {})
      .then((data) => {
        setAvailable(data.Ok)
      })
      .catch((err) => {
        yakitFailed(t('ScreenRecorderPage.installFailed', { error: String(err) }))
      })
      .finally(() => setTimeout(() => setLoading(false), 200))
  }

  useEffect(() => {
    init()
  }, [])

  return (
    <YakitSpin spinning={loading}>
      {available ? (
        <ScreenRecorderList refreshTrigger={refreshTrigger} />
      ) : (
        <div className={styles['not-installed-empty']}>
          <YakitEmpty
            image={<img src={screcorderEmptyImageTarget} alt="" />}
            styles={{ image: { height: 200, margin: 'auto', marginBottom: 24 } }}
            title={<div style={{ fontSize: 14 }}>{t('ScreenRecorderPage.notInstalled')}</div>}
            description={t('ScreenRecorderPage.installHint')}
          />
          <div className={styles['not-installed-buttons']}>
            <YakitButton
              type="outline1"
              icon={<CloudDownloadOutlined size={16} />}
              onClick={() => {
                setInstallVisible(true)
              }}
            >
              {t('ScreenRecorderPage.installRecorder')}
            </YakitButton>
          </div>
        </div>
      )}
      <YakitHint
        visible={installVisible}
        title={t('ScreenRecorderPage.installing')}
        heardIcon={<CloudDownloadSolid size={32} style={{ color: 'var(--Colors-Use-Warning-Primary)' }} />}
        onCancel={() => {
          setInstallVisible(false)
        }}
        okButtonProps={{ style: { display: 'none' } }}
        isDrag={true}
        mask={false}
        getContainer={document.getElementById(`main-operator-page-body-${YakitRoute.ScreenRecorderPage}`) || undefined}
        wrapClassName={styles['screenRecorderInstallModal']}
      >
        <InstallFFmpeg
          visible={installVisible}
          onFinish={() => {
            setInstallVisible(false)
            init()
          }}
        />
      </YakitHint>
    </YakitSpin>
  )
}

export interface InstallFFmpegProp {
  visible: boolean
  onFinish: () => void
}

const InstallFFmpeg: React.FC<InstallFFmpegProp> = (props) => {
  const { onFinish, visible } = props
  const { t } = useI18nNamespaces(['screenRecorder', 'yakitUi'])
  const token = useRef(randomString(40)).current
  const [results, setResults, getResult] = useGetState<string[]>([])
  const [percent, setPercent, getPercent] = useGetState<number>(0)

  const timer = useRef<number>(0) //超时处理
  const prePercent = useRef<number>(0) // 上一次的进度数值

  const finish = useMemoizedFn(onFinish)
  useEffect(() => {
    setPercent(0)
    setResults([])
    timer.current = 0
    prePercent.current = 0
    if (!visible) return
    const controller = new AbortController()
    const onError = (error: unknown) => {
      if (!controller.signal.aborted) yakitFailed(t('YakitNotification.downloadFailed', { error: String(error) }))
    }
    ipc
      .openStream(
        'grpc',
        'InstallScrecorder',
        {},
        {
          token,
          signal: controller.signal,
          onData(data) {
            if (controller.signal.aborted || !data.IsMessage) return
            if (getPercent() === prePercent.current) timer.current += 1
            else {
              prePercent.current = getPercent()
              timer.current = 0
            }
            if (timer.current > 30) {
              yakitFailed(`[InstallScrecorder] error:${t('ScreenRecorderPage.timeout')}`)
              timer.current = 0
            }
            setPercent(Math.ceil(data.Progress))
            setResults([Uint8ArrayToString(data.Message), ...getResult()])
          },
          onError,
          onEnd() {
            if (!controller.signal.aborted) finish()
          },
        },
      )
      .catch(onError)
    return () => controller.abort()
  }, [visible, token])

  return (
    <>
      <div className={styles['download-progress']}>
        <Progress
          strokeColor="var(--Colors-Use-Main-Primary)"
          trailColor="var(--Colors-Use-Neutral-Bg-Hover)"
          percent={percent}
          format={(percent) => `${t('ScreenRecorderPage.downloaded')} ${percent}%`}
        />
      </div>
      <div className={styles['download-progress-messages']}>
        {results.map((i) => {
          return <p>{i}</p>
        })}
      </div>
    </>
  )
}
