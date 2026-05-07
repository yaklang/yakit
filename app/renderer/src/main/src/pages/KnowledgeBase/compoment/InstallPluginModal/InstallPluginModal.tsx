import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { showYakitModal } from '@/components/yakitUI/YakitModal/YakitModalConfirm'
import { ShowModalProps } from '@/utils/showModal'

import styles from './InstallPluginModal.module.scss'
import { useMemoizedFn, useRequest, useSafeState } from 'ahooks'
import { success, failed } from '@/utils/notification'
import { installWithEvents } from '../AllInstallPlugins'
import { useCheckKnowledgePlugin } from '../../hooks/useCheckKnowledgePlugin'
import { useRef, useEffect } from 'react'
import { Progress } from 'antd'
const { ipcRenderer } = window.require('electron')

interface InstallPluginModalProps {
  callback?: () => void
}

const InstallPluginModalContent: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
  const [overallProgress, setOverallProgress] = useSafeState(0)
  const [installTokens, setInstallTokens] = useSafeState<string[]>([])
  const progressMap = useRef<Record<string, number>>({})

  const { binariesToInstall, refresh: binariesToInstallRefresh } = useCheckKnowledgePlugin()

  // 监听下载进度
  useEffect(() => {
    installTokens.forEach((token) => {
      const onData = (_: any, data: any) => {
        if (data.Progress > 0) {
          const progressValue = Math.ceil(data.Progress)

          progressMap.current[token] = progressValue

          const values = Object.values(progressMap.current)
          const sum = values.reduce((a, b) => a + b, 0)
          const avg = installTokens.length > 0 ? Math.floor(sum / installTokens.length) : 0

          setOverallProgress(avg)
        }
      }

      const onError = (_: any, error: any) => {
        failed(`下载失败:${error}`)
      }

      const onEnd = () => {
        // 下载完成时清理监听
        ipcRenderer.removeAllListeners(`${token}-data`)
        ipcRenderer.removeAllListeners(`${token}-error`)
        ipcRenderer.removeAllListeners(`${token}-end`)
        binariesToInstallRefresh()
        // onClose?.()
      }

      ipcRenderer.on(`${token}-data`, onData)
      ipcRenderer.on(`${token}-error`, onError)
      ipcRenderer.on(`${token}-end`, onEnd)
    })

    return () => {
      installTokens.forEach((token) => {
        ipcRenderer.invoke('cancel-InstallThirdPartyBinary', token)
        ipcRenderer.removeAllListeners(`${token}-data`)
        ipcRenderer.removeAllListeners(`${token}-error`)
        ipcRenderer.removeAllListeners(`${token}-end`)
      })
    }
  }, [installTokens])

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
        installWithEvents('InstallThirdPartyBinary', { Name: b.Name, Force: true }, b.installToken),
      )

      await Promise.all(promises)

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
    // 手动关闭时清理所有监听
    installTokens.forEach((token) => {
      ipcRenderer.invoke('cancel-InstallThirdPartyBinary', token)
      ipcRenderer.removeAllListeners(`${token}-data`)
      ipcRenderer.removeAllListeners(`${token}-error`)
      ipcRenderer.removeAllListeners(`${token}-end`)
    })

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
