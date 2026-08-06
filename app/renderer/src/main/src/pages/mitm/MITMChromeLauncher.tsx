import React, { CSSProperties, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { Alert, Form, Space, Tooltip, Typography, Modal } from 'antd'
import { failed, info, yakitNotify } from '../../utils/notification'
import {
  CheckOutlined,
  CloseOutlined,
  CloudUploadOutlined,
  ExclamationCircleOutlined,
  LoadingOutlined,
} from '@ant-design/icons'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { useDebounceFn, useMemoizedFn } from 'ahooks'
import { YakitModal } from '@/components/yakitUI/YakitModal/YakitModal'
import { YakitInput } from '@/components/yakitUI/YakitInput/YakitInput'
import style from './MITMPage.module.scss'
import {
  BanIcon,
  ChromeFrameSvgIcon,
  ChromeSvgIcon,
  PencilAltIcon,
  PlusIcon,
  RemoveIcon,
  TrashIcon,
} from '@/assets/newIcon'
import { getRemoteValue, setRemoteValue } from '@/utils/kv'
import { CacheDropDownGV, RemoteGV } from '@/yakitGV'
import { YakitCheckbox } from '@/components/yakitUI/YakitCheckbox/YakitCheckbox'
import { YakitAutoComplete, defYakitAutoCompleteRef } from '@/components/yakitUI/YakitAutoComplete/YakitAutoComplete'
import { MITMConsts } from './MITMConsts'
import { YakitAutoCompleteRefProps } from '@/components/yakitUI/YakitAutoComplete/YakitAutoCompleteType'
import { TableVirtualResize } from '@/components/TableVirtualResize/TableVirtualResize'
import { ColumnsTypeProps } from '@/components/TableVirtualResize/TableVirtualResizeType'
import classNames from 'classnames'
import { OutlineChevronupIcon, OutlineSaveIcon } from '@/assets/icon/outline'
import { OutlineRefreshIcon } from '@/assets/icon/outline'
import { v4 as uuidv4 } from 'uuid'
import { chromeLauncherMinParams, chromeLauncherParamsArr } from '@/defaultConstants/mitm'
import { SolidCheckIcon, SolidStoreIcon } from '@/assets/icon/solid'
import { useGoogleChromePluginPath } from '@/store'
import { RemoteMitmGV } from '@/enums/mitm'
import { handleOpenFileSystemDialog } from '@/utils/fileSystemDialog'
import { JSONParseLog } from '@/utils/tool'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { loadAdvancedConfig } from './MITMAdvancedConfig'
import { Trans } from 'react-i18next'
import { defHost, defPort } from './MITMServerStartForm/MITMServerStartForm'
import {
  CatIcon,
  CrabIcon,
  OctopusIcon,
  SkeletonIcon,
  SmileyFaceIcon,
  TigerIcon,
} from '@/pages/KnowledgeBase/icon/sidebarIcon'

type BuiltInTaskbarIconPreset =
  | 'knowledge-crab'
  | 'knowledge-tiger'
  | 'knowledge-cat'
  | 'knowledge-octopus'
  | 'knowledge-skeleton'
  | 'knowledge-smiley'
type TaskbarIconPreset = 'default' | BuiltInTaskbarIconPreset | 'custom'
type LaunchMode = 'single' | 'continue' | null

interface ChromeLauncherState {
  running: boolean
  activeTaskbarIconKeys: string[]
}

interface ChromeLaunchResult {
  taskbarIconKey?: string
  activeTaskbarIconKeys?: string[]
}

const TASKBAR_ICON_PRESET_ORDER: Exclude<TaskbarIconPreset, 'custom'>[] = [
  'default',
  'knowledge-crab',
  'knowledge-tiger',
  'knowledge-cat',
  'knowledge-octopus',
  'knowledge-skeleton',
  'knowledge-smiley',
]

const getNextAvailableTaskbarIcon = (activeKeys: string[]): TaskbarIconPreset =>
  TASKBAR_ICON_PRESET_ORDER.find((preset) => !activeKeys.includes(preset)) || 'custom'

/**
 * @param {boolean} isStartMITM 是否开启mitm服务，已开启mitm服务，显示switch。 未开启显示按钮
 */
interface ChromeLauncherButtonProp {
  host?: string
  port?: number
  onFished?: (host: string, port: number) => void
  isStartMITM?: boolean
  repRuleFlag?: boolean
  disableCACertPage: boolean
  onSetVisible?: (visible: boolean) => void
}

interface MITMChromeLauncherProp {
  host?: string
  port?: number
  disableCACertPage: boolean
  callback: (host: string, port: number) => void
}

const { ipcRenderer } = window.require('electron')
const { Text } = Typography

const MITMChromeLauncher: React.FC<MITMChromeLauncherProp> = (props) => {
  const { t } = useI18nNamespaces(['mitm'])
  const [params, setParams] = useState<{ host: string; port: number }>({
    host: props.host ? props.host : defHost,
    port: props.port ? props.port : +defPort,
  })
  const userDataDirRef: React.MutableRefObject<YakitAutoCompleteRefProps> = useRef<YakitAutoCompleteRefProps>({
    ...defYakitAutoCompleteRef,
  })
  const [defUserDataDir, setDefUserDataDir] = useState<string>('')
  const [isSaveUserData, setSaveUserData] = useState<boolean>(false)
  const [userDataDir, setUserDataDir] = useState<string>('')
  const [isWindows, setIsWindows] = useState<boolean>(false)
  const [taskbarIconPreset, setTaskbarIconPreset] = useState<TaskbarIconPreset>('default')
  const [taskbarIconPath, setTaskbarIconPath] = useState<string>('')
  const [launching, setLaunching] = useState<boolean>(false)
  const launchingRef = useRef<boolean>(false)
  const [launchMode, setLaunchMode] = useState<LaunchMode>(null)
  const [activeTaskbarIconKeys, setActiveTaskbarIconKeys] = useState<string[]>([])

  const [chromeLauncherParamsVisible, setChromeLauncherParamsVisible] = useState<boolean>(false)
  const chromeLauncherParamsSetRef = useRef<ChromeLauncherParamsSetRefProps>({
    data: [],
    tempEditItem: undefined,
  })
  const { googleChromePluginPath } = useGoogleChromePluginPath()

  const [chormeCheck, setChormeCheck] = useState<string>('customSet')
  const [showChormeDropdown, setShowChormeDropdown] = useState<boolean>(false)
  const chromedropdownRef = useRef<HTMLDivElement>(null)

  const refreshChromeLauncherState = useMemoizedFn(async () => {
    try {
      const state = (await ipcRenderer.invoke('GetChromeLauncherState')) as ChromeLauncherState
      const activeKeys = Array.isArray(state?.activeTaskbarIconKeys) ? state.activeTaskbarIconKeys : []
      setActiveTaskbarIconKeys(activeKeys)
      setTaskbarIconPreset((current) => {
        if (current === 'custom' || !activeKeys.includes(current)) return current
        return getNextAvailableTaskbarIcon(activeKeys)
      })
    } catch (error) {}
  })

  useEffect(() => {
    let disposed = false
    let chromeStateTimer: ReturnType<typeof setInterval> | undefined
    // 获取连接引擎的地址参数
    ipcRenderer
      .invoke('fetch-yaklang-engine-addr')
      .then((data) => {
        if (data.addr === `${params.host}:${params.port}`) return
        const hosts: string[] = (data.addr as string).split(':')
        if (hosts.length !== 2) return
        setParams({ ...params, host: hosts[0] })
      })
      .catch(() => {})

    getRemoteValue(RemoteGV.MITMUserDataSave).then((cacheRes) => {
      setSaveUserData(cacheRes === 'true')
    })

    getRemoteValue(RemoteMitmGV.MitmStartChromeCheck).then((e) => {
      if (!!e) {
        setChormeCheck(e)
      } else {
        setChormeCheck('customSet')
      }
    })
    // dropdown 点击外部关闭
    const handleClickOutside = (event) => {
      if (chromedropdownRef.current && !chromedropdownRef.current.contains(event.target)) {
        setShowChormeDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)

    ipcRenderer.invoke('getDefaultUserDataDir').then((e: string) => {
      setDefUserDataDir(e)
    })

    ipcRenderer
      .invoke('GetChromeLauncherPlatform')
      .then((platform: string) => {
        if (disposed) return
        const windows = platform === 'win32'
        setIsWindows(windows)
        if (windows) {
          refreshChromeLauncherState()
          chromeStateTimer = setInterval(refreshChromeLauncherState, 750)
        }
      })
      .catch(() => {
        if (!disposed) setIsWindows(false)
      })

    return () => {
      disposed = true
      document.removeEventListener('mousedown', handleClickOutside)
      if (chromeStateTimer) clearInterval(chromeStateTimer)
    }
  }, [])

  // 启动 chrome 模式
  const handleStartChromeBefore = useMemoizedFn((keepOpen: boolean) => {
    if (launchingRef.current) return
    if (isWindows) {
      if (taskbarIconPreset === 'custom' && !taskbarIconPath.trim()) {
        failed(t('MITMChromeLauncher.taskbar_icon_custom_required'))
        return
      }
      if (taskbarIconPreset !== 'custom' && activeTaskbarIconKeys.includes(taskbarIconPreset)) {
        failed(t('MITMChromeLauncher.taskbar_icon_in_use'))
        refreshChromeLauncherState()
        return
      }
    }
    if (chormeCheck === 'customSet') {
      startChrome(false, keepOpen)
    } else if (chormeCheck === 'defaultSet') {
      startChrome(true, keepOpen)
    }
    setRemoteValue(RemoteMitmGV.MitmStartChromeCheck, chormeCheck)
  })
  const startChrome = useMemoizedFn(async (baseStart: boolean, keepOpen: boolean) => {
    if (launchingRef.current) return
    const shouldKeepOpen = isWindows && keepOpen
    launchingRef.current = true
    setLaunching(true)
    setLaunchMode(shouldKeepOpen ? 'continue' : 'single')
    try {
      const [advancedConfig, res] = await Promise.all([
        loadAdvancedConfig(),
        Promise.allSettled([getRemoteValue(RemoteGV.GlobalChromePath), getRemoteValue(RemoteGV.ChromeLauncherParams)]),
      ])
      const { proxyUsername: username = '', proxyPassword: password = '' } = advancedConfig
      let newParams: {
        host: string
        port: number
        chromePath?: string
        userDataDir?: string
        username?: string
        password?: string
        taskbarIconPreset?: string
        taskbarIconPath?: string
        disableCACertPage: boolean
        chromeFlags: ChromeLauncherParams[]
      } = {
        ...params,
        username,
        password,
        userDataDir: isSaveUserData ? userDataDir : undefined,
        ...(isWindows
          ? {
              taskbarIconPreset:
                taskbarIconPreset !== 'default' && taskbarIconPreset !== 'custom' ? taskbarIconPreset : undefined,
              taskbarIconPath: taskbarIconPreset === 'custom' ? taskbarIconPath : undefined,
            }
          : {}),
        disableCACertPage: props.disableCACertPage,
        chromeFlags: [],
      }

      setRemoteValue(RemoteGV.MITMUserDataSave, isSaveUserData + '')
      userDataDirRef.current?.onSetRemoteValues(userDataDir)

      if (res[0].status === 'fulfilled') {
        const value = res[0].value
        if (value) {
          newParams.chromePath = JSONParseLog(value, { page: 'MITMChromeLauncher', fun: 'chromePath' })
        }
      }

      let chromeFlags: ChromeLauncherParams[] = chromeLauncherParamsArr
      if (res[1].status === 'fulfilled') {
        const value = res[1].value
        if (value) {
          try {
            chromeFlags = JSONParseLog(value, { page: 'MITMChromeLauncher', fun: 'chromeFlags' })
          } catch (error) {}
        }
      }

      newParams.chromeFlags = baseStart
        ? chromeLauncherMinParams
        : handleChromeLauncherParams(chromeFlags, googleChromePluginPath)
      const launchResult = (await ipcRenderer.invoke('LaunchChromeWithParams', newParams)) as ChromeLaunchResult
      if (isWindows) {
        const nextActiveKeys = Array.isArray(launchResult?.activeTaskbarIconKeys)
          ? launchResult.activeTaskbarIconKeys
          : [
              ...new Set([
                ...activeTaskbarIconKeys,
                launchResult?.taskbarIconKey ||
                  (taskbarIconPreset === 'custom' ? `custom:${taskbarIconPath.toLowerCase()}` : taskbarIconPreset),
              ]),
            ]
        setActiveTaskbarIconKeys(nextActiveKeys)
        if (shouldKeepOpen) {
          if (taskbarIconPreset === 'custom') setTaskbarIconPath('')
          setTaskbarIconPreset(getNextAvailableTaskbarIcon(nextActiveKeys))
          info(t('MITMChromeLauncher.multi_launch_success'))
        } else {
          props.callback(params.host, params.port)
        }
      } else {
        props.callback(params.host, params.port)
      }
    } catch (error) {
      failed(t('MITMChromeLauncher.chrome_launch_failed', { err: error + '' }))
      if (isWindows) refreshChromeLauncherState()
    } finally {
      launchingRef.current = false
      setLaunching(false)
      setLaunchMode(null)
    }
  })

  return (
    <Form labelCol={{ span: 4 }} wrapperCol={{ span: 18 }} style={{ padding: 24 }}>
      <Form.Item label={t('MITMChromeLauncher.proxy_configuration')}>
        <YakitInput.Group className={style['chrome-input-group']}>
          <YakitInput
            prefix={'http://'}
            onChange={(e) => setParams({ ...params, host: e.target.value })}
            value={params.host}
            wrapperStyle={{ width: 165 }}
          />
          <YakitInput
            prefix={':'}
            onChange={(e) => {
              setParams({ ...params, port: parseInt(e.target.value) || 0 })
            }}
            value={`${params.port}`}
            wrapperStyle={{ width: 80 }}
          />
        </YakitInput.Group>
      </Form.Item>
      <Form.Item label={' '} colon={false}>
        <YakitCheckbox
          checked={isSaveUserData}
          onChange={(e) => {
            setSaveUserData(e.target.checked)
          }}
        >
          {t('MITMChromeLauncher.save_user_data')}
        </YakitCheckbox>
      </Form.Item>
      {isSaveUserData && (
        <Form.Item label={' '} colon={false} help={t('MITMChromeLauncher.save_user_data_help')}>
          <YakitAutoComplete
            ref={userDataDirRef}
            style={{ width: 'calc(100% - 20px)' }}
            cacheHistoryDataKey={CacheDropDownGV.MITMSaveUserDataDir}
            cacheHistoryListLength={5}
            initValue={defUserDataDir}
            value={userDataDir}
            placeholder={t('MITMChromeLauncher.set_proxy_placeholder')}
            onChange={(v) => {
              setUserDataDir(v)
            }}
          />
          <Tooltip title={t('MITMChromeLauncher.select_storage_path')}>
            <CloudUploadOutlined
              onClick={() => {
                handleOpenFileSystemDialog({
                  title: t('MITMChromeLauncher.please_select_folder'),
                  properties: ['openDirectory'],
                }).then((data) => {
                  if (data.filePaths.length) {
                    let absolutePath: string = data.filePaths[0].replace(/\\/g, '\\')
                    setUserDataDir(absolutePath)
                  }
                })
              }}
              style={{ position: 'absolute', right: 0, top: 8, cursor: 'pointer' }}
            />
          </Tooltip>
        </Form.Item>
      )}
      {isWindows && (
        <Form.Item label={t('MITMChromeLauncher.taskbar_icon')}>
          <div
            className={classNames(style['taskbar-icon-picker'], { [style['disabled']]: launching })}
            role="radiogroup"
            aria-label={t('MITMChromeLauncher.taskbar_icon')}
            aria-busy={launching}
          >
            <button
              type="button"
              role="radio"
              disabled={launching || activeTaskbarIconKeys.includes('default')}
              title={
                activeTaskbarIconKeys.includes('default')
                  ? `${t('MITMChromeLauncher.taskbar_icon_default')} · ${t('MITMChromeLauncher.taskbar_icon_running')}`
                  : t('MITMChromeLauncher.taskbar_icon_default')
              }
              aria-checked={taskbarIconPreset === 'default'}
              className={classNames(style['taskbar-icon-option'], style['taskbar-icon-option-text'], {
                [style['active']]: taskbarIconPreset === 'default',
                [style['used']]: activeTaskbarIconKeys.includes('default'),
              })}
              onClick={() => setTaskbarIconPreset('default')}
            >
              {t('MITMChromeLauncher.taskbar_icon_default')}
              {activeTaskbarIconKeys.includes('default') && (
                <span className={style['taskbar-icon-used-dot']} aria-hidden="true" />
              )}
            </button>
            {[
              {
                value: 'knowledge-crab' as BuiltInTaskbarIconPreset,
                label: t('MITMChromeLauncher.taskbar_icon_crab'),
                icon: <CrabIcon />,
              },
              {
                value: 'knowledge-tiger' as BuiltInTaskbarIconPreset,
                label: t('MITMChromeLauncher.taskbar_icon_tiger'),
                icon: <TigerIcon />,
              },
              {
                value: 'knowledge-cat' as BuiltInTaskbarIconPreset,
                label: t('MITMChromeLauncher.taskbar_icon_cat'),
                icon: <CatIcon />,
              },
              {
                value: 'knowledge-octopus' as BuiltInTaskbarIconPreset,
                label: t('MITMChromeLauncher.taskbar_icon_octopus'),
                icon: <OctopusIcon />,
              },
              {
                value: 'knowledge-skeleton' as BuiltInTaskbarIconPreset,
                label: t('MITMChromeLauncher.taskbar_icon_skeleton'),
                icon: <SkeletonIcon />,
              },
              {
                value: 'knowledge-smiley' as BuiltInTaskbarIconPreset,
                label: t('MITMChromeLauncher.taskbar_icon_smiley'),
                icon: <SmileyFaceIcon />,
              },
            ].map((item) => {
              const used = activeTaskbarIconKeys.includes(item.value)
              return (
                <button
                  key={item.value}
                  type="button"
                  role="radio"
                  disabled={launching || used}
                  title={used ? `${item.label} · ${t('MITMChromeLauncher.taskbar_icon_running')}` : item.label}
                  aria-label={item.label}
                  aria-checked={taskbarIconPreset === item.value}
                  className={classNames(style['taskbar-icon-option'], {
                    [style['active']]: taskbarIconPreset === item.value,
                    [style['used']]: used,
                  })}
                  onClick={() => setTaskbarIconPreset(item.value)}
                >
                  <span className={style['taskbar-icon-preview']}>{item.icon}</span>
                  {used && <span className={style['taskbar-icon-used-dot']} aria-hidden="true" />}
                </button>
              )
            })}
            <button
              type="button"
              role="radio"
              disabled={launching}
              aria-checked={taskbarIconPreset === 'custom'}
              className={classNames(style['taskbar-icon-option'], style['taskbar-icon-option-text'], {
                [style['active']]: taskbarIconPreset === 'custom',
              })}
              onClick={() => setTaskbarIconPreset('custom')}
            >
              {t('MITMChromeLauncher.taskbar_icon_custom')}
            </button>
          </div>
          {activeTaskbarIconKeys.length > 0 && (
            <div className={style['taskbar-icon-usage']}>
              <span className={style['taskbar-icon-usage-dot']} aria-hidden="true" />
              {t('MITMChromeLauncher.taskbar_icons_running', { count: activeTaskbarIconKeys.length })}
            </div>
          )}
          {taskbarIconPreset === 'custom' && (
            <div style={{ position: 'relative', marginTop: 8 }}>
              <YakitInput
                allowClear
                disabled={launching}
                style={{ width: 'calc(100% - 20px)' }}
                value={taskbarIconPath}
                placeholder={t('MITMChromeLauncher.taskbar_icon_placeholder')}
                onChange={(event) => setTaskbarIconPath(event.target.value)}
              />
              <Tooltip title={t('MITMChromeLauncher.select_taskbar_icon')}>
                <CloudUploadOutlined
                  onClick={() => {
                    if (launching) return
                    handleOpenFileSystemDialog({
                      title: t('MITMChromeLauncher.please_select_icon'),
                      properties: ['openFile'],
                      filters: [{ name: 'Windows icon resource', extensions: ['ico', 'exe', 'dll'] }],
                    }).then((data) => {
                      if (data.filePaths.length) setTaskbarIconPath(data.filePaths[0])
                    })
                  }}
                  style={{ position: 'absolute', right: 0, top: 8, cursor: 'pointer' }}
                />
              </Tooltip>
            </div>
          )}
        </Form.Item>
      )}
      <Form.Item
        colon={false}
        label={' '}
        help={
          <Space style={{ width: '100%', marginBottom: 20 }} direction={'vertical'} size={4}>
            <Alert
              style={{ marginTop: 4 }}
              type={'success'}
              message={
                <>
                  <Trans
                    i18nKey="MITMChromeLauncher.launchProxyChrome"
                    components={{
                      br: <br />,
                      mark: <Text mark />,
                    }}
                    ns="mitm"
                  />
                </>
              }
            />
            <Alert
              style={{ marginTop: 4 }}
              type={'error'}
              message={
                <>
                  <Trans
                    i18nKey="MITMChromeLauncher.proxyBrowserNotice"
                    components={{
                      mark: <Text mark />,
                      code: <Text code />,
                      br: <br />,
                    }}
                    ns="mitm"
                  />
                </>
              }
            />
          </Space>
        }
      >
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div
            className={classNames(style['chrome-operation-btn-wrapper'], { [style['disabled']]: launching })}
            ref={chromedropdownRef}
          >
            <div
              className={style['operation-btn-left']}
              style={{ borderRadius: '40px 0 0 40px' }}
              onClick={() => handleStartChromeBefore(false)}
            >
              {launchMode === 'single' && <LoadingOutlined spin className={style['chrome-launching-icon']} />}
              {launchMode === 'single'
                ? t('MITMChromeLauncher.preparing_chrome')
                : t('MITMChromeLauncher.launch_config_free_chrome')}
            </div>
            <div
              className={style['operation-btn-right']}
              style={{ borderRadius: '0 40px 40px 0' }}
              onClick={() => !launching && setShowChormeDropdown(!showChormeDropdown)}
            >
              <OutlineChevronupIcon
                className={classNames(style['title-icon'], {
                  [style['rotate-180']]: !showChormeDropdown,
                })}
              />
            </div>
            <div
              className={style['operation-dropdown-wrapper']}
              style={{ display: showChormeDropdown ? 'block' : 'none' }}
            >
              {[
                { label: t('MITMChromeLauncher.preset_params_start'), key: 'customSet' },
                { label: t('MITMChromeLauncher.minimal_params_start'), key: 'defaultSet' },
              ].map((item) => (
                <div
                  className={classNames(style['operation-dropdown-list-item'], {
                    [style['active']]: chormeCheck === item.key,
                  })}
                  onClick={() => {
                    setChormeCheck(item.key)
                    setShowChormeDropdown(!showChormeDropdown)
                  }}
                  key={item.key}
                >
                  <span>{item.label}</span>
                  {chormeCheck === item.key && <SolidCheckIcon className={style['check-icon']} />}
                </div>
              ))}
            </div>
          </div>
          {isWindows && (
            <Tooltip title={isSaveUserData ? t('MITMChromeLauncher.multi_launch_temporary_only') : undefined}>
              <span className={style['multi-launch-button-wrapper']}>
                <YakitButton
                  type="outline1"
                  icon={<PlusIcon />}
                  loading={launchMode === 'continue'}
                  disabled={launching || isSaveUserData}
                  onClick={() => handleStartChromeBefore(true)}
                >
                  {t('MITMChromeLauncher.launch_and_add_another')}
                </YakitButton>
              </span>
            </Tooltip>
          )}
          {chormeCheck === 'customSet' && (
            <YakitButton type="text" disabled={launching} onClick={() => setChromeLauncherParamsVisible(true)}>
              {t('MITMChromeLauncher.more_params')}
            </YakitButton>
          )}
        </div>
        <div className={style['chrome-start-desc']}>{t('MITMChromeLauncher.preset_params_desc')}</div>
        {chromeLauncherParamsVisible && (
          <YakitModal
            title={t('MITMChromeLauncher.browser_params_config')}
            visible={chromeLauncherParamsVisible}
            onCancel={() => setChromeLauncherParamsVisible(false)}
            closable={true}
            maskClosable={false}
            mask={false}
            width="55%"
            bodyStyle={{ padding: 0 }}
            onOk={() => {
              if (chromeLauncherParamsSetRef.current.tempEditItem) {
                yakitNotify('info', t('MITMChromeLauncher.unsaved_edits'))
                return
              }

              const values = chromeLauncherParamsSetRef.current.data
                .map((item) => item['parameterName'])
                .filter((item) => item)
              const arr = values.filter((value, index) => values.indexOf(value) !== index)
              if (arr.length) {
                yakitNotify('info', `${t('MITMChromeLauncher.duplicate_param_name')} ${arr.join(',')}`)
                return
              }

              const flag = chromeLauncherParamsSetRef.current.data.some(
                (value) => value.parameterName === '' && value.variableValues,
              )
              if (flag) {
                yakitNotify('info', t('MITMChromeLauncher.missing_param_name'))
                return
              }

              const saveChromeLauncherParamsArr = chromeLauncherParamsSetRef.current.data.filter(
                (item) => item['parameterName'] && !['--proxy-server'].includes(item['parameterName']),
              )
              setRemoteValue(RemoteGV.ChromeLauncherParams, JSON.stringify(saveChromeLauncherParamsArr))
              setChromeLauncherParamsVisible(false)
            }}
          >
            <ChromeLauncherParamsSet ref={chromeLauncherParamsSetRef} googleChromePluginPath={googleChromePluginPath} />
          </YakitModal>
        )}
      </Form.Item>
    </Form>
  )
}

const ChromeLauncherButton: React.FC<ChromeLauncherButtonProp> = React.memo((props: ChromeLauncherButtonProp) => {
  const { isStartMITM, host, port, onFished, repRuleFlag = false, disableCACertPage, onSetVisible } = props
  const { t } = useI18nNamespaces(['mitm', 'yakitUi'])
  const [started, setStarted] = useState(false)
  const [chromeVisible, setChromeVisible] = useState(false)
  const [closing, setClosing] = useState(false)
  const closingRef = useRef(false)

  useEffect(() => {
    const id = setInterval(() => {
      ipcRenderer.invoke('IsChromeLaunched').then((e) => {
        if (!closingRef.current) setStarted(e)
      })
    }, 500)
    return () => {
      clearInterval(id)
    }
  }, [])
  const onSwitch = useMemoizedFn((c: boolean) => {
    setChromeVisible(true)
    // if (c) {
    //     setChromeVisible(true)
    // } else {
    //     onCloseChrome()
    // }
  })
  const onCloseChrome = useMemoizedFn(() => {
    if (closingRef.current) return
    closingRef.current = true
    setClosing(true)
    ipcRenderer
      .invoke('StopAllChrome')
      .then(() => {
        setStarted(false)
        info(t('MITMChromeLauncher.close_all_no_config_chrome_success'))
      })
      .catch((e) => {
        failed(t('MITMChromeLauncher.close_all_chrome_failed') + `: ${e}`)
      })
      .finally(() => {
        closingRef.current = false
        setClosing(false)
      })
  })

  const clickChromeLauncher = useMemoizedFn(() => {
    if (repRuleFlag) {
      Modal.confirm({
        title: t('YakitModal.friendlyReminder'),
        icon: <ExclamationCircleOutlined />,
        content: t('MITMChromeLauncher.warning_content'),
        okText: t('YakitButton.confirm'),
        cancelText: t('MITMChromeLauncher.go_configure'),
        closable: true,
        centered: true,
        closeIcon: (
          <div
            onClick={(e) => {
              e.stopPropagation()
              Modal.destroyAll()
            }}
            className="modal-remove-icon"
          >
            <RemoveIcon />
          </div>
        ),
        onOk: () => {
          setChromeVisible(true)
        },
        onCancel: () => {
          onSetVisible && onSetVisible(true)
          Modal.destroyAll()
        },
        cancelButtonProps: { size: 'small', className: 'modal-cancel-button' },
        okButtonProps: { size: 'small', className: 'modal-ok-button' },
      })
      return
    }
    setChromeVisible(true)
  })

  return (
    <>
      {(isStartMITM && (
        <>
          <YakitButton type="outline2" disabled={closing} onClick={() => onSwitch(!started)}>
            {(started && <ChromeSvgIcon />) || (
              <ChromeFrameSvgIcon style={{ height: 16, color: 'var(--Colors-Use-Neutral-Text-1-Title)' }} />
            )}
            {t('MITMChromeLauncher.start_no_config_chrome')}
            {started && <CheckOutlined style={{ color: 'var(--Colors-Use-Success-Primary)', marginLeft: 8 }} />}
          </YakitButton>
          {started && (
            <Tooltip title={t('MITMChromeLauncher.close_all_no_config_chrome')}>
              <YakitButton
                type="outline2"
                loading={closing}
                disabled={closing}
                aria-label={
                  closing
                    ? t('MITMChromeLauncher.closing_no_config_chrome')
                    : t('MITMChromeLauncher.close_all_no_config_chrome')
                }
                onClick={() => {
                  onCloseChrome()
                }}
              >
                <CloseOutlined style={{ color: 'var(--Colors-Use-Success-Primary)' }} />
              </YakitButton>
            </Tooltip>
          )}
        </>
      )) || (
        <YakitButton type="outline2" size="large" onClick={clickChromeLauncher}>
          <ChromeFrameSvgIcon style={{ height: 16, color: 'var(--Colors-Use-Neutral-Text-1-Title)' }} />
          <span style={{ marginLeft: 4 }}>{t('MITMChromeLauncher.start_no_config_chrome')}</span>
        </YakitButton>
      )}
      {chromeVisible && (
        <YakitModal
          title={t('MITMChromeLauncher.confirm_start_no_config_chrome_params')}
          visible={chromeVisible}
          onCancel={() => setChromeVisible(false)}
          closable={true}
          width="max(850px, 50%)"
          footer={null}
          bodyStyle={{ padding: 0 }}
        >
          <MITMChromeLauncher
            host={host}
            port={port}
            disableCACertPage={disableCACertPage}
            callback={(host, port) => {
              setChromeVisible(false)
              if (!isStartMITM) {
                // 记录时间戳
                const nowTime: string = Math.floor(new Date().getTime() / 1000).toString()
                setRemoteValue(MITMConsts.MITMStartTimeStamp, nowTime)
                if (onFished) onFished(host, port)
              }
            }}
          />
        </YakitModal>
      )}
    </>
  )
})
export default ChromeLauncherButton

export interface ChromeLauncherParams {
  id: number
  parameterName: string
  variableValues: string
  variableType: 'input' | 'bool'
  desc: string
  disabled: boolean
  default: boolean
  cellStyle?: CSSProperties
}

function setGoogleChromePlugin(parameterName: string, googleChromePluginPath: string, disabled: boolean) {
  return {
    id: uuidv4(),
    parameterName: parameterName,
    variableValues: googleChromePluginPath,
    variableType: 'input',
    disabled: disabled,
    desc: '',
    default: true,
  } as ChromeLauncherParams
}
function handleChromeLauncherParams(arr: ChromeLauncherParams[], googleChromePluginPath: string) {
  const index = arr.findIndex((item) => item.parameterName === '--load-extension')
  if (index === -1) {
    arr.push(setGoogleChromePlugin('--load-extension', googleChromePluginPath, false))
  } else {
    arr[index] = setGoogleChromePlugin('--load-extension', googleChromePluginPath, arr[index].disabled)
  }
  const index2 = arr.findIndex((item) => item.parameterName === '--disable-extensions-except')
  if (index2 === -1) {
    arr.push(setGoogleChromePlugin('--disable-extensions-except', googleChromePluginPath, false))
  } else {
    arr[index2] = setGoogleChromePlugin('--disable-extensions-except', googleChromePluginPath, arr[index2].disabled)
  }
  return arr
}
interface ChromeLauncherParamsSetRefProps {
  data: ChromeLauncherParams[]
  tempEditItem?: ChromeLauncherParams
}
interface ChromeLauncherParamsSetProps {
  ref?: React.ForwardedRef<ChromeLauncherParamsSetRefProps>
  googleChromePluginPath: string
}
const ChromeLauncherParamsSet: React.FC<ChromeLauncherParamsSetProps> = React.forwardRef((props, ref) => {
  const { googleChromePluginPath } = props
  const { t, i18nRefresh } = useI18nNamespaces(['mitm', 'yakitUi'])
  const [currentItem, setCurrentItem] = useState<ChromeLauncherParams>()
  const [data, setData] = useState<ChromeLauncherParams[]>([])
  const tempEditItem = useRef<ChromeLauncherParams>()
  const [tempEditId, setTempEditId] = useState<number>()
  const [searchVal, setSearchVal] = useState<string>('')
  const [searchData, setSearchData] = useState<ChromeLauncherParams[]>([])

  useImperativeHandle(
    ref,
    () => ({
      data: data,
      tempEditItem: tempEditItem.current,
    }),
    [data, tempEditItem],
  )

  useEffect(() => {
    getRemoteValue(RemoteGV.ChromeLauncherParams).then((setting) => {
      let arr: ChromeLauncherParams[] = chromeLauncherParamsArr
      if (setting) {
        try {
          arr = JSONParseLog(setting, { page: 'MITMChromeLauncher', fun: 'ChromeLauncherParams' })
        } catch (error) {}
      }
      setData(handleChromeLauncherParams(arr, googleChromePluginPath))
    })
  }, [])

  const resetToDefault = useMemoizedFn(() => {
    // 显示确认对话框
    Modal.confirm({
      title: t('MITMChromeLauncher.confirm_restore_default_params'),
      icon: <ExclamationCircleOutlined />,
      content: t('MITMChromeLauncher.restore_default_params_content'),
      okText: t('YakitButton.confirm'),
      cancelText: t('YakitButton.cancel'),
      closable: true,
      centered: true,
      closeIcon: (
        <div
          onClick={(e) => {
            e.stopPropagation()
            Modal.destroyAll()
          }}
          className="modal-remove-icon"
        >
          <RemoveIcon />
        </div>
      ),
      onOk: () => {
        // 重置为默认参数
        let defaultParams = [...chromeLauncherParamsArr]

        // 应用handleChromeLauncherParams函数，确保扩展参数被正确处理
        defaultParams = handleChromeLauncherParams(defaultParams, googleChromePluginPath)

        setData(defaultParams)
        if (searchVal) {
          const filteredData = defaultParams.filter((item) =>
            item.parameterName.toLocaleLowerCase().includes(searchVal.toLocaleLowerCase()),
          )
          setSearchData(filteredData)
        }

        // 清除临时编辑状态
        tempEditItem.current = undefined
        setTempEditId(undefined)
        setCurrentItem(undefined)

        // 保存到远程
        setRemoteValue(RemoteGV.ChromeLauncherParams, JSON.stringify(defaultParams))
        yakitNotify('success', t('MITMChromeLauncher.restore_default_params_success'))
      },
      cancelButtonProps: { size: 'small', className: 'modal-cancel-button' },
      okButtonProps: { size: 'small', className: 'modal-ok-button' },
    })
  })

  const onRemove = useMemoizedFn((record: ChromeLauncherParams) => {
    if (record.id === tempEditId) {
      tempEditItem.current = undefined
      setTempEditId(undefined)
    }
    if (record.id === currentItem?.id) {
      setCurrentItem(undefined)
    }
    setData(data.filter((t) => t.id !== record.id))
    if (searchVal) setSearchData(searchData.filter((t) => t.id !== record.id))
  })

  const onEdit = useMemoizedFn((record: ChromeLauncherParams) => {
    setData(handleEditData(data, record))
    if (searchVal) setSearchData(handleEditData(searchData, record))
  })
  const handleEditData = (arr: ChromeLauncherParams[], record: ChromeLauncherParams) => {
    const newData: ChromeLauncherParams[] = arr.map((item: ChromeLauncherParams) => {
      if (item.id === record.id) {
        item = {
          ...item,
          cellStyle: {
            padding: '6px 0',
          },
        }
        tempEditItem.current = item
        setTempEditId(record.id)
      }
      return item
    })
    return newData
  }

  const onSave = useMemoizedFn((record: ChromeLauncherParams) => {
    setData(handleSaveData(data, record))
    if (searchVal)
      setSearchData(
        handleSaveData(searchData, record).filter((item) =>
          item.parameterName.toLocaleLowerCase().includes(searchVal.toLocaleLowerCase()),
        ),
      )
    tempEditItem.current = undefined
    setTempEditId(undefined)
  })
  const handleSaveData = (arr: ChromeLauncherParams[], record: ChromeLauncherParams) => {
    const newData: ChromeLauncherParams[] = arr.map((item: ChromeLauncherParams) => {
      if (item.id === record.id && tempEditItem.current) {
        item = {
          ...tempEditItem.current,
          cellStyle: undefined,
        }
      }
      return item
    })
    return newData
  }

  const onBan = useMemoizedFn((record: ChromeLauncherParams) => {
    setData(handleBan(data, record))
    if (searchVal) setSearchData(handleBan(searchData, record))
  })
  const handleBan = (arr: ChromeLauncherParams[], record: ChromeLauncherParams) => {
    const newData: ChromeLauncherParams[] = arr.map((item: ChromeLauncherParams) => {
      if (item.id === record.id) {
        if (!record.disabled && record.id === currentItem?.id) {
          setCurrentItem(undefined)
        }
        item = {
          ...record,
          disabled: !record.disabled,
        }
      }
      return item
    })
    return newData
  }

  const disabledEdit = useMemoizedFn((record: ChromeLauncherParams) => {
    return (
      record.variableType === 'bool' ||
      record.disabled ||
      !(tempEditId === undefined || tempEditId === record.id) ||
      ['--load-extension', '--disable-extensions-except'].includes(record.parameterName)
    )
  })
  const disabledBan1 = useMemoizedFn((record: ChromeLauncherParams) => {
    return record.disabled && !record.cellStyle
  })
  const disabledBan2 = useMemoizedFn((record: ChromeLauncherParams) => {
    return record.cellStyle && !record.disabled
  })
  const disabledTrash = useMemoizedFn((record: ChromeLauncherParams) => {
    return record.default || record.disabled
  })

  const columns: ColumnsTypeProps[] = useMemo(() => {
    return [
      {
        title: t('MITMChromeLauncher.param_name'),
        dataKey: 'parameterName',
        customStyle: true,
        render: (text, record: ChromeLauncherParams) => {
          return record.cellStyle && !record.default ? (
            <YakitInput
              defaultValue={text}
              style={{ borderRadius: 0, borderColor: 'var(--Colors-Use-Main-Primary)' }}
              autoFocus={!record.default}
              onChange={(e) => {
                if (tempEditItem.current) {
                  tempEditItem.current = {
                    ...tempEditItem.current,
                    parameterName: e.target.value.trim(),
                  }
                }
              }}
            />
          ) : (
            <div
              className="content-ellipsis"
              style={{
                paddingLeft: record.cellStyle ? 12 : undefined,
                color: record.disabled ? 'var(--Colors-Use-Neutral-Disable)' : undefined,
              }}
            >
              {text}
            </div>
          )
        },
      },
      {
        title: t('MITMChromeLauncher.variable_value'),
        dataKey: 'variableValues',
        customStyle: true,
        render: (text, record: ChromeLauncherParams) => {
          return record.variableType === 'input' ? (
            record.cellStyle ? (
              <YakitInput
                defaultValue={text}
                style={{ borderRadius: 0, borderColor: 'var(--Colors-Use-Main-Primary)' }}
                autoFocus={record.default}
                onChange={(e) => {
                  if (tempEditItem.current) {
                    tempEditItem.current = {
                      ...tempEditItem.current,
                      variableValues: e.target.value.trim(),
                    }
                  }
                }}
              />
            ) : (
              <div
                className="content-ellipsis"
                style={{ color: record.disabled ? 'var(--Colors-Use-Neutral-Disable)' : undefined }}
              >
                {text}
              </div>
            )
          ) : (
            ''
          )
        },
      },
      {
        title: t('YakitTable.action'),
        dataKey: 'action',
        width: 128,
        fixed: 'right',
        render: (_, record: ChromeLauncherParams) => {
          return (
            <div className={style['table-action-icon']}>
              {record.cellStyle ? (
                <Tooltip title={t('YakitButton.save')}>
                  <SolidStoreIcon
                    className={classNames(style['action-icon'], style['action-icon-save'])}
                    onClick={(e) => {
                      onSave(record)
                    }}
                  />
                </Tooltip>
              ) : (
                <Tooltip title={disabledEdit(record) ? '' : t('YakitButton.edit')}>
                  <PencilAltIcon
                    className={classNames(style['action-icon'], {
                      [style['action-icon-edit-disabled']]: disabledEdit(record),
                    })}
                    onClick={(e) => {
                      if (disabledEdit(record)) {
                        return
                      }
                      onEdit(record)
                    }}
                  />
                </Tooltip>
              )}
              <Tooltip
                title={
                  disabledBan2(record) ? '' : disabledBan1(record) ? t('YakitButton.enable') : t('YakitButton.disable')
                }
              >
                <BanIcon
                  className={classNames(style['action-icon'], {
                    [style['action-icon-ban-disabled']]: disabledBan1(record),
                    [style['action-icon-ban-disabled2']]: disabledBan2(record),
                  })}
                  onClick={(e) => {
                    e.stopPropagation()
                    if (disabledBan2(record)) {
                      return
                    }
                    onBan(record)
                  }}
                />
              </Tooltip>
              <TrashIcon
                className={classNames(style['icon-trash'], {
                  [style['action-icon-trash-disabled']]: disabledTrash(record),
                })}
                onClick={(e) => {
                  e.stopPropagation()
                  if (disabledTrash(record)) {
                    return
                  }
                  onRemove(record)
                }}
              />
            </div>
          )
        },
      },
    ]
  }, [tempEditId, i18nRefresh])

  const onSetCurrentRow = useDebounceFn(
    (rowDate: ChromeLauncherParams) => {
      setCurrentItem(rowDate)
    },
    { wait: 200 },
  ).run

  useEffect(() => {
    const arr = data.filter((item) => item.parameterName.toLocaleLowerCase().includes(searchVal.toLocaleLowerCase()))
    setSearchData(arr)
  }, [searchVal])

  return (
    <div className={style['chrome-launcher-params-set-wrap']}>
      <TableVirtualResize<ChromeLauncherParams>
        enableDrag={false}
        titleHeight={42}
        title={
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <YakitInput.Search
              style={{ width: 250 }}
              allowClear
              placeholder={t('MITMChromeLauncher.search_param_placeholder')}
              onSearch={(value) => setSearchVal(value.trim())}
            />
            <YakitButton type="text" onClick={resetToDefault} disabled={tempEditId !== undefined}>
              <OutlineRefreshIcon style={{ marginRight: 4 }} />
              {t('MITMChromeLauncher.restore_default_params')}
            </YakitButton>
          </div>
        }
        extra={
          <YakitButton
            type="primary"
            disabled={tempEditId !== undefined}
            onClick={() => {
              const newItem: ChromeLauncherParams = {
                id: uuidv4(),
                parameterName: '',
                variableValues: '',
                variableType: 'input',
                disabled: false,
                desc: '',
                default: false,
              }
              setData((prevData) => [newItem, ...prevData])
              if (searchVal) setSearchData((prevData) => [newItem, ...prevData])
              setTimeout(() => {
                onSetCurrentRow(newItem)
                onEdit(newItem)
              }, 50)
            }}
          >
            <div className={style['button-add-params']}>
              <PlusIcon />
              {t('MITMChromeLauncher.add_new_param')}
            </div>
          </YakitButton>
        }
        isRefresh={false}
        renderKey="id"
        data={searchVal ? searchData : data}
        columns={columns}
        onRowClick={onSetCurrentRow}
        currentSelectItem={currentItem}
        pagination={{
          total: searchVal ? searchData.length : data.length,
          limit: 20,
          page: 1,
          onChange: () => {},
        }}
      />
    </div>
  )
})
