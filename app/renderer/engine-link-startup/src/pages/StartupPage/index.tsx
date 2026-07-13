import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useMemoizedFn, useUpdateEffect } from 'ahooks'
import {
  DragHeaderHeight,
  handleFetchArchitecture,
  handleFetchIsDev,
  handleFetchSystem,
  outputToWelcomeConsole,
  SystemInfo,
} from './utils'
import {
  grpcFetchBuildInYakVersion,
  grpcFetchLocalYakitVersion,
  grpcFetchYakInstallResult,
  grpcFixupDatabase,
  grpcInitCVEDatabase,
  grpcReclaimDatabaseSpace,
  grpcRelaunch,
  grpcUnpackBuildInYak,
  grpcWriteEngineKeyToYakitProjects,
} from './grpc'
import { debugToPrintLog } from '@/utils/logCollection'
import { LocalGVS } from '@/enums/yakitGV'
import {
  IgnoreYakit,
  LoadingClickExtra,
  ModalIsTop,
  System,
  TypeCallbackExtra,
  YakitStatusType,
  YaklangEngineMode,
  YaklangEngineWatchDogCredential,
} from './types'
import { getLocalValue, setLocalValue } from '@/utils/kv'
import useGetSetState from '@/hooks/useGetSetState'
import { yakitNotify } from '@/utils/notification'
import { YakitLoading } from './components/YakitLoading'
import { DownloadYaklang } from './components/DownloadYaklang'
import {
  FetchSoftwareVersion,
  GetConnectPort,
  getReleaseEditionName,
  isCommunityEdition,
  isCommunityIRify,
  isCommunityMemfit,
  isEnpriTrace,
  isEnpriTraceAgent,
  isEnpriTraceIRify,
  isIRify,
  isMemfit,
} from '@/utils/envfile'
import { RemoteEngine } from './components/RemoteEngine/RemoteEngine'
import { RemoteLinkInfo } from './components/RemoteEngine/RemoteEngineType'
import { StringToUint8Array } from '@/utils/str'
import { LocalEngine } from './components/LocalEngine'
import { LocalEngineLinkFuncProps, LocalLinkParams } from './components/LocalEngine/LocalEngineType'
import { EngineLog } from './components/EngineLog'
import emiter from '@/utils/eventBus/eventBus'
import { YaklangEngineWatchDog } from './components/YaklangEngineWatchDog'
import yakitEELogo from '@/assets/yakitEELogo.png'
import yakitEEDarkLogo from '@/assets/yakitEEDarkLogo.png'
import yakitSELogo from '@/assets/yakitSELogo.png'
import yakitSEDarkLogo from '@/assets/yakitSEDarkLogo.png'
import irifyRight from '@/assets/irify-right.png'
import yakitRight from '@/assets/yakit-right.png'
import memfitRight from '@/assets/memfit-right.webm'
import memfitRightDark from '@/assets/memfit-right-dark.webm'
import { SolidIrifyFontLogoIcon, SolidMemfitFontLogoIcon, SolidYakitFontLogoIcon } from '@/assets/colors'
import { useTheme } from '@/hooks/useTheme'
import { SoftwareBasics } from './components/SoftwareBasics'
import { yakitApp, yakitEngine } from '@/utils/electronBridge'
import { useYakitStatus } from '@/hooks/useYakitStatus'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import styles from './index.module.scss'

const DefaultCredential: YaklangEngineWatchDogCredential = {
  Host: '127.0.0.1',
  IsTLS: false,
  Password: '',
  PemBytes: undefined,
  Port: 0,
  Mode: undefined,
}

export const StartupPage: React.FC = () => {
  const { t, i18n } = useI18nNamespaces(['link'])
  /** 工作空间是否已确认（所有平台均需用户确认） */
  const [workspaceConfirmed, setWorkspaceConfirmed] = useState<boolean>(false)

  /** 是否置顶 */
  const [isTop, setIsTop] = useState<ModalIsTop>(0)
  /** 操作系统 */
  const [system, setSystem] = useState<System>('Darwin')
  /** 本地引擎自检输出日志 */
  const [checkLog, setCheckLog] = useState<string[]>([])
  /** 引擎是否安装 */
  const isEngineInstalled = useRef<boolean>(false)
  /** 内置引擎版本号 */
  const [buildInEngineVersion, setBuildInEngineVersion, getBuildInEngineVersion] = useGetSetState<string>('')
  /** 当前引擎模式 */
  const [engineMode, setEngineMode, getEngineMode] = useGetSetState<YaklangEngineMode>()
  const onSetEngineMode = useMemoizedFn((v?: YaklangEngineMode) => {
    setEngineMode(v)
    SystemInfo.mode = v
  })
  /** 是否为远程模式 */
  const isRemoteEngine = useMemo(() => engineMode === 'remote', [engineMode])
  /** 手动点击中断连接 */
  const breakHandleRef = useRef<boolean>(false)
  /** yakit使用状态 请用 safeSetYakitStatus 设置状态 */
  const { yakitStatus, getYakitStatus, safeSetYakitStatus } = useYakitStatus(breakHandleRef)
  /** 手动点击倒计时连接取消 */
  const cancelCountdownLinkRef = useRef<boolean>(false)
  /** 倒计时步数（2秒共4步，每0.5秒递减1） */
  const [countdown, setCountdown] = useState<number>(4)
  /** 倒计时定时器引用 */
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null)
  /** 当前引擎连接状态 */
  const [engineLink, setEngineLink, getEngineLink] = useGetSetState<boolean>(false)
  /** 是否阻止发送打开主窗口 */
  const isStopSend = useRef<boolean>(false)
  /** 是否初始启动连接 */
  const isInitLocalLink = useRef<boolean>(true)
  /** 是否检查版本更新 */
  const isCheckVersion = useRef<boolean>(true)
  // 本地连接ref
  const localEngineRef = useRef<LocalEngineLinkFuncProps>(null)
  /** 认证信息 */
  const [credential, setCredential, getCredential] = useGetSetState<YaklangEngineWatchDogCredential>({
    ...DefaultCredential,
  })
  /** 阻止接收主窗口发送过来的error状态 */
  const stopErrorStatusRef = useRef<boolean>(false)
  // 是否持续监听引擎进程的连接状态
  const [keepalive, setKeepalive, getKeepalive] = useGetSetState<boolean>(false)
  /** 本地连接自定义端口号 */
  const [customPort, setCustomPort, getCustomPort] = useGetSetState<number>(GetConnectPort())
  /** 主题 */
  const { theme, setTheme } = useTheme()

  // #region 工作空间确认回调
  const handleWorkspaceConfirmed = useMemoizedFn(() => {
    setWorkspaceConfirmed(true)
  })
  // #endregion

  // #region 软件启动主流程（单一入口）所有平台均需要用户确认工作空间
  /**
   * 获取基本信息
   * 1、操作系统类型（决定是否需要工作空间前置选择）
   * 2、是否开发环境
   * 3、架构
   */
  useEffect(() => {
    handleFetchSystem((sys) => {
      setSystem(sys || 'Windows_NT')
    })
    handleFetchIsDev()
    handleFetchArchitecture()
  }, [])

  // workspaceConfirmed 为 true 后，执行插件漏洞信息库自检 + 其他信息获取 + 连接引擎
  useEffect(() => {
    if (!workspaceConfirmed) return
    setCheckLog([t('StartupPage.checking_environment')])
    // 插件漏洞信息库自检（不阻塞主流程）
    handleBuiltInCheck()
    // 获取其他信息，完成后进入连接引擎模式
    handleFetchBaseInfo(() => {
      handleLinkEngineMode()
    })
  }, [workspaceConfirmed])
  // #endregion

  /** 插件漏洞信息库自检 */
  const handleBuiltInCheck = useMemoizedFn(() => {
    grpcInitCVEDatabase()
      .then(() => {
        yakitNotify('info', t('StartupPage.cve_db_check_complete'))
      })
      .catch((e: any) => {})
  })

  /**
   * 获取其他信息
   * 1、引擎是否存在
   * 2、内置引擎版本
   * 3、本地软件版本号、更新yak版本检测状态
   * 4、获取本地缓存连接端口号
   */
  const handleFetchBaseInfo = useMemoizedFn(async (nextFunc: () => void) => {
    debugToPrintLog(`------ 获取系统基础信息 ------`)
    const tasks: Array<() => Promise<any>> = []
    // 引擎 是否安装
    tasks.push(() =>
      grpcFetchYakInstallResult(true).then((isInstalled) => {
        isEngineInstalled.current = isInstalled
      }),
    )
    // 内置引擎版本
    tasks.push(() =>
      grpcFetchBuildInYakVersion(true).then((version) => {
        setBuildInEngineVersion(version)
      }),
    )
    // 新安装 Yakit ，引擎需检查更新
    tasks.push(() =>
      grpcFetchLocalYakitVersion(true).then((appVersion) => {
        return getLocalValue(LocalGVS.LocalAppVersion)
          .then((res) => {
            if (res !== appVersion) {
              setLocalValue(LocalGVS.NoYakVersionCheck, false)
              setLocalValue(LocalGVS.LocalAppVersion, appVersion)
            }
          })
          .catch(() => {})
      }),
    )
    // 获取本地缓存端口号
    tasks.push(() =>
      getCachedLocalModePort().then((port) => {
        if (typeof port === 'number') {
          setCustomPort(port)
        }
      }),
    )
    try {
      await Promise.allSettled(tasks.map((run) => run()))
    } catch (error) {}
    nextFunc?.()
  })

  const cacheLocalModePort = useMemoizedFn((port: number) => {
    if (getEngineMode() !== 'local') return
    if (isCommunityEdition()) {
      // ce
      if (isCommunityIRify()) {
        setLocalValue(LocalGVS.IrifyPort, port)
      } else if (isCommunityMemfit()) {
        setLocalValue(LocalGVS.MemfitPort, port)
      } else {
        setLocalValue(LocalGVS.YakitPort, port)
      }
    } else if (isEnpriTrace()) {
      // ee
      if (isEnpriTraceIRify()) {
        setLocalValue(LocalGVS.IrifyEEPort, port)
      } else if (isMemfit()) {
        // 暂时没有ai企业版
      } else {
        setLocalValue(LocalGVS.YakitEEPort, port)
      }
    } else if (isEnpriTraceAgent()) {
      // se
      setLocalValue(LocalGVS.SEPort, port)
    }
  })

  const getCachedLocalModePort = async (): Promise<number | undefined> => {
    if (isCommunityEdition()) {
      // CE
      if (isCommunityIRify()) {
        return getLocalValue(LocalGVS.IrifyPort)
      } else if (isCommunityMemfit()) {
        return getLocalValue(LocalGVS.MemfitPort)
      } else {
        return getLocalValue(LocalGVS.YakitPort)
      }
    } else if (isEnpriTrace()) {
      // EE
      if (isEnpriTraceIRify()) {
        return getLocalValue(LocalGVS.IrifyEEPort)
      } else if (isMemfit()) {
        return undefined
      } else {
        return getLocalValue(LocalGVS.YakitEEPort)
      }
    } else if (isEnpriTraceAgent()) {
      // SE
      return getLocalValue(LocalGVS.SEPort)
    }
  }

  /** 获取上次连接引擎的模式 */
  const handleLinkEngineMode = useMemoizedFn(() => {
    debugToPrintLog(`------ 获取上次连接引擎的模式 ------`)
    setCheckLog([t('StartupPage.fetching_last_engine_mode')])
    getLocalValue(LocalGVS.YaklangEngineMode).then((val: YaklangEngineMode) => {
      switch (val) {
        case 'remote':
          setCheckLog((arr) => arr.concat([t('StartupPage.fetch_mode_success_remote')]))
          debugToPrintLog(`------ 连接引擎的模式: remote ------`)
          handleChangeLinkMode(true)
          return
        case 'local':
          setCheckLog((arr) => arr.concat([t('StartupPage.fetch_mode_success_local')]))
          debugToPrintLog(`------ 连接引擎的模式: local ------`)
          handleChangeLinkMode()
          return
        default:
          setCheckLog((arr) => arr.concat([t('StartupPage.fetch_mode_default_local')]))
          debugToPrintLog(`------ 连接引擎的模式: local ------`)
          handleChangeLinkMode()
          return
      }
    })
  })

  // 切换连接模式
  const handleChangeLinkMode = useMemoizedFn((isRemote?: boolean) => {
    // 可能isRemoteEngine状态值没有变
    setTimeout(() => {
      setCheckLog([])
      if (!!isRemote) {
        handleLinkRemoteMode()
      } else {
        handleLinkLocalMode()
      }
    }, 500)
  })

  // 本地连接的两种模式
  const handleStartLocalLink = useMemoizedFn((isInit: boolean) => {
    debugToPrintLog(`------ 开始执行本地连接 ------`)
    if (isInit) {
      if (localEngineRef.current) localEngineRef.current.init(getCustomPort())
    } else {
      if (localEngineRef.current) localEngineRef.current.link(getCustomPort())
    }
  })

  // 切换远程模式
  const handleLinkRemoteMode = useMemoizedFn(() => {
    onDisconnect()
    safeSetYakitStatus('')
    onSetEngineMode('remote')
  })

  // 本地连接的状态设置
  const setLinkLocalEngine = useMemoizedFn(() => {
    onDisconnect()
    safeSetYakitStatus('')
    onSetEngineMode('local')
    debugToPrintLog(`------ 启动环境检查逻辑 ------`)
    // 等YakitStatus更新
    setTimeout(() => {
      handleStartLocalLink(isCheckVersion.current)
      isInitLocalLink.current = false
    }, 500)
  })

  // 切换本地模式
  const handleLinkLocalMode = useMemoizedFn(() => {
    if (isEngineInstalled.current) {
      if (!isInitLocalLink.current) {
        setLinkLocalEngine()
        return
      }
      setCheckLog([t('StartupPage.checking_local_engine_installed')])
      setCheckLog([t('StartupPage.local_engine_installed_preparing')])
      setTimeout(() => {
        setLinkLocalEngine()
      }, 500)
    } else {
      debugToPrintLog(`------ 启动无本地引擎逻辑 ------`)
      setCheckLog([t('StartupPage.checking_local_engine_installed')])
      setCheckLog([t('StartupPage.local_engine_not_found')])
      setTimeout(() => {
        safeSetYakitStatus(getBuildInEngineVersion() ? 'install' : 'installNetWork')
        onSetEngineMode(undefined)
      }, 500)
    }
  })
  // #endregion

  // #region Yak引擎、Yakit下载更新逻辑
  // 检测到新版yakit的弹窗显示
  const [yakitUpdate, setYakitUpdate] = useState<boolean>(false)
  /** 更多引擎列表 */
  const [moreYaklangVersionList, setMoreYaklangVersionList] = useState<string[]>([])
  const moreYaklangTime = useRef(null)
  /** 指定下载引擎版本 */
  const [yaklangSpecifyVersion, setYaklangSpecifyVersion] = useState<string>('')
  // 更新yaklang-modal
  const [yaklangDownload, setYaklangDownload] = useState<boolean>(false)
  const onDownloadedYaklang = useMemoizedFn((isOk: boolean) => {
    setYaklangDownload(false)
    const statusArr: YakitStatusType[] = ['installNetWork', 'skipAgreement_InstallNetWork', 'old_version']
    if (statusArr.includes(getYakitStatus())) {
      setRestartLoading(false)
      isCheckVersion.current = true
      if (!isOk) {
        return
      }
    } else {
      isCheckVersion.current = false
    }
    if (isOk) {
      isEngineInstalled.current = true
    }
    breakHandleRef.current = false
    setYaklangSpecifyVersion('')
    setLinkLocalEngine()
  })

  // yakit不再提示更新
  const noHintYakitUpdate = useMemoizedFn((ignoreYakit: IgnoreYakit) => {
    safeSetYakitStatus('')
    if (ignoreYakit === 'ignoreUpdates') {
      setLocalValue(LocalGVS.NoAutobootLatestVersionCheck, true)
    }
    if (localEngineRef.current) {
      localEngineRef.current.checkEngine()
    }
  })

  // yak不再提示更新
  const noHintYakUpdate = useMemoizedFn(() => {
    safeSetYakitStatus('')
    setLocalValue(LocalGVS.NoYakVersionCheck, true)
    if (localEngineRef.current) {
      localEngineRef.current.checkEngineSource()
    }
  })

  // 获取更多Yaklang引擎版本
  const fetchMoreYaklangLastVersion = useMemoizedFn(() => {
    yakitEngine
      .fetchYaklangVersionList()
      .then((data: string) => {
        const arr = data.split('\n').filter((v) => v)
        let devPrefix: string[] = []
        let noPrefix: string[] = []
        arr.forEach((item) => {
          if (item.startsWith('dev')) {
            devPrefix.push(item)
          } else {
            noPrefix.push(item)
          }
        })
        setMoreYaklangVersionList(noPrefix.concat(devPrefix))
      })
      .catch((err) => {
        setMoreYaklangVersionList([])
      })
  })
  useEffect(() => {
    // 出现更多版本按钮的情况、非连接状态，获取更多引擎列表，并启动定时器
    const statusArr: YakitStatusType[] = [
      'install',
      'installNetWork',
      'link_countdown',
      'link',
      'ready',
      'init',
      'reclaimDatabaseSpace_start',
    ]
    if (yakitStatus && !statusArr.includes(yakitStatus)) {
      if (moreYaklangTime.current) clearInterval(moreYaklangTime.current)
      fetchMoreYaklangLastVersion()
      moreYaklangTime.current = setInterval(fetchMoreYaklangLastVersion, 60000)
    } else {
      if (moreYaklangTime.current) {
        setMoreYaklangVersionList([])
        clearInterval(moreYaklangTime.current)
        moreYaklangTime.current = null
      }
    }
  }, [yakitStatus])
  useEffect(() => {
    return () => {
      if (moreYaklangTime.current) {
        setMoreYaklangVersionList([])
        clearInterval(moreYaklangTime.current)
      }
    }
  }, [])

  // 判断引擎版本没有问题，则直接安装，否则重新下载
  const yakEngineVersionExistsAndCorrectness = async (
    version: string,
    installSuccessCallback: () => void,
    installErrCallback: (err) => void,
    errCallback: () => void,
  ) => {
    try {
      const res = await yakitEngine.verifyYakEngineVersion(version)
      if (res === true) {
        // 清空主进程yaklang版本缓存
        yakitEngine.clearLocalYaklangVersionCache()
        yakitEngine
          .installYakEngine(version)
          .then(() => {
            yakitNotify('info', t('StartupPage.local_engine_version_found_install'))
            yakitNotify('success', t('StartupPage.install_success_restart_hint', { name: getReleaseEditionName() }))
            installSuccessCallback()
          })
          .catch((err: any) => {
            yakitNotify(
              'error',
              err.message.indexOf('operation not permitted') > -1
                ? t('StartupPage.install_failed_close_engine_retry')
                : t('StartupPage.install_failed', { message: String(err) }),
            )
            installErrCallback(err)
          })
      } else {
        errCallback && errCallback()
      }
    } catch (error) {
      errCallback && errCallback()
    }
  }
  // 下载指定版本引擎
  useUpdateEffect(() => {
    if (yaklangSpecifyVersion) {
      killCurrentProcess(() => {
        yakEngineVersionExistsAndCorrectness(
          yaklangSpecifyVersion,
          () => {
            setYaklangSpecifyVersion('')
            breakHandleRef.current = false
            isCheckVersion.current = false
            setLinkLocalEngine()
          },
          (err) => {
            setYaklangSpecifyVersion('')
            breakHandleRef.current = false
            isCheckVersion.current = false
            if (err.message === 'operation not permitted') {
              setLinkLocalEngine()
            } else {
              // 引擎文件已经被删除了
              safeSetYakitStatus('')
              handleOperations('install')
            }
          },
          () => {
            setYaklangDownload(true)
          },
        )
      }, [getCustomPort()])
    }
  }, [yaklangSpecifyVersion])
  // #endregion

  // #region YakitLoading逻辑
  // YakitLoading 界面暂时无法操作
  const [yakitLoadingTip, setYakitLoadingTip] = useState<string>('')
  const [disableYakitLoading, setDisableYakitLoading] = useState<boolean>(false)
  // 手动重连时按钮的loading
  const [restartLoading, setRestartLoading] = useState<boolean>(false)
  const setTimeoutLoading = useMemoizedFn((setLoading: (v: boolean) => any, time = 2000) => {
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
    }, time)
  })
  useEffect(() => {
    if (engineLink) {
      setRestartLoading(false)
    }
  }, [engineLink])
  // Loading页面切换引擎连接模式
  const loadingClickCallback = useMemoizedFn((type: YaklangEngineMode | YakitStatusType, extra?: LoadingClickExtra) => {
    switch (type) {
      case 'install':
        // 解压内置引擎
        initializeEngine(() => {
          setCheckLog([t('StartupPage.engine_unpack_success_relaunch', { version: getBuildInEngineVersion() })])
          grpcRelaunch()
        })
        return
      case 'installNetWork':
        // 一键安装（联网）
        setRestartLoading(true)
        setYaklangDownload(true)
        return
      case 'check_timeout':
        // 超时手动校验引擎
        setRestartLoading(true)
        handleStartLocalLink(isCheckVersion.current)
        return
      case 'port_occupied_prev':
        // 端口被占用前置操作
        if (extra?.killCurProcess) {
          setRestartLoading(true)
          killCurrentProcess(() => {
            handleStartLocalLink(isCheckVersion.current)
          }, [getCustomPort()])
        } else {
          safeSetYakitStatus('port_occupied')
        }
        return
      case 'port_occupied':
        // 端口被占用
        setRestartLoading(true)
        setCustomPort(extra.port)
        handleStartLocalLink(isCheckVersion.current)
        return
      case 'start_timeout':
        // 启动yak超时
        setTimeoutLoading(setRestartLoading, 5000)
        onStartLinkEngine()
        return
      case 'remote':
        handleLinkRemoteMode()
        return
      case 'local':
        handleLinkLocalMode()
        return
      case 'database_error':
      case 'fix_database_timeout':
        setRestartLoading(true)
        // 校验数据库出现错误或超时
        handleFixupDatabase()
        return
      case 'update_yakit':
        // 检测到新版本yakit
        if (extra?.downYakit) {
          setRestartLoading(true)
          setYakitUpdate(true)
        } else {
          noHintYakitUpdate(extra?.ignoreYakit)
        }
        return
      case 'update_yak':
        // 检测到当前版本低于内置版本
        if (extra?.downYak) {
          initializeEngine(() => {
            setCheckLog([t('StartupPage.engine_unpack_success', { version: getBuildInEngineVersion() })])
            if (localEngineRef.current) {
              localEngineRef.current.checkEngineSource(getBuildInEngineVersion())
            }
          })
        } else {
          noHintYakUpdate()
        }
        return
      case 'check_yak_version_error':
        // 引擎权限错误-手动重启引擎
        setRestartLoading(true)
        setLinkLocalEngine()
        return
      case 'error':
        // 引擎连接超时或意外断掉连接
        setTimeoutLoading(setRestartLoading)
        handleStartLocalLink(false)
        isCheckVersion.current = false
        setKeepalive(false)
        return
      case 'reclaimDatabaseSpace_success':
      case 'reclaimDatabaseSpace_error':
        // 回收数据库空间成功或者失败
        setRestartLoading(true)
        safeSetYakitStatus('')
        setTimeout(() => {
          handleStartLocalLink(isCheckVersion.current)
        }, 500)
        break
      case 'break':
        // 用户点中断连接 或 手动连接引擎
        if (extra?.linkAgain) {
          // 手动点倒计时取消，再点连接
          if (cancelCountdownLinkRef.current) {
            cancelCountdownLinkRef.current = false
            // 立即进入
            setEngineLink(true)
            safeSetYakitStatus('link')
          } else {
            breakHandleRef.current = false
            safeSetYakitStatus('')
            killCurrentProcess(() => {
              setTimeout(() => {
                handleStartLocalLink(isCheckVersion.current)
              }, 500)
            }, [getCustomPort()])
          }
        } else {
          // 否则执行断开
          outputToWelcomeConsole(t('StartupPage.manual_disconnect_triggered'))
          debugToPrintLog(`------ 手动触发中断连接 ------`)
          safeSetYakitStatus('break')
          onDisconnect()
          setCheckLog([t('StartupPage.disconnected_click_manual_connect')])
          breakHandleRef.current = true
          setYakitLoadingTip(t('StartupPage.interrupting'))
          setRestartLoading(false)
          setDisableYakitLoading(true)
          cancelAllTasks()
          setTimeout(() => {
            setYakitLoadingTip('')
            setDisableYakitLoading(false)
            if (extra.isRemote) {
              handleLinkRemoteMode()
            }
          }, 3000)
        }
        return
      case 'link_countdown':
        // 倒计时用户点击立即进入或取消
        clearCountDownTime()
        if (extra?.enterNow) {
          // 立即进入
          setEngineLink(true)
          safeSetYakitStatus('link')
        } else {
          cancelCountdownLinkRef.current = true
          safeSetYakitStatus('break')
        }
        return
      default:
        return
    }
  })

  // 在 3 秒内，不断尝试让主进程取消所有正在执行的任务
  const cancelAllTasks = async () => {
    const start = Date.now()
    while (Date.now() - start < 3000) {
      let res: any = null
      try {
        res = await yakitEngine.cancelAllTasks()
      } catch (e) {
        debugToPrintLog(`------ cancel-all-tasks failed: ${e}`)
      }
      if (!res || res.canceled === 0) {
        await new Promise((r) => setTimeout(r, 300))
      } else {
        await new Promise((r) => setTimeout(r, 500))
      }
    }
  }

  // 解压内置引擎
  const initializeEngine = useMemoizedFn((callback = () => {}) => {
    setCheckLog([t('StartupPage.preparing_unpack_builtin_engine', { version: getBuildInEngineVersion() })])
    setRestartLoading(true)
    setTimeout(async () => {
      try {
        await grpcUnpackBuildInYak(true)
        grpcWriteEngineKeyToYakitProjects({}, true).finally(() => {
          safeSetYakitStatus('')
          callback()
        })
      } catch (error) {
        setCheckLog([
          isInitLocalLink.current
            ? t('StartupPage.init_failed_download_engine')
            : t('StartupPage.unpack_failed_download_engine', { error }),
        ])
        safeSetYakitStatus(isInitLocalLink.current ? 'installNetWork' : 'skipAgreement_InstallNetWork')
      } finally {
        setRestartLoading(false)
      }
    }, 500)
  })

  // 数据库修复
  const [dbPath, setDbPath] = useState<string[]>([])
  const handleFixupDatabase = useMemoizedFn(async () => {
    setCheckLog([t('StartupPage.fixing_database')])
    try {
      const res = await grpcFixupDatabase({ softwareVersion: FetchSoftwareVersion() })
      setRestartLoading(false)
      if (res.ok && res.status === 'success') {
        setCheckLog((arr) => arr.concat([t('StartupPage.fix_database_success')]))
        safeSetYakitStatus('')
        setDbPath([])
        handleStartLocalLink(true)
        return
      }
      switch (res.status) {
        case 'timeout':
          setCheckLog((arr) => arr.concat([t('StartupPage.command_timeout_check_log')]))
          safeSetYakitStatus('fix_database_timeout')
          break
        default:
          setDbPath(res.json.path)
          setCheckLog([t('StartupPage.fix_database_failed_contact_staff')])
          safeSetYakitStatus('fix_database_error')
      }
    } catch (error) {
      // 如果意外情况则按照修复失败处理
      outputToWelcomeConsole(t('StartupPage.fix_database_unexpected_console', { error }))
      setCheckLog([t('StartupPage.fix_database_unexpected_check_log')])
      safeSetYakitStatus('fix_database_error')
    }
  })

  // 回收数据库空间
  const reclaimDbSpacePath = useRef<string[]>([])
  const handleReclaimDatabaseSpace = useMemoizedFn(async () => {
    const allDb = reclaimDbSpacePath.current.length === 0
    setCheckLog([
      allDb ? t('StartupPage.reclaiming_all_database') : t('StartupPage.reclaiming_database'),
      t('StartupPage.reclaiming_database_warning'),
    ])
    try {
      const res = await grpcReclaimDatabaseSpace({ dbPath: reclaimDbSpacePath.current })
      setRestartLoading(false)
      if (res.ok && res.status === 'success') {
        setCheckLog([t('StartupPage.reclaim_database_success')])
        safeSetYakitStatus('reclaimDatabaseSpace_success')
        return
      }
      setCheckLog([t('StartupPage.reclaim_database_failed_contact_staff')])
      safeSetYakitStatus('reclaimDatabaseSpace_error')
    } catch (error) {
      // 如果意外情况，重新连接引擎
      outputToWelcomeConsole(t('StartupPage.reclaim_database_unexpected_console', { error }))
      setCheckLog([t('StartupPage.reclaim_database_unexpected_check_log')])
      safeSetYakitStatus('reclaimDatabaseSpace_error')
    }
  })
  // #endregion

  const killCurrentProcess = useMemoizedFn((callback: () => void, extraPorts?: number[]) => {
    // ---------- 1. PS 查询所有 yak 进程 ----------
    yakitEngine
      .listYakGrpc()
      .then(async (res) => {
        // 查找 PID
        const pidsToKill = res
          .filter((p) => extraPorts.includes(Number(p.port)))
          .map((p) => p.pid)
          .filter(Boolean)

        if (pidsToKill.length === 0) {
          callback()
          return
        }

        // ---------- 2. kill ----------
        for (const pid of pidsToKill) {
          try {
            await yakitEngine.killYakGrpc(pid)
            yakitNotify('info', `KILL yak PROCESS: ${pid}`)
          } catch (err) {
            yakitNotify('error', `Kill yak process failed: ${err}`)
          }
        }

        callback()
      })
      .catch(() => {
        callback()
      })
  })

  // #region 远程连接&本地连接
  const [remoteLinkLoading, setRemoteLinkLoading] = useState<boolean>(false)
  // 开始远程连接引擎
  const handleLinkRemoteEngine = useMemoizedFn((info: RemoteLinkInfo) => {
    breakHandleRef.current = false
    cancelCountdownLinkRef.current = false
    safeSetYakitStatus('')
    setTimeoutLoading(setRemoteLinkLoading)
    setCredential({
      Host: info.host,
      IsTLS: info.tls,
      Password: info.tls ? info.password : '',
      PemBytes: StringToUint8Array(info.tls ? info.caPem || '' : ''),
      Port: parseInt(info.port),
      Mode: 'remote',
    })
    onStartLinkEngine()
  })
  // 远程切换本地
  const handleRemoteToLocal = useMemoizedFn(() => {
    breakHandleRef.current = false
    cancelCountdownLinkRef.current = false
    setCheckLog([])
    onSetEngineMode(undefined)
    handleChangeLinkMode()
  })

  // 开始本地连接引擎
  const handleLinkLocalEngine = useMemoizedFn((params: LocalLinkParams) => {
    debugToPrintLog(`------ 开始启动引擎, 指定端口: ${params.port} ------`)
    setCheckLog([t('StartupPage.local_engine_starting_with_port', { port: params.port })])
    setCredential({
      Host: '127.0.0.1',
      IsTLS: false,
      Password: params.secret || '',
      PemBytes: undefined,
      Port: params.port,
      Mode: 'local',
    })
    safeSetYakitStatus('ready')
    onStartLinkEngine()
  })

  // 断开连接
  const onDisconnect = useMemoizedFn(() => {
    setCredential({ ...DefaultCredential })
    setKeepalive(false)
    setEngineLink(false)
  })

  // 安全设置 keepalive，当手动点中断连接的时候，不需要再探测引擎是否存活
  const safeSetKeepalive = useMemoizedFn((value: boolean) => {
    if (breakHandleRef.current) {
      return
    }
    setKeepalive(value)
  })

  // 开始连接引擎
  const onStartLinkEngine = useMemoizedFn(() => {
    isStopSend.current = false
    setTimeout(() => {
      emiter.emit('startAndCreateEngineProcess')
    }, 100)
  })
  // #endregion

  /**
   * 启动引擎进程的监听，用于显示启动进程错误时的报错信息
   */
  useEffect(() => {
    const offStartEngineError = yakitEngine.onStartYaklangEngineError((error: string) => {
      setCheckLog((arr) => arr.concat([`${error}`]))
    })
    return () => {
      offStartEngineError()
    }
  }, [])

  // #region 连接成功
  const onReady = useMemoizedFn(() => {
    const statusArr: YakitStatusType[] = ['break', 'link_countdown', 'link']
    if (statusArr.includes(getYakitStatus())) {
      return
    }
    if (getKeepalive()) {
      setCheckLog([])
      if (getEngineMode() === 'local') {
        // 先设置倒计时状态
        safeSetYakitStatus('link_countdown')
        setCountdown(4)
        // 清除之前的定时器
        clearCountDownTime()
        // 2 秒倒计时，每 0.5 秒递减一次（共 4 步）
        let currentCount = 4
        countdownTimerRef.current = setInterval(() => {
          currentCount -= 1
          setCountdown(currentCount)

          if (currentCount <= 0) {
            clearCountDownTime()
            if (getYakitStatus() === 'link_countdown') {
              safeSetYakitStatus('link')
              setEngineLink(true)
            }
          }
        }, 500)
      } else {
        safeSetYakitStatus('link')
        setEngineLink(true)
      }
    }
  })

  // 清理倒计时定时器
  const clearCountDownTime = useMemoizedFn(() => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current)
      countdownTimerRef.current = null
    }
  })
  useEffect(() => {
    return () => {
      clearCountDownTime()
    }
  }, [])

  // 引擎连接成功发送数据到主界面
  useEffect(() => {
    if (engineLink && getYakitStatus() === 'link' && getCredential().Port && !isStopSend.current) {
      yakitApp.completeEngineLink({ credential: getCredential() })
    }
  }, [engineLink, yakitStatus])

  // 主界面远程连接引擎更新认证信息
  useEffect(() => {
    const offCredentialUpdate = yakitApp.onCredentialUpdate((data) => {
      const credential = data.credential
      setCredential(credential)
      onSetEngineMode(credential.Mode)
      isStopSend.current = true
    })
    return () => {
      offCredentialUpdate()
    }
  }, [])

  /**
   * 1、清空日志信息|将远程连接loading置为false(不管是不是远程连接)|
   * 2、执行连接成功的外界回调事件
   * 3、连接成功缓存连接模式
   * 4、开启引擎文件的存在监控
   */
  useEffect(() => {
    if (engineLink) {
      setCheckLog([])
      setRemoteLinkLoading(false)

      stopErrorStatusRef.current = false

      setLocalValue(LocalGVS.YaklangEngineMode, getEngineMode())

      // 缓存连接端口
      cacheLocalModePort(+getCredential().Port || +getCustomPort() || GetConnectPort())

      const waitTime: number = 5000
      const id = setInterval(() => {
        grpcFetchYakInstallResult(true)
          .then((flag: boolean) => {
            if (isEngineInstalled.current === flag) return
            isEngineInstalled.current = flag
            isInitLocalLink.current = true
            isCheckVersion.current = true
            breakHandleRef.current = false
            cancelCountdownLinkRef.current = false
            // 清空主进程yaklang版本缓存
            yakitEngine.clearLocalYaklangVersionCache()
          })
          .catch(() => {})

        grpcFetchBuildInYakVersion(true)
          .then((version) => {
            setBuildInEngineVersion(version)
          })
          .catch(() => {})
      }, waitTime)
      return () => {
        clearInterval(id)
      }
    } else {
      // 清空主进程yaklang版本缓存
      yakitEngine.clearLocalYaklangVersionCache()
    }
  }, [engineLink])
  // #endregion

  const onFailed = useMemoizedFn((count) => {
    // 10以上的次数属于无效次数
    if (count > 10) {
      setKeepalive(false)
      return
    }

    debugToPrintLog(`[INFO] 目标引擎进程不存在: 探活失败${count}次`)
    setEngineLink(false)

    if (getYakitStatus() === 'error' && count === 10) {
      // 连接断开后的10次尝试过后，不在进行尝试
      setCheckLog([t('StartupPage.click_manual_connect_retry')])
      return
    }

    // 连接中触发
    if (getYakitStatus() === 'link') {
      if (getEngineMode() === 'remote') {
        yakitNotify('error', t('StartupPage.remote_connection_disconnected'))
        handleLinkRemoteMode()
      } else if (getEngineMode() === 'local') {
        setCheckLog([t('StartupPage.engine_reconnecting')])
        if (count > 4) {
          safeSetYakitStatus('error')
        }
      }
    }
  })

  // 主界面发送有关引擎操作的信息到连接界面
  useEffect(() => {
    const offFromMainWindow = yakitApp.onFromMainWindow((data) => {
      const type = data.yakitStatus
      if (type) {
        handleOperations(type, data)
      }
    })
    return () => {
      offFromMainWindow()
    }
  }, [])
  const handleOperations = useMemoizedFn((type: YakitStatusType | YaklangEngineMode, extra?: TypeCallbackExtra) => {
    switch (type) {
      case 'skipAgreement_InstallNetWork': // 小风车重置引擎失败
        setCheckLog([
          t('StartupPage.unpack_failed_download_engine', {
            error: extra?.message || t('StartupPage.unknown_reason'),
          }),
        ])
        onDisconnect()
        onSetEngineMode(undefined)
        if (isInitLocalLink.current) {
          safeSetYakitStatus('installNetWork')
        } else {
          safeSetYakitStatus('skipAgreement_InstallNetWork')
        }
        break
      case 'break': // 主动中断连接 或 小风车断开引擎
        safeSetYakitStatus('break')
        onDisconnect()
        setCheckLog([t('StartupPage.disconnected_click_manual_connect')])
        break
      case 'reclaimDatabaseSpace_start':
        stopErrorStatusRef.current = true
        reclaimDbSpacePath.current = extra?.dbPath || []
        onDisconnect()
        safeSetYakitStatus('reclaimDatabaseSpace_start')
        handleReclaimDatabaseSpace()
        break
      case 'install': // 下载的yaklang时候，或切换本地时 --- 本地引擎不存在
        onDisconnect()
        isEngineInstalled.current = false
        setTimeout(() => {
          handleLinkLocalMode()
        }, 500)
        return
      case 'installNetWork':
        onDisconnect()
        onSetEngineMode(undefined)
        safeSetYakitStatus('skipAgreement_InstallNetWork')
        return
      case 'error':
        if (stopErrorStatusRef.current) return
        setEngineLink(false)
        safeSetYakitStatus('error')
        break
      case 'local':
        onDisconnect()
        onSetEngineMode(undefined)
        isCheckVersion.current = false
        setTimeout(() => {
          handleLinkLocalMode()
        }, 500)
        break
      case 'remote':
        setTimeout(() => {
          handleLinkRemoteMode()
        }, 500)
        break
      default:
        break
    }
  })

  const startupLogo = useMemo(() => {
    // ce
    if (isCommunityEdition()) {
      if (isCommunityIRify()) {
        return { type: 'svg', component: SolidIrifyFontLogoIcon, width: 112, height: 41 }
      } else if (isCommunityMemfit()) {
        return { type: 'svg', component: SolidMemfitFontLogoIcon, width: 112, height: 41 }
      } else {
        return { type: 'svg', component: SolidYakitFontLogoIcon, width: 112, height: 41 }
      }
    }

    // ee
    if (isEnpriTrace()) {
      if (isEnpriTraceIRify()) {
        return { type: 'svg', component: SolidIrifyFontLogoIcon, width: 112, height: 41 }
      } else if (isMemfit()) {
        return { type: 'svg', component: SolidMemfitFontLogoIcon, width: 112, height: 41 }
      } else {
        return { type: 'img', src: theme === 'light' ? yakitEELogo : yakitEEDarkLogo, width: 137, height: 40 }
      }
    }

    // se
    if (isEnpriTraceAgent()) {
      return { type: 'img', src: theme === 'light' ? yakitSELogo : yakitSEDarkLogo, width: 190, height: 40 }
    }

    return { type: 'svg', component: SolidYakitFontLogoIcon, width: 112, height: 41 }
  }, [theme])

  const startupRightImg = useMemo(() => {
    if (isIRify()) {
      return <img src={irifyRight} alt={t('StartupPage.no_image')} />
    }
    if (isCommunityMemfit() || isMemfit())
      return (
        <video src={theme === 'light' ? memfitRight : memfitRightDark} autoPlay loop muted playsInline preload="auto" />
      )
    return <img src={yakitRight} alt={t('StartupPage.no_image')} />
  }, [theme, i18n.language])

  return (
    <div className={styles['startup-wrapper']}>
      <div className={styles['startup-header-drap']} style={{ height: DragHeaderHeight }}></div>
      <div className={styles['startup-wrapper-left']}>
        <div className={styles['startup-title']}>
          <div className={styles['startup-logo']}>
            {startupLogo.type === 'img' ? (
              <img
                src={startupLogo.src}
                alt={t('StartupPage.no_image')}
                width={startupLogo.width}
                height={startupLogo.height}
              />
            ) : (
              <startupLogo.component style={{ height: startupLogo.height, width: startupLogo.width }} />
            )}
          </div>
          <div className={styles['startup-desc']}>{t('StartupPage.born_for_cybersecurity')}</div>
        </div>
        <YaklangEngineWatchDog
          credential={credential}
          keepalive={keepalive}
          engineLink={engineLink}
          onKeepaliveShouldChange={safeSetKeepalive}
          onReady={onReady}
          onFailed={onFailed}
          yakitStatus={yakitStatus}
          setYakitStatus={safeSetYakitStatus}
          setCheckLog={setCheckLog}
        />

        {/* 工作空间选择前置步骤 */}
        {!workspaceConfirmed ? (
          <div className={styles['startup-content-wrapper']}>
            <SoftwareBasics softTheme={theme} setSoftTheme={setTheme} onConfirm={handleWorkspaceConfirmed} />
          </div>
        ) : (
          <>
            <div className={styles['startup-engine-log']} style={{ display: isRemoteEngine ? 'none' : 'block' }}>
              <EngineLog />
            </div>
            {!isRemoteEngine ? (
              <div className={styles['startup-content-wrapper']}>
                <LocalEngine
                  ref={localEngineRef}
                  setLog={setCheckLog}
                  onLinkEngine={handleLinkLocalEngine}
                  yakitStatus={yakitStatus}
                  setYakitStatus={safeSetYakitStatus}
                  buildInEngineVersion={buildInEngineVersion}
                  setRestartLoading={setRestartLoading}
                  yakitUpdate={yakitUpdate}
                  setYakitUpdate={setYakitUpdate}
                />
                {!engineLink && (
                  <>
                    <YakitLoading
                      yakitLoadingTip={yakitLoadingTip}
                      disableYakitLoading={disableYakitLoading}
                      isTop={isTop}
                      setIsTop={setIsTop}
                      system={system}
                      buildInEngineVersion={buildInEngineVersion}
                      checkLog={checkLog}
                      yakitStatus={yakitStatus}
                      engineMode={engineMode || 'local'}
                      restartLoading={restartLoading}
                      dbPath={dbPath}
                      btnClickCallback={loadingClickCallback}
                      port={customPort}
                      countdown={countdown}
                      moreYaklangVersionList={moreYaklangVersionList}
                      setYaklangSpecifyVersion={setYaklangSpecifyVersion}
                    />
                    {/* 更新引擎 */}
                    {yaklangDownload && (
                      <DownloadYaklang
                        isTop={isTop}
                        setIsTop={setIsTop}
                        yaklangSpecifyVersion={yaklangSpecifyVersion}
                        system={system}
                        visible={yaklangDownload}
                        onCancel={onDownloadedYaklang}
                      />
                    )}
                  </>
                )}
              </div>
            ) : (
              <>
                {!engineLink && (
                  <RemoteEngine
                    loading={remoteLinkLoading}
                    setLoading={setRemoteLinkLoading}
                    onSubmit={handleLinkRemoteEngine}
                    onSwitchLocalEngine={handleRemoteToLocal}
                  />
                )}
              </>
            )}
          </>
        )}
      </div>
      <div className={styles['startup-wrapper-right']}>{startupRightImg}</div>
    </div>
  )
}
