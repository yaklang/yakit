import { forwardRef, memo, useEffect, useImperativeHandle, useRef } from 'react'
import { AllowSecretLocalJson, LocalEngineProps } from './LocalEngineType'
import { useMemoizedFn } from 'ahooks'
import { debugToPrintLog } from '@/utils/logCollection'
import {
  grpcCheckAllowSecretLocal,
  grpcFetchBuildInYakVersion,
  grpcFetchLatestYakitVersion,
  grpcFetchLocalYakitVersion,
  grpcFetchLocalYakVersion,
  grpcFetchLocalYakVersionHash,
  grpcFetchSpecifiedYakVersionHash,
} from '../../grpc'
import { FetchSoftwareVersion, getReleaseEditionName, isCommunityYakit, isEnpriTraceAgent } from '@/utils/envfile'
import { yakitNotify } from '@/utils/notification'
import { SystemInfo } from '../../utils'
import { getLocalValue } from '@/utils/kv'
import { LocalGVS } from '@/enums/yakitGV'
import { UpdateYakitHint } from '../UpdateYakitHint'
import { yakitEngine } from '@/utils/electronBridge'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'

function compare(a: string, b: string) {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
}

export const LocalEngine: React.FC<LocalEngineProps> = memo(
  forwardRef((props, ref) => {
    const {
      setLog,
      onLinkEngine,
      yakitStatus,
      setYakitStatus,
      buildInEngineVersion,
      setRestartLoading,
      yakitUpdate,
      setYakitUpdate,
    } = props
    const { t } = useI18nNamespaces(['link'])
    // check Json
    const allowSecretLocalJson = useRef<AllowSecretLocalJson>(null)
    // 本地 yakit 版本
    const currentYakit = useRef<string>('')
    // 最新 yakit 版本
    const latestYakit = useRef<string>('')
    // 内置引擎版本
    const buildInYak = useRef<string>('')
    // 本地引擎版本
    const currentYak = useRef<string>('')

    const yakitStatusRef = useRef(yakitStatus)
    useEffect(() => {
      yakitStatusRef.current = yakitStatus
    }, [yakitStatus])

    const latestCheckCallIdRef = useRef(0)
    const handleAllowSecretLocal = useMemoizedFn(async (port: number, checkVersion: boolean) => {
      const callId = ++latestCheckCallIdRef.current
      // 中断连接 后续不执行
      if (yakitStatusRef.current === 'break') {
        debugToPrintLog(`------ 开始 check 被阻止 ------`)
        setLog([])
        return
      }

      debugToPrintLog(`------ 开始执行 check ------`)
      setLog([t('LocalEngine.checking_secret_password_mode')])
      try {
        const res = await grpcCheckAllowSecretLocal({ port, softwareVersion: FetchSoftwareVersion() })
        setRestartLoading(false)
        if (res.ok && res.status === 'success') {
          setLog((arr) => arr.concat([t('LocalEngine.secret_password_check_passed')]))
          setYakitStatus('')
          allowSecretLocalJson.current = res.json
          handlePreCheckForLinkEngine(checkVersion)
          return
        }
        allowSecretLocalJson.current = null
        switch (res.status) {
          case 'timeout':
            setLog((arr) => arr.concat([t('LocalEngine.command_timeout_check_log')]))
            setYakitStatus('check_timeout')
            break
          case 'call_error':
            setLog((arr) => arr.concat([t('LocalEngine.engine_connect_timeout_check_log')]))
            setYakitStatus('check_timeout')
            break
          case 'old_version':
            setLog((arr) =>
              arr.concat([
                buildInEngineVersion
                  ? t('LocalEngine.engine_version_low_reset')
                  : t('LocalEngine.engine_version_low_download'),
              ]),
            )
            setYakitStatus('old_version')
            break
          case 'port_occupied':
            setLog((arr) => arr.concat([t('LocalEngine.port_unavailable_check_log')]))
            setYakitStatus('port_occupied_prev')
            break
          case 'antivirus_blocked':
            setLog((arr) => arr.concat([t('LocalEngine.antivirus_blocked_check_log')]))
            setYakitStatus('antivirus_blocked')
            break
          case 'build_yak_error':
          case 'dial_error':
            setLog((arr) => arr.concat([t('LocalEngine.engine_connect_error_reset')]))
            setYakitStatus('skipAgreement_Install')
            break
          case 'database_error':
            setLog((arr) => arr.concat([t('LocalEngine.database_error_check_log')]))
            setYakitStatus('database_error')
            break
          default:
            setLog((arr) =>
              arr.concat([
                t('LocalEngine.cannot_start_contact_staff'),
                t('LocalEngine.failure_reason', {
                  status: res.status,
                  message: res.message || t('LocalEngine.none'),
                }),
              ]),
            )
            setYakitStatus('allow-secret-error')
        }
      } catch (error) {
        // 旧调用直接跳过
        if (callId !== latestCheckCallIdRef.current) return
      }
    })

    /**
     * @name 初始化启动-连接引擎的前置版本检查
     * - 引擎连接断开或下载其他版本引擎，不检查版本，直接连接引擎
     * - 开发环境直接连接引擎，不检查版本
     * - 先进行 yakit 检查，在进行引擎检查
     * - 最后软件基础设置（目前只有Yakit支持）
     */
    const handlePreCheckForLinkEngine = useMemoizedFn((checkVersion: boolean) => {
      // 中断连接 后续不执行
      if (yakitStatusRef.current === 'break') {
        debugToPrintLog(`------ 开始连接引擎的前置版本检查 被阻止 ------`)
        setLog([])
        return
      }

      debugToPrintLog(`------ 开始执行初始化启动-连接引擎的前置版本检查 ------`)
      if (SystemInfo.isDev) {
        setLog([t('LocalEngine.dev_env_direct_connect')])
        startYakEngine()
      } else if (checkVersion) {
        // SE 版本不进行 yakit 更新检查，直接检查引擎和内置的版本
        if (isEnpriTraceAgent()) {
          handleCheckEngineVersion()
        } else {
          setLog([t('LocalEngine.checking_software_update')])
          handleCheckYakitLatestVersion()
        }
      } else {
        startYakEngine()
      }
    })

    /**
     * @name 检查yakit是否有版本更新
     * - 未开启 yakit 更新检查，不进行 yakit 更新检查，直接检查引擎和内置的版本
     */
    const handleCheckYakitLatestVersion = useMemoizedFn(() => {
      // 中断连接 后续不执行
      if (yakitStatusRef.current === 'break') {
        debugToPrintLog(`------ 开始检查yakit是否有版本更新 被阻止 ------`)
        setLog([])
        return
      }

      let showUpdateYakit = false
      getLocalValue(LocalGVS.NoAutobootLatestVersionCheck)
        .then(async (val: boolean) => {
          if (!val) {
            debugToPrintLog(`------ 开始检查软件版本更新逻辑 ------`)
            try {
              const promise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Check engine source request timed out')), 3100),
              )
              const [res1, res2] = await Promise.allSettled([
                grpcFetchLocalYakitVersion(true),
                Promise.race([grpcFetchLatestYakitVersion({ timeout: 3000 }, true), promise]),
              ])
              if (res1.status === 'fulfilled') {
                currentYakit.current = res1.value || ''
                debugToPrintLog(`------ 当前软件版本: ${currentYakit.current} ------`)
              }
              if (res2.status === 'fulfilled') {
                let latest = (res2.value || '') as string
                latestYakit.current = latest.startsWith('v') ? latest.substring(1) : latest
                debugToPrintLog(`------ 最新软件版本: ${latestYakit.current} ------`)
              }
              // 只要与线上的不一样就算需要更新，不需要进行版本号比较
              showUpdateYakit =
                !!currentYakit.current && !!latestYakit.current && currentYakit.current !== latestYakit.current
            } catch (error) {}
          } else {
            debugToPrintLog(`------ 跳过检查软件版本更新逻辑 ------`)
            setLog((old) => old.concat([t('LocalEngine.skip_check_hint')]))
          }
        })
        .catch(() => {})
        .finally(() => {
          if (showUpdateYakit) {
            setLog([t('LocalEngine.new_version_detected', { name: getReleaseEditionName() })])
            setYakitStatus('update_yakit')
          } else {
            setLog((old) => old.concat([t('LocalEngine.software_no_update')]))
            setTimeout(() => {
              handleCheckEngineVersion()
            }, 500)
          }
        })
    })

    /**
     * @name 检查引擎本地版本和内置版本
     * - 忽略 yak 更新检查，不进行 yak 更新检查，直接检查引擎来源
     * - 无内置版本则直接连接引擎
     * - 内置比本地版本高提示是否更新
     */

    const handleCheckEngineVersion = useMemoizedFn(async () => {
      // 中断连接 后续不执行
      if (yakitStatusRef.current === 'break') {
        debugToPrintLog(`------ 开始检查引擎本地版本和内置版本 被阻止 ------`)
        setLog([])
        return
      }

      try {
        const res = await getLocalValue(LocalGVS.NoYakVersionCheck)
        if (res) {
          setLog([t('LocalEngine.fetching_engine_version')])
        } else {
          debugToPrintLog(`------ 开始检查引擎内置版本逻辑 ------`)
          setLog([t('LocalEngine.fetching_engine_version_and_check_update')])
        }
        const localVersion = allowSecretLocalJson.current.version
        const localVersionPromise = localVersion ? Promise.resolve(localVersion) : grpcFetchLocalYakVersion(true)
        const buildInVersionPromise = grpcFetchBuildInYakVersion(true)
        const [res1, res2] = await Promise.allSettled([localVersionPromise, buildInVersionPromise])
        if (!res && res2.status === 'fulfilled') {
          let buildIn = res2.value || ''
          buildInYak.current = buildIn.startsWith('v') ? buildIn.substring(1) : buildIn
          debugToPrintLog(`------ 内置版本: ${buildInYak.current} ------`)
        }

        if (res1.status === 'fulfilled') {
          currentYak.current = (res1.value as string) || ''
          debugToPrintLog(`------ 当前版本: ${currentYak.current} ------`)

          setLog((old) =>
            old.concat([
              currentYak.current
                ? t('LocalEngine.local_engine_version', { version: currentYak.current })
                : t('LocalEngine.local_engine_version_not_found'),
            ]),
          )

          if (!currentYak.current) {
            startYakEngine()
            return
          }

          if (res) {
            handleCheckEngineSource(currentYak.current)
          } else {
            if (!!currentYak.current && !!buildInYak.current && compare(buildInYak.current, currentYak.current) > 0) {
              setLog([t('LocalEngine.engine_version_detected_install')])
              setYakitStatus('update_yak')
            } else {
              setLog((old) => old.concat([t('LocalEngine.engine_no_update')]))
              handleCheckEngineSource(currentYak.current)
            }
          }
        } else {
          setLog((old) => old.concat([t('LocalEngine.error_with_reason', { reason: res1.reason })]))
          startYakEngine()
        }
      } catch (error) {
        setLog((old) => old.concat([t('LocalEngine.error_with_reason', { reason: error })]))
        setYakitStatus('check_yak_version_error')
      }
    })

    /**
     * @name 校验引擎是否来源正确
     * - 通过相同版本的线上hash和本地hash对比，判断是否一样
     */
    const handleCheckEngineSource = useMemoizedFn(async (version?: string) => {
      // 中断连接 后续不执行
      if (yakitStatusRef.current === 'break') {
        debugToPrintLog(`------ 开始校验引擎是否来源正确 被阻止 ------`)
        setLog([])
        return
      }

      debugToPrintLog(`------ 开始校验引擎来源逻辑 ------`)
      setLog([t('LocalEngine.checking_engine_source')])
      const checkVersion = version || currentYak.current
      try {
        const promise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Fetch engine online hash request timed out')), 2100),
        )
        const [res1, res2] = await Promise.all([
          // 远端
          Promise.race([
            grpcFetchSpecifiedYakVersionHash({ version: checkVersion, config: { timeout: 2000 } }, true),
            promise,
          ]),
          // 本地
          grpcFetchLocalYakVersionHash(true),
        ])

        if (!res1 || !Array.isArray(res2) || res2.length === 0) {
          setLog((old) => old.concat([t('LocalEngine.unknown_error_cannot_verify_source')]))
        } else {
          if (res2.includes(res1 as string)) {
            setLog((old) => old.concat([t('LocalEngine.engine_source_valid')]))
          } else {
            setLog((old) => old.concat([t('LocalEngine.engine_source_unofficial')]))
            yakitNotify('info', t('LocalEngine.engine_source_unofficial'))
          }
        }
      } catch (error) {
        setLog((old) => old.concat([t('LocalEngine.abnormal_cannot_verify_source')]))
      } finally {
        startYakEngine()
      }
    })

    const startYakEngine = useMemoizedFn(async () => {
      // 中断连接 后续不执行
      if (yakitStatusRef.current === 'break') {
        debugToPrintLog(`------ 准备开始启动引擎逻辑 被阻止 ------`)
        setLog([])
        return
      }

      if (allowSecretLocalJson.current) {
        debugToPrintLog(`------ 准备开始启动连接引擎逻辑 ------`)
        setLog([t('LocalEngine.preparing_start_connect_engine')])
        setTimeout(() => {
          onLinkEngine({
            port: allowSecretLocalJson.current.port,
            secret: allowSecretLocalJson.current.secret,
          })
          // 启动本地连接后，重置所有检查状态，并后续不会在进行检查
          handleResetAllStatus()
        }, 1000)
      }
    })

    /** 初始化所有引擎连接前检查状态 */
    const handleResetAllStatus = useMemoizedFn(() => {
      // check Json
      allowSecretLocalJson.current = null
      // yakit更新
      currentYakit.current = ''
      latestYakit.current = ''
      // yak更新
      currentYak.current = ''
      buildInYak.current = ''
    })

    // 主进程推送 i18n key（如 LocalEngine.xxx），渲染端翻译后输出日志
    useEffect(() => {
      const offStartUpMessage = yakitEngine.onStartUpEngineMessage((key: string) => {
        setLog([t(key)])
      })
      return () => {
        offStartUpMessage()
      }
    }, [])

    // 全部流程
    const initLink = useMemoizedFn((port: number) => {
      handleAllowSecretLocal(port, true)
    })

    // 后续不再检测更新操作
    const toLink = useMemoizedFn((port: number) => {
      handleAllowSecretLocal(port, false)
    })

    useImperativeHandle(
      ref,
      () => ({
        init: initLink,
        checkEngine: handleCheckEngineVersion,
        checkEngineSource: handleCheckEngineSource,
        startYakEngine: startYakEngine,
        link: toLink,
      }),
      [],
    )

    return (
      <>
        {!isEnpriTraceAgent() && (
          <UpdateYakitHint
            visible={yakitUpdate}
            onCallback={() => {
              setYakitUpdate(false)
              setRestartLoading(false)
              setYakitStatus('')
              handleCheckEngineVersion()
            }}
            latest={latestYakit.current}
          />
        )}
      </>
    )
  }),
)
