import { useDownloadTasks } from '../hooks/useDownloadTasks'
import { type FC, memo, useEffect, useRef, useState } from 'react'

import { Progress, Tooltip } from 'antd'
import { useInViewport, useRequest, useSafeState } from 'ahooks'

import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitEmpty } from '@/components/yakitUI/YakitEmpty/YakitEmpty'
import { success, failed } from '@/utils/notification'
import styles from '../knowledgeBase.module.scss'

import type { AllInstallPluginsProps, ExecResult } from './AllInstallPluginsProps'

import emiter from '@/utils/eventBus/eventBus'
import { YakitRoute } from '@/enums/yakitRoute'
import classNames from 'classnames'
import {
  CloudDownloadOutlined,
  FolderOpenOutlined,
  PuzzleOutlined,
  RefreshOutlined,
} from '@yakit-libs/yakit-ui-icons/outline'
import {
  YakitLogoSvgIconFromPagesKnowledgeBaseIconSidebarIcon,
  YakitSpinLogoSvgIcon,
} from '@yakit-libs/yakit-ui-icons/oldicon'
import { onOpenLocalFileByPath } from '@/pages/notepadManage/notepadManage/utils'
import { exclude } from '../utils'
import { YakitTag } from '@/components/yakitUI/YakitTag/YakitTag'
import { XSolid } from '@yakit-libs/yakit-ui-icons/solid'

const onCloseKnowledgeRepository = () => {
  emiter.emit('closePage', JSON.stringify({ route: YakitRoute.AI_REPOSITORY }))
}

const AllInstallPlugins: FC<AllInstallPluginsProps> = ({
  onInstallPlug,
  binariesToInstall,
  binariesToInstallRefreshAsync,
  isShow = true,
}) => {
  const downloads = useDownloadTasks()
  const [installTokens, setInstallTokens] = useState<string[]>([])
  const [overallProgress, setOverallProgress] = useState(0)
  const progressMap = useRef<Record<string, number>>({})
  const [showDetailStatus, setShowDetailStatus] = useSafeState(true)
  const [eachProgress, setEachProgress] = useState<Record<string, number>>({})

  const refRef = useRef<HTMLDivElement>(null)
  const [inViewport = true] = useInViewport(refRef)

  useEffect(() => {
    emiter.on('onCloseKnowledgeRepository', onCloseKnowledgeRepository)
    return () => {
      emiter.off('onCloseKnowledgeRepository', onCloseKnowledgeRepository)
    }
  }, [])

  const installBinary = (binary: { Name: string; installToken: string }, batchTokens?: string[]) =>
    downloads
      .run(
        'InstallThirdPartyBinary',
        { Name: binary.Name, Force: true },
        {
          key: binary.installToken,
          onData: (data) => {
            if (data.Progress <= 0) return
            const value = Math.ceil(data.Progress)
            progressMap.current[binary.installToken] = value
            setEachProgress((previous) => ({ ...previous, [binary.installToken]: value }))
            if (batchTokens?.length) {
              const sum = batchTokens.reduce((total, token) => total + (progressMap.current[token] || 0), 0)
              setOverallProgress(Math.floor(sum / batchTokens.length))
            }
          },
        },
      )
      .finally(() => setInstallTokens((previous) => previous.filter((token) => token !== binary.installToken)))

  // 并发安装所有
  const { run: runInstallAll, loading } = useRequest(
    async () => {
      const exclude = ['llama-server', 'model-Qwen3-Embedding-0.6B-Q4']
      const filteredInstall = binariesToInstall?.filter((item) => !exclude.includes(item.Name)) ?? []
      const emptyInstallPathItem = filteredInstall?.filter((item) => item.InstallPath === '') ?? []
      if (!emptyInstallPathItem || emptyInstallPathItem.length === 0) {
        return
      } else {
        setOverallProgress(0)
        progressMap.current = {}
        const tokens = emptyInstallPathItem.map((it) => it.installToken)
        setInstallTokens((previous) => [...new Set([...previous, ...tokens])])

        // 并发执行安装
        const promises = emptyInstallPathItem.map((b) => installBinary(b, tokens))
        const results = await Promise.allSettled(promises)
        const failure = results.find((result) => result.status === 'rejected')
        if (failure?.status === 'rejected') throw failure.reason
      }

      return 'ok'
    },
    {
      manual: true,
      onSuccess: async () => {
        try {
          success('知识库所需插件安装完成')
          setOverallProgress(100)
          onInstallPlug(false)
          await binariesToInstallRefreshAsync()
        } catch (error) {
          failed(error + '')
        }
      },
      onError: (err) => {
        if ('code' in err && err.code === 'ABORTED') return
        failed(`插件安装失败: ${err}`)
        setOverallProgress(0)
      },
    },
  )

  const showDetail = () => {
    setShowDetailStatus(true)
  }

  // 单独下载一个插件
  const downloadSingle = async (binary: { Name: string; installToken: string }) => {
    try {
      setInstallTokens((prev) => {
        if (!prev.includes(binary.installToken)) {
          return [...prev, binary.installToken]
        }
        return prev
      })

      await installBinary(binary)
      await binariesToInstallRefreshAsync()
      success(`${binary.Name} 下载完成`)
      onInstallPlug(false)
    } catch (err) {
      if (err && typeof err === 'object' && 'code' in err && err.code === 'ABORTED') return
      failed(`${binary.Name} 下载失败: ${err}`)
    }
  }

  return (
    <div className={styles['install-container']} ref={refRef}>
      <div className={styles['install-box']}>
        <YakitEmpty
          styles={{ image: { height: 120, width: 120, margin: '12px auto' } }}
          title="检测到有插件未下载"
          description="请下载插件后再创建知识库，也可以下载线上知识库进行使用"
        />
        <div className={styles['install-button-box']}>
          <YakitButton
            type="outline1"
            icon={<CloudDownloadOutlined size={16} />}
            onClick={() => {
              try {
                runInstallAll()
              } catch (error) {
                failed(error + '')
              }
            }}
            loading={loading}
          >
            一键下载插件
          </YakitButton>
          {isShow ? (
            <YakitButton type="text" onClick={() => showDetail()}>
              查看详情
            </YakitButton>
          ) : null}
        </div>
      </div>
      {isShow ? (
        <div
          className={classNames(styles['show-detail-box'], {
            [styles['hidden']]: !showDetailStatus,
          })}
        >
          <div className={styles['header']}>
            <div className={styles['left']}>
              <PuzzleOutlined color="currentColor" />
              <div>插件下载</div>
              <Tooltip title="刷新插件列表">
                <YakitButton
                  type="text"
                  icon={<RefreshOutlined color="currentColor" />}
                  onClick={(e) => {
                    e.stopPropagation()
                    binariesToInstallRefreshAsync?.()
                  }}
                />
              </Tooltip>
            </div>
            <div className={styles['right']}>
              <YakitButton
                icon={<CloudDownloadOutlined color="currentColor" />}
                type="text2"
                onClick={() => runInstallAll()}
                loading={loading}
              />
              <YakitButton icon={<XSolid size={12} />} type="text2" onClick={() => setShowDetailStatus(false)} />
            </div>
          </div>
          {installTokens.length > 0 ? <Progress percent={overallProgress} showInfo={false} /> : null}
          <div className={styles['content']}>
            {binariesToInstall?.map((it, key) => {
              return (
                <div className={styles['install-content-box']} key={it.InstallPath + key}>
                  <div className={styles['first-box']}>
                    <YakitLogoSvgIconFromPagesKnowledgeBaseIconSidebarIcon />
                    <YakitSpinLogoSvgIcon className={styles['yakit-svg']} />
                  </div>
                  <div
                    className={classNames(styles['middle-box'], {
                      [styles['middle-width']]: eachProgress?.[it.installToken] < 100,
                    })}
                  >
                    <div className={classNames(styles['title-box'])}>
                      <span className={styles['title']}>{it.Name}</span>
                      {exclude.includes(it.Name) && <YakitTag>可不下载</YakitTag>}
                    </div>
                    <Tooltip title={it.Description}>
                      <div className={styles['describe']}>{it.Description}</div>
                    </Tooltip>
                  </div>
                  <div className={styles['last-box']}>
                    {!it.InstallPath && !eachProgress?.[it.installToken] ? (
                      <YakitButton icon={<CloudDownloadOutlined size={16} />} onClick={() => downloadSingle(it)}>
                        下载
                      </YakitButton>
                    ) : eachProgress?.[it.installToken] < 100 ? (
                      <div className={styles['downloading']}>正在下载.. （{eachProgress?.[it.installToken]}.0%）</div>
                    ) : (
                      <YakitButton
                        type="text"
                        icon={<FolderOpenOutlined color="currentColor" />}
                        onClick={() => onOpenLocalFileByPath(it.InstallPath)}
                      >
                        打开
                      </YakitButton>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default memo(AllInstallPlugins)
