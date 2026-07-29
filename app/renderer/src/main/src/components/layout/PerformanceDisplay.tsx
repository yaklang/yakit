import React, { useState, useEffect, useRef, useMemo } from 'react'
import { failed, info, success, yakitNotify } from '@/utils/notification'
import { YaklangEngineMode } from '@/yakitGVDefine'
import { LoadingOutlined } from '@ant-design/icons'
import { useInViewport, useMemoizedFn } from 'ahooks'
import { Sparklines, SparklinesCurve } from 'react-sparklines'
import { YakitButton } from '../yakitUI/YakitButton/YakitButton'
import { YakitPopover } from '../yakitUI/YakitPopover/YakitPopover'
import { YakitTag } from '../yakitUI/YakitTag/YakitTag'
import { CheckedSvgIcon, GooglePhotosLogoSvgIcon } from './icons'
import { YaklangEngineWatchDogCredential } from '@/components/layout/YaklangEngineWatchDog'
import { useRunNodeStore } from '@/store/runNode'
import emiter from '@/utils/eventBus/eventBus'
import { useTemporaryProjectStore } from '@/store/temporaryProject'
import { getReleaseEditionName, isEnpriTraceAgent } from '@/utils/envfile'
import { showYakitModal } from '../yakitUI/YakitModal/YakitModalConfirm'
import { YakitPopconfirm } from '../yakitUI/YakitPopconfirm/YakitPopconfirm'
import classNames from 'classnames'
import styles from './performanceDisplay.module.scss'
import { yakitDynamicStatus } from '@/store'
import { remoteOperation } from '@/pages/dynamicControl/DynamicControl'
import { yakitApp, yakitEngine, yakitPerf, yakitUILayout } from '@/services/electronBridge'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'

interface PerformanceDisplayProps {
  engineMode: YaklangEngineMode | undefined
  typeCallback: (type: 'break') => any
  engineLink: boolean
  cpuWrapperClassName: Record<string, boolean>
}

export const PerformanceDisplay: React.FC<PerformanceDisplayProps> = React.memo((props) => {
  // cpu和内存可视图数据
  const [cpu, setCpu] = useState<number[]>([])

  const [showLine, setShowLine] = useState<boolean>(true)
  const showLineTime = useRef<any>(null)

  useEffect(() => {
    yakitPerf.startComputePercent()
    const time = setInterval(() => {
      yakitPerf.fetchComputePercent().then((res) => setCpu(res))
    }, 500)

    return () => {
      clearInterval(time)
      yakitPerf.clearComputePercent()
    }
  }, [])

  const onWinResize = (e: UIEvent) => {
    if (showLineTime.current) clearTimeout(showLineTime.current)
    showLineTime.current = setTimeout(() => {
      if (document) {
        const header = document.getElementById('yakit-header')
        if (header) {
          setShowLine(header.clientWidth >= 1000)
        }
      }
    }, 100)
  }

  useEffect(() => {
    if (window) {
      window.addEventListener('resize', onWinResize)
      return () => {
        window.removeEventListener('resize', onWinResize)
        if (showLineTime.current) clearTimeout(showLineTime.current)
        showLineTime.current = null
      }
    }
  }, [])

  const [rps, setRps] = useState<number>(0)
  const onRefreshCurRps = (rps: number) => {
    setRps(rps)
  }
  useEffect(() => {
    emiter.on('onRefreshCurRps', onRefreshCurRps)
    return () => {
      emiter.off('onRefreshCurRps', onRefreshCurRps)
    }
  }, [])

  return (
    <div className={styles['system-func-wrapper']}>
      <div className={classNames(styles['cpu-wrapper'], props.cpuWrapperClassName)}>
        <div className={styles['cpu-title']}>
          <span className={styles['title-headline']}>RPS </span>
          <span className={styles['title-content']}>{rps}</span>
        </div>

        <div className={styles['cpu-title']}>
          <span className={styles['title-headline']}> CPU </span>
          <span className={styles['title-content']}>{`${cpu[cpu.length - 1] || 0}%`}</span>
        </div>

        {showLine && (
          <div className={styles['cpu-spark']}>
            <Sparklines data={cpu} width={50} height={10} max={50}>
              <SparklinesCurve color="#85899E" />
            </Sparklines>
          </div>
        )}
      </div>
      <UIEngineList {...props} />
    </div>
  )
})

export interface yakProcess {
  port: number
  pid: number
  ppid?: number
  cmd: string
  origin: any
}

interface UIEngineListProp {
  engineMode: YaklangEngineMode | undefined
  typeCallback: (type: 'break') => any
  engineLink: boolean
}

/** @name 已启动引擎列表 */
const UIEngineList: React.FC<UIEngineListProp> = React.memo((props) => {
  const { engineMode, typeCallback, engineLink } = props
  const { t } = useI18nNamespaces(['layout', 'yakitUi'])

  const [show, setShow] = useState<boolean>(false)

  const listRef = useRef(null)
  const [inViewport] = useInViewport(listRef)

  const [psLoading, setPSLoading] = useState<boolean>(false)
  const [process, setProcess] = useState<yakProcess[]>([])
  const { runNodeList } = useRunNodeStore()
  const [port, setPort] = useState<number>(0)

  const fetchPSList = useMemoizedFn(() => {
    if (psLoading) return

    setPSLoading(true)
    yakitEngine
      .listYakGrpc()
      .then((i: yakProcess[]) => {
        const valuesArray = Array.from(runNodeList.values())
        // 过滤掉运行节点
        setProcess(
          i
            .filter((item) => !valuesArray.includes(item.pid.toString()))
            .map((element: yakProcess) => {
              return {
                port: element.port,
                pid: element.pid,
                cmd: element.cmd,
                origin: element.origin,
              }
            }),
        )
      })
      .catch((e) => {
        failed(`PS | GREP yak failed ${e}`)
      })
      .finally(() => {
        setPSLoading(false)
      })
  })
  const fetchCurrentPort = () => {
    yakitEngine
      .fetchYaklangEngineAddr()
      .then((data) => {
        const hosts: string[] = (data.addr as string).split(':')
        if (hosts.length !== 2) return
        if (+hosts[1]) setPort(+hosts[1] || 0)
      })
      .catch(() => {})
  }
  useEffect(() => {
    if (inViewport) {
      fetchPSList()
      fetchCurrentPort()

      let id = setInterval(() => {
        fetchPSList()
        fetchCurrentPort()
      }, 3000)
      return () => {
        clearInterval(id)
      }
    }
  }, [inViewport])

  const allClose = useMemoizedFn(async () => {
    await delTemporaryProject()
    ;(process || []).forEach((i) => {
      yakitEngine.killYakGrpc(i.pid).then((val) => {
        if (!val) {
          info(`KILL yak PROCESS: ${i.pid}`)
          if (+i.port === port && isLocal) typeCallback('break')
        }
      })
    })
    setTimeout(() => success(t('PerformanceDisplay.engineProcessesClosing')), 1000)
  })

  const isLocal = useMemo(() => {
    return engineMode === 'local'
  }, [engineMode])

  const { delTemporaryProject } = useTemporaryProjectStore()
  const { dynamicStatus } = yakitDynamicStatus()

  return (
    <YakitPopover
      visible={show}
      overlayClassName={classNames(styles['ui-op-dropdown'], styles['ui-engine-list-dropdown'])}
      placement={'bottomRight'}
      content={
        <div ref={listRef} className={styles['ui-engine-list-wrapper']}>
          <div className={styles['ui-engine-list-body']}>
            <div className={styles['engine-list-header']}>
              {t('PerformanceDisplay.localYakProcessManagement')}
              <YakitPopconfirm
                title={t('PerformanceDisplay.resetEngineVersionNotice')}
                onConfirm={async () => {
                  if (dynamicStatus.isDynamicStatus) {
                    yakitNotify('warning', t('PerformanceDisplay.remoteControlClosing'))
                    await remoteOperation(false, dynamicStatus)
                  }
                  await delTemporaryProject()
                  process.map((i) => {
                    yakitEngine.killYakGrpc(i.pid)
                  })
                  yakitEngine
                    .restoreEngineAndPlugin({})
                    .finally(() => {
                      yakitEngine.writeEngineKeyToYakitProjects().finally(() => {
                        info(t('PerformanceDisplay.restoreEngineSuccess'))
                        yakitApp.relaunch()
                      })
                    })
                    .catch((e) => {
                      failed(t('PerformanceDisplay.restoreEngineFailed', { error: e }))
                    })
                }}
              >
                <YakitButton style={{ marginLeft: 8 }}>{t('PerformanceDisplay.resetEngineVersion')}</YakitButton>
              </YakitPopconfirm>
              {psLoading && <LoadingOutlined className={styles['loading-icon']} />}
            </div>
            <div className={styles['engine-list-container']}>
              {process.map((i) => {
                return (
                  <div key={i.pid} className={styles['engine-list-opt']}>
                    <div className={styles['left-body']}>
                      <YakitTag color={isLocal && +i.port === port && engineLink ? 'success' : undefined}>
                        {`PID: ${i.pid}`}
                        {isLocal && +i.port === port && engineLink && <CheckedSvgIcon style={{ marginLeft: 8 }} />}
                      </YakitTag>
                      <div className={styles['engine-ps-info']}>
                        {`yak grpc --port ${i.port === 0 ? t('PerformanceDisplay.fetching') : i.port}`}
                        &nbsp;
                        {isLocal && +i.port === port && engineLink && (
                          <span className={styles['current-ps-info']}>{t('PerformanceDisplay.current')}</span>
                        )}
                      </div>
                    </div>
                    <div className={styles['right-body']}>
                      <YakitButton
                        type="text"
                        onClick={() => {
                          setShow(false)
                          showYakitModal({
                            title: (modalT) => modalT('PerformanceDisplay.yakProcessDetails'),
                            content: <div style={{ padding: 8 }}>{JSON.stringify(i)}</div>,
                            footer: null,
                          })
                        }}
                      >
                        Details
                      </YakitButton>

                      <YakitPopconfirm
                        title={<>{t('PerformanceDisplay.switchEngineConfirm')}</>}
                        onConfirm={async () => {
                          let oldPort = port
                          if (+i.port !== oldPort) {
                            await delTemporaryProject()
                          }
                          const switchEngine: YaklangEngineWatchDogCredential = {
                            Mode: 'local',
                            Port: i.port,
                            Host: '127.0.0.1',
                          }
                          yakitUILayout.setSwitchConnectionRefresh(true)
                          yakitEngine
                            .connectYaklangEngine(switchEngine)
                            .then(() => {
                              setTimeout(() => {
                                success(t('PerformanceDisplay.switchCoreEngineSuccess'))
                                if (!isEnpriTraceAgent() && +i.port !== oldPort) {
                                  emiter.emit('onSwitchEngine')
                                }
                                yakitUILayout.setSwitchConnectionRefresh(false)
                              }, 500)
                            })
                            .catch((e) => {
                              failed(t('PerformanceDisplay.switchEngineFailed'))
                              if (isLocal) {
                                process.forEach((item) => {
                                  if (item.port == oldPort) {
                                    yakitEngine
                                      .killYakGrpc(item.pid)
                                      .then((val) => {
                                        if (!val) {
                                          success(t('PerformanceDisplay.engineProcessesClosing'))
                                          yakitUILayout.setSwitchConnectionRefresh(false)
                                          typeCallback('break')
                                        }
                                      })
                                      .catch((e: any) => {})
                                      .finally(fetchPSList)
                                  }
                                })
                              }
                            })
                        }}
                      >
                        <YakitButton
                          type="outline1"
                          colors="success"
                          disabled={+i.port === 0 || (isLocal && +i.port === port)}
                        >
                          {t('PerformanceDisplay.switchEngine')}
                        </YakitButton>
                      </YakitPopconfirm>
                      <YakitPopconfirm
                        title={
                          <>
                            {t('PerformanceDisplay.closeEngineConfirm1')}
                            <br />
                            {t('PerformanceDisplay.closeEngineConfirm2', { edition: getReleaseEditionName() })}
                            <br />
                            {t('PerformanceDisplay.closeEngineConfirm3')}
                          </>
                        }
                        onConfirm={async () => {
                          if (+i.port === port) {
                            await delTemporaryProject()
                          }

                          yakitEngine
                            .killYakGrpc(i.pid)
                            .then((val) => {
                              if (!val) {
                                isLocal && +i.port === port && typeCallback('break')
                                success(t('PerformanceDisplay.engineProcessesClosing'))
                              }
                            })
                            .catch((e: any) => {})
                            .finally(fetchPSList)
                        }}
                      >
                        <YakitButton type="outline1" colors="danger">
                          {t('PerformanceDisplay.closeEngine')}
                        </YakitButton>
                      </YakitPopconfirm>
                    </div>
                  </div>
                )
              })}
            </div>
            <div className={styles['engine-list-footer']}>
              <div></div>
              <YakitPopconfirm
                title={
                  <div style={{ width: 330 }}>
                    {t('PerformanceDisplay.closeEngineConfirm1')}
                    <br />
                    {t('PerformanceDisplay.closeEngineConfirm2', { edition: getReleaseEditionName() })}
                    <br />
                    {t('PerformanceDisplay.closeEngineConfirm3')}
                  </div>
                }
                onConfirm={() => allClose()}
              >
                <div className={styles['engine-list-footer-btn']}>{t('YakitButton.closeAll')}</div>
              </YakitPopconfirm>
            </div>
          </div>
        </div>
      }
      onVisibleChange={(visible) => setShow(visible)}
    >
      <div className={styles['ui-op-btn-wrapper']}>
        <div className={classNames(styles['op-btn-body'], { [styles['op-btn-body-hover']]: show })}>
          <GooglePhotosLogoSvgIcon className={classNames({ [styles['icon-rotate-animation']]: !show })} />
        </div>
      </div>
    </YakitPopover>
  )
})
