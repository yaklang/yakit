import React, { useContext, useEffect, useMemo, useRef, useState } from 'react'
import { Card, Col, Row, Statistic, Tooltip } from 'antd'
import { YakExecutorParam } from '../invoker/YakExecutorParams'
import { StatusCardProps } from '../yakitStore/viewers/base'
import { YakScript } from '../invoker/schema'
import { failed } from '../../utils/notification'
import { useCreation, useMemoizedFn } from 'ahooks'
import style from './MITMYakScriptLoader.module.scss'
import { YakitCheckbox } from '@/components/yakitUI/YakitCheckbox/YakitCheckbox'
import { PluginLocalInfoIcon } from '../customizeMenu/CustomizeMenu'
import classNames from 'classnames'
import { YakitPopconfirm } from '@/components/yakitUI/YakitPopconfirm/YakitPopconfirm'
import { grpcFetchLocalPluginDetail } from '../pluginHub/utils/grpc'
import { YakParamProps } from '../plugins/pluginsType'
import {
  CustomPluginExecuteFormValue,
  YakExtraParamProps,
} from '../plugins/operator/localPluginExecuteDetailHeard/LocalPluginExecuteDetailHeardType'
import { getValueByType, ParamsToGroupByGroupName } from '../plugins/editDetails/utils'
import { getRemoteValue, setRemoteValue } from '@/utils/kv'
import {
  OutlileHistoryIcon,
  OutlinePencilaltIcon,
  OutlinePositionIcon,
  OutlineQuestionmarkcircleIcon,
  OutlineTerminalIcon,
} from '@/assets/icon/outline'
import emiter from '@/utils/eventBus/eventBus'
import { YakitDropdownMenu } from '@/components/yakitUI/YakitDropdownMenu/YakitDropdownMenu'
import { SolidDotsverticalIcon, SolidLightningboltIcon } from '@/assets/icon/solid'
import { YakitMenuItemProps } from '@/components/yakitUI/YakitMenu/YakitMenu'
import { YakitPopover } from '@/components/yakitUI/YakitPopover/YakitPopover'
import { YakEditor } from '@/utils/editors'
import { MitmStatus } from './MITMPage'
import { AuthorImg } from '../plugins/funcTemplate'
import YakitLogo from '@/assets/yakitLogo.png'
import UnLogin from '@/assets/unLogin.png'
import { pluginTypeToName } from '../plugins/builtInData'
import MITMContext from './Context/MITMContext'
import { grpcMITMClearPluginCache, grpcMITMRemoveHook, MITMRemoveHookRequest } from './MITMHacker/utils'
import { JSONParseLog } from '@/utils/tool'
import { debugToPrintLogs } from '@/utils/logCollection'
import { HoldGRPCStreamInfo } from '@/hook/useHoldGRPCStream/useHoldGRPCStreamType'
import { ManualHijackTypeProps } from './MITMManual/MITMManualType'
const PluginHasParamsDrawer = React.lazy(() => import('../../components/pluginHasParamsDrawer/PluginHasParamsDrawer'))

const { ipcRenderer } = window.require('electron')

export const MITMYakScriptLoader = React.memo((p: MITMYakScriptLoaderProps) => {
  const {
    hooks,
    hooksID,
    script,
    onSubmitYakScriptId,
    onRemoveHook,
    defaultPlugins,
    setDefaultPlugins,
    status,
    isHasParams,
    showEditor,
    showPluginHistoryList = [],
    setShowPluginHistoryList = () => {},
    tempShowPluginHistory,
    setTempShowPluginHistory,
    hasParamsCheckList,
    curTabKey,
    pluginStreamInfo,
    showPluginStream,
    setShowPluginStream,
    setAutoForward,
  } = p
  const mitmContent = useContext(MITMContext)

  const mitmVersion = useCreation(() => {
    return mitmContent.mitmStore.version
  }, [mitmContent.mitmStore.version])
  const [i, setI] = useState(script)
  useEffect(() => {
    setI(script)
  }, [script])

  /**
   * mitm处理带参
   */
  const [mitmParamsDrawer, setMitmParamsDrawer] = useState<boolean>(false)
  const mitmParamsInitFormValueRef = useRef<CustomPluginExecuteFormValue>({})
  const mitmParamsDefaultFormValueRef = useRef<CustomPluginExecuteFormValue>({})
  const mitmParamsRequiredParamsRef = useRef<YakParamProps[]>([])
  const mitmParamsGroupParamsRef = useRef<YakExtraParamProps[]>([])
  const [drawerWidth, setDrawerWidth] = useState<number>(45) // 默认45vw
  const handleMitmHasParams = () => {
    const requiredParams = i.Params.filter((item) => item.Required)
    const norequiredParams = i.Params.filter((item) => !item.Required)
    const groupParams: YakExtraParamProps[] = ParamsToGroupByGroupName(norequiredParams)
    let initFormValue: CustomPluginExecuteFormValue = {}
    i.Params.forEach((ele) => {
      const value = getValueByType(ele.DefaultValue, ele.TypeVerbose)
      initFormValue = {
        ...initFormValue,
        [ele.Field]: value,
      }
    })
    mitmParamsDefaultFormValueRef.current = { ...initFormValue }
    getRemoteValue('mitm_has_params_' + i.ScriptName).then((res) => {
      if (res) {
        try {
          const arr: YakExecutorParam[] =
            JSONParseLog(res, { page: 'MITMYakScriptLoader', fun: 'mitm_has_params' }) || []
          arr.forEach((item) => {
            if (initFormValue.hasOwnProperty(item.Key)) {
              initFormValue[item.Key] = item.Value
            }
          })
        } catch (error) {}
        mitmParamsModal(initFormValue, requiredParams, groupParams)
      } else {
        // 带参插件参数本地不存在 采用默认值为初始值
        mitmParamsModal(initFormValue, requiredParams, groupParams)
      }
    })
  }
  const mitmParamsModal = (
    initFormValue: CustomPluginExecuteFormValue,
    requiredParams: YakParamProps[],
    groupParams: YakExtraParamProps[],
  ) => {
    if (requiredParams.length || groupParams.length) {
      mitmParamsInitFormValueRef.current = initFormValue
      mitmParamsRequiredParamsRef.current = requiredParams
      mitmParamsGroupParamsRef.current = groupParams
      getRemoteValue('mitm_has_params_drawerWidth_' + i.ScriptName)
        .then((width) => {
          if (width) {
            setDrawerWidth(Number(width))
          } else {
            setDrawerWidth(45)
          }
        })
        .catch(() => {
          setDrawerWidth(45)
        })
        .finally(() => {
          setMitmParamsDrawer(true)
        })
    }
  }
  const onOkMitmParamsDrawer = useMemoizedFn((execParams: YakExecutorParam[]) => {
    setRemoteValue('mitm_has_params_' + i.ScriptName, JSON.stringify(execParams))
    setRemoteValue('mitm_has_params_drawerWidth_' + i.ScriptName, drawerWidth + '')
    clearMITMPluginCache(mitmVersion)
    onSubmitYakScriptId(i.Id, execParams)
    setTempShowPluginHistory?.(i.ScriptName)
    setMitmParamsDrawer(false)
  })

  const onCheckboxClicked = useMemoizedFn(() => {
    if (status === 'idle') {
      onSelectDefaultPlugins()
    } else {
      onLaunchPlugin()
    }
  })
  /**
   * @description 劫持未开启前,勾选默认插件
   */
  const onSelectDefaultPlugins = useMemoizedFn(() => {
    if (!defaultPlugins || !setDefaultPlugins) return
    const checked = !!defaultPlugins?.includes(i.ScriptName)
    if (checked) {
      const newPluginList = defaultPlugins.filter((ele) => ele !== i.ScriptName)
      setDefaultPlugins(newPluginList)
    } else {
      setDefaultPlugins([...defaultPlugins, i.ScriptName])
    }
  })
  /**
   * @description 劫持未开启后,勾选启动插件
   */
  const onLaunchPlugin = useMemoizedFn(() => {
    if (hackingCheck) {
      const value: MITMRemoveHookRequest = {
        HookName: [],
        RemoveHookID: [i.ScriptName],
        version: mitmVersion,
      }
      grpcMITMRemoveHook(value).then(() => {
        if (isHasParams) {
          if (i.ScriptName === tempShowPluginHistory) {
            emiter.emit('onMitmClearFromPlugin', mitmVersion)
            setShowPluginHistoryList([])
            setTempShowPluginHistory && setTempShowPluginHistory('')
            emiter.emit('onHasParamsJumpHistory', JSON.stringify({ version: mitmVersion, mitmHasParamsNames: '' }))
          }
        }
      })
      if (onRemoveHook) onRemoveHook(i.ScriptName, i.Id + '')
      return
    } else {
      if (isHasParams) {
        handleMitmHasParams()
      } else {
        clearMITMPluginCache(mitmVersion)
        onSubmitYakScriptId(i.Id, [])
      }
    }
  })
  const getScriptInfo = useMemoizedFn((s: YakScript, isSendToPatch?: boolean) => {
    if (!s.ScriptName) return
    grpcFetchLocalPluginDetail({ Name: s.ScriptName }, true)
      .then((res: YakScript) => {
        setI({
          ...res,
          HeadImg: '',
          OnlineOfficial: false,
          OnlineIsPrivate: false,
          UUID: '',
        })
        if (isSendToPatch) {
          p.onSendToPatch && p.onSendToPatch(res)
        }
      })
      .catch(() => {})
  })
  const hackingCheck = useMemo(() => {
    return !!hooks.get(i.ScriptName) || !!hooksID.get(i.Id + '')
  }, [hooks, hooksID, i])
  const checkedStatus = useMemo(() => {
    return status === 'idle' ? !!defaultPlugins?.includes(i.ScriptName) : hackingCheck
  }, [status, defaultPlugins, hackingCheck, i])

  const showPluginHistoryListRef = useRef<string[]>(showPluginHistoryList)
  useEffect(() => {
    showPluginHistoryListRef.current = showPluginHistoryList
  }, [showPluginHistoryList])
  const historyIcon = useMemo(() => {
    return (
      <Tooltip title={showPluginHistoryList.includes(i.ScriptName) ? '取消查看该插件流量' : '查看该插件流量'}>
        <OutlileHistoryIcon
          className={classNames(style['history-icon'], {
            [style['history-icon-def']]: !showPluginHistoryList.includes(i.ScriptName),
            [style['history-icon-light']]: showPluginHistoryList.includes(i.ScriptName),
          })}
          onClick={() => {
            setTempShowPluginHistory &&
              setTempShowPluginHistory(showPluginHistoryList.includes(i.ScriptName) ? '' : i.ScriptName)

            // 单个
            let arr = [...showPluginHistoryList]
            if (arr.includes(i.ScriptName)) {
              arr = arr.filter((item) => item !== i.ScriptName)
            } else {
              arr = [i.ScriptName]
            }

            setShowPluginHistoryList(arr)
            emiter.emit(
              'onHasParamsJumpHistory',
              JSON.stringify({
                mitmHasParamsNames: arr.join(','),
                version: mitmVersion,
              }),
            )
          }}
        />
      </Tooltip>
    )
  }, [i, showPluginHistoryList])

  const onHistoryTagToMitm = (data: string) => {
    try {
      const value = JSONParseLog(data, { page: 'MITMYakScriptLoader', fun: 'onHistoryTagToMitm' })
      const { tags, version } = value
      if (version !== mitmVersion) return
      const newSelectTags = tags.split(',')
      const arr = showPluginHistoryListRef.current.filter((item) => newSelectTags.includes(item))
      setShowPluginHistoryList(arr)
    } catch (error) {}
  }

  useEffect(() => {
    emiter.on('onHistoryTagToMitm', onHistoryTagToMitm)
    return () => {
      emiter.off('onHistoryTagToMitm', onHistoryTagToMitm)
    }
  }, [])

  const hotIcon = useMemo(() => {
    return (
      <YakitPopconfirm
        disabled={!p.onSendToPatch}
        title="发送到【热加载】中调试代码？"
        onConfirm={() => {
          if (!i.Content) {
            getScriptInfo(i, true)
            return
          }
          p.onSendToPatch && p.onSendToPatch(i)
        }}
      >
        <SolidLightningboltIcon className={style['lightning-bolt-icon']} />
      </YakitPopconfirm>
    )
  }, [i, p])

  const authorImgNode = useMemo(() => {
    const { IsCorePlugin, Type, HeadImg, OnlineOfficial } = i
    if (IsCorePlugin) {
      if (!pluginTypeToName[Type]) {
        debugToPrintLogs({
          page: 'MITMYakScriptLoader',
          fun: 'authorImgNode',
          content: { data: JSON.stringify(script), Type },
          status: 'INFO',
        })
      }
      return (
        <AuthorImg
          src={YakitLogo}
          icon={<>{pluginTypeToName[Type]?.icon || <img src={YakitLogo} width={'100%'} height={'100%'} />}</>}
          wrapperClassName={style['plugin-local-headImg']}
        />
      )
    }
    return (
      <AuthorImg
        src={HeadImg || UnLogin}
        builtInIcon={!!OnlineOfficial ? 'official' : undefined}
        wrapperClassName={style['plugin-local-headImg']}
      />
    )
  }, [i])

  const hasPluginOutInfo = pluginStreamInfo && Object.keys(pluginStreamInfo).includes(i.ScriptName)

  return (
    <div className={style['mitm-plugin-local-item']}>
      <div className={style['mitm-plugin-local-left']}>
        <YakitCheckbox checked={checkedStatus} onChange={() => onCheckboxClicked()} />
        <div className={style['mitm-plugin-local-info']}>
          <div
            className={style['mitm-plugin-local-info-left']}
            onClick={() => onCheckboxClicked()}
            style={{
              width:
                status === 'idle'
                  ? 'calc(100% - 75px)'
                  : curTabKey === 'loaded'
                    ? 'calc(100% - 49px)'
                    : isHasParams
                      ? 'calc(100% - 2px)'
                      : 'calc(100% - 12px)',
            }}
          >
            {authorImgNode}
            <span className={classNames(style['plugin-local-scriptName'])}>{i.ScriptName}</span>
          </div>
          <div className={style['mitm-plugin-local-info-right']}>
            {status === 'idle' || curTabKey === 'loaded' ? (
              <PluginLocalInfoIcon plugin={i} getScriptInfo={getScriptInfo} />
            ) : (
              <></>
            )}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'nowrap', gap: 8, marginRight: 12 }}>
        {showEditor && (
          <OutlinePencilaltIcon
            className={style['mitm-params-edit-icon']}
            onClick={() => {
              handleMitmHasParams()
            }}
          />
        )}
        {status !== 'idle' ? (
          <>
            {curTabKey === 'loaded' ? (
              <>{hasParamsCheckList.includes(i.ScriptName) ? historyIcon : hotIcon}</>
            ) : (
              <>{isHasParams ? historyIcon : hotIcon}</>
            )}
          </>
        ) : null}
        {status !== 'idle' && hasPluginOutInfo && (
          <Tooltip title="查看当前插件输出">
            <OutlinePositionIcon
              className={classNames(style['position-icon'], {
                [style['position-light']]: showPluginStream === i.ScriptName,
              })}
              onClick={() => {
                if (hasPluginOutInfo) {
                  setAutoForward?.('pluginOutput')
                  setShowPluginStream?.(i.ScriptName)
                }
              }}
            />
          </Tooltip>
        )}
        {status !== 'idle' && curTabKey !== 'loaded' && (
          <YakitDropdownMenu
            menu={{
              data: [
                {
                  key: 'source-code',
                  label: (
                    <YakitPopover
                      placement="right"
                      overlayClassName={style['terminal-popover']}
                      content={<YakEditor type={i.Type} value={i.Content} readOnly={true} />}
                      onVisibleChange={(v) => {
                        if (v && !i.Content) {
                          getScriptInfo(i)
                        }
                      }}
                      zIndex={9999}
                    >
                      <div className={style['extra-menu']}>
                        <OutlineTerminalIcon className={style['plugin-local-icon']} />
                        <div className={style['menu-name']}>源码</div>
                      </div>
                    </YakitPopover>
                  ),
                },
                {
                  key: 'help-info',
                  label: (
                    <Tooltip
                      title={i.Help || 'No Description about it.'}
                      placement="right"
                      overlayClassName={style['question-tooltip']}
                      onVisibleChange={(v) => {
                        if (v && !i.Help) {
                          getScriptInfo(i)
                        }
                      }}
                    >
                      <div className={style['extra-menu']}>
                        <OutlineQuestionmarkcircleIcon className={style['plugin-local-icon']} />
                        <div className={style['menu-name']}>帮助信息</div>
                      </div>
                    </Tooltip>
                  ),
                },
              ] as YakitMenuItemProps[],
              onClick: ({ key }) => {
                switch (key) {
                  case 'source-code':
                    break
                  case 'help-info':
                    break
                }
              },
            }}
            dropdown={{
              trigger: ['click'],
              placement: 'bottomLeft',
            }}
          >
            <SolidDotsverticalIcon className={style['extra-btns-icon']} />
          </YakitDropdownMenu>
        )}
      </div>

      {mitmParamsDrawer && (
        <PluginHasParamsDrawer
          visible={mitmParamsDrawer}
          placementDrawer="left"
          pluginType={'mitm'}
          scriptName={i.ScriptName}
          drawerWidth={drawerWidth}
          onSetDrawerWidth={setDrawerWidth}
          onCloseParamsDrawer={setMitmParamsDrawer}
          onOkParamsDrawer={onOkMitmParamsDrawer}
          initFormValue={mitmParamsInitFormValueRef.current}
          defaultFormValue={mitmParamsDefaultFormValueRef.current}
          requiredParams={mitmParamsRequiredParamsRef.current}
          groupParams={mitmParamsGroupParamsRef.current}
        />
      )}
    </div>
  )
})

export const StatusCardViewer = React.memo((p: { status: StatusCardProps[] }) => {
  return (
    <Row gutter={12}>
      {p.status.map((i) => {
        return (
          <Col span={6} style={{ marginBottom: 8 }}>
            <Card hoverable={true} bordered={true} size={'small'}>
              <Statistic title={i.Id} value={i.Data} />
            </Card>
          </Col>
        )
      })}
    </Row>
  )
})

export interface MITMYakScriptLoaderProps {
  status?: MitmStatus
  script: YakScript
  hooks: Map<string, boolean>
  hooksID: Map<string, boolean>
  maxWidth?: number
  onSendToPatch?: (s: YakScript) => any
  onSubmitYakScriptId: (id: number, params: YakExecutorParam[]) => any
  onRemoveHook?: (name: string, id: string) => void
  /**
   * @param 是否劫持启动前/未开启劫持启动
   */
  isBeforeHijacking?: boolean
  /**
   * @param 是否劫持启动前 勾选默认插件
   */
  defaultPlugins?: string[]
  setDefaultPlugins?: (p: string[]) => void
  isHasParams: boolean
  showEditor: boolean
  showPluginHistoryList?: string[]
  setShowPluginHistoryList?: (l: string[]) => void
  tempShowPluginHistory?: string
  setTempShowPluginHistory?: (l: string) => void
  hasParamsCheckList: string[]
  curTabKey: string
  pluginStreamInfo?: Record<string, HoldGRPCStreamInfo>
  showPluginStream?: string
  setShowPluginStream?: React.Dispatch<React.SetStateAction<string>>
  setAutoForward?: React.Dispatch<React.SetStateAction<ManualHijackTypeProps>>
}

export function clearMITMPluginCache(version: string) {
  grpcMITMClearPluginCache(version).catch((e) => {
    failed(`清除插件缓存失败: ${e}`)
  })
}
