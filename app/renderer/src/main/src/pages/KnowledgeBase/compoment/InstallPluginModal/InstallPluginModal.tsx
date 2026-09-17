import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { showYakitModal } from '@/components/yakitUI/YakitModal/YakitModalConfirm'
import type { ShowModalProps } from '@/utils/showModal'

import styles from './InstallPluginModal.module.scss'
import { useMemoizedFn, useRequest, useSafeState } from 'ahooks'
import { success, failed } from '@/utils/notification'
import { useDownloadTasks } from '../../hooks/useDownloadTasks'
import { useCheckKnowledgePlugin } from '../../hooks/useCheckKnowledgePlugin'
import { useRef, useEffect } from 'react'
import { Progress } from 'antd'

interface InstallPluginModalProps {
  callback?: () => void
}

const InstallPluginModalContent: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
  const downloads = useDownloadTasks()
  const [overallProgress, setOverallProgress] = useSafeState(0)
  const [installTokens, setInstallTokens] = useSafeState<string[]>([])
  const progressMap = useRef<Record<string, number>>({})

  const { binariesToInstall, refresh: binariesToInstallRefresh } = useCheckKnowledgePlugin()

  const { run: runInstallAll, loading } = useRequest(
    async () => {
      const exclude = ['llama-server', 'model-Qwen3-Embedding-0.6B-Q4']

      const filteredInstall = binariesToInstall?.filter((item) => !exclude.includes(item.Name)) ?? []

      const emptyInstallPathItem = filteredInstall?.filter((item) => item.InstallPath === '') ?? []

      if (!emptyInstallPathItem.length) return

      setOverallProgress(0)
      progressMap.current = {}

      const tokens = emptyInstallPathItem.map((it) => it.installToken)
      setInstallTokens(tokens)

      const promises = emptyInstallPathItem.map((b) =>
        downloads.run(
          'InstallThirdPartyBinary',
          { Name: b.Name, Force: true },
          {
            key: b.installToken,
            onData: (data) => {
              if (data.Progress <= 0) return
              progressMap.current[b.installToken] = Math.ceil(data.Progress)
              const sum = tokens.reduce((total, token) => total + (progressMap.current[token] || 0), 0)
              setOverallProgress(Math.floor(sum / tokens.length))
            },
          },
        ),
      )

      const results = await Promise.allSettled(promises)
      const failure = results.find((result) => result.status === 'rejected')
      if (failure?.status === 'rejected') throw failure.reason

      return 'ok'
    },
    {
      manual: true,
      onSuccess: async () => {
        try {
          success('知识库所需插件安装完成')
          setOverallProgress(100)
          setInstallTokens([])
          await binariesToInstallRefresh?.()

          // 通知外部刷新插件状态
          onClose?.()
        } catch (error) {
          failed(error + '')
        }
      },
      onError: (err) => {
        if ('code' in err && err.code === 'ABORTED') return
        failed(`插件安装失败: ${err}`)
        setInstallTokens([])
        setOverallProgress(0)
      },
    },
  )

  const handleDownload = useMemoizedFn(() => {
    runInstallAll()
  })

  const hanlClear = useMemoizedFn(() => {
    downloads.dispose()

    setInstallTokens([])
    setOverallProgress(0)

    onClose?.()
  })

  return (
    <div className={styles['install-plugin-modal-body']}>
      <div className={styles['content']}>新建知识库有必要插件未下载，是否一键下载</div>

      {installTokens.length > 0 ? (
        <div className={styles['install-plugin-progress']}>
          <Progress percent={overallProgress} />
        </div>
      ) : null}

      <div className={styles['footer-container']}>
        <YakitButton type="outline1" className={styles['cancel']} onClick={hanlClear}>
          取消
        </YakitButton>

        <YakitButton type="primary" className={styles['submit']} loading={loading} onClick={handleDownload}>
          确定下载
        </YakitButton>
      </div>
    </div>
  )
}

const InstallPluginModal = (props?: InstallPluginModalProps & ShowModalProps) => {
  const modal = showYakitModal({
    title: '插件缺失',
    width: 400,
    footer: null,
    closable: true,
    maskClosable: false,
    ...props,
    content: (
      <InstallPluginModalContent
        onClose={() => {
          modal?.destroy?.()
          props?.callback?.()
        }}
      />
    ),
  })

  return modal
}

export { InstallPluginModal }
