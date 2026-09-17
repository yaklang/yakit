import { ipc } from '@/services/ipc'
import React, { useEffect, useRef, useState } from 'react'
import type {
  DownloadLlamaServerModelPromptProps,
  InstallLlamaServerModelPromptProps,
  InstallLlamaServerProps,
} from './InstallLlamaServerModelPromptType'
import { yakitNotify } from '@/utils/notification'
import { Uint8ArrayToString } from '@/utils/str'
import { useMemoizedFn } from 'ahooks'
import { Form, Progress } from 'antd'
import { YakitInput } from '@/components/yakitUI/YakitInput/YakitInput'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import styles from './InstallLlamaServerModelPrompt.module.scss'

import { YakitHint } from '@/components/yakitUI/YakitHint/YakitHint'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { CloudDownloadSolid } from '@yakit-libs/yakit-ui-icons/solid'

export const InstallLlamaServerModelPrompt: React.FC<InstallLlamaServerModelPromptProps> = React.memo((props) => {
  const { onStart } = props
  const { t } = useI18nNamespaces(['aiAgent'])

  const startInstall = useMemoizedFn((value) => {
    onStart({ Proxy: value.proxy || '' })
  })

  return (
    <>
      <div className={styles['install-llama-server-model-prompt']}>
        <Form onFinish={startInstall} layout="vertical">
          <Form.Item
            label={t('InstallLlamaServerModelPrompt.proxySettings')}
            help={t('InstallLlamaServerModelPrompt.proxyHelp')}
            name="proxy"
          >
            <YakitInput placeholder={t('InstallLlamaServerModelPrompt.proxyPlaceholder')} />
          </Form.Item>

          <div className={styles['button-group']}>
            <YakitButton type="primary" htmlType="submit" size="large">
              {t('InstallLlamaServerModelPrompt.downloadAndInstall')}
            </YakitButton>
          </div>
        </Form>
      </div>
    </>
  )
})

export const InstallLlamaServer: React.FC<InstallLlamaServerProps> = React.memo((props) => {
  const { onFinished, onCancel, token, title, grpcInterface, params, getContainer } = props
  const { t } = useI18nNamespaces(['yakitUi'])

  const [percent, setPercent] = useState<number>(0)
  const [data, setData] = useState<string[]>([])

  const controllerRef = useRef<AbortController>()
  const handleMessage = useMemoizedFn((message: string) => {
    if (message) setData((prev) => [...prev, message])
  })
  const finish = useMemoizedFn(onFinished)
  useEffect(() => {
    const controller = new AbortController()
    controllerRef.current = controller
    const onError = (error: unknown) => {
      if (!controller.signal.aborted) yakitNotify('error', `[${grpcInterface}] error: ${error}`)
    }
    ipc
      .openStream('grpc', grpcInterface, params, {
        token,
        signal: controller.signal,
        onData(value) {
          if (controller.signal.aborted) return
          if (value.Progress > 0) setPercent(value.Progress)
          if (value.IsMessage) handleMessage(Uint8ArrayToString(value.Message))
        },
        onError,
        onEnd() {
          if (!controller.signal.aborted) {
            yakitNotify('info', `[${grpcInterface}] finished`)
            finish()
          }
        },
      })
      .catch(onError)
    return () => controller.abort()
  }, [grpcInterface, token, params])
  const onCancelDownload = useMemoizedFn(() => controllerRef.current?.abort())
  const onBack = useMemoizedFn(() => {
    onCancelDownload()
    onCancel()
  })
  return (
    <YakitHint
      visible={true}
      title={title}
      heardIcon={<CloudDownloadSolid size={32} style={{ color: 'var(--Colors-Use-Warning-Primary)' }} />}
      onCancel={onBack}
      okButtonProps={{ style: { display: 'none' } }}
      isDrag={true}
      mask={false}
      getContainer={getContainer}
      wrapClassName={styles['installLlamaServerModal']}
    >
      <div className={styles['download-progress']}>
        <Progress
          trailColor="var(--Colors-Use-Neutral-Bg-Hover)"
          percent={percent}
          format={(p) => t('YakitProgress.progress', { percent: p || 0 })}
        />
        <div className={styles['download-progress-messages']}>
          {data.map((item, index) => (
            <p key={item}>{item}</p>
          ))}
        </div>
      </div>
    </YakitHint>
  )
})

export const DownloadLlamaServerModelPrompt: React.FC<DownloadLlamaServerModelPromptProps> = React.memo((props) => {
  const { modelName, onStart } = props
  const { t } = useI18nNamespaces(['aiAgent'])

  const startDownload = useMemoizedFn((value) => {
    onStart({ ModelName: modelName, Proxy: value.proxy || '' })
  })

  return (
    <div className={styles['download-llama-server-model-prompt']}>
      <Form onFinish={startDownload} size="small" layout="vertical">
        <Form.Item
          name="proxy"
          label={t('InstallLlamaServerModelPrompt.proxySettings')}
          help={t('InstallLlamaServerModelPrompt.proxyHelp')}
        >
          <YakitInput placeholder={t('InstallLlamaServerModelPrompt.proxyPlaceholder')} />
        </Form.Item>

        <div className={styles['button-group']}>
          <YakitButton type="primary" htmlType="submit" size="large" style={{ marginBottom: 8 }}>
            {t('InstallLlamaServerModelPrompt.downloadModel')}
          </YakitButton>
        </div>
      </Form>
    </div>
  )
})
